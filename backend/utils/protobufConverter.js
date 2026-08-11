/**
 * Custom Protobuf-like Binary Telemetry Packer
 * Serializes/Deserializes DriverLocationUpdate messages to binary Buffers.
 * Shows high-efficiency bandwidth compression for low-bandwidth rural networks.
 */

export const encodeTelemetry = (data) => {
    try {
        const driverIdBuf = Buffer.from(data.driverId || '', 'utf8');
        const routeIdBuf = Buffer.from(data.routeId || '', 'utf8');

        // Total size: 1 byte (driverId len) + driverId + 8 (lat) + 8 (lng) + 4 (speed) + 4 (heading) + 8 (timestamp) + 1 byte (routeId len) + routeId
        const size = 1 + driverIdBuf.length + 8 + 8 + 4 + 4 + 8 + 1 + routeIdBuf.length;
        const buf = Buffer.alloc(size);

        let offset = 0;
        
        // Write driverId
        buf.writeUInt8(driverIdBuf.length, offset);
        offset += 1;
        driverIdBuf.copy(buf, offset);
        offset += driverIdBuf.length;

        // Write coordinates and metrics
        buf.writeDoubleBE(data.lat || 0, offset);
        offset += 8;
        buf.writeDoubleBE(data.lng || 0, offset);
        offset += 8;
        buf.writeFloatBE(data.speed || 0, offset);
        offset += 4;
        buf.writeFloatBE(data.heading || 0, offset);
        offset += 4;
        
        // Write timestamp
        buf.writeDoubleBE(data.timestamp || Date.now(), offset);
        offset += 8;

        // Write routeId
        buf.writeUInt8(routeIdBuf.length, offset);
        offset += 1;
        routeIdBuf.copy(buf, offset);
        
        return buf;
    } catch (e) {
        console.error('Binary serialization failure:', e);
        return null;
    }
};

export const decodeTelemetry = (buf) => {
    try {
        let offset = 0;

        // Read driverId
        const driverIdLen = buf.readUInt8(offset);
        offset += 1;
        const driverId = buf.toString('utf8', offset, offset + driverIdLen);
        offset += driverIdLen;

        // Read coordinates and metrics
        const lat = buf.readDoubleBE(offset);
        offset += 8;
        const lng = buf.readDoubleBE(offset);
        offset += 8;
        const speed = buf.readFloatBE(offset);
        offset += 4;
        const heading = buf.readFloatBE(offset);
        offset += 4;
        const timestamp = buf.readDoubleBE(offset);
        offset += 8;

        // Read routeId
        const routeIdLen = buf.readUInt8(offset);
        offset += 1;
        const routeId = buf.toString('utf8', offset, offset + routeIdLen);

        return {
            driverId,
            lat,
            lng,
            speed,
            heading,
            timestamp,
            routeId
        };
    } catch (e) {
        console.error('Binary deserialization failure:', e);
        return null;
    }
};
