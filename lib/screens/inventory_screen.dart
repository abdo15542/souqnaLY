import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<Product> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  Future<void> _edit([Product? p]) async {
    final nameC = TextEditingController(text: p?.name ?? '');
    final buyC = TextEditingController(text: p?.buyPrice.toString() ?? '');
    final sellC = TextEditingController(text: p?.sellPrice.toString() ?? '');
    final qtyC = TextEditingController(text: p?.qty.toString() ?? '');

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(p == null ? 'صنف جديد' : 'تعديل'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameC, decoration: const InputDecoration(labelText: 'الاسم')),
          TextField(controller: buyC, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'شراء')),
          TextField(controller: sellC, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'بيع')),
          TextField(controller: qtyC, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'كمية')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حفظ')),
        ],
      ),
    );

    if (ok == true && nameC.text.isNotEmpty) {
      await LocalDB.saveProduct(Product(
        id: p?.id,
        name: nameC.text.trim(),
        buyPrice: double.tryParse(buyC.text) ?? 0,
        sellPrice: double.tryParse(sellC.text) ?? 0,
        qty: double.tryParse(qtyC.text) ?? 0,
      ));
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('المخزون')),
      floatingActionButton: FloatingActionButton(onPressed: () => _edit(), child: const Icon(Icons.add)),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : _items.isEmpty
          ? const Center(child: Text('لا توجد أصناف'))
          : ListView.builder(
              itemCount: _items.length,
              itemBuilder: (ctx, i) {
                final p = _items[i];
                return ListTile(
                  title: Text(p.name),
                  subtitle: Text('بيع: ${p.sellPrice} | كمية: ${p.qty}'),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(onPressed: () => _edit(p), icon: const Icon(Icons.edit)),
                    IconButton(onPressed: () async {
                      await LocalDB.deleteProduct(p.id!);
                      _load();
                    }, icon: const Icon(Icons.delete, color: Colors.red)),
                  ]),
                );
              },
            ),
    );
  }
}
