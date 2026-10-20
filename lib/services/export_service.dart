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
    _appendRow(bf, ['ID', 'الاسم', 'التصنيف', 'الوحدة', 'الباركود', 'سعر الشراء', 'سعر البيع', 'الكمية', 'الحد الأدنى', 'نشط']);
    for (final Product pr in items) {
      _appendRow(bf, [pr.id ?? '', pr.name, pr.category, pr.unit, pr.barcode, pr.buyPrice.toStringAsFixed(2), pr.sellPrice.toStringAsFixed(2), pr.qty.toStringAsFixed(2), pr.minQty.toStringAsFixed(2), pr.isActive ? 'نعم' : 'لا']);
    }
    await _shareCsv('products', bf.toString());
  }

  static Future<void> exportSalesCsv() async {
    final rows = await LocalDB.getSalesDetailCsv();
    final bf = StringBuffer();
    _appendRow(bf, ['رقم الفاتورة', 'التاريخ', 'الحالة', 'الصنف', 'الكمية', 'سعر البيع', 'سعر الشراء', 'الإجمالي', 'الربح', 'ملاحظة الإلغاء']);
    for (final row in rows) {
      final refundedAt = row['refunded_at'] as String?;
      final status = refundedAt == null ? 'مكتملة' : 'ملغاة';
      final refundNote = (row['refund_note'] as String?) ?? '';
      _appendRow(bf, [row['sale_id'] ?? '', row['created_at'] ?? '', status, row['name'] ?? '', (row['qty'] as num?)?.toStringAsFixed(2) ?? '', (row['price'] as num?)?.toStringAsFixed(2) ?? '', (row['cost_price'] as num?)?.toStringAsFixed(2) ?? '', (row['total'] as num?)?.toStringAsFixed(2) ?? '', (row['profit'] as num?)?.toStringAsFixed(2) ?? '', refundNote]);
    }
    await _shareCsv('sales', bf.toString());
  }

  static Future<void> exportDebtsCsv() async {
    final debts = await LocalDB.getDebts();
    final bf = StringBuffer();
    _appendRow(bf, ['ID', 'الزبون', 'الهاتف', 'المبلغ', 'المدفوع', 'المتبقي', 'ملاحظة', 'التاريخ']);
    for (final Debt d in debts) {
      _appendRow(bf, [d.id ?? '', d.customer, d.phone, d.amount.toStringAsFixed(2), d.paid.toStringAsFixed(2), d.remaining.toStringAsFixed(2), d.note, d.createdAt]);
    }
    await _shareCsv('debts', bf.toString());
  }

  static Future<void> exportAuditCsv({DateTime? from, DateTime? to, int? cashierId, String? action, String search = ''}) async {
    final rows = await LocalDB.getAuditLogFiltered(from: from, to: to, cashierId: cashierId, action: action, search: search, limit: 5000);
    final bf = StringBuffer();
    _appendRow(bf, ['ID', 'التاريخ', 'الكاشير', 'العملية', 'الكيان', 'معرّف الكيان', 'التفاصيل']);
    for (final AuditEntry e in rows) {
      _appendRow(bf, [e.id ?? '', e.createdAt, e.cashierName, auditActionLabel(e.action), e.entity, e.entityId ?? '', e.details]);
    }
    await _shareCsv('audit', bf.toString());
  }

  static Future<void> _shareCsv(String name, String content) async {
    final stamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.').first;
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'souqna_${name}_$stamp.csv'));
    await file.writeAsString('\uFEFF$content');
    await Share.shareXFiles([XFile(file.path)], text: 'تصدير سوقنا — $name');
  }

  static void _appendRow(StringBuffer bf, List<Object?> values) {
    bf.writeln(values.map((v) => _escape(v?.toString() ?? '')).join(','));
  }

  static String _escape(String value) {
    if (value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r')) {
      return '"${value.replaceAll('"', '""')}"';
    }
    return value;
  }
}
