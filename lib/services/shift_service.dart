import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';

class ShiftService {
  static bool _ready = false;

  static Future<Database> _db() async {
    final d = await LocalDB.db;
    if (!_ready) {
      await d.execute(
          'CREATE TABLE IF NOT EXISTS shifts(id INTEGER PRIMARY KEY AUTOINCREMENT,opened_by_cashier_id INTEGER,opened_by_name TEXT NOT NULL DEFAULT \'\',opened_at TEXT NOT NULL,closed_at TEXT,status TEXT NOT NULL DEFAULT \'open\',opening_cash REAL NOT NULL DEFAULT 0,counted_cash REAL,sales_total REAL NOT NULL DEFAULT 0,debt_paid_total REAL NOT NULL DEFAULT 0,expense_total REAL NOT NULL DEFAULT 0,payroll_total REAL NOT NULL DEFAULT 0,expected_delta REAL NOT NULL DEFAULT 0,expected_drawer REAL NOT NULL DEFAULT 0,difference REAL,note TEXT NOT NULL DEFAULT \'\')');
      await d.execute(
          'CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)');
      await d.execute(
          'CREATE INDEX IF NOT EXISTS idx_shifts_opened ON shifts(opened_at)');
      _ready = true;
    }
    return d;
  }

  static Future<Shift?> getOpenShift() async {
    final d = await _db();
    final rows = await d.query('shifts',
        where: 'status = ?', whereArgs: ['open'], orderBy: 'id DESC', limit: 1);
    return rows.isEmpty ? null : Shift.fromMap(rows.first);
  }

  static Future<List<Shift>> getClosedShifts({int limit = 200}) async {
    final d = await _db();
    final rows = await d.query('shifts',
        where: 'status = ?',
        whereArgs: ['closed'],
        orderBy: 'id DESC',
        limit: limit);
    return rows.map(Shift.fromMap).toList();
  }

  static Future<int> openShift({
    required int? cashierId,
    required String cashierName,
    required double openingCash,
  }) async {
    final existing = await getOpenShift();
    if (existing != null) {
      throw StateError('توجد نوبة مفتوحة بالفعل. أغلقها أولًا.');
    }
    final d = await _db();
    return d.insert('shifts', {
      'opened_by_cashier_id': cashierId,
      'opened_by_name': cashierName,
      'opened_at': DateTime.now().toIso8601String(),
      'closed_at': null,
      'status': 'open',
      'opening_cash': openingCash,
      'counted_cash': null,
      'sales_total': 0,
      'debt_paid_total': 0,
      'expense_total': 0,
      'payroll_total': 0,
      'expected_delta': 0,
      'expected_drawer': openingCash,
      'difference': null,
      'note': '',
    });
  }

  static Future<ShiftBreakdown> computeBreakdown(
      {required String from, required String to, required double openingCash}) async {
    final d = await _db();

    final salesRows = await d.rawQuery(
        'SELECT COALESCE(SUM(total),0) t FROM sales WHERE created_at >= ? AND created_at < ? AND refunded_at IS NULL',
        [from, to]);
    final sales = (salesRows.first['t'] as num).toDouble();

    final debtRows = await d.rawQuery(
        'SELECT COALESCE(SUM(amount),0) t FROM debt_payments WHERE created_at >= ? AND created_at < ?',
        [from, to]);
    final debtPaid = (debtRows.first['t'] as num).toDouble();

    final expRows = await d.rawQuery(
        'SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE created_at >= ? AND created_at < ?',
        [from, to]);
    final expenses = (expRows.first['t'] as num).toDouble();

    double payroll = 0;
    final hasPayroll = (await d.rawQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='payroll_entries'"))
        .isNotEmpty;
    if (hasPayroll) {
      final payRows = await d.rawQuery(
          'SELECT COALESCE(SUM(amount),0) t FROM payroll_entries WHERE created_at >= ? AND created_at < ?',
          [from, to]);
      payroll = (payRows.first['t'] as num).toDouble();
    }

    final delta = sales + debtPaid - expenses - payroll;
    final drawer = openingCash + delta;

    return ShiftBreakdown(
      sales: sales,
      debtPaid: debtPaid,
      expenses: expenses,
      payroll: payroll,
      expectedDelta: delta,
      openingCash: openingCash,
      expectedDrawer: drawer,
    );
  }

  static Future<Shift> closeShift({
    required int shiftId,
    required double countedCash,
    required String note,
  }) async {
    final d = await _db();
    final rows = await d.query('shifts',
        where: 'id = ?', whereArgs: [shiftId], limit: 1);
    if (rows.isEmpty) throw StateError('النوبة غير موجودة.');
    final shift = Shift.fromMap(rows.first);
    if (!shift.isOpen) throw StateError('النوبة مغلقة بالفعل.');

    final now = DateTime.now().toIso8601String();
    final bd = await computeBreakdown(
      from: shift.openedAt,
      to: now,
      openingCash: shift.openingCash,
    );
    final diff = countedCash - bd.expectedDrawer;

    await d.update('shifts', {
      'closed_at': now,
      'status': 'closed',
      'counted_cash': countedCash,
      'sales_total': bd.sales,
      'debt_paid_total': bd.debtPaid,
      'expense_total': bd.expenses,
      'payroll_total': bd.payroll,
      'expected_delta': bd.expectedDelta,
      'expected_drawer': bd.expectedDrawer,
      'difference': diff,
      'note': note,
    }, where: 'id = ?', whereArgs: [shiftId]);

    await LocalDB.logAudit(
        action: 'shift_closed',
        entity: 'shift',
        entityId: shiftId,
        details: 'فرق ${diff.toStringAsFixed(2)}');

    final refreshed = await d.query('shifts',
        where: 'id = ?', whereArgs: [shiftId], limit: 1);
    return Shift.fromMap(refreshed.first);
  }

  static String severityOfDifference(double diff, double sales) {
    final abs = diff.abs();
    if (abs < 1.0) return 'ok';
    if (sales <= 0) return abs > 50 ? 'danger' : 'warn';
    final ratio = abs / sales;
    if (ratio <= 0.01) return 'ok';
    if (ratio <= 0.05) return 'warn';
    return 'danger';
  }
}
