import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../models/aero_reading.dart';

/// Control Buttons Card
class ControlsCard extends StatelessWidget {
  final AeroReading? liveData;
  final bool isSending;
  final VoidCallback onStartMist;
  final VoidCallback onStopMist;
  final VoidCallback onAutoMode;
  final VoidCallback onSelectCrop;

  const ControlsCard({
    super.key,
    required this.liveData,
    required this.isSending,
    required this.onStartMist,
    required this.onStopMist,
    required this.onAutoMode,
    required this.onSelectCrop,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.settings, color: Color(0xFF059669), size: 18),
              const SizedBox(width: 8),
              Text(
                'controls'.tr,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF059669),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 2.5,
            children: [
              _ControlButton(
                icon: Icons.play_arrow,
                label: 'startMist'.tr,
                color: const Color(0xFF10B981),
                isActive: liveData?.mistingActive == true,
                isLoading: isSending,
                onTap: onStartMist,
              ),
              _ControlButton(
                icon: Icons.stop,
                label: 'stopMist'.tr,
                color: const Color(0xFFEF4444),
                isActive: false,
                isLoading: isSending,
                onTap: onStopMist,
              ),
              _ControlButton(
                icon: Icons.bolt,
                label: 'autoMode'.tr,
                color: const Color(0xFF8B5CF6),
                isActive: liveData?.pumpStatus == 'AUTO',
                isLoading: isSending,
                onTap: onAutoMode,
              ),
              _ControlButton(
                icon: Icons.eco,
                label: 'selectCrop'.tr,
                color: const Color(0xFF059669),
                isActive: false,
                isLoading: false,
                onTap: onSelectCrop,
                outlined: true,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isActive;
  final bool isLoading;
  final VoidCallback onTap;
  final bool outlined;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.isActive,
    required this.isLoading,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: outlined
              ? color.withOpacity(0.1)
              : isActive
                  ? color
                  : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: outlined ? Border.all(color: color, width: 1.5) : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(
                    isActive || outlined ? color : Colors.white,
                  ),
                ),
              )
            else
              Icon(
                icon,
                size: 16,
                color: outlined
                    ? color
                    : isActive
                        ? Colors.white
                        : color,
              ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: outlined
                      ? color
                      : isActive
                          ? Colors.white
                          : color,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
