import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../services/shift_service.dart';
import '../utils.dart';

class ShiftsScreen extends StatefulWidget {
  const ShiftsScreen({super.key});
  @override
  State<ShiftsScreen> createState() => _ShiftsScreenState();
}

class _ShiftsScreenState extends State<ShiftsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  bool _loading = true;
  AppSettings _app = AppSettings.defaults();
  Shift? _open;
  List<Shift> _closed = [];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final app = await LocalDB.getAppSettings();
      final op = await ShiftService.getOpenShift();
      final cl = await ShiftService.getClosedShifts();
      if (!mounted) return;
      setState(() {
        _app = app;
        _open = op;
        _closed = cl;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _msg('خطأ: $e');
    }
  }

  Future<void> _openShift() async {
    final ctrl = TextEditingController(text: '0');
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('فتح نوبة'),
              content: Form(
                  key: fk,
                  child: TextFormField(
                      controller: ctrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'نقدية البداية في الدرج',
                          border: OutlineInputBorder()),
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
                    child: const Text('فتح')),
              ],
            ));
    final val = double.tryParse(ctrl.text.trim()) ?? 0;
    ctrl.dispose();
    if (ok == true) {
      try {
        await ShiftService.openShift(
          cashierId: CashierSession.cashierId,
          cashierName: CashierSession.displayName,
          openingCash: val,
        );
        _msg('تم فتح النوبة');
        _load();
      } catch (e) {
        _msg('$e');
      }
    }
  }

  Future<void> _closeShift(Shift s) async {
    final bd = await ShiftService.computeBreakdown(
        from: s.openedAt,
        to: DateTime.now().toIso8601String(),
        openingCash: s.openingCash);
    if (!mounted) return;

    final counted = TextEditingController(text: bd.expectedDrawer.toStringAsFixed(2));
    final note = TextEditingController();
    final fk = GlobalKey<FormState>();

    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('إغلاق وتسوية النوبة'),
              content: SingleChildScrollView(
                child: Form(
                    key: fk,
                    child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _bdLine('مبيعات', bd.sales),
                          _bdLine('ديون مسددة', bd.debtPaid),
                          _bdLine('مصروفات', -bd.expenses),
                          _bdLine('رواتب', -bd.payroll),
                          const Divider(),
                          _bdLine('نقدية البداية', bd.openingCash),
                          _bdLine('الدرج المتوقع', bd.expectedDrawer),
                          const SizedBox(height: 12),
                          TextFormField(
                              controller: counted,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  labelText: 'العدّ الفعلي للنقد',
                                  border: OutlineInputBorder()),
                              validator: (v) {
                                final n = double.tryParse(v?.trim() ?? '');
                                if (n == null || n < 0) return 'رقم غير صالح';
                                return null;
                              }),
                          const SizedBox(height: 12),
                          TextFormField(
                              controller: note,
                              maxLines: 2,
                              decoration: const InputDecoration(
                                  labelText: 'ملاحظة (اختياري)',
                                  border: OutlineInputBorder())),
                        ])),
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () {
                      if (fk.currentState!.validate()) Navigator.pop(ctx, true);
                    },
                    child: const Text('تسوية وإغلاق')),
              ],
            ));

    final countedVal = double.tryParse(counted.text.trim()) ?? 0;
    final noteVal = note.text.trim();
    counted.dispose();
    note.dispose();

    if (ok == true) {
      try {
        final closed = await ShiftService.closeShift(
            shiftId: s.id, countedCash: countedVal, note: noteVal);
        if (!mounted) return;
        _msg('تم الإغلاق — الفرق ${closed.difference?.toStringAsFixed(2) ?? '0'}');
        _load();
      } catch (e) {
        _msg('$e');
      }
    }
  }

  Widget _bdLine(String label, double v) {
    final cur = _app.currency;
    return Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label),
              Text(formatMoney(v, cur),
                  style: TextStyle(
                      color: v < 0 ? Colors.red : Colors.green,
                      fontWeight: FontWeight.bold)),
            ]));
  }

  Future<void> _showDetail(Shift s) async {
    final cur = _app.currency;
    if (!mounted) return;
    await showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
            child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('تسوية نوبة #${s.id}',
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('فتح: ${formatDateTime(s.openedAt)}'),
                      if (s.closedAt != null)
                        Text('إغلاق: ${formatDateTime(s.closedAt!)}'),
                      Text('المفتِح: ${s.openedByName}'),
                      const SizedBox(height: 12),
                      _dLine('مبيعات', s.salesTotal, cur),
                      _dLine('ديون مسددة', s.debtPaidTotal, cur),
                      _dLine('مصروفات', -s.expenseTotal, cur),
                      _dLine('رواتب', -s.payrollTotal, cur),
                      const Divider(),
                      _dLine('نقدية البداية', s.openingCash, cur),
                      _dLine('الدرج المتوقع', s.expectedDrawer, cur),
                      _dLine('العدّ الفعلي', s.countedCash ?? 0, cur),
                      const Divider(),
                      _dLine('الفرق', s.difference ?? 0, cur, bold: true),
                      if (s.note.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('ملاحظة: ${s.note}'),
                      ],
                      const SizedBox(height: 16),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Padding(
                              padding: EdgeInsets.symmetric(vertical: 14),
                              child: Text('إغلاق'))),
                    ]))));
  }

  Widget _dLine(String label, double v, String cur, {bool bold = false}) {
    return Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label,
                  style: bold ? const TextStyle(fontWeight: FontWeight.bold) : null),
              Text(formatMoney(v, cur),
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: v < 0 ? Colors.red : (bold ? Colors.teal : null))),
            ]));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('النوبات والصندوق'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'النشطة'),
            Tab(text: 'السجل'),
          ],
        ),
      ),
      floatingActionButton: _open == null
          ? FloatingActionButton.extended(
              onPressed: _openShift,
              icon: const Icon(Icons.play_arrow),
              label: const Text('فتح نوبة'))
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tab,
              children: [_activeTab(), _historyTab()],
            ),
    );
  }

  Widget _activeTab() {
    final s = _open;
    if (s == null) {
      return Center(
          child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.inbox, size: 64, color: Colors.grey),
                    const SizedBox(height: 12),
                    const Text('لا توجد نوبة مفتوحة'),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                        onPressed: _openShift,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('فتح نوبة جديدة')),
                  ])));
    }
    return FutureBuilder<ShiftBreakdown>(
        future: ShiftService.computeBreakdown(
            from: s.openedAt,
            to: DateTime.now().toIso8601String(),
            openingCash: s.openingCash),
        builder: (ctx, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final bd = snap.data!;
          final cur = _app.currency;
          return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                const Icon(Icons.timelapse, color: Colors.teal),
                                const SizedBox(width: 8),
                                Expanded(
                                    child: Text('نوبة مفتوحة — ${s.openedByName}',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16))),
                              ]),
                              const SizedBox(height: 4),
                              Text('بدأت: ${formatDateTime(s.openedAt)}'),
                            ]))),
                const SizedBox(height: 12),
                Card(
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(children: [
                          _liveLine('مبيعات حتى الآن', bd.sales, cur),
                          _liveLine('ديون مسددة', bd.debtPaid, cur),
                          _liveLine('مصروفات', -bd.expenses, cur),
                          _liveLine('رواتب', -bd.payroll, cur),
                          const Divider(),
                          _liveLine('نقدية البداية', bd.openingCash, cur),
                          _liveLine('الدرج المتوقع الآن', bd.expectedDrawer, cur,
                              highlight: true),
                        ]))),
                const SizedBox(height: 16),
                FilledButton.icon(
                    onPressed: () => _closeShift(s),
                    icon: const Icon(Icons.lock),
                    label: const Text('إغلاق وتسوية')),
              ]);
        });
  }

  Widget _liveLine(String label, double v, String cur, {bool highlight = false}) {
    return Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label,
                  style: highlight
                      ? const TextStyle(fontWeight: FontWeight.bold)
                      : null),
              Text(formatMoney(v, cur),
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: highlight
                          ? Colors.teal
                          : (v < 0 ? Colors.red : null))),
            ]));
  }

  Widget _historyTab() {
    if (_closed.isEmpty) {
      return const Center(child: Text('لا توجد نوبات مغلقة'));
    }
    final cur = _app.currency;
    return RefreshIndicator(
        onRefresh: _load,
        child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: _closed.length,
            itemBuilder: (ctx, i) {
              final s = _closed[i];
              final diff = s.difference ?? 0;
              final sev = ShiftService.severityOfDifference(diff, s.salesTotal);
              final color =
                  sev == 'danger' ? Colors.red : (sev == 'warn' ? Colors.orange : Colors.green);
              return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                        backgroundColor: color.withValues(alpha: 0.15),
                        child: Icon(Icons.account_balance_wallet, color: color)),
                    title: Text('نوبة #${s.id} — ${s.openedByName}'),
                    subtitle: Text(
                        '${formatDateTime(s.openedAt)}\nالفرق: ${formatMoney(diff, cur)}'),
                    isThreeLine: true,
                    trailing: Icon(Icons.chevron_left),
                    onTap: () => _showDetail(s),
                  ));
            }));
  }
}
