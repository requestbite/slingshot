/**
 * Donut Component
 *
 * A donut chart that renders slices starting at 12 o'clock going clockwise.
 *
 * @param {Object} props
 * @param {Array<{value: number, color: string}>} props.slices - Array of slice objects
 * @param {number} props.max - Maximum total value (represents 100% of the donut)
 * @param {number} [props.size=120] - SVG size in pixels
 * @param {number} [props.thickness=20] - Ring thickness in pixels
 * @param {string} [props.emptyColor='#e5e7eb'] - Color for the unfilled portion
 * @param {string} [props.className] - Additional CSS classes
 */

function polarToCartesian(cx, cy, r, angle) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

function arcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function Donut({
  slices,
  max,
  size = 120,
  thickness = 20,
  emptyColor = '#e5e7eb',
  className = '',
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR - thickness;
  const fullCircle = 2 * Math.PI;

  const paths = [];
  let startAngle = 0;
  let totalUsed = 0;

  for (const slice of slices) {
    const clamped = Math.max(0, Math.min(slice.value, max - totalUsed));
    if (clamped <= 0) continue;

    const sweepAngle = (clamped / max) * fullCircle;
    const endAngle = Math.min(startAngle + sweepAngle, fullCircle - 0.0001);

    paths.push({ d: arcPath(cx, cy, outerR, innerR, startAngle, endAngle), color: slice.color });

    startAngle = endAngle;
    totalUsed += clamped;
  }

  // Fill remaining space with emptyColor
  if (startAngle < fullCircle - 0.0001) {
    paths.push({
      d: arcPath(cx, cy, outerR, innerR, startAngle, fullCircle - 0.0001),
      color: emptyColor,
    });
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      class={className}
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
    </svg>
  );
}
