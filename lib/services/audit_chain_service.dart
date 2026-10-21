import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:sqflite/sqflite.dart';
import '../db.dart';
import '../models.dart';

class AuditChainService {
  static bool _ready = false;
  static const String _genesis = '0000000000000000000000000000000000000000000000000000000000000000';

  static Future<void> _ensure() async {
    if (_ready) return;
    final d = await LocalDB.db;
    await d.execute(
        'CREATE TABLE IF NOT EXISTS audit_chain(seq INTEGER PRIMARY KEY,audit_id INTEGER NOT NULL,action TEXT NOT NULL DEFAULT \'\',details TEXT NOT NULL DEFAULT \'\',created_at TEXT NOT NULL DEFAULT \'\',prev_hash TEXT NOT NULL DEFAULT \'\',record_hash TEXT NOT NULL DEFAULT \'\')');
    _ready = true;
  }

  static String _hash(String payload) => sha256.convert(utf8.encode(payload)).toString();

  static String _payload(int seq, int auditId, String action, String entity, int? entityId,
      String details, String createdAt, String prevHash) {
    return '$seq|$auditId|$action|$entity|${entityId ?? -1}|$details|$createdAt|$prevHash';
  }

  static Future<int> buildChain() async {
    await _ensure();
    final d = await LocalDB.db;
    final rows = await d.query('audit_log', orderBy: 'id ASC');

    await d.transaction((txn) async {
      await txn.delete('audit_chain');
      String prev = _genesis;
      int seq = 0;
      for (final r in rows) {
        seq++;
        final auditId = (r['id'] as num).toInt();
        final action = (r['action'] as String?) ?? '';
        final entity = (r['entity'] as String?) ?? '';
        final entityId = r['entity_id'] as int?;
        final details = (r['details'] as String?) ?? '';
        final createdAt = (r['created_at'] as String?) ?? '';
        final payload = _payload(seq, auditId, action, entity, entityId, details, createdAt, prev);
        final h = _hash(payload);
        await txn.insert('audit_chain', {
          'seq': seq,
          'audit_id': auditId,
          'action': action,
          'details': details,
          'created_at': createdAt,
          'prev_hash': prev,
          'record_hash': h,
        });
        prev = h;
      }
    });
    return rows.length;
  }

  static Future<List<AuditChainRecord>> getRecords({int limit = 50}) async {
    await _ensure();
    final d = await LocalDB.db;
    final rows = await d.query('audit_chain', orderBy: 'seq DESC', limit: limit);
    return rows.map(AuditChainRecord.fromMap).toList();
  }

  static Future<int> count() async {
    await _ensure();
    final d = await LocalDB.db;
    final r = await d.rawQuery('SELECT COUNT(*) c FROM audit_chain');
    return (r.first['c'] as num?)?.toInt() ?? 0;
  }

  static Future<ChainVerifyResult> verify() async {
    await _ensure();
    final d = await LocalDB.db;
    final logs = await d.query('audit_log', orderBy: 'id ASC');
    final chain = await d.query('audit_chain', orderBy: 'seq ASC');

    if (logs.length != chain.length) {
      return ChainVerifyResult(
        ok: false,
        checked: chain.length,
        brokenAtSeq: chain.length + 1,
        message: 'عدد السجلات في السلسلة (${chain.length}) لا يطابق سجل التدقيق (${logs.length})',
      );
    }

    String prev = _genesis;
    for (int i = 0; i < logs.length; i++) {
      final l = logs[i];
      final c = chain[i];
      final seq = i + 1;
      final auditId = (l['id'] as num).toInt();
      final action = (l['action'] as String?) ?? '';
      final entity = (l['entity'] as String?) ?? '';
      final entityId = l['entity_id'] as int?;
      final details = (l['details'] as String?) ?? '';
      final createdAt = (l['created_at'] as String?) ?? '';

      final cSeq = (c['seq'] as num?)?.toInt() ?? 0;
      final cAudit = (c['audit_id'] as num?)?.toInt() ?? 0;
      final cPrev = (c['prev_hash'] as String?) ?? '';
      final cHash = (c['record_hash'] as String?) ?? '';

      if (cSeq != seq || cAudit != auditId || cPrev != prev) {
        return ChainVerifyResult(
          ok: false,
          checked: seq,
          brokenAtSeq: seq,
          message: 'عدم تطابق في الترتيب/الربط عند التسلسل #$seq',
        );
      }

      final payload = _payload(seq, auditId, action, entity, entityId, details, createdAt, prev);
      final expected = _hash(payload);
      if (expected != cHash) {
        return ChainVerifyResult(
          ok: false,
          checked: seq,
          brokenAtSeq: seq,
          message: 'تلاعب مكتشف: تجزئة السجل #$seq لا تطابق محتواه',
        );
      }
      prev = cHash;
    }

    return ChainVerifyResult(
      ok: true,
      checked: logs.length,
      message: logs.isEmpty ? 'السلسلة فارغة (لا سجلات تدقيق بعد)' : 'السلسلة سليمة: ${logs.length} سجل مرتبط بتجزئة تراكمية',
    );
  }
}
