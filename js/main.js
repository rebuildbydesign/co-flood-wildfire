// Wires the sidebar, map and panel together. All numbers come prebuilt from data/.

import { ASSET_TYPES, BASEMAP, CO_BOUNDS, MAPBOX_TOKEN, VIEWS, ZOOM } from './config.js';
import { bbox, containsPoint } from './geo.js';
import { ALL_ASSET_TYPES, ASSET_LAYERS, addLayers, placeLayer, setAssets, setSelected, showView } from './layers.js';
import { about, assetPopup, finding, legend, parcelPopup, placePanel } from './panel.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const isMobile = () => matchMedia('(max-width: 760px)').matches;

const state = { view: 'county', selected: null, assetsOn: false, assetTypes: new Set(ALL_ASSET_TYPES) };
let map, places, shapes, popup, hovered = null;

async function loadData() {
  const get = (url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  });
  const [p, county, town] = await Promise.all([get('data/places.json'), get(VIEWS.county.file), get(VIEWS.town.file)]);
  return { places: p, shapes: { county, town } };
}

// ---------- panel + selection ----------

function mapPadding() {
  if (isMobile()) return { top: 40, bottom: Math.round(innerHeight * 0.55), left: 30, right: 30 };
  const panel = state.selected ? Math.min(800, innerWidth - 420) : 0;
  return { top: 60, bottom: 60, left: 60, right: panel + 40 };
}

function openPanel(id) {
  $('#panel-body').innerHTML = placePanel(places[id], places);
  $('#panel').hidden = false;
  $('#finding').hidden = true;
  $('#panel').scrollTop = 0;
}

function closePanel() {
  state.selected = null;
  $('#panel').hidden = true;
  $('#finding').hidden = false;
  setSelected(map, state.view, null);
  $('#place-select').value = '';
  history.replaceState(null, '', location.pathname);
}

function selectPlace(id, { fit = true } = {}) {
  const level = places[id]?.level;
  if (!level || level === 'state') return;
  if (level !== state.view) setView(level, { keepPanel: true });
  state.selected = id;
  setSelected(map, state.view, id);
  $('#place-select').value = id;
  openPanel(id);
  history.replaceState(null, '', `#${id}`);
  if (fit) {
    const feature = shapes[state.view].features.find((f) => f.properties.PLACE_ID === id);
    map.fitBounds(bbox(feature.geometry), { padding: mapPadding(), maxZoom: 12, duration: 800 });
  }
}

// ---------- sidebar ----------

function fillPlaceSelect() {
  const options = shapes[state.view].features
    .map((f) => f.properties)
    .sort((a, b) => a.NAME.localeCompare(b.NAME));
  $('#place-select').innerHTML = `<option value="">${VIEWS[state.view].pick}</option>`
    + options.map((p) => `<option value="${p.PLACE_ID}">${p.NAME}</option>`).join('');
}

