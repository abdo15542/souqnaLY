import 'package:flutter/material.dart';
import '../services/data_health_service.dart';

class DataHealthScreen extends StatefulWidget {
  const DataHealthScreen({super.key});

  @override
  State<DataHealthScreen> createState() => _DataHealthScreenState();
}

class _DataHealthScreenState extends State<DataHealthScreen> {
  bool _loading = true;
  List<DataHealthIssue> _issues = [];

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
      final list = await DataHealthService.runChecks();
      if (!mounted) return;
      setState(() {
        _issues = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _msg('فشل الفحص: $e');
    }
  }

  Color _color(String severity) {
    if (severity == 'danger') return Colors.red;
    if (severity == 'warn') return Colors.orange;
    return Colors.blue;
  }

  IconData _icon(String severity) {
    if (severity == 'danger') return Icons.report_problem;
    if (severity == 'warn') return Icons.warning_amber;
    return Icons.info_outline;
  }

  String _label(String severity) {
    if (severity == 'danger') return 'حرج';
    if (severity == 'warn') return 'تحذير';
    return 'معلومة';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('فحص سلامة البيانات'),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'إعادة الفحص',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _issues.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 80),
                        Card(
                          color: Colors.green.withValues(alpha: 0.12),
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              children: [
                                const Icon(Icons.check_circle, color: Colors.green, size: 64),
                                const SizedBox(height: 16),
                                const Text('لا توجد مشاكل مكتشفة',
                                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                const Text('بياناتك تبدو سليمة حسب الفحوصات المحلية.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _issues.length,
                      itemBuilder: (ctx, i) {
                        final issue = _issues[i];
                        final color = _color(issue.severity);

                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(_icon(issue.severity), color: color),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(issue.title,
                                          style: const TextStyle(fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 6),
                                      Text(issue.details),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: color.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    _label(issue.severity),
                                    style: TextStyle(color: color, fontSize: 12),
                                  ),
                                ),
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
