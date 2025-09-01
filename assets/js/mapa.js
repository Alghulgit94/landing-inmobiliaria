// Mapa Leaflet + carga de KML -> GeoJSON usando toGeoJSON
const map = L.map('map', { zoomControl: true, zoomAnimation: true }).setView([-25.700357, -56.240920], 17);

// Tile layer (usar OSM y estilizar con CSS para escala de grises)
const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 });
base.addTo(map);

// Control de capas por estado
const capas = {
  disponibles: L.layerGroup(),
  reservados: L.layerGroup(),
  vendidos: L.layerGroup()
};

// Función para color por estado
function colorByEstado(estado) {
  estado = (estado || '').toString().toLowerCase();
  if (estado.includes('disp')) return '#28a745';
  if (estado.includes('res')) return '#ffc107';
  if (estado.includes('ven')) return '#dc3545';
  return '#6c757d';
}

// Cargar KML y convertir
fetch('assets/loteo.kml').then(r => r.text()).then(kmlText => {
  const parser = new DOMParser();
  const kml = parser.parseFromString(kmlText, 'text/xml');
  const geojson = toGeoJSON.kml(kml);

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    console.error('GeoJSON vacío o KML mal formado', geojson);
    alert('Error: No se pudo leer el KML (ver consola).');
    return;
  }

  geojson.features.forEach(f => {
    // toGeoJSON transforma <Data name="..."><value>..</value></Data> a properties.name = value
    const props = f.properties || {};
    // Normalizar estado: buscar en properties.estado o en cualquier propiedad que contenga "estado" o "status"
    let estado = props.estado || props.Estado || props.status || props.Status || '';
    // A veces en KML vienen como <name> para el lote
    const nombre = props.name || f.properties.name || props.Name || 'Sin nombre';
    // Construir capa GeoJSON para este feature
    const layer = L.geoJSON(f, {
      style: { color: '#111', weight: 1, fillColor: colorByEstado(estado), fillOpacity: 0.65 },
      onEachFeature: (feature, l) => {
        const est = estado || 'desponible';
        l.bindPopup('<strong>' + (nombre || 'Lote') + '</strong><br>Estado: ' + (est || 'Desconocido'));
        l.on('click', () => { l.openPopup(); });
      }
    });

    // Añadir a la capa correspondiente
    const key = (estado || '').toString().toLowerCase();
    if (key.includes('disp')) capas.disponibles.addLayer(layer);
    else if (key.includes('res')) capas.reservados.addLayer(layer);
    else if (key.includes('ven')) capas.vendidos.addLayer(layer);
    else capas.disponibles.addLayer(layer); // por defecto

  });

  // Añadir todas las capas al mapa (puedes cambiarlas por defecto)
  capas.disponibles.addTo(map);
  capas.reservados.addTo(map);
  capas.vendidos.addTo(map);

  // Control nativo de Leaflet para toggle de capas
  L.control.layers(null, {
    'Disponibles': capas.disponibles,
    'Reservados': capas.reservados,
    'Vendidos': capas.vendidos
  }, { collapsed: false }).addTo(map);

  // Ajustar vista a los bounds de todos los lotes
  const all = L.featureGroup([capas.disponibles, capas.reservados, capas.vendidos]);
  try {
    map.fitBounds(all.getBounds(), { padding: [40, 40] });
  } catch (e) {
    console.warn('No se pudo ajustar bounds:', e);
  }

  // Añadir leyenda personalizada
  const legend = L.control({ position: 'topright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend-box');
    div.innerHTML = '<div style="font-weight:700;margin-bottom:8px">COLORES LOTES</div>' +
      '<div class="legend-row"><span class="legend-swatch" style="background:#28a745"></span> Disponibles</div>' +
      '<div class="legend-row"><span class="legend-swatch" style="background:#ffc107"></span> Reservados</div>' +
      '<div class="legend-row"><span class="legend-swatch" style="background:#dc3545"></span> Vendidos</div>';
    return div;
  };
  legend.addTo(map);

}).catch(err => {
  console.error('Error leyendo KML:', err);
  alert('Error cargando KML. Revisa la consola.');
});

// UI botones de header
document.getElementById('back')?.addEventListener('click', () => window.history.back());

// Satélite toggle: simple swap de capa (usar sat tiles si disponible)
let satLayer = null;
document.getElementById('satToggle')?.addEventListener('click', function () {
  if (!satLayer) {
    satLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], maxZoom: 20 });
  }
  if (map.hasLayer(satLayer)) { map.removeLayer(satLayer); this.classList.remove('active'); }
  else { satLayer.addTo(map); this.classList.add('active'); }
});

// Gray toggle: invierte filtro CSS (demostración)
let gray = true;
document.getElementById('grayToggle')?.addEventListener('click', function () {
  gray = !gray;
  const tiles = document.querySelectorAll('.leaflet-tile');
  tiles.forEach(t => { t.style.filter = gray ? 'grayscale(100%) contrast(95%) brightness(92%)' : 'none'; });
  this.classList.toggle('active');
});
