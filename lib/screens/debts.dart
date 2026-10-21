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
    final d = await LocalDB.getDebts(search: _search);
    final s = await LocalDB.getDebtsSummary();
    final st = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _debts = d;
      _summary = s;
      _settings = st;
      _loading = false;
    });
  }

  Future<void> _add() async {
    final saved = await showModalBottomSheet<bool>(
        context: context, isScrollControlled: true, builder: (_) => const _DebtForm());
    if (saved == true) _load();
  }

  Future<void> _pay(Debt debt) async {
    if (debt.id == null) return;
    double? amt;
    final c = TextEditingController(text: debt.remaining.toStringAsFixed(2));
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: Text('تسديد — ${debt.customer}'),
              content: Form(
                  key: fk,
                  child: TextFormField(
                      controller: c,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'المبلغ'),
                      validator: (v) {
                        final n = double.tryParse(v?.trim() ?? '');
                        if (n == null || n <= 0) return 'غير صالح';
                        if (n > debt.remaining + 0.001) return 'أكبر من المتبقي';
                        amt = n;
                        return null;
                      })),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) Navigator.pop(ctx, true);
                    },
                    child: const Text('تسديد')),
              ],
            ));
    c.dispose();
    if (ok == true && amt != null) {
      await LocalDB.payDebt(debt.id!, amt!);
      _load();
    }
  }

  Future<void> _history(Debt debt) async {
    if (debt.id == null) return;
    final p = await LocalDB.getPayments(debt.id!);
    if (!mounted) return;
    await showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
            child: p.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('لا مدفوعات')))
                : ListView(children: [
                    const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('سجل السداد',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                    ...p.map((x) => ListTile(
                        dense: true,
                        title: Text(formatMoney(x.amount, _settings.currency)),
                        subtitle: Text(formatDateTime(x.createdAt))))
                  ])));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('دفتر الديون')),
      floatingActionButton:
          FloatingActionButton(onPressed: _add, child: const Icon(Icons.add)),
      body: Column(
        children: [
          Card(
              margin: const EdgeInsets.all(12),
              child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _mini('الإجمالي', formatMoney(_summary.total, _settings.currency)),
                        _mini('المتبقي',
                            formatMoney(_summary.remaining, _settings.currency)),
                        _mini('العملاء', '${_summary.count}'),
                      ]))),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                  onChanged: (v) {
                    _search = v;
                    _load();
                  },
                  decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: 'ابحث بالاسم/الهاتف',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _debts.isEmpty
                      ? const Center(child: Text('لا توجد ديون'))
                      : ListView.builder(
                          itemCount: _debts.length,
                          itemBuilder: (ctx, i) {
                            final d = _debts[i];
                            final paid = d.remaining <= 0.001;
                            return ListTile(
                              title: Text(d.customer),
                              subtitle: Text(
                                  'الدين: ${formatMoney(d.amount, _settings.currency)}\nالمدفوع: ${formatMoney(d.paid, _settings.currency)}\nالمتبقي: ${formatMoney(d.remaining, _settings.currency)}'),
                              isThreeLine: true,
                              trailing: paid
                                  ? IconButton(
                                      onPressed: () => _history(d),
                                      icon: const Icon(Icons.history))
                                  : Row(mainAxisSize: MainAxisSize.min, children: [
                                      IconButton(
                                          onPressed: () => _history(d),
                                          icon: const Icon(Icons.history)),
                                      FilledButton(
                                          onPressed: () => _pay(d),
                                          child: const Text('تسديد')),
                                    ]),
                            );
                          })),
        ],
      ),
    );
  }

  Widget _mini(String t, String v) => Column(children: [
        Text(t, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(v, style: const TextStyle(fontWeight: FontWeight.bold)),
      ]);
}

class _DebtForm extends StatefulWidget {
  const _DebtForm();
  @override
  State<_DebtForm> createState() => _DebtFormState();
}

class _DebtFormState extends State<_DebtForm> {
  final _fk = GlobalKey<FormState>();
  final _c = TextEditingController();
  final _ph = TextEditingController();
  final _am = TextEditingController();
  final _nt = TextEditingController();

  @override
  void dispose() {
    _c.dispose();
    _ph.dispose();
    _am.dispose();
    _nt.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_fk.currentState!.validate()) return;
    await LocalDB.addDebt(Debt(
        customer: _c.text.trim(),
        phone: _ph.text.trim(),
        amount: double.tryParse(_am.text.trim()) ?? 0,
        note: _nt.text.trim(),
        createdAt: DateTime.now().toIso8601String()));
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
          key: _fk,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('دين جديد',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                  controller: _c,
                  decoration: const InputDecoration(labelText: 'اسم الزبون'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _ph,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'الهاتف')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _am,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'المبلغ'),
                  validator: (v) {
                    final n = double.tryParse(v?.trim() ?? '');
                    if (n == null || n <= 0) return 'غير صالح';
                    return null;
                  }),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _nt,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'ملاحظة')),
              const SizedBox(height: 16),
              FilledButton(
                  onPressed: _save,
                  child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}
