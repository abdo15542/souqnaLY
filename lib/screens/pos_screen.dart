import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});
  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  List<Product> _products = [];
  final Map<int, CartLine> _cart = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    final prods = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _products = prods;
      _loading = false;
    });
  }

  void _add(Product p) {
    if (p.id == null) return;
    setState(() {
      final current = _cart[p.id]?.qty ?? 0;
      if (current + 1 <= p.qty) {
        _cart[p.id!] = CartLine(product: p, qty: current + 1);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('الكمية غير كافية')));
      }
    });
  }

  double get _total => _cart.values.fold(0.0, (s, l) => s + l.total);

  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    await LocalDB.createSale(_cart.values.toList());
    setState(() => _cart.clear());
    await _loadProducts();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم حفظ الفاتورة')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('نقطة البيع')),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              Expanded(
                child: ListView.builder(
                  itemCount: _products.length,
                  itemBuilder: (ctx, i) {
                    final p = _products[i];
                    return ListTile(
                      title: Text(p.name),
                      subtitle: Text('${formatMoney(p.sellPrice, 'د.ل')} | متوفر: ${p.qty.toInt()}'),
                      trailing: Badge(
                        isLabelVisible: (_cart[p.id]?.qty ?? 0) > 0,
                        label: Text('${_cart[p.id]?.qty.toInt() ?? 0}'),
                        child: IconButton(onPressed: () => _add(p), icon: const Icon(Icons.add_shopping_cart)),
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(blurRadius: 10, offset: Offset(0, -2))]),
                child: Row(
                  children: [
                    Expanded(child: Text('الإجمالي: ${formatMoney(_total, 'د.ل')}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                    ElevatedButton.icon(
                      onPressed: _cart.isEmpty ? null : _checkout,
                      icon: const Icon(Icons.check),
                      label: const Text('إتمام'),
                    ),
                  ],
                ),
              ),
            ],
          ),
    );
  }
}
