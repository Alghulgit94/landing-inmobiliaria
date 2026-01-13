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
// PARCEL CAROUSEL UTILITIES - Image Randomization and Management
// ===========================

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array]; // Create a copy to avoid mutating original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get randomized parcel images array
 * @param {Object} parcelData - Parcel data object
 * @returns {Array} - Array of randomized image URLs
 */
function getRandomizedParcelImages(parcelData) {
  const baseImages = [
    'assets/img/Wiesental1.webp',
    'assets/img/Wiesental2.webp',
    'assets/img/Wiesental3.webp'
  ];

  // Add parcel-specific image if available
  const parcelImage = parcelData.photo || parcelData.imagen;
  if (parcelImage && parcelImage !== 'null' && parcelImage !== '') {
    baseImages.push(parcelImage);
  }

  // Shuffle and return
  return shuffleArray(baseImages);
}

// Parcel Carousel State
let parcelCarouselState = {
  currentIndex: 0,
  images: [],
  track: null,
  dotsContainer: null,
  prevBtn: null,
  nextBtn: null
};

/**
 * Initialize parcel carousel with images
 * @param {Array} images - Array of image URLs
 */
function initializeParcelCarousel(images) {
  parcelCarouselState.images = images;
  parcelCarouselState.currentIndex = 0;

  // Get DOM elements
  parcelCarouselState.track = document.getElementById('parcelCarouselTrack');
  parcelCarouselState.dotsContainer = document.getElementById('parcelCarouselDots');

  if (!parcelCarouselState.track || !parcelCarouselState.dotsContainer) {
    console.warn('Parcel carousel elements not found');
    return;
  }

  // Clear existing content
  parcelCarouselState.track.innerHTML = '';
  parcelCarouselState.dotsContainer.innerHTML = '';

  // Add images to track
  images.forEach((imgUrl, index) => {
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = `Imagen del lote ${index + 1}`;
    img.loading = index === 0 ? 'eager' : 'lazy';
    parcelCarouselState.track.appendChild(img);
  });

  // Add dot indicators
  images.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = `parcel-carousel__dot ${index === 0 ? 'parcel-carousel__dot--active' : ''}`;
    dot.addEventListener('click', () => goToParcelSlide(index));
    parcelCarouselState.dotsContainer.appendChild(dot);
  });

  // Reset position
  updateParcelCarouselPosition();
}

/**
 * Go to specific slide
 * @param {number} index - Slide index
 */
function goToParcelSlide(index) {
  if (!parcelCarouselState.images.length) return;

  parcelCarouselState.currentIndex = index;
  updateParcelCarouselPosition();
}

/**
 * Go to next slide
 */
function nextParcelSlide() {
  if (!parcelCarouselState.images.length) return;

  parcelCarouselState.currentIndex = (parcelCarouselState.currentIndex + 1) % parcelCarouselState.images.length;
  updateParcelCarouselPosition();
}

/**
 * Go to previous slide
 */
function prevParcelSlide() {
  if (!parcelCarouselState.images.length) return;

  parcelCarouselState.currentIndex =
    (parcelCarouselState.currentIndex - 1 + parcelCarouselState.images.length) % parcelCarouselState.images.length;
  updateParcelCarouselPosition();
}

/**
 * Update carousel position and active states
 */
