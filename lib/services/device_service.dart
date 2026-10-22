import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:sqflite/sqflite.dart';

import '../db.dart';
import '../device_models.dart';
import '../models.dart';

class DeviceService {
  static DeviceIdentity? current;
  static bool pendingOnboarding = false;
  static bool needsActivation = false;

  static bool _bootstrapped = false;
  static bool _ready = false;

  static const String _masterSecret =
      'souqnaLY_local_license_master_2026_v1';
  static const String _codePrefix = 'SOULIC1.';

  static Future<Database> _db() async {
    final d = await LocalDB.db;

    if (!_ready) {
      await d.execute(
          'CREATE TABLE IF NOT EXISTS device_identity('
          'id INTEGER PRIMARY KEY CHECK (id = 1),'
          'shop_id TEXT NOT NULL DEFAULT \'\','
          'device_id TEXT NOT NULL,'
          'device_name TEXT NOT NULL DEFAULT \'\','
          'employee_name TEXT NOT NULL DEFAULT \'\','
          'role TEXT NOT NULL DEFAULT \'pending\','
          'permissions TEXT NOT NULL DEFAULT \'\','
          'issued_at TEXT NOT NULL DEFAULT \'\','
          'expires_at TEXT NOT NULL DEFAULT \'\','
          'status TEXT NOT NULL DEFAULT \'pending\')');

      await d.execute(
          'CREATE TABLE IF NOT EXISTS registered_devices('
          'device_id TEXT PRIMARY KEY,'
          'device_name TEXT NOT NULL DEFAULT \'\','
          'employee_name TEXT NOT NULL DEFAULT \'\','
          'role TEXT NOT NULL DEFAULT \'cashier\','
          'permissions TEXT NOT NULL DEFAULT \'\','
          'issued_at TEXT NOT NULL DEFAULT \'\','
          'expires_at TEXT NOT NULL DEFAULT \'\','
          'status TEXT NOT NULL DEFAULT \'active\')');

      _ready = true;
    }

    return d;
  }

  static String _s(Object? v) => v?.toString() ?? '';

  static String _randToken(int len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random.secure();
    return List<String>.generate(
      len,
      (_) => chars[r.nextInt(chars.length)],
    ).join();
  }

  static String generateDeviceId() =>
      'DEVICE-${_randToken(4)}-${_randToken(4)}';

  static String generateShopId() => 'SHOP-${_randToken(4)}-${_randToken(4)}';

  static String _hmac(String key, String msg) {
    final mac = Hmac(sha256, utf8.encode(key));
    return mac.convert(utf8.encode(msg)).toString();
  }

  static String _shopSecret(String shopId) =>
      _hmac(_masterSecret, 'shop:$shopId');

