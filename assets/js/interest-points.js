/**
 * Interest Points Feature - Inmobiliaria Mega Proyectos
 *
 * This module handles the display and interaction of interest points on the map.
 * It follows SOLID principles with separate concerns for route drawing and point management.
 *
 * Features:
 * - Display interest points as map markers
 * - Show list of points in sidebar (desktop) and bottom sheet (mobile)
 * - Draw routes from loteamiento to selected interest point
 * - Toggle visibility of points
 *
 * @requires Leaflet
 * @requires mapa.js (map instance)
 */

// ===========================
// ROUTE DRAWER CLASS
// Single Responsibility: Handle route/polyline drawing only
// ===========================

/**
 * RouteDrawer Class
 * Manages drawing and clearing of routes between points on the map
 */
class RouteDrawer {
  constructor(map) {
    this.map = map;
    this.currentRoute = null;

    // Route styling configuration
    // Dotted line with accent color for elegant route visualization
    this.routeStyle = {
      color: '#2c88f0ff',     // Red accent color from project palette
      weight: 4,            // Slightly thicker for better visibility
      opacity: 0.9,         // High opacity for prominence
      dashArray: '1, 10',   // Dotted line pattern (1px dot, 10px gap)
      lineJoin: 'round',
      lineCap: 'round'
    };

    // Bind methods
    this.drawRoute = this.drawRoute.bind(this);
    this.clearRoute = this.clearRoute.bind(this);
  }

  /**
   * Draw a route from origin to destination using intermediate route points
   * Only draws if route points are available (no fallback to straight line)
   * @param {Object} origin - Origin coordinates {lat, lng}
   * @param {Object} destination - Destination coordinates {lat, lng}
   * @param {Array} routePoints - Array of intermediate route points (required)
   */
  drawRoute(origin, destination, routePoints = []) {
    // Clear any existing route first
    this.clearRoute();

    // Validate coordinates
    if (!this.validateCoordinates(origin) || !this.validateCoordinates(destination)) {
      console.error('Invalid coordinates provided for route drawing');
      return;
    }

    // Check if route points are available
    if (!routePoints || !Array.isArray(routePoints) || routePoints.length === 0) {
      console.log('ℹ No route points available, skipping route drawing');
      return; // Don't draw anything without route points
    }

    // Build polyline coordinates array starting with origin
    const latlngs = [[origin.lat, origin.lng]];

    // Sort route points by order field to ensure correct sequence
    const sortedPoints = [...routePoints].sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      return orderA - orderB;
    });

    // Add each route point to the polyline
    sortedPoints.forEach(point => {
      if (this.validateCoordinates(point)) {
        latlngs.push([point.latitude, point.longitude]);
      } else {
        console.warn('Invalid route point found:', point);
      }
    });

    // Add destination as final point
    latlngs.push([destination.lat, destination.lng]);

    // Create and add polyline to map
    this.currentRoute = L.polyline(latlngs, this.routeStyle).addTo(this.map);

    // Fit map bounds to show entire route with padding
    try {
      this.map.fitBounds(this.currentRoute.getBounds(), {
        padding: [80, 80],
        maxZoom: 16
      });
    } catch (error) {
      console.warn('Could not fit map to route bounds:', error);
    }

    console.log(`✓ Route drawn with ${sortedPoints.length} intermediate points (${latlngs.length} total points)`);
  }

  /**
   * Clear the current route from the map
   */
  clearRoute() {
    if (this.currentRoute) {
      this.map.removeLayer(this.currentRoute);
      this.currentRoute = null;
    }
  }

  /**
   * Check if there's an active route displayed
   * @returns {boolean} True if route exists
   */
  hasActiveRoute() {
    return this.currentRoute !== null;
  }

  /**
   * Validate coordinate object
   * Supports both {lat, lng} and {latitude, longitude} formats
   * @param {Object} coords - Coordinates to validate
   * @returns {boolean} True if valid
   */
  validateCoordinates(coords) {
    if (!coords) return false;

    // Check for lat/lng format (used by origin/destination)
    const hasLatLng = typeof coords.lat === 'number' &&
      typeof coords.lng === 'number' &&
      !isNaN(coords.lat) &&
      !isNaN(coords.lng);

    // Check for latitude/longitude format (used by route_points)
    const hasLatitudeLongitude = typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number' &&
      !isNaN(coords.latitude) &&
      !isNaN(coords.longitude);

    return hasLatLng || hasLatitudeLongitude;
  }

  /**
   * Get current route object
   * @returns {L.Polyline|null} Current route or null
   */
  getCurrentRoute() {
    return this.currentRoute;
  }
}

