import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/batches_service.dart';
import '../utils.dart';

class BatchesScreen extends StatefulWidget {
  const BatchesScreen({super.key});
  @override
  State<BatchesScreen> createState() => _BatchesScreenState();
}

class _BatchesScreenState extends State<BatchesScreen> {
  bool _loading = true;
  String _search = '';
  int _daysAhead = 7;
  List<Batch> _list = [];
  Map<String, int> _counts = {'ok': 0, 'soon': 0, 'expired': 0};
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await BatchesService.getBatches(search: _search);
    final c = await BatchesService.expiryCounts(_daysAhead);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = l;
      _counts = c;
      _settings = s;
      _loading = false;
    });
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _add() async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => const _BatchForm());
    if (saved == true) _load();
  }

  Future<void> _edit(Batch b) async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _BatchForm(batch: b));
    if (saved == true) _load();
  }

  Future<void> _delete(Batch b) async {
    if (b.id == null) return;
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('حذف دفعة'),
              content: Text('حذف دفعة "${b.productName}"؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('حذف')),
              ],
            ));
    if (ok == true) {
      await BatchesService.deleteBatch(b.id!);
      _load();
    }
  }

  Color _statusColor(int st) {
    if (st == 2) return Colors.red;
    if (st == 1) return Colors.orange;
    return Colors.green;
  }

  String _statusLabel(int st) {
    if (st == 2) return 'منتهي';
    if (st == 1) return 'قارب';
    return 'سليم';
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: const Text('الدفعات والصلاحية'),
        actions: [
          IconButton(
              onPressed: () async {
                final v = await showDialog<int>(
                    context: context,
                    builder: (ctx) {
                      final c = TextEditingController(text: '$_daysAhead');
                      return AlertDialog(
                        title: const Text('أيام التنبيه المسبق'),
                        content: TextField(
                            controller: c,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'عدد الأيام')),
                        actions: [
                          TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('إلغاء')),
                          FilledButton(
                              onPressed: () {
                                final n = int.tryParse(c.text.trim());
                                Navigator.pop(ctx, n);
                              },
                              child: const Text('تطبيق')),
                        ],
                      );
                    });
                if (v != null && v >= 0) {
                  setState(() => _daysAhead = v);
                  _load();
                }
              },
              icon: const Icon(Icons.timer),
              tooltip: 'ضبط أيام التنبيه'),
        ],
      ),
      floatingActionButton:
          FloatingActionButton(onPressed: _add, child: const Icon(Icons.add)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      _chip('سليم', _counts['ok'] ?? 0, Colors.green),
                      const SizedBox(width: 8),
                      _chip('قارب', _counts['soon'] ?? 0, Colors.orange),
                      const SizedBox(width: 8),
                      _chip('منتهي', _counts['expired'] ?? 0, Colors.red),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: TextField(
                      onChanged: (v) {
                        _search = v;
                        _load();
                      },
                      decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.search),
                          hintText: 'ابحث بالمنتج/الملاحظة',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14)))),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: _list.isEmpty
                      ? const Center(child: Text('لا توجد دفعات مسجلة'))
                      : ListView.builder(
                          itemCount: _list.length,
                          itemBuilder: (ctx, i) {
                            final b = _list[i];
                            final st =
                                BatchesService.expiryStatus(b, _daysAhead);
                            final col = _statusColor(st);
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 5),
                              child: ListTile(
                                leading: Icon(Icons.inventory, color: col),
                                title: Text(b.productName),
                                subtitle: Text(
                                    'كمية: ${formatQty(b.qty)} • انتهاء: ${b.expiresAt}\n${b.note.isEmpty ? '' : 'ملاحظة: ${b.note}'}',
                                    ),
                                isThreeLine: true,
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: col.withValues(alpha: 0.15),
                                        borderRadius:
                                            BorderRadius.circular(12),
                                      ),
                                      child: Text(_statusLabel(st),
                                          style: TextStyle(
                                              color: col,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold)),
                                    ),
                                    IconButton(
                                        onPressed: () => _edit(b),
                                        icon: const Icon(Icons.edit)),
                                    IconButton(
                                        onPressed: () => _delete(b),
                                        icon: const Icon(Icons.delete,
                                            color: Colors.red)),
                                  ],
                                ),
                              ),
                            );
                          }),
                ),
              ],
            ),
    );
  }

  Widget _chip(String t, int v, Color c) => Expanded(
        child: Card(
          color: c.withValues(alpha: 0.12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(children: [
              Text('$v',
                  style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold, color: c)),
              Text(t, style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ),
      );
}

class _BatchForm extends StatefulWidget {
  final Batch? batch;
  const _BatchForm({this.batch});
  @override
  State<_BatchForm> createState() => _BatchFormState();
}

class _BatchFormState extends State<_BatchForm> {
  final _k = GlobalKey<FormState>();
  List<Product> _products = [];
  Product? _sel;
  late final _qty =
      TextEditingController(text: widget.batch?.qty.toString() ?? '');
  late final _cost =
      TextEditingController(text: widget.batch?.costPrice.toString() ?? '');
  late final _produced =
      TextEditingController(text: widget.batch?.producedAt ?? '');
  late final _expires = TextEditingController(text: widget.batch?.expiresAt ?? '');
  late final _note = TextEditingController(text: widget.batch?.note ?? '');

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _qty.dispose();
    _cost.dispose();
    _produced.dispose();
    _expires.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    final p = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _products = p;
      if (widget.batch?.productId != null) {
        for (final x in p) {
          if (x.id == widget.batch!.productId) _sel = x;
        }
      }
    });
  }

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<void> _pick(bool produced) async {
    final now = DateTime.now();
    final init = DateTime.tryParse(produced ? _produced.text : _expires.text) ??
        now;
    final picked = await showDatePicker(
        context: context,
        initialDate: init,
        firstDate: now.subtract(const Duration(days: 365 * 3)),
        lastDate: now.add(const Duration(days: 365 * 5)));
    if (picked == null) return;
    setState(() {
      if (produced) {
        _produced.text = _fmt(picked);
      } else {
        _expires.text = _fmt(picked);
      }
    });
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;
    if (_sel == null) {
      _msg('اختر منتجًا');
      return;
    }
    await BatchesService.saveBatch(Batch(
      id: widget.batch?.id,
      productId: _sel!.id,
      productName: _sel!.name,
      qty: double.tryParse(_qty.text.trim()) ?? 0,
      costPrice: double.tryParse(_cost.text.trim()) ?? 0,
      producedAt: _produced.text.trim(),
      expiresAt: _expires.text.trim(),
      note: _note.text.trim(),
      createdAt: widget.batch?.createdAt ?? '',
    ));
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.batch == null;
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
              Text(isNew ? 'دفعة جديدة' : 'تعديل دفعة',
                  style:
                      const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<Product>(
                  value: _sel,
                  decoration: const InputDecoration(labelText: 'المنتج'),
                  items: _products
                      .map((p) =>
                          DropdownMenuItem<Product>(value: p, child: Text(p.name)))
                      .toList(),
                  onChanged: (v) => setState(() => _sel = v),
                  validator: (v) => v == null ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _qty,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'الكمية'),
                  validator: (v) {
                    final n = double.tryParse(v?.trim() ?? '');
                    if (n == null || n < 0) return 'رقم غير صالح';
                    return null;
                  }),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _cost,
                  keyboardType: TextInputType.number,
                  decoration:
                      const InputDecoration(labelText: 'سعر الشراء (اختياري)')),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => _pick(true),
                child: InputDecorator(
                  decoration:
                      const InputDecoration(labelText: 'تاريخ الإنتاج (اختياري)'),
                  child: Row(children: [
                    Expanded(child: Text(_produced.text.isEmpty ? '— بدون —' : _produced.text)),
                    const Icon(Icons.event),
                  ]),
                ),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => _pick(false),
                child: InputDecorator(
                  decoration:
                      const InputDecoration(labelText: 'تاريخ الانتهاء *'),
                  child: Row(children: [
                    Expanded(child: Text(_expires.text.isEmpty ? '— اختر —' : _expires.text)),
                    const Icon(Icons.event),
                  ]),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _note,
                  maxLines: 2,
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
