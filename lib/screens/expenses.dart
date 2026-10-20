import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/pdf_report.dart';
import '../utils.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  bool _loading = true;
  int _days = 1;
  List<Expense> _list = [];
  ExpensesSummary _summary = ExpensesSummary.empty();
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

  Future<void> _load() async {
    setState(() => _loading = true);
    final since = _since;
    final list = await LocalDB.getExpenses(since);
    final summary = await LocalDB.getExpensesSummary(since);
    final settings = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = list;
      _summary = summary;
      _settings = settings;
      _loading = false;
    });
  }

  Future<void> _add() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ExpenseForm(categories: PdfReportService.expenseCategories),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('المصروفات')),
      floatingActionButton: FloatingActionButton(onPressed: _add, child: const Icon(Icons.add)),
      body: Column(
        children: [
          Padding(padding: const EdgeInsets.all(12), child: SegmentedButton<int>(segments: const [
            ButtonSegment(value: 1, label: Text('اليوم')),
            ButtonSegment(value: 7, label: Text('7 أيام')),
            ButtonSegment(value: 30, label: Text('30 يوم')),
          ], selected: {_days}, onSelectionChanged: (s) { setState(() => _days = s.first); _load(); })),
          Card(margin: const EdgeInsets.symmetric(horizontal: 12), child: Padding(padding: const EdgeInsets.all(16), child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _mini('عدد العمليات', '${_summary.count}'),
            _mini('الإجمالي', formatMoney(_summary.total, cur)),
          ]))),
          const SizedBox(height: 8),
          Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _list.isEmpty 
            ? const Center(child: Text('لا توجد مصروفات في هذه الفترة'))
            : ListView.builder(itemCount: _list.length, itemBuilder: (ctx, i) {
                final e = _list[i];
                return ListTile(
                  title: Text(e.category),
                  subtitle: Text('${formatMoney(e.amount, cur)}${e.note.isEmpty ? '' : ' — ${e.note}'}'),
                  trailing: Text(formatDateTime(e.createdAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
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

class _ExpenseForm extends StatefulWidget {
  final List<String> categories;
  const _ExpenseForm({required this.categories});
  @override
  State<_ExpenseForm> createState() => _ExpenseFormState();
}

class _ExpenseFormState extends State<_ExpenseForm> {
  final _key = GlobalKey<FormState>();
  String _category = '';
  final _amount = TextEditingController();
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    _category = widget.categories.first;
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_key.currentState!.validate()) return;
    await LocalDB.addExpense(Expense(category: _category, amount: double.tryParse(_amount.text.trim()) ?? 0, note: _note.text.trim(), createdAt: DateTime.now().toIso8601String()));
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
          key: _key,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('مصروف جديد', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(value: _category, decoration: const InputDecoration(labelText: 'الفئة'), items: widget.categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(), onChanged: (v) => setState(() => _category = v ?? _category)),
              const SizedBox(height: 12),
              TextFormField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المبلغ'), validator: (v) { final n = double.tryParse(v?.trim() ?? ''); if (n == null || n <= 0) return 'أدخل مبلغاا صالحاا'; return null; }),
              const SizedBox(height: 12),
              TextFormField(controller: _note, maxLines: 2, decoration: const InputDecoration(labelText: 'ملاحظة (اختياري)')),
              const SizedBox(height: 16),
              FilledButton(onPressed: _save, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}
