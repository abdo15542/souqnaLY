import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../admin_db.dart';
import '../admin_models.dart';
import '../renewal_signer.dart';

class RenewalRequestsScreen extends StatefulWidget {
  const RenewalRequestsScreen({super.key});

  @override
  State<RenewalRequestsScreen> createState() => _RenewalRequestsScreenState();
}

class _RenewalRequestsScreenState extends State<RenewalRequestsScreen> {
  final TextEditingController _code = TextEditingController();
  bool _loading = true;
  String _filter = 'pending';
  List<RenewalRequest> _list = <RenewalRequest>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await AdminDB.getRenewalRequests(status: _filter);
    if (!mounted) return;
    setState(() {
      _list = list;
      _loading = false;
    });
  }

  Future<void> _import() async {
    final raw = _code.text.trim();
    if (raw.isEmpty) {
      _msg('الصق رمز الطلب أولًا.');
      return;
    }
    final p = RenewalSigner.decode(raw);
    if (p == null) {
      _msg('رمز الطلب غير صالح أو تالف.');
      return;
    }
    final now = DateTime.now().toIso8601String();
    await AdminDB.addRenewalRequest(RenewalRequest(
      shopId: (p['shopId'] as String?) ?? '',
      shopName: (p['shopName'] as String?) ?? '',
      deviceId: (p['deviceId'] as String?) ?? '',
      deviceName: (p['deviceName'] as String?) ?? '',
      ownerName: (p['ownerName'] as String?) ?? '',
      phone: (p['phone'] as String?) ?? '',
      requestedAt: (p['requestedAt'] as String?) ?? '',
      daysRequested: (p['daysRequested'] as num?)?.toInt() ?? 30,
      status: 'pending',
      code: raw,
      receivedAt: now,
    ));
    _code.clear();
    _msg('تم استلام طلب التجديد');
    _load();
  }

  Future<void> _setStatus(RenewalRequest r, String status) async {
    if (r.id == null) return;
    await AdminDB.setRenewalStatus(r.id!, status);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('طلبات التجديد')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: TextField(
                    controller: _code,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'الصق رمز طلب التجديد',
                      hintText: 'SOUREQ1....',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(onPressed: _import, child: const Text('استلام')),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: SegmentedButton<String>(
              segments: const <ButtonSegment<String>>[
                ButtonSegment<String>(value: 'pending', label: Text('معلقة')),
                ButtonSegment<String>(value: 'done', label: Text('تم التجديد')),
                ButtonSegment<String>(value: '', label: Text('الكل')),
              ],
              selected: <String>{_filter},
              onSelectionChanged: (s) {
                setState(() => _filter = s.first);
                _load();
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _list.isEmpty
                    ? const Center(child: Text('لا توجد طلبات'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _list.length,
                          itemBuilder: (ctx, i) {
                            final r = _list[i];
                            final color = r.status == 'done'
                                ? Colors.green
                                : Colors.orange;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: Icon(Icons.pending_actions,
                                    color: color),
                                title: Text(
                                  r.shopName.isEmpty ? r.shopId : r.shopName,
                                ),
                                subtitle: Text(
                                  'المالك: ${r.ownerName}\n'
                                  'الجهاز: ${r.deviceName}\n'
                                  'المدة المطلوبة: ${r.daysRequested} يوم\n'
                                  'التاريخ: ${r.requestedAt}',
                                ),
                                isThreeLine: true,
                                trailing: r.status == 'pending'
                                    ? FilledButton(
                                        onPressed: () => _setStatus(r, 'done'),
                                        child: const Text('تم'),
                                      )
                                    : const Icon(Icons.check_circle,
                                        color: Colors.green),
                                onTap: () {
                                  Clipboard.setData(
                                      ClipboardData(text: r.code));
                                  _msg('تم نسخ رمز الطلب');
                                },
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
