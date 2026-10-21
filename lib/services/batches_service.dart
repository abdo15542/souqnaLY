import 'package:sqflite/sqflite.dart' hide Batch;
import '../db.dart';
import '../models.dart';

class BatchesService {
  static bool _ready = false;

  static Future<void> _ensure() async {
    if (_ready) return;
    final d = await LocalDB.db;
    await d.execute(
        'CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,product_name TEXT NOT NULL DEFAULT \'\',qty REAL NOT NULL DEFAULT 0,cost_price REAL NOT NULL DEFAULT 0,produced_at TEXT NOT NULL DEFAULT \'\',expires_at TEXT NOT NULL,note TEXT NOT NULL DEFAULT \'\',created_at TEXT NOT NULL)');
    await d.execute(
        'CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id)');
    await d.execute(
        'CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expires_at)');
    _ready = true;
  }

  static String _dateOnly(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  static Future<List<Batch>> getBatches(
      {String search = '', String productId = ''}) async {
    await _ensure();
    final d = await LocalDB.db;
    final cl = <String>[];
    final ar = <Object?>[];
    if (productId.isNotEmpty) {
      cl.add('product_id = ?');
      ar.add(int.tryParse(productId));
    }
    final s = search.trim();
    if (s.isNotEmpty) {
      cl.add('(product_name LIKE ? OR note LIKE ?)');
      ar.addAll(['%$s%', '%$s%']);
    }
    final w = cl.isEmpty ? null : cl.join(' AND ');
    final rows = await d.query('batches',
        where: w, whereArgs: ar, orderBy: 'expires_at ASC, id ASC');
    return rows.map(Batch.fromMap).toList();
  }

  static Future<int> saveBatch(Batch b) async {
    await _ensure();
    final d = await LocalDB.db;
    final now = DateTime.now().toIso8601String();
    final m = <String, Object?>{
      'product_id': b.productId,
      'product_name': b.productName,
      'qty': b.qty,
      'cost_price': b.costPrice,
      'produced_at': b.producedAt,
      'expires_at': b.expiresAt,
      'note': b.note,
      'created_at': b.createdAt.isEmpty ? now : b.createdAt,
    };
    if (b.id == null) {
      final id = await d.insert('batches', m);
      await LocalDB.logAudit(
          action: 'batch_added',
          entity: 'batch',
          entityId: id,
          details: '${b.productName} ينتهي ${b.expiresAt}');
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
    await _ensure();
    final d = await LocalDB.db;
    await d.delete('batches', where: 'id = ?', whereArgs: [id]);
    await LocalDB.logAudit(
        action: 'batch_deleted', entity: 'batch', entityId: id, details: '');
  }

  // 0 = سليم، 1 = قرب الانتهاء، 2 = منتهي
  static int expiryStatus(Batch b, int daysAhead) {
    final exp = DateTime.tryParse(b.expiresAt);
    if (exp == null) return 0;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final e = DateTime(exp.year, exp.month, exp.day);
    final diff = e.difference(today).inDays;
    if (diff < 0) return 2;
    if (diff <= daysAhead) return 1;
    return 0;
  }

  static Future<List<Batch>> expiringSoon(int daysAhead) async {
    final all = await getBatches();
    final out = <Batch>[];
    for (final b in all) {
      final st = expiryStatus(b, daysAhead);
      if (st == 1 || st == 2) out.add(b);
    }
    out.sort((a, b) => a.expiresAt.compareTo(b.expiresAt));
    return out;
  }

  static Future<Map<String, int>> expiryCounts(int daysAhead) async {
    final all = await getBatches();
    int ok = 0, soon = 0, expired = 0;
    for (final b in all) {
      final st = expiryStatus(b, daysAhead);
      if (st == 2) {
        expired++;
      } else if (st == 1) {
        soon++;
      } else {
        ok++;
      }
    }
    return {'ok': ok, 'soon': soon, 'expired': expired};
  }

  static String todayStr() => _dateOnly(DateTime.now());
}
