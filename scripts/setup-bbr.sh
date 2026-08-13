#!/bin/bash
# Enable BBR (Bottleneck Bandwidth and RTT) Congestion Control on host Linux kernel.
# Must be executed with root/sudo privileges.

echo "📡 Configuring kernel queuing discipline and congestion control algorithm..."

# 1. Enable Fair Queueing (FQ) which BBR relies on for pacing
sysctl -w net.core.default_qdisc=fq

# 2. Enable BBR TCP Congestion Control
sysctl -w net.ipv4.tcp_congestion_control=bbr

# 3. Persist parameters across system restarts
if [ -d "/etc/sysctl.d" ]; then
    echo "net.core.default_qdisc = fq" > /etc/sysctl.d/99-bbr.conf
    echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.d/99-bbr.conf
    echo "✅ Persisted settings to /etc/sysctl.d/99-bbr.conf"
else
    echo "net.core.default_qdisc = fq" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
    echo "✅ Persisted settings to /etc/sysctl.conf"
fi

# 4. Apply changes
sysctl --system

# 5. Verify status
CURRENT_CC=$(sysctl -n net.ipv4.tcp_congestion_control)
echo "📡 Current Congestion Control in use: $CURRENT_CC"

if [ "$CURRENT_CC" = "bbr" ]; then
    echo "🎉 BBR Congestion Control is active and running!"
else
    echo "⚠️ BBR could not be activated. Check if your kernel version supports BBR (Linux >= 4.9)."
fi