function updateParcelCarouselPosition() {
  if (!parcelCarouselState.track) return;

  const translateX = -(parcelCarouselState.currentIndex * 100);
  parcelCarouselState.track.style.transform = `translateX(${translateX}%)`;

  // Update dot indicators
  if (parcelCarouselState.dotsContainer) {
    const dots = parcelCarouselState.dotsContainer.querySelectorAll('.parcel-carousel__dot');
    dots.forEach((dot, index) => {
      if (index === parcelCarouselState.currentIndex) {
        dot.classList.add('parcel-carousel__dot--active');
      } else {
        dot.classList.remove('parcel-carousel__dot--active');
      }
    });
  }
}

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

    // Note: Reserve button handler is set dynamically in updateCardContent()
    // based on the parcel estado (disponible, reservado, vendido)

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
    // Check if this is an interest point
    const isInterestPoint = parcelData.isInterestPoint || (parcelData.estado && parcelData.estado.toString().toLowerCase().includes('punto-interes'));

    // Get randomized images and use the first one for mobile card
    const randomizedImages = getRandomizedParcelImages(parcelData);
    const imageUrl = randomizedImages[0];

    if (this.elements.image) {
      this.elements.image.src = imageUrl;
      this.elements.image.alt = `Imagen de ${parcelData.name || 'la propiedad'}`;

      // Hide image container for interest points
      const imageContainer = this.elements.image.parentElement;
      if (imageContainer) {
        imageContainer.style.display = isInterestPoint ? 'none' : 'block';
      }
    }

    // Set title with translation support
    if (this.elements.title) {
      let nombre = parcelData.name || 'Lote N/A';

      // Use _raw data for translation if available
      if (parcelData._raw) {
        const currentLang = (window.I18n && window.I18n.getCurrentLanguage) ? window.I18n.getCurrentLanguage() : 'es';
        switch (currentLang) {
          case 'en':
            nombre = parcelData._raw.nombre_en || parcelData._raw.nombre || 'Lot N/A';
            break;
          case 'de':
            nombre = parcelData._raw.nombre_de || parcelData._raw.nombre || 'Grundstück N/V';
            break;
          default:
            nombre = parcelData._raw.nombre || 'Lote N/A';
        }
      }

      this.elements.title.textContent = nombre;
    }

    // Set status with i18n translation
    const estado = (parcelData.estado || 'disponible').toString().toLowerCase();
    let statusClass = 'disponible';

    if (estado.includes('punto-interes')) {
      statusClass = 'punto-interes';
    } else if (estado.includes('res')) {
      statusClass = 'reservado';
    } else if (estado.includes('ven')) {
      statusClass = 'vendido';
    }

    // Get translated status text from i18n
    let statusText = 'Disponible';
    if (window.i18n && window.i18n.t) {
      if (statusClass === 'punto-interes') {
        statusText = 'Punto de Interés'; // Keep hardcoded for interest points
      } else {
        statusText = window.i18n.t(`mapa.sidebar.status.${statusClass}`);
      }
    } else {
      // Fallback texts
      if (statusClass === 'punto-interes') statusText = 'Punto de Interés';
      else if (statusClass === 'reservado') statusText = 'Reservado';
      else if (statusClass === 'vendido') statusText = 'Vendido';
    }

    if (this.elements.status) {
      this.elements.status.textContent = statusText;
      this.elements.status.className = `mobile-card-status ${statusClass}`;

      // Hide status badge for interest points
      this.elements.status.style.display = isInterestPoint ? 'none' : 'inline-block';
    }

    // Set dimensions (largo x ancho - área) instead of coordinates for mobile
    if (this.elements.coordinates) {
      const lados = parcelData.lados || parcelData.largoxancho || parcelData.LargoxAncho;
      const area = parcelData.area_m2_rounded || parcelData.area || parcelData.Area || parcelData.superficie || parcelData.Superficie;

      if (lados && area) {
        // Parse lados to extract individual dimensions
        // lados format is typically "68.5 x 67.2 m"
        const ladosParsed = lados.replace(' m', '').trim();
        const dimensionsParts = ladosParsed.split('x').map(d => d.trim());

        if (dimensionsParts.length >= 2) {
          const largo = dimensionsParts[0];
          const ancho = dimensionsParts[1];

          // Format area with thousands separator
          const formattedArea = typeof area === 'number' ? area.toLocaleString() : parseInt(area).toLocaleString();

          this.elements.coordinates.textContent = `${largo} m x ${ancho} m - ${formattedArea} m²`;
        } else if (area) {
          // Fallback: just show area if can't parse dimensions
          const formattedArea = typeof area === 'number' ? area.toLocaleString() : parseInt(area).toLocaleString();
          this.elements.coordinates.textContent = `${formattedArea} m²`;
        } else {
          this.elements.coordinates.textContent = 'N/A';
        }
      } else if (area) {
        // If only area available, show just area
        const formattedArea = typeof area === 'number' ? area.toLocaleString() : parseInt(area).toLocaleString();
        this.elements.coordinates.textContent = `${formattedArea} m²`;
      } else {
        this.elements.coordinates.textContent = 'N/A';
      }
    }

    // Set price in European format (hide for interest points)
    const price = parcelData.precio || parcelData.price;
    if (this.elements.price) {
      if (isInterestPoint) {
        // Hide price element completely for interest points
        this.elements.price.style.display = 'none';
      } else {
        this.elements.price.style.display = 'block';
        if (price && price !== 'null' && price !== '' && price !== 0) {
          // Format price in European format (e.g., "160.705,65 €")
          const formattedPrice = formatEuroPrice(price);
          this.elements.price.textContent = formattedPrice;
        } else {
          this.elements.price.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.labels.consult') : 'Consultar';
        }
      }
    }

    // Configure action button (reserve for disponible, interest for reservado)
    if (this.elements.reserveBtn) {
      if (parcelData.isInterestPoint || estado.includes('punto-interes')) {
        this.elements.reserveBtn.style.display = 'none';
        this.elements.reserveBtn.onclick = null;
      } else if (estado.includes('disp')) {
        // Show as reserve button for disponible lots
        this.elements.reserveBtn.className = 'mobile-reserve-btn';
        this.elements.reserveBtn.style.display = 'block';
        this.elements.reserveBtn.setAttribute('data-i18n', 'mapa.mobile.reserve');
        this.elements.reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.mobile.reserve') : 'Reservar';
        this.elements.reserveBtn.disabled = false;
        this.elements.reserveBtn.onclick = () => handleReservation(parcelData);
      } else if (estado.includes('reservado')) {
        // Check if user has already registered interest
        const hasRegisteredInterest = window.InterestService && window.InterestService.hasRegisteredInterest(parcelData.id);

        // Show as interest button for reservado lots
        this.elements.reserveBtn.className = 'mobile-interest-btn';
        this.elements.reserveBtn.style.display = 'block';

        if (hasRegisteredInterest) {
          this.elements.reserveBtn.setAttribute('data-i18n', 'mapa.mobile.interest_registered');
          this.elements.reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.mobile.interest_registered') : 'Interés registrado';
          this.elements.reserveBtn.disabled = true;
          this.elements.reserveBtn.onclick = null;
        } else {
          this.elements.reserveBtn.setAttribute('data-i18n', 'mapa.mobile.interest');
          this.elements.reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.mobile.interest') : 'Estoy interesado';
          this.elements.reserveBtn.disabled = false;
          // Update the click handler to open interest modal for reservado lots
          this.elements.reserveBtn.onclick = () => openInterestModal(parcelData);
        }
      } else {
        // Hide for vendido or other estados
        this.elements.reserveBtn.style.display = 'none';
        this.elements.reserveBtn.onclick = null;
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
      legend: document.getElementById('legendBottomSheet'),
      interest: document.getElementById('interestBottomSheet')
    };

    this.backdrops = {
      map: document.getElementById('mapSheetBackdrop'),
      legend: document.getElementById('legendSheetBackdrop'),
      interest: document.getElementById('interestSheetBackdrop')
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
let parcelCoordinates, parcelArea, parcelPrice, reserveBtn, interestBtn;
let isSidebarVisible = false;
let currentSelectedParcel = null; // Store currently selected parcel for language switching

// Interest modal elements
let interestModal, interestModalBackdrop, interestForm, interestModalClose, interestCancelBtn;
let currentLotForInterest = null;

// Mobile components - Initialize global instances
let mobileResponsiveManager;
let mobileParcelCard;
let mobileBottomSheets;

// ===========================
// PRICE FORMATTING UTILITIES
// ===========================

/**
 * Format price in European format with euro symbol
 * @param {number} price - Price value
 * @returns {string} Formatted price (e.g., "160.705,65 €")
 */
function formatEuroPrice(price) {
  if (!price || price === 0) return window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.labels.consult') : 'Consultar';

  // Convert to number if string
  const numPrice = typeof price === 'number' ? price : parseFloat(price);

  // Format with 2 decimals
  const priceStr = numPrice.toFixed(2);

  // Split integer and decimal parts
  const [integerPart, decimalPart] = priceStr.split('.');

  // Add thousand separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Combine with comma as decimal separator and euro symbol
  return `${formattedInteger},${decimalPart} €`;
}

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

    // Apply hover styling only for clickable objects (LOTE)
    if (shouldObjectBeClickable(objectType)) {
      currentLayer.setStyle(hoverStyle);
    }

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

    // Reset layer styling only for clickable objects (LOTE)
    if (shouldObjectBeClickable(objectType)) {
      const originalStyle = getObjectStyle(objectType, estado);
      currentLayer.setStyle(originalStyle);
    }

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

  // Interest modal elements
  interestModal = document.getElementById('interestModal');
  interestModalBackdrop = document.getElementById('interestModalBackdrop');
  interestForm = document.getElementById('interestForm');
  interestModalClose = document.getElementById('interestModalClose');
  interestCancelBtn = document.getElementById('interestCancelBtn');

  // Initialize event handlers after elements are found
  initializeSidebarEventHandlers();
  initializeFilterEventHandlers();
  initializeZoomEventHandlers();
  initializeInterestModalHandlers();

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

  // Store currently selected parcel for language switching
  currentSelectedParcel = parcelData;

  // Initialize carousel with randomized images
  const carouselImages = getRandomizedParcelImages(parcelData);
  initializeParcelCarousel(carouselImages);

  // Set status with proper styling and i18n translation
  const estado = (parcelData.estado || 'disponible').toString().toLowerCase();
  let statusClass = 'disponible';

  if (estado.includes('reservado')) {
    statusClass = 'reservado';
  } else if (estado.includes('no_disponible') || estado.includes('vendido')) {
    statusClass = 'vendido';
  }

  // Get translated status text from i18n
  let statusText = 'Disponible';
  if (window.i18n && window.i18n.t) {
    statusText = window.i18n.t(`mapa.sidebar.status.${statusClass}`);
  }

  if (parcelStatusBadge) {
    parcelStatusBadge.textContent = statusText;
    parcelStatusBadge.className = `status-badge ${statusClass}`;
  }

  // Set nombre with translation support
  if (parcelName) {
    let nombre = parcelData.nombre || parcelData.name || 'N/A';

    // Use _raw data for translation if available
    if (parcelData._raw) {
      const currentLang = (window.I18n && window.I18n.getCurrentLanguage) ? window.I18n.getCurrentLanguage() : 'es';
      switch (currentLang) {
        case 'en':
          nombre = parcelData._raw.nombre_en || parcelData._raw.nombre || 'Unnamed lot';
          break;
        case 'de':
          nombre = parcelData._raw.nombre_de || parcelData._raw.nombre || 'Unbenanntes Grundstück';
          break;
        default:
          nombre = parcelData._raw.nombre || 'Lote sin nombre';
      }
    }

    parcelName.textContent = nombre;
  }

  // Set descripcion with translation support
  if (parcelDescription) {
    let descripcion = parcelData.descripcion || parcelData.description || 'N/A';

    // Use _raw data for translation if available
    if (parcelData._raw) {
      const currentLang = (window.I18n && window.I18n.getCurrentLanguage) ? window.I18n.getCurrentLanguage() : 'es';
      switch (currentLang) {
        case 'en':
          descripcion = parcelData._raw.descripcion_en || parcelData._raw.descripcion || '';
          break;
        case 'de':
          descripcion = parcelData._raw.descripcion_de || parcelData._raw.descripcion || '';
          break;
        default:
          descripcion = parcelData._raw.descripcion || '';
      }
    }

    parcelDescription.textContent = descripcion || 'N/A';
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

  // Set price with European currency formatting
  const price = parcelData.precio || parcelData.price;
  if (parcelPrice) {
    if (price && price !== 'null' && price !== '' && price !== 0) {
      // Format price in European format (e.g., "160.705,65 €")
      const formattedPrice = formatEuroPrice(price);
      parcelPrice.textContent = formattedPrice;
    } else {
      parcelPrice.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.labels.consult') : 'Consultar';
    }
  }

  // Configure action button based on availability (reserve for disponible, interest for reservado)
  if (reserveBtn) {
    if (estado.includes('disponible')) {
      // Show as reserve button for disponible lots
      reserveBtn.className = 'reserve-btn';
      reserveBtn.style.display = 'block';
      reserveBtn.setAttribute('data-i18n', 'mapa.sidebar.buttons.reserve');
      reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.buttons.reserve') : 'Reservar Lote';
      reserveBtn.onclick = () => handleReservation(parcelData);
      reserveBtn.disabled = false;
    } else if (estado.includes('reservado')) {
      // Check if user has already registered interest for this lot
      const hasRegisteredInterest = window.InterestService && window.InterestService.hasRegisteredInterest(parcelData.id);

      // Show as interest button for reservado lots
      reserveBtn.className = 'interest-action-btn';
      reserveBtn.style.display = 'block';

      if (hasRegisteredInterest) {
        reserveBtn.setAttribute('data-i18n', 'mapa.sidebar.buttons.interest_registered');
        reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.buttons.interest_registered') : 'Interés registrado';
        reserveBtn.disabled = true;
        reserveBtn.onclick = null;
      } else {
        reserveBtn.setAttribute('data-i18n', 'mapa.sidebar.buttons.interest');
        reserveBtn.textContent = window.i18n && window.i18n.t ? window.i18n.t('mapa.sidebar.buttons.interest') : 'Estoy interesado';
        reserveBtn.disabled = false;
        reserveBtn.onclick = () => openInterestModal(parcelData);
      }
    } else {
      // Hide for vendido or other estados
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

  // Clear currently selected parcel
  currentSelectedParcel = null;

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
  // Get lote ID and loteamiento ID from parcel data
  const loteId = parcelData.id;
  const loteamientoId = parcelData.loteamiento_id;

  if (!loteId || !loteamientoId) {
    console.error('Cannot navigate to reservation form: missing lote ID or loteamiento ID', parcelData);
    alert('Error: No se pudo procesar la reservación. Por favor intente nuevamente.');
    return;
  }

  // Navigate to reservation form with minimal URL parameters
  // The reservation form will fetch all data from Supabase using these IDs
  const reservationUrl = `reservation-form.html?lote_id=${loteId}&loteamiento_id=${loteamientoId}`;
  console.log(`✓ Navigating to reservation form for lote ${loteId}`);
  window.location.href = reservationUrl;
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

  // Carousel navigation buttons
  const prevBtn = document.getElementById('parcelPrevBtn');
  const nextBtn = document.getElementById('parcelNextBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prevParcelSlide();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nextParcelSlide();
    });
  }
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

    // Initialize interest points feature if available
    if (window.initializeInterestPoints) {
      window.initializeInterestPoints(loteamiento);
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
// Initialize satellite layer and add it to map by default
let satLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  maxZoom: 20,
  attribution: '© Google'
});

// Add satellite layer to map by default
satLayer.addTo(map);

// Setup toggle event listener
document.getElementById('satToggle')?.addEventListener('change', function () {
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

// ===========================
// INTERNATIONALIZATION SUPPORT
// ===========================

/**
 * Initialize language selector and event handlers
 */
function initializeLanguageSupport() {
  // Get desktop language selector
  const desktopSelector = document.getElementById('language-selector');

  // Get mobile language buttons
  const mobileLangButtons = document.querySelectorAll('.mobile-lang-btn');

  // Sync desktop selector with i18n.js language changes
  if (desktopSelector) {
    // Update desktop selector on language change
    document.addEventListener('languageChanged', (e) => {
      const newLang = e.detail.language;
      if (desktopSelector.value !== newLang) {
        desktopSelector.value = newLang;
      }

      // Update mobile button active states
      syncMobileLanguageButtons(newLang);

      // Retranslate dynamic content
      retranslateDynamicContent(newLang);
    });

    // Handle desktop selector changes
    desktopSelector.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      if (window.i18n && window.i18n.setLanguage) {
        window.i18n.setLanguage(selectedLang);
      }
    });
  }

  // Handle mobile language button clicks
  mobileLangButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      if (window.i18n && window.i18n.setLanguage) {
        window.i18n.setLanguage(selectedLang);
      }

      // Hide mobile map options sheet after selection
      if (mobileBottomSheets) {
        setTimeout(() => {
          mobileBottomSheets.hideSheet('map');
        }, 300);
      }
    });
  });
}

