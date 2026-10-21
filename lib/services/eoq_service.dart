import 'dart:math' as math;
import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';
import 'insights_service.dart';
import 'settings_service.dart';

class EoqSettings {
  final double orderCost;
  final double holdingRate;
  const EoqSettings({required this.orderCost, required this.holdingRate});
  factory EoqSettings.defaults() => const EoqSettings(orderCost: 25.0, holdingRate: 0.25);
}

class EoqService {
  static Future<EoqSettings> getSettings() async {
    final d = await LocalDB.db;
    final oc = await d.query('settings', where: 'key = ?', whereArgs: ['eoq_order_cost'], limit: 1);
    final hr = await d.query('settings', where: 'key = ?', whereArgs: ['eoq_holding_rate'], limit: 1);
    return EoqSettings(
      orderCost: double.tryParse((oc.isEmpty ? '' : oc.first['value'] as String)) ?? 25.0,
      holdingRate: double.tryParse((hr.isEmpty ? '' : hr.first['value'] as String)) ?? 0.25,
    );
  }

  static Future<void> saveSettings(EoqSettings s) async {
    final d = await LocalDB.db;
    await d.insert('settings', {'key': 'eoq_order_cost', 'value': s.orderCost.toString()},
        conflictAlgorithm: ConflictAlgorithm.replace);
    await d.insert('settings', {'key': 'eoq_holding_rate', 'value': s.holdingRate.toString()},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<EoqItem>> compute({int days = 90}) async {
    final d = await LocalDB.db;
    final since = DateTime.now().subtract(Duration(days: days)).toIso8601String();
    final es = await getSettings();
    final ins = await SettingsService.getInsightSettings();

    final soldRows = await d.rawQuery(
      "SELECT si.product_id pid, SUM(si.qty) q "
      "FROM sale_items si JOIN sales s ON s.id = si.sale_id "
      "WHERE s.refunded_at IS NULL AND s.created_at >= ? AND si.product_id IS NOT NULL "
      "GROUP BY si.product_id",
      [since],
    );
    final sold = <int, double>{};
    for (final r in soldRows) {
      final pid = r['pid'] as int?;
      if (pid != null) sold[pid] = (r['q'] as num).toDouble();
    }

    final abc = await InsightsService.abcXyz(settings: ins);
    final abcMap = <int, String>{for (final a in abc) if (a.product.id != null) a.product.id!: a.abc};

    final products = await LocalDB.getProducts();
    final scale = 365.0 / days;
    final out = <EoqItem>[];

    for (final p in products) {
      if (p.id == null) continue;
      final dq = sold[p.id] ?? 0.0;
      final daily = dq / days;
      final annual = dq * scale;
      final h = p.buyPrice * es.holdingRate;

      double eoq = 0.0;
      if (annual > 0 && h > 0) {
        eoq = math.sqrt((2.0 * annual * es.orderCost) / h);
      }

      double rop = (daily * ins.leadTimeDays) + (daily * ins.safetyFactor);
      if (p.minQty > rop) rop = p.minQty;

      final doh = daily > 0 ? (p.qty / daily) : double.infinity;
      final turnover = p.qty > 0 ? (annual / p.qty) : 0.0;

      double urgency = 0.0;
      if (rop > 0) {
        urgency = (1.0 - (p.qty / rop)).clamp(0.0, 1.0).toDouble();
      } else if (p.qty <= 0) {
        urgency = 1.0;
      }

      out.add(EoqItem(
        product: p,
        annualDemand: annual,
        dailyDemand: daily,
        eoq: eoq,
        reorderPoint: rop,
        daysOnHand: doh,
        turnover: turnover,
        urgency: urgency,
        abcClass: abcMap[p.id] ?? '-',
      ));
    }

    out.sort((a, b) => b.urgency.compareTo(a.urgency));
    return out;
  }
}
