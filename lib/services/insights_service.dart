import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';
import 'settings_service.dart';

class InsightsService {
  static String _dayKey(DateTime d) {
    return '${d.year.toString().padLeft(4, '0')}-'
        '${d.month.toString().padLeft(2, '0')}-'
        '${d.day.toString().padLeft(2, '0')}';
  }

  static Future<Map<int, double>> _soldByProduct(
      Database d, String since) async {
    final rows = await d.rawQuery(
      'SELECT si.product_id pid, SUM(si.qty) qty '
      'FROM sale_items si '
      'JOIN sales s ON s.id = si.sale_id '
      'WHERE s.refunded_at IS NULL '
      'AND s.created_at >= ? '
      'AND si.product_id IS NOT NULL '
      'GROUP BY si.product_id',
      [since],
    );

    final map = <int, double>{};
    for (final r in rows) {
      final pid = r['pid'] as int?;
      if (pid != null) {
        map[pid] = (r['qty'] as num).toDouble();
      }
    }
    return map;
  }

  static Future<List<PurchaseSuggestion>> purchaseSuggestions(
      {InsightSettings? settings}) async {
    settings ??= await SettingsService.getInsightSettings();

    final d = await LocalDB.db;
    final now = DateTime.now();
    final since30 = now.subtract(const Duration(days: 30)).toIso8601String();
    final since60 = now.subtract(const Duration(days: 60)).toIso8601String();

    final products = await LocalDB.getProducts();
    final sold30 = await _soldByProduct(d, since30);
    final sold60 = await _soldByProduct(d, since60);

    final out = <PurchaseSuggestion>[];

    for (final p in products) {
      final s30 = sold30[p.id] ?? 0.0;
      final s60 = sold60[p.id] ?? 0.0;

      final avg30 = s30 / 30.0;
      final avg60 = s60 / 60.0;
      final avg = avg30 > 0.0 ? avg30 : avg60;

      double reorder =
          (avg * settings.leadTimeDays) + (avg * settings.safetyFactor);

      if (p.minQty > reorder) reorder = p.minQty;
      if (reorder <= 0.0) continue;

      if (p.qty < reorder) {
        double suggested = reorder - p.qty;
        suggested = suggested.ceilToDouble();
        if (suggested < 1.0) suggested = 1.0;

        final urgency =
            ((reorder - p.qty) / reorder).clamp(0.0, 1.0).toDouble();

        out.add(PurchaseSuggestion(
          product: p,
          avgDaily: avg,
          reorderPoint: reorder,
          suggestedQty: suggested,
          urgency: urgency,
          reason: avg > 0.0
              ? 'متوسط البيع اليومي ${avg.toStringAsFixed(2)} خلال 30 يومًا'
              : 'الكمية وصلت للحد الأدنى',
        ));
      }
    }

    out.sort((a, b) => b.urgency.compareTo(a.urgency));
    return out;
  }

  static String _abcXyzRecommendation(String matrix, bool isLow) {
    String rec;

    if (matrix == 'AX') {
      rec = 'نجم مستقر: حافظ على توفره وراقب الهامش.';
    } else if (matrix == 'AY') {
      rec = 'جيد مع تذبذب: اجعل سلامة المخزون أعلى قليلًا.';
    } else if (matrix == 'AZ') {
      rec = 'عالي القيمة لكن غير مستقر: اطلبه عند الطلب أو بكميات صغيرة.';
    } else if (matrix == 'BX') {
      rec = 'متوسط ومستقر: إعادة طلب دورية مناسبة.';
    } else if (matrix == 'BY') {
      rec = 'متوسط ومتذبذب: راجع الكمية قبل كل طلب.';
    } else if (matrix == 'BZ') {
      rec = 'متوسط ونادر: يحتاج مراجعة جدوى قبل التوسع.';
    } else if (matrix == 'CX') {
      rec = 'بطيء لكن مستقر: قلل الكمية أو فكر في عرض تحفيزي.';
    } else if (matrix == 'CY') {
      rec = 'بطيء ومتذبذب: مراقبة قريبة للمخزون.';
    } else {
      rec = 'راكد أو شبه ميت: تصفية، تخفيض، أو إيقاف الشراء.';
    }

    if (isLow) rec = 'منخفض الآن — $rec';
    return rec;
  }

