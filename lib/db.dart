import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import 'cashier_session.dart';
import 'models.dart';

class LocalDB {
  static Database? _database;
  static const int _version = 6;

  static Future<Database> get db async => _database ??= await _open();

  static Future<Database> _open() async {
    final path = p.join(await getDatabasesPath(), 'souqna.db');
    return openDatabase(path, version: _version, onConfigure: (d) async => d.execute('PRAGMA foreign_keys = ON'), onCreate: _onCreate, onUpgrade: _onUpgrade);
  }

  static Future<void> _onCreate(Database d, int v) async {
    await d.execute('''CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', unit TEXT NOT NULL DEFAULT 'حبة', barcode TEXT NOT NULL DEFAULT '', buy_price REAL NOT NULL DEFAULT 0, sell_price REAL NOT NULL DEFAULT 0, qty REAL NOT NULL DEFAULT 0, min_qty REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')''');
    await d.execute('''CREATE TABLE sales(id INTEGER PRIMARY KEY AUTOINCREMENT, total REAL NOT NULL, cost REAL NOT NULL DEFAULT 0, cashier_id INTEGER, created_at TEXT NOT NULL, refunded_at TEXT, refunded_by INTEGER, refund_note TEXT NOT NULL DEFAULT '')''');
    await d.execute('''CREATE TABLE sale_items(id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER, name TEXT NOT NULL, price REAL NOT NULL, cost_price REAL NOT NULL DEFAULT 0, qty REAL NOT NULL, FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE)''');
    await d.execute('''CREATE TABLE debts(id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', amount REAL NOT NULL, paid REAL NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)''');
    await d.execute('''CREATE TABLE debt_payments(id INTEGER PRIMARY KEY AUTOINCREMENT, debt_id INTEGER NOT NULL, amount REAL NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(debt_id) REFERENCES debts(id) ON DELETE CASCADE)''');
    await d.execute('''CREATE TABLE expenses(id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, amount REAL NOT NULL, note TEXT NOT NULL DEFAULT '', cashier_id INTEGER, created_at TEXT NOT NULL)''');
    await d.execute('''CREATE TABLE cashiers(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin_hash TEXT NOT NULL DEFAULT '', pin_salt TEXT NOT NULL DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT '')''');
    await d.execute('''CREATE TABLE stock_takes(id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_id INTEGER, cashier_name TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', items_count INTEGER NOT NULL DEFAULT 0, total_diff REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)''');
    await d.execute('''CREATE TABLE stock_take_items(id INTEGER PRIMARY KEY AUTOINCREMENT, take_id INTEGER NOT NULL, product_id INTEGER, name TEXT NOT NULL, previous_qty REAL NOT NULL, counted_qty REAL NOT NULL, FOREIGN KEY(take_id) REFERENCES stock_takes(id) ON DELETE CASCADE)''');
    await d.execute('''CREATE TABLE audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_id INTEGER, cashier_name TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', entity_id INTEGER, details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)''');
    await d.execute('''CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)''');
    for (final idx in ['idx_products_active ON products(is_active)', 'idx_products_barcode ON products(barcode)', 'idx_sales_created ON sales(created_at)', 'idx_sales_refunded ON sales(refunded_at)', 'idx_sale_items_sale ON sale_items(sale_id)', 'idx_debts_customer ON debts(customer)', 'idx_debt_payments_debt ON debt_payments(debt_id)', 'idx_expenses_created ON expenses(created_at)', 'idx_audit_created ON audit_log(created_at)', 'idx_stock_takes_created ON stock_takes(created_at)', 'idx_stock_take_items_take ON stock_take_items(take_id)']) {
      await d.execute('CREATE INDEX IF NOT EXISTS $idx');
    }
  }

