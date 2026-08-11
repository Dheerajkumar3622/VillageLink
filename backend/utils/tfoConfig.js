import { exec } from 'child_process';
import os from 'os';
import fs from 'fs';

/**
 * Verifies if TCP Fast Open (TFO) is enabled at the OS kernel level on Linux.
 * Suggests correct sysctl values for high-latency rural mobile connections.
 */
export const checkTFOStatus = () => {
    if (os.platform() !== 'linux') {
        console.log('ℹ️ TFO Check: Host OS is not Linux. TCP Fast Open kernel check skipped.');
        return;
    }

    const tfoPath = '/proc/sys/net/ipv4/tcp_fastopen';

    try {
        if (fs.existsSync(tfoPath)) {
            const val = parseInt(fs.readFileSync(tfoPath, 'utf8').trim(), 10);
            
            let status = 'Disabled';
            if (val === 1) status = 'Enabled (Client only)';
            if (val === 2) status = 'Enabled (Server only)';
            if (val === 3) status = 'Enabled (Both Client and Server)';

            console.log(`📡 TFO Check: Kernel TCP Fast Open status: "${status}" (Value: ${val})`);

            if (val !== 3) {
                console.warn(
                    '💡 Performance Optimization Tip: TCP Fast Open is not fully configured (Value 3 is recommended).\n' +
                    '   To enable TFO for both client and server data payload transfers, run:\n' +
                    '   echo "net.ipv4.tcp_fastopen=3" | sudo tee -a /etc/sysctl.conf\n' +
                    '   sudo sysctl -p'
                );
            } else {
                console.log('✅ TFO Check: TCP Fast Open is fully active. Handshake data packing is optimized.');
            }
        } else {
            console.warn('⚠️ TFO Check: /proc/sys/net/ipv4/tcp_fastopen is missing on this kernel.');
        }
    } catch (e) {
        console.warn('⚠️ TFO Check: Could not read TCP Fast Open status:', e.message);
    }
};
