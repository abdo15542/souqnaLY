import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/analytics_service.dart';
import '../utils.dart';

class AdvancedAnalyticsScreen extends StatefulWidget {
  const AdvancedAnalyticsScreen({super.key});

  @override
  State<AdvancedAnalyticsScreen> createState() => _AdvancedAnalyticsScreenState();
}

class _AdvancedAnalyticsScreenState extends State<AdvancedAnalyticsScreen> {
  bool _loading = true;
  int _days = 30;

  AppSettings _settings = AppSettings.defaults();

  List<Map<String, Object?>> _category = [];
  List<Map<String, Object?>> _cashier = [];
  List<Map<String, Object?>> _supplier = [];
  List<Map<String, Object?>> _debtors = [];
  List<Map<String, Object?>> _batches = [];

  Map<String, Object?> _inventory = {};
  Map<String, Object?> _draft = {};
  int _openShifts = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final now = DateTime.now();
      final since = DateTime(now.year, now.month, now.day)
          .subtract(Duration(days: _days - 1));

      final st = await LocalDB.getAppSettings();
      final cat = await AnalyticsService.salesByCategory(since);
      final cash = await AnalyticsService.salesByCashier(since);
      final sup = await AnalyticsService.purchasesBySupplier(since);
      final inv = await AnalyticsService.inventorySummary(staleDays: 30);
      final dr = await AnalyticsService.topDebtors();
      final ba = await AnalyticsService.expiringBatches(7);
      final op = await AnalyticsService.openShiftsCount();
      final dp = await AnalyticsService.draftPoSummary();

      if (!mounted) return;

