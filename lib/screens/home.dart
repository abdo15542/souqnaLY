import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../cashier_session.dart';
import '../db.dart';
import '../device_permissions.dart';
import '../models.dart';
import '../services/device_service.dart';
import '../services/vendor_license_service.dart';
import 'alerts.dart';
import 'audit_log.dart';
import 'batches.dart';
import 'cashier_login.dart';
import 'cashiers.dart';
import 'debts.dart';
import 'device_status.dart';
import 'employees.dart';
import 'expenses.dart';
import 'inventory.dart';
import 'manage_devices.dart';
import 'pos.dart';
import 'purchase_orders.dart';
import 'reports.dart';
import 'sales_history.dart';
import 'settings.dart';
import 'shifts.dart';
import 'smart_insights.dart';
import 'stock_take.dart';
import 'suppliers.dart';
import 'vendor_license.dart';
import 'renewal_request.dart';
import '../utils.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  bool _renewalPrompted = false;

  SalesStats _stats = SalesStats.empty();
  RefundsSummary _refunds = RefundsSummary.empty();
  DebtsSummary _debts = DebtsSummary.empty();
  ExpensesSummary _expenses = ExpensesSummary.empty();

  double _net = 0;
  double _payrollToday = 0;
  double _pendingAdvances = 0;

  int _productCount = 0;
  int _lowStockCount = 0;
  int _supplierCount = 0;
  int _employeeCount = 0;
  int _staleCount = 0;
  int _overdueCount = 0;

  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      await VendorLicenseService.reload();
    } catch (_) {}

    final now = DateTime.now();
    final sod = DateTime(now.year, now.month, now.day);

    final st = await LocalDB.getSalesStats(sod);
    final rf = await LocalDB.getRefundsSummary(sod);
    final db = await LocalDB.getDebtsSummary();
    final ex = await LocalDB.getExpensesSummary(sod);

    double net;
    try {
      net = await LocalDB.getNetProfitWithPayroll(sod);
    } catch (_) {
      net = await LocalDB.getNetProfit(sod);
    }

    double payrollToday = 0;
    double pendingAdvances = 0;
    int employeeCount = 0;

    try {
      employeeCount = await LocalDB.getEmployeeCount();
      payrollToday = await LocalDB.getPayrollTotal(sod);
      pendingAdvances = await LocalDB.getPendingAdvancesTotal();
    } catch (_) {
      employeeCount = 0;
      payrollToday = 0;
      pendingAdvances = 0;
    }

    final pc = await LocalDB.getProductCount();
    final ls = await LocalDB.getLowStockCount();
    final sc = await LocalDB.getSupplierCount();
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
      _payrollToday = payrollToday;
      _pendingAdvances = pendingAdvances;
      _productCount = pc;
      _lowStockCount = ls;
      _supplierCount = sc;
      _employeeCount = employeeCount;
      _staleCount = stale;
      _overdueCount = od;
      _settings = s;
      _loading = false;
    });
    _maybePromptRenewal();
  }

  Future<void> _switch() async {
    final c = await promptCashierLogin(context);
    if (c != null && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('مرحبًا ${c.name}')));
      _load();
    }
  }

  Widget? _licenseBanner() {
    final days = VendorLicenseService.daysRemaining();

    if (VendorLicenseService.isBlocked()) {
      return Card(
        color: Colors.red.shade50,
        child: ListTile(
          leading: const Icon(Icons.lock_outline, color: Colors.red),
          title: const Text('اشتراك المحل غير فعّال'),
          subtitle: const Text('تم إيقاف أو انتهاء ترخيص الناشر. العمليات مقفلة.'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const VendorLicenseScreen()),
          ),
        ),
      );
    }

    if (days != null && days <= 7) {
      return Card(
        color: Colors.orange.shade50,
        child: ListTile(
          leading: const Icon(Icons.warning_amber, color: Colors.orange),
          title: Text('ينتهي اشتراك المحل خلال $days يوم'),
          subtitle: const Text('راجع المالك/الناشر للتمديد.'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const VendorLicenseScreen()),
          ),
        ),
      );
    }

    if (!VendorLicenseService.hasLicense()) {
      return Card(
        color: Colors.blue.shade50,
        child: ListTile(
          leading: const Icon(Icons.info_outline, color: Colors.blue),
          title: const Text('لم يُستورد ترخيص ناشر بعد'),
          subtitle: const Text('التطبيق يعمل حاليًا في وضع تجريبي مفتوح.'),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const VendorLicenseScreen()),
          ),
        ),
      );
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final dev = DeviceService.current;

    if (dev == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final owner = dev.isOwner;
    final deviceExpired = DeviceService.isExpired(dev);
    final licenseBlocked = VendorLicenseService.isBlocked();
    final blocked = deviceExpired || licenseBlocked;

    bool licensed(String feature) => VendorLicenseService.canUse(feature);
    bool can(String permission) =>
        licensed(permission) && DeviceService.hasPermission(permission);
    bool canDo(String permission) => !blocked && can(permission);

    final showFinance = owner || can(Perm.reports);
    final cur = _settings.currency;
    final alertTotal = _lowStockCount + _staleCount + _overdueCount;
    final banner = _licenseBanner();

    final stats = <Widget>[];

    if (showFinance) {
      stats.add(_stat('مبيعات اليوم', formatMoney(_stats.revenue, cur), Icons.attach_money));

      if (owner || can(Perm.profits)) {
        stats.add(_stat('ربح المبيعات', formatMoney(_stats.profit, cur), Icons.trending_up));
      }

      if (owner || can(Perm.expenses)) {
        stats.add(_stat('المصروفات', formatMoney(_expenses.total, cur), Icons.money_off));
      }

      if (owner || can(Perm.payroll)) {
        stats.add(_stat('الرواتب اليوم', formatMoney(_payrollToday, cur), Icons.payments));
      }

      if (owner || can(Perm.profits)) {
        stats.add(_stat('صافي الربح', formatMoney(_net, cur), Icons.account_balance_wallet));
      }

      if (owner || can(Perm.payroll)) {
        stats.add(_stat('سلف معلقة', formatMoney(_pendingAdvances, cur), Icons.pending_actions));
      }

      stats.add(_stat('فواتير اليوم', '${_stats.count}', Icons.receipt_long));
      stats.add(_stat('إلغاءات اليوم', '${_refunds.count}', Icons.block));
    }

    if (can(Perm.inventoryView)) {
      stats.add(_stat('الأصناف', '$_productCount', Icons.inventory_2));
    }

    if (can(Perm.suppliers) || can(Perm.purchase)) {
      stats.add(_stat('الموردون', '$_supplierCount', Icons.local_shipping));
    }

    if (can(Perm.debts)) {
      stats.add(_stat('ديون متبقية', formatMoney(_debts.remaining, cur), Icons.book));
    }

    final purchaseActions = <Widget>[
      if (can(Perm.suppliers) || can(Perm.purchase))
        _act('الموردون', Icons.local_shipping, const SuppliersScreen()),
      if (canDo(Perm.purchase))
        _act('أوامر الشراء', Icons.shopping_bag, const PurchaseOrdersScreen()),
      if (can(Perm.inventoryView))
        _act('المخزون', Icons.inventory_2, const InventoryScreen()),
      if (canDo(Perm.inventoryEdit))
        _act('الجرد', Icons.playlist_add_check, const StockTakeScreen()),
      if (can(Perm.batches))
        _act('الدفعات والصلاحية', Icons.local_fire_department, const BatchesScreen()),
      if (can(Perm.insights))
        _act('العقل المحلي', Icons.insights, const SmartInsightsScreen()),
      if (can(Perm.alerts))
        _act('التنبيهات', Icons.notifications, const AlertsScreen()),
    ];

    final salesActions = <Widget>[
      if (canDo(Perm.sale))
        _act('نقطة البيع', Icons.point_of_sale, const PosScreen()),
      if (can(Perm.salesHistory))
        _act('الفواتير', Icons.receipt_long, const SalesHistoryScreen()),
      if (can(Perm.debts))
        _act('الديون', Icons.book, const DebtsScreen()),
      if (can(Perm.expenses))
        _act('المصروفات', Icons.money_off, const ExpensesScreen()),
      if (canDo(Perm.shifts))
        _act('النوبات والصندوق', Icons.account_balance_wallet, const ShiftsScreen()),
    ];

    final adminActions = <Widget>[
      if (showFinance)
        _act('التقارير', Icons.bar_chart, const ReportsScreen()),
      if (can(Perm.payroll))
        _act('الموظفون والرواتب', Icons.badge, const EmployeesScreen()),
      if (can(Perm.cashiers))
        _act('الكاشيرين', Icons.people, const CashiersScreen()),
      if (can(Perm.audit))
        _act('سجل التدقيق', Icons.history, const AuditLogScreen()),
      if (owner && licensed(Perm.devices))
        _act('إدارة الهواتف', Icons.phone_android, const ManageDevicesScreen()),
      if (owner || DeviceService.hasPermission(Perm.settings))
        _act('الإعدادات', Icons.settings, const SettingsScreen()),
    ];

    final hasAnyAction =
        purchaseActions.isNotEmpty || salesActions.isNotEmpty || adminActions.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text('${_settings.shopName} • ${dev.deviceName}'),
        actions: [
          IconButton(
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const VendorLicenseScreen()),
              );
              _load();
            },
            icon: const Icon(Icons.verified_user_outlined),
            tooltip: 'ترخيص الناشر',
          ),
          if (can(Perm.alerts))
            IconButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AlertsScreen()),
                );
                _load();
              },
              icon: Badge(
                isLabelVisible: alertTotal > 0,
                label: Text('$alertTotal'),
                child: const Icon(Icons.notifications),
              ),
              tooltip: 'التنبيهات',
            ),
          if (owner && licensed(Perm.devices))
            IconButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ManageDevicesScreen()),
                );
                _load();
              },
              icon: const Icon(Icons.phone_android),
              tooltip: 'إدارة الهواتف',
            )
          else
            IconButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DeviceStatusScreen()),
                );
                _load();
              },
              icon: const Icon(Icons.perm_device_information),
              tooltip: 'حالة جهازي',
            ),
          if (canDo(Perm.sale) || canDo(Perm.shifts))
            TextButton.icon(
              onPressed: _switch,
              icon: const Icon(Icons.person, size: 18),
              label: Text(
                CashierSession.displayName,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          if (owner || DeviceService.hasPermission(Perm.settings))
            IconButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
                _load();
              },
              icon: const Icon(Icons.settings),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (banner != null) ...[
                    banner,
                    const SizedBox(height: 12),
                  ],
                  if (blocked)
                    Card(
                      color: Colors.red.shade50,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.block, color: Colors.red),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'العمليات موقوفة',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            const Text('لا يمكن تنفيذ بيع أو تعديل أو فتح وردية. راجع ترخيص الناشر أو ترخيص هذا الجهاز.'),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const VendorLicenseScreen(),
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.verified_user),
                                  label: const Text('ترخيص الناشر'),
                                ),
                                if (!owner)
                                  OutlinedButton.icon(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const DeviceStatusScreen(),
                                        ),
                                      );
                                    },
                                    icon: const Icon(Icons.info_outline),
                                    label: const Text('حالة جهازي'),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (stats.isNotEmpty) ...[
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.35,
                      children: stats,
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (purchaseActions.isNotEmpty) ...[
                    const Text(
                      'الشراء والمخزون',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: purchaseActions,
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (salesActions.isNotEmpty) ...[
                    const Text(
                      'البيع والتحصيل',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: salesActions,
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (adminActions.isNotEmpty) ...[
                    const Text(
                      'الإدارة والتحليل',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.25,
                      children: adminActions,
                    ),
                  ],
                  if (!hasAnyAction && !blocked)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('لا توجد شاشات مسموحة لهذا الجهاز.')),
                    ),
                ],
              ),
      ),
    );
  }

  void _maybePromptRenewal() {
    if (_renewalPrompted) return;
    if (!VendorLicenseService.shouldWarnRenewal()) return;
    _renewalPrompted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _showRenewalDialog();
    });
  }

  Future<void> _showRenewalDialog() async {
    final days = VendorLicenseService.daysRemaining();
    final phone = VendorLicenseService.current?.supportPhone ?? '';
    if (!mounted) return;

    final msg = (days != null && days < 0)
        ? 'انتهى اشتراكك منذ ${-days} يوم (داخل فترة السماح). جدّده الآن لتجنّب القفل الكامل.'
        : 'يتبقى ${days ?? 0} يوم على انتهاء اشتراكك. جدّده الآن لتجنّب انقطاع العمل.';

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('تنبيه تجديد الاشتراك'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(msg),
              const SizedBox(height: 12),
              if (phone.isNotEmpty) ...<Widget>[
                const Text('للتجديد تواصل مع الدعم عبر واتساب على الرقم:',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                SelectableText(phone,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: phone));
                          ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('تم نسخ رقم الدعم')));
                        },
                        icon: const Icon(Icons.copy),
                        label: const Text('نسخ الرقم'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          Navigator.push(
                            ctx,
                            MaterialPageRoute(
                                builder: (_) =>
                                    const RenewalRequestScreen()),
                          );
                        },
                        icon: const Icon(Icons.share),
                        label: const Text('طلب تجديد'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              const Text('أو استورد ترخيصاً مُجدَّداً من شاشة الترخيص.'),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(
                  ctx,
                  MaterialPageRoute(
                      builder: (_) => const VendorLicenseScreen()),
                );
              },
              child: const Text('استيراد ترخيص'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String t, String v, IconData i) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(i, size: 26),
            const SizedBox(height: 6),
            Text(
              t,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              v,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _act(String t, IconData i, Widget sc) {
    return Card(
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
              Text(
                t,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
