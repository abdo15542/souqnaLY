import 'package:flutter/material.dart';
import '../audit_labels.dart';
import '../db.dart';
import '../models.dart';
import '../services/export_service.dart';
import '../services/pdf_report.dart';
import '../utils.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});
  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  bool _loading = true;
  bool _busy = false;
  int _days = 7;
  DateTimeRange? _customRange;
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
    _loadEntries();
  }

  DateTime? get _from {
    if (_days == 0) return _customRange?.start;
    final now = DateTime.now();
    final day = DateTime(now.year, now.month, now.day);
    return day.subtract(Duration(days: _days - 1));
  }

  DateTime? get _toExclusive {
    if (_days == 0) {
      final end = _customRange?.end;
      if (end == null) return null;
      return DateTime(end.year, end.month, end.day).add(const Duration(days: 1));
    }
    return null;
  }

  String get _periodLabel {
    if (_days == 0) {
      if (_customRange == null) return 'فترة مخصصة';
      return '${formatDate(_customRange!.start.toIso8601String())} إلى ${formatDate(_customRange!.end.toIso8601String())}';
    }
    if (_days == 1) return 'اليوم';
    if (_days == 7) return 'آخر 7 أيام';
    if (_days == 30) return 'آخر 30 يوم';
    return 'كل الفترات';
  }

  Future<void> _loadFilters() async {
    final cashiers = await LocalDB.getCashiers();
    final actions = await LocalDB.getAuditActions();
    if (!mounted) return;
    setState(() {
      _cashiers = cashiers;
      _actions = actions;
    });
  }

  Future<void> _loadEntries() async {
    setState(() => _loading = true);
    final entries = await LocalDB.getAuditLogFiltered(from: _from, to: _toExclusive, cashierId: _cashierId, action: _action, search: _search, limit: 500);
    final settings = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _entries = entries;
      _settings = settings;
      _loading = false;
    });
  }

  Future<void> _onDaysSelected(int value) async {
    if (value == 0) {
      final now = DateTime.now();
      final picked = await showDateRangePicker(
        context: context,
        firstDate: DateTime(now.year - 2),
        lastDate: DateTime(now.year + 1),
        initialDateRange: _customRange ?? DateTimeRange(start: now.subtract(const Duration(days: 6)), end: now),
      );
      if (picked == null) { setState(() {}); return; }
      setState(() { _days = 0; _customRange = picked; });
    } else {
      setState(() { _days = value; _customRange = null; });
    }
    _loadEntries();
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _exportCsv() async {
    setState(() => _busy = true);
    try {
      await ExportService.exportAuditCsv(from: _from, to: _toExclusive, cashierId: _cashierId, action: _action, search: _search);
      _showMessage('تم تصدير سجل التدقيق CSV');
    } catch (e) {
      _showMessage('فشل تصدير CSV: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exportPdf() async {
    setState(() => _busy = true);
    try {
      await PdfReportService.buildAuditAndShare(entries: _entries, periodLabel: _periodLabel, settings: _settings);
      _showMessage('تم توليد سجل التدقيق PDF');
    } catch (e) {
      _showMessage('فشل توليد PDF: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showDetails(AuditEntry entry) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('تفاصيل العملية', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        _detailRow('معرّف السجل', '${entry.id ?? '-'}'),
        _detailRow('الوقت', formatDateTime(entry.createdAt)),
        _detailRow('الكاشير', entry.cashierName),
        _detailRow('العملية', auditActionLabel(entry.action)),
        _detailRow('الكيان', entry.entity.isEmpty ? '-' : entry.entity),
        _detailRow('معرّف الكيان', '${entry.entityId ?? '-'}'),
        _detailRow('التفاصيل', entry.details.isEmpty ? '-' : entry.details),
        const SizedBox(height: 16),
        FilledButton(onPressed: () => Navigator.pop(ctx), child: const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('إغلاق'))),
      ]))),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
      Expanded(child: Text(value, textDirection: TextDirection.rtl)),
    ]));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('سجل التدقيق'),
        actions: [
          IconButton(onPressed: _busy ? null : _exportCsv, icon: const Icon(Icons.file_download_outlined), tooltip: 'تصدير CSV'),
          IconButton(onPressed: _busy ? null : _exportPdf, icon: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.picture_as_pdf_outlined), tooltip: 'تصدير PDF'),
        ],
      ),
      body: Column(
        children: [
          Padding(padding: const EdgeInsets.all(12), child: SegmentedButton<int>(segments: const [
            ButtonSegment(value: 1, label: Text('اليوم')),
            ButtonSegment(value: 7, label: Text('7 أيام')),
            ButtonSegment(value: 30, label: Text('30 يوم')),
            ButtonSegment(value: 0, label: Text('مخصص')),
          ], selected: {_days}, onSelectionChanged: (s) => _onDaysSelected(s.first))),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Row(children: [
            Expanded(child: DropdownButtonFormField<int?>(value: _cashierId, decoration: const InputDecoration(labelText: 'الكاشير', border: OutlineInputBorder(), isDense: true), items: [const DropdownMenuItem<int?>(value: null, child: Text('الكل')), ..._cashiers.map((c) => DropdownMenuItem<int?>(value: c.id, child: Text(c.name)))].toList(), onChanged: (v) { setState(() => _cashierId = v); _loadEntries(); })),
            const SizedBox(width: 8),
            Expanded(child: DropdownButtonFormField<String?>(value: _action, decoration: const InputDecoration(labelText: 'العملية', border: OutlineInputBorder(), isDense: true), items: [const DropdownMenuItem<String?>(value: null, child: Text('الكل')), ..._actions.map((a) => DropdownMenuItem<String?>(value: a, child: Text(auditActionLabel(a))))].toList(), onChanged: (v) { setState(() => _action = v); _loadEntries(); })),
          ])),
          const SizedBox(height: 8),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: TextField(onChanged: (v) { _search = v; _loadEntries(); }, decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: 'ابحث في الكاشير أو التفاصيل أو العملية...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))))),
          const SizedBox(height: 8),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Row(children: [
            Text('الفترة: $_periodLabel', style: const TextStyle(fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('عدد السجلات: ${_entries.length}', style: const TextStyle(color: Colors.grey)),
          ])),
          const SizedBox(height: 8),
          Expanded(child: _loading ? const Center(child: CircularProgressIndicator()) : _entries.isEmpty 
            ? const Center(child: Text('لا توجد سجلات مطابقة'))
            : RefreshIndicator(onRefresh: _loadEntries, child: ListView.builder(itemCount: _entries.length, itemBuilder: (ctx, i) {
                final e = _entries[i];
                final color = auditActionColor(e.action);
                final icon = auditActionIcon(e.action);
                final label = auditActionLabel(e.action);
                final subtitleParts = <String>[
                  e.details.isEmpty ? (e.entity.isEmpty ? '-' : e.entity) : e.details,
                  '${e.cashierName} • ${formatDateTime(e.createdAt)}',
                ];
                return ListTile(
                  leading: CircleAvatar(backgroundColor: color.withOpacity(0.15), child: Icon(icon, color: color, size: 20)),
                  title: Text(label),
                  subtitle: Text(subtitleParts.join('\n')),
                  isThreeLine: true,
                  trailing: Text('#${e.id ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                  onTap: () => _showDetails(e),
                );
              }))),
        ],
      ),
    );
  }
}
