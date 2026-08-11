import { exec } from 'child_process';
import os from 'os';

/**
 * Checks if BBR (Bottleneck Bandwidth and RTT) Congestion Control is active on Linux hosts.
 * Logs recommendations for SREs/sysadmins to enable it if it's missing on Linux.
 */
export const checkBBRStatus = () => {
    if (os.platform() !== 'linux') {
        console.log('ℹ️ BBR Check: Host OS is not Linux. BBR kernel check skipped.');
        return;
    }

    exec('sysctl net.ipv4.tcp_congestion_control', (err, stdout, stderr) => {
        if (err) {
            console.warn('⚠️ BBR Check: Could not execute sysctl query. Kernel permissions might be restricted.');
            return;
        }

        const output = stdout.trim();
        console.log(`📡 BBR Check: Active TCP Congestion Control algorithm: "${output}"`);

        if (!output.includes('bbr')) {
            console.warn(
                '💡 Performance Optimization Tip: BBR congestion control is not enabled on this host.\n' +
                '   Run the following to enable it and boost throughput in weak network areas:\n' +
                '   sudo sysctl -w net.core.default_qdisc=fq\n' +
                '   sudo sysctl -w net.ipv4.tcp_congestion_control=bbr'
            );
        } else {
            console.log('✅ BBR Check: BBR Congestion Control is active and optimizing network streams.');
        }
    });
};