// ===========================
// INTEREST POINTS MANAGER CLASS
// Single Responsibility: Manage interest points display and interactions
// ===========================

/**
 * InterestPointsManager Class
 * Manages the complete lifecycle of interest points on the map
 */
class InterestPointsManager {
  constructor(map, loteamientoData) {
    this.map = map;
    this.loteamientoData = loteamientoData;
    this.interestPoints = [];
    this.markers = L.layerGroup();
    this.routeDrawer = new RouteDrawer(map);
    this.isVisible = true;
    this.selectedPointId = null;
    this.initialized = false;

    // DOM elements cache
    this.elements = {};

    // Bind methods to preserve context
    this.init = this.init.bind(this);
    this.loadInterestPoints = this.loadInterestPoints.bind(this);
    this.createMarker = this.createMarker.bind(this);
    this.createMarkers = this.createMarkers.bind(this);
    this.handlePointClick = this.handlePointClick.bind(this);
    this.toggle = this.toggle.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  /**
   * Initialize the interest points manager
   */
  init() {
    if (this.initialized) {
      console.warn('InterestPointsManager already initialized');
      return;
    }

    // Cache DOM elements
    this.cacheElements();

    // Load and display interest points
    this.loadInterestPoints();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize visibility (checked by default)
    if (this.elements.toggle) {
      this.elements.toggle.checked = true;
      this.show();
    }

    this.initialized = true;
    console.log('✓ InterestPointsManager initialized');
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    this.elements = {
      // Desktop elements
      toggle: document.getElementById('interestPointsToggle'),

      // Mobile elements
      mobileToggle: document.getElementById('mobileInterestPointsToggle')
    };

    // Validate critical elements
    if (!this.elements.toggle) {
      console.warn('Interest points toggle checkbox not found');
    }

    if (!this.elements.mobileToggle) {
      console.warn('Mobile interest points toggle button not found');
    }
  }

  /**
   * Load interest points from loteamiento data
   */
  loadInterestPoints() {
    // Check if data exists
    if (!this.loteamientoData) {
      console.warn('No loteamiento data provided for interest points');
      this.interestPoints = [];
      this.renderEmptyState();
      return;
    }

    // Extract interest_points from loteamiento data
    let pointsData = this.loteamientoData.interest_points;

    // Handle various data formats
    if (!pointsData) {
      console.warn('No interest_points field in loteamiento data');
      this.interestPoints = [];
      this.renderEmptyState();
      return;
    }

    // Parse if string (JSON)
    if (typeof pointsData === 'string') {
      try {
        pointsData = JSON.parse(pointsData);
      } catch (error) {
        console.error('Failed to parse interest_points JSON:', error);
        this.interestPoints = [];
        this.renderEmptyState();
        return;
      }
    }

    // FIXED: Handle nested structure where interest_points contains another interest_points array
    // Check if pointsData has a nested interest_points property
    if (pointsData && typeof pointsData === 'object' && !Array.isArray(pointsData)) {
      if (pointsData.interest_points && Array.isArray(pointsData.interest_points)) {
        console.log('✓ Detected nested interest_points structure, extracting inner array');
        pointsData = pointsData.interest_points;
      }
    }

    // Ensure array
    if (!Array.isArray(pointsData)) {
      console.error('interest_points is not an array after processing', pointsData);
      this.interestPoints = [];
      this.renderEmptyState();
      return;
    }

    // Store interest points with validation and normalization
    this.interestPoints = pointsData.filter(point => {
      // Validate each point has required fields
      const isValid = point &&
        point.id &&
        point.name &&
        typeof point.latitude === 'number' &&
        typeof point.longitude === 'number';

      // Validate and normalize route_points if present
      if (isValid && point.route_points !== undefined) {
        if (!Array.isArray(point.route_points)) {
          console.warn(`Interest point "${point.name}" has invalid route_points (not an array), fixing to empty array`);
          point.route_points = [];
        }
      } else if (isValid) {
        // Ensure route_points exists even if not in database
        point.route_points = [];
      }

      if (!isValid) {
        console.warn('Invalid interest point found:', point);
      }

      return isValid;
    });

    if (this.interestPoints.length === 0) {
      console.warn('No valid interest points found in data');
      this.renderEmptyState();
      return;
    }

    // Create markers
    this.createMarkers();

    console.log(`✓ Loaded ${this.interestPoints.length} interest points`);
  }

  /**
   * Create all markers and add to layer group
   */
  createMarkers() {
    // Clear existing markers
    this.markers.clearLayers();

    // Create marker for each interest point
    this.interestPoints.forEach(point => {
      try {
        const marker = this.createMarker(point);
        this.markers.addLayer(marker);
      } catch (error) {
        console.error(`Error creating marker for ${point.name}:`, error);
      }
    });

    // Add layer group to map
    this.markers.addTo(this.map);
  }

  /**
   * Detect if current device is mobile
   * @returns {boolean} True if mobile device
   */
  isMobileDevice() {
    return window.innerWidth <= 767;
  }

  /**
   * Create a single marker with custom styling
   * @param {Object} point - Interest point data
   * @returns {L.Marker} Leaflet marker
   */
  createMarker(point) {
    // Use SVG image icon for reliable rendering across all devices
    const customIcon = L.icon({
      iconUrl: 'assets/img/map-marker-svgrepo-com.svg',
      iconSize: [32, 32], // Size of the icon
      iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
      popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
      className: 'interest-marker-img' // Custom class for styling
    });

    // Create marker at point coordinates
    // On mobile, don't add title to prevent tooltip from showing
    const markerOptions = {
      icon: customIcon
    };

    // Only add title on desktop
    if (!this.isMobileDevice()) {
      markerOptions.title = point.name;
    }

    const marker = L.marker(
      [point.latitude, point.longitude],
      markerOptions
    );

    // Only bind popup on desktop (not on mobile for cleaner UX)
    if (!this.isMobileDevice()) {
      const popupContent = `
        <div class="interest-popup">
          <strong>${this.escapeHtml(point.name)}</strong>
          <small>${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}</small>
        </div>
      `;
      marker.bindPopup(popupContent);
    }

    // Add click handler with visual feedback
    marker.on('click', (e) => {
      this.handlePointClick(point, e);
    });

    // Store point reference in marker
    marker._interestPoint = point;

    return marker;
  }

  /**
   * Add visual click feedback to marker
   * @param {L.DomEvent} event - Leaflet event object
   */
  addMarkerClickAnimation(event) {
    const markerElement = event.target.getElement();
    if (markerElement) {
      // Add clicked class for animation
      markerElement.classList.add('clicked');

      // Remove class after animation completes
      setTimeout(() => {
        markerElement.classList.remove('clicked');
      }, 600);
    }
  }

  /**
   * Handle interest point selection (from marker click)
   * @param {Object} point - Selected interest point
   * @param {L.DomEvent} event - Leaflet event object
   */
  handlePointClick(point, event) {
    // Add visual feedback animation
    if (event) {
      this.addMarkerClickAnimation(event);
    }

    // Update selected state
    this.selectedPointId = point.id;

    // Get loteamiento origin coordinates
    const origin = this.getLoteamientoOrigin();

    if (!origin) {
      console.error('Could not determine loteamiento origin coordinates');
      return;
    }

    const destination = {
      lat: point.latitude,
      lng: point.longitude
    };

    // Extract route points from the interest point
    const routePoints = point.route_points || [];

    // Draw route from loteamiento to selected point using intermediate route points
    this.routeDrawer.drawRoute(origin, destination, routePoints);

    // Show mobile card on mobile devices
    if (this.isMobileDevice() && window.mobileParcelCard) {
      this.showMobileInterestCard(point);
    }

    // Hide mobile bottom sheet if visible
    if (window.mobileBottomSheets && window.mobileBottomSheets.currentSheet === 'interest') {
      window.mobileBottomSheets.hideSheet('interest');
    }

    console.log(`✓ Selected interest point: ${point.name} (${routePoints.length} route points)`);
  }

  /**
   * Show mobile card with interest point data
   * @param {Object} point - Interest point data
   */
  showMobileInterestCard(point) {
    // Transform interest point data to match parcel card format
    const cardData = {
      name: point.name,
      photo: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23EB664E"/%3E%3Ctext x="40" y="45" font-family="Arial" font-size="12" fill="white" text-anchor="middle"%3EPunto de%3C/text%3E%3Ctext x="40" y="60" font-family="Arial" font-size="12" fill="white" text-anchor="middle"%3EInter%C3%A9s%3C/text%3E%3C/svg%3E',
      estado: 'punto-interes', // Special status
      location: point.name,
      latitude: point.latitude,
      longitude: point.longitude,
      price: '', // No price for interest points
      isInterestPoint: true // Flag to identify interest points
    };

    // Show the mobile card
    window.mobileParcelCard.show(cardData);
  }

  /**
   * Get loteamiento origin coordinates
   * @returns {Object|null} Origin coordinates {lat, lng} or null
   */
  getLoteamientoOrigin() {
    if (!this.loteamientoData) {
      return null;
    }

    // Try multiple field names for compatibility
    const lat = this.loteamientoData.centroid_lat ||
      this.loteamientoData.centroide_lat ||
      this.loteamientoData.lat;

    const lng = this.loteamientoData.centroid_long ||
      this.loteamientoData.centroide_lng ||
      this.loteamientoData.long ||
      this.loteamientoData.lng;

    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }

    return null;
  }

