// Map sources and layers. Draw order, bottom to top:
// place shading -> gap patterns -> floodplain -> parcels -> place lines -> asset shapes -> asset points.

import { ASSET_TYPES, COLORS, FLOOD_RAMP, VIEWS, ZOOM } from './config.js';

const TILE_ROOT = new URL('../tiles/', import.meta.url).href;
const tiles = (name) => [`${TILE_ROOT}${name}/{z}/{x}/{y}.pbf`];

// Paints a small square pattern for gap areas (no data is never shaded as low risk).
function patternImage(draw, size = 8) {
  const ratio = 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  draw(ctx, size);
  return { image: ctx.getImageData(0, 0, size * ratio, size * ratio), ratio };
}

function addPatterns(map) {
  const hatch = patternImage((ctx, s) => {
    ctx.fillStyle = COLORS.hatchBg;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = COLORS.hatchLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, s); ctx.lineTo(s, 0);
    ctx.moveTo(-s / 2, s / 2); ctx.lineTo(s / 2, -s / 2);
    ctx.moveTo(s / 2, s * 1.5); ctx.lineTo(s * 1.5, s / 2);
    ctx.stroke();
  });
  const dots = patternImage((ctx, s) => {
    ctx.fillStyle = COLORS.floodLite;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  map.addImage('hatch', hatch.image, { pixelRatio: hatch.ratio });
  map.addImage('dots', dots.image, { pixelRatio: dots.ratio });
}

const rampColor = ['step', ['get', 'share'], FLOOD_RAMP.colors[0],
  ...FLOOD_RAMP.stops.flatMap((s, i) => [s, FLOOD_RAMP.colors[i + 1]])];

const fadeWithZoom = (high, low) =>
  ['interpolate', ['linear'], ['zoom'], ZOOM.placesFade[0], high, ZOOM.placesFade[1], low];

function addPlaceLayers(map, view, data, before) {
  const src = `places-${view}`;
  map.addSource(src, { type: 'geojson', data, promoteId: 'PLACE_ID' });
  const vis = { visibility: view === 'county' ? 'visible' : 'none' };
  map.addLayer({
    id: `${src}-fill`, type: 'fill', source: src, layout: vis,
    filter: ['!=', ['get', 'gap'], 'no_parcels'],
    paint: { 'fill-color': rampColor, 'fill-opacity': fadeWithZoom(0.88, 0.12) },
  }, before);
  map.addLayer({
    id: `${src}-noparcels`, type: 'fill', source: src, layout: vis,
    filter: ['==', ['get', 'gap'], 'no_parcels'],
    paint: { 'fill-pattern': 'hatch', 'fill-opacity': fadeWithZoom(0.95, 0.3) },
  }, before);
  map.addLayer({
    id: `${src}-nofema`, type: 'fill', source: src, layout: vis,
    filter: ['==', ['get', 'gap'], 'no_fema'],
    paint: { 'fill-pattern': 'dots', 'fill-opacity': fadeWithZoom(1, 0.3) },
  }, before);
}

function addPlaceLines(map, view, before) {
  const src = `places-${view}`;
  const vis = { visibility: view === 'county' ? 'visible' : 'none' };
  map.addLayer({
    id: `${src}-line`, type: 'line', source: src, layout: vis,
    paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#d9d9d9', '#55595c'],
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.6, 0.6],
    },
  }, before);
  map.addLayer({
    id: `${src}-selected`, type: 'line', source: src, layout: vis,
    filter: ['==', ['get', 'PLACE_ID'], ''],
    paint: { 'line-color': COLORS.selected, 'line-width': 2.5 },
  }, before);
}

