// Mapa Leaflet + carga de KML -> GeoJSON usando toGeoJSON
// Disable default zoom control since we'll use custom ones
const map = L.map('map', { zoomControl: false, zoomAnimation: true }).setView([-25.695804, -56.174242], 16);

// ===========================
// URL PARAMETER HANDLING
// ===========================

/**
 * Parse URL parameters for loteamiento data
 * @returns {Object|null} Parsed parameters or null
 */
function parseURLParameters() {
  const params = new URLSearchParams(window.location.search);

  const loteamientoId = params.get('loteamiento');
  const loteamientoName = params.get('name');
  const lat = params.get('lat');
  const lng = params.get('lng');

  if (loteamientoId) {
    return {
      id: loteamientoId,
      name: loteamientoName || 'Loteamiento',
      lat: parseFloat(lat) || null,
      lng: parseFloat(lng) || null
    };
  }

  return null;
}

// Parse URL parameters on page load
const urlParams = parseURLParameters();

// ===========================
// TOOLTIP CLASS - Following Single Responsibility Principle
// ===========================
class ParcelTooltip {
  constructor(containerId) {
    this.tooltip = document.getElementById(containerId);
    this.nameElement = document.getElementById('tooltipName');
    this.dimensionsElement = document.getElementById('tooltipDimensions');
    this.isVisible = false;
    this.currentTarget = null;

    // Bind methods to preserve context
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.updatePosition = this.updatePosition.bind(this);

    // Initialize error handling
    if (!this.tooltip || !this.nameElement || !this.dimensionsElement) {
      console.warn('Tooltip elements not found. Tooltip functionality will be disabled.');
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  /**
   * Format parcel dimensions for display
   * @param {Object} parcelData - The parcel data object
   * @returns {string} Formatted dimensions string
   */
  formatDimensions(parcelData) {
    // Check for pre-formatted dimensions
    const preFormatted = parcelData.largoxancho || parcelData.LargoxAncho || parcelData.dimensions;
    if (preFormatted && preFormatted !== 'null' && preFormatted !== '') {
      return preFormatted;
    }

    // Try to construct from individual values
    const largo = parcelData.largo || parcelData.Largo || parcelData.length;
    const ancho = parcelData.ancho || parcelData.Ancho || parcelData.width;

    if (largo && ancho && largo !== 'null' && ancho !== 'null') {
      return `${largo} x ${ancho}`;
    }

    // Fallback to area if available
    const area = parcelData.area || parcelData.Area || parcelData.superficie || parcelData.Superficie;
    if (area && area !== 'null' && area !== '') {
      return `${area} m²`;
    }

    return 'Dimensiones no disponibles';
  }

  /**
   * Show tooltip with parcel information
   * @param {Object} parcelData - The parcel data object
   * @param {number} x - Mouse X coordinate (viewport coordinates)
   * @param {number} y - Mouse Y coordinate (viewport coordinates)
   */
  show(parcelData, x, y) {
    if (!this.enabled || !parcelData) return;

    // Update content
    const name = parcelData.name || 'Lote sin nombre';
    const dimensions = this.formatDimensions(parcelData);

    this.nameElement.textContent = name;
    this.dimensionsElement.textContent = dimensions;

    // Update ARIA attributes for accessibility
    this.tooltip.setAttribute('aria-hidden', 'false');

    // Show tooltip first to ensure it renders
    this.tooltip.classList.add('visible');
    this.isVisible = true;

    // Initialize with default arrow direction
    this.tooltip.classList.add('arrow-left');
    this.tooltip.classList.remove('arrow-right');

    // Use requestAnimationFrame to ensure tooltip is rendered before positioning
    requestAnimationFrame(() => {
      this.updatePosition(x, y);
    });
  }

  /**
   * Hide tooltip
   */
  hide() {
    if (!this.enabled) return;

    this.tooltip.classList.remove('visible');
    this.tooltip.setAttribute('aria-hidden', 'true');
    this.isVisible = false;
    this.currentTarget = null;
  }

  /**
   * Update tooltip position with side arrow pointing toward mouse
   * @param {number} x - Mouse X coordinate (viewport coordinates)
   * @param {number} y - Mouse Y coordinate (viewport coordinates)
   */
  updatePosition(x, y) {
    if (!this.enabled || !this.isVisible) return;

    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;

    const containerRect = mapContainer.getBoundingClientRect();

    // Convert viewport coordinates to container-relative coordinates
    let mouseX = x - containerRect.left;
    let mouseY = y - containerRect.top;

    // Get tooltip dimensions - handle case where it's not rendered yet
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 150; // fallback width
    const tooltipHeight = tooltipRect.height || 60; // fallback height

    // Position tooltip to the right of the cursor with side arrow pointing left
    const arrowOffset = 12; // Space for the arrow
    const cursorOffset = 5; // Small gap between cursor and arrow
    const padding = 10;

    // Calculate initial position (to the right of cursor)
    let left = mouseX + cursorOffset + arrowOffset;
    let top = mouseY - (tooltipHeight / 2); // Center vertically on cursor

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Check if tooltip would overflow right edge
    if (left + tooltipWidth > containerWidth - padding) {
      // Position to the left of cursor instead
      left = mouseX - cursorOffset - arrowOffset - tooltipWidth;

      // Update arrow to point right (will be handled in CSS with a class)
      this.tooltip.classList.add('arrow-right');
      this.tooltip.classList.remove('arrow-left');
    } else {
      // Position to the right of cursor (default)
      this.tooltip.classList.add('arrow-left');
      this.tooltip.classList.remove('arrow-right');
    }

    // Ensure tooltip doesn't go beyond left edge
    if (left < padding) {
      left = padding;
    }

    // Vertical boundary checking
    if (top < padding) {
      top = padding;
    } else if (top + tooltipHeight > containerHeight - padding) {
      top = containerHeight - tooltipHeight - padding;
    }

    // Apply position
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.transform = 'none';
  }

  /**
   * Check if tooltip is currently visible
   * @returns {boolean}
   */
  isTooltipVisible() {
    return this.isVisible;
  }

  /**
   * Get current target
   * @returns {Object|null}
   */
  getCurrentTarget() {
    return this.currentTarget;
  }
}

// Initialize tooltip instance
const parcelTooltip = new ParcelTooltip('parcelTooltip');

// ===========================
// MOBILE RESPONSIVENESS MANAGER - Following Single Responsibility Principle
// ===========================
class MobileResponsiveManager {
  constructor() {
    this.isMobile = false;
    this.breakpoint = 768; // Match CSS media query exactly
    this.initialized = false;

    // Bind methods to preserve context
    this.checkScreenSize = this.checkScreenSize.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.init = this.init.bind(this);

    this.init();
  }

  init() {
    if (this.initialized) return;

    this.checkScreenSize();
    window.addEventListener('resize', this.handleResize);
    this.initialized = true;
  }

  checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < this.breakpoint;

    if (wasMobile !== this.isMobile) {
      this.handleLayoutChange();
    }
  }

  handleResize() {
    // Debounce resize events for performance
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.checkScreenSize();
    }, 150);
  }

  handleLayoutChange() {
    // Notify other components about layout change
    if (this.isMobile) {
      this.enableMobileMode();
    } else {
      this.disableMobileMode();
    }
  }

  enableMobileMode() {
    // Hide any open desktop sidebars
    if (isSidebarVisible) {
      hideParcelSidebar();
    }
  }

  disableMobileMode() {
    // Hide mobile components when switching to desktop
    if (window.mobileParcelCard && window.mobileParcelCard.isCardVisible()) {
      window.mobileParcelCard.hide();
    }
    if (window.mobileBottomSheets) {
      window.mobileBottomSheets.hideAll();
    }
  }

  isMobileDevice() {
    return this.isMobile;
  }
}

