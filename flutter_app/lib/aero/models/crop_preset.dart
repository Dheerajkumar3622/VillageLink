/// Crop Preset Model
class CropPreset {
  final String id;
  final String nameHi;
  final String nameEn;
  final String icon;
  final double pHMin;
  final double pHMax;
  final double ecMin;
  final double ecMax;
  final int tempMin;
  final int tempMax;
  final int expectedDays;
  final int mistOnSeconds;
  final int mistOffSeconds;
  final String? description;
  final String? descriptionHi;

  CropPreset({
    required this.id,
    required this.nameHi,
    required this.nameEn,
    required this.icon,
    required this.pHMin,
    required this.pHMax,
    required this.ecMin,
    required this.ecMax,
    required this.tempMin,
    required this.tempMax,
    required this.expectedDays,
    required this.mistOnSeconds,
    required this.mistOffSeconds,
    this.description,
    this.descriptionHi,
  });

  factory CropPreset.fromJson(Map<String, dynamic> json) {
    return CropPreset(
      id: json['id'] ?? '',
      nameHi: json['nameHi'] ?? '',
      nameEn: json['nameEn'] ?? '',
      icon: json['icon'] ?? '🌱',
      pHMin: (json['pHMin'] ?? 5.5).toDouble(),
      pHMax: (json['pHMax'] ?? 7.0).toDouble(),
      ecMin: (json['ecMin'] ?? 1.0).toDouble(),
      ecMax: (json['ecMax'] ?? 2.5).toDouble(),
      tempMin: json['tempMin'] ?? 15,
      tempMax: json['tempMax'] ?? 25,
      expectedDays: json['expectedDays'] ?? 30,
      mistOnSeconds: json['mistOnSeconds'] ?? 15,
      mistOffSeconds: json['mistOffSeconds'] ?? 300,
      description: json['description'],
      descriptionHi: json['descriptionHi'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nameHi': nameHi,
        'nameEn': nameEn,
        'icon': icon,
        'pHMin': pHMin,
        'pHMax': pHMax,
        'ecMin': ecMin,
        'ecMax': ecMax,
        'tempMin': tempMin,
        'tempMax': tempMax,
        'expectedDays': expectedDays,
        'mistOnSeconds': mistOnSeconds,
        'mistOffSeconds': mistOffSeconds,
        'description': description,
        'descriptionHi': descriptionHi,
      };
}
