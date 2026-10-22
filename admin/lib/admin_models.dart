class Shop {
  final String id;
  final String name;
  final String ownerName;
  final String phone;
  final String plan;
  final String status;
  final String createdAt;
  final String updatedAt;

  Shop({
    required this.id,
    required this.name,
    required this.ownerName,
    this.phone = '',
    this.plan = 'trial',
    this.status = 'active',
    this.createdAt = '',
    this.updatedAt = '',
  });

  Map<String, dynamic> toMap() {
    final now = DateTime.now().toIso8601String();
    return {
      'id': id,
      'name': name,
      'owner_name': ownerName,
      'phone': phone,
      'plan': plan,
      'status': status,
      'created_at': createdAt.isEmpty ? now : createdAt,
      'updated_at': now,
    };
  }

  factory Shop.fromMap(Map<String, dynamic> m) => Shop(
        id: (m['id'] as String?) ?? '',
        name: (m['name'] as String?) ?? '',
        ownerName: (m['owner_name'] as String?) ?? '',
        phone: (m['phone'] as String?) ?? '',
        plan: (m['plan'] as String?) ?? 'trial',
        status: (m['status'] as String?) ?? 'active',
        createdAt: (m['created_at'] as String?) ?? '',
        updatedAt: (m['updated_at'] as String?) ?? '',
      );
}

class LicenseRecord {
  final int? id;
  final String shopId;
  final String plan;
  final List<String> features;
  final int maxDevices;
  final String issuedAt;
  final String expiresAt;
  final int graceDays;
  final bool allowExport;
  final bool allowBackup;
  final bool allowBranches;
  final String status;
  final String nonce;
  final String signature;
  final String code;
  final String createdAt;

  LicenseRecord({
    this.id,
    required this.shopId,
    required this.plan,
    required this.features,
    required this.maxDevices,
    required this.issuedAt,
    required this.expiresAt,
    required this.graceDays,
    required this.allowExport,
    required this.allowBackup,
    required this.allowBranches,
    required this.status,
    required this.nonce,
    required this.signature,
    required this.code,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'shop_id': shopId,
        'plan': plan,
        'features': features.join(','),
        'max_devices': maxDevices,
        'issued_at': issuedAt,
        'expires_at': expiresAt,
        'grace_days': graceDays,
        'allow_export': allowExport ? 1 : 0,
        'allow_backup': allowBackup ? 1 : 0,
        'allow_branches': allowBranches ? 1 : 0,
        'status': status,
        'nonce': nonce,
        'signature': signature,
        'code': code,
        'created_at': createdAt,
      };

  factory LicenseRecord.fromMap(Map<String, dynamic> m) => LicenseRecord(
        id: m['id'] as int?,
        shopId: (m['shop_id'] as String?) ?? '',
        plan: (m['plan'] as String?) ?? '',
        features: ((m['features'] as String?) ?? '')
            .split(',')
            .where((e) => e.isNotEmpty)
            .toList(),
        maxDevices: (m['max_devices'] as int?) ?? 0,
        issuedAt: (m['issued_at'] as String?) ?? '',
        expiresAt: (m['expires_at'] as String?) ?? '',
        graceDays: (m['grace_days'] as int?) ?? 0,
        allowExport: ((m['allow_export'] as int?) ?? 1) == 1,
        allowBackup: ((m['allow_backup'] as int?) ?? 1) == 1,
        allowBranches: ((m['allow_branches'] as int?) ?? 0) == 1,
        status: (m['status'] as String?) ?? 'active',
        nonce: (m['nonce'] as String?) ?? '',
        signature: (m['signature'] as String?) ?? '',
        code: (m['code'] as String?) ?? '',
        createdAt: (m['created_at'] as String?) ?? '',
      );
}
