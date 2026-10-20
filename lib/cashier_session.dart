import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'models.dart';

class CashierSession {
  static Cashier? current;
  static String get displayName => current?.name ?? 'بدون كاشير';
  static int? get cashierId => current?.id;
  static void set(Cashier? c) => current = c;
  static void clear() => current = null;

  static String generateSalt() {
    final r = Random.secure();
    return base64Encode(List<int>.generate(16, (_) => r.nextInt(256)));
  }

  static String hashPin(String pin, String salt) => sha256.convert(utf8.encode('$salt:$pin')).toString();
  static bool verifyPin(Cashier c, String pin) => hashPin(pin, c.pinSalt) == c.pinHash;
}
