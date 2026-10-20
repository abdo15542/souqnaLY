import 'package:flutter/material.dart';
import '../backup.dart';
import '../db.dart';
import '../models.dart';
import '../services/export_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = true;
  bool _busy = false;
  final _formKey = GlobalKey<FormState>();
  final _shopName = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _currency = TextEditingController();
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _shopName.dispose(); _phone.dispose(); _address.dispose(); _currency.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _settings = s;
      _shopName.text = s.shopName;
      _phone.text = s.phone;
      _address.text = s.address;
      _currency.text = s.currency;
      _loading = false;
    });
  }

  void _showMessage(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final s = AppSettings(shopName: _shopName.text.trim(), phone: _phone.text.trim(), address: _address.text.trim(), currency: _currency.text.trim().isEmpty ? 'د.ل' : _currency.text.trim());
    await LocalDB.saveSettings(s);
    if (!mounted) return;
    setState(() => _settings = s);
    _showMessage('تم حفظ الإعدادات');
  }

  Future<void> _shareBackup() async {
    setState(() => _busy = true);
    try {
      await BackupService.shareBackup();
      _showMessage('تم إنشاء النسخة الاحتياطية ومشاركتها');
    } catch (e) {
      _showMessage('فشل إنشاء النسخة: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('استرجاع نسخة احتياطية'),
        content: const Text('تحذير: سيتم استبدال جميع البيانات الحالية ببيانات الملف المختار. هل تريد المتابعة؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('متابعة')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      final restored = await BackupService.pickAndRestore();
      if (restored) {
        await _load();
        _showMessage('تم الاسترجاع بنجاح');
      } else {
        _showMessage('تم إلغاء الاختيار');
      }
    } catch (e) {
      _showMessage('فشل الاسترجاع: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exportProducts() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportProductsCsv();
      _showMessage('تم تصدير المخزون بصيغة CSV');
    } catch (e) {
      _showMessage('فشل التصدير: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exportSales() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportSalesCsv();
      _showMessage('تم تصدير المبيعات بصيغة CSV');
    } catch (e) {
      _showMessage('فشل التصدير: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exportDebts() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportDebtsCsv();
      _showMessage('تم تصدير الديون بصيغة CSV');
    } catch (e) {
      _showMessage('فشل التصدير: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Form(key: _formKey, child: Column(children: [
            TextFormField(controller: _shopName, decoration: const InputDecoration(labelText: 'اسم المحل'), validator: (v) => (v == null || v.trim().isEmpty) ? 'الاسم مطلوب' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'هاتف المحل')),
            const SizedBox(height: 12),
            TextFormField(controller: _address, maxLines: 2, decoration: const InputDecoration(labelText: 'عنوان المحل')),
            const SizedBox(height: 12),
            TextFormField(controller: _currency, decoration: const InputDecoration(labelText: 'رمز العملة')),
            const SizedBox(height: 16),
            FilledButton(onPressed: _busy ? null : _save, child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('حفظ الإعدادات'))),
          ])),
          const SizedBox(height: 24),
          const Text('التصدير', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: _busy ? null : _exportProducts, icon: const Icon(Icons.table_view), label: const Text('تصدير المخزون CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: _busy ? null : _exportSales, icon: const Icon(Icons.receipt_long), label: const Text('تصدير المبيعات CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: _busy ? null : _exportDebts, icon: const Icon(Icons.book), label: const Text('تصدير الديون CSV')),
          const SizedBox(height: 24),
          const Text('النسخ الاحتياطي', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: _busy ? null : _shareBackup, icon: const Icon(Icons.backup), label: const Text('إنشاء ومشاركة نسخة احتياطية')),
          const SizedBox(height: 12),
          OutlinedButton.icon(onPressed: _busy ? null : _restore, icon: const Icon(Icons.restore, color: Colors.red), label: const Text('استرجاع من ملف JSON', style: TextStyle(color: Colors.red))),
          const SizedBox(height: 24),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('سوقنا — الإصدار 1.5', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('نظام إدارة محلات صغيرة، محلي أولاً.'),
            const SizedBox(height: 8),
            const Text('يعمل بدون إنترنت، مع قاعدة بيانات SQLite محلية.'),
            const SizedBox(height: 8),
            const Text('يدعم الباركود، تصدير CSV، والتقارير البيانية.'),
          ]))),
        ],
      ),
    );
  }
}
