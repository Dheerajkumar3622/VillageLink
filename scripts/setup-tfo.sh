#!/bin/bash
# Enable TCP Fast Open (TFO) on host Linux kernel.
# Must be executed with root/sudo privileges.

echo "📡 Configuring kernel TCP Fast Open settings..."

# 1. Enable TFO for both client and server data path negotiations (Value 3)
sysctl -w net.ipv4.tcp_fastopen=3

# 2. Persist parameters across system restarts
if [ -d "/etc/sysctl.d" ]; then
    echo "net.ipv4.tcp_fastopen = 3" > /etc/sysctl.d/99-tfo.conf
    echo "✅ Persisted settings to /etc/sysctl.d/99-tfo.conf"
else
    echo "net.ipv4.tcp_fastopen = 3" >> /etc/sysctl.conf
    echo "✅ Persisted settings to /etc/sysctl.conf"
fi

# 3. Apply changes
sysctl --system

# 4. Verify status
CURRENT_TFO=$(sysctl -n net.ipv4.tcp_fastopen)
echo "📡 Current TCP Fast Open Value: $CURRENT_TFO"

if [ "$CURRENT_TFO" = "3" ]; then
    echo "🎉 TCP Fast Open is active for both client and server socket negotiations!"
else
    echo "⚠️ TFO could not be set. Verify your kernel configuration holds TCP_FASTOPEN capabilities."
fi
