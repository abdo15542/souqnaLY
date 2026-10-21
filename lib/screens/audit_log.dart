import 'package:flutter/material.dart';
import '../audit_labels.dart';
import '../db.dart';
import '../models.dart';
import '../services/export_service.dart';
import '../utils.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});
  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  bool _loading = true, _busy = false;
  int _days = 7;
  DateTimeRange? _range;
  int? _cashierId;
  String? _action;
  String _search = '';
  List<Cashier> _cashiers = [];
  List<String> _actions = [];
  List<AuditEntry> _entries = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _loadFilters();
    _load();
  }

  DateTime? get _from {
    if (_days == 0) return _range?.start;
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day).subtract(Duration(days: _days - 1));
  }

  DateTime? get _to {
    if (_days == 0) {
      final e = _range?.end;
      if (e == null) return null;
      return DateTime(e.year, e.month, e.day).add(const Duration(days: 1));
    }
    return null;
  }

  String get _label {
    if (_days == 0) {
      if (_range == null) return 'مخصص';
      return '${formatDate(_range!.start.toIso8601String())} → ${formatDate(_range!.end.toIso8601String())}';
    }
    if (_days == 1) return 'اليوم';
    if (_days == 7) return '7 أيام';
    return '30 يوم';
  }

  Future<void> _loadFilters() async {
    final c = await LocalDB.getCashiers();
    final a = await LocalDB.getAuditActions();
    if (!mounted) return;
    setState(() {
      _cashiers = c;
      _actions = a;
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final e = await LocalDB.getAuditLogFiltered(
        from: _from,
        to: _to,
        cashierId: _cashierId,
        action: _action,
        search: _search,
        limit: 500);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _entries = e;
      _settings = s;
      _loading = false;
    });
  }

  Future<void> _onDays(int v) async {
    if (v == 0) {
      final n = DateTime.now();
      final p = await showDateRangePicker(
          context: context,
          firstDate: DateTime(n.year - 2),
          lastDate: DateTime(n.year + 1),
          initialDateRange: _range ??
              DateTimeRange(start: n.subtract(const Duration(days: 6)), end: n));
      if (p == null) {
        setState(() {});
        return;
      }
      setState(() {
        _days = 0;
        _range = p;
      });
    } else {
      setState(() {
        _days = v;
        _range = null;
      });
    }
    _load();
  }

  void _msg(String t) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t)));
  }

  Future<void> _csv() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportAuditCsv(
          from: _from, to: _to, cashierId: _cashierId, action: _action, search: _search);
      _msg('تم تصدير CSV');
    } catch (e) {
      _msg('فشل: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _details(AuditEntry e) {
    showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('تفاصيل العملية',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      _row('ID', '${e.id ?? '-'}'),
                      _row('الوقت', formatDateTime(e.createdAt)),
                      _row('الكاشير', e.cashierName),
                      _row('العملية', auditActionLabel(e.action)),
                      _row('الكيان', e.entity.isEmpty ? '-' : e.entity),
                      _row('معرّف', '${e.entityId ?? '-'}'),
                      _row('التفاصيل', e.details.isEmpty ? '-' : e.details),
                      const SizedBox(height: 16),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Padding(
                              padding: EdgeInsets.symmetric(vertical: 14),
                              child: Text('إغلاق'))),
                    ]))));
  }

  Widget _row(String l, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 120,
            child: Text(l,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
        Expanded(child: Text(v, textDirection: TextDirection.rtl)),
      ]));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل التدقيق'),
        actions: [
          IconButton(
              onPressed: _busy ? null : _csv,
              icon: const Icon(Icons.file_download_outlined),
              tooltip: 'تصدير CSV')
        ],
      ),
      body: Column(
        children: [
          Padding(
              padding: const EdgeInsets.all(12),
              child: SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 1, label: Text('اليوم')),
                    ButtonSegment(value: 7, label: Text('7 أيام')),
                    ButtonSegment(value: 30, label: Text('30 يوم')),
                    ButtonSegment(value: 0, label: Text('مخصص')),
                  ],
                  selected: {_days},
                  onSelectionChanged: (s) => _onDays(s.first))),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Expanded(
                    child: DropdownButtonFormField<int?>(
                        value: _cashierId,
                        decoration: const InputDecoration(
                            labelText: 'الكاشير',
                            border: OutlineInputBorder(),
                            isDense: true),
                        items: [
                          const DropdownMenuItem<int?>(value: null, child: Text('الكل')),
                          ..._cashiers
                              .map((c) => DropdownMenuItem<int?>(value: c.id, child: Text(c.name)))
                        ],
                        onChanged: (v) {
                          setState(() => _cashierId = v);
                          _load();
                        })),
                const SizedBox(width: 8),
                Expanded(
                    child: DropdownButtonFormField<String?>(
                        value: _action,
                        decoration: const InputDecoration(
                            labelText: 'العملية',
                            border: OutlineInputBorder(),
                            isDense: true),
                        items: [
                          const DropdownMenuItem<String?>(value: null, child: Text('الكل')),
                          ..._actions.map((a) =>
                              DropdownMenuItem<String?>(value: a, child: Text(auditActionLabel(a))))
                        ],
                        onChanged: (v) {
                          setState(() => _action = v);
                          _load();
                        })),
              ])),
          const SizedBox(height: 8),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                  onChanged: (v) {
                    _search = v;
                    _load();
                  },
                  decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.search),
                      hintText: 'ابحث...',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Text('الفترة: $_label',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Text('عدد: ${_entries.length}',
                    style: const TextStyle(color: Colors.grey)),
              ])),
          const SizedBox(height: 8),
          Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _entries.isEmpty
                      ? const Center(child: Text('لا توجد سجلات'))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                              itemCount: _entries.length,
                              itemBuilder: (ctx, i) {
                                final e = _entries[i];
                                final col = auditActionColor(e.action);
                                return ListTile(
                                  leading: CircleAvatar(
                                      backgroundColor: col.withValues(alpha: 0.15),
                                      child: Icon(auditActionIcon(e.action),
                                          color: col, size: 20)),
                                  title: Text(auditActionLabel(e.action)),
                                  subtitle: Text(
                                      '${e.details.isEmpty ? (e.entity.isEmpty ? '-' : e.entity) : e.details}\n${e.cashierName} • ${formatDateTime(e.createdAt)}'),
                                  isThreeLine: true,
                                  trailing: Text('#${e.id ?? ''}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold, color: Colors.grey)),
                                  onTap: () => _details(e),
                                );
                              }))),
        ],
      ),
    );
  }
}
