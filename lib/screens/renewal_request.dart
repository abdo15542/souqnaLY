import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../services/renewal_request_service.dart';

class RenewalRequestScreen extends StatefulWidget {
  const RenewalRequestScreen({super.key});

  @override
  State<RenewalRequestScreen> createState() => _RenewalRequestScreenState();
}

class _RenewalRequestScreenState extends State<RenewalRequestScreen> {
  bool _loading = true;
  String _code = '';
  String _error = '';

  @override
  void initState() {
    super.initState();
    _gen();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _gen() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final c = await RenewalRequestService.generateCode();
      if (!mounted) return;
      setState(() {
        _code = c;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('طلب تجديد الاشتراك'),
        actions: <Widget>[
          IconButton(
            onPressed: _gen,
            icon: const Icon(Icons.refresh),
            tooltip: 'توليد رمز جديد',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text('خطأ: $_error'),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: <Widget>[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            const Text(
                              'رمز طلب التجديد',
                              style: TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'أرسل هذا الرمز للدعم عبر واتساب، '
                              'وسيفتح اشتراكك فور استيراده.',
                            ),
                            const SizedBox(height: 12),
                            SelectableText(
                              _code,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () {
                        final txt =
                            RenewalRequestService.buildWhatsappMessage(_code);
                        Share.share(txt, subject: 'طلب تجديد سوقنا');
                      },
                      icon: const Icon(Icons.share),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text('مشاركة عبر واتساب'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _code));
                        _msg('تم نسخ الرمز');
                      },
                      icon: const Icon(Icons.copy),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text('نسخ الرمز فقط'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const <Widget>[
                            Text('طريقة العمل',
                                style:
                                    TextStyle(fontWeight: FontWeight.bold)),
                            SizedBox(height: 8),
                            Text('1. اضغط "مشاركة عبر واتساب".'),
                            Text('2. اختر واتساب وأرسل للرقم الظاهر.'),
                            Text('3. الدعم يستورد الرمز في نظامه.'),
                            Text('4. يرد عليك برمز ترخيص جديد.'),
                            Text('5. الصقه في: ترخيص الناشر ← استيراد.'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
