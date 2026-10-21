import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class PurchaseOrdersScreen extends StatefulWidget {
  const PurchaseOrdersScreen({super.key});
  @override
  State<PurchaseOrdersScreen> createState() => _PurchaseOrdersScreenState();
}

class _PurchaseOrdersScreenState extends State<PurchaseOrdersScreen> {
  bool _loading = true;
  String _status = 'draft';
  String _search = '';
  List<PurchaseOrder> _list = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getPurchaseOrders(status: _status, search: _search);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = l;
      _settings = s;
      _loading = false;
    });
  }

  String _statusLabel(String st) {
    switch (st) {
      case 'draft':
        return 'مسودة';
      case 'received':
        return 'مستلم';
      case 'cancelled':
        return 'ملغى';
      default:
        return st;
    }
  }

  Color _statusColor(String st) {
    switch (st) {
      case 'draft':
        return Colors.orange;
      case 'received':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Future<void> _newOrder() async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        isDismissible: false,
        enableDrag: false,
        builder: (_) => const _NewPOSheet());
    if (saved == true) _load();
  }

  Future<void> _details(PurchaseOrder po) async {
    await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => _PODetailsSheet(po: po, currency: _settings.currency),
        ).then((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('أوامر الشراء')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: _newOrder,
          icon: const Icon(Icons.add_shopping_cart),
          label: const Text('أمر شراء جديد')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'draft', label: Text('مسودة')),
                  ButtonSegment(value: 'received', label: Text('مستلم')),
                  ButtonSegment(value: 'cancelled', label: Text('ملغى')),
                  ButtonSegment(value: '', label: Text('الكل')),
                ],
                selected: {_status},
                onSelectionChanged: (s) {
                  setState(() => _status = s.first);
                  _load();
                }),
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
                    hintText: 'ابحث برقم الأمر أو اسم المورد',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14)))),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _list.isEmpty
                    ? const Center(child: Text('لا توجد أوامر شراء'))
                    : ListView.builder(
                        itemCount: _list.length,
                        itemBuilder: (ctx, i) {
                          final po = _list[i];
                          return ListTile(
                            leading: CircleAvatar(
                                backgroundColor:
                                    _statusColor(po.status).withValues(alpha: 0.15),
                                child: Icon(Icons.local_shipping,
                                    color: _statusColor(po.status))),
                            title: Text('#${po.id} — ${po.supplierName}'),
                            subtitle: Text(
                                '${formatDateTime(po.createdAt)}\n${po.items.length} صنف • ${formatMoney(po.total, cur)}'),
                            isThreeLine: true,
                            trailing: Chip(
                                label: Text(_statusLabel(po.status)),
                                backgroundColor:
                                    _statusColor(po.status).withValues(alpha: 0.15)),
                            onTap: () => _details(po),
                          );
                        }),
          ),
        ],
      ),
    );
  }
}

class _NewPOSheet extends StatefulWidget {
  const _NewPOSheet();
  @override
  State<_NewPOSheet> createState() => _NewPOSheetState();
}

class _NewPOSheetState extends State<_NewPOSheet> {
  bool _loading = true, _saving = false;
  List<Supplier> _suppliers = [];
  List<Product> _products = [];
  Supplier? _supplier;
  final Map<int, POLine> _cart = {};
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final sup = await LocalDB.getSuppliers();
    final prod = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _suppliers = sup;
      _products = prod;
      _loading = false;
    });
  }

  double get _total => _cart.values.fold(0.0, (s, l) => s + l.total);

  void _add(Product p) {
    if (p.id == null) return;
    setState(() {
      final cur = _cart[p.id];
      if (cur == null) {
        _cart[p.id!] = POLine(product: p, qty: 1, cost: p.buyPrice);
      } else {
        cur.qty += 1;
      }
    });
  }

  void _changeQty(int id, double d) {
    final l = _cart[id];
    if (l == null) return;
    var q = l.qty + d;
    if (q <= 0) {
      _cart.remove(id);
    } else {
      l.qty = q;
    }
    setState(() {});
  }

  void _changeCost(int id, double c) {
    final l = _cart[id];
    if (l == null) return;
    l.cost = c < 0 ? 0 : c;
    setState(() {});
  }

  Future<void> _save() async {
    if (_supplier == null || _cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('اختر موردًا وأضف أصنافًا')));
      return;
    }
    setState(() => _saving = true);
    await LocalDB.createPurchaseOrder(
      supplierId: _supplier!.id,
      supplierName: _supplier!.name,
      lines: _cart.values.toList(),
      note: _note.text.trim(),
      cashierId: CashierSession.cashierId,
    );
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
        initialChildSize: 0.92,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, sc) => _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                controller: sc,
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('أمر شراء جديد',
                      style:
                          TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  if (_suppliers.isEmpty)
                    const Card(
                        color: Colors.orange.shade50,
                        child: Padding(
                            padding: EdgeInsets.all(12),
                            child: Text('لا يوجد موردون. أضف موردًا أولًا من شاشة الموردين.')))
                  else
                    DropdownButtonFormField<Supplier>(
                        value: _supplier,
                        decoration: const InputDecoration(labelText: 'المورد'),
                        items: _suppliers
                            .map((s) => DropdownMenuItem(
                                value: s, child: Text(s.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _supplier = v)),
                  const SizedBox(height: 16),
                  const Text('الأصناف (اضغط للإضافة)',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ..._products.map((p) => ListTile(
                        dense: true,
                        title: Text(p.name),
                        subtitle: Text('سعر شراء حالي: ${p.buyPrice}'),
                        trailing: IconButton(
                            onPressed: () => _add(p),
                            icon: const Icon(Icons.add_circle)),
                      )),
                  const Divider(height: 32),
                  const Text('سلة الأمر',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_cart.isEmpty) const Text('فارغة')
                  else
                    ..._cart.values.map((l) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(children: [
                              Row(children: [
                                Expanded(child: Text(l.product.name)),
                                Text(formatMoney(l.total, 'د.ل')),
                              ]),
                              const SizedBox(height: 8),
                              Row(children: [
                                const Text('كمية:'),
                                IconButton(
                                    onPressed: () => _changeQty(l.product.id!, -1),
                                    icon: const Icon(Icons.remove)),
                                Text(formatQty(l.qty)),
                                IconButton(
                                    onPressed: () => _changeQty(l.product.id!, 1),
                                    icon: const Icon(Icons.add)),
                                const Spacer(),
                                const Text('سعر:'),
                                SizedBox(
                                    width: 90,
                                    child: TextField(
                                      keyboardType: TextInputType.number,
                                      controller:
                                          TextEditingController(text: l.cost.toString()),
                                      onSubmitted: (v) => _changeCost(
                                          l.product.id!, double.tryParse(v) ?? l.cost),
                                      decoration: const InputDecoration(isDense: true),
                                    )),
                              ]),
                            ]),
                          ),
                        )),
                  const SizedBox(height: 16),
                  TextField(
                      controller: _note,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'ملاحظة')),
                  const SizedBox(height: 16),
                  Card(
                      color: Colors.teal.withValues(alpha: 0.1),
                      child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('الإجمالي: ${formatMoney(_total, 'د.ل')}',
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold)))),
                  const SizedBox(height: 16),
                  FilledButton(
                      onPressed: _saving ? null : _save,
                      child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Text('حفظ الأمر كمسودة'))),
                ],
              ));
  }
}

