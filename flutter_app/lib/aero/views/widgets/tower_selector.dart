import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../models/aero_device.dart';

/// Tower Selector Widget - Dynamic N towers
class TowerSelector extends StatelessWidget {
  final AeroDevice? device;
  final AeroTower? selectedTower;
  final Function(AeroTower) onTowerSelected;
  final VoidCallback onAddTower;

  const TowerSelector({
    super.key,
    required this.device,
    required this.selectedTower,
    required this.onTowerSelected,
    required this.onAddTower,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'towers'.tr,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF059669),
                ),
              ),
              GestureDetector(
                onTap: onAddTower,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.add, size: 14, color: Color(0xFF059669)),
                      const SizedBox(width: 4),
                      Text(
                        'pairDevice'.tr,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 80,
            child: device?.towers.isEmpty ?? true
                ? _buildEmptyState()
                : ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: device!.towers.length,
                    itemBuilder: (context, index) {
                      final tower = device!.towers[index];
                      final isSelected = tower.id == selectedTower?.id;
                      return Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: _TowerChip(
                          tower: tower,
                          isSelected: isSelected,
                          onTap: () => onTowerSelected(tower),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return GestureDetector(
      onTap: onAddTower,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFF059669).withOpacity(0.3),
            style: BorderStyle.solid,
          ),
        ),
        child: Center(
          child: Text(
            "Click 'Add' to connect your first tower",
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
            ),
          ),
        ),
      ),
    );
  }
}

class _TowerChip extends StatelessWidget {
  final AeroTower tower;
  final bool isSelected;
  final VoidCallback onTap;

  const _TowerChip({
    required this.tower,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 100,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                )
              : null,
          color: isSelected ? null : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? Colors.transparent : const Color(0xFFD1FAE5),
            width: 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF10B981).withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.eco,
                  size: 14,
                  color: isSelected ? Colors.white : const Color(0xFF059669),
                ),
                const SizedBox(width: 4),
                Text(
                  tower.nameHi ?? tower.name,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : const Color(0xFF059669),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              tower.currentCropHi ?? 'खाली',
              style: TextStyle(
                fontSize: 10,
                color: isSelected ? Colors.white.withOpacity(0.8) : Colors.grey.shade500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
