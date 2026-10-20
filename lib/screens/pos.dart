import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../cashier_login.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../forms/product_form.dart';
import '../models.dart';
import '../screens/barcode_scanner.dart';
import '../utils.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});
  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  bool _loading = true;
  String _search = '';
  List<Product> _products = [];
  final Map<int, CartLine> _cart = {};
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadProducts();
    _maybePromptCashier();
  }

  Future<void> _maybePromptCashier() async {
    if (CashierSession.current != null) return;
    final count = await LocalDB.getActiveCashierCount();
    if (count == 0 || !mounted) return;
    await promptCashierLogin(context);
  }

  Future<void> _loadSettings() async {
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() => _settings = s);
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    final products = await LocalDB.getProducts(search: _search);
    if (!mounted) return;
    setState(() {
      _products = products;
      _loading = false;
    });
  }

  double get _total => _cart.values.fold(0.0, (sum, line) => sum + line.total);
  int get _totalQty => _cart.values.fold(0.0, (sum, line) => sum + line.qty).toInt();
  int get _linesCount => _cart.length;

  void _addToCart(Product product) {
    if (product.id == null) return;
    final current = _cart[product.id]?.qty ?? 0;
    if (current + 1 > product.qty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('الكمية غير كافية')));
      return;
    }
    setState(() {
      _cart[product.id!] = CartLine(product: product, qty: current + 1);
    });
  }

  Future<void> _scanAdd() async {
    final code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const BarcodeScannerPage()));
    if (!mounted || code == null || code.isEmpty) return;
    final product = await LocalDB.getProductByBarcode(code);
    if (product != null) {
      _addToCart(product);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تمت إضافة: ${product.name}')));
      return;
    }
    final create = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('باركود غير مسجل'),
        content: Text('لم يتم العثور على صنف بالباركود:\n$code\n\nهل تريد إضافة صنف جديد بهذا الباركود؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('إضافة صنف')),
        ],
      ),
    );
    if (create == true) {
      final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => ProductFormSheet(initialBarcode: code),
      );
      if (saved == true) {
        await _loadProducts();
        final newProduct = await LocalDB.getProductByBarcode(code);
        if (newProduct != null && mounted) _addToCart(newProduct);
      }
    }
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    final cartCopy = _cart.map((k, v) => MapEntry(k, CartLine(product: v.product, qty: v.qty)));
    final lines = await showDialog<List<CartLine>>(
      context: context,
      builder: (_) => _CheckoutDialog(cart: cartCopy, currency: _settings.currency),
    );
    if (lines == null || lines.isEmpty) return;
    final saleId = await LocalDB.createSale(lines, cashierId: CashierSession.cashierId);
    final sale = await LocalDB.getSale(saleId);
    await LocalDB.logAudit(action: 'sale_created', entity: 'sale', entityId: saleId, details: 'إجمالي ${sale?.total.toStringAsFixed(2) ?? ''}');
    if (!mounted) return;
    setState(() => _cart.clear());
    await _loadProducts();
    if (sale != null) await _showReceipt(sale);
  }

  Future<void> _showReceipt(Sale sale) async {
    final text = _buildReceipt(sale);
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('الإيصال'),
        content: SizedBox(width: double.maxFinite, child: SingleChildScrollView(child: SelectableText(text, textDirection: TextDirection.rtl, style: const TextStyle(fontFamily: 'monospace')))),
        actions: [
          IconButton(tooltip: 'نسخ', onPressed: () async {
            await Clipboard.setData(ClipboardData(text: text));
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم نسخ الإيصال')));
          }, icon: const Icon(Icons.copy)),
          IconButton(tooltip: 'مشاركة', onPressed: () => Share.share(text), icon: const Icon(Icons.share)),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إغلاق')),
        ],
      ),
    );
  }

  String _buildReceipt(Sale sale) {
    final s = _settings;
    final b = StringBuffer();
    b.writeln(s.shopName);
    if (s.phone.isNotEmpty) b.writeln(s.phone);
    if (s.address.isNotEmpty) b.writeln(s.address);
    b.writeln(formatDateTime(sale.createdAt));
    b.writeln('--------------------------------');
    for (final item in sale.items) {
      b.writeln('${item.name}  ${formatQty(item.qty)} × ${formatMoney(item.price, s.currency)}');
      b.writeln('   = ${formatMoney(item.total, s.currency)}');
    }
    b.writeln('--------------------------------');
    b.writeln('الإجمالي: ${formatMoney(sale.total, s.currency)}');
    return b.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('نقطة البيع'),
        actions: [IconButton(onPressed: _scanAdd, icon: const Icon(Icons.qr_code_scanner), tooltip: 'مسح باركود')],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) { _search = v; _loadProducts(); },
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: 'ابحث بالاسم أو التصنيف أو الباركود...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
            ),
          ),
          Expanded(
            child: _loading ? const Center(child: CircularProgressIndicator()) : _products.isEmpty 
              ? const Center(child: Text('لا توجد أصناف مطابقة'))
              : ListView.builder(
                  itemCount: _products.length,
                  itemBuilder: (ctx, i) {
                    final p = _products[i];
                    final inCart = _cart[p.id]?.qty ?? 0;
                    return ListTile(
                      title: Text(p.name),
                      subtitle: Text('${formatMoney(p.sellPrice, _settings.currency)} | متوفر: ${formatQty(p.qty)} ${p.unit}'),
                      trailing: Badge(isLabelVisible: inCart > 0, label: Text(formatQty(inCart)), child: const Icon(Icons.add_shopping_cart)),
                      onTap: () => _addToCart(p),
                    );
                  },
                ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton.icon(
            onPressed: _cart.isEmpty ? null : _checkout,
            icon: const Icon(Icons.receipt_long),
            label: Text('إتمام البيع — ${formatMoney(_total, _settings.currency)} ($_totalQty قطعة / $_linesCount صنف)'),
          ),
        ),
      ),
    );
  }
}

