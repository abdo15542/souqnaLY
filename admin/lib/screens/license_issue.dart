import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../admin_db.dart';
import '../admin_features.dart';
import '../admin_models.dart';
import '../license_signer.dart';

class LicenseIssueScreen extends StatefulWidget {
  final Shop shop;
  const LicenseIssueScreen({super.key, required this.shop});

  @override
  State<LicenseIssueScreen> createState() => _LicenseIssueScreenState();
}

class _LicenseIssueScreenState extends State<LicenseIssueScreen> {
  bool _loading = true;
  List<LicenseRecord> _licenses = <LicenseRecord>[];

  final GlobalKey<FormState> _k = GlobalKey<FormState>();
  final TextEditingController _days = TextEditingController(text: '30');
  final TextEditingController _maxDevices = TextEditingController(text: '3');
  final TextEditingController _grace = TextEditingController(text: '7');
  final TextEditingController _plan = TextEditingController(text: 'pro');

  late List<String> _features;
  bool _allowExport = true;
  bool _allowBackup = true;
  bool _allowBranches = false;
  String _status = 'active';

  @override
  void initState() {
    super.initState();
    _features = List<String>.from(Features.all);
    _plan.text = widget.shop.plan;
    _load();
  }

  @override
  void dispose() {
    _days.dispose();
    _maxDevices.dispose();
    _grace.dispose();
    _plan.dispose();
    super.dispose();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final list = await AdminDB.getLicenses(widget.shop.id);
    if (!mounted) return;
    setState(() {
      _licenses = list;
      _loading = false;
    });
  }

  Future<void> _issue() async {
    if (!_k.currentState!.validate()) return;

    final days = int.tryParse(_days.text.trim()) ?? 30;
    final maxD = int.tryParse(_maxDevices.text.trim()) ?? 3;
    final grace = int.tryParse(_grace.text.trim()) ?? 7;

    final payload = LicenseSigner.buildPayload(
      shopId: widget.shop.id,
      shopName: widget.shop.name,
      ownerName: widget.shop.ownerName,
      plan: _plan.text.trim().isEmpty ? 'pro' : _plan.text.trim(),
      features: List<String>.from(_features),
      maxDevices: maxD,
      days: days,
      graceDays: grace,
      allowExport: _allowExport,
      allowBackup: _allowBackup,
      allowBranches: _allowBranches,
      status: _status,
    );

    final code = LicenseSigner.encode(payload);
    final now = DateTime.now().toIso8601String();

    final rec = LicenseRecord(
      shopId: widget.shop.id,
      features: List<String>.from(_features),
      maxDevices: maxD,
      issuedAt: payload['issuedAt'] as String,
      expiresAt: payload['expiresAt'] as String,
      graceDays: grace,
      allowExport: _allowExport,
      allowBackup: _allowBackup,
      allowBranches: _allowBranches,
      status: _status,
      nonce: payload['nonce'] as String,
      signature: payload['sig'] as String,
      code: code,
      createdAt: now,
    );

    await AdminDB.addLicense(rec);
    await AdminDB.saveShop(Shop(
      id: widget.shop.id,
      name: widget.shop.name,
      ownerName: widget.shop.ownerName,
      phone: widget.shop.phone,
      plan: rec.features.isEmpty ? widget.shop.plan : _plan.text.trim(),
      status: widget.shop.status,
      createdAt: widget.shop.createdAt,
      updatedAt: widget.shop.updatedAt,
    ));

    _showCode(code);
    _load();
  }

