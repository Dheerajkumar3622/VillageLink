import fs from 'fs';
import os from 'os';

/**
 * Verifies if Multipath TCP (MPTCP) is enabled at the OS kernel level on Linux.
 * Suggests correct sysctl values for seamless cellular/WiFi connection migration.
 */
export const checkMPTCPStatus = () => {
    if (os.platform() !== 'linux') {
        console.log('ℹ️ MPTCP Check: Host OS is not Linux. Multipath TCP kernel check skipped.');
        return;
    }

    const mptcpPath = '/proc/sys/net/mptcp/enabled';

    try {
        if (fs.existsSync(mptcpPath)) {
            const val = parseInt(fs.readFileSync(mptcpPath, 'utf8').trim(), 10);
            const status = val === 1 ? 'Enabled' : 'Disabled';

            console.log(`📡 MPTCP Check: Kernel Multipath TCP status: "${status}" (Value: ${val})`);

            if (val !== 1) {
                console.warn(
                    '💡 Performance Optimization Tip: Multipath TCP (MPTCP) is disabled on this host.\n' +
                    '   To enable seamless WiFi/LTE connection switches for tracking sockets, run:\n' +
                    '   echo "net.mptcp.enabled=1" | sudo tee -a /etc/sysctl.conf\n' +
                    '   sudo sysctl -p'
                );
            } else {
                console.log('✅ MPTCP Check: Multipath TCP is active and optimizing connection pathways.');
            }
        } else {
            console.warn('⚠️ MPTCP Check: Multipath TCP (/proc/sys/net/mptcp/enabled) is not supported on this kernel version.');
        }
    } catch (e) {
        console.warn('⚠️ MPTCP Check: Could not read Multipath TCP status:', e.message);
    }
};