class _PODetailsSheet extends StatefulWidget {
  final PurchaseOrder po;
  final String currency;
  const _PODetailsSheet({required this.po, required this.currency});
  @override
  State<_PODetailsSheet> createState() => _PODetailsSheetState();
}

class _PODetailsSheetState extends State<_PODetailsSheet> {
  late final Map<int, TextEditingController> _recv;

  @override
  void initState() {
    super.initState();
    _recv = {
      for (final it in widget.po.items)
        if (it.id != null)
          it.id!: TextEditingController(text: it.remaining.toStringAsFixed(0))
    };
  }

  @override
  void dispose() {
    for (final c in _recv.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _receive() async {
    final map = <int, double>{};
    for (final it in widget.po.items) {
      if (it.id == null) continue;
      final v = double.tryParse(_recv[it.id!]?.text ?? '') ?? 0;
      map[it.id!] = v < 0 ? 0 : (v > it.remaining ? it.remaining : v);
    }
    final ok = await LocalDB.receivePurchaseOrder(
        widget.po.id, map,
        cashierId: CashierSession.cashierId);
    if (!mounted) return;
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'تم الاستلام وتحديث المخزون' : 'تعذر الاستلام')));
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('إلغاء الأمر'),
              content: const Text('إلغاء أمر الشراء؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('تراجع')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('إلغاء الأمر')),
              ],
            ));
    if (ok == true) {
      await LocalDB.cancelPurchaseOrder(widget.po.id,
          cashierId: CashierSession.cashierId);
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final po = widget.po;
    final cur = widget.currency;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('أمر شراء #${po.id}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('المورد: ${po.supplierName}'),
            Text('الحالة: ${po.status}'),
            Text('التاريخ: ${formatDateTime(po.createdAt)}'),
            if (po.receivedAt != null) Text('استلم في: ${formatDateTime(po.receivedAt!)}'),
            if (po.note.isNotEmpty) Text('ملاحظة: ${po.note}'),
            const SizedBox(height: 16),
            const Text('الأصناف', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...po.items.map((it) {
              if (po.isDraft && it.id != null) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(children: [
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(it.name),
                            Text('مطلوب: ${formatQty(it.qty)} • مستلم: ${formatQty(it.receivedQty)} • متبقٍ: ${formatQty(it.remaining)}',
                                style: const TextStyle(fontSize: 12)),
                          ])),
                      SizedBox(
                          width: 80,
                          child: TextField(
                            controller: _recv[it.id!],
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'الاستلام', isDense: true),
                          )),
                    ]),
                  ),
                );
              }
              return ListTile(
                dense: true,
                title: Text(it.name),
                subtitle: Text('كمية: ${formatQty(it.qty)} × ${formatMoney(it.costPrice, cur)}'),
                trailing: Text(formatMoney(it.total, cur)),
              );
            }),
            const SizedBox(height: 16),
            Card(
                color: Colors.teal.withValues(alpha: 0.1),
                child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('الإجمالي: ${formatMoney(po.total, cur)}',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)))),
            const SizedBox(height: 16),
            if (po.isDraft)
              Row(children: [
                Expanded(
                    child: FilledButton.icon(
                        onPressed: _receive,
                        icon: const Icon(Icons.check),
                        label: const Text('استلام وتحديث المخزون'))),
                const SizedBox(width: 8),
                Expanded(
                    child: OutlinedButton.icon(
                        onPressed: _cancel,
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                        icon: const Icon(Icons.block),
                        label: const Text('إلغاء'))),
              ])
            else
              FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('إغلاق'))),
          ],
        ),
      ),
    );
  }
}
