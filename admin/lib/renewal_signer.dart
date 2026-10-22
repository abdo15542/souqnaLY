import 'dart:convert';

import 'package:crypto/crypto.dart';

class RenewalSigner {
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

  static Map<String, dynamic>? decode(String code) {
    final t = code.trim();
    if (!t.startsWith(prefix)) return null;
    final b64 = t.substring(prefix.length);
    final pad = b64.length % 4;
    final fixed = pad == 0 ? b64 : b64 + ('=' * (4 - pad));
    List<int> bytes;
    try {
      bytes = base64Url.decode(fixed);
    } catch (_) {
      return null;
    }
    Map<String, dynamic> p;
    try {
      p = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
    if (_s(p['type']) != type) return null;
    final sig = _s(p['sig']);
    if (sig.isEmpty) return null;
    if (_hmac(secret, _canonical(p)) != sig) return null;
    return p;
  }
}
