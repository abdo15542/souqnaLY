import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import 'cashiers.dart';

class CashierLoginPage extends StatefulWidget {
  const CashierLoginPage({super.key});
  @override
  State<CashierLoginPage> createState() => _CashierLoginPageState();
}

class _CashierLoginPageState extends State<CashierLoginPage> {
  bool _loading = true;
  List<Cashier> _cashiers = [];
  Cashier? _selected;
  final _pin = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getActiveCashiers();
    if (!mounted) return;
    setState(() {
      _cashiers = l;
      _loading = false;
    });
  }

  Future<void> _login() async {
    if (_selected == null) return;
    final c = await LocalDB.verifyCashier(_selected!.id!, _pin.text.trim());
    if (!mounted) return;
    if (c == null) {
      setState(() => _error = 'PIN غير صحيح');
      return;
    }
    CashierSession.set(c);
    Navigator.pop(context, c);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('دخول الكاشير'),
        actions: [
          IconButton(
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const CashiersScreen()));
                _load();
              },
              icon: const Icon(Icons.manage_accounts))
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _cashiers.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.person_off, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text('لا يوجد كاشيرين نشطين.', textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(
                            onPressed: () => Navigator.pop(context, null),
                            child: const Text('متابعة بدون كاشير')),
                        const SizedBox(height: 8),
                        OutlinedButton(
                            onPressed: () async {
                              await Navigator.push(context,
                                  MaterialPageRoute(builder: (_) => const CashiersScreen()));
                              _load();
                            },
                            child: const Text('إضافة كاشير')),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    const Text('اختر الكاشير:',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ..._cashiers.map((c) => RadioListTile<int>(
                        value: c.id!,
                        groupValue: _selected?.id,
                        title: Text(c.name),
                        onChanged: (v) => setState(() {
                              _selected = c;
                              _error = null;
                              _pin.clear();
                            }))),
                    const SizedBox(height: 16),
                    TextField(
                        controller: _pin,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                            labelText: 'رمز PIN',
                            errorText: _error,
                            border:
                                OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                        onSubmitted: (_) => _login()),
                    const SizedBox(height: 16),
                    FilledButton(
                        onPressed: _selected == null ? null : _login,
                        child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 14),
                            child: Text('دخول'))),
                    const SizedBox(height: 8),
                    TextButton(
                        onPressed: () => Navigator.pop(context, null),
                        child: const Text('متابعة بدون كاشير')),
                  ],
                ),
    );
  }
}

Future<Cashier?> promptCashierLogin(BuildContext context) async {
  final c = await LocalDB.getActiveCashierCount();
  if (c == 0) return null;
  return Navigator.push<Cashier>(
      context, MaterialPageRoute(builder: (_) => const CashierLoginPage()));
}
