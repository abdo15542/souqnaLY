import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:sqflite/sqflite.dart';

import '../db.dart';
import '../vendor_license_models.dart';

class VendorLicenseService {
  static VendorLicense? current;

  static bool _bootstrapped = false;
  static bool _ready = false;

  static const String _prefix = 'SOULIC2.';
  static const String _type = 'souqna.vendor_license.v1';

  // تنبيه أمني: هذا مفتاح متماثل للاختبار/التشغيل المحلي.
  // لاحقًا يجب استبداله بتوقيع غير متماثل Ed25519/RSA في تطبيق الناشر فقط.
  static const String _publisherSecret =
      'souqnaLY_publisher_local_secret_2026_v1_change_me_before_production';

  static Future<Database> _db() async {
    final d = await LocalDB.db;

    if (!_ready) {
      await d.execute(
        'CREATE TABLE IF NOT EXISTS vendor_license('
        'id INTEGER PRIMARY KEY CHECK (id = 1),'
        'shop_id TEXT NOT NULL DEFAULT \'\','
        'shop_name TEXT NOT NULL DEFAULT \'\','
        'owner_name TEXT NOT NULL DEFAULT \'\','
        'plan TEXT NOT NULL DEFAULT \'trial\','
        'features TEXT NOT NULL DEFAULT \'\','
        'max_devices INTEGER NOT NULL DEFAULT 0,'
        'issued_at TEXT NOT NULL DEFAULT \'\','
        'expires_at TEXT NOT NULL DEFAULT \'\','
        'grace_days INTEGER NOT NULL DEFAULT 0,'
        'allow_export INTEGER NOT NULL DEFAULT 1,'
        'allow_backup INTEGER NOT NULL DEFAULT 1,'
        'allow_branches INTEGER NOT NULL DEFAULT 0,'
        'status TEXT NOT NULL DEFAULT \'active\','
        'nonce TEXT NOT NULL DEFAULT \'\','
        'signature TEXT NOT NULL DEFAULT \'\','
        'raw_json TEXT NOT NULL DEFAULT \'\','
        'imported_at TEXT NOT NULL DEFAULT \'\')',
      );

      _ready = true;
    }

    return d;
  }

  static String _hmac(String key, String msg) {
    final mac = Hmac(sha256, utf8.encode(key));
    return mac.convert(utf8.encode(msg)).toString();
  }

  static String _shopSecret(String shopId) =>
      _hmac(_publisherSecret, 'publisher:$shopId');

  static String _b(Object? v) {
    if (v is bool) return v ? '1' : '0';
    if (v == null) return '';
    final s = v.toString().toLowerCase();
    return (s == '1' || s == 'true' || s == 'yes') ? '1' : '0';
  }

  static String _s(Object? v) => v?.toString() ?? '';

  static String _canonical(Map<String, dynamic> p) {
    final features = ((p['features'] as List?) ?? [])
        .map((e) => e.toString())
        .join(',');

    return '${_s(p['type'])}|'
        '${_s(p['shopId'])}|'
        '${_s(p['shopName'])}|'
        '${_s(p['ownerName'])}|'
        '${_s(p['plan'])}|'
        '$features|'
        '${_s(p['maxDevices'])}|'
        '${_s(p['issuedAt'])}|'
        '${_s(p['expiresAt'])}|'
        '${_s(p['graceDays'])}|'
        '${_b(p['allowExport'])}|'
        '${_b(p['allowBackup'])}|'
        '${_b(p['allowBranches'])}|'
        '${_s(p['status'])}|'
        '${_s(p['nonce'])}';
  }

  static String _sign(String shopId, Map<String, dynamic> p) =>
      _hmac(_shopSecret(shopId), _canonical(p));

  static String _padBase64(String s) {
    final mod = s.length % 4;
    if (mod == 0) return s;
    return s + ('=' * (4 - mod));
  }

  static bool _toBool(Object? v) {
    if (v is bool) return v;
    final s = v?.toString().toLowerCase() ?? '';
    return s == '1' || s == 'true' || s == 'yes';
  }

  static Future<void> bootstrap() async {
    if (_bootstrapped) return;
    await reload();
    _bootstrapped = true;
  }

  static Future<void> reload() async {
    final d = await _db();
    final rows = await d.query('vendor_license', where: 'id = 1', limit: 1);

    if (rows.isEmpty) {
      current = null;
      return;
    }

    current = VendorLicense.fromMap(rows.first);
  }

