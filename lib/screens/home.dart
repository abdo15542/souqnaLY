import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../screens/audit_log.dart';
import '../screens/cashier_login.dart';
import '../screens/cashiers.dart';
import '../screens/debts.dart';
import '../screens/expenses.dart';
import '../screens/inventory.dart';
import '../screens/pos.dart';
import '../screens/reports.dart';
import '../screens/sales_history.dart';
import '../screens/settings.dart';
import '../screens/stock_take.dart';
import '../utils.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  SalesStats _stats = SalesStats.empty();
  RefundsSummary _refunds = RefundsSummary.empty();
  DebtsSummary _debts = DebtsSummary.empty();
  ExpensesSummary _expenses = ExpensesSummary.empty();
  double _net = 0;
  int _productCount = 0;
  int _lowStockCount = 0;
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    
    final stats = await LocalDB.getSalesStats(startOfDay);
    final refunds = await LocalDB.getRefundsSummary(startOfDay);
    final debts = await LocalDB.getDebtsSummary();
    final expenses = await LocalDB.getExpensesSummary(startOfDay);
    final net = await LocalDB.getNetProfit(startOfDay);
    final productCount = await LocalDB.getProductCount();
    final lowStockCount = await LocalDB.getLowStockCount();
    final settings = await LocalDB.getAppSettings();

    if (!mounted) return;
    setState(() {
      _stats = stats;
      _refunds = refunds;
      _debts = debts;
      _expenses = expenses;
      _net = net;
      _productCount = productCount;
      _lowStockCount = lowStockCount;
      _settings = settings;
      _loading = false;
    });
  }

  Future<void> _switchCashier() async {
    final c = await promptCashierLogin(context);
    if (c != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('مرحبا ${c.name}')));
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: Text(_settings.shopName),
        actions: [
          TextButton.icon(
            onPressed: _switchCashier,
            icon: const Icon(Icons.person, size: 18),
            label: Text(CashierSession.displayName, overflow: TextOverflow.ellipsis),
          ),
          IconButton(
            onPressed: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
              _load();
            },
            icon: const Icon(Icons.settings),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading ? const Center(child: CircularProgressIndicator()) : ListView(
          padding: const EdgeInsets.all(16),
          children: [
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: [
                _statCard('مبيعات اليوم', formatMoney(_stats.revenue, cur), Icons.attach_money),
                _statCard('ربح المبيعات', formatMoney(_stats.profit, cur), Icons.trending_up),
                _statCard('المصروفات', formatMoney(_expenses.total, cur), Icons.money_off),
                _statCard('صافي الربح', formatMoney(_net, cur), Icons.account_balance_wallet),
                _statCard('فواتير اليوم', '${_stats.count}', Icons.receipt_long),
                _statCard('إلغاءات اليوم', '${_refunds.count}', Icons.block),
                _statCard('الأصناف', '$_productCount', Icons.inventory_2),
                _statCard('ديون متبقية', formatMoney(_debts.remaining, cur), Icons.book),
              ],
            ),
            const SizedBox(height: 16),
            if (_lowStockCount > 0) Card(
              color: Colors.orange.shade50,
              child: ListTile(
                leading: const Icon(Icons.warning_amber, color: Colors.orange),
                title: Text('تنبيه: $_lowStockCount صنف وصل للحد الأدنى'),
                onTap: () async {
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => const InventoryScreen()));
                  _load();
                },
              ),
            ),
            const SizedBox(height: 16),
            const Text('الإجراءات السريعة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.25,
              children: [
                _actionCard('نقطة البيع', Icons.point_of_sale, const PosScreen()),
                _actionCard('المخزون', Icons.inventory_2, const InventoryScreen()),
                _actionCard('الفواتير', Icons.receipt_long, const SalesHistoryScreen()),
                _actionCard('الديون', Icons.book, const DebtsScreen()),
                _actionCard('التقارير', Icons.bar_chart, const ReportsScreen()),
                _actionCard('المصروفات', Icons.money_off, const ExpensesScreen()),
                _actionCard('الجرد', Icons.playlist_add_check, const StockTakeScreen()),
                _actionCard('الكاشيرين', Icons.people, const CashiersScreen()),
                _actionCard('سجل التدقيق', Icons.history, const AuditLogScreen()),
                _actionCard('الإعدادات', Icons.settings, const SettingsScreen()),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String title, String value, IconData icon) => Card(
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 26),
        const SizedBox(height: 6),
        Text(title, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
      ]),
    ),
  );

  Widget _actionCard(String title, IconData icon, Widget screen) => Card(
    child: InkWell(
      onTap: () async {
        await Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
        _load();
      },
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 34),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ]),
      ),
    ),
  );
}