// ===========================
// MOBILE PARCEL CARD COMPONENT - Following Single Responsibility Principle
// ===========================
class MobileParcelCard {
  constructor() {
    this.card = null;
    this.elements = {};
    this.isVisible = false;
    this.currentParcelData = null;
    this.initialized = false;

    // Bind methods
    this.init = this.init.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleReservation = this.handleReservation.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  init() {
    if (this.initialized) {
      return;
    }

    this.card = document.getElementById('mobileParcelCard');

    if (!this.card) {
      console.error('Mobile parcel card element with ID "mobileParcelCard" not found in DOM!');
      return;
    }

    // Cache DOM elements
    this.elements = {
      image: document.getElementById('mobileCardImage'),
      title: document.getElementById('mobileCardTitle'),
      status: document.getElementById('mobileCardStatus'),
      location: document.getElementById('mobileCardLocation'),
      coordinates: document.getElementById('mobileCardCoordinates'),
      price: document.getElementById('mobileCardPrice'),
      reserveBtn: document.getElementById('mobileReserveBtn'),
      closeBtn: document.getElementById('mobileCardClose')
    };

    // Initialize event listeners
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', this.handleClose);
    }

    if (this.elements.reserveBtn) {
      this.elements.reserveBtn.addEventListener('click', this.handleReservation);
    }

    // Add swipe-to-dismiss functionality
    this.addSwipeGestures();

    this.initialized = true;
  }

  addSwipeGestures() {
    if (!this.card) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    this.card.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.card.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.card.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  handleTouchStart(e) {
    if (!this.isVisible) return;
    this.startY = e.touches[0].clientY;
    this.isDragging = true;
  }

  handleTouchMove(e) {
    if (!this.isDragging || !this.isVisible) return;

    this.currentY = e.touches[0].clientY;
    const deltaY = this.currentY - this.startY;

    // Only allow downward swipes
    if (deltaY > 0) {
      e.preventDefault();
      const opacity = Math.max(0.3, 1 - (deltaY / 200));
      const translateY = Math.min(deltaY, 150);

      this.card.style.transform = `translateY(${translateY}px)`;
      this.card.style.opacity = opacity;
    }
  }

  handleTouchEnd(e) {
    if (!this.isDragging || !this.isVisible) return;

    this.isDragging = false;
    const deltaY = this.currentY - this.startY;

    if (deltaY > 80) {
      // Dismiss if swiped down enough
      this.hide();
    } else {
      // Reset position
      this.card.style.transform = '';
      this.card.style.opacity = '';
    }
  }

  show(parcelData) {
    if (!this.card || !parcelData) {
      return;
    }

    this.currentParcelData = parcelData;

    // Hide tooltip if visible
    if (parcelTooltip.enabled) {
      parcelTooltip.hide();
    }

    // Update card content
    this.updateCardContent(parcelData);

    // Show card with floating animation
    if (window.innerWidth < 768) {
      this.card.style.display = 'block';
      this.card.style.visibility = 'visible';
    } else {
      return;
    }

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      this.card.classList.add('visible');
      this.isVisible = true;
    });
  }

  updateCardContent(parcelData) {
    // Set image - use data URL for placeholder to avoid network issues
    const imageUrl = parcelData.photo || parcelData.imagen || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%232f8b46"/%3E%3Ctext x="40" y="45" font-family="Arial" font-size="12" fill="white" text-anchor="middle"%3ELote%3C/text%3E%3C/svg%3E';
    if (this.elements.image) {
      this.elements.image.src = imageUrl;
      this.elements.image.alt = `Imagen de ${parcelData.name || 'la propiedad'}`;
    }

    // Set title
    if (this.elements.title) {
      this.elements.title.textContent = parcelData.name || 'Lote N/A';
    }

    // Set status
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

    if (this.elements.status) {
      this.elements.status.textContent = statusText;
      this.elements.status.className = `mobile-card-status ${statusClass}`;
    }

    // Set coordinates from centroid data
    if (this.elements.coordinates) {
      const lat = parcelData.centroide_lat || parcelData.centroid_lat;
      const lng = parcelData.centroide_lng || parcelData.centroid_lng;

      if (lat && lng) {
        // Format with 6 decimal places for precision
        const formattedLat = typeof lat === 'number' ? lat.toFixed(6) : parseFloat(lat).toFixed(6);
        const formattedLng = typeof lng === 'number' ? lng.toFixed(6) : parseFloat(lng).toFixed(6);
        this.elements.coordinates.textContent = `${formattedLat}, ${formattedLng}`;
      } else {
        this.elements.coordinates.textContent = 'N/A';
      }
    }

    // Set price
    const price = parcelData.precio || parcelData.price;
    if (this.elements.price) {
      if (price && price !== 'null' && price !== '') {
        const formattedPrice = new Intl.NumberFormat('es-PY', {
          style: 'currency',
          currency: 'PYG',
          minimumFractionDigits: 0
        }).format(price);
        this.elements.price.textContent = formattedPrice;
      } else {
        this.elements.price.textContent = 'Consultar';
      }
    }

    // Configure reserve button
    if (this.elements.reserveBtn) {
      if (estado.includes('disp')) {
        this.elements.reserveBtn.style.display = 'block';
      } else {
        this.elements.reserveBtn.style.display = 'none';
      }
    }
  }

  hide() {
    if (!this.card) return;

    this.card.classList.remove('visible');

    // Hide after animation completes
    setTimeout(() => {
      this.card.style.display = 'none';
    }, 300);

    this.isVisible = false;
    this.currentParcelData = null;
  }

  handleClose() {
    this.hide();
  }

  handleReservation() {
    if (this.currentParcelData) {
      handleReservation(this.currentParcelData);
    }
  }

  isCardVisible() {
    return this.isVisible;
  }
}

