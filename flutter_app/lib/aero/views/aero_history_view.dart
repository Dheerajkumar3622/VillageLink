import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/aero_controller.dart';
import '../models/aero_reading.dart';

/// History View with simple data table and period selector
class AeroHistoryView extends StatefulWidget {
  const AeroHistoryView({super.key});

  @override
  State<AeroHistoryView> createState() => _AeroHistoryViewState();
}

class _AeroHistoryViewState extends State<AeroHistoryView> {
  String _period = '24h';
  List<AeroReading> _data = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final controller = Get.find<AeroController>();
    final data = await controller.getHistory(period: _period);
    setState(() {
      _data = data;
      _isLoading = false;
    });
  }

  void _setPeriod(String period) {
    setState(() => _period = period);
    _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('history'.tr),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF059669),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFECFDF5), Color(0xFFD1FAE5), Color(0xFFCCFBF1)],
          ),
        ),
        child: Column(
          children: [
            // Period Selector
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _PeriodButton(
                    label: '24h',
                    isActive: _period == '24h',
                    onTap: () => _setPeriod('24h'),
                  ),
                  const SizedBox(width: 8),
                  _PeriodButton(
                    label: '7d',
                    isActive: _period == '7d',
                    onTap: () => _setPeriod('7d'),
                  ),
                  const SizedBox(width: 8),
                  _PeriodButton(
                    label: '30d',
                    isActive: _period == '30d',
                    onTap: () => _setPeriod('30d'),
                  ),
                ],
              ),
            ),

            // Data Table
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF10B981),
                      ),
                    )
                  : _data.isEmpty
                      ? Center(
                          child: Text(
                            'noData'.tr,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        )
                      : Container(
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              // Header Row
                              _HeaderRow(),
                              const Divider(),
                              // Data Rows
                              Expanded(
                                child: ListView.builder(
                                  itemCount: _data.length,
                                  itemBuilder: (context, index) {
                                    final reading = _data[index];
                                    return _DataRow(reading: reading);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PeriodButton extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _PeriodButton({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF059669) : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : const Color(0xFF059669),
          ),
        ),
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          const Expanded(
            flex: 2,
            child: Text(
              'समय',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          const Expanded(
            child: Text(
              'pH',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          const Expanded(
            child: Text(
              'EC',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          const Expanded(
            child: Text(
              'टैंक',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DataRow extends StatelessWidget {
  final AeroReading reading;

  const _DataRow({required this.reading});

  @override
  Widget build(BuildContext context) {
    final dt = DateTime.fromMillisecondsSinceEpoch(reading.recordedAt);
    final time = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              time,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              reading.pH.toStringAsFixed(1),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              reading.ec.toStringAsFixed(1),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              '${reading.tankLevel}%',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
