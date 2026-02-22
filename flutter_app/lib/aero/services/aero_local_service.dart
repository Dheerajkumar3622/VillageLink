import 'dart:convert';
import 'package:get_storage/get_storage.dart';
import '../models/aero_reading.dart';

/// Offline Cache Service using GetStorage
class AeroLocalService {
  static const String _cacheKey = 'aero_cache';
  static const String _commandQueueKey = 'aero_command_queue';
  static const String _presetsKey = 'aero_presets_cache';
  
  final GetStorage _storage = GetStorage();

  // ==================== READING CACHE ====================

  void cacheReading(String deviceId, AeroReading reading) {
    try {
      final cache = _storage.read<Map<String, dynamic>>(_cacheKey) ?? {};
      cache[deviceId] = {
        ...reading.toJson(),
        'cachedAt': DateTime.now().millisecondsSinceEpoch,
      };
      _storage.write(_cacheKey, cache);
    } catch (e) {
      print('Cache error: $e');
    }
  }

  AeroReading? getCachedReading(String deviceId) {
    try {
      final cache = _storage.read<Map<String, dynamic>>(_cacheKey);
      if (cache != null && cache[deviceId] != null) {
        return AeroReading.fromJson(cache[deviceId]);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ==================== COMMAND QUEUE ====================

  void queueCommand(Map<String, dynamic> command) {
    try {
      final queue = _storage.read<List<dynamic>>(_commandQueueKey) ?? [];
      queue.add({
        ...command,
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
      _storage.write(_commandQueueKey, queue);
    } catch (e) {
      print('Queue error: $e');
    }
  }

  List<Map<String, dynamic>> getQueuedCommands() {
    try {
      final queue = _storage.read<List<dynamic>>(_commandQueueKey) ?? [];
      return queue.map((c) => Map<String, dynamic>.from(c)).toList();
    } catch (e) {
      return [];
    }
  }

  void clearCommandQueue() {
    _storage.write(_commandQueueKey, []);
  }

  // ==================== PRESETS CACHE ====================

  void cachePresets(List<dynamic> presets) {
    _storage.write(_presetsKey, json.encode(presets));
  }

  List<dynamic>? getCachedPresets() {
    try {
      final data = _storage.read<String>(_presetsKey);
      if (data != null) {
        return json.decode(data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ==================== UTILITIES ====================

  void clearAllCache() {
    _storage.remove(_cacheKey);
    _storage.remove(_commandQueueKey);
    _storage.remove(_presetsKey);
  }
}