  /**
   * Setup event listeners for controls
   */
  setupEventListeners() {
    // Desktop toggle checkbox
    if (this.elements.toggle) {
      this.elements.toggle.addEventListener('change', () => {
        this.toggle();
        this.syncMobileToggleState();
      });
    }

    // Mobile toggle FAB button
    if (this.elements.mobileToggle) {
      this.elements.mobileToggle.addEventListener('click', () => {
        // Hide bottom card if it's visible
        if (window.mobileParcelCard && window.mobileParcelCard.isVisible) {
          window.mobileParcelCard.hide();
        }

        this.toggle();
        this.syncDesktopToggleState();
        this.updateMobileToggleVisualState();
      });
    }
  }

  /**
   * Sync mobile toggle visual state with visibility
   */
  updateMobileToggleVisualState() {
    if (!this.elements.mobileToggle) return;

    if (this.isVisible) {
      this.elements.mobileToggle.classList.add('active');
      this.elements.mobileToggle.classList.remove('inactive');
    } else {
      this.elements.mobileToggle.classList.remove('active');
      this.elements.mobileToggle.classList.add('inactive');
    }
  }

  /**
   * Sync mobile toggle state with desktop toggle
   */
  syncMobileToggleState() {
    this.updateMobileToggleVisualState();
  }

