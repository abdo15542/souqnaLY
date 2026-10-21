import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../cashier_login.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../forms/product_form.dart';
import '../models.dart';
import 'barcode_scanner.dart';
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
    _maybePrompt();
  }

  Future<void> _maybePrompt() async {
    if (CashierSession.current != null) return;
    final c = await LocalDB.getActiveCashierCount();
    if (c == 0 || !mounted) return;
    await promptCashierLogin(context);
  }

  Future<void> _loadSettings() async {
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() => _settings = s);
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    final p = await LocalDB.getProducts(search: _search);
    if (!mounted) return;
    setState(() {
      _products = p;
      _loading = false;
    });
  }

  double get _total => _cart.values.fold(0.0, (s, l) => s + l.total);
  int get _totalQty => _cart.values.fold(0.0, (s, l) => s + l.qty).toInt();

  void _add(Product p) {
    if (p.id == null) return;
    final cur = _cart[p.id]?.qty ?? 0;
    if (cur + 1 > p.qty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('الكمية غير كافية')));
      return;
    }
    setState(() => _cart[p.id!] = CartLine(product: p, qty: cur + 1));
  }

  Future<void> _scanAdd() async {
    final code = await Navigator.push<String>(
        context, MaterialPageRoute(builder: (_) => const BarcodeScannerPage()));
    if (!mounted || code == null || code.isEmpty) return;
    final p = await LocalDB.getProductByBarcode(code);
    if (p != null) {
      _add(p);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('أُضيف: ${p.name}')));
      }
      return;
    }
    final create = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('باركود غير مسجل'),
              content: Text('هل تريد إضافة صنف بالباركود:\n$code؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('إضافة')),
              ],
            ));
    if (create == true) {
      final saved = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          builder: (_) => ProductFormSheet(initialBarcode: code));
      if (saved == true) {
        await _loadProducts();
        final np = await LocalDB.getProductByBarcode(code);
        if (np != null && mounted) _add(np);
      }
    }
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    final cc = _cart.map((k, v) => MapEntry(k, CartLine(product: v.product, qty: v.qty)));
    final lines = await showDialog<List<CartLine>>(
        context: context,
        builder: (_) => _CheckoutDialog(cart: cc, currency: _settings.currency));
    if (lines == null || lines.isEmpty) return;
    final saleId = await LocalDB.createSale(lines, cashierId: CashierSession.cashierId);
    final sale = await LocalDB.getSale(saleId);
    await LocalDB.logAudit(
        action: 'sale_created',
        entity: 'sale',
        entityId: saleId,
        details: 'إجمالي ${sale?.total.toStringAsFixed(2) ?? ''}');
    if (!mounted) return;
    setState(() => _cart.clear());
    await _loadProducts();
    if (sale != null) await _showReceipt(sale);
  }

  Future<void> _showReceipt(Sale sale) async {
    final text = _receipt(sale);
    if (!mounted) return;
    await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('الإيصال'),
              content: SizedBox(
                  width: double.maxFinite,
                  child: SingleChildScrollView(
                      child: SelectableText(text,
                          textDirection: TextDirection.rtl))),
              actions: [
                IconButton(
                    tooltip: 'نسخ',
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: text));
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('تم النسخ')));
                      }
                    },
                    icon: const Icon(Icons.copy)),
                IconButton(
                    tooltip: 'مشاركة',
                    onPressed: () => Share.share(text),
                    icon: const Icon(Icons.share)),
                TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('إغلاق')),
              ],
            ));
  }

  String _receipt(Sale sale) {
    final s = _settings;
    final b = StringBuffer();
    b.writeln(s.shopName);
    if (s.phone.isNotEmpty) b.writeln(s.phone);
    if (s.address.isNotEmpty) b.writeln(s.address);
    b.writeln(formatDateTime(sale.createdAt));
    b.writeln('--------------------------------');
    for (final it in sale.items) {
      b.writeln(
          '${it.name}  ${formatQty(it.qty)} × ${formatMoney(it.price, s.currency)}');
      b.writeln('   = ${formatMoney(it.total, s.currency)}');
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
        actions: [
          IconButton(
              onPressed: _scanAdd,
              icon: const Icon(Icons.qr_code_scanner),
              tooltip: 'مسح باركود')
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
                onChanged: (v) {
                  _search = v;
                  _loadProducts();
                },
                decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'ابحث...',
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
                          final inCart = _cart[p.id]?.qty ?? 0;
                          return ListTile(
                            title: Text(p.name),
                            subtitle: Text(
                                '${formatMoney(p.sellPrice, _settings.currency)} | متوفر: ${formatQty(p.qty)} ${p.unit}'),
                            trailing: Badge(
                                isLabelVisible: inCart > 0,
                                label: Text(formatQty(inCart)),
                                child: const Icon(Icons.add_shopping_cart)),
                            onTap: () => _add(p),
                          );
                        }),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton.icon(
              onPressed: _cart.isEmpty ? null : _checkout,
              icon: const Icon(Icons.receipt_long),
              label: Text(
                  'إتمام — ${formatMoney(_total, _settings.currency)} ($_totalQty قطعة)')),
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

  double get _total => _cart.values.fold(0.0, (s, l) => s + l.total);

  void _change(int id, double d) {
    final l = _cart[id];
    if (l == null) return;
    var q = l.qty + d;
    if (q <= 0) {
      _cart.remove(id);
    } else {
      if (q > l.product.qty) q = l.product.qty;
      l.qty = q;
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('تأكيد الفاتورة'),
      content: ConstrainedBox(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
        child: _cart.isEmpty
            ? const Text('فارغة')
            : ListView(
                shrinkWrap: true,
                children: _cart.values
                    .map((l) => ListTile(
                        dense: true,
                        title: Text(l.product.name),
                        subtitle: Text(
                            '${formatMoney(l.product.sellPrice, widget.currency)} × ${formatQty(l.qty)}'),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(
                              onPressed: () => _change(l.product.id!, -1),
                              icon: const Icon(Icons.remove)),
                          Text(formatQty(l.qty)),
                          IconButton(
                              onPressed: () => _change(l.product.id!, 1),
                              icon: const Icon(Icons.add)),
                        ])))
                    .toList()),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context), child: const Text('رجوع')),
        FilledButton(
            onPressed: _cart.isEmpty
                ? null
                : () => Navigator.pop(context, _cart.values.toList()),
            child: Text('تأكيد — ${formatMoney(_total, widget.currency)}')),
      ],
    );
  }
}
