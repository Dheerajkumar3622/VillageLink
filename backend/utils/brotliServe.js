import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
};

/**
 * Express middleware to serve pre-compressed Brotli (.br) static assets.
 * Checks for browser support (Accept-Encoding: br) and file existence.
 */
export const brotliStaticServe = (rootPath) => {
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        const acceptEncoding = req.headers['accept-encoding'] || '';
        if (!acceptEncoding.includes('br')) {
            return next();
        }

        // Clean query parameters and resolve absolute path
        const cleanPath = decodeURIComponent(req.path.split('?')[0]);
        let filePath = path.join(rootPath, cleanPath);
        
        // Handle folder root lookups
        if (cleanPath.endsWith('/')) {
            filePath = path.join(filePath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        
        if (!MIME_TYPES[ext]) {
            return next();
        }

        const brFilePath = `${filePath}.br`;

        fs.access(brFilePath, fs.constants.R_OK, (err) => {
            if (err) {
                // No pre-compressed Brotli file available, skip to default static handler
                return next();
            }

            // Configure headers to serve pre-compressed Brotli payload
            res.setHeader('Content-Encoding', 'br');
            res.setHeader('Content-Type', MIME_TYPES[ext]);
            res.setHeader('Vary', 'Accept-Encoding');
            res.setHeader('X-Static-Serve', 'Brotli'); // Diagnostic trace header

            const stream = fs.createReadStream(brFilePath);
            stream.on('error', (streamErr) => {
                console.error(`Error streaming Brotli file:`, brFilePath, streamErr.message);
                if (!res.headersSent) {
                    next();
                }
            });
            stream.pipe(res);
        });
    };
};
