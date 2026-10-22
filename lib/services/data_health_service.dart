import 'package:sqflite/sqflite.dart';
import '../db.dart';

class DataHealthIssue {
  final String title;
  final String details;
  final String severity;

  const DataHealthIssue({
    required this.title,
    required this.details,
    required this.severity,
  });
}

class DataHealthService {
  static Future<bool> _tableExists(String table) async {
    final d = await LocalDB.db;
    final r = await d.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    );
    return r.isNotEmpty;
  }

  static String _dayString(DateTime d) {
    return "${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
  }

  static Future<List<DataHealthIssue>> runChecks() async {
    final issues = <DataHealthIssue>[];
    final d = await LocalDB.db;

    final today = _dayString(DateTime.now());
    final soon = _dayString(DateTime.now().add(const Duration(days: 7)));
    final cutoff7 = DateTime.now().subtract(const Duration(days: 7)).toIso8601String();

    // 1) باركود مكرر
    final dup = await d.rawQuery(
      "SELECT barcode, COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE is_active = 1 AND barcode != '' GROUP BY barcode HAVING c > 1",
    );

    for (final r in dup) {
      issues.add(
        DataHealthIssue(
          title: 'باركود مكرر',
          details: "${r['barcode']} × ${r['c']} — ${r['names'] ?? ''}",
          severity: 'danger',
        ),
      );
    }

    // 2) مخزون سالب
    final neg = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE qty < 0",
    );

    final negCount = (neg.first['c'] as num?)?.toInt() ?? 0;
    if (negCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'مخزون سالب',
          details: "$negCount صنف: ${neg.first['names'] ?? ''}",
          severity: 'danger',
        ),
      );
    }

    // 3) مخزون منخفض
    final low = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE is_active = 1 AND qty <= min_qty",
    );

    final lowCount = (low.first['c'] as num?)?.toInt() ?? 0;
    if (lowCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'مخزون منخفض',
          details: "$lowCount صنف تحت الحد الأدنى: ${low.first['names'] ?? ''}",
          severity: 'warn',
        ),
      );
    }

    // 4) أسعار ناقصة
    final noPrice = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE is_active = 1 AND (buy_price <= 0 OR sell_price <= 0)",
    );

    final noPriceCount = (noPrice.first['c'] as num?)?.toInt() ?? 0;
    if (noPriceCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'أسعار ناقصة',
          details: "$noPriceCount صنف بدون سعر شراء أو بيع: ${noPrice.first['names'] ?? ''}",
          severity: 'warn',
        ),
      );
    }

    // 5) ربح سالب
    final badMargin = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE is_active = 1 AND buy_price > 0 AND sell_price < buy_price",
    );

    final badMarginCount = (badMargin.first['c'] as num?)?.toInt() ?? 0;
    if (badMarginCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'ربح سالب',
          details: "$badMarginCount صنف سعر بيعه أقل من سعر شرائه: ${badMargin.first['names'] ?? ''}",
          severity: 'warn',
        ),
      );
    }

    // 6) أصناف لم تُبع أبدًا
    final neverSold = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM products WHERE is_active = 1 AND qty > 0 AND last_sold_at = ''",
    );

    final neverSoldCount = (neverSold.first['c'] as num?)?.toInt() ?? 0;
    if (neverSoldCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'أصناف لم تُبع بعد',
          details: "$neverSoldCount صنف له كمية但没有 آخر بيع: ${neverSold.first['names'] ?? ''}",
          severity: 'info',
        ),
      );
    }

    // 7) ديون متأخرة
    final overdue = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(customer, ' | ') names FROM debts WHERE amount - paid > 0.001 AND due_date != '' AND due_date < ?",
      [today],
    );

    final overdueCount = (overdue.first['c'] as num?)?.toInt() ?? 0;
    if (overdueCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'ديون متأخرة',
          details: "$overdueCount دين تجاوز تاريخ الاستحقاق: ${overdue.first['names'] ?? ''}",
          severity: 'danger',
        ),
      );
    }

    // 8) دفعات منتهية/قريبة الانتهاء
    if (await _tableExists('batches')) {
      final expired = await d.rawQuery(
        "SELECT COUNT(*) c, GROUP_CONCAT(product_name, ' | ') names FROM batches WHERE expiry_date != '' AND expiry_date < ?",
        [today],
      );

      final expiredCount = (expired.first['c'] as num?)?.toInt() ?? 0;
      if (expiredCount > 0) {
        issues.add(
          DataHealthIssue(
            title: 'دفعات منتهية',
            details: "$expiredCount دفعة منتهية: ${expired.first['names'] ?? ''}",
            severity: 'danger',
          ),
        );
      }

      final expiring = await d.rawQuery(
        "SELECT COUNT(*) c, GROUP_CONCAT(product_name, ' | ') names FROM batches WHERE expiry_date != '' AND expiry_date >= ? AND expiry_date <= ?",
        [today, soon],
      );

      final expiringCount = (expiring.first['c'] as num?)?.toInt() ?? 0;
      if (expiringCount > 0) {
        issues.add(
          DataHealthIssue(
            title: 'دفعات تقارب الانتهاء',
            details: "$expiringCount دفعة تنتهي خلال 7 أيام: ${expiring.first['names'] ?? ''}",
            severity: 'warn',
          ),
        );
      }
    }

    // 9) نوبات مفتوحة
    if (await _tableExists('shifts')) {
      final open = await d.rawQuery(
        "SELECT COUNT(*) c, GROUP_CONCAT(cashier_name, ' | ') names FROM shifts WHERE status = 'open'",
      );

      final openCount = (open.first['c'] as num?)?.toInt() ?? 0;
      if (openCount > 0) {
        issues.add(
          DataHealthIssue(
            title: 'نوبات صندوق مفتوحة',
            details: "$openCount نوبة لم تُغلق بعد: ${open.first['names'] ?? ''}",
            severity: 'warn',
          ),
        );
      }
    }

    // 10) أوامر شراء مسودة قديمة
    final oldDraft = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(supplier_name, ' | ') names FROM purchase_orders WHERE status = 'draft' AND created_at < ?",
      [cutoff7],
    );

    final oldDraftCount = (oldDraft.first['c'] as num?)?.toInt() ?? 0;
    if (oldDraftCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'أوامر شراء مسودة قديمة',
          details: "$oldDraftCount مسودة أقدم من 7 أيام: ${oldDraft.first['names'] ?? ''}",
          severity: 'info',
        ),
      );
    }

    // 11) كاشيرين بدون PIN
    final noPin = await d.rawQuery(
      "SELECT COUNT(*) c, GROUP_CONCAT(name, ' | ') names FROM cashiers WHERE is_active = 1 AND pin_hash = ''",
    );

    final noPinCount = (noPin.first['c'] as num?)?.toInt() ?? 0;
    if (noPinCount > 0) {
      issues.add(
        DataHealthIssue(
          title: 'كاشيرين بدون PIN',
          details: "$noPinCount كاشير نشط بدون رمز دخول: ${noPin.first['names'] ?? ''}",
          severity: 'danger',
        ),
      );
    }

    return issues;
  }
}
