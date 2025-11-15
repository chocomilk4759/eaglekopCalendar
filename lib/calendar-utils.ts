/**
 * Calendar Performance Utilities
 *
 * Extracted from Calendar.tsx to avoid DOM manipulation in resize handlers.
 * Implements CSS clamp() logic in pure math for better performance.
 */

/**
 * Compute minimum cell width based on viewport width.
 *
 * Replicates CSS logic without DOM:
 * - Mobile (≤768px): clamp(160px, 28vw, 180px)
 * - Desktop (>768px): clamp(170px, 10vw, 220px)
 *
 * @param viewportWidth - Window inner width in pixels
 * @returns Computed cell minimum width in pixels
 */
export function computeCellMinWidth(viewportWidth: number): number {
  const isMobile = viewportWidth <= 768;

  if (isMobile) {
    // Mobile: clamp(160px, 28vw, 180px)
    const calculated = Math.round(viewportWidth * 0.28);
    return Math.max(160, Math.min(calculated, 180));
  } else {
    // Desktop: clamp(170px, 10vw, 220px)
    const calculated = Math.round(viewportWidth * 0.1);
    return Math.max(170, Math.min(calculated, 220));
  }
}