// ===========================
// MOBILE BOTTOM SHEETS MANAGER - Following Single Responsibility Principle
// ===========================
class MobileBottomSheets {
  constructor() {
    this.sheets = {};
    this.backdrops = {};
    this.currentSheet = null;
    this.initialized = false;

    // Bind methods
    this.init = this.init.bind(this);
    this.showSheet = this.showSheet.bind(this);
    this.hideSheet = this.hideSheet.bind(this);
    this.hideAll = this.hideAll.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleMapToggle = this.handleMapToggle.bind(this);
    this.handleLegendToggle = this.handleLegendToggle.bind(this);
  }

  init() {
    if (this.initialized) {
      return;
    }

    // Cache bottom sheet elements
    this.sheets = {
      map: document.getElementById('mapBottomSheet'),
      legend: document.getElementById('legendBottomSheet')
    };

    this.backdrops = {
      map: document.getElementById('mapSheetBackdrop'),
      legend: document.getElementById('legendSheetBackdrop')
    };

    // Initialize FAB buttons
    this.initializeFABs();

    // Initialize sheet interactions
    this.initializeSheetInteractions();

    // Initialize mobile filter sync
    this.initializeMobileFilterSync();

    this.initialized = true;
  }

  initializeFABs() {
    const mapToggle = document.getElementById('mobileMapToggle');
    const legendToggle = document.getElementById('mobileLegendToggle');

    if (mapToggle) {
      mapToggle.addEventListener('click', this.handleMapToggle);
    }

    if (legendToggle) {
      legendToggle.addEventListener('click', this.handleLegendToggle);
    }
  }

  initializeSheetInteractions() {
    // Add backdrop click handlers
    Object.keys(this.backdrops).forEach(key => {
      const backdrop = this.backdrops[key];
      if (backdrop) {
        backdrop.addEventListener('click', () => this.hideSheet(key));
      }
    });

    // Add swipe down to close functionality
    Object.keys(this.sheets).forEach(key => {
      const sheet = this.sheets[key];
      if (sheet) {
        this.addSwipeToClose(sheet, key);
      }
    });
  }

  initializeMobileFilterSync() {
    // Sync mobile filters with desktop filters
    const mobileFilters = {
      disponible: document.getElementById('mobileFilterDisponible'),
      reservado: document.getElementById('mobileFilterReservado'),
      vendido: document.getElementById('mobileFilterVendido')
    };

    const mobileCounts = {
      disponible: document.getElementById('mobileCountDisponible'),
      reservado: document.getElementById('mobileCountReservado'),
      vendido: document.getElementById('mobileCountVendido')
    };

    // Sync mobile satellite and grayscale toggles
    const mobileSatToggle = document.getElementById('mobileSatToggle');
    const mobileGrayToggle = document.getElementById('mobileGrayToggle');
    const mobileNormalToggle = document.getElementById('mobileNormalToggle');
    const desktopSatToggle = document.getElementById('satToggle');
    const desktopGrayToggle = document.getElementById('grayToggle');

    // Filter event handlers
    Object.keys(mobileFilters).forEach(status => {
      const mobileFilter = mobileFilters[status];
      if (mobileFilter) {
        mobileFilter.addEventListener('change', () => {
          toggleFilter(status);
          // Also update the desktop filter
          const desktopFilter = document.getElementById(`filter${status.charAt(0).toUpperCase() + status.slice(1)}`);
          if (desktopFilter) {
            desktopFilter.checked = mobileFilter.checked;
          }
        });

        // Handle option row clicks
        const optionRow = mobileFilter.closest('.mobile-sheet-option');
        if (optionRow) {
          optionRow.addEventListener('click', (e) => {
            if (e.target !== mobileFilter) {
              mobileFilter.checked = !mobileFilter.checked;
              mobileFilter.dispatchEvent(new Event('change'));
            }
          });
        }
      }
    });

    // Mobile map view radio buttons sync
    if (mobileSatToggle && desktopSatToggle) {
      mobileSatToggle.addEventListener('change', () => {
        if (mobileSatToggle.checked) {
          desktopSatToggle.checked = true;
          desktopGrayToggle.checked = false;
          desktopSatToggle.dispatchEvent(new Event('change'));
          desktopGrayToggle.dispatchEvent(new Event('change'));
        }
      });
    }

    if (mobileGrayToggle && desktopGrayToggle) {
      mobileGrayToggle.addEventListener('change', () => {
        if (mobileGrayToggle.checked) {
          desktopGrayToggle.checked = true;
          desktopSatToggle.checked = false;
          desktopGrayToggle.dispatchEvent(new Event('change'));
          desktopSatToggle.dispatchEvent(new Event('change'));
        }
      });
    }

    if (mobileNormalToggle) {
      mobileNormalToggle.addEventListener('change', () => {
        if (mobileNormalToggle.checked) {
          desktopSatToggle.checked = false;
          desktopGrayToggle.checked = false;
          desktopSatToggle.dispatchEvent(new Event('change'));
          desktopGrayToggle.dispatchEvent(new Event('change'));
        }
      });
    }

    // Store references for count updates
    this.mobileCounts = mobileCounts;
  }

