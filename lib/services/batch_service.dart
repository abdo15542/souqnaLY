import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';

class BatchService {
  static bool _ready = false;

  static Future<Database> _db() async {
    final d = await LocalDB.db;
    if (!_ready) {
      await d.execute(
          "CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER NOT NULL,product_name TEXT NOT NULL DEFAULT '',batch_no TEXT NOT NULL DEFAULT '',qty REAL NOT NULL DEFAULT 0,cost REAL NOT NULL DEFAULT 0,expiry_date TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT '')");
      await d.execute(
          'CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id)');
      await d.execute(
          'CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date)');
      _ready = true;
    }
    return d;
  }

  static String _two(int v) => v.toString().padLeft(2, '0');

  static String _dateKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${_two(d.month)}-${_two(d.day)}';

  static String _todayKey() => _dateKey(DateTime.now());

  static String _addDaysKey(int days) =>
      _dateKey(DateTime.now().add(Duration(days: days)));

  static int? daysUntil(String expiryDate) {
    if (expiryDate.isEmpty) return null;
    final parsed = DateTime.tryParse(expiryDate);
    if (parsed == null) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(parsed.year, parsed.month, parsed.day);
    return target.difference(today).inDays;
  }

  static String status(ProductBatch b, {int soonDays = 30}) {
    if (b.expiryDate.isEmpty) return 'ok';
    final today = _todayKey();
    if (b.expiryDate.compareTo(today) < 0) return 'expired';
    final soon = _addDaysKey(soonDays);
    if (b.expiryDate.compareTo(soon) <= 0) return 'soon';
    return 'ok';
  }

  static Future<List<ProductBatch>> getBatches({String search = ''}) async {
    final d = await _db();
    final s = search.trim();
    String w = '1=1';
    final ar = <Object?>[];
    if (s.isNotEmpty) {
      w += ' AND (product_name LIKE ? OR batch_no LIKE ?)';
      ar.addAll(['%$s%', '%$s%']);
    }
    final rows = await d.rawQuery(
        "SELECT * FROM batches WHERE $w ORDER BY CASE WHEN expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC, product_name COLLATE NOCASE",
        ar);
    return rows.map(ProductBatch.fromMap).toList();
  }

  static Future<int> saveBatch(ProductBatch b) async {
    final d = await _db();
    final m = b.toMap();
    if (b.id == null) {
      final id = await d.insert('batches', m);
      await LocalDB.logAudit(
          action: 'batch_added',
          entity: 'batch',
          entityId: id,
          details: b.productName);
      return id;
    } else {
      await d.update('batches', m, where: 'id = ?', whereArgs: [b.id]);
      await LocalDB.logAudit(
          action: 'batch_updated',
          entity: 'batch',
          entityId: b.id,
          details: b.productName);
      return b.id!;
    }
  }

  static Future<void> deleteBatch(int id) async {
    final d = await _db();
    final r =
        await d.query('batches', where: 'id = ?', whereArgs: [id], limit: 1);
    final n = r.isEmpty ? '' : r.first['product_name'] as String;
    await d.delete('batches', where: 'id = ?', whereArgs: [id]);
    await LocalDB.logAudit(
        action: 'batch_deleted', entity: 'batch', entityId: id, details: n);
  }

  static Future<BatchExpirySummary> summarize({int soonDays = 30}) async {
    final all = await getBatches();
    int expiring = 0;
    int expired = 0;
    double soonValue = 0;
    double expiredValue = 0;
    for (final b in all) {
      final st = status(b, soonDays: soonDays);
      if (st == 'expired') {
        expired++;
        expiredValue += b.totalValue;
      } else if (st == 'soon') {
        expiring++;
        soonValue += b.totalValue;
      }
    }
    return BatchExpirySummary(
      total: all.length,
      expiringSoon: expiring,
      expired: expired,
      soonValue: soonValue,
      expiredValue: expiredValue,
    );
  }
}