/**
 * Sync mobile language button active states
 * @param {string} lang - Current language code
 */
function syncMobileLanguageButtons(lang) {
  const mobileLangButtons = document.querySelectorAll('.mobile-lang-btn');
  mobileLangButtons.forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Retranslate dynamic content that may have been set by JavaScript
 * @param {string} lang - Current language code
 */
function retranslateDynamicContent(lang) {
  if (!window.i18n) return;

  // Retranslate parcel name and description if sidebar is open and parcel data is available
  if (isSidebarVisible && currentSelectedParcel && currentSelectedParcel._raw) {
    // Update name
    if (parcelName) {
      let translatedName = currentSelectedParcel._raw.nombre || 'Lote sin nombre';
      switch (lang) {
        case 'en':
          translatedName = currentSelectedParcel._raw.nombre_en || currentSelectedParcel._raw.nombre || 'Unnamed lot';
          break;
        case 'de':
          translatedName = currentSelectedParcel._raw.nombre_de || currentSelectedParcel._raw.nombre || 'Unbenanntes Grundstück';
          break;
      }
      parcelName.textContent = translatedName;
    }

    // Update description
    if (parcelDescription) {
      let translatedDescription = currentSelectedParcel._raw.descripcion || '';
      switch (lang) {
        case 'en':
          translatedDescription = currentSelectedParcel._raw.descripcion_en || currentSelectedParcel._raw.descripcion || '';
          break;
        case 'de':
          translatedDescription = currentSelectedParcel._raw.descripcion_de || currentSelectedParcel._raw.descripcion || '';
          break;
      }
      parcelDescription.textContent = translatedDescription || 'N/A';
    }
  }

  // Retranslate status badges if sidebar is open
  if (isSidebarVisible && parcelStatusBadge) {
    const statusClass = parcelStatusBadge.className.replace('status-badge ', '');
    const statusKey = `mapa.sidebar.status.${statusClass}`;
    const translatedStatus = window.i18n.t(statusKey);
    if (translatedStatus !== statusKey) {
      parcelStatusBadge.textContent = translatedStatus;
    }
  }

  // Retranslate mobile card if visible
  if (mobileParcelCard && mobileParcelCard.isCardVisible() && mobileParcelCard.currentParcelData) {
    const currentData = mobileParcelCard.currentParcelData;

    // Update mobile card name if _raw data is available
    if (currentData._raw) {
      const mobileTitle = document.getElementById('mobileCardTitle');
      if (mobileTitle) {
        let translatedName = currentData._raw.nombre || 'Lote N/A';
        switch (lang) {
          case 'en':
            translatedName = currentData._raw.nombre_en || currentData._raw.nombre || 'Lot N/A';
            break;
          case 'de':
            translatedName = currentData._raw.nombre_de || currentData._raw.nombre || 'Grundstück N/V';
            break;
        }
        mobileTitle.textContent = translatedName;
      }
    }

    // Update mobile card status
    const mobileStatus = document.getElementById('mobileCardStatus');
    if (mobileStatus) {
      const statusClass = mobileStatus.className.replace('mobile-card-status ', '');
      if (statusClass !== 'punto-interes') {
        const statusKey = `mapa.sidebar.status.${statusClass}`;
        const translatedStatus = window.i18n.t(statusKey);
        if (translatedStatus !== statusKey) {
          mobileStatus.textContent = translatedStatus;
        }
      }
    }
  }

  // Update "Consultar" price text if needed
  if (parcelPrice && parcelPrice.textContent === 'Consultar') {
    parcelPrice.textContent = window.i18n.t('mapa.sidebar.labels.consult');
  }

  const mobilePrice = document.getElementById('mobileCardPrice');
  if (mobilePrice && mobilePrice.textContent === 'Consultar') {
    mobilePrice.textContent = window.i18n.t('mapa.sidebar.labels.consult');
  }
}

// Initialize language support when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLanguageSupport);
} else {
  initializeLanguageSupport();
}

