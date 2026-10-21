import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameC = TextEditingController();
  final _currC = TextEditingController();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final s = await LocalDB.getSettings();
    if (!mounted) return;
    setState(() {
      _nameC.text = s.shopName;
      _currC.text = s.currency;
      _loading = false;
    });
  }

  Future<void> _save() async {
    await LocalDB.saveSettings(AppSettings(shopName: _nameC.text.trim(), currency: _currC.text.trim()));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم الحفظ')));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _nameC, decoration: const InputDecoration(labelText: 'اسم المحل')),
          const SizedBox(height: 12),
          TextField(controller: _currC, decoration: const InputDecoration(labelText: 'رمز العملة')),
          const SizedBox(height: 16),
          FilledButton(onPressed: _save, child: const Text('حفظ')),
        ],
      ),
    );
  }
}
