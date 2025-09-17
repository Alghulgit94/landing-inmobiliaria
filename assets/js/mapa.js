// Mapa Leaflet + carga de KML -> GeoJSON usando toGeoJSON
// Disable default zoom control since we'll use custom ones
const map = L.map('map', { zoomControl: false, zoomAnimation: true }).setView([-25.700357, -56.240920], 17);

// Tile layer (usar OSM y estilizar con CSS para escala de grises)
const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 });
base.addTo(map);

// Control de capas por estado
const capas = {
  disponibles: L.layerGroup(),
  reservados: L.layerGroup(),
  vendidos: L.layerGroup()
};

// Filter state management
let filterState = {
  disponibles: true,
  reservados: true,
  vendidos: true
};

// Parcel counts for legend
let parcelCounts = {
  disponibles: 0,
  reservados: 0,
  vendidos: 0
};

// Sidebar functionality - Initialize after DOM is loaded
let sidebarLeft, sidebarClose, emptyState, parcelInfo;
let parcelImage, parcelStatusBadge, parcelName, parcelLocation, parcelCoordinates;
let parcelDimensions, parcelPrice, reserveBtn;
let isSidebarVisible = false;

// Función para color por estado - Using Design System Colors
function colorByEstado(estado) {
  estado = (estado || '').toString().toLowerCase();
  if (estado.includes('disp')) return '#28a745';  // Green for available
  if (estado.includes('res')) return '#ffc107';   // Yellow for reserved  
  if (estado.includes('ven')) return '#dc3545';   // Red for sold
  return '#6c757d';  // Gray for unknown
}

// Enhanced function for hover color effects
function getHoverStyle(estado) {
  estado = (estado || '').toString().toLowerCase();
  if (estado.includes('disp')) return { fillColor: '#1e7e34', weight: 3, color: '#1F4B43' };
  if (estado.includes('res')) return { fillColor: '#e0a800', weight: 3, color: '#1F4B43' };
  if (estado.includes('ven')) return { fillColor: '#bd2130', weight: 3, color: '#1F4B43' };
  return { fillColor: '#545b62', weight: 3, color: '#1F4B43' };
}

// Initialize DOM elements
function initializeSidebarElements() {
  // Sidebar elements
  sidebarLeft = document.getElementById('sidebarLeft');
  sidebarClose = document.getElementById('sidebarClose');
  emptyState = document.getElementById('emptyState');
  parcelInfo = document.getElementById('parcelInfo');
  
  // Parcel detail elements
  parcelImage = document.getElementById('parcelImage');
  parcelStatusBadge = document.getElementById('parcelStatusBadge');
  parcelName = document.getElementById('parcelName');
  parcelLocation = document.getElementById('parcelLocation');
  parcelCoordinates = document.getElementById('parcelCoordinates');
  parcelDimensions = document.getElementById('parcelDimensions');
  parcelPrice = document.getElementById('parcelPrice');
  reserveBtn = document.getElementById('reserveBtn');
  
  // Initialize event handlers after elements are found
  initializeSidebarEventHandlers();
  initializeFilterEventHandlers();
  initializeZoomEventHandlers();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebarElements);
} else {
  initializeSidebarElements();
}

// Function to get coordinates from feature geometry
function getFeatureCoordinates(feature) {
  if (!feature || !feature.geometry) return { lat: null, lng: null };
  
  // Handle different geometry types
  if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
    // Get centroid of polygon
    const coords = feature.geometry.coordinates[0];
    let latSum = 0, lngSum = 0;
    coords.forEach(coord => {
      lngSum += coord[0]; // longitude
      latSum += coord[1]; // latitude
    });
    return {
      lat: (latSum / coords.length).toFixed(6),
      lng: (lngSum / coords.length).toFixed(6)
    };
  } else if (feature.geometry.type === 'Point') {
    return {
      lat: feature.geometry.coordinates[1].toFixed(6),
      lng: feature.geometry.coordinates[0].toFixed(6)
    };
  }
  
  return { lat: 'N/A', lng: 'N/A' };
}

