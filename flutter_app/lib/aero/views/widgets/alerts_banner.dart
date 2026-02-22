import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../models/aero_alert.dart';

/// Alerts Banner Widget
class AlertsBanner extends StatelessWidget {
  final List<AeroAlert> alerts;
  final Function(String) onAcknowledge;

  const AlertsBanner({
    super.key,
    required this.alerts,
    required this.onAcknowledge,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFFFEF3C7),
            const Color(0xFFFDE68A).withOpacity(0.5),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.notifications_active, color: Color(0xFFD97706), size: 18),
              const SizedBox(width: 8),
              Text(
                '${'alerts'.tr} (${alerts.length})',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFFD97706),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...alerts.take(2).map((alert) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          alert.messageHi ?? alert.message,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF92400E),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => onAcknowledge(alert.id),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFCD34D),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            '✓',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
