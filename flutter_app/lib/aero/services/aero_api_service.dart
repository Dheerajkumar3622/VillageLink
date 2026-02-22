import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:get_storage/get_storage.dart';
import '../../config.dart';
import '../models/aero_device.dart';
import '../models/aero_reading.dart';
import '../models/crop_preset.dart';
import '../models/aero_alert.dart';

/// Aero API Service - REST API communication
class AeroApiService {
  final GetStorage _storage = GetStorage();

  String? get _authToken => _storage.read('token');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  // ==================== DEVICE MANAGEMENT ====================

  Future<List<AeroDevice>> getDevices() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.aeroDevices),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((d) => AeroDevice.fromJson(d)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching devices: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> pairDevice(String deviceId, String macAddress, [String? name]) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.aeroPair),
        headers: _headers,
        body: json.encode({
          'deviceId': deviceId,
          'macAddress': macAddress,
          if (name != null) 'name': name,
        }),
      );
      final data = json.decode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'device': AeroDevice.fromJson(data['device'])};
      }
      return {'success': false, 'error': data['error'] ?? 'Pairing failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ==================== LIVE DATA ====================

  Future<AeroReading?> getLiveData(String deviceId) async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.aeroLive(deviceId)),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return AeroReading.fromJson(json.decode(response.body));
      }
      return null;
    } catch (e) {
      print('Error fetching live data: $e');
      return null;
    }
  }

  // ==================== COMMANDS ====================

  Future<Map<String, dynamic>> sendCommand(
    String deviceId,
    String command, [
    dynamic value,
    String? towerId,
  ]) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.aeroCommand),
        headers: _headers,
        body: json.encode({
          'device_id': deviceId,
          'command': command,
          if (value != null) 'value': value,
          if (towerId != null) 'towerId': towerId,
        }),
      );
      return json.decode(response.body);
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ==================== PREDICTIONS ====================

  Future<AeroPrediction?> getPrediction(String deviceId, [String? towerId]) async {
    try {
      String url = ApiConfig.aeroPrediction(deviceId);
      if (towerId != null) url += '?towerId=$towerId';
      
      final response = await http.get(Uri.parse(url), headers: _headers);
      if (response.statusCode == 200) {
        return AeroPrediction.fromJson(json.decode(response.body));
      }
      return null;
    } catch (e) {
      print('Error fetching prediction: $e');
      return null;
    }
  }

  // ==================== CROP PRESETS ====================

  Future<List<CropPreset>> getPresets() async {
    try {
      final response = await http.get(Uri.parse(ApiConfig.aeroPresets));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((p) => CropPreset.fromJson(p)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching presets: $e');
      return [];
    }
  }

  Future<bool> plantCrop(String towerId, String presetId) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.aeroPlant(towerId)),
        headers: _headers,
        body: json.encode({'presetId': presetId}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error planting crop: $e');
      return false;
    }
  }

  // ==================== ALERTS ====================

  Future<List<AeroAlert>> getAlerts(String deviceId, {bool unacknowledgedOnly = false}) async {
    try {
      String url = ApiConfig.aeroAlerts(deviceId);
      if (unacknowledgedOnly) url += '?unacknowledged=true';
      
      final response = await http.get(Uri.parse(url), headers: _headers);
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((a) => AeroAlert.fromJson(a)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching alerts: $e');
      return [];
    }
  }

  Future<bool> acknowledgeAlert(String alertId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.aeroDevices.replaceAll('/devices', '/alerts')}/$alertId/acknowledge'),
        headers: _headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ==================== HISTORY ====================

  Future<List<AeroReading>> getHistory(String deviceId, {String period = '24h', String? towerId}) async {
    try {
      String url = '${ApiConfig.aeroHistory(deviceId)}?period=$period';
      if (towerId != null) url += '&towerId=$towerId';
      
      final response = await http.get(Uri.parse(url), headers: _headers);
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((r) => AeroReading.fromJson(r)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching history: $e');
      return [];
    }
  }
}
