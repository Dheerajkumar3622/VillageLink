/**
 * Local Vector Tile Map Rendering Engine
 * Parses raw geometric structures (coordinate arrays) and outputs styled SVG maps.
 * Simulates clients drawing map assets dynamically without downloading heavy images.
 */

// Simulated geographic layers database
const geometryFeatures = new Map();

/**
 * Registers a coordinate geometric feature (e.g. Roads, Landmarks, Boundaries)
 */
export const registerMapFeature = (id, type, name, points) => {
    geometryFeatures.set(id, { type, name, points });
};

/**
 * Renders geometric shapes locally to SVG markup applying custom themes
 */
export const renderTileToSVG = (theme = 'LIGHT') => {
    const isDark = theme === 'DARK';
    const bgFill = isDark ? '#1a1a24' : '#f8f9fa';
    const roadStroke = isDark ? '#39ff14' : '#6c757d'; // Neon green for dark mode, grey for light
    const roadWidth = isDark ? 4 : 3;

    let svgPaths = [];

    geometryFeatures.forEach((feat, id) => {
        if (feat.type === 'ROAD') {
            if (feat.points.length < 2) return;
            // Compile point array to SVG path syntax
            const pathData = feat.points.map((pt, index) => {
                const cmd = index === 0 ? 'M' : 'L';
                return `${cmd} ${pt[0]} ${pt[1]}`;
            }).join(' ');
            svgPaths.push(`  <path id="${id}" d="${pathData}" fill="none" stroke="${roadStroke}" stroke-width="${roadWidth}" stroke-linecap="round" />`);
        } else if (feat.type === 'LANDMARK') {
            if (feat.points.length < 1) return;
            const [cx, cy] = feat.points[0];
            const pointColor = isDark ? '#ff007f' : '#dc3545';
            svgPaths.push(`  <circle id="${id}" cx="${cx}" cy="${cy}" r="6" fill="${pointColor}" />`);
        }
    });

    // Wrap elements inside standard SVG view box container
    const svgContent = [
        `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="background-color: ${bgFill};">`,
        ...svgPaths,
        `</svg>`
    ].join('\n');

    return svgContent;
};

/**
 * Diagnostic method to clear features
 */
export const clearMapFeatures = () => {
    geometryFeatures.clear();
};