  static Future<List<AbcXyzItem>> abcXyz(
      {InsightSettings? settings}) async {
    settings ??= await SettingsService.getInsightSettings();

    final d = await LocalDB.db;
    final now = DateTime.now();
    final since90 = now.subtract(const Duration(days: 90)).toIso8601String();
    final since30 = now.subtract(const Duration(days: 30)).toIso8601String();
    final since7 = now.subtract(const Duration(days: 7)).toIso8601String();

    final revRows = await d.rawQuery(
      'SELECT si.product_id pid, SUM(si.qty * si.price) revenue '
      'FROM sale_items si '
      'JOIN sales s ON s.id = si.sale_id '
      'WHERE s.refunded_at IS NULL '
      'AND s.created_at >= ? '
      'AND si.product_id IS NOT NULL '
      'GROUP BY si.product_id',
      [since90],
    );

    final rev = <int, double>{};
    double total = 0.0;

    for (final r in revRows) {
      final pid = r['pid'] as int?;
      if (pid != null) {
        final v = (r['revenue'] as num).toDouble();
        rev[pid] = v;
        total += v;
      }
    }

    final recent7 = await _soldByProduct(d, since7);
    final long30 = await _soldByProduct(d, since30);
    final products = await LocalDB.getProducts();

    products.sort((a, b) {
      final ra = rev[a.id] ?? 0.0;
      final rb = rev[b.id] ?? 0.0;
      return rb.compareTo(ra);
    });

    final out = <AbcXyzItem>[];
    double cum = 0.0;

    for (final p in products) {
      final revenue = rev[p.id] ?? 0.0;
      final share = total == 0.0 ? 0.0 : revenue / total;
      cum += share;

      final abc = total == 0.0
          ? 'C'
          : (cum <= settings.abcA
              ? 'A'
              : (cum <= settings.abcB ? 'B' : 'C'));

      final r7 = (recent7[p.id] ?? 0.0) / 7.0;
      final r30 = (long30[p.id] ?? 0.0) / 30.0;

      String xyz;
      if (r30 <= 0.0001) {
        xyz = 'Z';
      } else {
        final ratio = r7 / r30;
        if (ratio >= 0.75 && ratio <= 1.25) {
          xyz = 'X';
        } else if (ratio >= 0.50 && ratio <= 1.50) {
          xyz = 'Y';
        } else {
          xyz = 'Z';
        }
      }

      final matrix = '$abc$xyz';

      out.add(AbcXyzItem(
        product: p,
        revenue: revenue,
        revenueShare: share,
        cumulativeShare: cum,
        abc: abc,
        xyz: xyz,
        matrix: matrix,
        recommendation: _abcXyzRecommendation(matrix, p.isLow),
      ));
    }

    return out;
  }