function setView(view, { keepPanel = false } = {}) {
  if (!keepPanel) closePanel();
  state.view = view;
  showView(map, view);
  $$('.segmented button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === view)));
  fillPlaceSelect();
}

function fillAssetTypes() {
  $('#asset-type-list').innerHTML = Object.entries(ASSET_TYPES).map(([code, label]) =>
    `<label class="check"><input type="checkbox" value="${code}" checked>${label}</label>`).join('');
}

function updateAssets() {
  setAssets(map, state.assetsOn, state.assetTypes);
  $('#assets-toggle').setAttribute('aria-pressed', String(state.assetsOn));
  $('#assets-toggle').textContent = state.assetsOn ? 'Hide Public Assets' : 'Show Public Assets';
  $('#asset-types').hidden = !state.assetsOn;
  $$('#asset-type-list input').forEach((i) => { i.checked = state.assetTypes.has(i.value); });
  updateLegend();
}

function updateLegend() {
  $('#legend').innerHTML = legend(map.getZoom() >= ZOOM.floodplain, state.assetsOn);
}

function bindSidebar() {
  $$('.segmented button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#place-select').addEventListener('change', (e) => (e.target.value ? selectPlace(e.target.value) : closePanel()));
  $('#assets-toggle').addEventListener('click', () => { state.assetsOn = !state.assetsOn; updateAssets(); });
  $('#asset-type-list').addEventListener('change', (e) => {
    state.assetTypes[e.target.checked ? 'add' : 'delete'](e.target.value);
    updateAssets();
  });
  $$('.asset-types-actions button').forEach((b) => b.addEventListener('click', () => {
    state.assetTypes = new Set(b.dataset.all === '1' ? ALL_ASSET_TYPES : []);
    updateAssets();
  }));
  $('#sidebar-toggle').addEventListener('click', () => {
    const open = $('#sidebar').classList.toggle('open');
    $('#sidebar-toggle').setAttribute('aria-expanded', String(open));
  });
}

// ---------- map events ----------

function showPopup(lngLat, html) {
  popup?.remove();
  popup = new mapboxgl.Popup({ maxWidth: '280px', className: 'map-pop' }).setLngLat(lngLat).setHTML(html).addTo(map);
}

function bindMap() {
  const fills = () => ['fill', 'noparcels', 'nofema'].map((p) => placeLayer(state.view, p));

  map.on('click', (e) => {
    const asset = state.assetsOn && map.queryRenderedFeatures(e.point, { layers: ASSET_LAYERS })[0];
    if (asset) return showPopup(e.lngLat, assetPopup(asset));
    const parcel = map.queryRenderedFeatures(e.point, { layers: ['parcels'] })[0];
    if (parcel) return showPopup(e.lngLat, parcelPopup(parcel));
    const place = map.queryRenderedFeatures(e.point, { layers: fills() })[0];
    if (place) selectPlace(place.properties.PLACE_ID, { fit: false });
  });

  map.on('mousemove', (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers: fills() })[0];
    const src = `places-${state.view}`;
    if (hovered && (!f || hovered.id !== f.id || hovered.src !== src)) {
      map.setFeatureState({ source: hovered.src, id: hovered.id }, { hover: false });
      hovered = null;
    }
    if (f && !hovered) {
      hovered = { src, id: f.id };
      map.setFeatureState({ source: src, id: f.id }, { hover: true });
    }
    const clickable = f || map.queryRenderedFeatures(e.point, { layers: state.assetsOn ? [...ASSET_LAYERS, 'parcels'] : ['parcels'] }).length;
    map.getCanvas().style.cursor = clickable ? 'pointer' : '';
  });

  map.on('zoomend', updateLegend);
}

function bindGeocoder() {
  const geocoder = new MapboxGeocoder({
    accessToken: MAPBOX_TOKEN, mapboxgl, marker: true, countries: 'us',
    bbox: CO_BOUNDS.flat(), placeholder: 'Search an Address',
  });
  $('#geocoder').appendChild(geocoder.onAdd(map));
  geocoder.on('result', ({ result }) => {
    const pt = result.center;
    const hit = shapes[state.view].features.find((f) => containsPoint(f.geometry, pt));
    if (hit) selectPlace(hit.properties.PLACE_ID, { fit: false });
    map.flyTo({ center: pt, zoom: 13, padding: mapPadding() });
  });
}

function bindPanel() {
  $('#panel-close').addEventListener('click', closePanel);
  $('#panel').addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) selectPlace(go.dataset.goto);
  });
  $('#about-body').innerHTML = about();
  $('#info-btn').addEventListener('click', () => $('#about').showModal());
  $('#about [data-close]').addEventListener('click', () => $('#about').close());
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#panel').hidden) closePanel(); });
}

// ---------- start ----------

async function init() {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: 'map', style: BASEMAP, bounds: CO_BOUNDS, projection: 'mercator',
    fitBoundsOptions: { padding: isMobile() ? 20 : { top: 40, bottom: 40, left: 40, right: 330 } }, // clear of the statewide card attributionControl: true,
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  window.coMap = map; // handle for automated render checks

  const styleReady = new Promise((resolve) => map.once('style.load', resolve));
  [{ places, shapes }] = await Promise.all([loadData(), styleReady]);

  addLayers(map, shapes);
  fillPlaceSelect();
  fillAssetTypes();
  $('#finding').innerHTML = finding(places.STATE);
  bindSidebar();
  bindMap();
  bindPanel();
  bindGeocoder();
  updateLegend();

  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (places[fromHash]) selectPlace(fromHash);
  $('#loading').hidden = true;
  document.body.dataset.ready = '1';
}

init().catch((err) => {
  console.error(err);
  $('#loading').textContent = 'The map could not load. Please refresh.';
});
