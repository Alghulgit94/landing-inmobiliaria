/**
 * Index Page JavaScript - Inmobiliaria Mega Proyectos
 * Carousel functionality for the "Why Live Here" section
 */

(function () {
  'use strict';

  // Carousel configuration
  const CAROUSEL_CONFIG = {
    autoPlayInterval: 5000, // 5 seconds
    transitionDuration: 500, // 0.5 seconds
    swipeThreshold: 50, // pixels
  };

  // State management
  let currentSlide = 0;
  let totalSlides = 0;
  let autoPlayInterval = null;
  let isTransitioning = false;

  // DOM elements
  let track = null;
  let prevBtn = null;
  let nextBtn = null;
  let indicators = [];
  let reasonCards = [];

  /**
   * Initialize the carousel when the DOM is loaded
   */
  function initializeCarousel() {
    // Get DOM elements
    track = document.getElementById('reasonsTrack');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    indicators = document.querySelectorAll('.carousel-indicator');
    reasonCards = document.querySelectorAll('.reason-card');

    totalSlides = reasonCards.length;

    // Validate required elements exist
    if (!validateCarouselElements()) {
      console.error('Carousel: Required elements not found. Carousel will not function.');
      return;
    }

    // Initialize carousel state
    setupCarousel();

    // Bind event listeners
    bindEventListeners();

    // Start auto-play
    startAutoPlay();

    console.log(`Carousel initialized with ${totalSlides} slides`);
  }

  /**
   * Validate that all required DOM elements exist
   * @returns {boolean} True if all elements are found
   */
  function validateCarouselElements() {
    const requiredElements = {
      track: track,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      indicators: indicators.length > 0,
      reasonCards: reasonCards.length > 0
    };

    for (const [elementName, element] of Object.entries(requiredElements)) {
      if (!element) {
        console.error(`Carousel: Missing element - ${elementName}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Set up initial carousel state
   */
  function setupCarousel() {
    // Reset all states
    reasonCards.forEach(card => card.classList.remove('reason-card--active'));
    indicators.forEach(indicator => indicator.classList.remove('carousel-indicator--active'));

    // Set initial active states
    if (reasonCards[0]) {
      reasonCards[0].classList.add('reason-card--active');
    }
    if (indicators[0]) {
      indicators[0].classList.add('carousel-indicator--active');
    }

    // Set initial transform
    updateCarouselTransform();
  }

  /**
   * Bind all event listeners
   */
  function bindEventListeners() {
    // Navigation buttons
    prevBtn.addEventListener('click', handlePrevClick);
    nextBtn.addEventListener('click', handleNextClick);

    // Indicator clicks
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => handleIndicatorClick(index));
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Touch/swipe support
    bindTouchEvents();

    // Pause auto-play on hover/focus
    track.addEventListener('mouseenter', stopAutoPlay);
    track.addEventListener('mouseleave', startAutoPlay);
    track.addEventListener('focusin', stopAutoPlay);
    track.addEventListener('focusout', startAutoPlay);

    // Pause auto-play when page is not visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Handle previous button click
   */
  function handlePrevClick() {
    if (isTransitioning) return;
    previousSlide();
    resetAutoPlay();
  }

  /**
   * Handle next button click
   */
  function handleNextClick() {
    if (isTransitioning) return;
    nextSlide();
    resetAutoPlay();
  }

  /**
   * Handle indicator click
   * @param {number} index - Target slide index
   */
  function handleIndicatorClick(index) {
    if (isTransitioning || index === currentSlide) return;
    goToSlide(index);
    resetAutoPlay();
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeyDown(event) {
    if (isTransitioning) return;

    switch (event.key) {
      case 'ArrowLeft':
        previousSlide();
        resetAutoPlay();
        break;
      case 'ArrowRight':
        nextSlide();
        resetAutoPlay();
        break;
      case 'Home':
        goToSlide(0);
        resetAutoPlay();
        break;
      case 'End':
        goToSlide(totalSlides - 1);
        resetAutoPlay();
        break;
    }
  }

  /**
   * Bind touch/swipe events
   */
  function bindTouchEvents() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartTime = 0;

    track.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].screenX;
      touchStartTime = Date.now();
    }, { passive: true });

    track.addEventListener('touchend', (event) => {
      touchEndX = event.changedTouches[0].screenX;
      handleSwipeGesture(touchStartX, touchEndX, touchStartTime);
    }, { passive: true });
  }

  /**
   * Handle swipe gesture
   * @param {number} startX - Touch start X position
   * @param {number} endX - Touch end X position
   * @param {number} startTime - Touch start time
   */
  function handleSwipeGesture(startX, endX, startTime) {
    if (isTransitioning) return;

    const swipeDistance = endX - startX;
    const swipeTime = Date.now() - startTime;

    // Validate swipe (minimum distance and reasonable time)
    if (Math.abs(swipeDistance) < CAROUSEL_CONFIG.swipeThreshold || swipeTime > 1000) {
      return;
    }

    if (swipeDistance > 0) {
      // Swipe right - go to previous slide
      previousSlide();
    } else {
      // Swipe left - go to next slide  
      nextSlide();
    }

    resetAutoPlay();
  }

  /**
   * Handle page visibility change
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  }

  /**
   * Go to next slide
   */
  function nextSlide() {
    const nextIndex = (currentSlide + 1) % totalSlides;
    goToSlide(nextIndex);
  }

  /**
   * Go to previous slide
   */
  function previousSlide() {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    goToSlide(prevIndex);
  }

  /**
   * Go to specific slide
   * @param {number} slideIndex - Target slide index
   */
  function goToSlide(slideIndex) {
    if (isTransitioning || slideIndex === currentSlide || slideIndex < 0 || slideIndex >= totalSlides) {
      return;
    }

    const previousSlideIndex = currentSlide;
    isTransitioning = true;

    // Use GSAP animation if available, otherwise fallback to CSS
    if (typeof window.animateCarouselTransition === 'function') {
      const timeline = window.animateCarouselTransition(previousSlideIndex, slideIndex);

      if (timeline) {
        // Update current slide after GSAP animation
        currentSlide = slideIndex;

        // Reset transition flag when GSAP animation completes
        timeline.eventCallback("onComplete", () => {
          isTransitioning = false;
        });

        return;
      }
    }

    // Fallback to original CSS-based animation
    currentSlide = slideIndex;
    updateCarouselDisplay();
    updateCarouselTransform();

    // Reset transition flag after animation completes
    setTimeout(() => {
      isTransitioning = false;
    }, CAROUSEL_CONFIG.transitionDuration);
  }

  /**
   * Update carousel display (active states)
   */
  function updateCarouselDisplay() {
    // Remove all active classes
    reasonCards.forEach(card => card.classList.remove('reason-card--active'));
    indicators.forEach(indicator => indicator.classList.remove('carousel-indicator--active'));

    // Add active classes to current slide
    if (reasonCards[currentSlide]) {
      reasonCards[currentSlide].classList.add('reason-card--active');
    }
    if (indicators[currentSlide]) {
      indicators[currentSlide].classList.add('carousel-indicator--active');
    }
  }

  /**
   * Update carousel transform position
   */
  function updateCarouselTransform() {
    if (!track) return;

    const translateX = -currentSlide * 100;
    track.style.transform = `translateX(${translateX}%)`;
  }

  /**
   * Start auto-play functionality
   */
  function startAutoPlay() {
    stopAutoPlay(); // Clear any existing interval
    autoPlayInterval = setInterval(() => {
      if (!isTransitioning && !document.hidden) {
        nextSlide();
      }
    }, CAROUSEL_CONFIG.autoPlayInterval);
  }

  /**
   * Stop auto-play functionality
   */
  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }

  /**
   * Reset auto-play (stop and start)
   */
  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  /**
   * Get current slide information
   * @returns {Object} Current slide information
   */
  function getCurrentSlideInfo() {
    return {
      currentSlide,
      totalSlides,
      isTransitioning,
      autoPlayActive: autoPlayInterval !== null
    };
  }

  /**
   * Public API for external control (if needed)
   */
  window.CarouselAPI = {
    goToSlide,
    nextSlide,
    previousSlide,
    startAutoPlay,
    stopAutoPlay,
    getCurrentSlideInfo
  };

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCarousel);
  } else {
    // DOM is already loaded
    initializeCarousel();
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopAutoPlay();
  });

})();

/**
 * Map Navigation - Inmobiliaria Mega Proyectos
 * Handle navigation to mapa.html with default loteamiento
 */

(function () {
  'use strict';

  /**
   * Get default loteamiento map URL
   * Fetches first loteamiento from Supabase and constructs URL
   * @returns {Promise<string>} Map URL with loteamiento parameters
   */
  async function getDefaultLoteamientoURL() {
    try {
      if (!window.LoteamientoService) {
        console.warn('LoteamientoService not available, using fallback URL');
        return 'mapa.html';
      }

      // Fetch all loteamientos
      const loteamientos = await window.LoteamientoService.fetchAll();

      if (loteamientos && loteamientos.length > 0) {
        const firstLoteamiento = loteamientos[0];
        return `mapa.html?loteamiento=${encodeURIComponent(firstLoteamiento.id)}&name=${encodeURIComponent(firstLoteamiento.name)}&lat=${firstLoteamiento.centroid_lat || 0}&lng=${firstLoteamiento.centroid_long || 0}`;
      }

      // Fallback if no loteamientos
      return 'mapa.html';
    } catch (error) {
      console.error('Error fetching default loteamiento:', error);
      return 'mapa.html';
    }
  }

  /**
   * Initialize static map navigation links
   * Updates all static links to mapa.html with default loteamiento
   */
  async function initializeMapNavigation() {
    try {
      const defaultURL = await getDefaultLoteamientoURL();

      // Update all static map links
      const mapLinks = document.querySelectorAll('a[href="mapa.html"]');
      mapLinks.forEach(link => {
        // Skip product card buttons (they're handled dynamically)
        if (!link.classList.contains('product-card__btn')) {
          link.href = defaultURL;
        }
      });

      console.log(`Updated ${mapLinks.length} map navigation links with default loteamiento`);
    } catch (error) {
      console.error('Error initializing map navigation:', error);
    }
  }

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapNavigation);
  } else {
    initializeMapNavigation();
  }

})();

/**
 * Dynamic Products Rendering - Inmobiliaria Mega Proyectos
 * Render products dynamically from API data with filtering capabilities
 */

(function () {
  'use strict';

  // DOM elements
  let locationChips = [];
  let productsGrid = null;
  let productsLoading = null;
  let productsError = null;
  let retryButton = null;
  let productTemplate = null;

  // State
  let allProducts = [];
  let currentLocation = 'colonia-independencia';

  /**
   * Initialize the dynamic products system when the DOM is loaded
   */
  async function initializeDynamicProducts() {
    // Get DOM elements
    productsGrid = document.getElementById('productsGrid');
    productsLoading = document.getElementById('productsLoading');
    productsError = document.getElementById('productsError');
    retryButton = document.getElementById('retryButton');
    productTemplate = document.getElementById('productCardTemplate');
    locationChips = document.querySelectorAll('.location-chip');

    // Validate required elements exist
    if (!validateProductElements()) {
      console.error('Dynamic Products: Required elements not found. System will not function.');
      return;
    }

    // Bind event listeners
    bindProductEventListeners();

    // Listen for language change events
    document.addEventListener('languageChanged', handleLanguageChange);

    // Load and render products
    await loadProducts();

    console.log('Dynamic products system initialized successfully');
  }

  /**
   * Validate that all required DOM elements exist
   * @returns {boolean} True if all elements are found
   */
  function validateProductElements() {
    return productsGrid && productsLoading && productsError && retryButton &&
      productTemplate && locationChips.length > 0;
  }

  /**
   * Bind all event listeners
   */
  function bindProductEventListeners() {
    // Location filter chips
    locationChips.forEach(chip => {
      chip.addEventListener('click', handleChipClick);
      chip.addEventListener('keydown', handleChipKeydown);
    });

    // Retry button
    retryButton.addEventListener('click', handleRetryClick);
  }

  /**
   * Handle chip click event
   * @param {Event} event - Click event
   */
  function handleChipClick(event) {
    const chip = event.target;
    const location = chip.getAttribute('data-location');

    if (location && location !== currentLocation) {
      setActiveChip(chip);
      currentLocation = location;
      renderProductsByLocation(location);
    }
  }

  /**
   * Handle chip keydown event for accessibility
   * @param {KeyboardEvent} event - Keydown event
   */
  function handleChipKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleChipClick(event);
    }
  }

  /**
   * Handle retry button click
   */
  async function handleRetryClick() {
    await loadProducts();
  }

  /**
   * Handle language change event
   * Reload products with new language
   */
  async function handleLanguageChange(event) {
    console.log('Language changed to:', event.detail.language);

    // Clear the loteamiento service cache to force fresh fetch with new language
    if (window.LoteamientoService && typeof window.LoteamientoService.clearCache === 'function') {
      window.LoteamientoService.clearCache();
      console.log('Cleared loteamiento cache for language change');
    }

    // Reload products to apply new language
    await loadProducts();
  }

  /**
   * Set the active chip and remove active class from others
   * @param {HTMLElement} activeChip - The chip to set as active
   */
  function setActiveChip(activeChip) {
    // Remove active class from all chips
    locationChips.forEach(chip => {
      chip.classList.remove('location-chip--active');
      chip.setAttribute('aria-pressed', 'false');
    });

    // Add active class to clicked chip
    activeChip.classList.add('location-chip--active');
    activeChip.setAttribute('aria-pressed', 'true');
  }

  /**
   * Load products from the service
   */
  async function loadProducts() {
    try {
      showLoadingState();

      // Fetch products using the service
      allProducts = await window.ProductService.fetchProducts();

      // Render products for current location
      renderProductsByLocation(currentLocation);

      hideLoadingState();

    } catch (error) {
      console.error('Error loading products:', error);
      showErrorState();
    }
  }

  /**
   * Render products filtered by location
   * @param {string} location - Location to filter by
   */
  function renderProductsByLocation(location) {
    // Clear existing products (except template and loading/error states)
    clearProductsGrid();

    // Get filtered products
    const filteredProducts = window.ProductService.getProductsByLocation(location);

    if (filteredProducts.length === 0) {
      showEmptyState(location);
      return;
    }

    // Render each product
    filteredProducts.forEach((product, index) => {
      const productCard = createProductCard(product);
      productsGrid.appendChild(productCard);

      // Add staggered animation
      setTimeout(() => {
        productCard.style.opacity = '1';
        productCard.style.transform = 'translateY(0)';
      }, index * 100);
    });

    console.log(`Rendered ${filteredProducts.length} products for location: ${location}`);
  }

  /**
   * Create a product card from template
   * @param {Object} product - Product data
   * @returns {HTMLElement} Product card element
   */
  function createProductCard(product) {
    // Clone template
    const cardElement = productTemplate.content.cloneNode(true);
    const card = cardElement.querySelector('.product-card');

    // Set data attributes
    card.setAttribute('data-location', product.location);
    card.setAttribute('data-product-id', product.id);

    // Add loteamiento metadata for map navigation
    card.setAttribute('data-loteamiento-id', product.id);
    card.setAttribute('data-loteamiento-name', product.name);
    card.setAttribute('data-loteamiento-lat', product.lat || product.centroid_lat || 0);
    card.setAttribute('data-loteamiento-lng', product.long || product.centroid_long || 0);

    // Store geojson in sessionStorage if available (for map rendering)
    if (product.geojson) {
      try {
        sessionStorage.setItem(`loteamiento_geojson_${product.id}`,
          typeof product.geojson === 'string' ? product.geojson : JSON.stringify(product.geojson));
      } catch (e) {
        console.warn('Failed to store geojson in sessionStorage:', e);
      }
    }

    // Set image
    const img = card.querySelector('.product-card__image');
    img.src = product.photo;
    img.alt = product.description;

    // Set type badge
    const typeBadge = card.querySelector('.product-card__type-badge');
    typeBadge.textContent = formatProductType(product.type);
    typeBadge.className = `product-card__type-badge product-card__type-badge--${product.type.toLowerCase().replace(' ', '-')}`;

    // Set title (nombre_loteamiento from database)
    card.querySelector('.product-card__title').textContent = product.name || 'Loteamiento sin nombre';

    // Set parcel count with localization
    const parcelCount = card.querySelector('.product-card__parcel-count');
    if (product.parcel_quantity > 1) {
      const parcelsText = getLocalizedText('index.loteamientos.parcels_count', 'lotes');
      parcelCount.textContent = `${product.parcel_quantity} ${parcelsText}`;
      parcelCount.style.display = 'block';
    } else {
      parcelCount.style.display = 'none';
    }

    // Set description (from loteamientos table) with localized fallback
    const noDescriptionText = getLocalizedText('index.loteamientos.no_description', 'Sin descripción disponible');
    card.querySelector('.product-card__description').textContent = product.description || noDescriptionText;

    // Set location info with centroid coordinates
    const locationName = card.querySelector('.location-name');
    const locationCoordinates = card.querySelector('.location-coordinates');
    locationName.textContent = formatLocationName(product.location);
    // Use centroid_lat and centroid_long from loteamientos table
    const lat = product.centroid_lat || product.lat || 0;
    const lng = product.centroid_long || product.long || 0;
    locationCoordinates.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // Set size info - just show the area value
    const sizeArea = card.querySelector('.size-area');
    const sizeDimensions = card.querySelector('.size-dimensions');

    // Show the actual area in m² with proper locale formatting
    const areaM2 = product.total_dim_m2 || 0;
    const currentLang = window.I18n?.getCurrentLanguage() || 'es';
    const localeMap = { 'es': 'es-PY', 'en': 'en-US', 'de': 'de-DE' };
    const locale = localeMap[currentLang] || 'es-PY';
    const formattedArea = `${Math.round(areaM2).toLocaleString(locale)} m²`;

    // Show in size-area element
    sizeArea.textContent = formattedArea;
    sizeDimensions.textContent = '';  // Leave subtitle empty

    // Set cadastral account number
    const catastralContainer = card.querySelector('.product-card__catastral');
    const catastralLabel = card.querySelector('.catastral-label');
    const catastralValue = card.querySelector('.catastral-value');
    if (product.nro_cta_catastral && catastralContainer && catastralLabel && catastralValue) {
      catastralLabel.textContent = getLocalizedText('index.loteamientos.catastral_label', 'Cuenta Catastral');
      catastralValue.textContent = `Nº ${product.nro_cta_catastral}`;
      catastralContainer.style.display = 'flex';
    }

    // Update "Ver en Mapa" button to navigate with loteamiento data
    const viewMapButton = card.querySelector('.product-card__btn');
    if (viewMapButton) {
      viewMapButton.href = `mapa.html?loteamiento=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&lat=${product.lat || product.centroid_lat || 0}&lng=${product.long || product.centroid_long || 0}`;
      // Set localized button text
      viewMapButton.textContent = getLocalizedText('index.loteamientos.view_map_button', 'Ver Mapa');
    }

    // Update "Ver Galería" link to open gallery modal
    const galleryLink = card.querySelector('.product-card__gallery-link');
    if (galleryLink) {
      // Set localized button text
      galleryLink.textContent = getLocalizedText('index.loteamientos.view_gallery_button', 'Ver Galería');

      // Add click event to open gallery modal
      galleryLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.GalleryModal && typeof window.GalleryModal.open === 'function') {
          window.GalleryModal.open(0); // Open at first image
        } else {
          console.error('GalleryModal not available');
        }
      });
    }

    // Set initial animation state
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    return card;
  }

  /**
   * Format product type for display
   * @param {string} type - Product type
   * @returns {string} Formatted type
   */
  function formatProductType(type) {
    switch (type.toLowerCase()) {
      case 'lote':
        return 'Lote';
      case 'barrio cerrado':
        return 'Barrio Cerrado';
      case 'fraccion':
        return 'Fracción';
      default:
        return type;
    }
  }

  /**
   * Get localized text from i18n system
   * @param {string} key - Translation key
   * @param {string} fallback - Fallback text if translation not found
   * @returns {string} Localized text
   */
  function getLocalizedText(key, fallback) {
    try {
      // First, check if I18n is available
      if (!window.I18n || !window.I18n.getCurrentLanguage) {
        console.warn('I18n system not available, using fallback');
        return fallback;
      }

      const lang = window.I18n.getCurrentLanguage();
      const languageCache = window.I18n._languageCache;

      // Debug logging
      console.log(`[getLocalizedText] Getting "${key}" for language "${lang}"`);
      console.log('[getLocalizedText] Language cache:', languageCache);

      if (!languageCache || !languageCache[lang]) {
        console.warn(`No translations found for language: ${lang}`);
        return fallback;
      }

      const translations = languageCache[lang];

      // Navigate through the key path
      const keys = key.split('.');
      let value = translations;

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (value && value[k] !== undefined) {
          value = value[k];
        } else {
          console.warn(`Translation key not found: ${key} (failed at ${k})`);
          return fallback;
        }
      }

      console.log(`[getLocalizedText] Found translation: "${value}"`);
      return value;

    } catch (error) {
      console.error('Error in getLocalizedText:', error);
      return fallback;
    }
  }

  /**
   * Format location name for display
   * @param {string} location - Location key
   * @returns {string} Formatted location name
   */
  function formatLocationName(location) {
    switch (location) {
      case 'colonia-independencia':
        return 'Colonia Independencia';
      case 'other-options':
        return 'Otras Ubicaciones';
      default:
        return location.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  /**
   * Show loading state
   */
  function showLoadingState() {
    productsLoading.style.display = 'block';
    productsError.style.display = 'none';
    clearProductsGrid();
  }

  /**
   * Hide loading state
   */
  function hideLoadingState() {
    productsLoading.style.display = 'none';
  }

  /**
   * Show error state
   */
  function showErrorState() {
    productsLoading.style.display = 'none';
    productsError.style.display = 'block';
    clearProductsGrid();
  }

  /**
   * Show empty state
   * @param {string} location - Current location filter
   */
  function showEmptyState(location) {
    clearProductsGrid();

    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'products-empty';
    const emptyTitle = getLocalizedText('index.loteamientos.empty_state.title', 'No hay loteamientos disponibles');
    const emptyDescription = getLocalizedText('index.loteamientos.empty_state.description', 'No se encontraron loteamientos para la ubicación seleccionada.');
    emptyMessage.innerHTML = `
      <h4>${emptyTitle}</h4>
      <p>${emptyDescription}</p>
    `;

    productsGrid.appendChild(emptyMessage);
  }

  /**
   * Clear products grid (keep template and loading/error states)
   */
  function clearProductsGrid() {
    const productCards = productsGrid.querySelectorAll('.product-card:not(template .product-card)');
    const emptyMessages = productsGrid.querySelectorAll('.products-empty');

    productCards.forEach(card => card.remove());
    emptyMessages.forEach(message => message.remove());
  }

  /**
   * Public API for external control
   */
  window.DynamicProductsAPI = {
    renderProductsByLocation,
    loadProducts,
    setActiveLocation: (location) => {
      const chip = document.querySelector(`[data-location="${location}"]`);
      if (chip) {
        setActiveChip(chip);
        currentLocation = location;
        renderProductsByLocation(location);
      }
    },
    getCurrentLocation: () => currentLocation,
    getProducts: () => allProducts
  };

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDynamicProducts);
  } else {
    // DOM is already loaded
    initializeDynamicProducts();
  }

})();