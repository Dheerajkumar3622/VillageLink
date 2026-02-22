/// Aeroponics Alert Model
class AeroAlert {
  final String id;
  final String deviceId;
  final String? towerId;
  final String type;
  final String severity;
  final String message;
  final String? messageHi;
  final dynamic value;
  final dynamic threshold;
  final bool acknowledged;
  final int? acknowledgedAt;
  final int timestamp;

  AeroAlert({
    required this.id,
    required this.deviceId,
    this.towerId,
    required this.type,
    required this.severity,
    required this.message,
    this.messageHi,
    this.value,
    this.threshold,
    this.acknowledged = false,
    this.acknowledgedAt,
    required this.timestamp,
  });

  factory AeroAlert.fromJson(Map<String, dynamic> json) {
    return AeroAlert(
      id: json['id'] ?? '',
      deviceId: json['deviceId'] ?? '',
      towerId: json['towerId'],
      type: json['type'] ?? 'UNKNOWN',
      severity: json['severity'] ?? 'INFO',
      message: json['message'] ?? '',
      messageHi: json['messageHi'],
      value: json['value'],
      threshold: json['threshold'],
      acknowledged: json['acknowledged'] ?? false,
      acknowledgedAt: json['acknowledgedAt'],
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'deviceId': deviceId,
        'towerId': towerId,
        'type': type,
        'severity': severity,
        'message': message,
        'messageHi': messageHi,
        'value': value,
        'threshold': threshold,
        'acknowledged': acknowledged,
        'acknowledgedAt': acknowledgedAt,
        'timestamp': timestamp,
      };
}

/// Harvest Prediction Model
class AeroPrediction {
  final String deviceId;
  final String? towerId;
  final String? cropName;
  final String? cropNameHi;
  final int? plantedAt;
  final int expectedDays;
  final int daysElapsed;
  final int daysRemaining;
  final int healthScore;
  final String growthStage;
  final String? recommendation;
  final String? recommendationHi;

  AeroPrediction({
    required this.deviceId,
    this.towerId,
    this.cropName,
    this.cropNameHi,
    this.plantedAt,
    this.expectedDays = 30,
    this.daysElapsed = 0,
    this.daysRemaining = 0,
    this.healthScore = 85,
    this.growthStage = 'SEEDLING',
    this.recommendation,
    this.recommendationHi,
  });

  factory AeroPrediction.fromJson(Map<String, dynamic> json) {
    return AeroPrediction(
      deviceId: json['deviceId'] ?? '',
      towerId: json['towerId'],
      cropName: json['cropName'],
      cropNameHi: json['cropNameHi'],
      plantedAt: json['plantedAt'],
      expectedDays: json['expectedDays'] ?? 30,
      daysElapsed: json['daysElapsed'] ?? 0,
      daysRemaining: json['daysRemaining'] ?? 0,
      healthScore: json['healthScore'] ?? 85,
      growthStage: json['growthStage'] ?? 'SEEDLING',
      recommendation: json['recommendation'],
      recommendationHi: json['recommendationHi'],
    );
  }
}
