import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';

class MarketBasketService {
  static Future<List<BasketPair>> analyze({int days = 90, int minPairs = 2}) async {
    final d = await LocalDB.db;
    final since = DateTime.now().subtract(Duration(days: days)).toIso8601String();

    final totalRows = await d.rawQuery(
      "SELECT COUNT(DISTINCT s.id) c FROM sales s JOIN sale_items si ON si.sale_id = s.id "
      "WHERE s.refunded_at IS NULL AND s.created_at >= ? AND si.product_id IS NOT NULL",
      [since],
    );
    final totalInvoices = (totalRows.first['c'] as num?)?.toInt() ?? 0;
    if (totalInvoices == 0) return <BasketPair>[];

    final countRows = await d.rawQuery(
      "SELECT si.product_id pid, COUNT(DISTINCT si.sale_id) c "
      "FROM sale_items si JOIN sales s ON s.id = si.sale_id "
      "WHERE s.refunded_at IS NULL AND s.created_at >= ? AND si.product_id IS NOT NULL "
      "GROUP BY si.product_id",
      [since],
    );
    final perProduct = <int, int>{};
    for (final r in countRows) {
      final pid = r['pid'] as int?;
      if (pid != null) perProduct[pid] = (r['c'] as num?)?.toInt() ?? 0;
    }

    final pairRows = await d.rawQuery(
      "SELECT a.product_id aid, b.product_id bid, COUNT(DISTINCT a.sale_id) both_cnt "
      "FROM sale_items a "
      "JOIN sale_items b ON a.sale_id = b.sale_id AND a.product_id < b.product_id "
      "JOIN sales s ON s.id = a.sale_id "
      "WHERE s.refunded_at IS NULL AND s.created_at >= ? "
      "AND a.product_id IS NOT NULL AND b.product_id IS NOT NULL "
      "GROUP BY a.product_id, b.product_id",
      [since],
    );

    final products = await LocalDB.getProducts();
    final names = <int, String>{for (final p in products) if (p.id != null) p.id!: p.name};

    final out = <BasketPair>[];
    for (final r in pairRows) {
      final aid = r['aid'] as int?;
      final bid = r['bid'] as int?;
      final both = (r['both_cnt'] as num?)?.toInt() ?? 0;
      if (aid == null || bid == null) continue;
      if (both < minPairs) continue;

      final ca = perProduct[aid] ?? 0;
      final cb = perProduct[bid] ?? 0;
      if (ca == 0 || cb == 0) continue;

      final support = both / totalInvoices;
      final confAB = both / ca;
      final confBA = both / cb;
      final expectedB = cb / totalInvoices;
      final lift = expectedB == 0 ? 0.0 : confAB / expectedB;

      out.add(BasketPair(
        nameA: names[aid] ?? '#$aid',
        nameB: names[bid] ?? '#$bid',
        support: support,
        confidenceAB: confAB,
        confidenceBA: confBA,
        lift: lift,
        bothCount: both,
      ));
    }

    out.sort((x, y) {
      final c = y.lift.compareTo(x.lift);
      if (c != 0) return c;
      return y.bothCount.compareTo(x.bothCount);
    });
    return out;
  }
}