class _CheckoutDialog extends StatefulWidget {
  final Map<int, CartLine> cart;
  final String currency;
  const _CheckoutDialog({required this.cart, required this.currency});
  @override
  State<_CheckoutDialog> createState() => _CheckoutDialogState();
}

class _CheckoutDialogState extends State<_CheckoutDialog> {
  late final Map<int, CartLine> _cart;
  @override
  void initState() {
    super.initState();
    _cart = widget.cart.map((k, v) => MapEntry(k, CartLine(product: v.product, qty: v.qty)));
  }
  double get _total => _cart.values.fold(0.0, (sum, line) => sum + line.total);
  void _change(int id, double delta) {
    final line = _cart[id];
    if (line == null) return;
    var q = line.qty + delta;
    if (q <= 0) { _cart.remove(id); } else { if (q > line.product.qty) q = line.product.qty; line.qty = q; }
    setState(() {});
  }
  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('تأكيد الفاتورة'),
      content: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
        child: _cart.isEmpty ? const Text('السلة فارغة') : ListView(shrinkWrap: true, children: _cart.values.map((line) {
          return ListTile(dense: true, title: Text(line.product.name), subtitle: Text('${formatMoney(line.product.sellPrice, widget.currency)} × ${formatQty(line.qty)}'), trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(onPressed: () => _change(line.product.id!, -1), icon: const Icon(Icons.remove)),
            Text(formatQty(line.qty)),
            IconButton(onPressed: () => _change(line.product.id!, 1), icon: const Icon(Icons.add)),
          ]));
        }).toList()),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('رجوع')),
        FilledButton(onPressed: _cart.isEmpty ? null : () => Navigator.pop(context, _cart.values.toList()), child: Text('تأكيد — ${formatMoney(_total, widget.currency)}')),
      ],
    );
  }
}
