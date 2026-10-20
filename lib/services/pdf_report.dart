import 'dart:io';
import 'package:cross_file/cross_file.dart';
import 'package:flutter_html_to_pdf/flutter_html_to_pdf.dart';
import 'package:share_plus/share_plus.dart';
import '../audit_labels.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class PdfReportService {
  static const expenseCategories = ['إيجار', 'كهرباء', 'ماء', 'إنترنت', 'رواتب', 'مشتريات', 'صيانة', 'نقل', 'تسويق', 'أخرى'];

  static Future<void> buildAndShare({required int days}) async {
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    final since = day.subtract(Duration(days: days - 1));
    final settings = await LocalDB.getAppSettings();
    final stats = await LocalDB.getSalesStats(since);
    final expenses = await LocalDB.getExpensesSummary(since);
    final byCat = await LocalDB.getExpensesByCategory(since);
    final top = await LocalDB.getTopProducts(since, 10);
    final debts = await LocalDB.getDebtsSummary();
    final net = await LocalDB.getNetProfit(since);
    final periodLabel = days == 1 ? 'اليوم' : days == 7 ? 'آخر 7 أيام' : 'آخر 30 يوم';
    final html = _buildHtml(settings: settings, periodLabel: periodLabel, stats: stats, expenses: expenses, byCat: byCat, top: top, debts: debts, net: net);
    final targetName = 'souqna_report_${DateTime.now().millisecondsSinceEpoch}';
    final result = await FlutterHtmlToPdf.convertFromHtmlContent(html, fileName: targetName);
    final file = result?.file;
    if (file == null || !await file.exists()) throw Exception('تعذر توليد ملف PDF');
    await Share.shareXFiles([XFile(file.path)], text: 'تقرير سوقنا — ${settings.shopName}');
  }

  static String _buildHtml({required AppSettings settings, required String periodLabel, required SalesStats stats, required ExpensesSummary expenses, required List<Map<String, dynamic>> byCat, required List<Map<String, dynamic>> top, required DebtsSummary debts, required double net}) {
    final cur = settings.currency;
    final nowStr = formatDateTime(DateTime.now().toIso8601String());
    final topRows = top.isEmpty ? '<tr><td colspan="4" style="text-align:center;color:#888">لا توجد مبيعات</td></tr>' : top.map((r) => '''<tr><td>${r['name']}</td><td>${formatQty((r['qty'] as num).toDouble())}</td><td>${formatMoney((r['revenue'] as num).toDouble(), cur)}</td><td>${formatMoney((r['profit'] as num).toDouble(), cur)}</td></tr>''').join();
    final catRows = byCat.isEmpty ? '<tr><td colspan="2" style="text-align:center;color:#888">لا توجد مصروفات</td></tr>' : byCat.map((r) => '''<tr><td>${r['category']}</td><td>${formatMoney((r['total'] as num).toDouble(), cur)}</td></tr>''').join();
    return '''<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:sans-serif;color:#111;padding:16px;}h1{color:#0F766E;margin:0 0 4px;font-size:22px;}.sub{color:#555;font-size:13px;margin-bottom:16px;}.grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}.card{flex:1 1 45%;border:1px solid #ddd;border-radius:8px;padding:10px;}.card .t{font-size:12px;color:#666;}.card .v{font-size:18px;font-weight:bold;margin-top:4px;}.net{background:#0F766E;color:#fff;}.net .t,.net .v{color:#fff;}h2{font-size:16px;border-bottom:2px solid #0F766E;padding-bottom:4px;margin:18px 0 8px;}table{width:100%;border-collapse:collapse;font-size:13px;}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right;}th{background:#f3f4f6;}.foot{margin-top:20px;font-size:11px;color:#888;text-align:center;}</style></head><body><h1>${settings.shopName}</h1><div class="sub">تقرير عن فترة: $periodLabel — صدر في $nowStr</div><div class="grid"><div class="card"><div class="t">عدد الفواتير</div><div class="v">${stats.count}</div></div><div class="card"><div class="t">الإيرادات</div><div class="v">${formatMoney(stats.revenue, cur)}</div></div><div class="card"><div class="t">التكلفة</div><div class="v">${formatMoney(stats.cost, cur)}</div></div><div class="card"><div class="t">ربح المبيعات</div><div class="v">${formatMoney(stats.profit, cur)}</div></div><div class="card"><div class="t">المصروفات</div><div class="v">${formatMoney(expenses.total, cur)}</div></div><div class="card net"><div class="t">صافي الربح</div><div class="v">${formatMoney(net, cur)}</div></div></div><h2>الأصناف الأكثر مبيعاً</h2><table><thead><tr><th>الصنف</th><th>الكمية</th><th>الإيراد</th><th>الربح</th></tr></thead><tbody>$topRows</tbody></table><h2>المصروفات حسب الفئة</h2><table><thead><tr><th>الفئة</th><th>المبلغ</th></tr></thead><tbody>$catRows</tbody></table><h2>ملخص الديون</h2><table><tbody><tr><td>إجمالي الديون</td><td>${formatMoney(debts.total, cur)}</td></tr><tr><td>المسدد</td><td>${formatMoney(debts.paid, cur)}</td></tr><tr><td>المتبقي</td><td>${formatMoney(debts.remaining, cur)}</td></tr><tr><td>عدد العملاء</td><td>${debts.count}</td></tr></tbody></table><div class="foot">سوقنا — نظام إدارة المحلات الصغيرة (محلي أولاً)</div></body></html>''';
  }

  static Future<void> buildAuditAndShare({required List<AuditEntry> entries, required String periodLabel, required AppSettings settings}) async {
    final rows = entries.isEmpty ? '<tr><td colspan="7" style="text-align:center;color:#888">لا توجد سجلات في هذه الفترة</td></tr>' : entries.map((e) => '''<tr><td>${e.id ?? ''}</td><td>${_escapeHtml(formatDateTime(e.createdAt))}</td><td>${_escapeHtml(e.cashierName)}</td><td>${_escapeHtml(auditActionLabel(e.action))}</td><td>${_escapeHtml(e.entity)}</td><td>${e.entityId ?? ''}</td><td>${_escapeHtml(e.details)}</td></tr>''').join();
    final html = '''<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:sans-serif;color:#111;padding:16px;}h1{color:#0F766E;margin:0 0 4px;font-size:22px;}.sub{color:#555;font-size:13px;margin-bottom:16px;}h2{font-size:16px;border-bottom:2px solid #0F766E;padding-bottom:4px;margin:18px 0 8px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right;vertical-align:top;}th{background:#f3f4f6;}.foot{margin-top:20px;font-size:11px;color:#888;text-align:center;}</style></head><body><h1>${_escapeHtml(settings.shopName)}</h1><div class="sub">سجل التدقيق — الفترة: ${_escapeHtml(periodLabel)}</div><h2>عدد السجلات: ${entries.length}</h2><table><thead><tr><th>ID</th><th>الوقت</th><th>الكاشير</th><th>العملية</th><th>الكيان</th><th>معرّف الكيان</th><th>التفاصيل</th></tr></thead><tbody>$rows</tbody></table><div class="foot">سوقنا — نظام إدارة المحلات الصغيرة (محلي أولاً)</div></body></html>''';
    final targetName = 'souqna_audit_${DateTime.now().millisecondsSinceEpoch}';
    final result = await FlutterHtmlToPdf.convertFromHtmlContent(html, fileName: targetName);
    final file = result?.file;
    if (file == null || !await file.exists()) throw Exception('تعذر توليد ملف PDF');
    await Share.shareXFiles([XFile(file.path)], text: 'سجل تدقيق سوقنا — ${settings.shopName}');
  }

  static String _escapeHtml(String value) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
}