  static Future<void> _onUpgrade(Database d, int old, int neu) async {
    if (old < 3) {
      await _addColumn(d, 'products', 'category', "TEXT NOT NULL DEFAULT ''");
      await _addColumn(d, 'products', 'unit', "TEXT NOT NULL DEFAULT 'حبة'");
      await _addColumn(d, 'products', 'min_qty', 'REAL NOT NULL DEFAULT 0');
      await _addColumn(d, 'products', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
      await _addColumn(d, 'products', 'created_at', "TEXT NOT NULL DEFAULT ''");
      await _addColumn(d, 'products', 'updated_at', "TEXT NOT NULL DEFAULT ''");
      await _addColumn(d, 'debts', 'phone', "TEXT NOT NULL DEFAULT ''");
      await _addColumn(d, 'debts', 'note', "TEXT NOT NULL DEFAULT ''");
      await _addColumn(d, 'sales', 'cost', 'REAL NOT NULL DEFAULT 0');
      await _addColumn(d, 'sale_items', 'cost_price', 'REAL NOT NULL DEFAULT 0');
      await d.execute('''CREATE TABLE IF NOT EXISTS debt_payments(id INTEGER PRIMARY KEY AUTOINCREMENT, debt_id INTEGER NOT NULL, amount REAL NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(debt_id) REFERENCES debts(id) ON DELETE CASCADE)''');
      await d.execute('''CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)''');
    }
    if (old < 4) {
      await _addColumn(d, 'products', 'barcode', "TEXT NOT NULL DEFAULT ''");
      await d.execute('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
    }
    if (old < 5) {
      await _addColumn(d, 'sales', 'cashier_id', 'INTEGER');
      await d.execute('''CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, amount REAL NOT NULL, note TEXT NOT NULL DEFAULT '', cashier_id INTEGER, created_at TEXT NOT NULL)''');
      await d.execute('''CREATE TABLE IF NOT EXISTS cashiers(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin_hash TEXT NOT NULL DEFAULT '', pin_salt TEXT NOT NULL DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT '')''');
      await d.execute('''CREATE TABLE IF NOT EXISTS stock_takes(id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_id INTEGER, cashier_name TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', items_count INTEGER NOT NULL DEFAULT 0, total_diff REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL)''');
      await d.execute('''CREATE TABLE IF NOT EXISTS stock_take_items(id INTEGER PRIMARY KEY AUTOINCREMENT, take_id INTEGER NOT NULL, product_id INTEGER, name TEXT NOT NULL, previous_qty REAL NOT NULL, counted_qty REAL NOT NULL, FOREIGN KEY(take_id) REFERENCES stock_takes(id) ON DELETE CASCADE)''');
      await d.execute('''CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_id INTEGER, cashier_name TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', entity_id INTEGER, details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)''');
      for (final idx in ['idx_expenses_created ON expenses(created_at)', 'idx_audit_created ON audit_log(created_at)', 'idx_stock_takes_created ON stock_takes(created_at)', 'idx_stock_take_items_take ON stock_take_items(take_id)']) {
        await d.execute('CREATE INDEX IF NOT EXISTS $idx');
      }
    }
    if (old < 6) {
      await _addColumn(d, 'sales', 'refunded_at', 'TEXT');
      await _addColumn(d, 'sales', 'refunded_by', 'INTEGER');
      await _addColumn(d, 'sales', 'refund_note', "TEXT NOT NULL DEFAULT ''");
      await d.execute('CREATE INDEX IF NOT EXISTS idx_sales_refunded ON sales(refunded_at)');
    }
  }

  static Future<void> _addColumn(Database d, String t, String c, String def) async {
    final info = await d.rawQuery('PRAGMA table_info($t)');
    if (!info.any((e) => e['name'] == c)) {
      await d.execute('ALTER TABLE $t ADD COLUMN $c $def');
    }
  }

  // ---------------- Audit ----------------
  static Future<void> logAudit({required String action, String entity = '', int? entityId, String details = ''}) async {
    final d = await db;
    await d.insert('audit_log', {'cashier_id': CashierSession.cashierId, 'cashier_name': CashierSession.displayName, 'action': action, 'entity': entity, 'entity_id': entityId, 'details': details, 'created_at': DateTime.now().toIso8601String()});
  }

  static Future<List<AuditEntry>> getAuditLog({int limit = 100}) async {
    final d = await db;
    final rows = await d.query('audit_log', orderBy: 'id DESC', limit: limit);
    return rows.map(AuditEntry.fromMap).toList();
  }

  static Future<List<String>> getAuditActions() async {
    final d = await db;
    final rows = await d.rawQuery('SELECT DISTINCT action FROM audit_log ORDER BY action');
    return rows.map((r) => r['action'] as String).toList();
  }

  static Future<List<AuditEntry>> getAuditLogFiltered({DateTime? from, DateTime? to, int? cashierId, String? action, String? entity, String search = '', int limit = 500}) async {
    final d = await db;
    final clauses = <String>[];
    final args = <Object?>[];
    if (from != null) { clauses.add('created_at >= ?'); args.add(from.toIso8601String()); }
    if (to != null) { clauses.add('created_at < ?'); args.add(to.toIso8601String()); }
    if (cashierId != null) { clauses.add('cashier_id = ?'); args.add(cashierId); }
    if (action != null && action.isNotEmpty) { clauses.add('action = ?'); args.add(action); }
    if (entity != null && entity.isNotEmpty) { clauses.add('entity = ?'); args.add(entity); }
    final s = search.trim();
    if (s.isNotEmpty) { clauses.add('(cashier_name LIKE ? OR action LIKE ? OR entity LIKE ? OR details LIKE ?)'); args.addAll(['%$s%', '%$s%', '%$s%', '%$s%']); }
    final where = clauses.isEmpty ? null : clauses.join(' AND ');
    final rows = await d.query('audit_log', where: where, whereArgs: args, orderBy: 'id DESC', limit: limit);
    return rows.map(AuditEntry.fromMap).toList();
  }

  // ---------------- Products ----------------
  static Future<List<Product>> getProducts({String search = ''}) async {
    final d = await db;
    final s = search.trim();
    String where = 'is_active = 1';
    final args = <Object?>[];
    if (s.isNotEmpty) { where += ' AND (name LIKE ? OR category LIKE ? OR barcode LIKE ?)'; args.addAll(['%$s%', '%$s%', '%$s%']); }
    final rows = await d.query('products', where: where, whereArgs: args, orderBy: 'name COLLATE NOCASE');
    return rows.map(Product.fromMap).toList();
  }

  static Future<List<Product>> getAllProducts() async {
    final d = await db;
    final rows = await d.query('products', orderBy: 'name COLLATE NOCASE');
    return rows.map(Product.fromMap).toList();
  }

  static Future<Product?> getProductByBarcode(String barcode) async {
    final code = barcode.trim();
    if (code.isEmpty) return null;
    final d = await db;
    final rows = await d.query('products', where: 'barcode = ? AND is_active = 1', whereArgs: [code], limit: 1);
    return rows.isEmpty ? null : Product.fromMap(rows.first);
  }

  static Future<int> getProductCount() async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) c FROM products WHERE is_active = 1');
    return r.first['c'] as int;
  }