  /**
   * Sync desktop toggle state with mobile toggle
   */
  syncDesktopToggleState() {
    if (this.elements.toggle) {
      this.elements.toggle.checked = this.isVisible;
    }
  }

  /**
   * Toggle interest points visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show interest points (markers only)
   */
  show() {
    // Show markers on map
    if (!this.map.hasLayer(this.markers)) {
      this.markers.addTo(this.map);
    }

    this.isVisible = true;
    this.updateMobileToggleVisualState();
    console.log('✓ Interest points shown');
  }

  /**
   * Hide interest points (markers and route)
   */
  hide() {
    // Remove markers from map
    if (this.map.hasLayer(this.markers)) {
      this.map.removeLayer(this.markers);
    }

    // Clear any active route
    this.routeDrawer.clearRoute();

    // Clear selection
    this.clearSelection();

    this.isVisible = false;
    this.updateMobileToggleVisualState();
    console.log('✓ Interest points hidden');
  }

  /**
   * Clear the current selection
   */
  clearSelection() {
    this.selectedPointId = null;
    this.routeDrawer.clearRoute();
  }

  /**
   * Check if interest points are currently visible
   * @returns {boolean} True if visible
   */
  isInterestPointsVisible() {
    return this.isVisible;
  }

  /**
   * Get currently selected point
   * @returns {Object|null} Selected point or null
   */
  getSelectedPoint() {
    if (!this.selectedPointId) {
      return null;
    }
    return this.interestPoints.find(p => p.id === this.selectedPointId) || null;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the interest points manager (cleanup)
   */
  destroy() {
    // Remove markers
    this.map.removeLayer(this.markers);
    this.markers.clearLayers();

    // Clear route
    this.routeDrawer.clearRoute();

    // Clear selection
    this.clearSelection();

    // Reset state
    this.interestPoints = [];
    this.initialized = false;

    console.log('✓ InterestPointsManager destroyed');
  }
}

// ===========================
// INITIALIZATION
// ===========================

/**
 * Global instance of interest points manager
 */
let interestPointsManager = null;

/**
 * Initialize interest points feature
 * Should be called after loteamiento data is loaded
 *
 * @param {Object} loteamientoData - Loteamiento data containing interest_points
 */
function initializeInterestPoints(loteamientoData) {
  // Validate prerequisites
  if (typeof map === 'undefined') {
    console.error('Map instance not available. Cannot initialize interest points.');
    return;
  }

  if (!loteamientoData) {
    console.warn('No loteamiento data provided for interest points initialization');
    return;
  }

  // Destroy existing instance if any
  if (interestPointsManager) {
    interestPointsManager.destroy();
  }

  // Create new instance
  interestPointsManager = new InterestPointsManager(map, loteamientoData);

  // Initialize
  interestPointsManager.init();

  // Store globally for access from other modules
  window.interestPointsManager = interestPointsManager;

  console.log('✓ Interest points feature initialized');
}

// Export initialization function
window.initializeInterestPoints = initializeInterestPoints;

// Export classes for potential extension
window.InterestPointsManager = InterestPointsManager;
window.RouteDrawer = RouteDrawer;

console.log('interest-points.js loaded');