// ===========================
// INTEREST MODAL HANDLERS
// ===========================

/**
 * Initialize interest modal event handlers
 */
function initializeInterestModalHandlers() {
  if (!interestModal || !interestModalBackdrop || !interestForm) {
    console.warn('Interest modal elements not found');
    return;
  }

  // Close button handler
  if (interestModalClose) {
    interestModalClose.addEventListener('click', closeInterestModal);
  }

  // Cancel button handler
  if (interestCancelBtn) {
    interestCancelBtn.addEventListener('click', closeInterestModal);
  }

  // Backdrop click handler
  if (interestModalBackdrop) {
    interestModalBackdrop.addEventListener('click', closeInterestModal);
  }

  // Form submit handler
  if (interestForm) {
    interestForm.addEventListener('submit', handleInterestSubmit);
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && interestModal.classList.contains('visible')) {
      closeInterestModal();
    }
  });
}

/**
 * Open interest modal and populate with lot data
 * @param {Object} parcelData - Lot data
 */
function openInterestModal(parcelData) {
  if (!interestModal || !interestModalBackdrop) {
    console.error('Interest modal elements not found');
    return;
  }

  // Store current lot for submission
  currentLotForInterest = parcelData;

  // Clear any previous form data and errors
  if (interestForm) {
    interestForm.reset();
    const errorElements = interestForm.querySelectorAll('.interest-form-error');
    errorElements.forEach(el => el.textContent = '');
  }

  // Show backdrop
  interestModalBackdrop.classList.add('visible');

  // Show modal with slight delay for smooth animation
  setTimeout(() => {
    interestModal.classList.add('visible');
  }, 50);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Focus on first input field
  const contactNameInput = document.getElementById('contactName');
  if (contactNameInput) {
    setTimeout(() => {
      contactNameInput.focus();
    }, 300);
  }
}

