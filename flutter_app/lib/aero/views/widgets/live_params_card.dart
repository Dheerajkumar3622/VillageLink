import 'package:flutter/material.dart';
import '../../models/aero_reading.dart';

/// Live Parameters Grid Card
class LiveParamsCard extends StatelessWidget {
  final AeroReading data;

  const LiveParamsCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.3,
      children: [
        _ParamCard(
          icon: Icons.opacity,
          iconColor: const Color(0xFF059669),
          label: 'pH स्तर',
          value: data.pH.toStringAsFixed(1),
          unit: '',
          status: data.pHStatus ?? 'NORMAL',
        ),
        _ParamCard(
          icon: Icons.bolt,
          iconColor: const Color(0xFF3B82F6),
          label: 'EC स्तर',
          value: data.ec.toStringAsFixed(1),
          unit: 'mS/cm',
          status: data.ecStatus ?? 'NORMAL',
        ),
        _ParamCard(
          icon: Icons.thermostat,
          iconColor: const Color(0xFFF97316),
          label: 'तापमान',
          value: data.waterTemp.toStringAsFixed(0),
          unit: '°C',
          status: 'NORMAL',
        ),
        _TankCard(level: data.tankLevel),
      ],
    );
  }
}

class _ParamCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final String unit;
  final String status;

  const _ParamCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.unit,
    required this.status,
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
              Icon(icon, color: iconColor, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: iconColor,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const Spacer(),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: iconColor.withOpacity(0.9),
                ),
              ),
              if (unit.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 4),
                  child: Text(
                    unit,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _getStatusColor(status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _getStatusText(status),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: _getStatusColor(status),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'LOW':
        return Colors.red;
      case 'HIGH':
        return Colors.orange;
      case 'NORMAL':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'LOW':
        return 'कम';
      case 'HIGH':
        return 'अधिक';
      case 'NORMAL':
        return 'सामान्य';
      default:
        return status;
    }
  }
}

class _TankCard extends StatelessWidget {
  final int level;

  const _TankCard({required this.level});

  @override
  Widget build(BuildContext context) {
    final isLow = level < 20;
    final color = isLow ? Colors.red : const Color(0xFF06B6D4);

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
              Icon(Icons.water_drop, color: color, size: 18),
              const SizedBox(width: 6),
              Text(
                'टैंक स्तर',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            '$level%',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: color.withOpacity(0.9),
            ),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: level / 100,
              backgroundColor: color.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}
