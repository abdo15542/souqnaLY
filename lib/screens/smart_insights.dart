import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../services/insights_service.dart';
import '../services/settings_service.dart';
import '../utils.dart';

class SmartInsightsScreen extends StatefulWidget {
  const SmartInsightsScreen({super.key});

  @override
  State<SmartInsightsScreen> createState() => _SmartInsightsScreenState();
}

class _SmartInsightsScreenState extends State<SmartInsightsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  bool _loading = true;
  InsightSettings _settings = InsightSettings.defaults();
  AppSettings _appSettings = AppSettings.defaults();

  List<PurchaseSuggestion> _suggestions = [];
  List<AbcXyzItem> _abc = [];
  List<AnomalyFlag> _anomalies = [];
  List<ForecastPoint> _forecast = [];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 5, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final st = await SettingsService.getInsightSettings();
      final app = await LocalDB.getAppSettings();
      final sug = await InsightsService.purchaseSuggestions(settings: st);
      final abc = await InsightsService.abcXyz(settings: st);
      final anom = await InsightsService.anomalies(settings: st);
      final fc = await InsightsService.demandForecast(settings: st);

      if (!mounted) return;

      setState(() {
        _settings = st;
        _appSettings = app;
        _suggestions = sug;
        _abc = abc;
        _anomalies = anom;
        _forecast = fc;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _msg('خطأ في التحليل: $e');
    }
  }

  Future<void> _showSettingsSheet() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _InsightSettingsForm(settings: _settings),
    );

    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('العقل المحلي'),
        actions: [
          IconButton(
            onPressed: _showSettingsSheet,
            icon: const Icon(Icons.tune),
            tooltip: 'إعدادات التحليل',
          ),
        ],
        bottom: TabBar(
          controller: _tab,
          isScrollable: true,
          tabs: const [
            Tab(text: 'لوحة'),
            Tab(text: 'توصيات'),
            Tab(text: 'ABC/XYZ'),
            Tab(text: 'شذوذ'),
            Tab(text: 'توقعات'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tab,
              children: [
                _dashboardTab(),
                _suggestionsTab(),
                _abcTab(),
                _anomaliesTab(),
                _forecastTab(),
              ],
            ),
    );
  }

  Widget _dashboardTab() {
    final cur = _appSettings.currency;
    final forecastRevenue =
        _forecast.fold(0.0, (s, e) => s + e.predictedRevenue);
    final danger = _anomalies.where((a) => a.severity == 'danger').length;
    final criticalAbc =
        _abc.where((a) => a.abc == 'A' || a.xyz == 'Z').length;

    return ListView(
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
            _summaryCard(
              'توصيات شراء',
              '${_suggestions.length}',
              Icons.shopping_cart,
              _suggestions.isEmpty ? Colors.grey : Colors.teal,
            ),
            _summaryCard(
              'أصناف حرجة',
              '$criticalAbc',
              Icons.category,
              Colors.indigo,
            ),
            _summaryCard(
              'تنبيهات حرجة',
              '$danger',
              Icons.warning_amber,
              danger > 0 ? Colors.red : Colors.green,
            ),
            _summaryCard(
              'توقع 7 أيام',
              formatMoney(forecastRevenue, cur),
              Icons.show_chart,
              Colors.blue,
            ),
          ],
        ),
        const SizedBox(height: 18),
        const Text(
          'أهم التوصيات',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_suggestions.isEmpty)
          const Text('لا توجد توصيات حاليًا.')
        else
          ..._suggestions.take(3).map(_suggestionCard),
        const SizedBox(height: 18),
        const Text(
          'أهم التنبيهات',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_anomalies.isEmpty)
          const Text('لا توجد تنبيهات حاليًا.')
        else
          ..._anomalies.take(3).map(_anomalyCard),
      ],
    );
  }

  Widget _suggestionsTab() {
    if (_suggestions.isEmpty) {
      return _empty('لا توجد توصيات شراء حاليًا');
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _suggestions.length,
      itemBuilder: (ctx, i) => _suggestionCard(_suggestions[i]),
    );
  }

  Widget _abcTab() {
    if (_abc.isEmpty) {
      return _empty('لا توجد بيانات مبيعات لتحليل ABC/XYZ');
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _abc.length,
      itemBuilder: (ctx, i) => _abcCard(_abc[i]),
    );
  }

  Widget _anomaliesTab() {
    if (_anomalies.isEmpty) {
      return _empty('لم يُكتشف شذوذ محلي');
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _anomalies.length,
      itemBuilder: (ctx, i) => _anomalyCard(_anomalies[i]),
    );
  }

  Widget _forecastTab() {
    if (_forecast.isEmpty) {
      return _empty('لا توجد بيانات كافية للتوقع');
    }

    final cur = _appSettings.currency;
    final totalUnits =
        _forecast.fold(0.0, (s, e) => s + e.predictedUnits);
    final totalRevenue =
        _forecast.fold(0.0, (s, e) => s + e.predictedRevenue);

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _mini('قطع متوقعة', formatQty(totalUnits)),
                _mini('إيراد متوقع', formatMoney(totalRevenue, cur)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ..._forecast.map(
          (p) => Card(
            child: ListTile(
              leading: const Icon(Icons.calendar_today),
              title: Text(p.day),
              subtitle: Text('قطع: ${formatQty(p.predictedUnits)}'),
              trailing: Text(
                formatMoney(p.predictedRevenue, cur),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _summaryCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _mini(String t, String v) {
    return Column(
      children: [
        Text(t, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(v, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _empty(String t) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(t),
      ),
    );
  }

  Widget _suggestionCard(PurchaseSuggestion s) {
    final color = s.urgency > 0.60
        ? Colors.red
        : (s.urgency > 0.30 ? Colors.orange : Colors.teal);

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
                  child: Text(
                    s.product.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${(s.urgency * 100).toStringAsFixed(0)}%',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('كمية مقترحة: ${formatQty(s.suggestedQty)} ${s.product.unit}'),
            Text(
              'متوسط يومي: ${s.avgDaily.toStringAsFixed(2)} • نقطة إعادة الطلب: ${s.reorderPoint.toStringAsFixed(2)}',
            ),
            const SizedBox(height: 6),
            Text(
              s.reason,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: FilledButton.icon(
                onPressed: () => _createDraftPo(s),
                icon: const Icon(Icons.add_shopping_cart),
                label: const Text('مسودة أمر شراء'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createDraftPo(PurchaseSuggestion s) async {
    final suppliers = await LocalDB.getSuppliers();
    if (!mounted) return;

    if (suppliers.isEmpty) {
      _msg('أضف موردًا أولًا من شاشة الموردين');
      return;
    }

    Supplier? chosen = suppliers.first;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('مسودة لأجل ${s.product.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('الكمية المقترحة: ${formatQty(s.suggestedQty)}'),
              const SizedBox(height: 12),
              DropdownButtonFormField<Supplier>(
                value: chosen,
                decoration: const InputDecoration(labelText: 'المورد'),
                items: suppliers
                    .map(
                      (e) => DropdownMenuItem<Supplier>(
                        value: e,
                        child: Text(e.name),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  setDialogState(() => chosen = v);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('إلغاء'),
            ),
            FilledButton(
              onPressed: () {
                if (chosen != null) Navigator.pop(ctx, true);
              },
              child: const Text('إنشاء'),
            ),
          ],
        ),
      ),
    );

    if (ok == true && chosen != null) {
      await LocalDB.createPurchaseOrder(
        supplierId: chosen!.id,
        supplierName: chosen!.name,
        lines: [
          POLine(
            product: s.product,
            qty: s.suggestedQty,
            cost: s.product.buyPrice,
          ),
        ],
        note: 'توصية ذكية محلية: ${s.reason}',
        cashierId: CashierSession.cashierId,
      );

      _msg('تم إنشاء مسودة أمر شراء');
    }
  }

  Widget _abcCard(AbcXyzItem a) {
    final color = a.abc == 'A'
        ? Colors.red
        : (a.abc == 'B' ? Colors.orange : Colors.grey);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    a.matrix,
                    style: TextStyle(color: color, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    a.product.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Text('${(a.revenueShare * 100).toStringAsFixed(1)}%'),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'إيراد 90 يوم: ${formatMoney(a.revenue, _appSettings.currency)}',
            ),
            const SizedBox(height: 6),
            Text(
              a.recommendation,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _anomalyCard(AnomalyFlag a) {
    final color = a.severity == 'danger'
        ? Colors.red
        : (a.severity == 'warn' ? Colors.orange : Colors.blue);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(_anomalyIcon(a.severity), color: color),
        title: Text(a.title),
        subtitle: Text(a.details),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            _severityLabel(a.severity),
            style: TextStyle(color: color, fontSize: 12),
          ),
        ),
      ),
    );
  }

  IconData _anomalyIcon(String severity) {
    if (severity == 'danger') return Icons.report_problem;
    if (severity == 'warn') return Icons.warning_amber;
    return Icons.info_outline;
  }

  String _severityLabel(String severity) {
    if (severity == 'danger') return 'حرج';
    if (severity == 'warn') return 'تحذير';
    return 'معلومة';
  }
}

class _InsightSettingsForm extends StatefulWidget {
  final InsightSettings settings;

  const _InsightSettingsForm({required this.settings});

  @override
  State<_InsightSettingsForm> createState() => _InsightSettingsFormState();
}

class _InsightSettingsFormState extends State<_InsightSettingsForm> {
  final _k = GlobalKey<FormState>();

  late final _lead =
      TextEditingController(text: widget.settings.leadTimeDays.toString());
  late final _safe =
      TextEditingController(text: widget.settings.safetyFactor.toString());
  late final _stale =
      TextEditingController(text: widget.settings.staleDays.toString());
  late final _void =
      TextEditingController(text: widget.settings.voidAlertRate.toString());
  late final _abcA =
      TextEditingController(text: widget.settings.abcA.toString());
  late final _abcB =
      TextEditingController(text: widget.settings.abcB.toString());

  @override
  void dispose() {
    _lead.dispose();
    _safe.dispose();
    _stale.dispose();
    _void.dispose();
    _abcA.dispose();
    _abcB.dispose();
    super.dispose();
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'مطلوب' : null;

  String? _positiveInt(String? v) {
    final n = int.tryParse(v?.trim() ?? '');
    if (n == null || n <= 0) return 'رقم صحيح موجب';
    return null;
  }

  String? _positiveDouble(String? v) {
    final n = double.tryParse(v?.trim() ?? '');
    if (n == null || n < 0) return 'رقم غير صالح';
    return null;
  }

  String? _rate(String? v) {
    final n = double.tryParse(v?.trim() ?? '');
    if (n == null || n < 0 || n > 1) return 'بين 0 و 1';
    return null;
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;

    final s = InsightSettings(
      leadTimeDays: int.tryParse(_lead.text.trim()) ?? 7,
      safetyFactor: double.tryParse(_safe.text.trim()) ?? 0.5,
      staleDays: int.tryParse(_stale.text.trim()) ?? 60,
      voidAlertRate: double.tryParse(_void.text.trim()) ?? 0.10,
      abcA: double.tryParse(_abcA.text.trim()) ?? 0.80,
      abcB: double.tryParse(_abcB.text.trim()) ?? 0.95,
    );

    await SettingsService.saveInsightSettings(s);

    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'إعدادات العقل المحلي',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'كل الحسابات تتم داخل الجهاز بدون إنترنت وبدون AI.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _lead,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'مدة التوريد بالأيام',
                  helperText: 'مثال: 7 أيام',
                ),
                validator: _positiveInt,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _safe,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'معامل سلامة المخزون',
                  helperText: 'مثال: 0.5 = نصف متوسط الطلب كسلامة',
                ),
                validator: _positiveDouble,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _stale,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'أيام اعتبار الصنف راكدًا',
                  helperText: 'مثال: 60 يومًا',
                ),
                validator: _positiveInt,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _void,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'حد تنبيه الإلغاء',
                  helperText: '0.10 = 10%',
                ),
                validator: _rate,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _abcA,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'حد ABC فئة A',
                  helperText: '0.80 = أول 80% من الإيراد',
                ),
                validator: _rate,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _abcB,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'حد ABC فئة B',
                  helperText: '0.95 = حتى 95%، والباقي C',
                ),
                validator: (v) {
                  final err = _rate(v);
                  if (err != null) return err;

                  final b = double.tryParse(v?.trim() ?? '');
                  final a = double.tryParse(_abcA.text.trim());

                  if (a != null && b != null && b <= a) {
                    return 'يجب أن يكون أكبر من حد A';
                  }

                  return null;
                },
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _save,
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text('حفظ الإعدادات'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
