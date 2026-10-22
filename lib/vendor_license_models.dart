class VendorLicense {
  final String shopId;
  final String shopName;
  final String ownerName;
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
  final String rawJson;
  final String importedAt;
  final String supportPhone;

  VendorLicense({
    required this.shopId,
    required this.shopName,
    required this.ownerName,
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
    required this.rawJson,
    required this.importedAt,
    this.supportPhone = '',
  });

  bool get isExpired {
    if (expiresAt.isEmpty) return false;
    final e = DateTime.tryParse(expiresAt);
    if (e == null) return false;
    return DateTime.now().isAfter(e);
  }

  bool get inGrace {
    if (!isExpired || graceDays <= 0) return false;
    final e = DateTime.tryParse(expiresAt);
    if (e == null) return false;
    final end = e.add(Duration(days: graceDays));
    return !DateTime.now().isAfter(end);
  }

  bool get isBlocked => status != 'active' || (isExpired && !inGrace);

  bool hasFeature(String feature) {
    if (status != 'active') return false;
    return features.contains('*') || features.contains(feature);
  }

  Map<String, dynamic> toMap() => {
        'id': 1,
        'shop_id': shopId,
        'shop_name': shopName,
        'owner_name': ownerName,
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
        'raw_json': rawJson,
        'imported_at': importedAt,
        'support_phone': supportPhone,
      };

  factory VendorLicense.fromMap(Map<String, dynamic> m) {
    final f = (m['features'] as String?) ?? '';
    return VendorLicense(
      shopId: (m['shop_id'] as String?) ?? '',
      shopName: (m['shop_name'] as String?) ?? '',
      ownerName: (m['owner_name'] as String?) ?? '',
      plan: (m['plan'] as String?) ?? 'trial',
      features: f.split(',').where((e) => e.isNotEmpty).toList(),
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
      rawJson: (m['raw_json'] as String?) ?? '',
      importedAt: (m['imported_at'] as String?) ?? '',
      supportPhone: (m['support_phone'] as String?) ?? '',
    );
  }
}