  static Future<List<AnomalyFlag>> anomalies(
      {InsightSettings? settings}) async {
    settings ??= await SettingsService.getInsightSettings();

    final d = await LocalDB.db;
    final now = DateTime.now();
    final since30 = now.subtract(const Duration(days: 30)).toIso8601String();
    final since90 = now.subtract(const Duration(days: 90)).toIso8601String();

    final list = <AnomalyFlag>[];

    // 1) معدل إلغاء مرتفع لكل كاشير
    final voidRows = await d.rawQuery(
      'SELECT cashier_id, COUNT(*) total, '
      'SUM(CASE WHEN refunded_at IS NOT NULL THEN 1 ELSE 0 END) voids '
      'FROM sales '
      'WHERE created_at >= ? '
      'GROUP BY cashier_id',
      [since30],
    );

    final cashiers = await LocalDB.getCashiers();
    final names = <int, String>{
      for (final c in cashiers)
        if (c.id != null) c.id!: c.name
    };

    for (final row in voidRows) {
      final id = row['cashier_id'] as int?;
      final total = (row['total'] as num).toInt();
      final voids = (row['voids'] as num).toInt();

      if (total >= 5) {
        final rate = voids / total;
        if (rate > settings.voidAlertRate) {
          list.add(AnomalyFlag(
            title: 'معدل إلغاء مرتفع',
            details:
                '${names[id] ?? 'بدون كاشير'}: ${(rate * 100).toStringAsFixed(1)}% ($voids/$total)',
            severity: 'danger',
          ));
        }
      }
    }

    // 2) ارتفاع الإرجاع اليوم مقارنة بمتوسط 30 يوم
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    final todayRefundRows = await d.rawQuery(
      'SELECT COALESCE(SUM(total), 0) t '
      'FROM sales '
      'WHERE refunded_at >= ? AND refunded_at < ?',
      [today.toIso8601String(), tomorrow.toIso8601String()],
    );

    final todayRefund = (todayRefundRows.first['t'] as num).toDouble();

    final dailyRefundRows = await d.rawQuery(
      'SELECT date(refunded_at) day, COALESCE(SUM(total), 0) t '
      'FROM sales '
      'WHERE refunded_at IS NOT NULL AND refunded_at >= ? '
      'GROUP BY day',
      [since30],
    );

    double sum = 0.0;
    int count = 0;
    final todayKey = _dayKey(today);

    for (final r in dailyRefundRows) {
      if (r['day'] == todayKey) continue;
      sum += (r['t'] as num).toDouble();
      count++;
    }

    final avgRefund = count == 0 ? 0.0 : sum / count;

    if (todayRefund > 0 &&
        (avgRefund == 0.0
            ? todayRefund > 100.0
            : todayRefund > (avgRefund * 2.0) + 50.0)) {
      list.add(AnomalyFlag(
        title: 'ارتفاع الإرجاع اليوم',
        details:
            'اليوم ${todayRefund.toStringAsFixed(2)} مقابل متوسط ${avgRefund.toStringAsFixed(2)}',
        severity: 'warn',
      ));
    }

    // 3) مخزون راكد/ميت
    final stale = await LocalDB.getStaleProducts(days: settings.staleDays);
    if (stale.isNotEmpty) {
      double value = 0.0;
      for (final p in stale) {
        value += p.qty * p.buyPrice;
      }

      list.add(AnomalyFlag(
        title: 'مخزون راكد/ميت',
        details:
            '${stale.length} صنف، قيمة تقريبية ${value.toStringAsFixed(2)}',
        severity: value > 1000.0 ? 'danger' : 'warn',
      ));
    }

    // 4) نقص مخزون
    final low = await LocalDB.getLowStockProducts();
    if (low.isNotEmpty) {
      list.add(AnomalyFlag(
        title: 'نقص مخزون',
        details: '${low.length} صنف تحت الحد الأدنى',
        severity: low.length > 10 ? 'warn' : 'info',
      ));
    }

    // 5) التزامات شراء مسودة
    final draftRows = await d.rawQuery(
      'SELECT COALESCE(SUM(total), 0) t '
      'FROM purchase_orders '
      'WHERE status = \'draft\'',
    );

    final draft = (draftRows.first['t'] as num).toDouble();
    if (draft > 0.0) {
      list.add(AnomalyFlag(
        title: 'التزامات شراء مسودة',
        details: 'إجمالي مسودات أوامر الشراء ${draft.toStringAsFixed(2)}',
        severity: 'info',
      ));
    }

    // 6) سلف معلقة إن وجد جدول الموظفين/السلف
    final hasAdvances =
        (await d.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='advances'"))
            .isNotEmpty;

    if (hasAdvances) {
      final paRows = await d.rawQuery(
        'SELECT COALESCE(SUM(amount), 0) t '
        'FROM advances '
        'WHERE status = \'pending\'',
      );

      final pa = (paRows.first['t'] as num).toDouble();
      if (pa > 0.0) {
        list.add(AnomalyFlag(
          title: 'سلف معلقة',
          details: 'إجمالي السلف غير المسوّاة ${pa.toStringAsFixed(2)}',
          severity: 'info',
        ));
      }
    }

    // 7) تركيز الموردين
    final supRows = await d.rawQuery(
      'SELECT supplier_name, COALESCE(SUM(total), 0) t '
      'FROM purchase_orders '
      'WHERE status = \'received\' AND received_at >= ? '
      'GROUP BY supplier_name '
      'ORDER BY t DESC',
      [since90],
    );

    if (supRows.length >= 2) {
      double total = 0.0;
      for (final r in supRows) {
        total += (r['t'] as num).toDouble();
      }

      if (total > 0.0) {
        final top = (supRows.first['t'] as num).toDouble();
        final share = top / total;

        if (share > 0.60) {
          list.add(AnomalyFlag(
            title: 'تركيز موردين',
            details:
                '${supRows.first['supplier_name']} يمثل ${(share * 100).toStringAsFixed(1)}% من المشتريات المستلمة',
            severity: 'warn',
          ));
        }
      }
    }

    return list;
  }

  static Future<List<ForecastPoint>> demandForecast(
      {int days = 7, InsightSettings? settings}) async {
    settings ??= await SettingsService.getInsightSettings();
    final d = await LocalDB.db;
    final now = DateTime.now();
    final since30 = now.subtract(const Duration(days: 30)).toIso8601String();

    final rows = await d.rawQuery(
      'SELECT date(s.created_at) day, '
      'COALESCE(SUM(si.qty), 0) units, '
      'COALESCE(SUM(si.qty * si.price), 0) revenue '
      'FROM sales s '
      'JOIN sale_items si ON si.sale_id = s.id '
      'WHERE s.refunded_at IS NULL '
      'AND s.created_at >= ? '
      'GROUP BY day '
      'ORDER BY day',
      [since30],
    );

    final unitMap = <String, double>{};
    final revMap = <String, double>{};

    for (final r in rows) {
      final day = r['day'] as String;
      unitMap[day] = (r['units'] as num).toDouble();
      revMap[day] = (r['revenue'] as num).toDouble();
    }

    const historyDays = 30;
    final units = List<double>.filled(historyDays, 0.0);
    final revenues = List<double>.filled(historyDays, 0.0);

    for (int i = 0; i < historyDays; i++) {
      final date = now.subtract(Duration(days: historyDays - 1 - i));
      final key = _dayKey(date);
      units[i] = unitMap[key] ?? 0.0;
      revenues[i] = revMap[key] ?? 0.0;
    }

    double sumU = 0.0;
    double sumR = 0.0;
    for (int i = 0; i < historyDays; i++) {
      sumU += units[i];
      sumR += revenues[i];
    }

    final avgLongU = sumU / historyDays;
    final avgLongR = sumR / historyDays;

    const recentDays = 14;
    double sumRecentU = 0.0;
    double sumRecentR = 0.0;

    for (int i = historyDays - recentDays; i < historyDays; i++) {
      sumRecentU += units[i];
      sumRecentR += revenues[i];
    }

    final avgRecentU = sumRecentU / recentDays;
    final avgRecentR = sumRecentR / recentDays;

    double trendU;
    if (avgLongU <= 0.0001) {
      trendU = avgRecentU <= 0.0001 ? 1.0 : 1.2;
    } else {
      trendU = (avgRecentU / avgLongU).clamp(0.7, 1.3).toDouble();
    }

    double trendR;
    if (avgLongR <= 0.0001) {
      trendR = avgRecentR <= 0.0001 ? 1.0 : 1.2;
    } else {
      trendR = (avgRecentR / avgLongR).clamp(0.7, 1.3).toDouble();
    }

    final baseU = (avgRecentU * 0.6) + (avgLongU * 0.4);
    final baseR = (avgRecentR * 0.6) + (avgLongR * 0.4);

    final out = <ForecastPoint>[];

    for (int i = 1; i <= days; i++) {
      final date = now.add(Duration(days: i));
      final key = _dayKey(date);

      double predU = baseU * trendU;
      double predR = baseR * trendR;

      if (predU < 0.0) predU = 0.0;
      if (predR < 0.0) predR = 0.0;

      out.add(ForecastPoint(
        day: key,
        predictedUnits: predU.ceilToDouble(),
        predictedRevenue: predR,
      ));
    }

    return out;
  }
}
