/**
 * Lote Service - Inmobiliaria Mega Proyectos
 * Service layer for managing individual lote (parcel) data from Supabase
 *
 * Responsibilities:
 * - Fetch lotes by loteamiento ID
 * - Transform data to match map rendering structure
 * - Filter by estado (disponible/reservado/vendido)
 * - Provide GeoJSON-compatible output
 *
 * @requires supabase-client.js
 */

class LoteService {
  constructor() {
    this.lotes = [];
    this.currentLoteamientoId = null;
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Fetch all lotes for a specific loteamiento
   * @param {string} loteamientoId - Loteamiento ID
   * @param {boolean} forceRefresh - Force refresh bypassing cache
   * @returns {Promise<Array>} Array of lotes
   */
  async fetchByLoteamiento(loteamientoId, forceRefresh = false) {
    try {
      // Use cache if same loteamiento and not forcing refresh
      if (!forceRefresh && this.currentLoteamientoId === loteamientoId && this.lotes.length > 0) {
        console.log(`Using cached lote data for loteamiento ${loteamientoId}`);
        return this.lotes;
      }

      this.isLoading = true;
      this.error = null;

      // Get Supabase client
      const supabase = window.SupabaseClient;

      if (!supabase || !supabase.isReady()) {
        throw new Error('Supabase client not initialized. Please check your configuration.');
      }

      // Fetch lotes from database
      const { data, error } = await supabase.getClient()
        .from('lotes')
        .select('*')
        .eq('loteamiento_id', loteamientoId)
        .order('nombre', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn(`No lotes found for loteamiento ${loteamientoId}`);
        this.lotes = [];
        this.currentLoteamientoId = loteamientoId;
        this.isLoading = false;
        return [];
      }

      // Transform to map-compatible format
      const transformedData = data.map(lote => this.transformToMapFormat(lote));

      this.lotes = transformedData;
      this.currentLoteamientoId = loteamientoId;
      this.isLoading = false;

      console.log(`✓ Loaded ${transformedData.length} lotes for loteamiento ${loteamientoId}`);

      return transformedData;

    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      console.error('Error fetching lotes:', error);
      throw error;
    }
  }

  /**
   * Fetch single lote by ID
   * @param {string} id - Lote ID
   * @returns {Promise<Object|null>} Lote object or null
   */
  async fetchById(id) {
    try {
      const supabase = window.SupabaseClient;

      if (!supabase || !supabase.isReady()) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.getClient()
        .from('lote')
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

      return this.transformToMapFormat(data);

    } catch (error) {
      console.error(`Error fetching lote ${id}:`, error);
      throw error;
    }
  }

  /**
   * Transform database lote to map-compatible format
   * Creates a GeoJSON feature structure compatible with mapa.js
   *
   * @param {Object} dbLote - Raw database object
   * @returns {Object} Transformed map-compatible object
   */
  transformToMapFormat(dbLote) {
    // Parse geojson if it's a string
    let geojsonFeature = null;
    if (dbLote.geojson) {
      if (typeof dbLote.geojson === 'string') {
        try {
          geojsonFeature = JSON.parse(dbLote.geojson);
        } catch (e) {
          console.error('Failed to parse lote geojson:', e);
        }
      } else {
        geojsonFeature = dbLote.geojson;
      }
    }

    // Normalize estado field
    const estado = this.normalizeEstado(dbLote.estado);

    // Get nombre_obj from database (CRITICAL for PLAZA/CALLE detection)
    const nombreObj = dbLote.nombre_obj || 'LOTE';

    // Parse lados JSON if it's a string or object
    let ladosFormatted = null;
    if (dbLote.lados) {
      if (typeof dbLote.lados === 'string') {
        try {
          const ladosData = JSON.parse(dbLote.lados);
          // lados is an object like {lado1: value, lado2: value, ...}
          const ladosValues = Object.values(ladosData).filter(v => v !== null && v !== '');

          // Get unique values to avoid repetition (68.5 × 67.2 × 68.5 × 67.2 → 68.5 × 67.2)
          const uniqueLados = [...new Set(ladosValues)];

          // Format as simple "68.5 x 67.2 m" instead of "× metros"
          ladosFormatted = uniqueLados.join(' x ') + ' m';
        } catch (e) {
          ladosFormatted = dbLote.lados;
        }
      } else if (typeof dbLote.lados === 'object') {
        const ladosValues = Object.values(dbLote.lados).filter(v => v !== null && v !== '');

        // Get unique values to avoid repetition
        const uniqueLados = [...new Set(ladosValues)];

        // Format as simple "68.5 x 67.2 m" instead of "× metros"
        ladosFormatted = uniqueLados.join(' x ') + ' m';
      }
    }

    // Fallback to sup_legal if lados not available
    if (!ladosFormatted && dbLote.sup_legal) {
      ladosFormatted = dbLote.sup_legal + ' m²';
    }

    // Create map-compatible object structure
    // This matches the structure expected by mapa.js KML parser
    return {
      // Core identification
      id: dbLote.id,
      name: dbLote.nombre || 'Lote sin nombre',
      nombre: dbLote.nombre || 'Lote sin nombre',

      // Estado (status) - critical for map categorization
      estado: estado,
      Estado: estado, // Capitalized version for compatibility

      // Description
      descripcion: dbLote.descripcion || dbLote.matricula || '',
      description: dbLote.descripcion || dbLote.matricula || '',

      // Dimensions - lados (sides) - parsed from JSON
      lados: ladosFormatted || this.formatDimensions(dbLote),

      // Area - use area_m2_rounded from database
      area_m2_rounded: dbLote.area_m2_rounded || dbLote.area_m2 || null,
      area: dbLote.area_m2_rounded || dbLote.area_m2 || null,
      Area: dbLote.area_m2_rounded || dbLote.area_m2 || null,
      superficie: dbLote.area_m2_rounded || dbLote.area_m2 || null,
      Superficie: dbLote.area_m2_rounded || dbLote.area_m2 || null,

      largo: null, // Not in database schema
      Largo: null,

      ancho: null, // Not in database schema
      Ancho: null,

      largoxancho: ladosFormatted || this.formatDimensions(dbLote),
      LargoxAncho: ladosFormatted || this.formatDimensions(dbLote),
      dimensions: ladosFormatted || this.formatDimensions(dbLote),

      // Pricing - use precio_usd from database
      precio: dbLote.precio_usd || null,
      Precio: dbLote.precio_usd || null,
      price: dbLote.precio_usd || null,
      Price: dbLote.precio_usd || null,

      // Visual
      photo: dbLote.photo || this.getDefaultPhoto(estado),
      imagen: dbLote.photo || this.getDefaultPhoto(estado),

      // GeoJSON feature (critical for map rendering)
      feature: geojsonFeature || this.createFallbackFeature(dbLote),

      // Object type classification (for mapa.js SOLID implementation)
      // USE DATABASE VALUE - this is critical!
      NOMBRE_OBJ: nombreObj,
      nombre_obj: nombreObj,

      // Metadata
      loteamiento_id: dbLote.loteamiento_id,
      created_at: dbLote.created_at,
      updated_at: dbLote.updated_at,

      // Additional database fields
      external_id: dbLote.external_id,
      fid: dbLote.fid,
      matricula: dbLote.matricula,
      colonia: dbLote.colonia,

      // Centroid coordinates (for sidebar display)
      centroide_lat: dbLote.centroide_lat,
      centroide_lng: dbLote.centroide_lng,
      centroid_lat: dbLote.centroide_lat, // Compatibility
      centroid_lng: dbLote.centroide_lng  // Compatibility
    };
  }

  /**
   * Normalize estado field to standard values
   * @param {string} estado - Raw estado value
   * @returns {string} Normalized estado
   */
  normalizeEstado(estado) {
    if (!estado) return 'disponible';

    const normalized = estado.toString().toLowerCase().trim();

    if (normalized.includes('disp')) return 'disponible';
    if (normalized.includes('res')) return 'reservado';
    if (normalized.includes('ven')) return 'vendido';

    // Default to disponible if unknown
    return 'disponible';
  }

  /**
   * Format dimensions string
   * @param {Object} lote - Database lote
   * @returns {string} Formatted dimensions
   */
  formatDimensions(lote) {
    // Check if already formatted
    if (lote.dimensions && lote.dimensions !== 'null') {
      return lote.dimensions;
    }

    // Try to construct from largo x ancho
    if (lote.largo && lote.ancho) {
      return `${lote.largo} x ${lote.ancho}`;
    }

    // Fallback to area
    if (lote.area) {
      return `${lote.area} m²`;
    }

    return null;
  }

  /**
   * Get default photo based on estado
   * @param {string} estado - Lote estado
   * @returns {string} Photo URL
   */
  getDefaultPhoto(estado) {
    const seed = `lote-${estado}`;
    return `https://picsum.photos/seed/${seed}/400/300`;
  }

  /**
   * Create fallback GeoJSON feature if geojson is missing
   * Uses centroid coordinates to create a point feature
   *
   * @param {Object} lote - Database lote
   * @returns {Object|null} GeoJSON feature or null
   */
  createFallbackFeature(lote) {
    // Use centroide_lat and centroide_lng from database schema
    if (lote.centroide_lat && lote.centroide_lng) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lote.centroide_lng, lote.centroide_lat]
        },
        properties: {
          name: lote.nombre,
          estado: lote.estado
        }
      };
    }

    console.warn(`No geojson or coordinates available for lote ${lote.id}`);
    return null;
  }

  /**
   * Convert lotes to GeoJSON FeatureCollection
   * Useful for batch rendering on map
   *
   * @param {Array} lotes - Array of lote objects
   * @returns {Object} GeoJSON FeatureCollection
   */
  toGeoJSONFeatureCollection(lotes = null) {
    const lotesToConvert = lotes || this.lotes;

    const features = lotesToConvert
      .filter(lote => lote.feature !== null)
      .map(lote => lote.feature);

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /**
   * Get lotes filtered by estado
   * @param {string} estado - Estado to filter by
   * @returns {Array} Filtered lotes
   */
  getByEstado(estado) {
    const normalizedEstado = this.normalizeEstado(estado);
    return this.lotes.filter(lote =>
      this.normalizeEstado(lote.estado) === normalizedEstado
    );
  }

  /**
   * Get lotes count by estado
   * @returns {Object} Object with counts
   */
  getCountsByEstado() {
    const counts = {
      disponibles: 0,
      reservados: 0,
      vendidos: 0
    };

    this.lotes.forEach(lote => {
      const estado = this.normalizeEstado(lote.estado);
      if (estado === 'disponible') counts.disponibles++;
      else if (estado === 'reservado') counts.reservados++;
      else if (estado === 'vendido') counts.vendidos++;
    });

    return counts;
  }

  /**
   * Get lote by name
   * @param {string} name - Lote name
   * @returns {Object|null} Lote or null
   */
  getByName(name) {
    return this.lotes.find(lote => lote.name === name) || null;
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.lotes = [];
    this.currentLoteamientoId = null;
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

  /**
   * Get current loteamiento ID
   * @returns {string|null} Current loteamiento ID
   */
  getCurrentLoteamientoId() {
    return this.currentLoteamientoId;
  }

  /**
   * Get all loaded lotes
   * @returns {Array} All lotes
   */
  getAll() {
    return this.lotes;
  }
}

// Create singleton instance
const loteService = new LoteService();

// Export for use in other modules
window.LoteService = loteService;

console.log('LoteService initialized');
