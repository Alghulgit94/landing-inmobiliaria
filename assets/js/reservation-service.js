/**
 * Reservation Service - Inmobiliaria Mega Proyectos
 * Service layer for managing reservation operations via Backend API
 *
 * Responsibilities:
 * - Submit reservations to backend Web Service API
 * - Client-side validation of form data
 * - Handle API responses and errors
 * - Provide multilingual error messages (Spanish/English/German)
 *
 * @requires config.js (window.ReservationConfig)
 */

class ReservationService {
  constructor() {
    this.isProcessing = false;
    this.error = null;
  }

  /**
   * Submit a reservation to the backend API
   * The backend will handle:
   * 1. Lot availability validation
   * 2. Database transaction (insert reservation + update lot estado)
   * 3. Business logic and data persistence
   *
   * @param {Object} reservationData - Reservation form data
   * @param {string} reservationData.firstName - First name
   * @param {string} reservationData.lastName - Last name
   * @param {string} reservationData.email - Email address
   * @param {string} reservationData.phone - Phone number
   * @param {string} reservationData.additionalMessage - Optional message
   * @param {string} reservationData.loteId - Lote ID (from URL)
   * @param {string} reservationData.loteamientoId - Loteamiento ID (from URL)
   * @param {Object} reservationData.lotDetails - Full lote data for database and email generation
   * @param {string} reservationData.lotDetails.nombre - Lot name
   * @param {string} reservationData.lotDetails.loteamiento_id - Parent development ID
   * @param {number} [reservationData.lotDetails.area_m2] - Area in square meters (optional)
   * @param {string} [reservationData.lotDetails.lados] - Lot dimensions/sides (optional)
   * @returns {Promise<Object>} Response with success/error status and messages
   */
  async submitReservation(reservationData) {
    // Prevent concurrent submissions
    if (this.isProcessing) {
      return {
        success: false,
        error: {
          code: 'CONCURRENT_REQUEST',
          message_es: 'Ya hay una reservación en proceso. Por favor espere.',
          message_en: 'A reservation is already being processed. Please wait.',
          message_de: 'Eine Reservierung wird bereits bearbeitet. Bitte warten Sie.'
        }
      };
    }

    this.isProcessing = true;
    this.error = null;

    try {
      // Client-side validation
      const validation = this.validateReservationData(reservationData);
      if (!validation.isValid) {
        this.isProcessing = false;
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message_es: validation.message_es,
            message_en: validation.message_en,
            message_de: validation.message_de || validation.message_en,
            field: validation.field
          }
        };
      }

      // Check if API configuration is loaded
      if (!window.ReservationConfig) {
        throw new Error('Reservation API configuration not loaded. Please ensure config.js is loaded before reservation-service.js');
      }

      const config = window.ReservationConfig;

      // Validate configuration
      if (!config.apiBase || config.apiBase.includes('YOUR_API_BASE_URL_HERE')) {
        throw new Error('Reservation API base URL is not configured. Please update assets/js/config.js');
      }

      if (!config.apiKey || config.apiKey === 'YOUR_API_KEY_HERE') {
        throw new Error('Reservation API key is not configured. Please update assets/js/config.js');
      }

      // Build API endpoint URL
      const apiUrl = `${config.apiBase}${config.endpoint}`;

      // Prepare request payload (snake_case format matching backend API schema)
      const payload = {
        first_name: reservationData.firstName.trim(),
        last_name: reservationData.lastName.trim(),
        email: reservationData.email.trim().toLowerCase(),
        lot_id: reservationData.loteId,
        reservation_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        phone: reservationData.phone.trim(),
        additional_message: reservationData.additionalMessage ? reservationData.additionalMessage.trim() : null,
        lot_details: reservationData.lotDetails || {
          nombre: 'Unknown',
          loteamiento_id: reservationData.loteamientoId
        }
      };

      console.log('Submitting reservation to API:', apiUrl);

      // Make API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await response.json();

