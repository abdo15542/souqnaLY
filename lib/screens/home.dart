import 'package:flutter/material.dart';
import '../db.dart';
import '../utils.dart';
import 'pos_screen.dart';
import 'inventory_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  double _todaySales = 0;
  int _productCount = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final sales = await LocalDB.getTotalSalesToday();
    final products = await LocalDB.getProducts();
    if (!mounted) return;
    setState(() {
      _todaySales = sales;
      _productCount = products.length;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('سوقنا')),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    Text('مبيعات اليوم', style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 8),
                    Text(formatMoney(_todaySales, 'د.ل'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.teal)),
                  ]),
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.2,
                children: [
                  _tile('نقطة البيع', Icons.point_of_sale, const PosScreen()),
                  _tile('المخزون', Icons.inventory_2, const InventoryScreen()),
                  _tile('الإعدادات', Icons.settings, const SettingsScreen()),
                ],
              ),
            ],
          ),
    );
  }

  Widget _tile(String title, IconData icon, Widget page) {
    return Card(
      child: InkWell(
        onTap: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => page));
          _loadData();
        },
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 40),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        ]),
      ),
    );
  }
}
