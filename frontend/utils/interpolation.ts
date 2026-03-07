/**
 * Interpolates smoothly between two coordinates using linear interpolation (lerp).
 * 
 * @param start - The starting coordinate [latitude, longitude]
 * @param end - The ending target coordinate [latitude, longitude]
 * @param factor - The interpolation factor (0.0 to 1.0)
 * @returns The interpolated coordinate [latitude, longitude]
 */
export const smoothCoordinate = (
  start: [number, number],
  end: [number, number],
  factor: number
): [number, number] => {
  if (factor <= 0) return start;
  if (factor >= 1) return end;

  const lat = start[0] + (end[0] - start[0]) * factor;
  const lng = start[1] + (end[1] - start[1]) * factor;

  return [lat, lng];
};