  addSwipeToClose(sheet, sheetKey) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handle = sheet.querySelector('.mobile-bottom-sheet-handle');
    const header = sheet.querySelector('.mobile-bottom-sheet-header');

    [handle, header].forEach(element => {
      if (element) {
        element.addEventListener('touchstart', (e) => {
          startY = e.touches[0].clientY;
          isDragging = true;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
          if (!isDragging) return;

          currentY = e.touches[0].clientY;
          const deltaY = currentY - startY;

          if (deltaY > 0) {
            e.preventDefault();
            const translateY = Math.min(deltaY, 200);
            sheet.style.transform = `translateY(${translateY}px)`;
          }
        }, { passive: false });

        element.addEventListener('touchend', () => {
          if (!isDragging) return;

          isDragging = false;
          const deltaY = currentY - startY;

          if (deltaY > 100) {
            this.hideSheet(sheetKey);
          } else {
            sheet.style.transform = '';
          }
        }, { passive: true });
      }
    });
  }

  showSheet(sheetKey) {
    const sheet = this.sheets[sheetKey];
    const backdrop = this.backdrops[sheetKey];

    if (!sheet || !backdrop) {
      return;
    }

    // Hide current sheet if any
    if (this.currentSheet && this.currentSheet !== sheetKey) {
      this.hideSheet(this.currentSheet);
    }

    // Show backdrop
    backdrop.classList.add('visible');

    // Show sheet with slight delay for smooth animation
    setTimeout(() => {
      sheet.classList.add('visible');
    }, 50);

    this.currentSheet = sheetKey;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  hideSheet(sheetKey) {
    const sheet = this.sheets[sheetKey];
    const backdrop = this.backdrops[sheetKey];

    if (!sheet || !backdrop) return;

    // Hide sheet
    sheet.classList.remove('visible');
    sheet.style.transform = '';

    // Hide backdrop with delay
    setTimeout(() => {
      backdrop.classList.remove('visible');
    }, 300);

    if (this.currentSheet === sheetKey) {
      this.currentSheet = null;
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  hideAll() {
    Object.keys(this.sheets).forEach(key => {
      this.hideSheet(key);
    });
  }

  handleBackdropClick() {
    if (this.currentSheet) {
      this.hideSheet(this.currentSheet);
    }
  }

  handleMapToggle() {
    if (this.currentSheet === 'map') {
      this.hideSheet('map');
    } else {
      this.showSheet('map');
    }
  }

  handleLegendToggle() {
    if (this.currentSheet === 'legend') {
      this.hideSheet('legend');
    } else {
      this.showSheet('legend');
    }
  }

  updateMobileCounts(counts) {
    if (!this.mobileCounts) return;

    Object.keys(counts).forEach(status => {
      const mobileCountElement = this.mobileCounts[status];
      if (mobileCountElement) {
        mobileCountElement.textContent = counts[status];
      }
    });
  }
}

// Tile layer (usar OSM y estilizar con CSS para escala de grises)
const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 });
base.addTo(map);

// Control de capas por estado y tipo de objeto
const capas = {
  disponibles: L.layerGroup(),
  reservados: L.layerGroup(),
  vendidos: L.layerGroup(),
  // Add layers for non-LOTE objects that don't use estado-based categorization
  plazas: L.layerGroup(),
  callesProyectadas: L.layerGroup()
};

// Filter state management
let filterState = {
  disponibles: true,
  reservados: true,
  vendidos: true,
  // New layer types are visible by default
  plazas: true,
  callesProyectadas: true
};

// Parcel counts for legend
let parcelCounts = {
  disponibles: 0,
  reservados: 0,
  vendidos: 0
};

// Sidebar functionality - Initialize after DOM is loaded
let sidebarLeft, sidebarClose, emptyState, parcelInfo;
let parcelImage, parcelStatusBadge, parcelName, parcelDescription, parcelLados;
let parcelCoordinates, parcelArea, parcelPrice, reserveBtn;
let isSidebarVisible = false;

// Mobile components - Initialize global instances
let mobileResponsiveManager;
let mobileParcelCard;
let mobileBottomSheets;

// Función para color por estado - Using Design System Colors
function colorByEstado(estado) {
  estado = (estado || '').toString().toLowerCase();
  if (estado.includes('disponible')) return '#28a745';  // Green for disponible
  if (estado.includes('reservado')) return '#ffc107';   // Yellow for reservado
  if (estado.includes('no_disponible') || estado.includes('vendido')) return '#dc3545';   // Red for no_disponible/vendido
  return '#6c757d';  // Gray for unknown
}

// Enhanced function for hover color effects
function getHoverStyle(estado) {
  estado = (estado || '').toString().toLowerCase();
  if (estado.includes('disponible')) return { fillColor: '#1e7e34', weight: 3, color: '#1F4B43' };
  if (estado.includes('reservado')) return { fillColor: '#e0a800', weight: 3, color: '#1F4B43' };
  if (estado.includes('no_disponible') || estado.includes('vendido')) return { fillColor: '#bd2130', weight: 3, color: '#1F4B43' };
  return { fillColor: '#545b62', weight: 3, color: '#1F4B43' };
}

// Object Type Detection and Styling (SOLID Principles Implementation)
// ================================================================

// Object type constants for better maintainability
const OBJECT_TYPES = {
  LOTE: 'LOTE',
  PLAZA: 'PLAZA',
  CALLE_PROYECTADA: 'CALLE PROYECTADA'
};

