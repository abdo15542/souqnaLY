import 'package:sqflite/sqflite.dart';
import '../db.dart';

class AnalyticsService {
  static Future<bool> _tableExists(String table) async {
    final d = await LocalDB.db;
    final r = await d.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    );
    return r.isNotEmpty;
  }

  static String _dayString(DateTime d) {
    return "${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
  }

  static Future<List<Map<String, Object?>>> salesByCategory(DateTime since) async {
    final d = await LocalDB.db;
    return d.rawQuery(
      "SELECT COALESCE(NULLIF(p.category, ''), 'غير مصنف') category, SUM(si.qty) qty, SUM(si.qty * si.price) revenue, SUM(si.qty * (si.price - si.cost_price)) profit FROM sale_items si JOIN sales s ON s.id = si.sale_id LEFT JOIN products p ON p.id = si.product_id WHERE s.refunded_at IS NULL AND s.created_at >= ? GROUP BY COALESCE(NULLIF(p.category, ''), 'غير مصنف') ORDER BY revenue DESC",
      [since.toIso8601String()],
    );
  }

  static Future<List<Map<String, Object?>>> salesByCashier(DateTime since) async {
    final d = await LocalDB.db;
    return d.rawQuery(
      "SELECT CASE WHEN s.cashier_id IS NULL THEN 'بدون كاشير' ELSE COALESCE(c.name, 'كاشير #' || CAST(s.cashier_id AS TEXT)) END cashier, COUNT(*) invoices, COALESCE(SUM(s.total), 0) revenue, COALESCE(SUM(s.total - s.cost), 0) profit FROM sales s LEFT JOIN cashiers c ON c.id = s.cashier_id WHERE s.refunded_at IS NULL AND s.created_at >= ? GROUP BY s.cashier_id ORDER BY revenue DESC",
      [since.toIso8601String()],
    );
  }

  static Future<List<Map<String, Object?>>> purchasesBySupplier(DateTime since) async {
    final d = await LocalDB.db;
    return d.rawQuery(
      "SELECT supplier_name supplier, COUNT(*) orders, COALESCE(SUM(total), 0) total FROM purchase_orders WHERE status = 'received' AND COALESCE(received_at, created_at) >= ? GROUP BY supplier_name ORDER BY total DESC",
      [since.toIso8601String()],
    );
  }

  static Future<Map<String, Object?>> inventorySummary({int staleDays = 30}) async {
    final d = await LocalDB.db;
    final cutoff = DateTime.now().subtract(Duration(days: staleDays)).toIso8601String();
    final rows = await d.rawQuery(
      "SELECT COUNT(*) products, COALESCE(SUM(qty * buy_price), 0) cost_value, COALESCE(SUM(qty * sell_price), 0) retail_value, COALESCE(SUM(CASE WHEN qty <= min_qty THEN 1 ELSE 0 END), 0) low_count, COALESCE(SUM(CASE WHEN qty > 0 AND (last_sold_at = '' OR last_sold_at < ?) THEN 1 ELSE 0 END), 0) stale_count FROM products WHERE is_active = 1",
      [cutoff],
    );
    return rows.isEmpty ? <String, Object?>{} : rows.first;
  }

  static Future<List<Map<String, Object?>>> topDebtors() async {
    final d = await LocalDB.db;
    return d.rawQuery(
      "SELECT customer, COALESCE(SUM(amount - paid), 0) remaining, COUNT(*) debts FROM debts WHERE amount - paid > 0.001 GROUP BY customer ORDER BY remaining DESC LIMIT 10",
    );
  }

  static Future<List<Map<String, Object?>>> expiringBatches(int days) async {
    if (!await _tableExists('batches')) {
      return <Map<String, Object?>>[];
    }

    final d = await LocalDB.db;
    final cutoff = _dayString(DateTime.now().add(Duration(days: days)));

    return d.rawQuery(
      "SELECT product_name, qty, expires_at, note FROM batches WHERE expires_at != '' AND expires_at <= ? ORDER BY expires_at ASC LIMIT 20",
      [cutoff],
    );
  }

  static Future<int> openShiftsCount() async {
    if (!await _tableExists('shifts')) return 0;

    final d = await LocalDB.db;
    final r = await d.rawQuery(
      "SELECT COUNT(*) c FROM shifts WHERE status = 'open'",
    );

    return (r.first['c'] as num?)?.toInt() ?? 0;
  }

  static Future<Map<String, Object?>> draftPoSummary() async {
    final d = await LocalDB.db;
    final r = await d.rawQuery(
      "SELECT COUNT(*) c, COALESCE(SUM(total), 0) t FROM purchase_orders WHERE status = 'draft'",
    );
    return r.isEmpty ? <String, Object?>{} : r.first;
  }
}
