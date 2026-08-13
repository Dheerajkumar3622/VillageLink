#!/bin/bash
# Enable Multipath TCP (MPTCP) on host Linux kernel.
# Must be executed with root/sudo privileges.

echo "📡 Configuring kernel Multipath TCP settings..."

# 1. Enable MPTCP in host configuration (Value 1)
sysctl -w net.mptcp.enabled=1

# 2. Persist parameters across system restarts
if [ -d "/etc/sysctl.d" ]; then
    echo "net.mptcp.enabled = 1" > /etc/sysctl.d/99-mptcp.conf
    echo "✅ Persisted settings to /etc/sysctl.d/99-mptcp.conf"
else
    echo "net.mptcp.enabled = 1" >> /etc/sysctl.conf
    echo "✅ Persisted settings to /etc/sysctl.conf"
fi

# 3. Apply changes
sysctl --system

# 4. Verify status
CURRENT_MPTCP=$(sysctl -n net.mptcp.enabled 2>/dev/null)
echo "📡 Current Multipath TCP status: $CURRENT_MPTCP"

if [ "$CURRENT_MPTCP" = "1" ]; then
    echo "🎉 Multipath TCP is active and optimizing connection pathways!"
else
    echo "⚠️ MPTCP could not be set. Verify your kernel version (Linux >= 5.6) supports MPTCP natively."
fi