/**
 * Close interest modal and reset form
 */
function closeInterestModal() {
  if (!interestModal || !interestModalBackdrop) {
    return;
  }

  // Hide modal
  interestModal.classList.remove('visible');

  // Hide backdrop with delay
  setTimeout(() => {
    interestModalBackdrop.classList.remove('visible');
  }, 300);

  // Clear form and errors
  if (interestForm) {
    interestForm.reset();
    const errorElements = interestForm.querySelectorAll('.interest-form-error');
    errorElements.forEach(el => el.textContent = '');
  }

  // Restore body scroll
  document.body.style.overflow = '';

  // Clear current lot reference
  currentLotForInterest = null;
}

/**
 * Handle interest form submission
 * @param {Event} e - Submit event
 */
async function handleInterestSubmit(e) {
  e.preventDefault();

  if (!currentLotForInterest || !window.InterestService) {
    console.error('Cannot submit interest: missing lot data or InterestService');
    return;
  }

  // Get form values
  const contactNameInput = document.getElementById('contactName');
  const contactPhoneInput = document.getElementById('contactPhone');
  const contactNameError = document.getElementById('contactNameError');
  const contactPhoneError = document.getElementById('contactPhoneError');
  const submitBtn = document.getElementById('interestSubmitBtn');

  if (!contactNameInput || !contactPhoneInput) {
    console.error('Form input elements not found');
    return;
  }

  const contactName = contactNameInput.value.trim();
  const contactPhone = contactPhoneInput.value.trim();

  // Clear previous errors
  if (contactNameError) contactNameError.textContent = '';
  if (contactPhoneError) contactPhoneError.textContent = '';

  // Validate inputs
  let hasError = false;

  if (contactName.length < 2) {
    if (contactNameError) {
      contactNameError.textContent = window.i18n && window.i18n.t
        ? window.i18n.t('mapa.interest_modal.validation.name_min_length')
        : 'El nombre debe tener al menos 2 caracteres';
    }
    hasError = true;
  }

  if (contactPhone.length < 6) {
    if (contactPhoneError) {
      contactPhoneError.textContent = window.i18n && window.i18n.t
        ? window.i18n.t('mapa.interest_modal.validation.phone_min_length')
        : 'El teléfono debe tener al menos 6 caracteres';
    }
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // Disable submit button and show loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = window.i18n && window.i18n.t
      ? window.i18n.t('mapa.interest_modal.submitting')
      : 'Enviando...';
  }

  try {
    // Submit interest via InterestService
    const result = await window.InterestService.submitInterest({
      lotId: currentLotForInterest.id,
      contactName: contactName,
      contactPhone: contactPhone
    });

    if (result.success) {
      // Close modal
      closeInterestModal();

      // Show success message
      const successMessage = window.i18n && window.i18n.t
        ? window.i18n.t('mapa.interest_modal.success_description')
        : 'Gracias por tu interés. Te contactaremos pronto.';

      showSuccess(successMessage);

      // Update button state to show "Interés registrado" and disable it
      // For desktop sidebar
      if (reserveBtn && isSidebarVisible) {
        reserveBtn.setAttribute('data-i18n', 'mapa.sidebar.buttons.interest_registered');
        reserveBtn.textContent = window.i18n && window.i18n.t
          ? window.i18n.t('mapa.sidebar.buttons.interest_registered')
          : 'Interés registrado';
        reserveBtn.disabled = true;
        reserveBtn.onclick = null;
      }

      // For mobile card
      if (mobileParcelCard && mobileParcelCard.isCardVisible() && mobileParcelCard.elements.reserveBtn) {
        const mobileBtn = mobileParcelCard.elements.reserveBtn;
        mobileBtn.setAttribute('data-i18n', 'mapa.mobile.interest_registered');
        mobileBtn.textContent = window.i18n && window.i18n.t
          ? window.i18n.t('mapa.mobile.interest_registered')
          : 'Interés registrado';
        mobileBtn.disabled = true;
        mobileBtn.onclick = null;
      }

    } else {
      // Show error message
      const errorMessage = window.i18n && window.i18n.t
        ? window.i18n.t('mapa.interest_modal.error_message')
        : 'No se pudo registrar tu interés. Intentá de nuevo.';

      showError(errorMessage);
    }

  } catch (error) {
    console.error('Error submitting interest:', error);

    // Show user-friendly error message
    const errorMessage = window.i18n && window.i18n.t
      ? window.i18n.t('mapa.interest_modal.error_message')
      : 'No se pudo registrar tu interés. Intentá de nuevo.';

    showError(errorMessage);

  } finally {
    // Re-enable submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = window.i18n && window.i18n.t
        ? window.i18n.t('mapa.interest_modal.submit_button')
        : 'Enviar';
    }
  }
}

