/**
 * WebP/AVIF Image Transcoding Coordinator
 * Evaluates browser request headers and serves optimized image targets.
 * Simulates on-the-fly dynamic image compression saving bandwidth.
 */

/**
 * Parses client Accept headers to negotiate the most optimal image format
 */
export const negotiateImageFormat = (acceptHeader = '') => {
    const accept = acceptHeader.toLowerCase();
    
    // AVIF offers superior compression and is preferred first
    if (accept.includes('image/avif')) {
        return 'avif';
    }
    
    // WebP is the secondary high-performance target
    if (accept.includes('image/webp')) {
        return 'webp';
    }
    
    // Default fallback for older browsers
    return 'jpeg';
};

/**
 * Simulates compression ratios for transcoding original images into modern formats
 */
export const transcodeToFormat = (fileName, originalSizeBytes, targetFormat) => {
    let compressionFactor = 1.0;
    
    if (targetFormat === 'avif') {
        compressionFactor = 0.35; // 65% size reduction
    } else if (targetFormat === 'webp') {
        compressionFactor = 0.50; // 50% size reduction
    }

    const optimizedSize = Math.round(originalSizeBytes * compressionFactor);
    const savingsPercent = Math.round((1 - compressionFactor) * 100);

    const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

    return {
        fileName: `${baseName}.${targetFormat}`,
        targetFormat,
        originalSizeBytes,
        optimizedSizeBytes: optimizedSize,
        savings: `${savingsPercent}%`
    };
};
export default negotiateImageFormat;
