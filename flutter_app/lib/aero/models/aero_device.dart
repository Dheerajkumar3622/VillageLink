/// Aeroponic Device Model
class AeroDevice {
  final String id;
  final String farmerId;
  final String name;
  final String location;
  final String status;
  final int tankCapacityLiters;
  final String? firmwareVersion;
  final String? macAddress;
  final bool isPaired;
  final int? pairedAt;
  final int? lastOnline;
  final int createdAt;
  final List<AeroTower> towers;

  AeroDevice({
    required this.id,
    required this.farmerId,
    required this.name,
    this.location = 'ROOF',
    this.status = 'ACTIVE',
    this.tankCapacityLiters = 60,
    this.firmwareVersion,
    this.macAddress,
    this.isPaired = true,
    this.pairedAt,
    this.lastOnline,
    required this.createdAt,
    this.towers = const [],
  });

  factory AeroDevice.fromJson(Map<String, dynamic> json) {
    return AeroDevice(
      id: json['id'] ?? '',
      farmerId: json['farmerId'] ?? '',
      name: json['name'] ?? 'Unknown Device',
      location: json['location'] ?? 'ROOF',
      status: json['status'] ?? 'ACTIVE',
      tankCapacityLiters: json['tankCapacityLiters'] ?? 60,
      firmwareVersion: json['firmwareVersion'],
      macAddress: json['macAddress'],
      isPaired: json['isPaired'] ?? true,
      pairedAt: json['pairedAt'],
      lastOnline: json['lastOnline'],
      createdAt: json['createdAt'] ?? DateTime.now().millisecondsSinceEpoch,
      towers: (json['towers'] as List<dynamic>?)
              ?.map((t) => AeroTower.fromJson(t))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'farmerId': farmerId,
        'name': name,
        'location': location,
        'status': status,
        'tankCapacityLiters': tankCapacityLiters,
        'firmwareVersion': firmwareVersion,
        'macAddress': macAddress,
        'isPaired': isPaired,
        'pairedAt': pairedAt,
        'lastOnline': lastOnline,
        'createdAt': createdAt,
        'towers': towers.map((t) => t.toJson()).toList(),
      };
}

/// Aeroponic Tower Model
class AeroTower {
  final String id;
  final String deviceId;
  final String name;
  final String? nameHi;
  final String location;
  final String? currentCrop;
  final String? currentCropHi;
  final String? presetId;
  final int? plantedAt;
  final int? expectedHarvestAt;
  final String status;

  AeroTower({
    required this.id,
    required this.deviceId,
    required this.name,
    this.nameHi,
    this.location = 'ROOF',
    this.currentCrop,
    this.currentCropHi,
    this.presetId,
    this.plantedAt,
    this.expectedHarvestAt,
    this.status = 'IDLE',
  });

  factory AeroTower.fromJson(Map<String, dynamic> json) {
    return AeroTower(
      id: json['id'] ?? '',
      deviceId: json['deviceId'] ?? '',
      name: json['name'] ?? 'Tower',
      nameHi: json['nameHi'],
      location: json['location'] ?? 'ROOF',
      currentCrop: json['currentCrop'],
      currentCropHi: json['currentCropHi'],
      presetId: json['presetId'],
      plantedAt: json['plantedAt'],
      expectedHarvestAt: json['expectedHarvestAt'],
      status: json['status'] ?? 'IDLE',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'deviceId': deviceId,
        'name': name,
        'nameHi': nameHi,
        'location': location,
        'currentCrop': currentCrop,
        'currentCropHi': currentCropHi,
        'presetId': presetId,
        'plantedAt': plantedAt,
        'expectedHarvestAt': expectedHarvestAt,
        'status': status,
      };
}
