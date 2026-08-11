/**
 * Virtual Viewport List (DOM Windowing Calculator)
 * Computes rendering boundaries and scroll spacer offsets for large directories.
 * Keeps DOM element count constant regardless of list size to prevent lag.
 */

/**
 * Computes rendering parameters for scroll layout viewport virtualization
 * @param {number} totalItems Total array size
 * @param {number} rowHeight Fixed element height in pixels
 * @param {number} viewportHeight Viewbox scrolling container height
 * @param {number} scrollTop Current vertical scroll offset
 * @param {number} buffer Count of off-screen items to preload
 */
export const calculateVirtualWindow = (totalItems, rowHeight, viewportHeight, scrollTop, buffer = 2) => {
    const totalHeight = totalItems * rowHeight;

    // Calculate first visible element index
    const rawStart = Math.floor(scrollTop / rowHeight);
    const startIndex = Math.max(0, rawStart - buffer);

    // Calculate last visible element index
    const rawEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight);
    const endIndex = Math.min(totalItems - 1, rawEnd + buffer);

    // Compute top spacer to push visible items into view
    const topSpacer = startIndex * rowHeight;

    // Compute bottom spacer to fill the remaining scroll track
    const bottomSpacer = Math.max(0, totalHeight - (endIndex + 1) * rowHeight);

    return {
        startIndex,
        endIndex,
        renderedCount: endIndex - startIndex + 1,
        topSpacer,
        bottomSpacer,
        totalHeight
    };
};
