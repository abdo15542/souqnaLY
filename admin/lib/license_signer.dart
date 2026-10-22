import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

class LicenseSigner {
  static const String prefix = 'SOULIC2.';
  static const String type = 'souqna.vendor_license.v1';
  static const String secret =
      'souqnaLY_publisher_local_secret_2026_v1_change_me_before_production';

  static String _hmac(String key, String msg) {
    final mac = Hmac(sha256, utf8.encode(key));
    return mac.convert(utf8.encode(msg)).toString();
  }

  static String _shopSecret(String shopId) =>
      _hmac(secret, 'publisher:$shopId');

  static String _b(Object? v) {
    if (v is bool) return v ? '1' : '0';
    if (v == null) return '';
    final s = v.toString().toLowerCase();
    return (s == '1' || s == 'true' || s == 'yes') ? '1' : '0';
  }

  static String _s(Object? v) => v?.toString() ?? '';

  static String canonical(Map<String, dynamic> p) {
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

  static String sign(String shopId, Map<String, dynamic> p) =>
      _hmac(_shopSecret(shopId), canonical(p));

  static String encode(Map<String, dynamic> payload) {
    final jsonStr = jsonEncode(payload);
    final b64 = base64Url.encode(utf8.encode(jsonStr)).replaceAll('=', '');
    return '$prefix$b64';
  }

  static String randToken(int len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random.secure();
    return List<String>.generate(
      len,
      (_) => chars[r.nextInt(chars.length)],
    ).join();
  }

  static Map<String, dynamic> buildPayload({
    required String shopId,
    required String shopName,
    required String ownerName,
    required String plan,
    required List<String> features,
    required int maxDevices,
    required int days,
    required int graceDays,
    required bool allowExport,
    required bool allowBackup,
    required bool allowBranches,
    required String status,
  }) {
    final now = DateTime.now();
    final issuedAt = now.toIso8601String();
    final expiresAt = now.add(Duration(days: days)).toIso8601String();
    final nonce = randToken(8);

    final p = <String, dynamic>{
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
      'status': status,
      'nonce': nonce,
    };
    p['sig'] = sign(shopId, p);
    return p;
  }
}
