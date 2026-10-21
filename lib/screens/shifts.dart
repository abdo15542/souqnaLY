import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/shifts_service.dart';
import '../utils.dart';

class ShiftsScreen extends StatefulWidget {
  const ShiftsScreen({super.key});
  @override
  State<ShiftsScreen> createState() => _ShiftsScreenState();
}

class _ShiftsScreenState extends State<ShiftsScreen> {
  bool _loading = true;
  List<Shift> _list = [];
  Shift? _open;
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await ShiftsService.getShifts();
    final o = await ShiftsService.getOpenShift();
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = l;
      _open = o;
      _settings = s;
      _loading = false;
    });
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _openNew() async {
    if (_open != null) {
      _msg('توجد نوبة مفتوحة بالفعل');
      return;
    }
    final ctrl = TextEditingController();
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('افتتاح نوبة'),
              content: Form(
                  key: fk,
                  child: TextFormField(
                      controller: ctrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'الرصيد الابتدائي في الصندوق'),
                      validator: (v) {
                        final n = double.tryParse(v?.trim() ?? '');
                        if (n == null || n < 0) return 'رقم غير صالح';
                        return null;
                      })),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) Navigator.pop(ctx, true);
                    },
                    child: const Text('افتتاح')),
              ],
            ));
    final val = double.tryParse(ctrl.text.trim()) ?? 0;
    ctrl.dispose();
    if (ok == true) {
      await ShiftsService.openShift(val);
      _load();
    }
  }

  Future<void> _close(Shift sh) async {
    if (sh.id == null) return;
    final ctrl = TextEditingController();
    final nctrl = TextEditingController();
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: Text('إغلاق النوبة #${sh.id}'),
              content: Form(
                  key: fk,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('المتوقع: ${formatMoney(sh.expected, _settings.currency)}'),
                    const SizedBox(height: 12),
                    TextFormField(
                        controller: ctrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                            labelText: 'الرصيد الفعلي المعدود'),
                        validator: (v) {
                          final n = double.tryParse(v?.trim() ?? '');
                          if (n == null || n < 0) return 'رقم غير صالح';
                          return null;
                        }),
                    const SizedBox(height: 12),
                    TextFormField(
                        controller: nctrl,
                        maxLines: 2,
                        decoration:
                            const InputDecoration(labelText: 'ملاحظة (اختياري)')),
                  ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) Navigator.pop(ctx, true);
                    },
                    child: const Text('إغلاق وتسوية')),
              ],
            ));
    final actual = double.tryParse(ctrl.text.trim()) ?? 0;
    final note = nctrl.text.trim();
    ctrl.dispose();
    nctrl.dispose();
    if (ok == true) {
      final done = await ShiftsService.closeShift(sh.id!, actual, note: note);
      _msg(done ? 'تم إغلاق النوبة' : 'تعذر الإغلاق');
      _load();
    }
  }

  Future<void> _delete(Shift sh) async {
    if (sh.id == null || sh.isOpen) return;
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('حذف نوبة'),
              content: Text('حذف النوبة #${sh.id}؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('حذف')),
              ],
            ));
    if (ok == true) {
      await ShiftsService.deleteShift(sh.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('نوبات الصندوق')),
      floatingActionButton: _open == null
          ? FloatingActionButton.extended(
              onPressed: _openNew,
              icon: const Icon(Icons.play_arrow),
              label: const Text('افتتاح نوبة'))
          : FloatingActionButton.extended(
              onPressed: () => _close(_open!),
              backgroundColor: Colors.red,
              icon: const Icon(Icons.stop),
              label: const Text('إغلاق النوبة الحالية')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                if (_open != null)
                  Card(
                    color: Colors.teal.withValues(alpha: 0.12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('نوبة مفتوحة الآن',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.teal)),
                          const SizedBox(height: 8),
                          Text('الكاشير: ${_open!.cashierName}'),
                          Text(
                              'ابتدائي: ${formatMoney(_open!.openingFloat, cur)}'),
                          Text('بدأت: ${formatDateTime(_open!.openedAt)}'),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                const Text('السجل',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_list.isEmpty)
                  const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('لا توجد نوبات')))
                else
                  ..._list.map((sh) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: Icon(
                              sh.isOpen ? Icons.play_circle : Icons.check_circle,
                              color: sh.isOpen ? Colors.teal : Colors.green),
                          title: Text(
                              '#${sh.id ?? ''} — ${sh.cashierName}'),
                          subtitle: Text(sh.isOpen
                              ? 'مفتوحة • بدأت ${formatDateTime(sh.openedAt)}'
                              : 'مغلقة • فرق ${formatMoney(sh.difference, cur)} • ${formatDateTime(sh.closedAt ?? sh.openedAt)}'),
                          isThreeLine: true,
                          trailing: sh.isOpen
                              ? FilledButton(
                                  onPressed: () => _close(sh),
                                  child: const Text('إغلاق'))
                              : IconButton(
                                  onPressed: () => _delete(sh),
                                  icon: const Icon(Icons.delete,
                                      color: Colors.red)),
                        ),
                      )),
              ],
            ),
    );
  }
}