// Function to show sidebar with parcel data
function showParcelSidebar(parcelData) {
  // Check if elements exist
  if (!sidebarLeft || !parcelInfo) {
    return;
  }
  
  // Set header image (use placeholder if no image available)
  const imageUrl = parcelData.photo || parcelData.imagen || 'https://via.placeholder.com/350x200/2f8b46/ffffff?text=Propiedad';
  if (parcelImage) {
    parcelImage.src = imageUrl;
    parcelImage.alt = `Imagen de ${parcelData.name || 'la propiedad'}`;
  }
  
  // Set status with proper styling
  const estado = (parcelData.estado || 'disponible').toString().toLowerCase();
  let statusText = 'Disponible';
  let statusClass = 'disponible';
  
  if (estado.includes('res')) {
    statusText = 'Reservado';
    statusClass = 'reservado';
  } else if (estado.includes('ven')) {
    statusText = 'Vendido';
    statusClass = 'vendido';
  }
  
  if (parcelStatusBadge) {
    parcelStatusBadge.textContent = statusText;
    parcelStatusBadge.className = `status-badge ${statusClass}`;
  }
  
  // Set parcel name/number
  if (parcelName) {
    parcelName.textContent = parcelData.name || 'N/A';
  }
  
  // Set coordinates
  const coords = getFeatureCoordinates(parcelData.feature);
  if (parcelCoordinates) {
    parcelCoordinates.textContent = `${coords.lat}, ${coords.lng}`;
  }
  
  // Set dimensions
  const dimensions = parcelData.largoxancho || parcelData.LargoxAncho || parcelData.dimensions;
  if (parcelDimensions) {
    if (dimensions && dimensions !== 'null' && dimensions !== '') {
      parcelDimensions.textContent = dimensions;
    } else {
      const largo = parcelData.largo || parcelData.Largo || parcelData.length;
      const ancho = parcelData.ancho || parcelData.Ancho || parcelData.width;
      const area = parcelData.area || parcelData.Area || parcelData.superficie || parcelData.Superficie;
      
      if (largo && ancho) {
        parcelDimensions.textContent = `${largo} x ${ancho} m`;
      } else if (area && area !== 'null' && area !== '') {
        parcelDimensions.textContent = `${area} m²`;
      } else {
        parcelDimensions.textContent = 'N/A';
      }
    }
  }
  
  // Set price with currency formatting
  const price = parcelData.precio || parcelData.price;
  if (parcelPrice) {
    if (price && price !== 'null' && price !== '') {
      // Format price as currency (assuming USD or PYG)
      const formattedPrice = new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
      }).format(price);
      parcelPrice.textContent = formattedPrice;
    } else {
      parcelPrice.textContent = 'Consultar';
    }
  }
  
  // Configure reserve button based on availability
  if (reserveBtn) {
    if (estado.includes('disp')) {
      reserveBtn.style.display = 'block';
      reserveBtn.onclick = () => handleReservation(parcelData);
    } else {
      reserveBtn.style.display = 'none';
    }
  }
  
  // Show parcel details and hide empty state
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  if (parcelInfo) {
    parcelInfo.classList.add('active');
  }
  
  // Open sidebar with animation
  sidebarLeft.classList.add('open');
  
  isSidebarVisible = true;
}

// Function to hide sidebar
function hideParcelSidebar() {
  if (!sidebarLeft) {
    return;
  }
  
  // Hide parcel details and show empty state
  if (parcelInfo) {
    parcelInfo.classList.remove('active');
  }
  if (emptyState) {
    emptyState.style.display = 'block';
  }
  
  // Close sidebar with animation
  sidebarLeft.classList.remove('open');
  
  isSidebarVisible = false;
}