  static Future<int> getLowStockCount() async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) c FROM products WHERE is_active = 1 AND qty <= min_qty');
    return r.first['c'] as int;
  }

  static Future<int> saveProduct(Product product) async {
    final d = await db;
    final map = product.toMap();
    if (product.id == null) {
      final id = await d.insert('products', map);
      await logAudit(action: 'product_added', entity: 'product', entityId: id, details: product.name);
      return id;
    } else {
      await d.update('products', map, where: 'id = ?', whereArgs: [product.id]);
      await logAudit(action: 'product_updated', entity: 'product', entityId: product.id, details: product.name);
      return product.id!;
    }
  }

  static Future<void> deleteProduct(int id) async {
    final d = await db;
    final rows = await d.query('products', where: 'id = ?', whereArgs: [id], limit: 1);
    final name = rows.isEmpty ? '' : rows.first['name'] as String;
    await d.delete('products', where: 'id = ?', whereArgs: [id]);
    await logAudit(action: 'product_deleted', entity: 'product', entityId: id, details: name);
  }

  // ---------------- Sales ----------------
  static Future<int> createSale(List<CartLine> lines, {int? cashierId}) async {
    final d = await db;
    final now = DateTime.now().toIso8601String();
    return d.transaction((txn) async {
      double total = 0, cost = 0;
      for (final l in lines) { total += l.total; cost += l.product.buyPrice * l.qty; }
      final saleId = await txn.insert('sales', {'total': total, 'cost': cost, 'cashier_id': cashierId, 'created_at': now, 'refunded_at': null, 'refunded_by': null, 'refund_note': ''});
      for (final l in lines) {
        await txn.insert('sale_items', {'sale_id': saleId, 'product_id': l.product.id, 'name': l.product.name, 'price': l.product.sellPrice, 'cost_price': l.product.buyPrice, 'qty': l.qty});
        await txn.rawUpdate('UPDATE products SET qty = CASE WHEN qty < ? THEN 0 ELSE qty - ? END, updated_at = ? WHERE id = ?', [l.qty, l.qty, now, l.product.id]);
      }
      return saleId;
    });
  }

  static Future<Sale?> getSale(int id) async {
    final d = await db;
    final saleRows = await d.query('sales', where: 'id = ?', whereArgs: [id]);
    if (saleRows.isEmpty) return null;
    final itemRows = await d.query('sale_items', where: 'sale_id = ?', whereArgs: [id], orderBy: 'id');
    return Sale.fromMaps(saleRows.first, itemRows);
  }

  static Future<SalesStats> getSalesStats(DateTime since) async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS revenue, COALESCE(SUM(cost), 0) AS cost FROM sales WHERE created_at >= ? AND refunded_at IS NULL', [since.toIso8601String()]);
    final row = r.first;
    final revenue = (row['revenue'] as num).toDouble();
    final cost = (row['cost'] as num).toDouble();
    return SalesStats(count: row['c'] as int, revenue: revenue, cost: cost, profit: revenue - cost);
  }

  static Future<List<Map<String, dynamic>>> getTopProducts(DateTime since, int limit) async {
    final d = await db;
    return d.rawQuery('SELECT si.name AS name, SUM(si.qty) AS qty, SUM(si.qty * si.price) AS revenue, SUM(si.qty * (si.price - si.cost_price)) AS profit FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.created_at >= ? AND s.refunded_at IS NULL GROUP BY si.name ORDER BY revenue DESC LIMIT ?', [since.toIso8601String(), limit]);
  }

  static Future<List<Map<String, dynamic>>> getDailySales(DateTime since) async {
    final d = await db;
    return d.rawQuery('SELECT date(created_at) AS day, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue, COALESCE(SUM(cost), 0) AS cost FROM sales WHERE created_at >= ? AND refunded_at IS NULL GROUP BY day ORDER BY day DESC', [since.toIso8601String()]);
  }

  static Future<List<Map<String, dynamic>>> getSalesDetailCsv() async {
    final d = await db;
    return d.rawQuery('SELECT s.id AS sale_id, s.created_at AS created_at, s.refunded_at AS refunded_at, s.refund_note AS refund_note, si.name AS name, si.qty AS qty, si.price AS price, si.cost_price AS cost_price, (si.qty * si.price) AS total, (si.qty * (si.price - si.cost_price)) AS profit FROM sales s JOIN sale_items si ON si.sale_id = s.id ORDER BY s.id DESC, si.id ASC');
  }

  static Future<List<Sale>> getSalesHistory({DateTime? from, DateTime? to, String search = '', int limit = 100}) async {
    final d = await db;
    final clauses = <String>[];
    final args = <Object?>[];
    if (from != null) { clauses.add('s.created_at >= ?'); args.add(from.toIso8601String()); }
    if (to != null) { clauses.add('s.created_at < ?'); args.add(to.toIso8601String()); }
    final s = search.trim();
    if (s.isNotEmpty) { clauses.add('(CAST(s.id AS TEXT) LIKE ? OR EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = s.id AND si.name LIKE ?))'); args.addAll(['%$s%', '%$s%']); }
    final where = clauses.isEmpty ? '' : 'WHERE ${clauses.join(' AND ')}';
    final rows = await d.rawQuery('SELECT s.* FROM sales s $where ORDER BY s.id DESC LIMIT ?', [...args, limit]);
    final sales = <Sale>[];
    for (final row in rows) {
      final items = await d.query('sale_items', where: 'sale_id = ?', whereArgs: [row['id']], orderBy: 'id');
      sales.add(Sale.fromMaps(row, items));
    }
    return sales;
  }

  static Future<bool> voidSale(int saleId, {String note = ''}) async {
    final d = await db;
    final now = DateTime.now().toIso8601String();
    final ok = await d.transaction((txn) async {
      final saleRows = await txn.query('sales', where: 'id = ?', whereArgs: [saleId], limit: 1);
      if (saleRows.isEmpty) return false;
      if (saleRows.first['refunded_at'] != null) return false;
      final items = await txn.query('sale_items', where: 'sale_id = ?', whereArgs: [saleId]);
      for (final item in items) {
        final productId = item['product_id'];
        final qty = (item['qty'] as num).toDouble();
        if (productId != null) {
          await txn.rawUpdate('UPDATE products SET qty = qty + ?, updated_at = ? WHERE id = ?', [qty, now, productId]);
        }
      }
      await txn.update('sales', {'refunded_at': now, 'refunded_by': CashierSession.cashierId, 'refund_note': note}, where: 'id = ?', whereArgs: [saleId]);
      return true;
    });
    if (ok) {
      await logAudit(action: 'sale_voided', entity: 'sale', entityId: saleId, details: note.isEmpty ? 'إلغاء فاتورة' : note);
    }
    return ok;
  }

  static Future<RefundsSummary> getRefundsSummary(DateTime since) async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS t FROM sales WHERE refunded_at >= ?', [since.toIso8601String()]);
    return RefundsSummary(count: r.first['c'] as int, total: (r.first['t'] as num).toDouble());
  }

  // ---------------- Expenses ----------------
  static Future<void> addExpense(Expense e) async {
    final d = await db;
    final id = await d.insert('expenses', e.toMap());
    await logAudit(action: 'expense_added', entity: 'expense', entityId: id, details: '${e.category}: ${e.amount}');
  }

  static Future<List<Expense>> getExpenses(DateTime since) async {
    final d = await db;
    final rows = await d.query('expenses', where: 'created_at >= ?', whereArgs: [since.toIso8601String()], orderBy: 'id DESC');
    return rows.map(Expense.fromMap).toList();
  }

  static Future<ExpensesSummary> getExpensesSummary(DateTime since) async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS t FROM expenses WHERE created_at >= ?', [since.toIso8601String()]);
    return ExpensesSummary(count: r.first['c'] as int, total: (r.first['t'] as num).toDouble());
  }

  static Future<List<Map<String, dynamic>>> getExpensesByCategory(DateTime since) async {
    final d = await db;
    return d.rawQuery('SELECT category, SUM(amount) AS total FROM expenses WHERE created_at >= ? GROUP BY category ORDER BY total DESC', [since.toIso8601String()]);
  }

  static Future<double> getNetProfit(DateTime since) async {
    final sales = await getSalesStats(since);
    final exp = await getExpensesSummary(since);
    return sales.profit - exp.total;
  }

  // ---------------- Cashiers ----------------
  static Future<List<Cashier>> getCashiers() async {
    final d = await db;
    final rows = await d.query('cashiers', orderBy: 'is_active DESC, name COLLATE NOCASE');
    return rows.map(Cashier.fromMap).toList();
  }

  static Future<List<Cashier>> getActiveCashiers() async {
    final d = await db;
    final rows = await d.query('cashiers', where: 'is_active = 1', orderBy: 'name COLLATE NOCASE');
    return rows.map(Cashier.fromMap).toList();
  }

  static Future<int> getActiveCashierCount() async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) c FROM cashiers WHERE is_active = 1');
    return r.first['c'] as int;
  }

  static Future<int> addCashier(String name, String pin) async {
    final d = await db;
    final salt = CashierSession.generateSalt();
    final id = await d.insert('cashiers', {'name': name.trim(), 'pin_hash': CashierSession.hashPin(pin, salt), 'pin_salt': salt, 'is_active': 1, 'created_at': DateTime.now().toIso8601String()});
    await logAudit(action: 'cashier_added', entity: 'cashier', entityId: id, details: name);
    return id;
  }

  static Future<void> updateCashier(int id, {String? name, bool? isActive, String? newPin}) async {
    final d = await db;
    final map = <String, Object?>{};
    if (name != null) map['name'] = name.trim();
    if (isActive != null) map['is_active'] = isActive ? 1 : 0;
    if (newPin != null && newPin.isNotEmpty) {
      final salt = CashierSession.generateSalt();
      map['pin_salt'] = salt;
      map['pin_hash'] = CashierSession.hashPin(newPin, salt);
    }
    if (map.isNotEmpty) await d.update('cashiers', map, where: 'id = ?', whereArgs: [id]);
    await logAudit(action: 'cashier_updated', entity: 'cashier', entityId: id, details: name ?? '');
  }

  static Future<void> deleteCashier(int id) async {
    final d = await db;
    await d.delete('cashiers', where: 'id = ?', whereArgs: [id]);
    await logAudit(action: 'cashier_deleted', entity: 'cashier', entityId: id, details: '');
  }

  static Future<Cashier?> verifyCashier(int id, String pin) async {
    final d = await db;
    final rows = await d.query('cashiers', where: 'id = ? AND is_active = 1', whereArgs: [id], limit: 1);
    if (rows.isEmpty) return null;
    final c = Cashier.fromMap(rows.first);
    return CashierSession.verifyPin(c, pin) ? c : null;
  }

  // ---------------- Stock Takes ----------------
  static Future<int> createStockTake(List<StockTakeLine> lines, {String note = ''}) async {
    final d = await db;
    final now = DateTime.now().toIso8601String();
    return d.transaction((txn) async {
      double totalDiff = 0;
      for (final l in lines) { totalDiff += l.diff; }
      final takeId = await txn.insert('stock_takes', {'cashier_id': CashierSession.cashierId, 'cashier_name': CashierSession.displayName, 'note': note, 'items_count': lines.length, 'total_diff': totalDiff, 'created_at': now});
      for (final l in lines) {
        await txn.insert('stock_take_items', {'take_id': takeId, 'product_id': l.product.id, 'name': l.product.name, 'previous_qty': l.product.qty, 'counted_qty': l.countedQty});
        await txn.rawUpdate('UPDATE products SET qty = ?, updated_at = ? WHERE id = ?', [l.countedQty, now, l.product.id]);
      }
      return takeId;
    });
  }

  static Future<List<StockTake>> getStockTakes() async {
    final d = await db;
    final rows = await d.query('stock_takes', orderBy: 'id DESC');
    return rows.map(StockTake.fromMap).toList();
  }

  static Future<List<StockTakeItem>> getStockTakeItems(int takeId) async {
    final d = await db;
    final rows = await d.query('stock_take_items', where: 'take_id = ?', whereArgs: [takeId], orderBy: 'id');
    return rows.map(StockTakeItem.fromMap).toList();
  }

  // ---------------- Debts ----------------
  static Future<List<Debt>> getDebts({String search = ''}) async {
    final d = await db;
    final s = search.trim();
    String where = '1=1';
    final args = <Object?>[];
    if (s.isNotEmpty) { where += ' AND (customer LIKE ? OR phone LIKE ?)'; args.addAll(['%$s%', '%$s%']); }
    final rows = await d.query('debts', where: where, whereArgs: args, orderBy: 'CASE WHEN amount-paid > 0 THEN 0 ELSE 1 END, id DESC');
    return rows.map(Debt.fromMap).toList();
  }

  static Future<DebtsSummary> getDebtsSummary() async {
    final d = await db;
    final r = await d.rawQuery('SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS total, COALESCE(SUM(paid), 0) AS paid FROM debts');
    final row = r.first;
    final total = (row['total'] as num).toDouble();
    final paid = (row['paid'] as num).toDouble();
    return DebtsSummary(count: row['c'] as int, total: total, paid: paid, remaining: total - paid);
  }

  static Future<void> addDebt(Debt debt) async {
    final d = await db;
    final id = await d.insert('debts', debt.toNewMap());
    await logAudit(action: 'debt_added', entity: 'debt', entityId: id, details: '${debt.customer}: ${debt.amount}');
  }

  static Future<void> payDebt(int debtId, double payAmount) async {
    final d = await db;
    final now = DateTime.now().toIso8601String();
    await d.transaction((txn) async {
      final rows = await txn.query('debts', where: 'id = ?', whereArgs: [debtId]);
      if (rows.isEmpty) return;
      final amount = (rows.first['amount'] as num).toDouble();
      final paid = (rows.first['paid'] as num).toDouble();
      final remaining = amount - paid;
      double real = payAmount;
      if (real <= 0) return;
      if (real > remaining) real = remaining;
      await txn.rawUpdate('UPDATE debts SET paid = paid + ? WHERE id = ?', [real, debtId]);
      await txn.insert('debt_payments', {'debt_id': debtId, 'amount': real, 'created_at': now});
    });
    await logAudit(action: 'debt_paid', entity: 'debt', entityId: debtId, details: '$payAmount');
  }

  static Future<List<DebtPayment>> getPayments(int debtId) async {
    final d = await db;
    final rows = await d.query('debt_payments', where: 'debt_id = ?', whereArgs: [debtId], orderBy: 'id DESC');
    return rows.map(DebtPayment.fromMap).toList();
  }

  // ---------------- Settings ----------------
  static Future<AppSettings> getAppSettings() async {
    final d = await db;
    final rows = await d.query('settings');
    final map = <String, String>{for (final r in rows) r['key'] as String: r['value'] as String};
    return AppSettings(shopName: map['shop_name'] ?? 'سوقنا', phone: map['phone'] ?? '', address: map['address'] ?? '', currency: map['currency'] ?? 'د.ل');
  }

  static Future<void> saveSettings(AppSettings s) async {
    final d = await db;
    final b = d.batch();
    void put(String k, String v) => b.insert('settings', {'key': k, 'value': v}, conflictAlgorithm: ConflictAlgorithm.replace);
    put('shop_name', s.shopName);
    put('phone', s.phone);
    put('address', s.address);
    put('currency', s.currency);
    await b.commit(noResult: true);
  }

  // ---------------- Backup ----------------
  static const _backupTables = ['settings', 'cashiers', 'products', 'sales', 'sale_items', 'debts', 'debt_payments', 'stock_takes', 'stock_take_items', 'expenses', 'audit_log'];

  static Future<String> exportBackup() async {
    final d = await db;
    final data = <String, List<Map<String, Object?>>>{};
    for (final t in _backupTables) { data[t] = await d.query(t); }
    return const JsonEncoder.withIndent('  ').convert({'app': 'souqnaLY', 'schema': _version, 'exported_at': DateTime.now().toIso8601String(), 'data': data});
  }

  static Future<void> restoreBackup(String source) async {
    final decoded = jsonDecode(source) as Map<String, dynamic>;
    final data = (decoded['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final d = await db;
    await d.transaction((txn) async {
      for (final t in ['debt_payments', 'sale_items', 'stock_take_items', 'sales', 'stock_takes', 'expenses', 'audit_log', 'debts', 'products', 'cashiers', 'settings']) { await txn.delete(t); }
      Future<void> ins(String table) async {
        final rows = (data[table] as List?) ?? [];
        for (final row in rows) { await txn.insert(table, Map<String, Object?>.from(row as Map), conflictAlgorithm: ConflictAlgorithm.replace); }
      }
      for (final t in _backupTables) { await ins(t); }
    });
    await logAudit(action: 'backup_restored', entity: 'system', details: 'استرجاع نسخة احتياطية');
  }
}
