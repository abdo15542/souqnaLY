import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import 'alerts.dart';
import 'audit_log.dart';
import 'cashier_login.dart';
import 'cashiers.dart';
import 'debts.dart';
import 'employees.dart';
import 'expenses.dart';
import 'inventory.dart';
import 'pos.dart';
import 'purchase_orders.dart';
import 'reports.dart';
import 'sales_history.dart';
import 'settings.dart';
import 'smart_insights.dart';
import 'shifts.dart';
import 'batches.dart';
import 'stock_take.dart';
import 'suppliers.dart';
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
  double _payrollToday = 0;
  double _pendingAdvances = 0;
  int _productCount = 0,
      _lowStockCount = 0,
      _supplierCount = 0,
      _staleCount = 0,
      _overdueCount = 0,
      _employeeCount = 0;
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final now = DateTime.now();
    final sod = DateTime(now.year, now.month, now.day);
    final st = await LocalDB.getSalesStats(sod);
    final rf = await LocalDB.getRefundsSummary(sod);
    final db = await LocalDB.getDebtsSummary();
    final ex = await LocalDB.getExpensesSummary(sod);
    final net = await LocalDB.getNetProfitWithPayroll(sod);
    final pt = await LocalDB.getPayrollTotal(sod);
    final pa = await LocalDB.getPendingAdvancesTotal();
    final pc = await LocalDB.getProductCount();
    final ls = await LocalDB.getLowStockCount();
    final sc = await LocalDB.getSupplierCount();
    final ec = await LocalDB.getEmployeeCount();
    final stale = await LocalDB.getStaleCount(days: 30);
    final od = await LocalDB.getOverdueCount();
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _stats = st;
      _refunds = rf;
      _debts = db;
      _expenses = ex;
      _net = net;
      _payrollToday = pt;
      _pendingAdvances = pa;
      _productCount = pc;
      _lowStockCount = ls;
      _supplierCount = sc;
      _employeeCount = ec;
      _staleCount = stale;
      _overdueCount = od;
      _settings = s;
      _loading = false;
    });
  }

  Future<void> _switch() async {
    final c = await promptCashierLogin(context);
    if (c != null && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('مرحباً ${c.name}')));
      _load();
    }
  }

  int get _alertTotal => _lowStockCount + _staleCount + _overdueCount;

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: Text(_settings.shopName),
        actions: [
          IconButton(
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const AlertsScreen()));
                _load();
              },
              icon: Badge(
                  isLabelVisible: _alertTotal > 0,
                  label: Text('$_alertTotal'),
                  child: const Icon(Icons.notifications)),
              tooltip: 'التنبيهات'),
          TextButton.icon(
              onPressed: _switch,
              icon: const Icon(Icons.person, size: 18),
              label: Text(CashierSession.displayName,
                  overflow: TextOverflow.ellipsis)),
          IconButton(
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()));
                _load();
              },
              icon: const Icon(Icons.settings))
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_alertTotal > 0)
                    Card(
                      color: Colors.amber.shade50,
                      child: ListTile(
                        leading: const Icon(Icons.warning_amber,
                            color: Colors.orange),
                        title: const Text('تنبيهات تحتاج انتباهك'),
                        subtitle: Text(
                            'منخفض: $_lowStockCount • راكدة: $_staleCount • متأخر: $_overdueCount'),
                        trailing: const Icon(Icons.chevron_left),
                        onTap: () async {
                          await Navigator.push(context,
                              MaterialPageRoute(
                                  builder: (_) => const AlertsScreen()));
                          _load();
                        },
                      ),
                    ),
                  const SizedBox(height: 12),
                  GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.35,
                      children: [
                        _stat('مبيعات اليوم', formatMoney(_stats.revenue, cur),
                            Icons.attach_money),
                        _stat('ربح المبيعات', formatMoney(_stats.profit, cur),
                            Icons.trending_up),
                        _stat('المصروفات', formatMoney(_expenses.total, cur),
                            Icons.money_off),
                        _stat('الرواتب اليوم', formatMoney(_payrollToday, cur),
                            Icons.payments),
                        _stat('صافي الربح', formatMoney(_net, cur),
                            Icons.account_balance_wallet),
                        _stat('سلف معلقة', formatMoney(_pendingAdvances, cur),
                            Icons.pending_actions),
                        _stat('فواتير اليوم', '${_stats.count}',
                            Icons.receipt_long),
                        _stat('إلغاءات اليوم', '${_refunds.count}', Icons.block),
                        _stat('الأصناف', '$_productCount', Icons.inventory_2),
                        _stat('الموردون', '$_supplierCount',
                            Icons.local_shipping),
                        _stat('الموظفون', '$_employeeCount', Icons.badge),
                        _stat('ديون متبقية',
                            formatMoney(_debts.remaining, cur), Icons.book),
                      ]),
                  const SizedBox(height: 16),
                  const Text('الشراء والمخزون',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: [
                        _act('الموردون', Icons.local_shipping,
                            const SuppliersScreen()),
                        _act('أوامر الشراء', Icons.shopping_bag,
                            const PurchaseOrdersScreen()),
                        _act('المخزون', Icons.inventory_2,
                            const InventoryScreen()),
                        _act('الجرد', Icons.playlist_add_check,
                            const StockTakeScreen()),
                        _act('التنبيهات', Icons.notifications,
                            const AlertsScreen()),
                      ]),
                  const SizedBox(height: 16),
                  const Text('البيع والتحصيل',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: [
                        _act('نقطة البيع', Icons.point_of_sale,
                            const PosScreen()),
                        _act('الفواتير', Icons.receipt_long,
                            const SalesHistoryScreen()),
                        _act('الديون', Icons.book, const DebtsScreen()),
                        _act('المصروفات', Icons.money_off,
                            const ExpensesScreen()),
                      ]),
                  const SizedBox(height: 16),
                  const Text('الإدارة والتحليل',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: [
                        _act('التقارير', Icons.bar_chart, const ReportsScreen()),
                        _act('العقل المحلي', Icons.insights, const SmartInsightsScreen()),
                        _act('نوبات الصندوق', Icons.point_of_sale, const ShiftsScreen()),
                        _act('الدفعات والصلاحية', Icons.inventory, const BatchesScreen()),
                        _act('الموظفون والرواتب', Icons.badge,
                            const EmployeesScreen()),
                        _act('الكاشيرين', Icons.people, const CashiersScreen()),
                        _act('سجل التدقيق', Icons.history,
                            const AuditLogScreen()),
                        _act('الإعدادات', Icons.settings,
                            const SettingsScreen()),
                      ]),
                ],
              ),
      ),
    );
  }

  Widget _stat(String t, String v, IconData i) => Card(
      child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(i, size: 26),
            const SizedBox(height: 6),
            Text(t,
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(v,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center),
          ])));

  Widget _act(String t, IconData i, Widget sc) => Card(
      child: InkWell(
          onTap: () async {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => sc));
            _load();
          },
          child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(i, size: 34),
                    const SizedBox(height: 10),
                    Text(t,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                  ]))));
}
