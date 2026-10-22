import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../db.dart';
import '../models.dart';
import '../services/device_service.dart';
import 'app_lock.dart';
import 'home.dart';

class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await DeviceService.bootstrap();
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (DeviceService.pendingOnboarding || DeviceService.needsActivation) {
      return const OnboardingScreen();
    }

    return const AppLockScreen();
  }
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _createOwner = false;
  bool _linkMode = false;

  String _requestCode = '';

  final _shop = TextEditingController();
  final _currency = TextEditingController();
  final _deviceName = TextEditingController(text: 'هاتف المالك');
  final _employeeName = TextEditingController(text: 'المالك');
  final _subDeviceName = TextEditingController(text: 'هاتف فرعي');
  final _activation = TextEditingController();

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _shop.dispose();
    _currency.dispose();
    _deviceName.dispose();
    _employeeName.dispose();
    _subDeviceName.dispose();
    _activation.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    if (DeviceService.needsActivation) {
      if (DeviceService.current == null) {
        await DeviceService.createPendingSub();
      }

      if (!mounted) return;

      setState(() {
        _linkMode = true;
        _requestCode = DeviceService.current?.deviceId ?? '';
      });

      return;
    }

    try {
      final s = await LocalDB.getAppSettings();
      if (!mounted) return;
      setState(() {
        _shop.text = s.shopName;
        _currency.text = s.currency;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _shop.text = 'سوقنا';
        _currency.text = 'د.ل';
      });
    }
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  void _copy(String t) {
    Clipboard.setData(ClipboardData(text: t));
    _msg('تم النسخ');
  }

  Future<void> _createOwnerPressed() async {
    if (_shop.text.trim().isEmpty) {
      _msg('اسم المحل مطلوب');
      return;
    }

    await DeviceService.createOwner(
      shopName: _shop.text,
      currency: _currency.text,
      deviceName: _deviceName.text,
      employeeName: _employeeName.text,
    );

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const RootScreen()),
    );
  }

  Future<void> _linkPressed() async {
    await DeviceService.createPendingSub(deviceName: _subDeviceName.text);

    if (!mounted) return;

    setState(() {
      _linkMode = true;
      _requestCode = DeviceService.current?.deviceId ?? '';
    });
  }

  Future<void> _activatePressed() async {
    try {
      await DeviceService.activate(_activation.text);
      _msg('تم تفعيل الهاتف بنجاح');

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const RootScreen()),
      );
    } catch (e) {
      _msg('$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_linkMode) {
      return _buildLinkView();
    }

    if (_createOwner) {
      return _buildOwnerForm();
    }

    return _buildWelcome();
  }

  Widget _buildWelcome() {
    return Scaffold(
      appBar: AppBar(title: const Text('تهيئة سوقنا')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 24),
          const Icon(Icons.storefront, size: 80, color: Color(0xFF0F766E)),
          const SizedBox(height: 16),
          const Text(
            'مرحبًا بك في نظام سوقنا',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'اختر نوع هذا الهاتف:',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => setState(() => _createOwner = true),
            icon: const Icon(Icons.add_business),
            label: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('إنشاء محل جديد كمالك'),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _linkPressed,
            icon: const Icon(Icons.link),
            label: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('ربط هذا الهاتف بمحل موجود'),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'ملاحظات مهمة',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('• الجهاز الرئيسي هو هاتف المالك.'),
                  Text('• الأجهزة الفرعية تحتاج رمز تفعيل من المالك.'),
                  Text('• التفعيل يعمل محليًا بدون إنترنت.'),
                  Text('• لا يمكن استخدام رمز تفعيل على هاتفين مختلفين.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOwnerForm() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إنشاء محل جديد'),
        leading: IconButton(
          onPressed: () => setState(() => _createOwner = false),
          icon: const Icon(Icons.arrow_forward),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _shop,
            decoration: const InputDecoration(
              labelText: 'اسم المحل',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _currency,
            decoration: const InputDecoration(
              labelText: 'رمز العملة',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _deviceName,
            decoration: const InputDecoration(
              labelText: 'اسم هذا الهاتف',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _employeeName,
            decoration: const InputDecoration(
              labelText: 'اسم المالك / المستخدم',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _createOwnerPressed,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('إنشاء المحل وتعيين هذا الهاتف كمالك'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLinkView() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ربط بمحل موجود'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'رمز طلب الربط',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'أعطِ هذا الرمز لمالك المحل ليصدر لك رمز تفعيل.',
                  ),
                  const SizedBox(height: 12),
                  SelectableText(
                    _requestCode,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _copy(_requestCode),
                          icon: const Icon(Icons.copy),
                          label: const Text('نسخ الرمز'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _activation,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'الصق رمز التفعيل هنا',
              hintText: 'SOULIC1....',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _activatePressed,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Text('تفعيل هذا الهاتف'),
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
                    'طريقة العمل',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('1. أعطِ رمز الطلب للمالك.'),
                  Text('2. المالك يدخله في إدارة الهواتف.'),
                  Text('3. المالك يحدد الصلاحيات والمدة.'),
                  Text('4. المالك يصدر رمز تفعيل.'),
                  Text('5. الصقه هنا ليُفعّل الهاتف.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
