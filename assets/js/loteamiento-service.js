/**
 * Loteamiento Service - Inmobiliaria Mega Proyectos
 * Service layer for managing loteamiento (subdivision) data from Supabase
 *
 * Responsibilities:
 * - Fetch loteamientos from Supabase
 * - Transform data to match existing DTO structure
 * - Map owner field to location categories
 * - Provide filtering and search capabilities
 *
 * @requires supabase-client.js
 */

class LoteamientoService {
  constructor() {
    this.loteamientos = [];
    this.isLoading = false;
    this.error = null;
    this.cache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000 // 5 minutes cache
    };
  }

  /**
   * Fetch all loteamientos from Supabase
   * @param {boolean} forceRefresh - Force refresh bypassing cache
   * @returns {Promise<Array>} Array of loteamientos
   */
  async fetchAll(forceRefresh = false) {
    try {
      // Check cache first
      if (!forceRefresh && this.isCacheValid()) {
        console.log('Using cached loteamiento data');
        return this.cache.data;
      }

      this.isLoading = true;
      this.error = null;

      // Get Supabase client
      const supabase = window.SupabaseClient;

      if (!supabase || !supabase.isReady()) {
        throw new Error('Supabase client not initialized. Please check your configuration.');
      }

      // Fetch loteamientos from database
      const { data, error } = await supabase.getClient()
        .from('loteamientos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('No loteamientos found in database');
        this.loteamientos = [];
        this.updateCache([]);
        this.isLoading = false;
        return [];
      }

      // Transform to DTO format
      const transformedData = data.map(loteamiento => this.transformToDTO(loteamiento));

      this.loteamientos = transformedData;
      this.updateCache(transformedData);
      this.isLoading = false;

      console.log(`✓ Loaded ${transformedData.length} loteamientos from Supabase`);

      return transformedData;

    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      console.error('Error fetching loteamientos:', error);
      throw error;
    }
  }

  /**
   * Fetch single loteamiento by ID
   * @param {string} id - Loteamiento ID
   * @returns {Promise<Object|null>} Loteamiento object or null
   */
  async fetchById(id) {
    try {
      const supabase = window.SupabaseClient;

      if (!supabase || !supabase.isReady()) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.getClient()
        .from('loteamientos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return this.transformToDTO(data);

    } catch (error) {
      console.error(`Error fetching loteamiento ${id}:`, error);
      throw error;
    }
  }

  /**
   * Transform Supabase data to DTO format
   * Maps database fields to frontend structure
   *
   * @param {Object} dbLoteamiento - Raw database object
   * @returns {Object} Transformed DTO object
   */
  transformToDTO(dbLoteamiento) {
    // Determine location based on owner field
    const location = this.mapOwnerToLocation(dbLoteamiento.owner);

    // Get current language for localized content
    const currentLang = this.getCurrentLanguage();

    return {
      id: dbLoteamiento.id,
      name: dbLoteamiento.nombre_loteamiento || dbLoteamiento.nombre || 'Loteamiento sin nombre',
      description: this.getLocalizedDescription(dbLoteamiento, currentLang),
      photo: dbLoteamiento.photo || this.getDefaultPhoto(location),
      location: location,
      lat: dbLoteamiento.centroide_lat || 0,
      long: dbLoteamiento.centroide_lng || 0,
      type: this.getLocalizedType(dbLoteamiento, currentLang),
      parcel_quantity: dbLoteamiento.parcel_quantity || 0,
      total_dim_m2: dbLoteamiento.area_m2_rounded || dbLoteamiento.area_m2 || 0,
      features: this.extractFeatures(dbLoteamiento),
      dimensions: this.formatDimensions(dbLoteamiento),
      // Additional fields for map functionality
      geojson: dbLoteamiento.geojson || null,
      centroid_lat: dbLoteamiento.centroide_lat || 0,
      centroid_long: dbLoteamiento.centroide_lng || 0,
      // Metadata
      owner: dbLoteamiento.owner || null,
      precio_total_usd: dbLoteamiento.precio_total_usd || 0,
      external_id: dbLoteamiento.external_id || null,
      created_at: dbLoteamiento.created_at,
      updated_at: dbLoteamiento.updated_at,
      // Interest points for map feature
      interest_points: dbLoteamiento.interest_points || null,
      // Store raw data for dynamic language switching
      _raw: {
        descripcion: dbLoteamiento.descripcion,
        descripcion_en: dbLoteamiento.descripcion_en,
        descripcion_de: dbLoteamiento.descripcion_de,
        loteamiento_type: dbLoteamiento.loteamiento_type,
        loteamiento_type_en: dbLoteamiento.loteamiento_type_en,
        loteamiento_type_de: dbLoteamiento.loteamiento_type_de
      }
    };
  }

  /**
   * Get current language from i18n system
   * @returns {string} Current language code (es, en, de)
   */
  getCurrentLanguage() {
    if (window.I18n && typeof window.I18n.getCurrentLanguage === 'function') {
      return window.I18n.getCurrentLanguage();
    }
    return 'es'; // Default fallback
  }

  /**
   * Get localized description based on current language
   * @param {Object} loteamiento - Database loteamiento object
   * @param {string} lang - Language code (es, en, de)
   * @returns {string} Localized description
   */
  getLocalizedDescription(loteamiento, lang) {
    switch (lang) {
      case 'en':
        return loteamiento.descripcion_en || loteamiento.descripcion || '';
      case 'de':
        return loteamiento.descripcion_de || loteamiento.descripcion || '';
      case 'es':
      default:
        return loteamiento.descripcion || '';
    }
  }

  /**
   * Get localized type based on current language
   * @param {Object} loteamiento - Database loteamiento object
   * @param {string} lang - Language code (es, en, de)
   * @returns {string} Localized type
   */
  getLocalizedType(loteamiento, lang) {
    // First, try to get localized type from database
    let type = '';
    switch (lang) {
      case 'en':
        type = loteamiento.loteamiento_type_en || loteamiento.loteamiento_type;
        break;
      case 'de':
        type = loteamiento.loteamiento_type_de || loteamiento.loteamiento_type;
        break;
      case 'es':
      default:
        type = loteamiento.loteamiento_type;
        break;
    }

    // If type is found, return it; otherwise, determine from data
    if (type) {
      return type;
    }

    // Fallback: determine type from parcel quantity
    return this.determineLoteamientoType(loteamiento);
  }

  /**
   * Map owner field to location category
   * @param {string} owner - Owner value from database
   * @returns {string} Location category
   */
  mapOwnerToLocation(owner) {
    const normalizedOwner = (owner || '').toString().toUpperCase().trim();

    if (normalizedOwner === 'MEGA' || normalizedOwner === 'MEGA PROYECTOS') {
      return 'colonia-independencia';
    }

    return 'other-options';
  }

  /**
   * Determine loteamiento type based on data
   * @param {Object} loteamiento - Database loteamiento
   * @returns {string} Type classification
   */
  determineLoteamientoType(loteamiento) {
    // Check if there's a type field in the database
    if (loteamiento.type) {
      return loteamiento.type;
    }

    // Infer type based on parcel quantity or area
    const parcelQty = loteamiento.parcel_quantity || 0;

    if (parcelQty === 1) {
      return 'lote';
    } else if (parcelQty > 10) {
      return 'Barrio cerrado';
    } else if (parcelQty > 1) {
      return 'Fraccion';
    }

    return 'lote';
  }

  /**
   * Extract features from loteamiento data
   * @param {Object} loteamiento - Database loteamiento
   * @returns {Array<string>} Array of feature strings
   */
  extractFeatures(loteamiento) {
    const features = [];

    // Check for common amenities/features fields
    if (loteamiento.has_water) features.push('Agua corriente');
    if (loteamiento.has_electricity) features.push('Electricidad');
    if (loteamiento.has_sewage) features.push('Alcantarillado');
    if (loteamiento.has_internet) features.push('Internet');
    if (loteamiento.paved_streets) features.push('Calles pavimentadas');
    if (loteamiento.green_areas) features.push('Áreas verdes');

    // Parse features JSON if exists
    if (loteamiento.features && typeof loteamiento.features === 'string') {
      try {
        const parsedFeatures = JSON.parse(loteamiento.features);
        if (Array.isArray(parsedFeatures)) {
          features.push(...parsedFeatures);
        }
      } catch (e) {
        console.warn('Could not parse features JSON:', e);
      }
    } else if (Array.isArray(loteamiento.features)) {
      features.push(...loteamiento.features);
    }

    return features;
  }

  /**
   * Format dimensions string with localization support
   * @param {Object} loteamiento - Database loteamiento
   * @returns {string} Formatted dimensions
   */
  formatDimensions(loteamiento) {
    if (loteamiento.dimensions) {
      return loteamiento.dimensions;
    }

    const currentLang = this.getCurrentLanguage();
    const area = loteamiento.total_dim_m2 || loteamiento.area_m2_rounded || loteamiento.area_m2;

    if (area) {
      // Format number according to locale
      const localeMap = {
        'es': 'es-PY',
        'en': 'en-US',
        'de': 'de-DE'
      };
      const locale = localeMap[currentLang] || 'es-PY';
      return `${area.toLocaleString(locale)} m²`;
    }

    // Return localized "Dimensions available" text
    return this.getLocalizedDimensionsText(currentLang);
  }

  /**
   * Get localized "dimensions available" text
   * @param {string} lang - Language code
   * @returns {string} Localized text
   */
  getLocalizedDimensionsText(lang) {
    const texts = {
      'es': 'Dimensiones disponibles',
      'en': 'Dimensions available',
      'de': 'Abmessungen verfügbar'
    };
    return texts[lang] || texts['es'];
  }

  /**
   * Get default photo based on location
   * @param {string} location - Location category
   * @returns {string} Photo URL
   */
  getDefaultPhoto(location) {
    // Map of default images per location (flexible for future expansion)
    const defaultImages = {
      'colonia-independencia': 'assets/img/wiesental.webp',
      'other-options': 'assets/img/wiesental.webp'
    };
    return defaultImages[location] || 'assets/img/wiesental.webp';
  }

  /**
   * Get loteamientos filtered by location
   * @param {string} location - Location to filter by
   * @returns {Array} Filtered loteamientos
   */
  getByLocation(location) {
    return this.loteamientos.filter(loteamiento => loteamiento.location === location);
  }

  /**
   * Get loteamiento by ID from cache
   * @param {string} id - Loteamiento ID
   * @returns {Object|null} Loteamiento or null
   */
  getById(id) {
    return this.loteamientos.find(loteamiento => loteamiento.id === id) || null;
  }

  /**
   * Search loteamientos by query
   * @param {string} query - Search query
   * @returns {Array} Matching loteamientos
   */
  search(query) {
    const searchTerm = query.toLowerCase();
    return this.loteamientos.filter(loteamiento =>
      loteamiento.name.toLowerCase().includes(searchTerm) ||
      loteamiento.description.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get unique locations
   * @returns {Array<string>} Unique locations
   */
  getUniqueLocations() {
    const locations = this.loteamientos.map(l => l.location);
    return [...new Set(locations)];
  }

  /**
   * Check if cache is valid
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    if (!this.cache.data || !this.cache.timestamp) {
      return false;
    }

    const age = Date.now() - this.cache.timestamp;
    return age < this.cache.ttl;
  }

  /**
   * Update cache
   * @param {Array} data - Data to cache
   */
  updateCache(data) {
    this.cache.data = data;
    this.cache.timestamp = Date.now();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;
  }

  /**
   * Get loading state
   * @returns {boolean} Loading state
   */
  getLoadingState() {
    return this.isLoading;
  }

  /**
   * Get error state
   * @returns {string|null} Error message or null
   */
  getError() {
    return this.error;
  }

  /**
   * Clear error state
   */
  clearError() {
    this.error = null;
  }
}

// Create singleton instance
const loteamientoService = new LoteamientoService();

// Export for use in other modules
window.LoteamientoService = loteamientoService;

console.log('LoteamientoService initialized');
