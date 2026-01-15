/**
 * Reservation API Configuration - Inmobiliaria Mega Proyectos
 *
 * SECURITY WARNING:
 * - DO NOT commit real API keys to version control
 * - Replace placeholder values with actual credentials during deployment
 * - Consider using environment variables or secure configuration management
 *
 * Configuration for backend Web Service API endpoint
 * Used by reservation-service.js to submit reservations
 */

const RESERVATION_CONFIG = {
  /**
   * Base URL of the backend API
   * @example 'https://api.megaproyectos.com'
   * @example 'https://your-backend-domain.com'
   */
  apiBase: 'https://mega-proyectos-wsnotification-qzx5ly-024631-217-216-64-58.traefik.me',

  /**
   * API Key for authentication
   * This key should be provided by your backend administrator
   * It will be sent in the 'x-api-key' header
   * @example 'mp_live_abc123xyz456'
   */
  apiKey: 'mega-prod-2026-1142026',

  /**
   * Reservation endpoint path
   * Full URL will be: {apiBase}{endpoint}
   * @default '/api/reservations'
   */
  endpoint: '/api/reservations',

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout: 30000
};

// Export to global scope for use by reservation-service.js
if (typeof window !== 'undefined') {
  window.ReservationConfig = RESERVATION_CONFIG;
  console.log('✓ Reservation API configuration loaded');
}

// Validation check (development only - remove in production)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  if (RESERVATION_CONFIG.apiBase.includes('YOUR_API_BASE_URL_HERE')) {
    console.warn('⚠ WARNING: Reservation API base URL is not configured. Please update assets/js/config.js');
  }
  if (RESERVATION_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    console.warn('⚠ WARNING: Reservation API key is not configured. Please update assets/js/config.js');
  }
}
