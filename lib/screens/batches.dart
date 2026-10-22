import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/batch_service.dart';
import '../utils.dart';

class BatchesScreen extends StatefulWidget {
  const BatchesScreen({super.key});

  @override
  State<BatchesScreen> createState() => _BatchesScreenState();
}

class _BatchesScreenState extends State<BatchesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  bool _loading = true;
  String _search = '';

  List<ProductBatch> _all = [];
  List<ProductBatch> _soon = [];
  List<ProductBatch> _expired = [];

  BatchExpirySummary _summary = BatchExpirySummary.empty();
  AppSettings _app = AppSettings.defaults();

  static const int _soonDays = 30;

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

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final app = await LocalDB.getAppSettings();
      final all = await BatchService.getBatches(search: _search);

      final soon = <ProductBatch>[];
      final expired = <ProductBatch>[];

      int soonCount = 0;
      int expCount = 0;
      double soonValue = 0;
      double expValue = 0;

      for (final b in all) {
        final st = BatchService.status(b, soonDays: _soonDays);
        if (st == 'soon') {
          soon.add(b);
          soonCount++;
          soonValue += b.totalValue;
        } else if (st == 'expired') {
          expired.add(b);
          expCount++;
          expValue += b.totalValue;
        }
      }

      if (!mounted) return;

      setState(() {
        _app = app;
        _all = all;
        _soon = soon;
        _expired = expired;
        _summary = BatchExpirySummary(
          total: all.length,
          expiringSoon: soonCount,
          expired: expCount,
          soonValue: soonValue,
          expiredValue: expValue,
        );
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _msg('خطأ: $e');
    }
  }

  Future<void> _openForm([ProductBatch? b]) async {
    final products = await LocalDB.getAllProducts();
    if (!mounted) return;

    if (products.isEmpty) {
      _msg('لا توجد أصناف. أضف صنفًا أولًا.');
      return;
    }

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _BatchForm(products: products, existing: b),
    );

    if (saved == true) _load();
  }

  Future<void> _delete(ProductBatch b) async {
    if (b.id == null) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف دفعة'),
        content: Text('حذف دفعة "${b.productName}"؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );

    if (ok == true) {
      await BatchService.deleteBatch(b.id!);
      _load();
    }
  }

  String _daysLabel(int? days) {
    if (days == null) return '—';
    if (days < 0) return 'منتهي منذ ${-days} يوم';
    if (days == 0) return 'ينتهي اليوم';
    return 'متبقي $days يوم';
  }

  Widget _tile(ProductBatch b) {
    final st = BatchService.status(b, soonDays: _soonDays);
    final color = st == 'expired'
        ? Colors.red
        : (st == 'soon' ? Colors.orange : Colors.green);

    final days = BatchService.daysUntil(b.expiryDate);
    final expiryLabel = b.expiryDate.isEmpty
        ? 'بدون صلاحية'
        : '${b.expiryDate} — ${_daysLabel(days)}';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Icon(Icons.inventory, color: color),
        ),
        title: Text(b.productName),
        subtitle: Text(
          'دفعة: ${b.batchNo.isEmpty ? '—' : b.batchNo}\nكمية: ${formatQty(b.qty)} • قيمة: ${formatMoney(b.totalValue, _app.currency)}\n$expiryLabel',
        ),
        isThreeLine: true,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () => _openForm(b),
              icon: const Icon(Icons.edit),
            ),
            IconButton(
              onPressed: () => _delete(b),
              icon: const Icon(Icons.delete, color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard() {
    final cur = _app.currency;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _mini('إجمالي الدفعات', '${_summary.total}'),
                _mini('قريبة', '${_summary.expiringSoon}'),
                _mini('منتهية', '${_summary.expired}'),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _mini('قيمة قريبة', formatMoney(_summary.soonValue, cur)),
                _mini('قيمة منتهية', formatMoney(_summary.expiredValue, cur)),
              ],
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

  Widget _listTab(
    List<ProductBatch> items,
    String empty, {
    bool summary = false,
  }) {
    if (items.isEmpty && !summary) return _empty(empty);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (summary) ...[
            _summaryCard(),
            const SizedBox(height: 12),
          ],
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('لا توجد دفعات في هذا التبويب')),
            )
          else
            ...items.map(_tile),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الدفعات والصلاحية'),
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'الكل (${_all.length})'),
            Tab(text: 'قريب (${_soon.length})'),
            Tab(text: 'منتهي (${_expired.length})'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openForm(),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) {
                _search = v;
                _load();
              },
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: 'ابحث بالاسم أو رقم الدفعة',
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tab,
                    children: [
                      _listTab(_all, 'لا توجد دفعات', summary: true),
                      _listTab(_soon, 'لا توجد دفعات قريبة الانتهاء'),
                      _listTab(_expired, 'لا توجد دفعات منتهية'),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _BatchForm extends StatefulWidget {
  final List<Product> products;
  final ProductBatch? existing;

  const _BatchForm({required this.products, this.existing});

  @override
  State<_BatchForm> createState() => _BatchFormState();
}

class _BatchFormState extends State<_BatchForm> {
  final _k = GlobalKey<FormState>();

  Product? _product;

  late final _batch =
      TextEditingController(text: widget.existing?.batchNo ?? '');
  late final _qty =
      TextEditingController(text: widget.existing?.qty.toString() ?? '1');
  late final _cost =
      TextEditingController(text: widget.existing?.cost.toString() ?? '');
  late final _note =
      TextEditingController(text: widget.existing?.note ?? '');

  DateTime? _due;

  bool get _isNew => widget.existing == null;

  @override
  void initState() {
    super.initState();

    if (widget.existing != null) {
      final id = widget.existing!.productId;
      for (final p in widget.products) {
        if (p.id == id) {
          _product = p;
          break;
        }
      }

      if (widget.existing!.expiryDate.isNotEmpty) {
        _due = DateTime.tryParse(widget.existing!.expiryDate);
      }
    }
  }

  @override
  void dispose() {
    _batch.dispose();
    _qty.dispose();
    _cost.dispose();
    _note.dispose();
    super.dispose();
  }

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDue() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _due ?? now.add(const Duration(days: 30)),
      firstDate: now.subtract(const Duration(days: 365 * 5)),
      lastDate: now.add(const Duration(days: 365 * 10)),
    );

    if (picked != null) setState(() => _due = picked);
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate() || _product?.id == null) return;

    await BatchService.saveBatch(ProductBatch(
      id: widget.existing?.id,
      productId: _product!.id!,
      productName: _product!.name,
      batchNo: _batch.text.trim(),
      qty: double.tryParse(_qty.text.trim()) ?? 0,
      cost: double.tryParse(_cost.text.trim()) ?? 0,
      expiryDate: _due == null ? '' : _fmt(_due!),
      note: _note.text.trim(),
      createdAt: widget.existing?.createdAt ?? '',
      updatedAt: widget.existing?.updatedAt ?? '',
    ));

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
            children: [
              Text(
                _isNew ? 'دفعة جديدة' : 'تعديل دفعة',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<Product>(
                value: _product,
                decoration: const InputDecoration(labelText: 'الصنف'),
                items: widget.products
                    .map((p) => DropdownMenuItem<Product>(
                          value: p,
                          child: Text(p.name),
                        ))
                    .toList(),
                onChanged: (v) => setState(() {
                  _product = v;
                  if (_isNew && v != null && _cost.text.isEmpty) {
                    _cost.text = v.buyPrice.toString();
                  }
                }),
                validator: (v) => v == null ? 'مطلوب' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _batch,
                decoration:
                    const InputDecoration(labelText: 'رقم الدفعة (اختياري)'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _qty,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'الكمية'),
                validator: (v) {
                  final n = double.tryParse(v?.trim() ?? '');
                  if (n == null || n <= 0) return 'رقم غير صالح';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _cost,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration:
                    const InputDecoration(labelText: 'سعر الشراء لهذه الدفعة'),
                validator: (v) {
                  final n = double.tryParse(v?.trim() ?? '');
                  if (n == null || n < 0) return 'رقم غير صالح';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickDue,
                child: InputDecorator(
                  decoration:
                      const InputDecoration(labelText: 'تاريخ الانتهاء (اختياري)'),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(_due == null ? '— بدون —' : _fmt(_due!)),
                      ),
                      const Icon(Icons.event),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _note,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'ملاحظة'),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _save,
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text('حفظ'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
