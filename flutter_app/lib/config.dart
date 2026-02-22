/// API Configuration for KisanApp
class ApiConfig {
  static const String baseUrl = 'http://localhost:3000';
  static const String aeroPrefix = '/api/aero';
  
  // Aeroponics API endpoints
  static String get aeroDevices => '$baseUrl$aeroPrefix/devices';
  static String get aeroPair => '$baseUrl$aeroPrefix/devices/pair';
  static String aeroLive(String deviceId) => '$baseUrl$aeroPrefix/live/$deviceId';
  static String get aeroCommand => '$baseUrl$aeroPrefix/command';
  static String aeroPrediction(String deviceId) => '$baseUrl$aeroPrefix/predict/$deviceId';
  static String get aeroPresets => '$baseUrl$aeroPrefix/presets';
  static String aeroPlant(String towerId) => '$baseUrl$aeroPrefix/tower/$towerId/plant';
  static String aeroAlerts(String deviceId) => '$baseUrl$aeroPrefix/alerts/$deviceId';
  static String aeroHistory(String deviceId) => '$baseUrl$aeroPrefix/history/$deviceId';
}
