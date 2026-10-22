class DeviceIdentity {
  final String shopId;
  final String deviceId;
  final String deviceName;
  final String employeeName;
  final String role;
  final List<String> permissions;
  final String issuedAt;
  final String expiresAt;
  final String status;

  DeviceIdentity({
    required this.shopId,
    required this.deviceId,
    required this.deviceName,
    required this.employeeName,
    required this.role,
    required this.permissions,
    required this.issuedAt,
    required this.expiresAt,
    required this.status,
  });

  bool get isOwner => role == 'owner';

  Map<String, dynamic> toMap() => {
        'id': 1,
        'shop_id': shopId,
        'device_id': deviceId,
        'device_name': deviceName,
        'employee_name': employeeName,
        'role': role,
        'permissions': permissions.join(','),
        'issued_at': issuedAt,
        'expires_at': expiresAt,
        'status': status,
      };

  factory DeviceIdentity.fromMap(Map<String, dynamic> m) => DeviceIdentity(
        shopId: (m['shop_id'] as String?) ?? '',
        deviceId: (m['device_id'] as String?) ?? '',
        deviceName: (m['device_name'] as String?) ?? '',
        employeeName: (m['employee_name'] as String?) ?? '',
        role: (m['role'] as String?) ?? 'pending',
        permissions: ((m['permissions'] as String?) ?? '')
            .split(',')
            .where((e) => e.isNotEmpty)
            .toList(),
        issuedAt: (m['issued_at'] as String?) ?? '',
        expiresAt: (m['expires_at'] as String?) ?? '',
        status: (m['status'] as String?) ?? 'pending',
      );
}

class RegisteredDevice {
  final String deviceId;
  final String deviceName;
  final String employeeName;
  final String role;
  final List<String> permissions;
  final String issuedAt;
  final String expiresAt;
  final String status;

  RegisteredDevice({
    required this.deviceId,
    required this.deviceName,
    required this.employeeName,
    required this.role,
    required this.permissions,
    required this.issuedAt,
    required this.expiresAt,
    required this.status,
  });

  bool get isActive => status == 'active';
  bool get isRevoked => status == 'revoked';

  Map<String, dynamic> toMap() => {
        'device_id': deviceId,
        'device_name': deviceName,
        'employee_name': employeeName,
        'role': role,
        'permissions': permissions.join(','),
        'issued_at': issuedAt,
        'expires_at': expiresAt,
        'status': status,
      };

  factory RegisteredDevice.fromMap(Map<String, dynamic> m) => RegisteredDevice(
        deviceId: (m['device_id'] as String?) ?? '',
        deviceName: (m['device_name'] as String?) ?? '',
        employeeName: (m['employee_name'] as String?) ?? '',
        role: (m['role'] as String?) ?? 'cashier',
        permissions: ((m['permissions'] as String?) ?? '')
            .split(',')
            .where((e) => e.isNotEmpty)
            .toList(),
        issuedAt: (m['issued_at'] as String?) ?? '',
        expiresAt: (m['expires_at'] as String?) ?? '',
        status: (m['status'] as String?) ?? 'active',
      );
}
