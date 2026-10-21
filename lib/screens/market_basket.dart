import 'package:flutter/material.dart';
import '../db.dart';
import '../models.dart';
import '../services/market_basket_service.dart';

class MarketBasketScreen extends StatefulWidget {
  const MarketBasketScreen({super.key});
  @override
  State<MarketBasketScreen> createState() => _MarketBasketScreenState();
}

class _MarketBasketScreenState extends State<MarketBasketScreen> {
  bool _loading = true;
  int _days = 90;
  List<BasketPair> _pairs = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final p = await MarketBasketService.analyze(days: _days, minPairs: 2);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _pairs = p;
      _settings = s;
      _loading = false;
    });
  }

  String _pct(double v) => '${(v * 100).toStringAsFixed(1)}%';

  Color _liftColor(double lift) {
    if (lift >= 2.0) return Colors.green;
    if (lift >= 1.2) return Colors.teal;
    if (lift >= 1.0) return Colors.orange;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('سلة السوق (ترابط الأصناف)')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 7, label: Text('7 أيام')),
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
                const Expanded(child: Text('الأزواج الأكثر ترابطًا', style: TextStyle(fontWeight: FontWeight.bold))),
                Text('عدد: ${_pairs.length}', style: const TextStyle(color: Colors.grey)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _pairs.isEmpty
                    ? const Center(child: Text('لا توجد أزواج كافية خلال الفترة المحددة'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _pairs.length,
                        itemBuilder: (ctx, i) {
                          final b = _pairs[i];
                          final col = _liftColor(b.lift);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text('${b.nameA}  ↔  ${b.nameB}',
                                            style: const TextStyle(fontWeight: FontWeight.bold)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: col.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text('Lift ${b.lift.toStringAsFixed(2)}',
                                            style: TextStyle(color: col, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 16,
                                    runSpacing: 4,
                                    children: [
                                      Text('معًا: ${b.bothCount} فاتورة'),
                                      Text('الدعم: ${_pct(b.support)}'),
                                      Text('الثقة ${b.nameA}→${b.nameB}: ${_pct(b.confidenceAB)}'),
                                      Text('الثقة ${b.nameB}→${b.nameA}: ${_pct(b.confidenceBA)}'),
                                    ],
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
