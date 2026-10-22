import 'dart:math';

import 'package:flutter/material.dart';

import '../admin_db.dart';
import '../admin_models.dart';

class ShopFormSheet extends StatefulWidget {
  final Shop? existing;
  const ShopFormSheet({super.key, this.existing});

  @override
  State<ShopFormSheet> createState() => _ShopFormSheetState();
}

class _ShopFormSheetState extends State<ShopFormSheet> {
  final GlobalKey<FormState> _k = GlobalKey<FormState>();

  late final TextEditingController _name =
      TextEditingController(text: widget.existing?.name ?? '');
  late final TextEditingController _owner =
      TextEditingController(text: widget.existing?.ownerName ?? '');
  late final TextEditingController _phone =
      TextEditingController(text: widget.existing?.phone ?? '');
  late final TextEditingController _plan =
      TextEditingController(text: widget.existing?.plan ?? 'trial');

  bool get _isNew => widget.existing == null;

  @override
  void dispose() {
    _name.dispose();
    _owner.dispose();
    _phone.dispose();
    _plan.dispose();
    super.dispose();
  }

  String _genId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final r = Random.secure();
    String t(int n) =>
        List<String>.generate(n, (_) => chars[r.nextInt(chars.length)]).join();
    return 'SHOP-${t(4)}-${t(4)}';
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;

    final id = widget.existing?.id ?? _genId();
    final shop = Shop(
      id: id,
      name: _name.text.trim(),
      ownerName: _owner.text.trim(),
      phone: _phone.text.trim(),
      plan: _plan.text.trim().isEmpty ? 'trial' : _plan.text.trim(),
      status: widget.existing?.status ?? 'active',
      createdAt: widget.existing?.createdAt ?? '',
      updatedAt: widget.existing?.updatedAt ?? '',
    );

    await AdminDB.saveShop(shop);
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                _isNew ? 'محل جديد' : 'تعديل محل',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              if (!_isNew)
                Text('معرّف المحل: ${widget.existing!.id}',
                    style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(
                    labelText: 'اسم المحل', border: OutlineInputBorder()),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'مطلوب' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _owner,
                decoration: const InputDecoration(
                    labelText: 'اسم المالك', border: OutlineInputBorder()),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'مطلوب' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                    labelText: 'الهاتف (اختياري)',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _plan,
                decoration: const InputDecoration(
                    labelText: 'الخطة',
                    helperText: 'trial / basic / pro / enterprise',
                    border: OutlineInputBorder()),
              ),
              const SizedBox(height: 18),
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
