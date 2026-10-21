import 'package:flutter/material.dart';
import '../db.dart';
import 'home.dart';

class AppLockScreen extends StatefulWidget {
  const AppLockScreen({super.key});
  @override
  State<AppLockScreen> createState() => _AppLockScreenState();
}

class _AppLockScreenState extends State<AppLockScreen> {
  bool _checking = true;
  bool _needLock = false;
  final _pin = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    _check();
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final enabled = await LocalDB.isLockEnabled();
    final has = await LocalDB.hasLockPin();
    if (!mounted) return;
    setState(() {
      _needLock = enabled && has;
      _checking = false;
    });
  }

  Future<void> _unlock() async {
    final ok = await LocalDB.verifyLockPin(_pin.text.trim());
    if (!mounted) return;
    if (ok) {
      Navigator.pushReplacement(
          context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    } else {
      setState(() => _error = 'رمز غير صحيح');
      _pin.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!_needLock) {
      return const HomeScreen();
    }
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock, size: 72, color: Color(0xFF0F766E)),
              const SizedBox(height: 16),
              const Text('سوقنا مقفل',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('أدخل الرمز للمتابعة'),
              const SizedBox(height: 24),
              TextField(
                controller: _pin,
                obscureText: true,
                autofocus: true,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 8),
                decoration: InputDecoration(
                  hintText: '••••',
                  errorText: _error,
                  border:
                      OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onSubmitted: (_) => _unlock(),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _unlock,
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14, horizontal: 32),
                  child: Text('فتح'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
