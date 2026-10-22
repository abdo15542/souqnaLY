import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'admin_models.dart';

class AdminDB {
  static Database? _db;

  static Future<Database> get db async => _db ??= await _open();

  static Future<Database> _open() async {
    final path = p.join(await getDatabasesPath(), 'souqna_admin.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  static Future<void> _onCreate(Database d, int v) async {
    await d.execute(
        'CREATE TABLE shops(id TEXT PRIMARY KEY,name TEXT NOT NULL,owner_name TEXT NOT NULL DEFAULT \'\',phone TEXT NOT NULL DEFAULT \'\',plan TEXT NOT NULL DEFAULT \'trial\',status TEXT NOT NULL DEFAULT \'active\',created_at TEXT NOT NULL DEFAULT \'\',updated_at TEXT NOT NULL DEFAULT \'\')');
    await d.execute(
        'CREATE TABLE licenses(id INTEGER PRIMARY KEY AUTOINCREMENT,shop_id TEXT NOT NULL,features TEXT NOT NULL DEFAULT \'\',max_devices INTEGER NOT NULL DEFAULT 0,issued_at TEXT NOT NULL DEFAULT \'\',expires_at TEXT NOT NULL DEFAULT \'\',grace_days INTEGER NOT NULL DEFAULT 0,allow_export INTEGER NOT NULL DEFAULT 1,allow_backup INTEGER NOT NULL DEFAULT 1,allow_branches INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT \'active\',nonce TEXT NOT NULL DEFAULT \'\',signature TEXT NOT NULL DEFAULT \'\',code TEXT NOT NULL DEFAULT \'\',created_at TEXT NOT NULL DEFAULT \'\')');
    await d.execute(
        'CREATE INDEX IF NOT EXISTS idx_licenses_shop ON licenses(shop_id)');
  }

  static Future<List<Shop>> getShops() async {
    final d = await db;
    final rows = await d.query('shops', orderBy: 'updated_at DESC');
    return rows.map(Shop.fromMap).toList();
  }

  static Future<Shop?> getShop(String id) async {
    final d = await db;
    final rows =
        await d.query('shops', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : Shop.fromMap(rows.first);
  }

  static Future<void> saveShop(Shop s) async {
    final d = await db;
    await d.insert('shops', s.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<void> setShopStatus(String id, String status) async {
    final d = await db;
    await d.update('shops', {'status': status, 'updated_at': DateTime.now().toIso8601String()},
        where: 'id = ?', whereArgs: [id]);
  }

  static Future<void> deleteShop(String id) async {
    final d = await db;
    await d.delete('licenses', where: 'shop_id = ?', whereArgs: [id]);
    await d.delete('shops', where: 'id = ?', whereArgs: [id]);
  }

  static Future<List<LicenseRecord>> getLicenses(String shopId) async {
    final d = await db;
    final rows = await d.query('licenses',
        where: 'shop_id = ?', whereArgs: [shopId], orderBy: 'id DESC');
    return rows.map(LicenseRecord.fromMap).toList();
  }

  static Future<int> addLicense(LicenseRecord r) async {
    final d = await db;
    return d.insert('licenses', r.toMap());
  }
}
