import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../services/eoq_service.dart';
import '../utils.dart';

class EoqScreen extends StatefulWidget {
  const EoqScreen({super.key});
  @override
  State<EoqScreen> createState() => _EoqScreenState();
}

class _EoqScreenState extends State<EoqScreen> {
  bool _loading = true;
  int _days = 90;
  List<EoqItem> _items = [];
  AppSettings _settings = AppSettings.defaults();
  EoqSettings _eoq = EoqSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final it = await EoqService.compute(days: _days);
    final s = await LocalDB.getAppSettings();
    final e = await EoqService.getSettings();
    if (!mounted) return;
    setState(() {
      _items = it;
      _settings = s;
      _eoq = e;
      _loading = false;
    });
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _editSettings() async {
    final oc = TextEditingController(text: _eoq.orderCost.toString());
    final hr = TextEditingController(text: _eoq.holdingRate.toString());
    final fk = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إعدادات EOQ'),
        content: Form(
          key: fk,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextFormField(
                controller: oc,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'تكلفة الطلب/الإعداد (لكل أمر)'),
                validator: (v) {
                  final n = double.tryParse(v?.trim() ?? '');
                  if (n == null || n < 0) return 'رقم غير صالح';
                  return null;
                }),
            const SizedBox(height: 12),
            TextFormField(
                controller: hr,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'معدل التكلفة السنوية (نسبة من سعر الشراء)', helperText: '0.25 = 25%'),
                validator: (v) {
                  final n = double.tryParse(v?.trim() ?? '');
                  if (n == null || n < 0 || n > 1) return 'بين 0 و 1';
                  return null;
                }),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(
              onPressed: () {
                if (fk.currentState!.validate()) Navigator.pop(ctx, true);
              },
              child: const Text('حفظ')),
        ],
      ),
    );
    if (ok == true) {
      await EoqService.saveSettings(EoqSettings(
        orderCost: double.tryParse(oc.text.trim()) ?? 25.0,
        holdingRate: double.tryParse(hr.text.trim()) ?? 0.25,
      ));
      _load();
    }
    oc.dispose();
    hr.dispose();
  }

  Future<void> _draftPo(EoqItem it) async {
    final suppliers = await LocalDB.getSuppliers();
    if (!mounted) return;
    if (suppliers.isEmpty) {
      _msg('أضف موردًا أولًا من شاشة الموردين');
      return;
    }
    Supplier? chosen = suppliers.first;
    final qty = it.eoq > 0 ? it.eoq.ceilToDouble() : (it.reorderPoint - it.product.qty).ceilToDouble();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('مسودة لأجل ${it.product.name}'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('الكمية المقترحة (EOQ): ${formatQty(qty)}'),
            const SizedBox(height: 12),
            DropdownButtonFormField<Supplier>(
              value: chosen,
              decoration: const InputDecoration(labelText: 'المورد'),
              items: suppliers.map((e) => DropdownMenuItem<Supplier>(value: e, child: Text(e.name))).toList(),
              onChanged: (v) => setDialogState(() => chosen = v),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(
                onPressed: () {
                  if (chosen != null) Navigator.pop(ctx, true);
                },
                child: const Text('إنشاء')),
          ],
        ),
      ),
    );
    if (ok == true && chosen != null) {
      await LocalDB.createPurchaseOrder(
        supplierId: chosen.id,
        supplierName: chosen.name,
        lines: [POLine(product: it.product, qty: qty, cost: it.product.buyPrice)],
        note: 'توصية EOQ محلية: دورة ${it.eoq.toStringAsFixed(0)} • ROP ${it.reorderPoint.toStringAsFixed(0)}',
        cashierId: CashierSession.cashierId,
      );
      _msg('تم إنشاء مسودة أمر شراء');
    }
  }

  String _doh(double v) => v.isInfinite ? '∞' : v.toStringAsFixed(1);

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Scaffold(
      appBar: AppBar(
        title: const Text('اقتصاديات المخزون (EOQ)'),
        actions: [
          IconButton(onPressed: _editSettings, icon: const Icon(Icons.tune), tooltip: 'إعدادات EOQ'),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 30, label: Text('30 يوم')),
                  ButtonSegment(value: 90, label: Text('90 يوم')),
                  ButtonSegment(value: 180, label: Text('180 يوم')),
                ],
                selected: {_days},
                onSelectionChanged: (s) {
                  setState(() => _days = s.first);
                  _load();
                },
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Text('تكلفة الطلب: ${formatMoney(_eoq.orderCost, cur)}  •  معدل التكلفة: ${(_eoq.holdingRate * 100).toStringAsFixed(0)}%'),
                const Spacer(),
                Text('عدد: ${_items.length}', style: const TextStyle(color: Colors.grey)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                    ? const Center(child: Text('لا توجد أصناف'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _items.length,
                        itemBuilder: (ctx, i) {
                          final it = _items[i];
                          final col = it.urgency > 0.6
                              ? Colors.red
                              : (it.urgency > 0.3 ? Colors.orange : Colors.teal);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: col.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(it.abcClass, style: TextStyle(color: col, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(it.product.name, style: const TextStyle(fontWeight: FontWeight.bold))),
                                      Text('${(it.urgency * 100).toStringAsFixed(0)}%', style: TextStyle(color: col, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 14,
                                    runSpacing: 4,
                                    children: [
                                      Text('EOQ: ${formatQty(it.eoq)}'),
                                      Text('ROP: ${formatQty(it.reorderPoint)}'),
                                      Text('أيام المخزون: ${_doh(it.daysOnHand)}'),
                                      Text('الدوران: ${it.turnover.toStringAsFixed(2)}×'),
                                      Text('طلب سنوي: ${formatQty(it.annualDemand)}'),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: AlignmentDirectional.centerStart,
                                    child: FilledButton.icon(
                                      onPressed: () => _draftPo(it),
                                      icon: const Icon(Icons.add_shopping_cart),
                                      label: const Text('مسودة أمر شراء'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
