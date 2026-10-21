import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../screens/barcode_scanner.dart';
import '../utils.dart';

class ProductFormSheet extends StatefulWidget {
  final Product? product;
  final String initialBarcode;
  const ProductFormSheet({super.key, this.product, this.initialBarcode = ''});
  @override
  State<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.product?.name ?? '');
  late final _category = TextEditingController(text: widget.product?.category ?? '');
  late final _unit = TextEditingController(text: widget.product?.unit ?? 'حبة');
  late final _barcode =
      TextEditingController(text: widget.product?.barcode ?? widget.initialBarcode);
  late final _buy = TextEditingController(text: widget.product?.buyPrice.toString() ?? '');
  late final _sell = TextEditingController(text: widget.product?.sellPrice.toString() ?? '');
  late final _qty = TextEditingController(text: widget.product?.qty.toString() ?? '');
  late final _minQty = TextEditingController(text: widget.product?.minQty.toString() ?? '');
  late bool _isActive = widget.product?.isActive ?? true;

  @override
  void dispose() {
    for (final c in [_name, _category, _unit, _barcode, _buy, _sell, _qty, _minQty]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _req(String? v) => (v == null || v.trim().isEmpty) ? 'مطلوب' : null;
  String? _num(String? v) {
    final n = double.tryParse(v?.trim() ?? '');
    if (n == null) return 'رقم غير صالح';
    if (n < 0) return 'لا يجوز سالب';
    return null;
  }

  Future<void> _scan() async {
    final code = await Navigator.push<String>(
        context, MaterialPageRoute(builder: (_) => const BarcodeScannerPage()));
    if (code != null && code.isNotEmpty) setState(() => _barcode.text = code);
  }

  Future<void> _showPriceHistory() async {
    if (widget.product?.id == null) return;
    final history = await LocalDB.getPriceHistory(widget.product!.id!);
    if (!mounted) return;
    await showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
            child: history.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('لا يوجد سجل أسعار')))
                : ListView(children: [
                    const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('سجل أسعار الشراء',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                    ...history.map((h) => ListTile(
                        dense: true,
                        title: Text('${formatMoney(h.oldPrice, '')} ← ${formatMoney(h.newPrice, '')}'),
                        subtitle: Text(formatDateTime(h.createdAt) +
                            (h.poId != null ? ' — أمر #${h.poId}' : '')),
                        trailing: Text(h.diff > 0 ? '+${h.diff.toStringAsFixed(2)}' : h.diff.toStringAsFixed(2),
                            style: TextStyle(
                                color: h.diff > 0 ? Colors.red : Colors.green,
                                fontWeight: FontWeight.bold))))
                  ])));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    await LocalDB.saveProduct(Product(
      id: widget.product?.id,
      name: _name.text.trim(),
      category: _category.text.trim(),
      unit: _unit.text.trim().isEmpty ? 'حبة' : _unit.text.trim(),
      barcode: _barcode.text.trim(),
      buyPrice: double.tryParse(_buy.text.trim()) ?? 0,
      sellPrice: double.tryParse(_sell.text.trim()) ?? 0,
      qty: double.tryParse(_qty.text.trim()) ?? 0,
      minQty: double.tryParse(_minQty.text.trim()) ?? 0,
      isActive: _isActive,
      createdAt: widget.product?.createdAt ?? '',
      updatedAt: widget.product?.updatedAt ?? '',
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
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(widget.product == null ? 'صنف جديد' : 'تعديل صنف',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'اسم الصنف'),
                  validator: _req),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _category,
                  decoration: const InputDecoration(labelText: 'التصنيف')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _unit,
                  decoration: const InputDecoration(labelText: 'الوحدة')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _barcode,
                  decoration: InputDecoration(
                      labelText: 'الباركود',
                      suffixIcon: IconButton(
                          onPressed: _scan, icon: const Icon(Icons.qr_code_scanner)))),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _buy,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'سعر الشراء'),
                  validator: _num),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _sell,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'سعر البيع'),
                  validator: _num),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _qty,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'الكمية'),
                  validator: _num),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _minQty,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'الحد الأدنى'),
                  validator: _num),
              const SizedBox(height: 8),
              SwitchListTile(
                  title: const Text('نشط'),
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v)),
              if (widget.product?.id != null) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                    onPressed: _showPriceHistory,
                    icon: const Icon(Icons.timeline),
                    label: const Text('سجل أسعار الشراء')),
              ],
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