// Function to toggle sidebar visibility
function toggleParcelSidebar() {
  if (isSidebarVisible) {
    hideParcelSidebar();
  }
}

// Handle reservation action
function handleReservation(parcelData) {
  const phoneNumber = '+595971234567'; // Replace with actual phone number
  const coords = getFeatureCoordinates(parcelData.feature);
  const message = `Hola, estoy interesado en reservar el ${parcelData.name || 'lote'} en Colonia Independencia. Coordenadas: ${coords.lat}, ${coords.lng}`;
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  // Keep sidebar open after opening WhatsApp
}

// Initialize sidebar event handlers
function initializeSidebarEventHandlers() {
  if (!sidebarClose || !sidebarLeft) {
    return;
  }
  
  // Sidebar event handlers
  sidebarClose.addEventListener('click', hideParcelSidebar);

  // Prevent sidebar from closing when clicking inside it
  sidebarLeft.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close sidebar with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSidebarVisible) {
      hideParcelSidebar();
    }
  });
}

// Initialize filter event handlers
function initializeFilterEventHandlers() {
  const filterElements = {
    disponible: document.getElementById('filterDisponible'),
    reservado: document.getElementById('filterReservado'),
    vendido: document.getElementById('filterVendido')
  };
  
  Object.keys(filterElements).forEach(status => {
    const element = filterElements[status];
    if (element) {
      // Handle checkbox changes
      element.addEventListener('change', () => {
        toggleFilter(status);
      });
      
      // Handle clicks on the entire filter row
      const filterRow = element.closest('.legend-item');
      if (filterRow) {
        filterRow.addEventListener('click', (e) => {
          if (e.target !== element) {
            element.checked = !element.checked;
            toggleFilter(status);
          }
        });
      }
    }
  });
}

// Initialize zoom control event handlers
function initializeZoomEventHandlers() {
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      map.zoomIn();
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      map.zoomOut();
    });
  }
}

// Toggle filter function
function toggleFilter(status) {
  // Map filter status to layer keys
  const statusMap = {
    'disponible': 'disponibles',
    'reservado': 'reservados', 
    'vendido': 'vendidos'
  };
  
  const layerKey = statusMap[status];
  if (layerKey) {
    filterState[layerKey] = !filterState[layerKey];
    
    // Update checkbox visual state
    const checkbox = document.getElementById(`filter${status.charAt(0).toUpperCase() + status.slice(1)}`);
    if (checkbox) {
      checkbox.checked = filterState[layerKey];
    }
    
    // Update map layers visibility
    updateLayerVisibility();
  }
}

