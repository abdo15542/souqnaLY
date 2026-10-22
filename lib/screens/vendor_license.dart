import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../device_permissions.dart';
import '../services/vendor_license_service.dart';
import '../vendor_license_models.dart';

class VendorLicenseScreen extends StatefulWidget {
  const VendorLicenseScreen({super.key});

  @override
  State<VendorLicenseScreen> createState() => _VendorLicenseScreenState();
}

class _VendorLicenseScreenState extends State<VendorLicenseScreen> {
  final _code = TextEditingController();
  bool _loading = true;
  bool _busy = false;
  String? _error;

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
    try {
      await VendorLicenseService.reload();
    } catch (e) {
      if (!mounted) return;
      _error = '$e';
    }

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _import() async {
    if (_code.text.trim().isEmpty) {
      setState(() => _error = 'الصق رمز الترخيص أولًا.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await VendorLicenseService.importCode(_code.text);
      _code.clear();
      await _load();
      _msg('تم استيراد ترخيص الناشر بنجاح');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final VendorLicense? lic = VendorLicenseService.current;
    final blocked = VendorLicenseService.isBlocked();
    final expired = VendorLicenseService.isExpired();
    final grace = VendorLicenseService.inGrace();
    final days = VendorLicenseService.daysRemaining();

    Color statusColor = Colors.green;
    String statusText = 'سارٍ';

    if (lic == null) {
      statusColor = Colors.blue;
      statusText = 'غير مستورد بعد — وضع تجريبي مفتوح';
    } else if (blocked) {
      statusColor = Colors.red;
      statusText = expired ? 'منتهي/محجوب' : 'معطّل';
    } else if (grace) {
      statusColor = Colors.orange;
      statusText = 'منتهي داخل فترة السماح';
    } else if (days != null && days <= 7) {
      statusColor = Colors.orange;
      statusText = 'يقترب من الانتهاء';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('ترخيص الناشر'),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'تحديث',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  color: statusColor.withValues(alpha: 0.08),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: statusColor.withValues(alpha: 0.18),
                              child: Icon(
                                blocked
                                    ? Icons.lock_outline
                                    : Icons.verified_user,
                                color: statusColor,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    lic?.shopName.isEmpty ?? true
                                        ? 'سوقنا'
                                        : lic!.shopName,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    statusText,
                                    style: TextStyle(
                                      color: statusColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _row('معرّف المحل', lic?.shopId.isEmpty ?? true ? '—' : lic!.shopId),
                        _row('المالك', lic?.ownerName.isEmpty ?? true ? '—' : lic!.ownerName),
                        _row('الخطة', lic?.plan.isEmpty ?? true ? '—' : lic!.plan),
                        _row('الحالة', lic?.status.isEmpty ?? true ? '—' : lic!.status),
                        _row(
                          'الانتهاء',
                          lic == null || lic.expiresAt.isEmpty
                              ? 'بدون انتهاء'
                              : lic.expiresAt,
                        ),
                        _row(
                          'الأيام المتبقية',
                          days == null
                              ? '—'
                              : (days < 0
                                  ? 'منتهي منذ ${-days} يوم'
                                  : '$days يوم'),
                        ),
                        _row('فترة السماح', '${lic?.graceDays ?? 0} يوم'),
                        _row('حد الأجهزة', '${lic?.maxDevices ?? 999999}'),
                        _row('التصدير', (lic?.allowExport ?? true) ? 'مسموح' : 'ممنوع'),
                        _row('النسخ الاحتياطي', (lic?.allowBackup ?? true) ? 'مسموح' : 'ممنوع'),
                        _row('الفروع', (lic?.allowBranches ?? false) ? 'مسموح' : 'ممنوع'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'الميزات المفعّلة',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 10),
                        if (lic == null)
                          const Text('لا يوجد ترخيص مستورد بعد. التطبيق يعمل حاليًا في وضع تجريبي مفتوح.')
                        else if (lic.features.isEmpty)
                          const Text('لا توجد ميزات مفعّلة في هذا الترخيص.')
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: lic.features
                                .map(
                                  (f) => Chip(
                                    label: Text(Perm.label(f)),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                )
                                .toList(),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'استيراد ترخيص',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text('الصق رمز الترخيص الذي صدر من تطبيق Souqna Admin.'),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _code,
                          maxLines: 5,
                          decoration: InputDecoration(
                            labelText: 'SOULIC2....',
                            errorText: _error,
                            border: const OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: _busy ? null : _import,
                                icon: const Icon(Icons.upload_file),
                                label: const Text('استيراد الترخيص'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton.filledTonal(
                              onPressed: () async {
                                final data = await Clipboard.getData(Clipboard.kTextPlain);
                                if (data?.text != null) {
                                  _code.text = data!.text!;
                                }
                              },
                              icon: const Icon(Icons.paste),
                              tooltip: 'لصق',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'ملاحظات',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 8),
                        Text('• إذا لم يوجد ترخيص، التطبيق يعمل حاليًا في وضع تجريبي مفتوح.'),
                        Text('• بعد استيراد ترخيص، تُفرض الميزات وحد الأجهزة والانتهاء.'),
                        Text('• صلاحيات الموظف لا يمكن أن تتجاوز ترخيص المحل.'),
                        Text('• التعطيل الفوري عن بُعد يحتاج مزامنة أو خادم لاحقًا.'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
            ),
          ),
          Expanded(
            child: Text(value, textDirection: TextDirection.rtl),
          ),
        ],
      ),
    );
  }
}
