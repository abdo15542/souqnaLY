import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({super.key});
  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  bool _loading = true;
  String _search = '';
  List<Debt> _debts = [];
  DebtsSummary _summary = DebtsSummary.empty();
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final debts = await LocalDB.getDebts(search: _search);
    final summary = await LocalDB.getDebtsSummary();
    final settings = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _debts = debts;
      _summary = summary;
      _settings = settings;
      _loading = false;
    });
  }

  Future<void> _addDebt() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _DebtFormSheet(),
    );
    if (saved == true) _load();
  }

  Future<void> _pay(Debt debt) async {
    if (debt.id == null) return;
    double? approvedAmount;
    final controller = TextEditingController(text: debt.remaining.toStringAsFixed(2));
    final formKey = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('تسديد — ${debt.customer}'),
        content: Form(key: formKey, child: TextFormField(controller: controller, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ المسدد'), validator: (v) {
          final n = double.tryParse(v?.trim() ?? '');
          if (n == null || n <= 0) return 'أدخل مبلغًا صالحًا';
          if (n > debt.remaining + 0.001) return 'أكبر من المتبقي';
          approvedAmount = n;
          return null;
        })),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () { if (formKey.currentState!.validate()) Navigator.pop(ctx, true); }, child: const Text('تسديد')),
        ],
      ),
    );
    controller.dispose();
    if (ok == true && approvedAmount != null) {
      await LocalDB.payDebt(debt.id!, approvedAmount!);
      _load();
    }
  }

  Future<void> _showHistory(Debt debt) async {
    if (debt.id == null) return;
    final payments = await LocalDB.getPayments(debt.id!);
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(child: payments.isEmpty 
        ? const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('لا توجد مدفوعات')))
        : ListView(children: [
            const Padding(padding: EdgeInsets.all(16), child: Text('سجل السداد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
            ...payments.map((p) => ListTile(dense: true, title: Text(formatMoney(p.amount, _settings.currency)), subtitle: Text(formatDateTime(p.createdAt)))),
          ])),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('دفتر الديون')),
      floatingActionButton: FloatingActionButton(onPressed: _addDebt, child: const Icon(Icons.add)),
      body: Column(
        children: [
          Card(margin: const EdgeInsets.all(12), child: Padding(padding: const EdgeInsets.all(16), child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _miniStat('إجمالي الديون', formatMoney(_summary.total, _settings.currency)),
            _miniStat('المتبقي', formatMoney(_summary.remaining, _settings.currency)),
            _miniStat('عدد العملاء', '${_summary.count}'),
          ]))),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: TextField(onChanged: (v) { _search = v; _load(); }, decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: 'ابحث بالاسم أو الهاتف...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _debts.isEmpty 
            ? const Center(child: Text('لا توجد ديون'))
            : ListView.builder(itemCount: _debts.length, itemBuilder: (ctx, i) {
                final d = _debts[i];
                final isPaid = d.remaining <= 0.001;
                return ListTile(
                  title: Text(d.customer),
                  subtitle: Text('الدين: ${formatMoney(d.amount, _settings.currency)}\nالمدفوع: ${formatMoney(d.paid, _settings.currency)}\nالمتبقي: ${formatMoney(d.remaining, _settings.currency)}'),
                  isThreeLine: true,
                  trailing: isPaid 
                    ? IconButton(onPressed: () => _showHistory(d), icon: const Icon(Icons.history))
                    : Row(mainAxisSize: MainAxisSize.min, children: [
                        IconButton(onPressed: () => _showHistory(d), icon: const Icon(Icons.history)),
                        FilledButton(onPressed: () => _pay(d), child: const Text('تسديد')),
                      ]),
                );
              })),
        ],
      ),
    );
  }

  Widget _miniStat(String title, String value) => Column(children: [
    Text(title, style: Theme.of(context).textTheme.bodySmall),
    const SizedBox(height: 4),
    Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
  ]);
}

class _DebtFormSheet extends StatefulWidget {
  const _DebtFormSheet();
  @override
  State<_DebtFormSheet> createState() => _DebtFormSheetState();
}

class _DebtFormSheetState extends State<_DebtFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _customer = TextEditingController();
  final _phone = TextEditingController();
  final _amount = TextEditingController();
  final _note = TextEditingController();

  @override
  void dispose() {
    _customer.dispose(); _phone.dispose(); _amount.dispose(); _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final debt = Debt(customer: _customer.text.trim(), phone: _phone.text.trim(), amount: double.tryParse(_amount.text.trim()) ?? 0, note: _note.text.trim(), createdAt: DateTime.now().toIso8601String());
    await LocalDB.addDebt(debt);
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
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('دين جديد', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(controller: _customer, decoration: const InputDecoration(labelText: 'اسم الزبون'), validator: (v) => (v == null || v.trim().isEmpty) ? 'الاسم مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'الهاتف (اختياري)')),
              const SizedBox(height: 12),
              TextFormField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ'), validator: (v) { final n = double.tryParse(v?.trim() ?? ''); if (n == null || n <= 0) return 'أدخل مبلغًا صالحًا'; return null; }),
              const SizedBox(height: 12),
              TextFormField(controller: _note, maxLines: 3, decoration: const InputDecoration(labelText: 'ملاحظة (اختياري)')),
              const SizedBox(height: 16),
              FilledButton(onPressed: _save, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}
