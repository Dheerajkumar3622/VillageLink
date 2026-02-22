import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../config.dart';
import '../models/aero_reading.dart';
import '../models/aero_alert.dart';

/// Socket.IO Service for real-time aeroponics data
class AeroSocketService {
  io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  void connect() {
    if (_socket?.connected == true) return;

    _socket = io.io(
      ApiConfig.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build(),
    );

    _socket!.onConnect((_) {
      print('🌿 Aero Socket connected');
      _isConnected = true;
    });

    _socket!.onDisconnect((_) {
      print('🔌 Aero Socket disconnected');
      _isConnected = false;
    });

    _socket!.onError((error) {
      print('❌ Socket error: $error');
    });
  }

  void subscribeToDevice(
    String deviceId, {
    Function(AeroReading)? onLiveData,
    Function(AeroAlert)? onAlert,
  }) {
    if (_socket == null) connect();

    // Subscribe to device room
    _socket!.emit('subscribe_aero', deviceId);

    // Listen for live data
    if (onLiveData != null) {
      _socket!.on('aero_live_$deviceId', (data) {
        try {
          onLiveData(AeroReading.fromJson(data));
        } catch (e) {
          print('Error parsing live data: $e');
        }
      });
    }

    // Listen for alerts
    if (onAlert != null) {
      _socket!.on('aero_alert_$deviceId', (data) {
        try {
          onAlert(AeroAlert.fromJson(data));
        } catch (e) {
          print('Error parsing alert: $e');
        }
      });
    }
  }

  void unsubscribeFromDevice(String deviceId) {
    _socket?.emit('unsubscribe_aero', deviceId);
    _socket?.off('aero_live_$deviceId');
    _socket?.off('aero_alert_$deviceId');
  }

  void sendCommand(String deviceId, String command, [dynamic value, String? towerId]) {
    _socket?.emit('aero_command', {
      'device_id': deviceId,
      'command': command,
      if (value != null) 'value': value,
      if (towerId != null) 'tower_id': towerId,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
