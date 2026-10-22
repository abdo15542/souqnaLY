import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';

const prefix = 'SOULIC2.';
const type = 'souqna.vendor_license.v1';

// يجب أن يطابق المفتاح في lib/services/vendor_license_service.dart
const publisherSecret =
    'souqnaLY_publisher_local_secret_2026_v1_change_me_before_production';

const defaultFeatures = <String>[
  'sale',
  'returns',
  'print',
  'barcode',
  'shifts',
  'debts',
  'expenses',
  'payroll',
  'reports',
  'profits',
  'costs',
  'inventoryView',
  'inventoryEdit',
  'purchase',
  'suppliers',
  'batches',
  'insights',
  'alerts',
  'salesHistory',
  'cashiers',
  'audit',
  'settings',
  'devices',
  'backup',
];

String hmac(String key, String msg) {
  final mac = Hmac(sha256, utf8.encode(key));
  return mac.convert(utf8.encode(msg)).toString();
}

String shopSecret(String shopId) => hmac(publisherSecret, 'publisher:$shopId');

String b(Object? v) {
  if (v is bool) return v ? '1' : '0';
  if (v == null) return '';
  final s = v.toString().toLowerCase();
  return (s == '1' || s == 'true' || s == 'yes') ? '1' : '0';
}

String s(Object? v) => v?.toString() ?? '';

String canonical(Map<String, dynamic> p) {
  final features = ((p['features'] as List?) ?? [])
      .map((e) => e.toString())
      .join(',');

  return '${s(p['type'])}|'
      '${s(p['shopId'])}|'
      '${s(p['shopName'])}|'
      '${s(p['ownerName'])}|'
      '${s(p['plan'])}|'
      '$features|'
      '${s(p['maxDevices'])}|'
      '${s(p['issuedAt'])}|'
      '${s(p['expiresAt'])}|'
      '${s(p['graceDays'])}|'
      '${b(p['allowExport'])}|'
      '${b(p['allowBackup'])}|'
      '${b(p['allowBranches'])}|'
      '${s(p['status'])}|'
      '${s(p['nonce'])}';
}

String sign(String shopId, Map<String, dynamic> p) =>
    hmac(shopSecret(shopId), canonical(p));

String randToken(int len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  final r = Random.secure();
  return List<String>.generate(len, (_) => chars[r.nextInt(chars.length)]).join();
}

String read(String prompt, String fallback) {
  stdout.write('$prompt [$fallback]: ');
  final v = stdin.readLineSync()?.trim();
  return (v == null || v.isEmpty) ? fallback : v;
}

bool readBool(String prompt, bool fallback) {
  final d = fallback ? 'y' : 'n';
  final v = read(prompt, d).toLowerCase();
  return v == 'y' || v == 'yes' || v == '1' || v == 'true';
}

void main() {
  stdout.writeln('=== توليد ترخيص ناشر لسوقنا ===');

  final shopId = read('Shop ID', 'SHOP-TEST-0001').toUpperCase();
  final shopName = read('Shop Name', 'بقالة التجربة');
  final ownerName = read('Owner Name', 'المالك');
  final plan = read('Plan', 'trial');

  final days = int.tryParse(read('Days', '30')) ?? 30;
  final maxDevices = int.tryParse(read('Max Devices', '3')) ?? 3;
  final graceDays = int.tryParse(read('Grace Days', '7')) ?? 7;

  final featuresInput = read('Features comma-separated (empty = all)', '');
  final features = featuresInput.trim().isEmpty
      ? List<String>.from(defaultFeatures)
      : featuresInput
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

  final allowExport = readBool('Allow Export? (y/n)', true);
  final allowBackup = readBool('Allow Backup? (y/n)', true);
  final allowBranches = readBool('Allow Branches? (y/n)', false);

  final now = DateTime.now();
  final issuedAt = now.toIso8601String();
  final expiresAt = now.add(Duration(days: days)).toIso8601String();
  final nonce = randToken(8);

  final payload = <String, dynamic>{
    'type': type,
    'shopId': shopId,
    'shopName': shopName,
    'ownerName': ownerName,
    'plan': plan,
    'features': features,
    'maxDevices': maxDevices,
    'issuedAt': issuedAt,
    'expiresAt': expiresAt,
    'graceDays': graceDays,
    'allowExport': allowExport,
    'allowBackup': allowBackup,
    'allowBranches': allowBranches,
    'status': 'active',
    'nonce': nonce,
  };

  payload['sig'] = sign(shopId, payload);

  final jsonStr = jsonEncode(payload);
  final b64 = base64Url.encode(utf8.encode(jsonStr));
  final code = '$prefix$b64';

  stdout.writeln('');
  stdout.writeln('رمز الترخيص:');
  stdout.writeln(code);
  stdout.writeln('');
  stdout.writeln('انسخ هذا الرمز والصقه في التطبيق:');
  stdout.writeln('الترخيص → استيراد ترخيص');
}
