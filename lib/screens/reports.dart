import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  int _days = 1;
  bool _loading = true;
  bool _compare = false;
  SalesStats _stats = SalesStats.empty();
  SalesStats _prev = SalesStats.empty();
  ExpensesSummary _expenses = ExpensesSummary.empty();
  double _net = 0;
  List<Map<String, dynamic>> _top = [], _daily = [], _chart = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  DateTime get _since {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day).subtract(Duration(days: _days - 1));
  }

  DateTime get _chartSince {
    final n = DateTime.now();
    final d = DateTime(n.year, n.month, n.day);
    if (_days == 1) return d;
    return d.subtract(const Duration(days: 6));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = _since;
    final cs = _chartSince;
    final st = await LocalDB.getAppSettings();
    final sa = await LocalDB.getSalesStats(s);
    final ex = await LocalDB.getExpensesSummary(s);
    final net = await LocalDB.getNetProfit(s);
    final tp = await LocalDB.getTopProducts(s, 5);
    final dl = await LocalDB.getDailySales(s);
    final ch = await LocalDB.getDailySales(cs);
    SalesStats prev = SalesStats.empty();
    if (_compare) {
      final prevSince = s.subtract(Duration(days: _days));
      prev = await LocalDB.getSalesStatsRange(prevSince, s);
    }
    if (!mounted) return;
    setState(() {
      _settings = st;
      _stats = sa;
      _prev = prev;
      _expenses = ex;
      _net = net;
      _top = tp;
      _daily = dl;
      _chart = ch;
      _loading = false;
    });
  }

  String _pct(double cur, double prv) {
    if (prv == 0) return cur == 0 ? '0%' : '+100%';
    final v = (cur - prv) / prv * 100;
    final sign = v >= 0 ? '+' : '';
    return '$sign${v.toStringAsFixed(1)}%';
  }

  Color _pctColor(double cur, double prv) {
    if (prv == 0) return cur == 0 ? Colors.grey : Colors.green;
    return cur >= prv ? Colors.green : Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: const Text('التقارير'),
        actions: [
          IconButton(
              onPressed: () {
                setState(() => _compare = !_compare);
                _load();
              },
              icon: Icon(_compare ? Icons.compare_arrows : Icons.compare),
              tooltip: 'مقارنة مع الفترة السابقة'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 1, label: Text('اليوم')),
                      ButtonSegment(value: 7, label: Text('7 أيام')),
                      ButtonSegment(value: 30, label: Text('30 يوم')),
                    ],
                    selected: {_days},
                    onSelectionChanged: (s) {
                      setState(() => _days = s.first);
                      _load();
                    }),
                const SizedBox(height: 16),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(children: [
                          Text('الإيرادات: ${formatMoney(_stats.revenue, cur)}',
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          Text('التكلفة: ${formatMoney(_stats.cost, cur)}'),
                          Text('ربح المبيعات: ${formatMoney(_stats.profit, cur)}'),
                          Text('المصروفات: ${formatMoney(_expenses.total, cur)}'),
                          const Divider(),
                          Text('صافي الربح: ${formatMoney(_net, cur)}',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: _net >= 0 ? Colors.green : Colors.red)),
                          Text('عدد الفواتير: ${_stats.count}'),
                        ]))),
                if (_compare) ...[
                  const SizedBox(height: 16),
                  const Text('مقارنة مع الفترة السابقة',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _cmp('الإيرادات', _stats.revenue, _prev.revenue, cur),
                        _cmp('الربح', _stats.profit, _prev.profit, cur),
                        _cmpNum('الفواتير',
                            _stats.count.toDouble(), _prev.count.toDouble()),
                      ]),
                ],
                const SizedBox(height: 16),
                const Text('مبيعات آخر 7 أيام',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _buildChart(),
                const SizedBox(height: 16),
                const Text('الأصناف الأكثر مبيعاً',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_top.isEmpty)
                  const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('لا توجد مبيعات'))
                else
                  Card(
                      child: Column(
                          children: _top.map((r) {
                    final rev = (r['revenue'] as num).toDouble();
                    final pr = (r['profit'] as num).toDouble();
                    return ListTile(
                        dense: true,
                        title: Text(r['name'] as String),
                        subtitle: Text(
                            'الكمية: ${formatQty((r['qty'] as num).toDouble())}'),
                        trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(formatMoney(rev, cur)),
                              Text('ربح: ${formatMoney(pr, cur)}',
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.green)),
                            ]));
                  }).toList())),
                const SizedBox(height: 16),
                const Text('المبيعات اليومية',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_daily.isEmpty)
                  const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('لا توجد بيانات'))
                else
                  Card(
                      child: Column(
                          children: _daily.map((r) {
                    final rev = (r['revenue'] as num).toDouble();
                    final cost = (r['cost'] as num).toDouble();
                    return ListTile(
                        dense: true,
                        title: Text(r['day'] as String),
                        subtitle: Text('فواتير: ${r['count'] as int}'),
                        trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(formatMoney(rev, cur)),
                              Text('ربح: ${formatMoney(rev - cost, cur)}',
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.green)),
                            ]));
                  }).toList())),
              ],
            ),
    );
  }

  Widget _cmp(String t, double curV, double prvV, String currency) {
    return Expanded(
        child: Card(
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(children: [
                  Text(t, style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Text(formatMoney(curV, currency),
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_pct(curV, prvV),
                      style: TextStyle(
                          color: _pctColor(curV, prvV),
                          fontWeight: FontWeight.bold)),
                  Text('سابق: ${formatMoney(prvV, currency)}',
                      style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ]))));
  }

  Widget _cmpNum(String t, double curV, double prvV) {
    return Expanded(
        child: Card(
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(children: [
                  Text(t, style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Text(curV.toStringAsFixed(0),
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_pct(curV, prvV),
                      style: TextStyle(
                          color: _pctColor(curV, prvV),
                          fontWeight: FontWeight.bold)),
                  Text('سابق: ${prvV.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ]))));
  }

  Widget _buildChart() {
    final rows = _chart.reversed.toList();
    if (rows.isEmpty) {
      return const Card(
          child: Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('لا توجد بيانات'))));
    }
    final revs = rows.map((r) => (r['revenue'] as num).toDouble()).toList();
    double maxY = revs.isEmpty ? 1.0 : revs.reduce(math.max);
    maxY = maxY <= 0 ? 1.0 : maxY * 1.2;
    final bw = rows.length > 10 ? 8.0 : 16.0;
    return Card(
        child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 24, 16, 8),
            child: SizedBox(
                height: 240,
                child: Directionality(
                    textDirection: TextDirection.ltr,
                    child: BarChart(BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: maxY,
                      barGroups: List.generate(
                          rows.length,
                          (i) => BarChartGroupData(x: i, barRods: [
                                BarChartRodData(
                                    toY: revs[i],
                                    color: Theme.of(context).colorScheme.primary,
                                    width: bw,
                                    borderRadius: BorderRadius.circular(4))
                              ])),
                      titlesData: FlTitlesData(
                        leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 42,
                                getTitlesWidget: (v, m) => v == 0
                                    ? const Text('0',
                                        style: TextStyle(fontSize: 10))
                                    : v >= 1000
                                        ? Text('${(v / 1000).toStringAsFixed(1)}k',
                                            style: const TextStyle(fontSize: 10))
                                        : Text(v.toStringAsFixed(0),
                                            style: const TextStyle(fontSize: 10)))),
                        bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                                showTitles: true,
                                interval: 1,
                                reservedSize: 32,
                                getTitlesWidget: (v, m) {
                                  final i = v.toInt();
                                  if (i < 0 || i >= rows.length) {
                                    return const SizedBox.shrink();
                                  }
                                  final day = rows[i]['day'] as String;
                                  return Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                          day.length >= 10
                                              ? day.substring(5)
                                              : day,
                                          style: const TextStyle(fontSize: 10)));
                                })),
                        rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                      ),
                      gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: maxY / 5,
                          getDrawingHorizontalLine: (v) => FlLine(
                              color: Colors.grey.shade300, strokeWidth: 1)),
                      borderData: FlBorderData(show: false),
                    ))))));
  }
}