  void _showCode(String code) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('رمز الترخيص'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Text('أرسل هذا الرمز لصاحب المحل، وليَلصقه في: '
                  'الإعدادات ← ترخيص الناشر ← استيراد.'),
              const SizedBox(height: 12),
              SelectableText(code, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: code));
                        _msg('تم النسخ');
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('نسخ'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => Share.share(code,
                          subject: 'ترخيص سوقنا - ${widget.shop.name}'),
                      icon: const Icon(Icons.share),
                      label: const Text('مشاركة'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إغلاق')),
        ],
      ),
    );
  }

  Widget _featureTiles() {
    return Column(
      children: Features.all.map((f) {
        return CheckboxListTile(
          dense: true,
          value: _features.contains(f),
          title: Text(Features.label(f)),
          onChanged: (v) {
            setState(() {
              if (v == true) {
                if (!_features.contains(f)) _features.add(f);
              } else {
                _features.remove(f);
              }
            });
          },
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('تراخيص ${widget.shop.name}'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: <Widget>[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('معرّف المحل: ${widget.shop.id}',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('المالك: ${widget.shop.ownerName}'),
                        const SizedBox(height: 12),
                        const Text('إصدار ترخيص جديد',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        Form(
                          key: _k,
                          child: Column(
                            children: <Widget>[
                              TextFormField(
                                controller: _plan,
                                decoration: const InputDecoration(
                                    labelText: 'الخطة',
                                    border: OutlineInputBorder()),
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _days,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                    labelText: 'المدة بالأيام',
                                    border: OutlineInputBorder()),
                                validator: (v) {
                                  final n = int.tryParse(v?.trim() ?? '');
                                  if (n == null) return 'رقم غير صالح';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _maxDevices,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                    labelText: 'حد الأجهزة',
                                    border: OutlineInputBorder()),
                                validator: (v) {
                                  final n = int.tryParse(v?.trim() ?? '');
                                  if (n == null || n < 0) return 'رقم غير صالح';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _grace,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                    labelText: 'فترة السماح (أيام)',
                                    border: OutlineInputBorder()),
                                validator: (v) {
                                  final n = int.tryParse(v?.trim() ?? '');
                                  if (n == null || n < 0) return 'رقم غير صالح';
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                              SwitchListTile(
                                dense: true,
                                title: const Text('السماح بالتصدير'),
                                value: _allowExport,
                                onChanged: (v) =>
                                    setState(() => _allowExport = v),
                              ),
                              SwitchListTile(
                                dense: true,
                                title: const Text('السماح بالنسخ الاحتياطي'),
                                value: _allowBackup,
                                onChanged: (v) =>
                                    setState(() => _allowBackup = v),
                              ),
                              SwitchListTile(
                                dense: true,
                                title: const Text('السماح بالفروع'),
                                value: _allowBranches,
                                onChanged: (v) =>
                                    setState(() => _allowBranches = v),
                              ),
                              DropdownButtonFormField<String>(
                                value: _status,
                                decoration: const InputDecoration(
                                    labelText: 'حالة الترخيص',
                                    border: OutlineInputBorder()),
                                items: const <DropdownMenuItem<String>>[
                                  DropdownMenuItem<String>(
                                      value: 'active', child: Text('سارٍ')),
                                  DropdownMenuItem<String>(
                                      value: 'revoked',
                                      child: Text('معطّل')),
                                ],
                                onChanged: (v) =>
                                    setState(() => _status = v ?? 'active'),
                              ),
                              const SizedBox(height: 12),
                              const Align(
                                alignment: AlignmentDirectional.centerStart,
                                child: Text('الميزات المفعّلة',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold)),
                              ),
                              _featureTiles(),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: _issue,
                                icon: const Icon(Icons.vpn_key),
                                label: const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 14),
                                  child: Text('توليد رمز الترخيص'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('سجل التراخيص',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_licenses.isEmpty)
                  const Text('لا توجد تراخيص صادرة بعد.')
                else
                  ..._licenses.map((r) {
                    final expired = DateTime.tryParse(r.expiresAt) != null &&
                        DateTime.now().isAfter(DateTime.parse(r.expiresAt));
                    final color = r.status == 'revoked'
                        ? Colors.red
                        : (expired ? Colors.orange : Colors.green);
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Icon(Icons.verified, color: color),
                        title: Text(
                            '${r.plan.toUpperCase()} • ${r.maxDevices} أجهزة'),
                        subtitle: Text(
                            'صادر: ${r.issuedAt}\nينتهي: ${r.expiresAt}\nالحالة: ${r.status}'),
                        isThreeLine: true,
                        trailing: IconButton(
                          icon: const Icon(Icons.visibility),
                          onPressed: () => _showCode(r.code),
                        ),
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}
