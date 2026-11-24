// Small geometry helpers, so the search can find which place an address falls in.

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const inPolygon = (pt, rings) => inRing(pt, rings[0]) && !rings.slice(1).some((hole) => inRing(pt, hole));

export function containsPoint(geometry, pt) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.some((rings) => inPolygon(pt, rings));
}

export function bbox(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const rings of polys) {
    for (const [x, y] of rings[0]) {
      b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
    }
  }
  return [[b[0], b[1]], [b[2], b[3]]];
}
