/**
 * Supabase Client Configuration - Inmobiliaria Mega Proyectos
 * Singleton instance of Supabase client for database operations
 *
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 *
 * @requires https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 */

(function () {
  'use strict';

  /**
   * Supabase Configuration
   * TODO: Replace these with your actual Supabase credentials
   * For production, consider using environment variables or a build process
   */
  const SUPABASE_CONFIG = {
    url: '',
    anonKey: ''
  };

  /**
   * SupabaseClient Class
   * Manages Supabase connection and provides utility methods
   */
  class SupabaseClient {
    constructor() {
      this.client = null;
      this.isInitialized = false;
      this.initializationError = null;

      this.initialize();
    }

    /**
     * Initialize Supabase client
     */
    initialize() {
      try {
        // Validate configuration
        if (!this.validateConfig()) {
          throw new Error('Invalid Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY.');
        }

        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
          throw new Error('Supabase library not loaded. Please include the Supabase JS library in your HTML.');
        }

        // Create Supabase client
        this.client = window.supabase.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey
        );

        this.isInitialized = true;
        console.log('✓ Supabase client initialized successfully');

      } catch (error) {
        this.initializationError = error;
        this.isInitialized = false;
        console.error('✗ Supabase initialization failed:', error);
      }
    }

    /**
     * Validate Supabase configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfig() {
      const { url, anonKey } = SUPABASE_CONFIG;

      if (!url || url === 'YOUR_SUPABASE_URL' || url.trim() === '') {
        console.error('Supabase URL not configured');
        return false;
      }

      if (!anonKey || anonKey === 'YOUR_SUPABASE_ANON_KEY' || anonKey.trim() === '') {
        console.error('Supabase anon key not configured');
        return false;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (e) {
        console.error('Invalid Supabase URL format:', e.message);
        return false;
      }

      return true;
    }

    /**
     * Get Supabase client instance
     * @returns {Object|null} Supabase client or null if not initialized
     */
    getClient() {
      if (!this.isInitialized) {
        console.warn('Supabase client not initialized. Error:', this.initializationError);
        return null;
      }
      return this.client;
    }

    /**
     * Check if client is ready
     * @returns {boolean} True if client is initialized and ready
     */
    isReady() {
      return this.isInitialized && this.client !== null;
    }

    /**
     * Get initialization error if any
     * @returns {Error|null} Initialization error or null
     */
    getError() {
      return this.initializationError;
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
      if (!this.isReady()) {
        console.error('Cannot test connection: client not initialized');
        return false;
      }

      try {
        // Try to fetch a single row from loteamiento table
        const { data, error } = await this.client
          .from('loteamiento')
          .select('id')
          .limit(1);

        if (error) {
          console.error('Database connection test failed:', error);
          return false;
        }

        console.log('✓ Database connection test successful');
        return true;

      } catch (error) {
        console.error('Database connection test error:', error);
        return false;
      }
    }

    /**
     * Get table reference
     * @param {string} tableName - Name of the table
     * @returns {Object|null} Table reference or null
     */
    table(tableName) {
      if (!this.isReady()) {
        console.error('Cannot access table: client not initialized');
        return null;
      }
      return this.client.from(tableName);
    }
  }

  // Create singleton instance
  const supabaseClient = new SupabaseClient();

  // Export to window for global access
  window.SupabaseClient = supabaseClient;

  // Log initialization status
  if (supabaseClient.isReady()) {
    console.log('Supabase client ready for use');
  } else {
    console.warn('Supabase client initialization failed. Check configuration.');
  }

})();