// Color scheme constants for different object types
const OBJECT_COLORS = {
  [OBJECT_TYPES.LOTE]: {
    border: '#1F4B43',
    // Uses existing estado-based colors
  },
  [OBJECT_TYPES.PLAZA]: {
    border: '#1F4B43',
    fill: '#D3D3D3', // Light gray
    fillHover: '#B0B0B0' // Slightly darker gray for hover
  },
  [OBJECT_TYPES.CALLE_PROYECTADA]: {
    border: '#1F4B43',
    fill: '#D3D3D3', // Light gray
    fillHover: '#B0B0B0' // Slightly darker gray for hover
  }
};

// Single Responsibility: Object type detection
function detectObjectType(properties) {
  const nombreObj = properties.NOMBRE_OBJ || properties.nombre_obj || '';
  const normalizedType = nombreObj.toString().toUpperCase().trim();

  // Return recognized types or default to LOTE
  return Object.values(OBJECT_TYPES).includes(normalizedType)
    ? normalizedType
    : OBJECT_TYPES.LOTE;
}

// Single Responsibility: Style determination based on object type
function getObjectStyle(objectType, estado = '') {
  const baseStyle = {
    color: OBJECT_COLORS[objectType].border,
    weight: 2,
    fillOpacity: 0.7,
    dashArray: '',
    opacity: 1
  };

  if (objectType === OBJECT_TYPES.LOTE) {
    // Use existing estado-based coloring for LOTE objects
    return {
      ...baseStyle,
      fillColor: colorByEstado(estado)
    };
  } else {
    // Use fixed colors for non-LOTE objects
    return {
      ...baseStyle,
      fillColor: OBJECT_COLORS[objectType].fill
    };
  }
}

// Single Responsibility: Hover style determination
function getObjectHoverStyle(objectType, estado = '') {
  const baseHoverStyle = {
    weight: 3,
    color: '#1F4B43',
    fillOpacity: 0.9
  };

  if (objectType === OBJECT_TYPES.LOTE) {
    // Use existing estado-based hover styling for LOTE objects
    const estadoHover = getHoverStyle(estado);
    return {
      ...baseHoverStyle,
      fillColor: estadoHover.fillColor
    };
  } else {
    // Use fixed hover colors for non-LOTE objects
    return {
      ...baseHoverStyle,
      fillColor: OBJECT_COLORS[objectType].fillHover
    };
  }
}

// Interface Segregation: Separate concerns for different object behaviors
function shouldObjectBeClickable(objectType) {
  return objectType === OBJECT_TYPES.LOTE;
}

function shouldObjectShowTooltip(objectType) {
  return objectType === OBJECT_TYPES.LOTE;
}

// Dependency Inversion: Event handler factory that depends on abstractions
function createObjectEventHandlers(objectType, objectData, estado = '') {
  const eventHandlers = {};

  // Always add mouseover and mouseout for styling changes
  eventHandlers.mouseover = function (e) {
    const currentLayer = e.target;
    const hoverStyle = getObjectHoverStyle(objectType, estado);

    // Apply hover styling
    currentLayer.setStyle(hoverStyle);

    // Show tooltip only for objects that should have tooltips
    if (shouldObjectShowTooltip(objectType) && parcelTooltip.enabled && e.originalEvent) {
      const mouseX = e.originalEvent.clientX;
      const mouseY = e.originalEvent.clientY;
      parcelTooltip.show(objectData, mouseX, mouseY);
    }
  };

  eventHandlers.mouseout = function (e) {
    const currentLayer = e.target;

    // Clean up any pending tooltip updates
    if (currentLayer._tooltipUpdateTimer) {
      clearTimeout(currentLayer._tooltipUpdateTimer);
      currentLayer._tooltipUpdateTimer = null;
    }

    // Reset layer styling
    const originalStyle = getObjectStyle(objectType, estado);
    currentLayer.setStyle(originalStyle);

    // Hide tooltip only for objects that show tooltips
    if (shouldObjectShowTooltip(objectType) && parcelTooltip.enabled) {
      parcelTooltip.hide();
    }
  };

  // Add mousemove only for objects that show tooltips
  if (shouldObjectShowTooltip(objectType)) {
    eventHandlers.mousemove = function (e) {
      if (parcelTooltip.enabled && parcelTooltip.isTooltipVisible() && e.originalEvent) {
        const currentLayer = e.target;
        const mouseX = e.originalEvent.clientX;
        const mouseY = e.originalEvent.clientY;
        // Throttle updates to improve performance
        if (!currentLayer._tooltipUpdateTimer) {
          currentLayer._tooltipUpdateTimer = setTimeout(() => {
            parcelTooltip.updatePosition(mouseX, mouseY);
            currentLayer._tooltipUpdateTimer = null;
          }, 16); // ~60fps
        }
      }
    };
  }

  // Add click handler only for clickable objects
  if (shouldObjectBeClickable(objectType)) {
    eventHandlers.click = function (e) {
      // Stop event propagation to prevent map click
      if (e.originalEvent) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
      }
      L.DomEvent.stopPropagation(e);

      const isMobile = mobileResponsiveManager && mobileResponsiveManager.isMobileDevice();

      // Proper mobile/desktop switching
      if (isMobile) {
        // Hide desktop sidebar if it's open
        if (isSidebarVisible) {
          hideParcelSidebar();
        }
        // Show mobile floating card
        if (mobileParcelCard) {
          mobileParcelCard.show(objectData);
        }
      } else {
        // Hide mobile card if it's visible
        if (mobileParcelCard && mobileParcelCard.isCardVisible()) {
          mobileParcelCard.hide();
        }
        // Show desktop sidebar
        showParcelSidebar(objectData);
      }
    };
  }

  return eventHandlers;
}

