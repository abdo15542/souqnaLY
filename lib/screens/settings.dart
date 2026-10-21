import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/backup_service.dart';
import '../services/export_service.dart';
import '../theme_state.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loading = true, _busy = false;
  final _fk = GlobalKey<FormState>();
  final _sn = TextEditingController();
  final _ph = TextEditingController();
  final _ad = TextEditingController();
  final _cu = TextEditingController();
  AppSettings _settings = AppSettings.defaults();
  String _theme = 'system';
  bool _lockOn = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _sn.dispose();
    _ph.dispose();
    _ad.dispose();
    _cu.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await LocalDB.getAppSettings();
    final tm = await LocalDB.getThemeMode();
    final lo = await LocalDB.isLockEnabled();
    if (!mounted) return;
    setState(() {
      _settings = s;
      _sn.text = s.shopName;
      _ph.text = s.phone;
      _ad.text = s.address;
      _cu.text = s.currency;
      _theme = tm;
      _lockOn = lo;
      _loading = false;
    });
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _save() async {
    if (!_fk.currentState!.validate()) return;
    final cur = _cu.text.trim().isEmpty ? 'د.ل' : _cu.text.trim();
    await LocalDB.saveSettings(AppSettings(
        shopName: _sn.text.trim(),
        phone: _ph.text.trim(),
        address: _ad.text.trim(),
        currency: cur));
    if (!mounted) return;
    setState(() => _settings = AppSettings(
        shopName: _sn.text.trim(),
        phone: _ph.text.trim(),
        address: _ad.text.trim(),
        currency: cur));
    _msg('تم الحفظ');
  }

  Future<void> _setTheme(String mode) async {
    await LocalDB.saveThemeMode(mode);
    appTheme.value = mode == 'light'
        ? ThemeMode.light
        : mode == 'dark'
            ? ThemeMode.dark
            : ThemeMode.system;
    setState(() => _theme = mode);
  }

  Future<void> _toggleLock(bool v) async {
    if (v) {
      final has = await LocalDB.hasLockPin();
      if (!has) {
        final ok = await _setLockPinDialog();
        if (ok != true) return;
      }
      await LocalDB.setLockEnabled(true);
      setState(() => _lockOn = true);
      _msg('تم تفعيل قفل التطبيق');
    } else {
      await LocalDB.setLockEnabled(false);
      setState(() => _lockOn = false);
      _msg('تم تعطيل القفل');
    }
  }

  Future<bool?> _setLockPinDialog() async {
    final p1 = TextEditingController();
    final p2 = TextEditingController();
    final fk = GlobalKey<FormState>();
    String captured = '';
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('تعيين رمز القفل'),
              content: Form(
                  key: fk,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextFormField(
                        controller: p1,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'الرمز (4+)', border: OutlineInputBorder()),
                        validator: (v) {
                          if (v == null || v.trim().length < 4) return '4 أرقام على الأقل';
                          return null;
                        }),
                    const SizedBox(height: 12),
                    TextFormField(
                        controller: p2,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'تأكيد الرمز', border: OutlineInputBorder()),
                        validator: (v) {
                          if (v != p1.text) return 'غير مطابق';
                          return null;
                        }),
                  ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) {
                        captured = p1.text.trim();
                        Navigator.pop(ctx, true);
                      }
                    },
                    child: const Text('حفظ')),
              ],
            ));
    p1.dispose();
    p2.dispose();
    if (ok == true && captured.isNotEmpty) {
      await LocalDB.setLockPin(captured);
      return true;
    }
    return ok;
  }

  Future<void> _changeLockPin() async {
    final p1 = TextEditingController();
    final p2 = TextEditingController();
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('تغيير رمز القفل'),
              content: Form(
                  key: fk,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextFormField(
                        controller: p1,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'الرمز الجديد (4+)', border: OutlineInputBorder()),
                        validator: (v) {
                          if (v == null || v.trim().length < 4) return '4 أرقام على الأقل';
                          return null;
                        }),
                    const SizedBox(height: 12),
                    TextFormField(
                        controller: p2,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'تأكيد الرمز', border: OutlineInputBorder()),
                        validator: (v) {
                          if (v != p1.text) return 'غير مطابق';
                          return null;
                        }),
                  ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) Navigator.pop(ctx, true);
                    },
                    child: const Text('حفظ')),
              ],
            ));
    final pin = p1.text.trim();
    p1.dispose();
    p2.dispose();
    if (ok == true && pin.isNotEmpty) {
      await LocalDB.setLockPin(pin);
      _msg('تم تحديث الرمز');
    }
  }

  Future<void> _backup() async {
    setState(() => _busy = true);
    try {
      await BackupService.shareBackup();
      _msg('تم إنشاء النسخة');
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('استرجاع'),
              content: const Text('سيتم استبدال جميع البيانات. متابعة؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('متابعة')),
              ],
            ));
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      final r = await BackupService.pickAndRestore();
      if (r) {
        await _load();
        _msg('تم الاسترجاع');
      } else {
        _msg('تم الإلغاء');
      }
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exp(Future<void> Function() f, String name) async {
    setState(() => _busy = true);
    try {
      await f();
      _msg('تم تصدير $name');
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Form(
              key: _fk,
              child: Column(children: [
                TextFormField(
                    controller: _sn,
                    decoration: const InputDecoration(labelText: 'اسم المحل'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'مطلوب' : null),
                const SizedBox(height: 12),
                TextFormField(
                    controller: _ph,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'الهاتف')),
                const SizedBox(height: 12),
                TextFormField(
                    controller: _ad,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'العنوان')),
                const SizedBox(height: 12),
                TextFormField(
                    controller: _cu,
                    decoration: const InputDecoration(labelText: 'رمز العملة')),
                const SizedBox(height: 16),
                FilledButton(
                    onPressed: _busy ? null : _save,
                    child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text('حفظ'))),
              ])),
          const SizedBox(height: 24),
          const Text('المظهر',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'light', label: Text('فاتح'), icon: Icon(Icons.light_mode)),
                ButtonSegment(value: 'dark', label: Text('داكن'), icon: Icon(Icons.dark_mode)),
                ButtonSegment(value: 'system', label: Text('النظام'), icon: Icon(Icons.brightness_auto)),
              ],
              selected: {_theme},
              onSelectionChanged: (s) => _setTheme(s.first)),
          const SizedBox(height: 24),
          const Text('الأمان',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SwitchListTile(
              title: const Text('قفل التطبيق برمز PIN'),
              subtitle: const Text('يطلب الرمز عند فتح التطبيق'),
              value: _lockOn,
              onChanged: _busy ? null : _toggleLock),
          if (_lockOn)
            OutlinedButton.icon(
                onPressed: _busy ? null : _changeLockPin,
                icon: const Icon(Icons.key),
                label: const Text('تغيير الرمز')),
          const SizedBox(height: 24),
          const Text('التصدير',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : () => _exp(ExportService.exportProductsCsv, 'المخزون'),
              icon: const Icon(Icons.table_view),
              label: const Text('تصدير المخزون CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : () => _exp(ExportService.exportSalesCsv, 'المبيعات'),
              icon: const Icon(Icons.receipt_long),
              label: const Text('تصدير المبيعات CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : () => _exp(ExportService.exportDebtsCsv, 'الديون'),
              icon: const Icon(Icons.book),
              label: const Text('تصدير الديون CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : () => _exp(ExportService.exportSuppliersCsv, 'الموردين'),
              icon: const Icon(Icons.local_shipping),
              label: const Text('تصدير الموردين CSV')),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : () => _exp(ExportService.exportPurchaseOrdersCsv, 'أوامر الشراء'),
              icon: const Icon(Icons.shopping_bag),
              label: const Text('تصدير أوامر الشراء CSV')),
          const SizedBox(height: 24),
          const Text('النسخ الاحتياطي',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
              onPressed: _busy ? null : _backup,
              icon: const Icon(Icons.backup),
              label: const Text('إنشاء ومشاركة نسخة')),
          const SizedBox(height: 12),
          OutlinedButton.icon(
              onPressed: _busy ? null : _restore,
              icon: const Icon(Icons.restore, color: Colors.red),
              label: const Text('استرجاع من JSON',
                  style: TextStyle(color: Colors.red))),
          const SizedBox(height: 24),
          Card(
              child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('سوقنا — الإصدار 2.2',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        const Text('نظام إدارة محلات صغيرة، محلي أولاً.'),
                        const SizedBox(height: 8),
                        const Text(
                            'باركود · ديون · مصروفات · جرد · كاشيرين · تقارير · تدقيق · CSV · نسخ احتياطي · موردون · أوامر شراء · سجل أسعار · وضع ليلي · قفل PIN · تنبيهات ذكية · مقارنة فترات.'),
                      ]))),
        ],
      ),
    );
  }
}
