import '../models.dart';
import '../db.dart';

class PdfReportService {
  static const expenseCategories = ['إيجار', 'كهرباء', 'ماء', 'إنترنت', 'رواتب', 'مشتريات', 'صيانة', 'نقل', 'تسويق', 'أخرى'];

  static Future<void> buildAndShare({required int days}) async {
    // تم تعطيل تصدير PDF مؤقتًا لحل مشكلة التوافق مع AGP الحديث
    // سيتم تفعيله لاحقًا باستخدام حزمة printing الحديثة
  }

  static Future<void> buildAuditAndShare({required List<AuditEntry> entries, required String periodLabel, required AppSettings settings}) async {
    // تم تعطيل تصدير سجل التدقيق PDF مؤقتًا
  }
}
