// HTML for the place panel, asset popups, legend, statewide card and About box.
// One panel component serves every level (state, county, town).

import { ASSET_FLOOD, ASSET_TYPES, FLOODPLAIN_LABEL, FLOOD_RAMP } from './config.js';
import { count, escapeHTML as esc, money, pct, titleCase } from './format.js';

const WHERE_ROWS = 8;

function stat(value, label, note = '') {
  return `<div class="stat"><b>${value}</b><span>${label}</span>${note}</div>`;
}

function floodCard(p) {
  const head = '<div class="card-label">Flood Today</div>';
  if (p.no_parcels) return `<div class="hz-card hz-flood is-gap">${head}<p class="gap">No property data from the state</p></div>`;
  if (p.no_fema) return `<div class="hz-card hz-flood is-gap">${head}<p class="gap">No FEMA flood map</p></div>`;
  const f = p.flood;
  const noValue = f.value == null;
  return `<div class="hz-card hz-flood">${head}
    <div class="stats">
      ${stat(count(f.parcels), `properties at high risk (${pct(f.share)})`)}
      ${stat(noValue ? 'No value data' : money(f.value), 'property value')}
      ${stat(noValue ? 'No value data' : money(f.tax), 'est. property tax a year')}
      ${stat(count(f.residents), 'est. residents')}
    </div>
    ${p.most_values_missing && !noValue ? '<p class="fine">Most property values are missing here, so value and tax are low.</p>' : ''}
  </div>`;
}

const soonCard = (cls, label) =>
  `<div class="hz-card ${cls} is-soon"><div class="card-label">${label}</div><p class="gap">Coming soon</p></div>`;

function assetSection(p) {
  const rows = Object.entries(p.assets).map(([type, [total, flood, nomap]]) => ({ type, total, flood, nomap }));
  if (!rows.length) return '<div class="assets"><h3>Public Assets at Risk</h3><p class="gap">No public assets in our list here.</p></div>';
  const total = rows.reduce((s, r) => s + r.total, 0);
  const flood = rows.reduce((s, r) => s + r.flood, 0);
  const nomap = rows.reduce((s, r) => s + r.nomap, 0);
  const atRisk = rows.filter((r) => r.flood > 0).sort((a, b) => b.flood - a.flood || b.total - a.total);
  const bars = atRisk.map((r) => `<li class="bar-row">
      <span class="bar-name">${ASSET_TYPES[r.type]}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(r.flood / r.total) * 100}%"></span></span>
      <span class="bar-value">${count(r.flood)} of ${count(r.total)}</span>
    </li>`).join('');
  if (nomap === total) {
    return `<div class="assets"><h3>Public Assets at Risk</h3>
      <p class="assets-sum">${count(total)} public assets here. No FEMA flood map, so none can be checked for flood.</p></div>`;
  }
  const rest = rows.length - atRisk.length;
  return `<div class="assets">
    <h3>Public Assets at Risk</h3>
    <p class="assets-sum"><b>${count(flood)}</b> of ${count(total)} public assets are in the floodplain${nomap ? ` · ${count(nomap)} have no FEMA map` : ''}</p>
    ${bars ? `<ul class="bars">${bars}</ul>` : ''}
    ${rest ? `<p class="fine">${rest} other asset type${rest > 1 ? 's' : ''} here, none in the floodplain.</p>` : ''}
    <p class="fine">In the floodplain = within 100 ft of it. Parks and Superfund sites count if any part touches it.</p>
  </div>`;
}

function whereList(p, places) {
  if (p.level !== 'county' || p.no_parcels || p.no_fema) return '';
  const rows = p.towns.map((id) => ({ id, ...places[id] }))
    .filter((t) => t.flood.parcels > 0)
    .sort((a, b) => b.flood.parcels - a.flood.parcels);
  if (!rows.length) return '';
  const shown = rows.slice(0, WHERE_ROWS);
  const crosses = shown.some((t) => t.counties.length > 1);
  return `<div class="where">
    <h3>High Flood Risk Properties, by Town</h3>
    <ul>${shown.map((t) => `<li><button class="where-row" data-goto="${t.id}">
      <span class="where-name">${esc(t.name)}${t.counties.length > 1 ? '*' : ''}</span>
      <span class="where-value">${count(t.flood.parcels)}</span><span class="where-arrow" aria-hidden="true">›</span>
    </button></li>`).join('')}</ul>
    ${rows.length > WHERE_ROWS ? `<p class="fine">${rows.length - WHERE_ROWS} more towns with high flood risk properties.</p>` : ''}
    ${crosses ? '<p class="fine">* Whole town, including parts in other counties.</p>' : ''}
  </div>`;
}

function countyNames(counties) {
  if (counties.length === 1) return counties[0];
  const bare = counties.map((c) => c.replace(/ County$/, ''));
  return `${bare.slice(0, -1).join(', ')} and ${bare.at(-1)} counties`;
}

