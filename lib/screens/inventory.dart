import 'package:flutter/material.dart';
import '../db.dart';
import '../forms/product_form.dart';
import '../models.dart';
import '../utils.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  bool _loading = true;
  String _search = '';
  List<Product> _products = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final p = await LocalDB.getProducts(search: _search);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _products = p;
      _settings = s;
      _loading = false;
    });
  }

  Future<void> _openForm([Product? p]) async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => ProductFormSheet(product: p));
    if (saved == true) _load();
  }

  Future<void> _delete(Product p) async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('حذف صنف'),
              content: Text('حذف "${p.name}"؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('حذف')),
              ],
            ));
    if (ok == true && p.id != null) {
      await LocalDB.deleteProduct(p.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المخزون')),
      floatingActionButton: FloatingActionButton(
          onPressed: () => _openForm(), child: const Icon(Icons.add)),
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
                    hintText: 'ابحث بالاسم/التصنيف/الباركود',
                    border:
                        OutlineInputBorder(borderRadius: BorderRadius.circular(14)))),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? const Center(child: Text('لا توجد أصناف'))
                    : ListView.builder(
                        itemCount: _products.length,
                        itemBuilder: (ctx, i) {
                          final p = _products[i];
                          final sub = [
                            if (p.category.isNotEmpty) 'تصنيف: ${p.category}',
                            if (p.barcode.isNotEmpty) 'باركود: ${p.barcode}',
                            'بيع: ${formatMoney(p.sellPrice, _settings.currency)}',
                            'شراء: ${formatMoney(p.buyPrice, _settings.currency)}',
                            'كمية: ${formatQty(p.qty)} ${p.unit}',
                          ].join('\n');
                          return ListTile(
                            title: Row(children: [
                              Expanded(child: Text(p.name)),
                              if (p.isLow)
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: Chip(
                                      label: const Text('نقص'),
                                      visualDensity: VisualDensity.compact,
                                      backgroundColor: Colors.orange.shade100),
                                ),
                            ]),
                            subtitle: Text(sub),
                            isThreeLine: true,
                            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(
                                  onPressed: () => _openForm(p),
                                  icon: const Icon(Icons.edit)),
                              IconButton(
                                  onPressed: () => _delete(p),
                                  icon: const Icon(Icons.delete, color: Colors.red)),
                            ]),
                          );
                        }),
          ),
        ],
      ),
    );
  }
}