      // Handle HTTP errors
      if (!response.ok) {
        this.isProcessing = false;

        // API returned structured error
        if (responseData.error) {
          return {
            success: false,
            error: {
              code: responseData.error.code || 'API_ERROR',
              message_es: responseData.error.message_es || 'Error al procesar la reservación.',
              message_en: responseData.error.message_en || 'Error processing reservation.',
              message_de: responseData.error.message_de || 'Fehler bei der Verarbeitung der Reservierung.'
            }
          };
        }

        // Generic HTTP error
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message_es: `Error del servidor (${response.status}). Por favor, intente nuevamente.`,
            message_en: `Server error (${response.status}). Please try again.`,
            message_de: `Serverfehler (${response.status}). Bitte versuchen Sie es erneut.`
          }
        };
      }

      // Success response
      this.isProcessing = false;

      // Return API response (backend should provide success/error structure)
      if (responseData.success === false) {
        // Backend returned structured error despite 200 OK
        return {
          success: false,
          error: responseData.error || {
            code: 'UNKNOWN_ERROR',
            message_es: 'Error desconocido al procesar la reservación.',
            message_en: 'Unknown error processing reservation.',
            message_de: 'Unbekannter Fehler bei der Verarbeitung der Reservierung.'
          }
        };
      }

      // Successful reservation
      return {
        success: true,
        data: responseData.data || {
          lot_id: reservationData.loteId
        },
        message_es: responseData.message_es || '¡Reservación enviada exitosamente! Nos pondremos en contacto con usted pronto.',
        message_en: responseData.message_en || 'Reservation submitted successfully! We will contact you soon.',
        message_de: responseData.message_de || 'Reservierung erfolgreich übermittelt! Wir werden uns bald bei Ihnen melden.'
      };

    } catch (error) {
      this.error = error.message;
      this.isProcessing = false;

      // Handle network errors
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message_es: 'La solicitud tardó demasiado. Por favor, verifique su conexión e intente nuevamente.',
            message_en: 'Request timed out. Please check your connection and try again.',
            message_de: 'Anfrage hat zu lange gedauert. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.'
          }
        };
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message_es: 'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.',
            message_en: 'Connection error. Please check your internet connection and try again.',
            message_de: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
          }
        };
      }

      // Generic unexpected error
      console.error('Unexpected error in reservation submission:', error);
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message_es: 'Error inesperado al procesar la reservación. Por favor intente nuevamente.',
          message_en: 'Unexpected error processing reservation. Please try again.',
          message_de: 'Unerwarteter Fehler bei der Verarbeitung der Reservierung. Bitte versuchen Sie es erneut.'
        }
      };
    }
  }

  /**
   * Validate reservation data (client-side validation)
   * Backend will perform additional validation
   * @param {Object} data - Reservation data
   * @returns {Object} Validation result
   */
  validateReservationData(data) {
    // Required fields validation
    if (!data.firstName || data.firstName.trim().length === 0) {
      return {
        isValid: false,
        field: 'firstName',
        message_es: 'El nombre es obligatorio.',
        message_en: 'First name is required.',
        message_de: 'Vorname ist erforderlich.'
      };
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      return {
        isValid: false,
        field: 'lastName',
        message_es: 'El apellido es obligatorio.',
        message_en: 'Last name is required.',
        message_de: 'Nachname ist erforderlich.'
      };
    }

    if (!data.email || data.email.trim().length === 0) {
      return {
        isValid: false,
        field: 'email',
        message_es: 'El correo electrónico es obligatorio.',
        message_en: 'Email is required.',
        message_de: 'E-Mail ist erforderlich.'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        isValid: false,
        field: 'email',
        message_es: 'Por favor, ingrese un correo electrónico válido.',
        message_en: 'Please enter a valid email address.',
        message_de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
      };
    }

    if (!data.phone || data.phone.trim().length === 0) {
      return {
        isValid: false,
        field: 'phone',
        message_es: 'El teléfono es obligatorio.',
        message_en: 'Phone is required.',
        message_de: 'Telefon ist erforderlich.'
      };
    }

    // Phone format validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
      return {
        isValid: false,
        field: 'phone',
        message_es: 'Por favor, ingrese un número de teléfono válido (mínimo 10 dígitos).',
        message_en: 'Please enter a valid phone number (minimum 10 digits).',
        message_de: 'Bitte geben Sie eine gültige Telefonnummer ein (mindestens 10 Ziffern).'
      };
    }

    if (!data.loteId) {
      return {
        isValid: false,
        field: 'loteId',
        message_es: 'ID de lote inválido.',
        message_en: 'Invalid lot ID.',
        message_de: 'Ungültige Grundstücks-ID.'
      };
    }

    // Additional message length validation (optional field)
    if (data.additionalMessage && data.additionalMessage.length > 500) {
      return {
        isValid: false,
        field: 'additionalMessage',
        message_es: 'El mensaje adicional no puede superar los 500 caracteres.',
        message_en: 'Additional message cannot exceed 500 characters.',
        message_de: 'Zusätzliche Nachricht darf 500 Zeichen nicht überschreiten.'
      };
    }

    return { isValid: true };
  }

  /**
   * Check if service is currently processing a reservation
   * @returns {boolean}
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get last error message
   * @returns {string|null}
   */
  getLastError() {
    return this.error;
  }
}

// Export as singleton instance
if (typeof window !== 'undefined') {
  window.ReservationService = new ReservationService();
  console.log('✓ ReservationService initialized (API mode)');
}