function header(p) {
  const kind = { state: 'State', county: 'County', town: 'Town' }[p.level];
  const where = p.level === 'town' ? `<p class="ctx">${esc(countyNames(p.counties))}</p>` : '';
  const props = p.no_parcels ? 'No property data from the state'
    : `<b>${count(p.parcels)}</b> properties${p.no_fema ? '' : ` · <b>${count(p.flood.parcels)}</b> (${pct(p.flood.share)}) at high flood risk`}`;
  const back = p.level === 'town'
    ? `<nav class="back-row">${p.county_ids.map((id, i) =>
      `<button class="back-btn" data-goto="${id}">‹ Back to ${esc(p.counties[i])}</button>`).join('')}</nav>` : '';
  return `${back}<header class="place-head"><span class="kind">${kind}</span><h2>${esc(p.name)}</h2>${where}<p class="ctx">${props}</p></header>`;
}

export function placePanel(p, places) {
  return `<div class="panel-cols">
    <div class="panel-left">
      ${header(p)}
      ${floodCard(p)}
      ${soonCard('hz-fire', 'Wildfire Today')}
      ${soonCard('hz-both', 'Flood x Wildfire Today')}
    </div>
    <div class="panel-right">
      ${assetSection(p)}
      ${whereList(p, places)}
      <p class="fine">Residents are estimates: each census block's population is spread across its properties.</p>
    </div>
  </div>`;
}

export function assetPopup(f) {
  const a = f.properties;
  const place = [titleCase(a.mu), a.c && `${a.c} County`].filter(Boolean).join(', ');
  return `<div class="asset-pop">
    <span class="kind">${ASSET_TYPES[a.a] || a.a}</span>
    <strong>${esc(titleCase(a.n) || 'Unnamed')}</strong>
    ${a.t ? `<span>${esc(a.t)}</span>` : ''}
    ${a.ad ? `<span>${esc(titleCase(a.ad))}</span>` : ''}
    ${place ? `<span>${esc(place)}</span>` : ''}
    <span class="flood-tag tag-${a.f}">${ASSET_FLOOD[a.f]}</span>
  </div>`;
}

export function assetTip(f) {
  const a = f.properties;
  return `<div class="asset-tip"><strong>${esc(titleCase(a.n) || ASSET_TYPES[a.a])}</strong><span class="tag-${a.f}">${ASSET_FLOOD[a.f]}</span></div>`;
}

export function finding(state) {
  const assets = Object.values(state.assets).reduce((s, [t, f]) => [s[0] + t, s[1] + f], [0, 0]);
  return `<div class="card-label">Statewide, Flood Today</div>
    <p><b>${count(state.flood.parcels)}</b> properties at high flood risk</p>
    <p><b>${money(state.flood.value)}</b> in property value</p>
    <p><b>${count(assets[1])}</b> of ${count(assets[0])} public assets in the floodplain</p>`;
}

export function legend(zoomedIn, assetsOn) {
  const ramp = FLOOD_RAMP.colors.map((c, i) => `<li><span class="sw" style="background:${c}"></span>${FLOOD_RAMP.labels[i]}</li>`).join('');
  return `<div class="legend-title">${FLOOD_RAMP.title}</div>
    <ul class="legend-list">${ramp}
      <li><span class="sw sw-hatch"></span>No property data from the state</li>
      <li><span class="sw sw-dots"></span>No FEMA flood map</li>
      ${zoomedIn ? '<li><span class="sw sw-floodplain"></span>FEMA 100-year floodplain</li><li><span class="sw sw-parcel"></span>Property at high flood risk</li>' : ''}
      ${assetsOn ? '<li><span class="dot dot-y"></span>Asset in floodplain</li><li><span class="dot dot-n"></span>Asset not in floodplain</li><li><span class="dot dot-m"></span>Asset, no FEMA map</li>' : ''}
    </ul>`;
}

export function parcelPopup(f) {
  return `<div class="asset-pop"><span class="kind">Property at High Flood Risk</span>
    <strong>${pct(f.properties.pf)} of its land is in the floodplain</strong></div>`;
}

export function about() {
  return `<h2>About This Draft</h2>
    <p>Flood risk only for now. Wildfire comes next.</p>
    <h3>High Flood Risk</h3>
    <p>A property is at high flood risk when half or more of its land is in the ${FLOODPLAIN_LABEL}. This measures land, not buildings.</p>
    <h3>Sources</h3>
    <ul>
      <li>FEMA National Flood Hazard Layer, 100-year floodplain</li>
      <li>State of Colorado public parcels and county assessor values</li>
      <li>US Census 2020 blocks, for estimated residents</li>
      <li>State of Colorado county and municipal boundaries</li>
      <li>Public assets: federal, state and Trust for Public Land datasets</li>
    </ul>
    <h3>Gaps</h3>
    <p>19 counties have no state property data. 18 counties have no FEMA flood map. Gaps are shown as patterns, never as zero risk.</p>`;
}