  static Future<void> _save(VendorLicense lic) async {
    final d = await _db();
    await d.insert(
      'vendor_license',
      lic.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    current = lic;
    _bootstrapped = true;
  }

  static Future<void> importCode(String code) async {
    final trimmed = code.trim();

    if (!trimmed.startsWith(_prefix)) {
      throw StateError('رمز الترخيص غير صالح. يجب أن يبدأ بـ $_prefix');
    }

    final b64 = trimmed.substring(_prefix.length);

    List<int> bytes;
    try {
      bytes = base64Url.decode(_padBase64(b64));
    } catch (_) {
      throw StateError('رمز الترخيص غير صالح.');
    }

    final payload = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;

    if (_s(payload['type']) != _type) {
      throw StateError('نوع الترخيص غير معروف.');
    }

    final sig = _s(payload['sig']);
    if (sig.isEmpty) {
      throw StateError('الترخيص غير موقّع.');
    }

    final shopId = _s(payload['shopId']);
    if (shopId.isEmpty) {
      throw StateError('معرّف المحل مفقود في الترخيص.');
    }

    final expected = _sign(shopId, payload);
    if (expected != sig) {
      throw StateError('توقيع الترخيص غير صحيح.');
    }

    final status = _s(payload['status']);
    if (status != 'active' && status != 'revoked') {
      throw StateError('حالة الترخيص غير صالحة.');
    }

    if (current != null &&
        current!.shopId.isNotEmpty &&
        current!.shopId != shopId) {
      throw StateError('هذا الترخيص صادر لمحل آخر: ${current!.shopId}');
    }

    final features = ((payload['features'] as List?) ?? [])
        .map((e) => e.toString())
        .where((e) => e.isNotEmpty)
        .toList();

    final now = DateTime.now().toIso8601String();
    final raw = jsonEncode(payload);

    final lic = VendorLicense(
      shopId: shopId,
      shopName: _s(payload['shopName']),
      ownerName: _s(payload['ownerName']),
      plan: _s(payload['plan']).isEmpty ? 'trial' : _s(payload['plan']),
      features: features,
      maxDevices: (payload['maxDevices'] as num?)?.toInt() ?? 0,
      issuedAt: _s(payload['issuedAt']),
      expiresAt: _s(payload['expiresAt']),
      graceDays: (payload['graceDays'] as num?)?.toInt() ?? 0,
      allowExport: _toBool(payload['allowExport']),
      allowBackup: _toBool(payload['allowBackup']),
      allowBranches: _toBool(payload['allowBranches']),
      status: status,
      nonce: _s(payload['nonce']),
      signature: sig,
      rawJson: raw,
      importedAt: now,
    );

    await _save(lic);
  }

  static bool hasLicense() => current != null;

  static bool isBlocked() => current?.isBlocked ?? false;

  static bool isExpired() => current?.isExpired ?? false;

  static bool inGrace() => current?.inGrace ?? false;

  static int? daysRemaining() {
    final l = current;
    if (l == null || l.expiresAt.isEmpty) return null;

    final e = DateTime.tryParse(l.expiresAt);
    if (e == null) return null;

    return e.difference(DateTime.now()).inDays;
  }

  static bool canUse(String feature) {
    final l = current;

    // وضع ناعم: إذا لا يوجد ترخيص، التطبيق يعمل كما كان.
    // لاحقًا يمكن تغيير هذا السطر إلى false لفرض الترخيص إجباريًا.
    if (l == null) return true;

    if (l.isBlocked) return false;

    return l.hasFeature(feature);
  }

  static bool canExport() {
    final l = current;
    if (l == null) return true;
    return l.allowExport && l.status == 'active';
  }

  static bool canBackup() {
    final l = current;
    if (l == null) return true;
    return l.allowBackup && l.status == 'active';
  }

  static bool canManageDevices() => canUse('devices');

  static int maxDevices() => current?.maxDevices ?? 999999;

  static Future<int> activeDeviceCount() async {
    final d = await _db();

    final table = await d.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='registered_devices'",
    );

    if (table.isEmpty) return 0;

    final now = DateTime.now().toIso8601String();

    final rows = await d.rawQuery(
      "SELECT COUNT(*) c FROM registered_devices "
      "WHERE status = 'active' "
      "AND (expires_at = '' OR expires_at > ?)",
      [now],
    );

    return (rows.first['c'] as int?) ?? 0;
  }

  static Future<bool> canAddDevice() async {
    if (!canManageDevices()) return false;
    if (isBlocked()) return false;

    final count = await activeDeviceCount();
    return count < maxDevices();
  }

  static String clampExpiry(String requested) {
    final l = current;

    if (l == null) return requested;
    if (l.expiresAt.isEmpty) return requested;
    if (requested.isEmpty) return l.expiresAt;

    final req = DateTime.tryParse(requested);
    final shopExp = DateTime.tryParse(l.expiresAt);

    if (req == null || shopExp == null) return requested;

    return req.isAfter(shopExp) ? shopExp.toIso8601String() : requested;
  }
}
