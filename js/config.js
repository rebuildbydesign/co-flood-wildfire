// Settings for the whole tool: map, colours, breaks, labels.

export const MAPBOX_TOKEN = 'pk.eyJ1IjoiajAwYnkiLCJhIjoiY2x1bHUzbXZnMGhuczJxcG83YXY4czJ3ayJ9.S5PZpU9VDwLMjoX_0x5FDQ';
export const BASEMAP = 'mapbox://styles/mapbox/dark-v11';
export const CO_BOUNDS = [[-109.06, 36.99], [-102.04, 41.0]];

export const VIEWS = {
  county: { label: 'County', file: 'data/county.geojson', pick: 'Select a County' },
  town: { label: 'Town', file: 'data/town.geojson', pick: 'Select a Town' },
};

export const COLORS = {
  flood: '#3a7fc3', floodLite: '#a5d5f1',
  hatchBg: '#26292b', hatchLine: '#6d7275',
  assetNo: '#8a8f93', outline: '#0c0d0e', selected: '#ffffff',
};

// Share of properties at high flood risk. Upper bounds per class.
export const FLOOD_RAMP = {
  title: 'Share of Properties at High Flood Risk',
  stops: [0.01, 0.03, 0.10],
  colors: ['#1c3045', '#2a5784', '#3a7fc3', '#a5d5f1'],
  labels: ['Under 1%', '1–3%', '3–10%', '10%+'],
};

export const ZOOM = { parcels: 11, floodplain: 9, placesFade: [9, 12] };

export const ASSET_TYPES = {
  AIRPORT: 'Airports',
  BRIDGE: 'Bridges and Culverts',
  DAM: 'Dams',
  FIRE_EMS: 'Fire and EMS Stations',
  HOSPITAL: 'Hospitals',
  LIBRARY: 'Libraries',
  NURSING_ASSISTED: 'Nursing and Assisted Living',
  PARK: 'Parks and Open Space',
  POLICE: 'Police Stations',
  POWER_PLANT: 'Power Plants',
  PUBLIC_HOUSING: 'Public Housing',
  SCHOOL: 'Schools and Colleges',
  SHELTER: 'Emergency Shelters',
  SOLID_WASTE: 'Solid Waste Sites',
  SUPERFUND: 'Superfund Sites',
  TOWN_HALL_COURTHOUSE: 'Town Halls and Courthouses',
  WASTEWATER: 'Wastewater Plants',
};

// Asset flood codes from the build: y = in floodplain, n = not, m = no FEMA map.
export const ASSET_FLOOD = {
  y: 'In the FEMA 100-year floodplain',
  n: 'Not in the floodplain',
  m: 'No FEMA flood map here',
};

export const FLOODPLAIN_LABEL = 'FEMA 100-year floodplain (current effective maps, downloaded Nov 2026)';
