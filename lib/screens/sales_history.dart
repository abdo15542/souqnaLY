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
  Map<int, String> _cashierNames = {};

  @override
  void initState() {
    super.initState();
    _loadCashiers();
    _loadEntries();
  }

  Future<void> _loadCashiers() async {
    final cashiers = await LocalDB.getCashiers();
    if (!mounted) return;
    setState(() {
      _cashierNames = {for (final c in cashiers) if (c.id != null) c.id!: c.name};
    });
  }

  DateTime? get _from {
    if (_days == 0) return null;
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    return day.subtract(Duration(days: _days - 1));
  }

  String get _periodLabel {
    if (_days == 0) return 'كل الفترات';
    if (_days == 1) return 'اليوم';
    if (_days == 7) return 'آخر 7 أيام';
    if (_days == 30) return 'آخر 30 يوم';
    return 'مخصص';
  }

  Future<void> _loadEntries() async {
    setState(() => _loading = true);
    final sales = await LocalDB.getSalesHistory(from: _from, search: _search, limit: 200);
    final settings = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _sales = sales;
      _settings = settings;
      _loading = false;
    });
  }

  String _cashierLabel(int? id) {
    if (id == null) return 'بدون كاشير';
    return _cashierNames[id] ?? 'كاشير #$id';
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  String _receiptText(Sale sale) {
    final s = _settings;
    final b = StringBuffer();
    b.writeln(s.shopName);
    if (s.phone.isNotEmpty) b.writeln(s.phone);
    if (s.address.isNotEmpty) b.writeln(s.address);
    b.writeln('فاتورة رقم: ${sale.id}');
    b.writeln(formatDateTime(sale.createdAt));
    if (sale.isRefunded) {
      b.writeln('الحالة: ملغاة');
      b.writeln('تاريخ الإلغاء: ${formatDateTime(sale.refundedAt!)}');
      if (sale.refundNote.isNotEmpty) b.writeln('سبب الإلغاء: ${sale.refundNote}');
    } else {
      b.writeln('الحالة: مكتملة');
    }
    b.writeln('الكاشير: ${_cashierLabel(sale.cashierId)}');
    b.writeln('--------------------------------');
    for (final item in sale.items) {
      b.writeln('${item.name}  ${formatQty(item.qty)} × ${formatMoney(item.price, s.currency)}');
      b.writeln('   = ${formatMoney(item.total, s.currency)}');
    }
    b.writeln('--------------------------------');
    b.writeln('الإجمالي: ${formatMoney(sale.total, s.currency)}');
    b.writeln('التكلفة: ${formatMoney(sale.cost, s.currency)}');
    b.writeln('الربح: ${formatMoney(sale.profit, s.currency)}');
    return b.toString();
  }

  Future<void> _copyReceipt(Sale sale) async {
    final text = _receiptText(sale);
    await Clipboard.setData(ClipboardData(text: text));
    _showMessage('تم نسخ الإيصال');
  }

  Future<void> _shareReceipt(Sale sale) async {
    final text = _receiptText(sale);
    await Share.share(text);
  }

  Future<void> _voidSale(Sale sale) async {
    if (sale.isRefunded) return;
    final activeCashiers = await LocalDB.getActiveCashierCount();
    if (activeCashiers > 0) {
      final cashier = await promptCashierLogin(context);
      if (cashier == null) return;
    }
    if (!mounted) return;
    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إلغاء الفاتورة'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('هل تريد إلغاء الفاتورة رقم ${sale.id}؟'),
          const SizedBox(height: 12),
          const Text('سيتم إرجاع الكميات إلى المخزون، وتسجيل العملية في سجل التدقيق.'),
          const SizedBox(height: 12),
          TextField(controller: controller, maxLines: 2, decoration: const InputDecoration(labelText: 'سبب الإلغاء (اختياري)')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('تراجع')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('تأكيد الإلغاء')),
        ],
      ),
    );
    final note = controller.text.trim();
    controller.dispose();
    if (ok != true) return;
    final done = await LocalDB.voidSale(sale.id, note: note);
    if (!mounted) return;
    if (done) {
      _showMessage('تم إلغاء الفاتورة وإرجاع الكميات');
      _loadEntries();
    } else {
      _showMessage('تعذر إلغاء الفاتورة، ربما كانت ملغاة مسبقاا');
    }
  }

  void _showDetails(Sale sale) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        final cur = _settings.currency;
        return SizedBox(
          height: MediaQuery.of(context).size.height * 0.85,
          child: Column(children: [
            Padding(padding: const EdgeInsets.all(16), child: Row(children: [
              Expanded(child: Text('فاتورة #${sale.id}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
              Chip(label: Text(sale.isRefunded ? 'ملغاة' : 'مكتملة'), backgroundColor: sale.isRefunded ? Colors.red.shade100 : Colors.green.shade100),
            ])),
            Expanded(child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
              _infoRow('التاريخ', formatDateTime(sale.createdAt)),
              _infoRow('الكاشير', _cashierLabel(sale.cashierId)),
              _infoRow('عدد الأصناف', '${sale.items.length}'),
              _infoRow('الإجمالي', formatMoney(sale.total, cur)),
              _infoRow('التكلفة', formatMoney(sale.cost, cur)),
              _infoRow('الربح', formatMoney(sale.profit, cur)),
              if (sale.isRefunded) ...[
                const Divider(),
                _infoRow('تاريخ الإلغاء', formatDateTime(sale.refundedAt!)),
                _infoRow('ألغيت بواسطة', _cashierLabel(sale.refundedBy)),
                if (sale.refundNote.isNotEmpty) _infoRow('سبب الإلغاء', sale.refundNote),
              ],
              const Divider(),
              const Text('الأصناف', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...sale.items.map((item) => ListTile(dense: true, title: Text(item.name), subtitle: Text('${formatQty(item.qty)} × ${formatMoney(item.price, cur)}'), trailing: Text(formatMoney(item.total, cur)))),
            ])),
            SafeArea(child: Padding(padding: const EdgeInsets.all(12), child: Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
              OutlinedButton.icon(onPressed: () => _copyReceipt(sale), icon: const Icon(Icons.copy), label: const Text('نسخ')),
              OutlinedButton.icon(onPressed: () => _shareReceipt(sale), icon: const Icon(Icons.share), label: const Text('مشاركة')),
              if (!sale.isRefunded) FilledButton.icon(onPressed: () { Navigator.pop(ctx); _voidSale(sale); }, style: FilledButton.styleFrom(backgroundColor: Colors.red), icon: const Icon(Icons.block), label: const Text('إلغاء الفاتورة')),
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إغلاق')),
            ]))),
          ]),
        );
      },
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
      Expanded(child: Text(value, textDirection: TextDirection.rtl)),
    ]));
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(title: const Text('سجل الفواتير')),
      body: Column(
        children: [
          Padding(padding: const EdgeInsets.all(12), child: SegmentedButton<int>(segments: const [
            ButtonSegment(value: 1, label: Text('اليوم')),
            ButtonSegment(value: 7, label: Text('7 أيام')),
            ButtonSegment(value: 30, label: Text('30 يوم')),
            ButtonSegment(value: 0, label: Text('الكل')),
          ], selected: {_days}, onSelectionChanged: (s) { setState(() => _days = s.first); _loadEntries(); })),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: TextField(onChanged: (v) { _search = v; _loadEntries(); }, decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: 'ابحث برقم الفاتورة أو اسم الصنف...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Row(children: [
            Text('الفترة: $_periodLabel', style: const TextStyle(fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('عدد الفواتير: ${_sales.length}', style: const TextStyle(color: Colors.grey)),
          ])),
          const SizedBox(height: 8),
          Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _sales.isEmpty 
            ? const Center(child: Text('لا توجد فواتير'))
            : RefreshIndicator(onRefresh: _loadEntries, child: ListView.builder(itemCount: _sales.length, itemBuilder: (ctx, i) {
                final sale = _sales[i];
                return ListTile(
                  leading: Icon(sale.isRefunded ? Icons.block : Icons.check_circle, color: sale.isRefunded ? Colors.red : Colors.green),
                  title: Text('#${sale.id} — ${formatMoney(sale.total, cur)}'),
                  subtitle: Text('${formatDateTime(sale.createdAt)}\n${sale.items.length} صنف • ${_cashierLabel(sale.cashierId)}'),
                  isThreeLine: true,
                  trailing: Chip(label: Text(sale.isRefunded ? 'ملغاة' : 'مكتملة'), backgroundColor: sale.isRefunded ? Colors.red.shade100 : Colors.green.shade100),
                  onTap: () => _showDetails(sale),
                );
              }))),
        ],
      ),
    );
  }
}
