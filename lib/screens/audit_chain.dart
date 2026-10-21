import 'package:flutter/material.dart';
import '../models.dart';
import '../services/audit_chain_service.dart';
import '../utils.dart';

class AuditChainScreen extends StatefulWidget {
  const AuditChainScreen({super.key});
  @override
  State<AuditChainScreen> createState() => _AuditChainScreenState();
}

class _AuditChainScreenState extends State<AuditChainScreen> {
  bool _loading = true;
  bool _busy = false;
  ChainVerifyResult? _result;
  List<AuditChainRecord> _records = [];
  int _count = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final c = await AuditChainService.count();
    final r = await AuditChainService.getRecords(limit: 40);
    ChainVerifyResult? res;
    if (c > 0) res = await AuditChainService.verify();
    if (!mounted) return;
    setState(() {
      _count = c;
      _records = r;
      _result = res;
      _loading = false;
    });
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _build() async {
    setState(() => _busy = true);
    try {
      final n = await AuditChainService.buildChain();
      _msg('تم بناء السلسلة من $n سجل');
      await _load();
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      final res = await AuditChainService.verify();
      if (!mounted) return;
      setState(() => _result = res);
      _msg(res.ok ? 'السلسلة سليمة' : 'تحذير: ${res.message}');
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _short(String h) => h.length > 16 ? '${h.substring(0, 16)}…' : h;

  @override
  Widget build(BuildContext context) {
    final res = _result;
    final ok = res?.ok ?? true;
    final statusColor = res == null ? Colors.grey : (ok ? Colors.green : Colors.red);

    return Scaffold(
      appBar: AppBar(
        title: const Text('سلسلة التدقيق (غير قابلة للتلاعب)'),
        actions: [
          IconButton(onPressed: _busy ? null : _build, icon: const Icon(Icons.auto_fix_high), tooltip: 'إعادة بناء السلسلة'),
          IconButton(onPressed: _busy ? null : _verify, icon: const Icon(Icons.verified_user), tooltip: 'تحقق من السلامة'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  color: statusColor.withValues(alpha: 0.12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Icon(ok ? Icons.verified : Icons.report_problem, color: statusColor, size: 48),
                        const SizedBox(height: 8),
                        Text(
                          res == null ? 'لم تُبنَ السلسلة بعد' : (ok ? 'السلسلة سليمة' : 'تم اكتشاف تلاعب'),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(res?.message ?? 'اضغط "إعادة بناء السلسلة" لإنشاء التجزئة التراكمية من سجل التدقيق.'),
                        const SizedBox(height: 6),
                        Text('عدد السجلات في السلسلة: $_count', style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('آخر السجلات المرتبطة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_records.isEmpty)
                  const Text('لا توجد سجلات.')
                else
                  ..._records.map((r) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ExpansionTile(
                          leading: const Icon(Icons.link),
                          title: Text('#${r.seq} — ${r.action}'),
                          subtitle: Text('${formatDateTime(r.createdAt)}  •  hash ${_short(r.recordHash)}'),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('audit_id: ${r.auditId}'),
                                  Text('التفاصيل: ${r.details.isEmpty ? '-' : r.details}'),
                                  const SizedBox(height: 6),
                                  SelectableText('prev: ${r.prevHash}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                                  SelectableText('hash: ${r.recordHash}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),
              ],
            ),
    );
  }
}