      setState(() {
        _settings = st;
        _category = cat;
        _cashier = cash;
        _supplier = sup;
        _inventory = inv;
        _debtors = dr;
        _batches = ba;
        _openShifts = op;
        _draft = dp;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _msg('خطأ في التحليل: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;

    final costValue = (_inventory['cost_value'] as num?)?.toDouble() ?? 0;
    final retailValue = (_inventory['retail_value'] as num?)?.toDouble() ?? 0;
    final productCount = (_inventory['products'] as num?)?.toInt() ?? 0;
    final lowCount = (_inventory['low_count'] as num?)?.toInt() ?? 0;
    final staleCount = (_inventory['stale_count'] as num?)?.toInt() ?? 0;

    final draftCount = (_draft['c'] as num?)?.toInt() ?? 0;
    final draftTotal = (_draft['t'] as num?)?.toDouble() ?? 0;

    double maxCategoryRevenue = 0;
    for (final r in _category) {
      final v = (r['revenue'] as num?)?.toDouble() ?? 0;
      if (v > maxCategoryRevenue) maxCategoryRevenue = v;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('تحليل متقدم'),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'تحديث',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SegmentedButton<int>(
                        segments: const [
                          ButtonSegment(value: 1, label: Text('اليوم')),
                          ButtonSegment(value: 7, label: Text('7 أيام')),
                          ButtonSegment(value: 30, label: Text('30 يوم')),
                          ButtonSegment(value: 90, label: Text('90 يوم')),
                        ],
                        selected: {_days},
                        onSelectionChanged: (s) {
                          setState(() => _days = s.first);
                          _load();
                        },
                      ),
                    ),
                  ),

                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.35,
                    children: [
                      _infoCard('قيمة المخزون تكلفة', formatMoney(costValue, cur), Icons.inventory_2, Colors.teal),
                      _infoCard('قيمة المخزون بيع', formatMoney(retailValue, cur), Icons.sell, Colors.blue),
                      _infoCard('عدد الأصناف', '$productCount', Icons.category, Colors.indigo),
                      _infoCard('منخفض المخزون', '$lowCount', Icons.warning_amber, Colors.orange),
                      _infoCard('راكدة', '$staleCount', Icons.hourglass_empty, Colors.brown),
                      _infoCard('نوبات مفتوحة', '$_openShifts', Icons.point_of_sale, Colors.purple),
                      _infoCard('مسودات شراء', '$draftCount', Icons.shopping_bag, Colors.cyan),
                      _infoCard('قيمة المسودات', formatMoney(draftTotal, cur), Icons.attach_money, Colors.green),
                    ],
                  ),

                  const SizedBox(height: 20),
                  const Text('المبيعات حسب التصنيف',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_category.isEmpty)
                    const Text('لا توجد بيانات')
                  else
                    ..._category.map((r) {
                      final name = (r['category'] as String?) ?? 'غير مصنف';
                      final qty = (r['qty'] as num?)?.toDouble() ?? 0;
                      final revenue = (r['revenue'] as num?)?.toDouble() ?? 0;
                      final profit = (r['profit'] as num?)?.toDouble() ?? 0;
                      final progress = maxCategoryRevenue == 0
                          ? 0.0
                          : (revenue / maxCategoryRevenue).clamp(0.0, 1.0).toDouble();

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(name,
                                        style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                  Text(formatMoney(revenue, cur),
                                      style: const TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Text('كمية: ${formatQty(qty)}'),
                                  const Spacer(),
                                  Text('ربح: ${formatMoney(profit, cur)}',
                                      style: const TextStyle(color: Colors.green)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                height: 6,
                                child: LinearProgressIndicator(value: progress),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 20),
                  const Text('أداء الكاشيرين',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_cashier.isEmpty)
                    const Text('لا توجد بيانات')
                  else
                    ..._cashier.map((r) {
                      final name = (r['cashier'] as String?) ?? 'بدون كاشير';
                      final invoices = (r['invoices'] as num?)?.toInt() ?? 0;
                      final revenue = (r['revenue'] as num?)?.toDouble() ?? 0;
                      final profit = (r['profit'] as num?)?.toDouble() ?? 0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const Icon(Icons.person),
                          title: Text(name),
                          subtitle: Text('فواتير: $invoices'),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(formatMoney(revenue, cur),
                                  style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text('ربح: ${formatMoney(profit, cur)}',
                                  style: const TextStyle(fontSize: 12, color: Colors.green)),
                            ],
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 20),
                  const Text('المشتريات حسب المورد',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_supplier.isEmpty)
                    const Text('لا توجد مشتريات مستلمة')
                  else
                    ..._supplier.map((r) {
                      final name = (r['supplier'] as String?) ?? 'غير محدد';
                      final orders = (r['orders'] as num?)?.toInt() ?? 0;
                      final total = (r['total'] as num?)?.toDouble() ?? 0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const Icon(Icons.local_shipping),
                          title: Text(name),
                          subtitle: Text('أوامر مستلمة: $orders'),
                          trailing: Text(formatMoney(total, cur),
                              style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      );
                    }),

                  const SizedBox(height: 20),
                  const Text('أعلى المدينين',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_debtors.isEmpty)
                    const Text('لا توجد ديون')
                  else
                    ..._debtors.map((r) {
                      final name = (r['customer'] as String?) ?? 'غير محدد';
                      final remaining = (r['remaining'] as num?)?.toDouble() ?? 0;
                      final debts = (r['debts'] as num?)?.toInt() ?? 0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const Icon(Icons.book, color: Colors.brown),
                          title: Text(name),
                          subtitle: Text('عدد الديون: $debts'),
                          trailing: Text(formatMoney(remaining, cur),
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                        ),
                      );
                    }),

                  const SizedBox(height: 20),
                  const Text('دفعات تنتهي قريبًا',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_batches.isEmpty)
                    const Text('لا توجد دفعات قريبة الانتهاء')
                  else
                    ..._batches.map((r) {
                      final name = (r['product_name'] as String?) ?? '';
                      final qty = (r['qty'] as num?)?.toDouble() ?? 0;
                      final exp = (r['expiry_date'] as String?) ?? '';
                      final note = (r['note'] as String?) ?? '';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const Icon(Icons.event_busy, color: Colors.orange),
                          title: Text(name),
                          subtitle: Text('كمية: ${formatQty(qty)} • انتهاء: $exp${note.isEmpty ? '' : '\n$note'}'),
                          isThreeLine: note.isNotEmpty,
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _infoCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(title,
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
