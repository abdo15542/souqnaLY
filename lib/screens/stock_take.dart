import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class StockTakeScreen extends StatefulWidget {
  const StockTakeScreen({super.key});
  @override
  State<StockTakeScreen> createState() => _StockTakeScreenState();
}

class _StockTakeScreenState extends State<StockTakeScreen> {
  bool _loading = true;
  List<StockTake> _takes = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final takes = await LocalDB.getStockTakes();
    if (!mounted) return;
    setState(() {
      _takes = takes;
      _loading = false;
    });
  }

  Future<void> _newTake() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => const _NewTakeSheet(),
    );
    if (saved == true) _load();
  }

  Future<void> _viewDetails(StockTake t) async {
    final items = await LocalDB.getStockTakeItems(t.id);
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(child: ListView(children: [
        Padding(padding: const EdgeInsets.all(16), child: Text('تفاصيل الجرد #${t.id}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
        ...items.map((it) => ListTile(dense: true, title: Text(it.name), subtitle: Text('سابق: ${formatQty(it.previousQty)} → معدود: ${formatQty(it.countedQty)}'), trailing: Text(it.diff == 0 ? '=' : (it.diff > 0 ? '+${formatQty(it.diff)}' : formatQty(it.diff)), style: TextStyle(color: it.diff == 0 ? Colors.grey : (it.diff > 0 ? Colors.green : Colors.red), fontWeight: FontWeight.bold)))),
      ])),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('جرد المخزون')),
      floatingActionButton: FloatingActionButton.extended(onPressed: _newTake, icon: const Icon(Icons.playlist_add_check), label: const Text('جرد جديد')),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _takes.isEmpty 
        ? const Center(child: Text('لم يتم إجراء أي جرد بعد'))
        : ListView.builder(itemCount: _takes.length, itemBuilder: (ctx, i) {
            final t = _takes[i];
            return ListTile(
              title: Text('جرد #${t.id}'),
              subtitle: Text('${formatDateTime(t.createdAt)}\nالكاشير: ${t.cashierName} — عناصر: ${t.itemsCount}'),
              isThreeLine: true,
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(t.totalDiff == 0 ? '=' : (t.totalDiff > 0 ? '+${formatQty(t.totalDiff)}' : formatQty(t.totalDiff)), style: TextStyle(fontWeight: FontWeight.bold, color: t.totalDiff == 0 ? Colors.grey : (t.totalDiff > 0 ? Colors.green : Colors.red))),
                const SizedBox(height: 4),
                TextButton(onPressed: () => _viewDetails(t), child: const Text('تفاصيل')),
              ]),
            );
          }),
    );
  }
}

class _NewTakeSheet extends StatefulWidget {
  const _NewTakeSheet();
  @override
  State<_NewTakeSheet> createState() => _NewTakeSheetState();
}

class _NewTakeSheetState extends State<_NewTakeSheet> {
  bool _loading = true;
  List<Product> _products = [];
  final Map<int, TextEditingController> _controllers = {};
  final _note = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _note.dispose();
    for (final c in _controllers.values) c.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final products = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _products = products;
      for (final p in products) {
        _controllers[p.id!] = TextEditingController(text: p.qty.toStringAsFixed(0));
      }
      _loading = false;
    });
  }

  double get _totalDiff {
    double sum = 0;
    for (final p in _products) {
      final counted = double.tryParse(_controllers[p.id!]?.text ?? '') ?? p.qty;
      sum += counted - p.qty;
    }
    return sum;
  }

  Future<void> _confirm() async {
    final lines = <StockTakeLine>[];
    for (final p in _products) {
      final counted = double.tryParse(_controllers[p.id!]?.text ?? '');
      if (counted == null || counted < 0) continue;
      if (counted != p.qty) lines.add(StockTakeLine(product: p, countedQty: counted));
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('اعتماد الجرد'),
        content: Text('سيتم تحديث كميات ${lines.length} صنف.\nصافي الفرق: ${formatQty(_totalDiff)}\nهل تريد المتابعة؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('اعتماد')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _saving = true);
    final takeId = await LocalDB.createStockTake(lines, note: _note.text.trim());
    await LocalDB.logAudit(action: 'stock_take_done', entity: 'stock_take', entityId: takeId, details: 'عناصر: ${lines.length} — فرق: ${_totalDiff.toStringAsFixed(2)}');
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scrollCtrl) => Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          const Expanded(child: Text('جرد جديد', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
          Text('الفرق: ${formatQty(_totalDiff)}', style: const TextStyle(fontWeight: FontWeight.bold)),
        ])),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: TextField(controller: _note, decoration: const InputDecoration(labelText: 'ملاحظة الجرد (اختياري)'))),
        const SizedBox(height: 8),
        Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : ListView.builder(controller: scrollCtrl, itemCount: _products.length, itemBuilder: (ctx, i) {
          final p = _products[i];
          final ctrl = _controllers[p.id!]!;
          final counted = double.tryParse(ctrl.text) ?? p.qty;
          final diff = counted - p.qty;
          return ListTile(
            title: Text(p.name),
            subtitle: Text('الحالية: ${formatQty(p.qty)} ${p.unit}'),
            trailing: SizedBox(width: 120, child: Row(children: [
              Expanded(child: TextField(controller: ctrl, keyboardType: TextInputType.number, onChanged: (_) => setState(() {}), decoration: const InputDecoration(isDense: true))),
              const SizedBox(width: 4),
              Text(diff == 0 ? '=' : (diff > 0 ? '+${formatQty(diff)}' : formatQty(diff)), style: TextStyle(color: diff == 0 ? Colors.grey : (diff > 0 ? Colors.green : Colors.red), fontWeight: FontWeight.bold)),
            ])),
          );
        })),
        Padding(padding: const EdgeInsets.all(16), child: FilledButton(onPressed: _saving ? null : _confirm, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('اعتماد الجرد')))),
      ]),
    );
  }
}
