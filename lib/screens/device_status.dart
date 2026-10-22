import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../device_models.dart';
import '../device_permissions.dart';
import '../services/device_service.dart';
import '../utils.dart';

class DeviceStatusScreen extends StatefulWidget {
  const DeviceStatusScreen({super.key});

  @override
  State<DeviceStatusScreen> createState() => _DeviceStatusScreenState();
}

class _DeviceStatusScreenState extends State<DeviceStatusScreen> {
  final _activation = TextEditingController();

  @override
  void dispose() {
    _activation.dispose();
    super.dispose();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  void _copy(String t) {
    Clipboard.setData(ClipboardData(text: t));
    _msg('تم النسخ');
  }

  Future<void> _activate() async {
    try {
      await DeviceService.activate(_activation.text);
      _activation.clear();
      setState(() {});
      _msg('تم تحديث ترخيص هذا الهاتف');
    } catch (e) {
      _msg('$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final DeviceIdentity? dev = DeviceService.current;

    if (dev == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final expired = DeviceService.isExpired(dev);
    final statusColor = expired
        ? Colors.red
        : (dev.status == 'active' ? Colors.green : Colors.orange);

    return Scaffold(
      appBar: AppBar(title: const Text('حالة هذا الهاتف')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: statusColor.withValues(alpha: 0.15),
                        child: Icon(
                          expired ? Icons.lock_outline : Icons.smartphone,
                          color: statusColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              dev.deviceName,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${Perm.roleLabel(dev.role)} • ${dev.status}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _row('معرّف المحل', dev.shopId.isEmpty ? '—' : dev.shopId),
                  _row('معرّف الجهاز', dev.deviceId),
                  _row('المستخدم', dev.employeeName.isEmpty ? '—' : dev.employeeName),
                  _row('النوع', Perm.roleLabel(dev.role)),
                  _row('الحالة', expired ? 'منتهي' : dev.status),
                  _row(
                    'الانتهاء',
                    dev.expiresAt.isEmpty
                        ? 'بدون انتهاء'
                        : formatDateTime(dev.expiresAt),
                  ),
                  const SizedBox(height: 12),
                  const Text('الصلاحيات', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: dev.permissions
                        .map(
                          (p) => Chip(
                            label: Text(Perm.label(p)),
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
                    'رمز طلب الربط / تجديد الترخيص',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    dev.deviceId,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _copy(dev.deviceId),
                    icon: const Icon(Icons.copy),
                    label: const Text('نسخ معرّف الجهاز'),
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
                    'إدخال رمز تفعيل جديد',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text('استخدم هذا إذا جدّد المالك الترخيص أو عدّل الصلاحيات.'),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _activation,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'رمز التفعيل',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _activate,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('تحديث الترخيص'),
                    ),
                  ),
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
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
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
