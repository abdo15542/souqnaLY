import 'dart:math' as math;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/pdf_report.dart';
import '../utils.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  int _days = 1;
  bool _loading = true;
  bool _pdfBusy = false;
  SalesStats _stats = SalesStats.empty();
  ExpensesSummary _expenses = ExpensesSummary.empty();
  double _net = 0;
  List<Map<String, dynamic>> _top = [];
  List<Map<String, dynamic>> _daily = [];
  List<Map<String, dynamic>> _chartDaily = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  DateTime get _since {
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    return day.subtract(Duration(days: _days - 1));
  }

  DateTime get _chartSince {
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    if (_days == 1) return day;
    return day.subtract(const Duration(days: 6));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final since = _since;
    final chartSince = _chartSince;
    final settings = await LocalDB.getAppSettings();
    final stats = await LocalDB.getSalesStats(since);
    final expenses = await LocalDB.getExpensesSummary(since);
    final net = await LocalDB.getNetProfit(since);
    final top = await LocalDB.getTopProducts(since, 5);
    final daily = await LocalDB.getDailySales(since);
    final chartDaily = await LocalDB.getDailySales(chartSince);
    if (!mounted) return;
    setState(() {
      _settings = settings;
      _stats = stats;
      _expenses = expenses;
      _net = net;
      _top = top;
      _daily = daily;
      _chartDaily = chartDaily;
      _loading = false;
    });
  }

  Future<void> _exportPdf() async {
    setState(() => _pdfBusy = true);
    try {
      await PdfReportService.buildAndShare(days: _days);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم توليد تقرير PDF ومشاركته')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل توليد PDF: $e')));
    } finally {
      if (mounted) setState(() => _pdfBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: const Text('التقارير'),
        actions: [IconButton(onPressed: _pdfBusy ? null : _exportPdf, icon: _pdfBusy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.picture_as_pdf), tooltip: 'تصدير PDF')],
      ),
      body: _loading ? const Center(child: CircularProgressIndicator()) : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<int>(segments: const [
            ButtonSegment(value: 1, label: Text('اليوم')),
            ButtonSegment(value: 7, label: Text('7 أيام')),
            ButtonSegment(value: 30, label: Text('30 يوم')),
          ], selected: {_days}, onSelectionChanged: (s) { setState(() => _days = s.first); _load(); }),
          const SizedBox(height: 16),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
            Text('الإيرادات: ${formatMoney(_stats.revenue, cur)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text('التكلفة: ${formatMoney(_stats.cost, cur)}'),
            Text('ربح المبيعات: ${formatMoney(_stats.profit, cur)}'),
            Text('المصروفات: ${formatMoney(_expenses.total, cur)}'),
            const Divider(),
            Text('صافي الربح: ${formatMoney(_net, cur)}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _net >= 0 ? Colors.green : Colors.red)),
            Text('عدد الفواتير: ${_stats.count}'),
          ]))),
          const SizedBox(height: 16),
          const Text('مبيعات آخر 7 أيام', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          _buildChart(),
          const SizedBox(height: 16),
          const Text('الأصناف الأكثر مبيعًا', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_top.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('لا توجد مبيعات'))
          else Card(child: Column(children: _top.map((r) {
            final revenue = (r['revenue'] as num).toDouble();
            final profit = (r['profit'] as num).toDouble();
            return ListTile(dense: true, title: Text(r['name'] as String), subtitle: Text('الكمية: ${formatQty((r['qty'] as num).toDouble())}'), trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatMoney(revenue, cur)),
              Text('ربح: ${formatMoney(profit, cur)}', style: const TextStyle(fontSize: 12, color: Colors.green)),
            ]));
          }).toList())),
          const SizedBox(height: 16),
          const Text('المبيعات اليومية', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_daily.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Text('لا توجد بيانات'))
          else Card(child: Column(children: _daily.map((r) {
            final revenue = (r['revenue'] as num).toDouble();
            final cost = (r['cost'] as num).toDouble();
            return ListTile(dense: true, title: Text(r['day'] as String), subtitle: Text('فواتير: ${r['count'] as int}'), trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatMoney(revenue, cur)),
              Text('ربح: ${formatMoney(revenue - cost, cur)}', style: const TextStyle(fontSize: 12, color: Colors.green)),
            ]));
          }).toList())),
        ],
      ),
    );
  }

  Widget _buildChart() {
    final chartRows = _chartDaily.reversed.toList();
    if (chartRows.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: Text('لا توجد بيانات'))));
    final revenues = chartRows.map((r) => (r['revenue'] as num).toDouble()).toList();
    double maxY = revenues.isEmpty ? 1.0 : revenues.reduce(math.max);
    maxY = maxY <= 0 ? 1.0 : maxY * 1.2;
    final barWidth = chartRows.length > 10 ? 8.0 : 16.0;
    return Card(child: Padding(padding: const EdgeInsets.fromLTRB(8, 24, 16, 8), child: SizedBox(height: 240, child: Directionality(textDirection: TextDirection.ltr, child: BarChart(BarChartData(
      alignment: BarChartAlignment.spaceAround,
      maxY: maxY,
      barGroups: List.generate(chartRows.length, (i) => BarChartGroupData(x: i, barRods: [BarChartRodData(toY: revenues[i], color: Theme.of(context).colorScheme.primary, width: barWidth, borderRadius: BorderRadius.circular(4))])),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 42, getTitlesWidget: (v, m) => v == 0 ? const Text('0', style: TextStyle(fontSize: 10)) : v >= 1000 ? Text('${(v / 1000).toStringAsFixed(1)}k', style: const TextStyle(fontSize: 10)) : Text(v.toStringAsFixed(0), style: const TextStyle(fontSize: 10)))),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, interval: 1, reservedSize: 32, getTitlesWidget: (v, m) {
          final i = v.toInt();
          if (i < 0 || i >= chartRows.length) return const SizedBox.shrink();
          final day = chartRows[i]['day'] as String;
          return Padding(padding: const EdgeInsets.only(top: 8), child: Text(day.length >= 10 ? day.substring(5) : day, style: const TextStyle(fontSize: 10)));
        })),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: maxY / 5, getDrawingHorizontalLine: (v) => FlLine(color: Colors.grey.shade300, strokeWidth: 1)),
      borderData: FlBorderData(show: false),
    ))))));
  }
}
