import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';

class SettingsService {
  static Future<String?> _getValue(String key) async {
    final d = await LocalDB.db;
    final r = await d.query(
      'settings',
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    return r.isEmpty ? null : r.first['value'] as String;
  }

  static Future<void> _setValue(String key, String value) async {
    final d = await LocalDB.db;
    await d.insert(
      'settings',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<int> _getInt(String key, int fallback) async {
    final v = await _getValue(key);
    final n = int.tryParse(v ?? '');
    return n ?? fallback;
  }

  static Future<double> _getDouble(String key, double fallback) async {
    final v = await _getValue(key);
    final n = double.tryParse(v ?? '');
    return n ?? fallback;
  }

  static Future<InsightSettings> getInsightSettings() async {
    return InsightSettings(
      leadTimeDays: await _getInt('insight_lead_time_days', 7),
      safetyFactor: await _getDouble('insight_safety_factor', 0.5),
      staleDays: await _getInt('insight_stale_days', 60),
      voidAlertRate: await _getDouble('insight_void_alert_rate', 0.10),
      abcA: await _getDouble('insight_abc_a', 0.80),
      abcB: await _getDouble('insight_abc_b', 0.95),
    );
  }

  static Future<void> saveInsightSettings(InsightSettings s) async {
    await _setValue('insight_lead_time_days', s.leadTimeDays.toString());
    await _setValue('insight_safety_factor', s.safetyFactor.toString());
    await _setValue('insight_stale_days', s.staleDays.toString());
    await _setValue('insight_void_alert_rate', s.voidAlertRate.toString());
    await _setValue('insight_abc_a', s.abcA.toString());
    await _setValue('insight_abc_b', s.abcB.toString());
  }
}