// Open/Closed Principle: Easily extendable layer categorization
function categorizeObjectToLayer(objectType, estado = '') {
  // For LOTE objects, use estado-based categorization
  if (objectType === OBJECT_TYPES.LOTE) {
    const key = (estado || '').toString().toLowerCase();
    if (key.includes('disponible')) {
      return 'disponibles';
    } else if (key.includes('reservado')) {
      return 'reservados';
    } else if (key.includes('no_disponible') || key.includes('vendido')) {
      return 'vendidos';
    } else {
      return 'disponibles'; // default for LOTE objects
    }
  }

  // For non-LOTE objects, use type-based categorization
  switch (objectType) {
    case OBJECT_TYPES.PLAZA:
      return 'plazas';
    case OBJECT_TYPES.CALLE_PROYECTADA:
      return 'callesProyectadas';
    default:
      return 'disponibles'; // fallback
  }
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
  parcelDescription = document.getElementById('parcelDescription');
  parcelLados = document.getElementById('parcelLados');
  parcelCoordinates = document.getElementById('parcelCoordinates');
  parcelArea = document.getElementById('parcelArea');
  parcelPrice = document.getElementById('parcelPrice');
  reserveBtn = document.getElementById('reserveBtn');

  // Initialize event handlers after elements are found
  initializeSidebarEventHandlers();
  initializeFilterEventHandlers();
  initializeZoomEventHandlers();

  // Initialize mobile components
  initializeMobileComponents();
}

