/**
 * Link Header Prefetch/Preload Middleware
 * Appends HTTP Link headers to root page HTML responses to accelerate client asset delivery.
 */

const PREFETCH_ASSETS = [
    '</assets/vendor-maps.js>; rel=prefetch; as=script',
    '</assets/index.css>; rel=preload; as=style'
];

export const linkPrefetchMiddleware = (req, res, next) => {
    const isHtmlRoute = req.path === '/' || 
                        req.path.endsWith('.html') || 
                        (!req.path.includes('.') && !req.path.startsWith('/api'));

    if (req.method === 'GET' && isHtmlRoute) {
        // Enforce Link headers
        res.setHeader('Link', PREFETCH_ASSETS.join(', '));
        // Add diagnostic indicator
        res.setHeader('X-Link-Prefetch', 'Active');
    }

    next();
};
