import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../screens/barcode_scanner.dart';

class ProductFormSheet extends StatefulWidget {
  final Product? product;
  final String initialBarcode;
  const ProductFormSheet({super.key, this.product, this.initialBarcode = ''});
  @override
  State<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _category;
  late final TextEditingController _unit;
  late final TextEditingController _barcode;
  late final TextEditingController _buy;
  late final TextEditingController _sell;
  late final TextEditingController _qty;
  late final TextEditingController _minQty;
  late bool _isActive;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _name = TextEditingController(text: p?.name ?? '');
    _category = TextEditingController(text: p?.category ?? '');
    _unit = TextEditingController(text: p?.unit ?? 'حبة');
    _barcode = TextEditingController(text: p?.barcode ?? widget.initialBarcode);
    _buy = TextEditingController(text: p?.buyPrice.toString() ?? '');
    _sell = TextEditingController(text: p?.sellPrice.toString() ?? '');
    _qty = TextEditingController(text: p?.qty.toString() ?? '');
    _minQty = TextEditingController(text: p?.minQty.toString() ?? '');
    _isActive = p?.isActive ?? true;
  }

  @override
  void dispose() {
    _name.dispose(); _category.dispose(); _unit.dispose(); _barcode.dispose();
    _buy.dispose(); _sell.dispose(); _qty.dispose(); _minQty.dispose();
    super.dispose();
  }

  String? _validateRequired(String? v) => (v == null || v.trim().isEmpty) ? 'هذا الحقل مطلوب' : null;
  String? _validateNumber(String? v) {
    final n = double.tryParse(v?.trim() ?? '');
    if (n == null) return 'أدخل رقمًا صالحًا';
    if (n < 0) return 'لا يجوز أن يكون سالبًا';
    return null;
  }

  Future<void> _scanBarcode() async {
    final code = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const BarcodeScannerPage()));
    if (code != null && code.isNotEmpty) setState(() => _barcode.text = code);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final product = Product(
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
    );
    await LocalDB.saveProduct(product);
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
              Text(widget.product == null ? 'صنف جديد' : 'تعديل صنف', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'اسم الصنف'), validator: _validateRequired),
              const SizedBox(height: 12),
              TextFormField(controller: _category, decoration: const InputDecoration(labelText: 'التصنيف (اختياري)')),
              const SizedBox(height: 12),
              TextFormField(controller: _unit, decoration: const InputDecoration(labelText: 'الوحدة')),
              const SizedBox(height: 12),
              TextFormField(controller: _barcode, decoration: InputDecoration(labelText: 'الباركود (اختياري)', suffixIcon: IconButton(onPressed: _scanBarcode, icon: const Icon(Icons.qr_code_scanner), tooltip: 'مسح الباركود')),),
              const SizedBox(height: 12),
              TextFormField(controller: _buy, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'سعر الشراء'), validator: _validateNumber),
              const SizedBox(height: 12),
              TextFormField(controller: _sell, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'سعر البيع'), validator: _validateNumber),
              const SizedBox(height: 12),
              TextFormField(controller: _qty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'الكمية الحالية'), validator: _validateNumber),
              const SizedBox(height: 12),
              TextFormField(controller: _minQty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'الحد الأدنى للتنبيه'), validator: _validateNumber),
              const SizedBox(height: 8),
              SwitchListTile(title: const Text('الصنف نشط'), value: _isActive, onChanged: (v) => setState(() => _isActive = v)),
              const SizedBox(height: 16),
              FilledButton(onPressed: _save, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}
