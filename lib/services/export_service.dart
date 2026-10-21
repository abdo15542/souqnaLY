import 'dart:io';
import 'package:cross_file/cross_file.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../audit_labels.dart';
import '../db.dart';
import '../models.dart';

class ExportService {
  static Future<void> exportProductsCsv() async {
    final items = await LocalDB.getAllProducts();
    final bf = StringBuffer();
    _row(bf, ['ID', 'الاسم', 'التصنيف', 'الوحدة', 'الباركود', 'شراء', 'بيع', 'كمية', 'حد أدنى', 'نشط']);
    for (final Product pr in items) {
      _row(bf, [pr.id ?? '', pr.name, pr.category, pr.unit, pr.barcode,
          pr.buyPrice.toStringAsFixed(2), pr.sellPrice.toStringAsFixed(2),
          pr.qty.toStringAsFixed(2), pr.minQty.toStringAsFixed(2), pr.isActive ? 'نعم' : 'لا']);
    }
    await _share('products', bf.toString());
  }

  static Future<void> exportSalesCsv() async {
    final rows = await LocalDB.getSalesDetailCsv();
    final bf = StringBuffer();
    _row(bf, ['فاتورة', 'التاريخ', 'الحالة', 'الصنف', 'كمية', 'بيع', 'شراء', 'إجمالي', 'ربح', 'ملاحظة إلغاء']);
    for (final row in rows) {
      final ra = row['refunded_at'] as String?;
      final st = ra == null ? 'مكتملة' : 'ملغاة';
      final rn = (row['refund_note'] as String?) ?? '';
      _row(bf, [row['sale_id'] ?? '', row['created_at'] ?? '', st, row['name'] ?? '',
          (row['qty'] as num?)?.toStringAsFixed(2) ?? '',
          (row['price'] as num?)?.toStringAsFixed(2) ?? '',
          (row['cost_price'] as num?)?.toStringAsFixed(2) ?? '',
          (row['total'] as num?)?.toStringAsFixed(2) ?? '',
          (row['profit'] as num?)?.toStringAsFixed(2) ?? '', rn]);
    }
    await _share('sales', bf.toString());
  }

  static Future<void> exportDebtsCsv() async {
    final debts = await LocalDB.getDebts();
    final bf = StringBuffer();
    _row(bf, ['ID', 'الزبون', 'الهاتف', 'المبلغ', 'المدفوع', 'المتبقي', 'ملاحظة', 'التاريخ']);
    for (final Debt d in debts) {
      _row(bf, [d.id ?? '', d.customer, d.phone, d.amount.toStringAsFixed(2),
          d.paid.toStringAsFixed(2), d.remaining.toStringAsFixed(2), d.note, d.createdAt]);
    }
    await _share('debts', bf.toString());
  }

  static Future<void> exportSuppliersCsv() async {
    final list = await LocalDB.getAllSuppliers();
    final bf = StringBuffer();
    _row(bf, ['ID', 'الاسم', 'الهاتف', 'العنوان', 'ملاحظة', 'نشط', 'تاريخ الإنشاء']);
    for (final Supplier s in list) {
      _row(bf, [s.id ?? '', s.name, s.phone, s.address, s.note,
          s.isActive ? 'نعم' : 'لا', s.createdAt]);
    }
    await _share('suppliers', bf.toString());
  }

  static Future<void> exportPurchaseOrdersCsv() async {
    final list = await LocalDB.getPurchaseOrders(status: '', limit: 5000);
    final bf = StringBuffer();
    _row(bf, ['رقم الأمر', 'المورد', 'الحالة', 'الإجمالي', 'ملاحظة', 'إنشاء', 'استلام']);
    for (final PurchaseOrder po in list) {
      _row(bf, [po.id, po.supplierName, po.status, po.total.toStringAsFixed(2),
          po.note, po.createdAt, po.receivedAt ?? '']);
    }
    await _share('purchase_orders', bf.toString());
  }

  static Future<void> exportAuditCsv(
      {DateTime? from, DateTime? to, int? cashierId, String? action, String search = ''}) async {
    final rows = await LocalDB.getAuditLogFiltered(
        from: from, to: to, cashierId: cashierId, action: action, search: search, limit: 5000);
    final bf = StringBuffer();
    _row(bf, ['ID', 'التاريخ', 'الكاشير', 'العملية', 'الكيان', 'معرّف', 'التفاصيل']);
    for (final AuditEntry e in rows) {
      _row(bf, [e.id ?? '', e.createdAt, e.cashierName, auditActionLabel(e.action),
          e.entity, e.entityId ?? '', e.details]);
    }
    await _share('audit', bf.toString());
  }

  static Future<void> _share(String name, String content) async {
    final stamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.').first;
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'souqna_${name}_$stamp.csv'));
    await file.writeAsString('\uFEFF$content');
    await Share.shareXFiles([XFile(file.path)], text: 'تصدير سوقنا — $name');
  }

  static void _row(StringBuffer bf, List<Object?> v) {
    bf.writeln(v.map((x) => _esc(x?.toString() ?? '')).join(','));
  }

  static String _esc(String v) {
    if (v.contains(',') || v.contains('"') || v.contains('\n') || v.contains('\r')) {
      return '"${v.replaceAll('"', '""')}"';
    }
    return v;
  }
}
