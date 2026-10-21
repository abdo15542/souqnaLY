import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'cashier_login.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class SalesHistoryScreen extends StatefulWidget {
  const SalesHistoryScreen({super.key});
  @override
  State<SalesHistoryScreen> createState() => _SalesHistoryScreenState();
}

class _SalesHistoryScreenState extends State<SalesHistoryScreen> {
  bool _loading = true;
  int _days = 1;
  String _search = '';
  List<Sale> _sales = [];
  AppSettings _settings = AppSettings.defaults();
  Map<int, String> _names = {};

  @override
  void initState() {
    super.initState();
    _loadCashiers();
    _load();
  }

  Future<void> _loadCashiers() async {
    final c = await LocalDB.getCashiers();
    if (!mounted) return;
    setState(() => _names = {for (final x in c) if (x.id != null) x.id!: x.name});
  }

  DateTime? get _from {
    if (_days == 0) return null;
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day).subtract(Duration(days: _days - 1));
  }

  String get _label {
    if (_days == 0) return 'الكل';
    if (_days == 1) return 'اليوم';
    if (_days == 7) return '7 أيام';
    return '30 يوم';
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await LocalDB.getSalesHistory(from: _from, search: _search, limit: 200);
    final st = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _sales = s;
      _settings = st;
      _loading = false;
    });
  }

  String _cl(int? id) => id == null ? 'بدون كاشير' : (_names[id] ?? 'كاشير #$id');
  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  String _receipt(Sale sale) {
    final s = _settings;
    final b = StringBuffer();
    b.writeln(s.shopName);
    if (s.phone.isNotEmpty) b.writeln(s.phone);
    b.writeln('فاتورة #${sale.id}');
    b.writeln(formatDateTime(sale.createdAt));
    b.writeln(sale.isRefunded ? 'الحالة: ملغاة' : 'الحالة: مكتملة');
    b.writeln('الكاشير: ${_cl(sale.cashierId)}');
    b.writeln('--------------------------------');
    for (final it in sale.items) {
      b.writeln(
          '${it.name}  ${formatQty(it.qty)} × ${formatMoney(it.price, s.currency)}');
      b.writeln('   = ${formatMoney(it.total, s.currency)}');
    }
    b.writeln('--------------------------------');
    b.writeln('الإجمالي: ${formatMoney(sale.total, s.currency)}');
    return b.toString();
  }

  Future<void> _void(Sale sale) async {
    if (sale.isRefunded) return;
    final ac = await LocalDB.getActiveCashierCount();
    if (ac > 0) {
      final c = await promptCashierLogin(context);
      if (c == null) return;
    }
    if (!mounted) return;
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('إلغاء الفاتورة'),
              content: Column(mainAxisSize: MainAxisSize.min, children: [
                Text('إلغاء فاتورة #${sale.id}؟'),
                const SizedBox(height: 12),
                const Text('سيتم إرجاع الكميات للمخزون.'),
                const SizedBox(height: 12),
                TextField(
                    controller: ctrl,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'سبب الإلغاء')),
              ]),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('تراجع')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('تأكيد')),
              ],
            ));
    final note = ctrl.text.trim();
    ctrl.dispose();
    if (ok != true) return;
    final done = await LocalDB.voidSale(sale.id, note: note);
    if (!mounted) return;
    if (done) {
      _msg('تم الإلغاء وإرجاع الكميات');
      _load();
    } else {
      _msg('تعذر الإلغاء');
    }
  }

  void _details(Sale sale) {
    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) {
          final cur = _settings.currency;
          return SizedBox(
              height: MediaQuery.of(context).size.height * 0.85,
              child: Column(children: [
                Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      Expanded(
                          child: Text('فاتورة #${sale.id}',
                              style: const TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.bold))),
                      Chip(
                          label: Text(sale.isRefunded ? 'ملغاة' : 'مكتملة'),
                          backgroundColor: sale.isRefunded
                              ? Colors.red.shade100
                              : Colors.green.shade100),
                    ])),
                Expanded(
                    child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                      _row('التاريخ', formatDateTime(sale.createdAt)),
                      _row('الكاشير', _cl(sale.cashierId)),
                      _row('الإجمالي', formatMoney(sale.total, cur)),
                      _row('التكلفة', formatMoney(sale.cost, cur)),
                      _row('الربح', formatMoney(sale.profit, cur)),
                      if (sale.isRefunded) ...[
                        const Divider(),
                        _row('تاريخ الإلغاء', formatDateTime(sale.refundedAt!)),
                        if (sale.refundNote.isNotEmpty) _row('السبب', sale.refundNote),
                      ],
                      const Divider(),
                      const Text('الأصناف',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ...sale.items.map((it) => ListTile(
                          dense: true,
                          title: Text(it.name),
                          subtitle: Text(
                              '${formatQty(it.qty)} × ${formatMoney(it.price, cur)}'),
                          trailing: Text(formatMoney(it.total, cur))))
                    ])),
                SafeArea(
                    child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            alignment: WrapAlignment.center,
                            children: [
                              OutlinedButton.icon(
                                  onPressed: () async {
                                    await Clipboard.setData(
                                        ClipboardData(text: _receipt(sale)));
                                    _msg('تم النسخ');
                                  },
                                  icon: const Icon(Icons.copy),
                                  label: const Text('نسخ')),
                              OutlinedButton.icon(
                                  onPressed: () => Share.share(_receipt(sale)),
                                  icon: const Icon(Icons.share),
                                  label: const Text('مشاركة')),
                              if (!sale.isRefunded)
                                FilledButton.icon(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _void(sale);
                                    },
                                    style: FilledButton.styleFrom(
                                        backgroundColor: Colors.red),
                                    icon: const Icon(Icons.block),
                                    label: const Text('إلغاء')),
                              TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('إغلاق')),
                            ]))),
              ]));
        });
  }

  Widget _row(String l, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 120,
            child: Text(l,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
        Expanded(child: Text(v, textDirection: TextDirection.rtl)),
      ]));

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('سجل الفواتير')),
      body: Column(
        children: [
          Padding(
              padding: const EdgeInsets.all(12),
              child: SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 1, label: Text('اليوم')),
                    ButtonSegment(value: 7, label: Text('7 أيام')),
                    ButtonSegment(value: 30, label: Text('30 يوم')),
                    ButtonSegment(value: 0, label: Text('الكل')),
                  ],
                  selected: {_days},
                  onSelectionChanged: (s) {
                    setState(() => _days = s.first);
                    _load();
                  })),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                  onChanged: (v) {
                    _search = v;
                    _load();
                  },
                  decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: 'ابحث برقم الفاتورة/الصنف',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Text('الفترة: $_label',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Text('عدد: ${_sales.length}',
                    style: const TextStyle(color: Colors.grey)),
              ])),
          const SizedBox(height: 8),
          Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _sales.isEmpty
                      ? const Center(child: Text('لا توجد فواتير'))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                              itemCount: _sales.length,
                              itemBuilder: (ctx, i) {
                                final sale = _sales[i];
                                return ListTile(
                                  leading: Icon(
                                      sale.isRefunded ? Icons.block : Icons.check_circle,
                                      color: sale.isRefunded ? Colors.red : Colors.green),
                                  title: Text(
                                      '#${sale.id} — ${formatMoney(sale.total, cur)}'),
                                  subtitle: Text(
                                      '${formatDateTime(sale.createdAt)}\n${sale.items.length} صنف • ${_cl(sale.cashierId)}'),
                                  isThreeLine: true,
                                  trailing: Chip(
                                      label: Text(sale.isRefunded ? 'ملغاة' : 'مكتملة'),
                                      backgroundColor: sale.isRefunded
                                          ? Colors.red.shade100
                                          : Colors.green.shade100),
                                  onTap: () => _details(sale),
                                );
                              }))),
        ],
      ),
    );
  }
}
