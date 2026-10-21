import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});
  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  bool _loading = true;
  String _search = '';
  List<Supplier> _list = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getSuppliers(search: _search);
    if (!mounted) return;
    setState(() {
      _list = l;
      _loading = false;
    });
  }

  Future<void> _openForm([Supplier? s]) async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _SupplierForm(supplier: s));
    if (saved == true) _load();
  }

  Future<void> _delete(Supplier s) async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('حذف مورد'),
              content: Text('حذف "${s.name}"؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('حذف')),
              ],
            ));
    if (ok == true && s.id != null) {
      await LocalDB.deleteSupplier(s.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('الموردون')),
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
                    hintText: 'ابحث بالاسم أو الهاتف',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14)))),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _list.isEmpty
                    ? const Center(child: Text('لا يوجد موردون'))
                    : ListView.builder(
                        itemCount: _list.length,
                        itemBuilder: (ctx, i) {
                          final s = _list[i];
                          final sub = [
                            if (s.phone.isNotEmpty) 'هاتف: ${s.phone}',
                            if (s.address.isNotEmpty) 'عنوان: ${s.address}',
                            if (s.note.isNotEmpty) 'ملاحظة: ${s.note}',
                            'أُنشئ: ${formatDate(s.createdAt)}',
                          ].join('\n');
                          return ListTile(
                            leading: const Icon(Icons.local_shipping),
                            title: Text(s.name),
                            subtitle: Text(sub),
                            isThreeLine: true,
                            trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                      onPressed: () => _openForm(s),
                                      icon: const Icon(Icons.edit)),
                                  IconButton(
                                      onPressed: () => _delete(s),
                                      icon: const Icon(Icons.delete,
                                          color: Colors.red)),
                                ]),
                          );
                        }),
          ),
        ],
      ),
    );
  }
}

class _SupplierForm extends StatefulWidget {
  final Supplier? supplier;
  const _SupplierForm({this.supplier});
  @override
  State<_SupplierForm> createState() => _SupplierFormState();
}

class _SupplierFormState extends State<_SupplierForm> {
  final _k = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.supplier?.name ?? '');
  late final _phone = TextEditingController(text: widget.supplier?.phone ?? '');
  late final _address =
      TextEditingController(text: widget.supplier?.address ?? '');
  late final _note = TextEditingController(text: widget.supplier?.note ?? '');
  late bool _active = widget.supplier?.isActive ?? true;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;
    await LocalDB.saveSupplier(Supplier(
      id: widget.supplier?.id,
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      address: _address.text.trim(),
      note: _note.text.trim(),
      isActive: _active,
      createdAt: widget.supplier?.createdAt ?? '',
      updatedAt: widget.supplier?.updatedAt ?? '',
    ));
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.supplier == null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(isNew ? 'مورد جديد' : 'تعديل مورد',
                  style:
                      const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'اسم المورد'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'الهاتف')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _address,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'العنوان')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _note,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'ملاحظة')),
              const SizedBox(height: 8),
              SwitchListTile(
                  title: const Text('نشط'),
                  value: _active,
                  onChanged: (v) => setState(() => _active = v)),
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
