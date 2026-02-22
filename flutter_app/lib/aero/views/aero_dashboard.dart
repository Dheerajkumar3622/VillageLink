import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/aero_controller.dart';
import '../models/aero_device.dart';
import '../models/aero_reading.dart';
import '../models/crop_preset.dart';
import 'widgets/live_params_card.dart';
import 'widgets/tower_selector.dart';
import 'widgets/prediction_card.dart';
import 'widgets/controls_card.dart';
import 'widgets/alerts_banner.dart';
import 'aero_history_view.dart';
import 'pairing_modal.dart';

class AeroDashboard extends StatelessWidget {
  const AeroDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<AeroController>();

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5), Color(0xFFCCFBF1)],
          ),
        ),
        child: SafeArea(
          child: Obx(() {
            if (controller.isLoading.value) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFF10B981)),
              );
            }

            return RefreshIndicator(
              onRefresh: () async => controller.refresh(),
              color: const Color(0xFF10B981),
              child: CustomScrollView(
                slivers: [
                  // App Bar
                  SliverToBoxAdapter(child: _buildAppBar(controller)),

                  // Alerts Banner
                  if (controller.alerts.isNotEmpty)
                    SliverToBoxAdapter(
                      child: AlertsBanner(
                        alerts: controller.alerts,
                        onAcknowledge: controller.acknowledgeAlert,
                      ),
                    ),

                  // Tower Selector
                  SliverToBoxAdapter(
                    child: TowerSelector(
                      device: controller.selectedDevice.value,
                      selectedTower: controller.selectedTower.value,
                      onTowerSelected: controller.selectTower,
                      onAddTower: () => _showPairingModal(context),
                    ),
                  ),

                  // Tab Bar
                  SliverToBoxAdapter(child: _buildTabBar(controller)),

                  // Content
                  SliverToBoxAdapter(
                    child: _buildContent(controller, context),
                  ),
                ],
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildAppBar(AeroController controller) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.back(),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: const Icon(Icons.arrow_back, color: Color(0xFF059669)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.eco, color: Color(0xFF059669), size: 24),
                    const SizedBox(width: 8),
                    Text(
                      'title'.tr,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ],
                ),
                Text(
                  'titleEn'.tr,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green.shade600,
                  ),
                ),
              ],
            ),
          ),
          Obx(() => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: controller.isOnline.value
                      ? const Color(0xFFDCFCE7)
                      : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      controller.isOnline.value ? Icons.wifi : Icons.wifi_off,
                      size: 16,
                      color: controller.isOnline.value
                          ? const Color(0xFF16A34A)
                          : const Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      controller.isOnline.value ? 'online'.tr : 'offline'.tr,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: controller.isOnline.value
                            ? const Color(0xFF16A34A)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildTabBar(AeroController controller) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Obx(() {
        final isLive = controller.liveData.value != null;
        return Row(
          children: [
            Expanded(
              child: _TabButton(
                label: 'liveParams'.tr,
                isActive: true, // For now, default to live
                onTap: () {},
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _TabButton(
                label: 'history'.tr,
                isActive: false,
                onTap: () => Get.to(() => const AeroHistoryView()),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildContent(AeroController controller, BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Live Parameters Grid
          Obx(() {
            final data = controller.liveData.value;
            if (data == null) {
              return const Center(child: Text('Loading...'));
            }
            return LiveParamsCard(data: data);
          }),

          const SizedBox(height: 16),

          // Prediction Card
          Obx(() {
            final pred = controller.prediction.value;
            if (pred != null && pred.daysRemaining > 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: PredictionCard(prediction: pred),
              );
            }
            return const SizedBox.shrink();
          }),

          // Control Buttons
          Obx(() => ControlsCard(
                liveData: controller.liveData.value,
                isSending: controller.isSending.value,
                onStartMist: controller.startMist,
                onStopMist: controller.stopMist,
                onAutoMode: controller.setAutoMode,
                onSelectCrop: () => _showCropPresets(context, controller),
              )),

          const SizedBox(height: 16),

          // Last Update
          Obx(() {
            final data = controller.liveData.value;
            if (data != null) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.access_time, size: 14, color: Color(0xFF059669)),
                  const SizedBox(width: 4),
                  Text(
                    '${'lastUpdate'.tr}: ${_formatTime(data.recordedAt)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF059669),
                    ),
                  ),
                ],
              );
            }
            return const SizedBox.shrink();
          }),
        ],
      ),
    );
  }

  void _showPairingModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const PairingModal(),
    );
  }

  void _showCropPresets(BuildContext context, AeroController controller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'selectCrop'.tr,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF065F46),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Get.back(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.85,
                ),
                itemCount: controller.presets.length,
                itemBuilder: (context, index) {
                  final preset = controller.presets[index];
                  return _CropPresetCard(
                    preset: preset,
                    onTap: () async {
                      final success = await controller.plantCrop(preset);
                      if (success) {
                        Get.back();
                        Get.snackbar(
                          '✓',
                          '${preset.nameHi} उगाना शुरू किया',
                          backgroundColor: const Color(0xFF10B981),
                          colorText: Colors.white,
                        );
                      }
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(int timestamp) {
    final dt = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF059669) : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isActive ? Colors.white : const Color(0xFF059669),
            ),
          ),
        ),
      ),
    );
  }
}

class _CropPresetCard extends StatelessWidget {
  final CropPreset preset;
  final VoidCallback onTap;

  const _CropPresetCard({required this.preset, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFBBF7D0), width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(preset.icon, style: const TextStyle(fontSize: 40)),
            const Spacer(),
            Text(
              preset.nameHi,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF065F46),
              ),
            ),
            Text(
              preset.nameEn,
              style: const TextStyle(fontSize: 12, color: Color(0xFF059669)),
            ),
            const SizedBox(height: 8),
            Text(
              '${preset.expectedDays} ${'days'.tr}',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
