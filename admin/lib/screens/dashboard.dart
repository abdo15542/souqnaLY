import 'package:flutter/material.dart';

import '../admin_db.dart';
import '../admin_models.dart';
import 'license_issue.dart';
import 'shop_form.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  List<Shop> _shops = <Shop>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await AdminDB.getShops();
    if (!mounted) return;
    setState(() {
      _shops = list;
      _loading = false;
    });
  }

  Future<void> _addShop() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const ShopFormSheet(),
    );
    if (saved == true) _load();
  }

  Future<void> _editShop(Shop s) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ShopFormSheet(existing: s),
    );
    if (saved == true) _load();
  }

  void _openLicense(Shop s) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => LicenseIssueScreen(shop: s)),
    ).then((_) => _load());
  }

  Future<void> _toggleShop(Shop s) async {
    final newStatus = s.status == 'active' ? 'suspended' : 'active';
    await AdminDB.setShopStatus(s.id, newStatus);
    _load();
  }

  Future<void> _deleteShop(Shop s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف محل'),
        content: Text('حذف "${s.name}" وكل تراخيصه؟'),
        actions: <Widget>[
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('إلغاء')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('حذف')),
        ],
      ),
    );
    if (ok == true) {
      await AdminDB.deleteShop(s.id);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('سوقنا كونسول — لوحة الناشر'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addShop,
        icon: const Icon(Icons.add_business),
        label: const Text('محل جديد'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _shops.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        const Icon(Icons.storefront,
                            size: 72, color: Colors.grey),
                        const SizedBox(height: 12),
                        const Text('لا توجد محلات مسجلة'),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: _addShop,
                          icon: const Icon(Icons.add),
                          label: const Text('إضافة أول محل'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _shops.length,
                    itemBuilder: (ctx, i) {
                      final s = _shops[i];
                      final active = s.status == 'active';
                      final color = active ? Colors.green : Colors.red;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.15),
                            child: Icon(Icons.store, color: color),
                          ),
                          title: Text(s.name),
                          subtitle: Text(
                            '${s.ownerName}\n${s.id} • ${s.plan} • ${s.status}',
                          ),
                          isThreeLine: true,
                          onTap: () => _openLicense(s),
                          trailing: PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'edit') _editShop(s);
                              if (v == 'toggle') _toggleShop(s);
                              if (v == 'delete') _deleteShop(s);
                            },
                            itemBuilder: (_) => <PopupMenuEntry<String>>[
                              const PopupMenuItem<String>(
                                  value: 'edit', child: Text('تعديل')),
                              PopupMenuItem<String>(
                                  value: 'toggle',
                                  child: Text(active
                                      ? 'تعليق المحل'
                                      : 'تفعيل المحل')),
                              const PopupMenuItem<String>(
                                  value: 'delete',
                                  child: Text('حذف',
                                      style: TextStyle(color: Colors.red))),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
