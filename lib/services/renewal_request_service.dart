import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:sqflite/sqflite.dart';

import '../db.dart';
import '../device_service.dart';
import '../vendor_license_models.dart';

class RenewalRequestService {
  static const String prefix = 'SOUREQ1.';
  static const String type = 'souqna.renewal_request.v1';
  static const String secret =
      'souqnaLY_publisher_local_secret_2026_v1_change_me_before_production';

  static String _hmac(String key, String msg) {
    final mac = Hmac(sha256, utf8.encode(key));
    return mac.convert(utf8.encode(msg)).toString();
  }

  static String _s(Object? v) => v?.toString() ?? '';

  static String _canonical(Map<String, dynamic> p) {
    return '${_s(p['type'])}|'
        '${_s(p['shopId'])}|'
        '${_s(p['deviceId'])}|'
        '${_s(p['deviceName'])}|'
        '${_s(p['ownerName'])}|'
        '${_s(p['phone'])}|'
        '${_s(p['requestedAt'])}|'
        '${_s(p['daysRequested'])}|'
        '${_s(p['nonce'])}';
  }

  static String _sign(Map<String, dynamic> p) => _hmac(secret, _canonical(p));

  static String _randToken(int len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random.secure();
    return List<String>.generate(
      len,
      (_) => chars[r.nextInt(chars.length)],
    ).join();
  }

  static Future<String> generateCode({int daysRequested = 30}) async {
    final VendorLicense? lic = await _currentLicense();
    final dev = DeviceService.current;

    final shopId = lic?.shopId ?? (dev?.shopId ?? '');
    final shopName = lic?.shopName ?? '';
    final ownerName = lic?.ownerName ?? (dev?.employeeName ?? '');
    final deviceId = dev?.deviceId ?? '';
    final deviceName = dev?.deviceName ?? '';
    final phone = lic?.supportPhone ?? '';

    final nonce = _randToken(8);
    final requestedAt = DateTime.now().toIso8601String();

    final p = <String, dynamic>{
      'type': type,
      'shopId': shopId,
      'shopName': shopName,
      'deviceId': deviceId,
      'deviceName': deviceName,
      'ownerName': ownerName,
      'phone': phone,
      'requestedAt': requestedAt,
      'daysRequested': daysRequested,
      'nonce': nonce,
    };
    p['sig'] = _sign(p);

    final jsonStr = jsonEncode(p);
    final b64 = base64Url.encode(utf8.encode(jsonStr)).replaceAll('=', '');
    return '$prefix$b64';
  }

  static Future<VendorLicense?> _currentLicense() async {
    final d = await LocalDB.db;
    final rows = await d.query('vendor_license', where: 'id = 1', limit: 1);
    if (rows.isEmpty) return null;
    return VendorLicense.fromMap(rows.first);
  }

  static String buildWhatsappMessage(String code) {
    return 'طلب تجديد اشتراك سوقنا\n'
        'رمز الطلب:\n$code';
  }
}