// ===========================
// TOAST NOTIFICATION SYSTEM
// ===========================

/**
 * Create and show a toast notification
 * @param {string} type - Toast type ('success' or 'error')
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {number} duration - Auto-hide duration in ms (0 = manual close only)
 * @returns {string} Toast ID
 */
function createToast(type, title, message, duration = 5000) {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    console.warn('Toast container not found');
    return null;
  }

  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  const closeLabel = (window.i18n && window.i18n.t)
    ? window.i18n.t('reservation.toast.close')
    : 'Cerrar';

  toast.innerHTML = `
    <div class="toast-header">
      <strong class="toast-title">${title}</strong>
      <button type="button" class="toast-close" aria-label="${closeLabel}">×</button>
    </div>
    <div class="toast-body">${message}</div>
  `;

  // Add close functionality
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    hideToast(toastId);
  });

  // Add to container
  toastContainer.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      hideToast(toastId);
    }, duration);
  }

  return toastId;
}

/**
 * Hide a toast notification
 * @param {string} toastId - Toast ID to hide
 */
function hideToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const title = (window.i18n && window.i18n.t)
    ? window.i18n.t('mapa.interest_modal.success_message')
    : 'Interés registrado';
  createToast('success', title, message, 5000);
}

/**
 * Show error toast
 * @param {string} message - Error message
 */
function showError(message) {
  const title = (window.i18n && window.i18n.t)
    ? window.i18n.t('mapa.interest_modal.error_message')
    : 'Error';
  createToast('error', title, message, 7000);
}