import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../device_models.dart';
import '../device_permissions.dart';
import '../services/device_service.dart';
import '../services/vendor_license_service.dart';
import '../utils.dart';

class ManageDevicesScreen extends StatefulWidget {
  const ManageDevicesScreen({super.key});

  @override
  State<ManageDevicesScreen> createState() => _ManageDevicesScreenState();
}

class _ManageDevicesScreenState extends State<ManageDevicesScreen> {
  bool _loading = true;
  List<RegisteredDevice> _devices = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      await VendorLicenseService.reload();
    } catch (_) {}

    final dev = DeviceService.current;
    if (dev == null || !dev.isOwner) {
      if (!mounted) return;
      setState(() => _loading = false);
      return;
    }

    final list = await DeviceService.getDevices();

    if (!mounted) return;
    setState(() {
      _devices = list;
      _loading = false;
    });
  }

  bool _isExpired(String expiresAt) {
    if (expiresAt.isEmpty) return false;
    final e = DateTime.tryParse(expiresAt);
    if (e == null) return false;
    return DateTime.now().isAfter(e);
  }

  Future<void> _add() async {
    if (VendorLicenseService.isBlocked()) {
      _msg('اشتراك المحل غير فعّال. لا يمكن إضافة أجهزة.');
      return;
    }

    if (!VendorLicenseService.canManageDevices()) {
      _msg('إدارة الهواتف غير مفعّلة في اشتراك هذا المحل.');
      return;
    }

    if (!await VendorLicenseService.canAddDevice()) {
      _msg('وصلت إلى الحد الأقصى للأجهزة المسموح بها في اشتراكك.');
      return;
    }

    final rd = await showModalBottomSheet<RegisteredDevice>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _AddDeviceSheet(),
    );

    if (rd != null) {
      _showActivation(rd);
      _load();
    }
  }

  void _showActivation(RegisteredDevice rd) {
    if (VendorLicenseService.isBlocked()) {
      _msg('اشتراك المحل غير فعّال. لا يمكن إصدار رمز تفعيل.');
      return;
    }

    if (rd.status != 'active') {
      _msg('هذا الجهاز معطّل. فعّله أولًا لإصدار رمز تفعيل.');
      return;
    }

    String code;
    try {
      code = DeviceService.createActivationCode(rd);
    } catch (e) {
      _msg('$e');
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('رمز تفعيل ${rd.deviceName}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('انقل هذا الرمز إلى الهاتف الفرعي والصقه في شاشة الربط.'),
              const SizedBox(height: 12),
              SelectableText(
                code,
                style: const TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: code));
                  _msg('تم نسخ رمز التفعيل');
                },
                icon: const Icon(Icons.copy),
                label: const Text('نسخ الرمز'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إغلاق'),
          ),
        ],
      ),
    );
  }

  Future<void> _extend(RegisteredDevice rd) async {
    if (VendorLicenseService.isBlocked()) {
      _msg('اشتراك المحل غير فعّال. لا يمكن التمديد.');
      return;
    }

    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 30)),
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365 * 5)),
    );

    if (picked == null) return;

    final endOfDay = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
    final requested = endOfDay.toIso8601String();
    final exp = VendorLicenseService.clampExpiry(requested);

    final expDate = DateTime.tryParse(exp);
    if (expDate == null || expDate.isBefore(now)) {
      _msg('لا يمكن التمديد بعد انتهاء اشتراك المحل.');
      return;
    }

    await DeviceService.extendDevice(rd.deviceId, exp);

    _msg('تم التمديد. أصدر رمز تفعيل جديدًا من زر الرمز.');
    _load();
  }

  Future<void> _toggleStatus(RegisteredDevice rd) async {
    final newStatus = rd.isActive ? 'revoked' : 'active';

    if (newStatus == 'active') {
      if (VendorLicenseService.isBlocked()) {
        _msg('اشتراك المحل غير فعّال. لا يمكن تفعيل أجهزة.');
        return;
      }

      if (!VendorLicenseService.canManageDevices()) {
        _msg('إدارة الهواتف غير مفعّلة في اشتراك هذا المحل.');
        return;
      }

      if (rd.expiresAt.isNotEmpty) {
        final e = DateTime.tryParse(rd.expiresAt);
        if (e != null && e.isBefore(DateTime.now())) {
          _msg('انتهت صلاحية هذا الجهاز. مدده أولًا.');
          return;
        }
      }

      if (!await VendorLicenseService.canAddDevice()) {
        _msg('وصلت إلى الحد الأقصى للأجهزة المسموح بها في اشتراكك.');
        return;
      }
    }

    await DeviceService.setDeviceStatus(rd.deviceId, newStatus);
    _msg(newStatus == 'active' ? 'تم تفعيل الجهاز' : 'تم تعطيل الجهاز');
    _load();
  }

  Future<void> _delete(RegisteredDevice rd) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف جهاز'),
        content: Text('حذف "${rd.deviceName}" من قائمة الأجهزة المسجلة؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );

    if (ok == true) {
      await DeviceService.deleteDevice(rd.deviceId);
      _load();
    }
  }

  Future<void> _menu(String value, RegisteredDevice rd) async {
    switch (value) {
      case 'code':
        _showActivation(rd);
        break;
      case 'extend':
        await _extend(rd);
        break;
      case 'toggle':
        await _toggleStatus(rd);
        break;
      case 'delete':
        await _delete(rd);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dev = DeviceService.current;

    if (dev == null || !dev.isOwner) {
      return Scaffold(
        appBar: AppBar(title: const Text('إدارة الهواتف')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('هذه الشاشة متاحة لجهاز المالك فقط.'),
          ),
        ),
      );
    }

    final blocked = VendorLicenseService.isBlocked();
    final canManage = VendorLicenseService.canManageDevices();
    final max = VendorLicenseService.maxDevices();

    return Scaffold(
      appBar: AppBar(
        title: const Text('إدارة الهواتف'),
        actions: [
          IconButton(
            onPressed: (!blocked && canManage) ? _add : null,
            icon: const Icon(Icons.add),
            tooltip: 'إضافة هاتف',
          ),
        ],
      ),
      body: Column(
        children: [
          if (blocked)
            Card(
              color: Colors.red.shade50,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: const [
                    Icon(Icons.lock_outline, color: Colors.red),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'اشتراك المحل غير فعّال. لا يمكن إضافة أو تفعيل أجهزة.',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (!canManage && !blocked)
            Card(
              color: Colors.orange.shade50,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: const [
                    Icon(Icons.warning_amber, color: Colors.orange),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text('إدارة الهواتف غير مفعّلة في اشتراك هذا المحل.'),
                    ),
                  ],
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _mini('الأجهزة', '${_devices.length}'),
                _mini('الحد المسموح', '$max'),
                _mini('الحالة', blocked ? 'موقوف' : 'سارٍ'),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _devices.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.phone_android, size: 64, color: Colors.grey),
                              const SizedBox(height: 12),
                              const Text('لا توجد أجهزة فرعية مسجلة'),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: (!blocked && canManage) ? _add : null,
                                icon: const Icon(Icons.add),
                                label: const Text('إضافة هاتف فرعي'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _devices.length,
                          itemBuilder: (ctx, i) {
                            final rd = _devices[i];
                            final expired = _isExpired(rd.expiresAt);
                            final color = rd.isRevoked
                                ? Colors.red
                                : (expired ? Colors.orange : Colors.green);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: color.withValues(alpha: 0.15),
                                  child: Icon(Icons.phone_android, color: color),
                                ),
                                title: Text(rd.deviceName),
                                subtitle: Text(
                                  '${rd.employeeName.isEmpty ? 'بدون موظف' : rd.employeeName}\n'
                                  '${Perm.roleLabel(rd.role)} • ${rd.status}\n'
                                  'الانتهاء: ${rd.expiresAt.isEmpty ? 'بدون' : formatDateTime(rd.expiresAt)}',
                                ),
                                isThreeLine: true,
                                trailing: PopupMenuButton<String>(
                                  onSelected: (v) => _menu(v, rd),
                                  itemBuilder: (_) => [
                                    const PopupMenuItem<String>(
                                      value: 'code',
                                      child: Row(
                                        children: [
                                          Icon(Icons.qr_code, size: 18),
                                          SizedBox(width: 8),
                                          Text('رمز التفعيل'),
                                        ],
                                      ),
                                    ),
                                    const PopupMenuItem<String>(
                                      value: 'extend',
                                      child: Row(
                                        children: [
                                          Icon(Icons.update, size: 18),
                                          SizedBox(width: 8),
                                          Text('تمديد'),
                                        ],
                                      ),
                                    ),
                                    PopupMenuItem<String>(
                                      value: 'toggle',
                                      child: Row(
                                        children: [
                                          Icon(
                                            rd.isActive ? Icons.block : Icons.check_circle,
                                            size: 18,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(rd.isActive ? 'تعطيل' : 'تفعيل'),
                                        ],
                                      ),
                                    ),
                                    const PopupMenuItem<String>(
                                      value: 'delete',
                                      child: Row(
                                        children: [
                                          Icon(Icons.delete, size: 18, color: Colors.red),
                                          SizedBox(width: 8),
                                          Text('حذف'),
                                        ],
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

  Widget _mini(String t, String v) {
    return Column(
      children: [
        Text(t, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(v, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _AddDeviceSheet extends StatefulWidget {
  const _AddDeviceSheet();

  @override
  State<_AddDeviceSheet> createState() => _AddDeviceSheetState();
}

class _AddDeviceSheetState extends State<_AddDeviceSheet> {
  final _k = GlobalKey<FormState>();

  final _request = TextEditingController();
  final _name = TextEditingController();
  final _employee = TextEditingController();
  final _days = TextEditingController(text: '30');

  String _role = 'cashier';
  late List<String> _perms;

  @override
  void initState() {
    super.initState();
    _perms = _filteredPreset('cashier');
  }

  @override
  void dispose() {
    _request.dispose();
    _name.dispose();
    _employee.dispose();
    _days.dispose();
    super.dispose();
  }

  List<String> _filteredPreset(String role) {
    final base = Perm.presets[role] ?? <String>[];
    return base.where((p) => VendorLicenseService.canUse(p)).toList();
  }

  void _setRole(String r) {
    setState(() {
      _role = r;
      _perms = _filteredPreset(r);
    });
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;

    if (VendorLicenseService.isBlocked()) {
      _snack('اشتراك المحل غير فعّال.');
      return;
    }

    if (!VendorLicenseService.canManageDevices()) {
      _snack('إدارة الهواتف غير مفعّلة في اشتراك هذا المحل.');
      return;
    }

    if (!await VendorLicenseService.canAddDevice()) {
      _snack('وصلت إلى الحد الأقصى للأجهزة المسموح بها في اشتراكك.');
      return;
    }

    for (final p in _perms) {
      if (!VendorLicenseService.canUse(p)) {
        _snack('صلاحية ${Perm.label(p)} غير مسموحة في اشتراك المحل.');
        return;
      }
    }

    final days = int.tryParse(_days.text.trim()) ?? 30;
    if (days < 0) {
      _snack('المدة غير صالحة.');
      return;
    }

    final now = DateTime.now();
    final requested = days == 0
        ? now.toIso8601String()
        : now.add(Duration(days: days)).toIso8601String();

    final exp = VendorLicenseService.clampExpiry(requested);
    final expDate = DateTime.tryParse(exp);

    if (expDate == null || expDate.isBefore(now)) {
      _snack('لا يمكن إنشاء جهاز ينتهي قبل الوقت الحالي أو بعد انتهاء اشتراك المحل.');
      return;
    }

    final rd = RegisteredDevice(
      deviceId: _request.text.trim().toUpperCase(),
      deviceName: _name.text.trim(),
      employeeName: _employee.text.trim(),
      role: _role,
      permissions: List<String>.from(_perms),
      issuedAt: now.toIso8601String(),
      expiresAt: exp,
      status: 'active',
    );

    await DeviceService.upsertDevice(rd);

    if (!mounted) return;
    Navigator.pop(context, rd);
  }

  void _snack(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'إضافة هاتف فرعي',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'حد الأجهزة في الاشتراك: ${VendorLicenseService.maxDevices()}',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _request,
                decoration: const InputDecoration(
                  labelText: 'رمز طلب الربط / معرّف الجهاز',
                  hintText: 'DEVICE-XXXX-XXXX',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'مطلوب' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: 'اسم الهاتف',
                  hintText: 'هاتف الكاشير 1',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'مطلوب' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _employee,
                decoration: const InputDecoration(
                  labelText: 'اسم الموظف',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _role,
                decoration: const InputDecoration(
                  labelText: 'نوع الاستخدام',
                  border: OutlineInputBorder(),
                ),
                items: Perm.presets.keys
                    .map(
                      (r) => DropdownMenuItem<String>(
                        value: r,
                        child: Text(Perm.roleLabel(r)),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) _setRole(v);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _days,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'المدة بالأيام',
                  helperText: 'سيُقلَّم تلقائيًا إذا تجاوز انتهاء اشتراك المحل',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final n = int.tryParse(v?.trim() ?? '');
                  if (n == null || n < 0) return 'رقم غير صالح';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              const Text('الصلاحيات', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...Perm.allSub.map(
                (p) {
                  final allowed = VendorLicenseService.canUse(p);
                  return CheckboxListTile(
                    dense: true,
                    value: allowed && _perms.contains(p),
                    title: Text(Perm.label(p)),
                    subtitle: allowed ? null : const Text('غير مسموحة في اشتراك المحل'),
                    onChanged: allowed
                        ? (v) {
                            setState(() {
                              if (v == true) {
                                if (!_perms.contains(p)) _perms.add(p);
                              } else {
                                _perms.remove(p);
                              }
                            });
                          }
                        : null,
                  );
                },
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _save,
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text('حفظ وإصدار رمز التفعيل'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