  static String _canonical(Map<String, dynamic> p) {
    final perms = ((p['permissions'] as List?) ?? [])
        .map((e) => e.toString())
        .join(',');

    return '${_s(p['shopId'])}|'
        '${_s(p['deviceId'])}|'
        '${_s(p['deviceName'])}|'
        '${_s(p['employeeName'])}|'
        '${_s(p['role'])}|'
        '$perms|'
        '${_s(p['issuedAt'])}|'
        '${_s(p['expiresAt'])}|'
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

  static Future<void> bootstrap() async {
    if (_bootstrapped) return;

    final d = await _db();

    final rows =
        await d.query('device_identity', where: 'id = 1', limit: 1);

    if (rows.isNotEmpty) {
      current = DeviceIdentity.fromMap(rows.first);
      needsActivation = current?.status == 'pending';
      pendingOnboarding = false;
      _bootstrapped = true;
      return;
    }

    int productCount = 0;
    try {
      productCount = await LocalDB.getProductCount();
    } catch (_) {
      productCount = 0;
    }

    final nameRows = await d.query(
      'settings',
      where: 'key = ?',
      whereArgs: ['shop_name'],
      limit: 1,
    );

    final currencyRows = await d.query(
      'settings',
      where: 'key = ?',
      whereArgs: ['currency'],
      limit: 1,
    );

    String shopName =
        nameRows.isEmpty ? 'سوقنا' : _s(nameRows.first['value']);
    String currency =
        currencyRows.isEmpty ? 'د.ل' : _s(currencyRows.first['value']);

    if (shopName.isEmpty) shopName = 'سوقنا';
    if (currency.isEmpty) currency = 'د.ل';

    final hasExistingData = productCount > 0 || nameRows.isNotEmpty;

    if (hasExistingData) {
      await createOwnerInternal(
        shopName: shopName,
        currency: currency,
        deviceName: 'هاتف المالك',
        employeeName: 'المالك',
      );
    } else {
      pendingOnboarding = true;
    }

    _bootstrapped = true;
  }

  static Future<void> createOwner({
    required String shopName,
    required String currency,
    String deviceName = 'هاتف المالك',
    String employeeName = 'المالك',
  }) async {
    final cleanShop = shopName.trim().isEmpty ? 'سوقنا' : shopName.trim();
    final cleanCurrency =
        currency.trim().isEmpty ? 'د.ل' : currency.trim();

    await LocalDB.saveSettings(
      AppSettings(
        shopName: cleanShop,
        phone: '',
        address: '',
        currency: cleanCurrency,
      ),
    );

    await createOwnerInternal(
      shopName: cleanShop,
      currency: cleanCurrency,
      deviceName: deviceName.trim().isEmpty ? 'هاتف المالك' : deviceName.trim(),
      employeeName:
          employeeName.trim().isEmpty ? 'المالك' : employeeName.trim(),
    );
  }

  static Future<void> createOwnerInternal({
    required String shopName,
    required String currency,
    required String deviceName,
    required String employeeName,
  }) async {
    final now = DateTime.now().toIso8601String();

    final id = DeviceIdentity(
      shopId: generateShopId(),
      deviceId: generateDeviceId(),
      deviceName: deviceName,
      employeeName: employeeName,
      role: 'owner',
      permissions: const <String>['*'],
      issuedAt: now,
      expiresAt: '',
      status: 'active',
    );

    await _saveIdentity(id);

    current = id;
    pendingOnboarding = false;
    needsActivation = false;
    _bootstrapped = true;
  }

  static Future<void> createPendingSub({
    String deviceName = 'هاتف فرعي',
  }) async {
    if (current != null && current!.status == 'pending') return;

    final now = DateTime.now().toIso8601String();

    final id = DeviceIdentity(
      shopId: '',
      deviceId: generateDeviceId(),
      deviceName: deviceName.trim().isEmpty ? 'هاتف فرعي' : deviceName.trim(),
      employeeName: '',
      role: 'pending',
      permissions: const <String>[],
      issuedAt: now,
      expiresAt: '',
      status: 'pending',
    );

    await _saveIdentity(id);

    current = id;
    pendingOnboarding = false;
    needsActivation = true;
    _bootstrapped = true;
  }

  static Future<void> _saveIdentity(DeviceIdentity id) async {
    final d = await _db();
    await d.insert(
      'device_identity',
      id.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static bool isExpired(DeviceIdentity? id) {
    if (id == null) return true;
    if (id.expiresAt.isEmpty) return false;

    final e = DateTime.tryParse(id.expiresAt);
    if (e == null) return false;

    return DateTime.now().isAfter(e);
  }

  static bool hasPermission(String permission) {
    final id = current;
    if (id == null) return false;
    if (id.role == 'owner') return true;
    if (id.permissions.contains('*')) return true;
    return id.permissions.contains(permission);
  }

  static bool canOperate(String permission) {
    return !isExpired(current) && hasPermission(permission);
  }

  static String createActivationCode(RegisteredDevice rd) {
    final owner = current;

    if (owner == null || owner.role != 'owner') {
      throw StateError('المالك فقط يستطيع إصدار رموز التفعيل.');
    }

    final nonce = _randToken(8);

    final payload = <String, dynamic>{
      'shopId': owner.shopId,
      'deviceId': rd.deviceId,
      'deviceName': rd.deviceName,
      'employeeName': rd.employeeName,
      'role': rd.role,
      'permissions': rd.permissions,
      'issuedAt': rd.issuedAt,
      'expiresAt': rd.expiresAt,
      'status': rd.status,
      'nonce': nonce,
    };

    final sig = _sign(owner.shopId, payload);
    payload['sig'] = sig;

    final jsonStr = jsonEncode(payload);
    final b64 = base64Url.encode(utf8.encode(jsonStr));

    return '$_codePrefix$b64';
  }

  static Future<DeviceIdentity> activate(String code) async {
    final target = current;

    if (target == null) {
      throw StateError('لا يوجد جهاز. أنشئ طلب ربط أولًا.');
    }

    if (target.role == 'owner') {
      throw StateError('هذا جهاز مالك ولا يحتاج رمز تفعيل.');
    }

    final trimmed = code.trim();

    if (!trimmed.startsWith(_codePrefix)) {
      throw StateError('رمز التفعيل غير صالح.');
    }

    final b64 = trimmed.substring(_codePrefix.length);

    List<int> bytes;
    try {
      bytes = base64Url.decode(_padBase64(b64));
    } catch (_) {
      throw StateError('رمز التفعيل غير صالح.');
    }

    final payload = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;

    final sig = payload['sig'] as String?;
    if (sig == null) {
      throw StateError('رمز التفعيل غير مكتمل.');
    }

    final shopId = _s(payload['shopId']);
    final expected = _sign(shopId, payload);

    if (expected != sig) {
      throw StateError('توقيع الرمز غير صحيح.');
    }

    final deviceId = _s(payload['deviceId']);

    if (deviceId != target.deviceId) {
      throw StateError('هذا الترخيص مرتبط بهاتف آخر.');
    }

    if (target.shopId.isNotEmpty && target.shopId != shopId) {
      throw StateError('هذا الرمز صادر لمحل آخر.');
    }

    final status = _s(payload['status']);
    if (status != 'active') {
      throw StateError('هذا الجهاز غير مفعّل من المالك.');
    }

    final expiresAt = _s(payload['expiresAt']);

    if (expiresAt.isNotEmpty) {
      final e = DateTime.tryParse(expiresAt);
      if (e != null && DateTime.now().isAfter(e)) {
        throw StateError('انتهت صلاحية رمز التفعيل.');
      }
    }

    final perms = ((payload['permissions'] as List?) ?? [])
        .map((e) => e.toString())
        .toList();

    final id = DeviceIdentity(
      shopId: shopId,
      deviceId: deviceId,
      deviceName: _s(payload['deviceName']),
      employeeName: _s(payload['employeeName']),
      role: _s(payload['role']),
      permissions: perms,
      issuedAt: _s(payload['issuedAt']),
      expiresAt: expiresAt,
      status: 'active',
    );

    await _saveIdentity(id);

    current = id;
    needsActivation = false;
    pendingOnboarding = false;
    _bootstrapped = true;

    return id;
  }

  static Future<List<RegisteredDevice>> getDevices() async {
    final d = await _db();
    final rows =
        await d.query('registered_devices', orderBy: 'issued_at DESC');
    return rows.map(RegisteredDevice.fromMap).toList();
  }

  static Future<void> upsertDevice(RegisteredDevice rd) async {
    final d = await _db();

    await d.insert(
      'registered_devices',
      rd.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    await LocalDB.logAudit(
      action: 'device_registered',
      entity: 'device',
      details: rd.deviceName,
    );
  }

  static Future<void> setDeviceStatus(String deviceId, String status) async {
    final d = await _db();

    await d.update(
      'registered_devices',
      {'status': status},
      where: 'device_id = ?',
      whereArgs: [deviceId],
    );

    await LocalDB.logAudit(
      action: status == 'revoked' ? 'device_revoked' : 'device_activated',
      entity: 'device',
      details: deviceId,
    );
  }

  static Future<void> extendDevice(String deviceId, String expiresAt) async {
    final d = await _db();

    await d.update(
      'registered_devices',
      {'expires_at': expiresAt, 'status': 'active'},
      where: 'device_id = ?',
      whereArgs: [deviceId],
    );

    await LocalDB.logAudit(
      action: 'device_extended',
      entity: 'device',
      details: deviceId,
    );
  }

  static Future<void> deleteDevice(String deviceId) async {
    final d = await _db();

    await d.delete(
      'registered_devices',
      where: 'device_id = ?',
      whereArgs: [deviceId],
    );

    await LocalDB.logAudit(
      action: 'device_deleted',
      entity: 'device',
      details: deviceId,
    );
  }
}