function addHazardLayers(map, before) {
  map.addSource('floodplain', { type: 'vector', tiles: tiles('floodplain'), minzoom: 7, maxzoom: 12 });
  map.addLayer({
    id: 'floodplain', type: 'fill', source: 'floodplain', 'source-layer': 'floodplain',
    minzoom: ZOOM.floodplain,
    paint: { 'fill-color': COLORS.flood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.35, 13, 0.55] },
  }, before);

  map.addSource('parcels', { type: 'vector', tiles: tiles('parcels'), minzoom: 10, maxzoom: 13 });
  map.addLayer({
    id: 'parcels', type: 'fill', source: 'parcels', 'source-layer': 'parcels',
    minzoom: ZOOM.parcels,
    paint: { 'fill-color': COLORS.floodLite, 'fill-opacity': 0.75 },
  }, before);
  map.addLayer({
    id: 'parcels-line', type: 'line', source: 'parcels', 'source-layer': 'parcels',
    minzoom: 13,
    paint: { 'line-color': '#0c0d0e', 'line-width': 0.5 },
  }, before);
}

const assetColor = ['match', ['get', 'f'], 'y', COLORS.floodLite, 'n', COLORS.assetNo, 'transparent'];

function addAssetLayers(map) {
  const hidden = { visibility: 'none' };
  map.addSource('asset-shapes', { type: 'vector', tiles: tiles('shapes'), minzoom: 6, maxzoom: 12 });
  map.addLayer({
    id: 'asset-shapes-fill', type: 'fill', source: 'asset-shapes', 'source-layer': 'shapes', layout: hidden,
    paint: { 'fill-color': assetColor, 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: 'asset-shapes-line', type: 'line', source: 'asset-shapes', 'source-layer': 'shapes', layout: hidden,
    paint: { 'line-color': ['match', ['get', 'f'], 'y', COLORS.floodLite, '#9aa0a4'], 'line-width': 1 },
  });

  map.addSource('assets', { type: 'geojson', data: 'data/assets.geojson' });
  map.addLayer({
    id: 'assets', type: 'circle', source: 'assets', layout: hidden,
    paint: {
      // In-floodplain points: bigger, white ring. Others: smaller and dim, so the at-risk ones pop.
      'circle-radius': ['interpolate', ['linear'], ['zoom'],
        6, ['match', ['get', 'f'], 'y', 3.2, 1.8], 10, ['match', ['get', 'f'], 'y', 5.5, 3], 14, ['match', ['get', 'f'], 'y', 9, 5.5]],
      'circle-color': assetColor,
      'circle-opacity': ['match', ['get', 'f'], 'y', 1, 0.8],
      'circle-stroke-color': ['match', ['get', 'f'], 'y', '#ffffff', 'm', '#7d8286', '#0c0d0e'],
      'circle-stroke-width': ['match', ['get', 'f'], 'y', 1.5, 'm', 1, 0.5],
      'circle-sort-key': ['match', ['get', 'f'], 'y', 2, 1],
    },
  });
}

export const ASSET_LAYERS = ['assets', 'asset-shapes-fill', 'asset-shapes-line'];
export const placeLayer = (view, part) => `places-${view}-${part}`;

export function addLayers(map, places) {
  addPatterns(map);
  // Keep basemap labels on top of our fills.
  const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  for (const view of Object.keys(VIEWS)) addPlaceLayers(map, view, places[view], firstSymbol);
  addHazardLayers(map, firstSymbol);
  for (const view of Object.keys(VIEWS)) addPlaceLines(map, view, firstSymbol);
  addAssetLayers(map);
}

export function showView(map, view) {
  for (const v of Object.keys(VIEWS)) {
    for (const part of ['fill', 'noparcels', 'nofema', 'line', 'selected']) {
      map.setLayoutProperty(placeLayer(v, part), 'visibility', v === view ? 'visible' : 'none');
    }
  }
}

export function setSelected(map, view, placeId) {
  map.setFilter(placeLayer(view, 'selected'), ['==', ['get', 'PLACE_ID'], placeId || '']);
}

export function setAssets(map, on, types) {
  const filter = ['in', ['get', 'a'], ['literal', [...types]]];
  for (const id of ASSET_LAYERS) {
    map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    map.setFilter(id, filter);
  }
}

export const ALL_ASSET_TYPES = Object.keys(ASSET_TYPES);
