import 'package:get/get.dart';
import '../models/aero_device.dart';
import '../models/aero_reading.dart';
import '../models/crop_preset.dart';
import '../models/aero_alert.dart';
import '../services/aero_api_service.dart';
import '../services/aero_local_service.dart';
import '../services/aero_socket_service.dart';

/// GetX Controller for Aeroponics Module
class AeroController extends GetxController {
  final AeroApiService _api = AeroApiService();
  final AeroLocalService _local = AeroLocalService();
  final AeroSocketService _socket = AeroSocketService();

  // Observable state
  final devices = <AeroDevice>[].obs;
  final selectedDevice = Rxn<AeroDevice>();
  final selectedTower = Rxn<AeroTower>();
  final liveData = Rxn<AeroReading>();
  final prediction = Rxn<AeroPrediction>();
  final alerts = <AeroAlert>[].obs;
  final presets = <CropPreset>[].obs;
  
  final isLoading = false.obs;
  final isSending = false.obs;
  final isOnline = true.obs;

  @override
  void onInit() {
    super.onInit();
    loadInitialData();
  }

  @override
  void onClose() {
    _socket.disconnect();
    super.onClose();
  }

  // ==================== DATA LOADING ====================

  Future<void> loadInitialData() async {
    isLoading.value = true;
    try {
      final [devicesData, presetsData] = await Future.wait([
        _api.getDevices(),
        _api.getPresets(),
      ]);

      devices.value = devicesData as List<AeroDevice>;
      presets.value = presetsData as List<CropPreset>;

      if (devices.isNotEmpty) {
        selectDevice(devices.first);
      }
    } catch (e) {
      print('Error loading data: $e');
    }
    isLoading.value = false;
  }

  void selectDevice(AeroDevice device) {
    selectedDevice.value = device;
    if (device.towers.isNotEmpty) {
      selectTower(device.towers.first);
    } else {
      selectedTower.value = null;
    }
    _loadDeviceData(device.id);
    _subscribeToDevice(device.id);
  }

  void selectTower(AeroTower tower) {
    selectedTower.value = tower;
    _loadPrediction();
  }

  Future<void> _loadDeviceData(String deviceId) async {
    // Try cache first
    final cached = _local.getCachedReading(deviceId);
    if (cached != null) {
      liveData.value = cached;
    }

    // Fetch fresh data
    final [reading, alertsData] = await Future.wait([
      _api.getLiveData(deviceId),
      _api.getAlerts(deviceId, unacknowledgedOnly: true),
    ]);

    if (reading != null) {
      liveData.value = reading as AeroReading;
      _local.cacheReading(deviceId, reading);
      isOnline.value = reading.isOnline;
    }

    alerts.value = alertsData as List<AeroAlert>;
    await _loadPrediction();
  }

  Future<void> _loadPrediction() async {
    final device = selectedDevice.value;
    final tower = selectedTower.value;
    if (device == null) return;

    final pred = await _api.getPrediction(device.id, tower?.id);
    prediction.value = pred;
  }

  void _subscribeToDevice(String deviceId) {
    _socket.subscribeToDevice(
      deviceId,
      onLiveData: (data) {
        liveData.value = data;
        _local.cacheReading(deviceId, data);
        isOnline.value = data.isOnline;
      },
      onAlert: (alert) {
        alerts.add(alert);
      },
    );
  }

  // ==================== COMMANDS ====================

  Future<void> sendCommand(String command, [dynamic value]) async {
    final device = selectedDevice.value;
    if (device == null) return;

    isSending.value = true;
    try {
      await _api.sendCommand(device.id, command, value, selectedTower.value?.id);
      // Refresh live data after command
      final data = await _api.getLiveData(device.id);
      if (data != null) {
        liveData.value = data;
      }
    } catch (e) {
      // Queue command for offline sync
      _local.queueCommand({
        'deviceId': device.id,
        'command': command,
        'value': value,
        'towerId': selectedTower.value?.id,
      });
    }
    isSending.value = false;
  }

  Future<void> startMist() => sendCommand('START_MIST');
  Future<void> stopMist() => sendCommand('STOP_MIST');
  Future<void> setAutoMode() => sendCommand('SET_MODE', 'AUTO');
  Future<void> setManualMode() => sendCommand('SET_MODE', 'MANUAL');

  // ==================== CROP PLANTING ====================

  Future<bool> plantCrop(CropPreset preset) async {
    final tower = selectedTower.value;
    if (tower == null) return false;

    isSending.value = true;
    final success = await _api.plantCrop(tower.id, preset.id);
    if (success) {
      await loadInitialData(); // Refresh all data
    }
    isSending.value = false;
    return success;
  }

  // ==================== ALERTS ====================

  Future<void> acknowledgeAlert(String alertId) async {
    await _api.acknowledgeAlert(alertId);
    alerts.removeWhere((a) => a.id == alertId);
  }

  // ==================== PAIRING ====================

  Future<Map<String, dynamic>> pairDevice(String deviceId, String macAddress) async {
    isSending.value = true;
    final result = await _api.pairDevice(deviceId, macAddress);
    if (result['success'] == true) {
      await loadInitialData();
    }
    isSending.value = false;
    return result;
  }

  // ==================== HISTORY ====================

  Future<List<AeroReading>> getHistory({String period = '24h'}) async {
    final device = selectedDevice.value;
    if (device == null) return [];
    return await _api.getHistory(device.id, period: period, towerId: selectedTower.value?.id);
  }

  // ==================== UTILITIES ====================

  String formatStatus(String status) {
    final map = {
      'LOW': 'low'.tr,
      'NORMAL': 'normal'.tr,
      'HIGH': 'high'.tr,
      'FULL': 'full'.tr,
    };
    return map[status] ?? status;
  }

  void refresh() => loadInitialData();
}