// Initialize mobile components
function initializeMobileComponents() {
  // Initialize mobile responsive manager
  mobileResponsiveManager = new MobileResponsiveManager();

  // Initialize mobile components
  mobileParcelCard = new MobileParcelCard();
  mobileBottomSheets = new MobileBottomSheets();

  // Store in global scope for responsive manager access
  window.mobileParcelCard = mobileParcelCard;
  window.mobileBottomSheets = mobileBottomSheets;

  // Initialize mobile components - they will be shown/hidden via CSS media queries
  mobileParcelCard.init();
  mobileBottomSheets.init();
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

  // Hide tooltip when opening sidebar to prevent conflicts
  if (parcelTooltip.enabled) {
    parcelTooltip.hide();
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

  if (estado.includes('reservado')) {
    statusText = 'Reservado';
    statusClass = 'reservado';
  } else if (estado.includes('no_disponible') || estado.includes('vendido')) {
    statusText = 'No Disponible';
    statusClass = 'vendido';
  }

  if (parcelStatusBadge) {
    parcelStatusBadge.textContent = statusText;
    parcelStatusBadge.className = `status-badge ${statusClass}`;
  }

  // Set nombre
  if (parcelName) {
    parcelName.textContent = parcelData.nombre || parcelData.name || 'N/A';
  }

  // Set descripcion
  if (parcelDescription) {
    parcelDescription.textContent = parcelData.descripcion || parcelData.description || 'N/A';
  }

  // Set lados (dimensions)
  if (parcelLados) {
    const lados = parcelData.lados || parcelData.largoxancho || parcelData.LargoxAncho || parcelData.dimensions;
    if (lados && lados !== 'null' && lados !== '') {
      // Lados is already formatted from lote-service.js
      // Just display it directly
      parcelLados.textContent = lados;
    } else {
      const largo = parcelData.largo || parcelData.Largo;
      const ancho = parcelData.ancho || parcelData.Ancho;
      if (largo && ancho) {
        parcelLados.textContent = `${largo} × ${ancho} metros`;
      } else {
        parcelLados.textContent = 'N/A';
      }
    }
  }

  // Set coordinates from centroid data
  if (parcelCoordinates) {
    const lat = parcelData.centroide_lat || parcelData.centroid_lat;
    const lng = parcelData.centroide_lng || parcelData.centroid_lng;

    if (lat && lng) {
      // Format with 6 decimal places for precision
      const formattedLat = typeof lat === 'number' ? lat.toFixed(6) : parseFloat(lat).toFixed(6);
      const formattedLng = typeof lng === 'number' ? lng.toFixed(6) : parseFloat(lng).toFixed(6);
      parcelCoordinates.textContent = `${formattedLat}, ${formattedLng}`;
    } else {
      parcelCoordinates.textContent = 'N/A';
    }
  }

  // Set area_m2_rounded (integer only, no decimals)
  if (parcelArea) {
    const area = parcelData.area_m2_rounded || parcelData.area || parcelData.Area || parcelData.superficie || parcelData.Superficie;
    if (area && area !== 'null' && area !== '') {
      // Use only integer part, no decimals
      const integerArea = typeof area === 'number' ? Math.round(area) : Math.round(parseFloat(area));
      parcelArea.textContent = integerArea.toLocaleString();
    } else {
      parcelArea.textContent = 'N/A';
    }
  }

  // Set price with currency formatting
  const price = parcelData.precio || parcelData.price;
  if (parcelPrice) {
    if (price && price !== 'null' && price !== '' && price !== 0) {
      // Format price as USD currency
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(price);
      parcelPrice.textContent = formattedPrice;
    } else {
      parcelPrice.textContent = 'Consultar';
    }
  }

  // Configure reserve button based on availability
  if (reserveBtn) {
    if (estado.includes('disponible')) {
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
  console.log('DEBUG handleReservation - parcelData:', parcelData);

  // Get parcel coordinates from centroid data
  const lat = parcelData.centroide_lat || parcelData.centroid_lat;
  const lng = parcelData.centroide_lng || parcelData.centroid_lng;

  console.log('DEBUG handleReservation - lat:', lat, 'lng:', lng);

  // Store lote GeoJSON in sessionStorage for reservation form to render actual parcel
  const loteId = parcelData.nombre || parcelData.name || 'lote';
  if (parcelData.feature) {
    try {
      sessionStorage.setItem(
        `reservation_lote_geojson_${loteId}`,
        typeof parcelData.feature === 'string'
          ? parcelData.feature
          : JSON.stringify(parcelData.feature)
      );
      console.log('✓ Stored lote GeoJSON in sessionStorage for reservation form');
    } catch (e) {
      console.warn('Failed to store lote GeoJSON in sessionStorage:', e);
    }
  } else {
    console.warn('No GeoJSON feature available for lote:', loteId);
  }

  // Build URL parameters for the reservation form
  const params = new URLSearchParams({
    lotId: loteId,
    lotName: parcelData.nombre || parcelData.name || 'Lote sin nombre',
    location: 'Colonia Independencia',
    coordinates: `${lat}, ${lng}`,
    price: parcelData.precio || parcelData.price || 'Consultar',
    dimensions: getDimensionsString(parcelData),
    status: parcelData.estado || parcelData.status || 'disponible'
  });

  // Navigate to reservation form with parcel data
  const reservationUrl = `reservation-form.html?${params.toString()}`;
  console.log('DEBUG handleReservation - URL:', reservationUrl);
  window.location.href = reservationUrl;
}

// Helper function to format dimensions for URL parameter
function getDimensionsString(parcelData) {
  // Check for pre-formatted dimensions
  const preFormatted = parcelData.largoxancho || parcelData.LargoxAncho || parcelData.dimensions;
  if (preFormatted && preFormatted !== 'null' && preFormatted !== '') {
    return preFormatted;
  }

  // Try to construct from individual values
  const largo = parcelData.largo || parcelData.Largo || parcelData.length;
  const ancho = parcelData.ancho || parcelData.Ancho || parcelData.width;

  if (largo && ancho && largo !== 'null' && ancho !== 'null') {
    return `${largo} x ${ancho}`;
  }

  // Fallback to area if available
  const area = parcelData.area || parcelData.Area || parcelData.superficie || parcelData.Superficie;
  if (area && area !== 'null' && area !== '') {
    return `${area} m²`;
  }

  return 'Dimensiones no disponibles';
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

// Update mobile parcel counts
function updateMobileParcelCounts() {
  if (mobileBottomSheets) {
    const mobileCounts = {
      disponible: parcelCounts.disponibles,
      reservado: parcelCounts.reservados,
      vendido: parcelCounts.vendidos
    };
    mobileBottomSheets.updateMobileCounts(mobileCounts);
  }
}

/**
 * Load and render map data
 * Handles both URL parameter-based loading (from index page)
 * and fallback to KML file for backward compatibility
 */
async function loadMapData() {
  try {
    // Check if we have URL parameters for dynamic loading
    if (urlParams && urlParams.id) {
      console.log(`Loading loteamiento from Supabase: ${urlParams.id}`);
      await loadLoteamientoFromSupabase(urlParams);
      return;
    }

    // Fallback to KML file loading for backward compatibility
    console.log('No URL parameters found, loading default KML file');
    await loadKMLFile();

  } catch (error) {
    console.error('Error loading map data:', error);
    alert(`Error cargando datos del mapa: ${error.message}\n\nPor favor, recarga la página o contacta al administrador.`);
  }
}

/**
 * Load loteamiento and lotes from Supabase
 * @param {Object} params - URL parameters
 */
async function loadLoteamientoFromSupabase(params) {
  try {
    // Check if services are available
    if (!window.LoteamientoService || !window.LoteService) {
      throw new Error('Supabase services not initialized. Please check script loading order.');
    }

    // Update map header with loteamiento name
    const mapTitle = document.querySelector('.map-title');
    if (mapTitle) {
      mapTitle.textContent = `${params.name}`;
    }

    // Center map on loteamiento coordinates if available
    if (params.lat && params.lng) {
      map.setView([params.lat, params.lng], 16);
    }

    // Fetch loteamiento details to get boundary geojson
    const loteamiento = await window.LoteamientoService.fetchById(params.id);

    if (!loteamiento) {
      throw new Error(`Loteamiento ${params.id} not found`);
    }

    // Render loteamiento boundary if geojson available
    if (loteamiento.geojson) {
      renderLoteamientoBoundary(loteamiento.geojson);
    } else {
      // Try to get from sessionStorage
      const storedGeojson = sessionStorage.getItem(`loteamiento_geojson_${params.id}`);
      if (storedGeojson) {
        renderLoteamientoBoundary(storedGeojson);
      }
    }

    // Fetch and render lotes
    const lotes = await window.LoteService.fetchByLoteamiento(params.id);

    if (!lotes || lotes.length === 0) {
      console.warn('No lotes found for this loteamiento');
      alert('No se encontraron lotes para este loteamiento.');
      return;
    }

    // Process and render each lote
    lotes.forEach(lote => {
      renderLote(lote);
    });

    // Update parcel counts in legend and mobile
    updateParcelCounts();
    updateMobileParcelCounts();

    // Initialize with all layers visible
    capas.disponibles.addTo(map);
    capas.reservados.addTo(map);
    capas.vendidos.addTo(map);
    capas.plazas.addTo(map);
    capas.callesProyectadas.addTo(map);

    // Fit map to show all lotes
    fitMapToLotes();

    console.log(`✓ Loaded ${lotes.length} lotes from Supabase`);

  } catch (error) {
    console.error('Error loading from Supabase:', error);
    throw error;
  }
}

/**
 * Render loteamiento boundary polygon
 * @param {string|Object} geojsonData - GeoJSON data
 */
function renderLoteamientoBoundary(geojsonData) {
  try {
    // Parse if string
    const geojson = typeof geojsonData === 'string' ? JSON.parse(geojsonData) : geojsonData;

    // Create boundary layer with distinctive styling
    const boundaryStyle = {
      color: '#FF6B35',
      weight: 3,
      opacity: 0.8,
      fillColor: '#FF6B35',
      fillOpacity: 0.1,
      dashArray: '10, 5'
    };

    const boundaryLayer = L.geoJSON(geojson, {
      style: boundaryStyle
    });

    boundaryLayer.addTo(map);

    console.log('✓ Loteamiento boundary rendered');

  } catch (error) {
    console.error('Error rendering loteamiento boundary:', error);
  }
}

/**
 * Render individual lote on map
 * @param {Object} lote - Lote data
 */
function renderLote(lote) {
  if (!lote.feature) {
    console.warn(`Lote ${lote.name} has no geojson feature, skipping`);
    return;
  }

  const props = lote;
  const estado = lote.estado;

  // CRITICAL FIX: Detect actual object type from lote data
  const objectType = detectObjectType(lote);

  // Get appropriate styling based on object type
  const objectStyle = getObjectStyle(objectType, estado);

  // Create event handlers
  const eventHandlers = createObjectEventHandlers(objectType, lote, estado);

  // Create layer
  const layer = L.geoJSON(lote.feature, {
    style: objectStyle,
    onEachFeature: (feature, layer) => {
      // Apply event handlers dynamically
      Object.keys(eventHandlers).forEach(eventName => {
        layer.on(eventName, eventHandlers[eventName]);
      });
    }
  });

  // Categorize to appropriate layer
  const layerCategory = categorizeObjectToLayer(objectType, estado);
  capas[layerCategory].addLayer(layer);

  // Update parcel counts
  if (objectType === OBJECT_TYPES.LOTE) {
    switch (layerCategory) {
      case 'disponibles':
        parcelCounts.disponibles++;
        break;
      case 'reservados':
        parcelCounts.reservados++;
        break;
      case 'vendidos':
        parcelCounts.vendidos++;
        break;
    }
  }
}

/**
 * Fit map view to show all lotes
 */
function fitMapToLotes() {
  try {
    const all = L.featureGroup([
      capas.disponibles,
      capas.reservados,
      capas.vendidos,
      capas.plazas,
      capas.callesProyectadas
    ]);
    map.fitBounds(all.getBounds(), { padding: [40, 40] });
  } catch (e) {
    console.warn('No se pudo ajustar bounds:', e);
  }
}

/**
 * Load KML file (fallback/backward compatibility)
 */
async function loadKMLFile() {
  try {
    const response = await fetch('assets/loteo_barrio_cerrado_enrique.kml');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const kmlText = await response.text();
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

      // Detect object type first (Single Responsibility)
      const objectType = detectObjectType(props);

      // Normalizar estado: buscar en properties.estado o en cualquier propiedad que contenga "estado" o "status"
      let estado = props.estado || props.Estado || props.status || props.Status || '';
      // A veces en KML vienen como <name> para el objeto
      const nombre = props.name || f.properties.name || props.Name || 'Sin nombre';

      // Enhanced object data (renamed from loteData to reflect that it can be any object type)
      const objectData = {
        name: nombre,
        estado: estado,
        objectType: objectType, // Add object type to data
        area: props.area || props.Area || props.superficie || props.Superficie || null,
        precio: props.precio || props.Precio || props.price || props.Price || null,
        largo: props.largo || props.Largo || props.length || null,
        ancho: props.ancho || props.Ancho || props.width || null,
        largoxancho: props.largoxancho || props.LargoxAncho || props.dimensions || null,
        feature: f, // Include the feature for coordinate extraction
        ...props // Include all other properties
      };

      // Get appropriate styling based on object type (Single Responsibility)
      const objectStyle = getObjectStyle(objectType, estado);

      // Create event handlers based on object type (Dependency Inversion)
      const eventHandlers = createObjectEventHandlers(objectType, objectData, estado);

      // Create enhanced layer with type-appropriate styling and behavior
      const layer = L.geoJSON(f, {
        style: objectStyle,
        onEachFeature: (feature, layer) => {
          // Apply event handlers dynamically based on object type
          Object.keys(eventHandlers).forEach(eventName => {
            layer.on(eventName, eventHandlers[eventName]);
          });
        }
      });

      // Categorize object to appropriate layer (Open/Closed Principle)
      const layerCategory = categorizeObjectToLayer(objectType, estado);
      capas[layerCategory].addLayer(layer);

      // Update parcel counts only for LOTE objects
      if (objectType === OBJECT_TYPES.LOTE) {
        switch (layerCategory) {
          case 'disponibles':
            parcelCounts.disponibles++;
            break;
          case 'reservados':
            parcelCounts.reservados++;
            break;
          case 'vendidos':
            parcelCounts.vendidos++;
            break;
        }
      }
    });

    // Initialize with all layers visible
    capas.disponibles.addTo(map);
    capas.reservados.addTo(map);
    capas.vendidos.addTo(map);
    // Add non-LOTE object layers
    capas.plazas.addTo(map);
    capas.callesProyectadas.addTo(map);

    // Update parcel counts in the sidebar legend and mobile
    updateParcelCounts();
    updateMobileParcelCounts();

    // Ajustar vista a los bounds de todos los objetos
    const all = L.featureGroup([
      capas.disponibles,
      capas.reservados,
      capas.vendidos,
      capas.plazas,
      capas.callesProyectadas
    ]);
    try {
      map.fitBounds(all.getBounds(), { padding: [40, 40] });
    } catch (e) {
      console.warn('No se pudo ajustar bounds:', e);
    }

    console.log('✓ KML file loaded successfully');

  } catch (err) {
    console.error('Error leyendo KML:', err);
    alert('Error cargando KML. Revisa la consola.');
    throw err;
  }
}

// Initialize map data loading when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMapData);
} else {
  loadMapData();
}

// Hide sidebar/mobile card when clicking on map background
map.on('click', function (e) {
  if (mobileResponsiveManager && mobileResponsiveManager.isMobileDevice()) {
    // Hide mobile card if visible
    if (mobileParcelCard && mobileParcelCard.isCardVisible()) {
      mobileParcelCard.hide();
    }
    // Hide mobile bottom sheets if visible
    if (mobileBottomSheets) {
      mobileBottomSheets.hideAll();
    }
  } else {
    // Hide desktop sidebar if visible
    if (isSidebarVisible) {
      hideParcelSidebar();
    }
  }
});

// UI botones - removed back button as per requirements

// Enhanced Satélite toggle with checkbox functionality
let satLayer = null;
document.getElementById('satToggle')?.addEventListener('change', function () {
  if (!satLayer) {
    satLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 20,
      attribution: '© Google'
    });
  }
  if (this.checked) {
    satLayer.addTo(map);
  } else {
    map.removeLayer(satLayer);
  }
});

// Enhanced Gray toggle with checkbox functionality
let gray = false; // Start with normal colors
document.getElementById('grayToggle')?.addEventListener('change', function () {
  gray = this.checked;
  const tiles = document.querySelectorAll('.leaflet-tile');
  tiles.forEach(t => {
    t.style.filter = gray ? 'grayscale(100%) contrast(95%) brightness(92%)' : 'none';
  });

  // Apply filter to future tiles as well
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList.contains('leaflet-tile')) {
          node.style.filter = gray ? 'grayscale(100%) contrast(95%) brightness(92%)' : 'none';
        }
      });
    });
  });

  observer.observe(document.getElementById('map'), { childList: true, subtree: true });
});