import 'package:sqflite/sqflite.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';

class ShiftsService {
  static bool _ready = false;

  static Future<void> _ensure() async {
    if (_ready) return;
    final d = await LocalDB.db;
    await d.execute(
        'CREATE TABLE IF NOT EXISTS shifts(id INTEGER PRIMARY KEY AUTOINCREMENT,cashier_id INTEGER,cashier_name TEXT NOT NULL DEFAULT \'\',opening_float REAL NOT NULL DEFAULT 0,closing_actual REAL NOT NULL DEFAULT 0,expected REAL NOT NULL DEFAULT 0,difference REAL NOT NULL DEFAULT 0,note TEXT NOT NULL DEFAULT \'\',status TEXT NOT NULL DEFAULT \'open\',opened_at TEXT NOT NULL,closed_at TEXT)');
    await d.execute(
        'CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)');
    await d.execute(
        'CREATE INDEX IF NOT EXISTS idx_shifts_opened ON shifts(opened_at)');
    _ready = true;
  }

  static Future<Shift?> getOpenShift() async {
    await _ensure();
    final d = await LocalDB.db;
    final r = await d.query('shifts',
        where: 'status = ?', whereArgs: ['open'], orderBy: 'id DESC', limit: 1);
    return r.isEmpty ? null : Shift.fromMap(r.first);
  }

  static Future<List<Shift>> getShifts({String status = ''}) async {
    await _ensure();
    final d = await LocalDB.db;
    final w = status.isEmpty ? null : 'status = ?';
    final ar = status.isEmpty ? null : <Object?>[status];
    final rows =
        await d.query('shifts', where: w, whereArgs: ar, orderBy: 'id DESC');
    return rows.map(Shift.fromMap).toList();
  }

  static Future<int> openShift(double openingFloat, {String note = ''}) async {
    await _ensure();
    final d = await LocalDB.db;
    final now = DateTime.now().toIso8601String();
    final c = CashierSession.current;
    final id = await d.insert('shifts', {
      'cashier_id': c?.id,
      'cashier_name': c?.name ?? 'بدون كاشير',
      'opening_float': openingFloat,
      'closing_actual': 0,
      'expected': 0,
      'difference': 0,
      'note': note,
      'status': 'open',
      'opened_at': now,
      'closed_at': null,
    });
    await LocalDB.logAudit(
        action: 'shift_opened',
        entity: 'shift',
        entityId: id,
        details: 'رصيد ابتدائي ${openingFloat.toStringAsFixed(2)}');
    return id;
  }

  static Future<bool> closeShift(int id, double closingActual,
      {String note = ''}) async {
    await _ensure();
    final d = await LocalDB.db;
    final now = DateTime.now().toIso8601String();

    final pr =
        await d.query('shifts', where: 'id = ?', whereArgs: [id], limit: 1);
    if (pr.isEmpty) return false;
    if (pr.first['status'] != 'open') return false;

    final openedAt = pr.first['opened_at'] as String;
    final opening = (pr.first['opening_float'] as num).toDouble();

    final sr = await d.rawQuery(
        'SELECT COALESCE(SUM(total), 0) t FROM sales '
        'WHERE created_at >= ? AND created_at <= ? AND refunded_at IS NULL',
        [openedAt, now]);
    final sales = (sr.first['t'] as num).toDouble();

    final expected = opening + sales;
    final difference = closingActual - expected;

    await d.update('shifts', {
      'closing_actual': closingActual,
      'expected': expected,
      'difference': difference,
      'note': note,
      'status': 'closed',
      'closed_at': now,
    }, where: 'id = ?', whereArgs: [id]);

    await LocalDB.logAudit(
        action: 'shift_closed',
        entity: 'shift',
        entityId: id,
        details:
            'فرق ${difference.toStringAsFixed(2)} (متوقع ${expected.toStringAsFixed(2)})');
    return true;
  }

  static Future<bool> deleteShift(int id) async {
    await _ensure();
    final d = await LocalDB.db;
    final pr =
        await d.query('shifts', where: 'id = ?', whereArgs: [id], limit: 1);
    if (pr.isEmpty) return false;
    if (pr.first['status'] == 'open') return false;
    await d.delete('shifts', where: 'id = ?', whereArgs: [id]);
    return true;
  }
}
