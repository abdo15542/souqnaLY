import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  bool _loading = true;
  AppSettings _settings = AppSettings.defaults();
  List<Product> _low = [];
  List<Product> _stale = [];
  List<Debt> _overdue = [];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await LocalDB.getAppSettings();
    final low = await LocalDB.getLowStockProducts();
    final stale = await LocalDB.getStaleProducts(days: 30);
    final od = await LocalDB.getOverdueDebts();
    if (!mounted) return;
    setState(() {
      _settings = s;
      _low = low;
      _stale = stale;
      _overdue = od;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: const Text('التنبيهات الذكية'),
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'منخفض (${_low.length})'),
            Tab(text: 'راكدة (${_stale.length})'),
            Tab(text: 'متأخر (${_overdue.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: TabBarView(
                controller: _tab,
                children: [
                  _productList(_low, 'لا توجد أصناف منخفضة',
                      (p) => 'متوفر: ${formatQty(p.qty)} ${p.unit} • حد: ${formatQty(p.minQty)}'),
                  _productList(_stale, 'لا توجد أصناف راكدة',
                      (p) => p.lastSoldAtLabel()),
                  _debtList(),
                ],
              ),
            ),
    );
  }

  Widget _productList(
      List<Product> items, String empty, String Function(Product) sub) {
    if (items.isEmpty) return _empty(empty);
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final p = items[i];
        return ListTile(
          leading: const Icon(Icons.warning_amber, color: Colors.orange),
          title: Text(p.name),
          subtitle: Text(sub(p)),
          trailing: Text(formatMoney(p.sellPrice, _settings.currency)),
        );
      },
    );
  }

  Widget _debtList() {
    if (_overdue.isEmpty) return _empty('لا توجد ديون متأخرة');
    return ListView.builder(
      itemCount: _overdue.length,
      itemBuilder: (ctx, i) {
        final d = _overdue[i];
        return ListTile(
          leading: const Icon(Icons.schedule, color: Colors.red),
          title: Text(d.customer),
          subtitle: Text('متبقي: ${formatMoney(d.remaining, _settings.currency)} • استحق: ${d.dueDate}'),
          trailing: Text(formatMoney(d.amount, _settings.currency)),
        );
      },
    );
  }

  Widget _empty(String t) =>
      Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t)));
}