// Update layer visibility based on filter state
function updateLayerVisibility() {
  Object.keys(capas).forEach(key => {
    const layer = capas[key];
    if (filterState[key]) {
      if (!map.hasLayer(layer)) {
        layer.addTo(map);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  });
}

// Update parcel counts in legend
function updateParcelCounts() {
  const countMap = {
    'disponibles': 'countDisponible',
    'reservados': 'countReservado',
    'vendidos': 'countVendido'
  };
  
  Object.keys(parcelCounts).forEach(status => {
    const countElementId = countMap[status];
    if (countElementId) {
      const countElement = document.getElementById(countElementId);
      if (countElement) {
        countElement.textContent = parcelCounts[status];
      }
    }
  });
}

// Cargar KML y convertir
fetch('assets/loteo.kml')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(kmlText => {
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
      
      // Enhanced lote data object
      const loteData = {
        name: nombre,
        estado: estado,
        area: props.area || props.Area || props.superficie || props.Superficie || null,
        precio: props.precio || props.Precio || props.price || props.Price || null,
        largo: props.largo || props.Largo || props.length || null,
        ancho: props.ancho || props.Ancho || props.width || null,
        largoxancho: props.largoxancho || props.LargoxAncho || props.dimensions || null,
        feature: f, // Include the feature for coordinate extraction
        ...props // Include all other properties
      };
      
      // Create enhanced layer with hover effects and sidebar integration
      const layer = L.geoJSON(f, {
        style: { 
          color: '#1F4B43', 
          weight: 2, 
          fillColor: colorByEstado(estado), 
          fillOpacity: 0.7,
          dashArray: '',
          opacity: 1
        },
        onEachFeature: (feature, layer) => {
          // Hover effects
          layer.on('mouseover', function(e) {
            const currentLayer = e.target;
            const hoverStyle = getHoverStyle(estado);
            
            currentLayer.setStyle({
              ...hoverStyle,
              fillOpacity: 0.9
            });
          });

          layer.on('mouseout', function(e) {
            const currentLayer = e.target;
            currentLayer.setStyle({
              color: '#1F4B43',
              weight: 2,
              fillColor: colorByEstado(estado),
              fillOpacity: 0.7,
              dashArray: '',
              opacity: 1
            });
          });
          
          // Click handler - now opens sidebar instead of modal
          layer.on('click', function(e) {
            // Stop event propagation to prevent map click
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
              e.originalEvent.preventDefault();
            }
            L.DomEvent.stopPropagation(e);
            
            showParcelSidebar(loteData);
          });
        }
      });

      // Añadir a la capa correspondiente y contar parcelas
      const key = (estado || '').toString().toLowerCase();
      if (key.includes('disp')) {
        capas.disponibles.addLayer(layer);
        parcelCounts.disponibles++;
      } else if (key.includes('res')) {
        capas.reservados.addLayer(layer);
        parcelCounts.reservados++;
      } else if (key.includes('ven')) {
        capas.vendidos.addLayer(layer);
        parcelCounts.vendidos++;
      } else {
        capas.disponibles.addLayer(layer); // por defecto
        parcelCounts.disponibles++;
      }
    });

    // Initialize with all layers visible
    capas.disponibles.addTo(map);
    capas.reservados.addTo(map);
    capas.vendidos.addTo(map);

    // Update parcel counts in the sidebar legend
    updateParcelCounts();

    // Ajustar vista a los bounds de todos los lotes
    const all = L.featureGroup([capas.disponibles, capas.reservados, capas.vendidos]);
    try {
      map.fitBounds(all.getBounds(), { padding: [40, 40] });
    } catch (e) {
      console.warn('No se pudo ajustar bounds:', e);
    }

  }).catch(err => {
    console.error('Error leyendo KML:', err);
    alert('Error cargando KML. Revisa la consola.');
  });

// Hide sidebar when clicking on map background
map.on('click', function(e) {
  if (isSidebarVisible) {
    hideParcelSidebar();
  }
});

// UI botones - removed back button as per requirements

// Enhanced Satélite toggle with proper styling
let satLayer = null;
document.getElementById('satToggle')?.addEventListener('click', function () {
  if (!satLayer) {
    satLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], 
      maxZoom: 20,
      attribution: '© Google'
    });
  }
  if (map.hasLayer(satLayer)) { 
    map.removeLayer(satLayer); 
    this.classList.remove('active'); 
  } else { 
    satLayer.addTo(map); 
    this.classList.add('active'); 
  }
});

// Enhanced Gray toggle with better visual feedback
let gray = false; // Start with normal colors
document.getElementById('grayToggle')?.addEventListener('click', function () {
  gray = !gray;
  const tiles = document.querySelectorAll('.leaflet-tile');
  tiles.forEach(t => { 
    t.style.filter = gray ? 'grayscale(100%) contrast(95%) brightness(92%)' : 'none'; 
  });
  this.classList.toggle('active');
  
  // Apply filter to future tiles as well
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1 && node.classList.contains('leaflet-tile')) {
          node.style.filter = gray ? 'grayscale(100%) contrast(95%) brightness(92%)' : 'none';
        }
      });
    });
  });
  
  observer.observe(document.getElementById('map'), { childList: true, subtree: true });
});