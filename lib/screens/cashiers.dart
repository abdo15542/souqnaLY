import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class CashiersScreen extends StatefulWidget {
  const CashiersScreen({super.key});
  @override
  State<CashiersScreen> createState() => _CashiersScreenState();
}

class _CashiersScreenState extends State<CashiersScreen> {
  bool _loading = true;
  List<Cashier> _list = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await LocalDB.getCashiers();
    if (!mounted) return;
    setState(() {
      _list = list;
      _loading = false;
    });
  }

  Future<void> _openForm([Cashier? c]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _CashierForm(cashier: c),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Cashier c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف كاشير'),
        content: Text('حذف "${c.name}" نهائياً؟ السجلات السابقة ستحتفظ باسمه.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حذف')),
        ],
      ),
    );
    if (ok == true && c.id != null) {
      await LocalDB.deleteCashier(c.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('إدارة الكاشيرين')),
      floatingActionButton: FloatingActionButton(onPressed: () => _openForm(), child: const Icon(Icons.person_add)),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _list.isEmpty 
        ? const Center(child: Text('لا يوجد كاشيرين'))
        : ListView.builder(itemCount: _list.length, itemBuilder: (ctx, i) {
            final c = _list[i];
            return ListTile(
              leading: Icon(c.isActive ? Icons.person : Icons.person_off, color: c.isActive ? Colors.green : Colors.grey),
              title: Text(c.name),
              subtitle: Text('أُنشئ: ${formatDate(c.createdAt)}'),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                IconButton(onPressed: () => _openForm(c), icon: const Icon(Icons.edit)),
                IconButton(onPressed: () => _delete(c), icon: const Icon(Icons.delete, color: Colors.red)),
              ]),
            );
          }),
    );
  }
}

class _CashierForm extends StatefulWidget {
  final Cashier? cashier;
  const _CashierForm({this.cashier});
  @override
  State<_CashierForm> createState() => _CashierFormState();
}

class _CashierFormState extends State<_CashierForm> {
  final _key = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.cashier?.name ?? '');
  final _pin = TextEditingController();
  late bool _active = widget.cashier?.isActive ?? true;

  @override
  void dispose() {
    _name.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_key.currentState!.validate()) return;
    final isNew = widget.cashier == null;
    final pin = _pin.text.trim();
    if (isNew) {
      if (pin.length < 4) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('PIN يجب أن يكون 4 أرقام على الأقل')));
        return;
      }
      await LocalDB.addCashier(_name.text, pin);
    } else {
      await LocalDB.updateCashier(widget.cashier!.id!, name: _name.text, isActive: _active, newPin: pin.isEmpty ? null : pin);
    }
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.cashier == null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _key,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(isNew ? 'كاشير جديد' : 'تعديل كاشير', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'اسم الكاشير'), validator: (v) => (v == null || v.trim().isEmpty) ? 'الاسم مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(controller: _pin, keyboardType: TextInputType.number, obscureText: true, decoration: InputDecoration(labelText: isNew ? 'رمز PIN (4 أرقام+)' : 'PIN جديد (اتركه فارغااً لعدم التغيير)')),
              if (!isNew) ...[
                const SizedBox(height: 8),
                SwitchListTile(title: const Text('كاشير نشط'), value: _active, onChanged: (v) => setState(() => _active = v)),
              ],
              const SizedBox(height: 16),
              FilledButton(onPressed: _save, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}
