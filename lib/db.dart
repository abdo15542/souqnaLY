import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import 'models.dart';

class LocalDB {
  static Database? _db;
  static Future<Database> get db async => _db ??= await _init();

  static Future<Database> _init() async {
    return openDatabase(
      join(await getDatabasesPath(), 'souqna_clean.db'),
      version: 1,
      onCreate: (d, v) async {
        await d.execute('CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, buy_price REAL NOT NULL, sell_price REAL NOT NULL, qty REAL NOT NULL)');
        await d.execute('CREATE TABLE sales(id INTEGER PRIMARY KEY AUTOINCREMENT, total REAL NOT NULL, created_at TEXT NOT NULL)');
        await d.execute('CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      },
    );
  }

  // المنتجات
  static Future<List<Product>> getProducts() async {
    final rows = await (await db).query('products', orderBy: 'name');
    return rows.map(Product.fromMap).toList();
  }

  static Future<void> saveProduct(Product p) async {
    if (p.id == null) {
      await (await db).insert('products', p.toMap());
    } else {
      await (await db).update('products', p.toMap(), where: 'id=?', whereArgs: [p.id]);
    }
  }

  static Future<void> deleteProduct(int id) async {
    await (await db).delete('products', where: 'id=?', whereArgs: [id]);
  }

  // المبيعات
  static Future<int> createSale(List<CartLine> cart) async {
    final total = cart.fold<double>(0, (s, l) => s + l.total);
    final sid = await (await db).insert('sales', {'total': total, 'created_at': DateTime.now().toIso8601String()});
    
    // خصم الكميات
    for (final line in cart) {
      if (line.product.id != null) {
        await (await db).rawUpdate('UPDATE products SET qty = MAX(0, qty - ?) WHERE id = ?', [line.qty, line.product.id]);
      }
    }
    return sid;
  }

  static Future<double> getTotalSalesToday() async {
    final startOfDay = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final res = await (await db).rawQuery('SELECT COALESCE(SUM(total),0) t FROM sales WHERE created_at >= ?', [startOfDay.toIso8601String()]);
    return (res.first['t'] as num).toDouble();
  }

  // الإعدادات
  static Future<AppSettings> getSettings() async {
    final rows = await (await db).query('settings');
    final map = <String, String>{for (var r in rows) r['key']! as String: r['value']! as String};
    return AppSettings(shopName: map['shop_name'] ?? 'سوقنا', currency: map['currency'] ?? 'د.ل');
  }

  static Future<void> saveSettings(AppSettings s) async {
    final batch = (await db).batch();
    batch.insert('settings', {'key': 'shop_name', 'value': s.shopName}, conflictAlgorithm: ConflictAlgorithm.replace);
    batch.insert('settings', {'key': 'currency', 'value': s.currency}, conflictAlgorithm: ConflictAlgorithm.replace);
    await batch.commit(noResult: true);
  }
}
