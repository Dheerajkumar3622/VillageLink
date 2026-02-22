/// Live Sensor Reading Model
class AeroReading {
  final String? id;
  final String deviceId;
  final String? towerId;
  final double pH;
  final double ec;
  final double waterTemp;
  final double? ambientTemp;
  final double? humidity;
  final int tankLevel;
  final String pumpStatus;
  final bool mistingActive;
  final int recordedAt;
  final bool isOnline;
  final String? pHStatus;
  final String? ecStatus;
  final String? tankStatus;
  final bool isDemoData;

  AeroReading({
    this.id,
    required this.deviceId,
    this.towerId,
    required this.pH,
    required this.ec,
    required this.waterTemp,
    this.ambientTemp,
    this.humidity,
    required this.tankLevel,
    this.pumpStatus = 'AUTO',
    this.mistingActive = false,
    required this.recordedAt,
    this.isOnline = true,
    this.pHStatus,
    this.ecStatus,
    this.tankStatus,
    this.isDemoData = false,
  });

  factory AeroReading.fromJson(Map<String, dynamic> json) {
    return AeroReading(
      id: json['id'],
      deviceId: json['deviceId'] ?? '',
      towerId: json['towerId'],
      pH: (json['pH'] ?? 0).toDouble(),
      ec: (json['ec'] ?? 0).toDouble(),
      waterTemp: (json['waterTemp'] ?? 0).toDouble(),
      ambientTemp: json['ambientTemp']?.toDouble(),
      humidity: json['humidity']?.toDouble(),
      tankLevel: json['tankLevel'] ?? 0,
      pumpStatus: json['pumpStatus'] ?? 'AUTO',
      mistingActive: json['mistingActive'] ?? false,
      recordedAt: json['recordedAt'] ?? json['lastUpdate'] ?? DateTime.now().millisecondsSinceEpoch,
      isOnline: json['isOnline'] ?? true,
      pHStatus: json['pHStatus'],
      ecStatus: json['ecStatus'],
      tankStatus: json['tankStatus'],
      isDemoData: json['isDemoData'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'deviceId': deviceId,
        'towerId': towerId,
        'pH': pH,
        'ec': ec,
        'waterTemp': waterTemp,
        'ambientTemp': ambientTemp,
        'humidity': humidity,
        'tankLevel': tankLevel,
        'pumpStatus': pumpStatus,
        'mistingActive': mistingActive,
        'recordedAt': recordedAt,
        'isOnline': isOnline,
        'pHStatus': pHStatus,
        'ecStatus': ecStatus,
        'tankStatus': tankStatus,
        'isDemoData': isDemoData,
      };
}
