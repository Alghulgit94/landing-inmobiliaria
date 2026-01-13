/**
 * Interest Service - Inmobiliaria Mega Proyectos
 * Service layer for managing lot interest registrations (for reserved lots)
 *
 * Responsibilities:
 * - Submit interest records to lot_interests table
 * - Validate contact information
 * - Handle duplicate submissions gracefully
 * - Manage localStorage persistence
 *
 * @requires supabase-client.js
 */

class InterestService {
  constructor() {
    this.isProcessing = false;
    this.error = null;
  }

  /**
   * Submit interest for a reserved lot
   *
   * @param {Object} interestData - Interest form data
   * @param {string} interestData.lotId - Lot ID
   * @param {string} interestData.contactName - Contact name (min 2 chars)
   * @param {string} interestData.contactPhone - Contact phone (min 6 chars)
   * @returns {Promise<Object>} Response with success/error status and messages
   */
  async submitInterest(interestData) {
    // Prevent concurrent submissions
    if (this.isProcessing) {
      return {
        success: false,
        error: {
          code: 'CONCURRENT_REQUEST',
          message_es: 'Ya hay una solicitud en proceso. Por favor espere.',
          message_en: 'A request is already being processed. Please wait.',
          message_de: 'Eine Anfrage wird bereits verarbeitet. Bitte warten.'
        }
      };
    }

    this.isProcessing = true;
    this.error = null;

    try {
      // Validate required fields
      const validation = this.validateInterestData(interestData);
      if (!validation.isValid) {
        this.isProcessing = false;
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message_es: validation.message_es,
            message_en: validation.message_en,
            message_de: validation.message_de,
            field: validation.field
          }
        };
      }

      // Get Supabase client
      const supabase = window.SupabaseClient;

      if (!supabase || !supabase.isReady()) {
        throw new Error('Supabase client not initialized');
      }

      const client = supabase.getClient();

      // Prepare interest record
      const interestRecord = {
        lot_id: interestData.lotId,
        contact_name: interestData.contactName.trim(),
        contact_phone: interestData.contactPhone.trim(),
        source: 'landing',
        created_at: new Date().toISOString()
      };

      // Insert interest record WITHOUT .select() or .single()
      const { error: insertError } = await client
        .from('lot_interests')
        .insert([interestRecord]);

      if (insertError) {
        this.isProcessing = false;

        // Check for duplicate/unique constraint error (23505)
        // Treat duplicates as success per requirements
        if (insertError.code === '23505' ||
            (insertError.message && insertError.message.toLowerCase().includes('duplicate'))) {
          // Duplicate is treated as success
          return {
            success: true,
            data: {
              lot_id: interestData.lotId,
              wasAlreadyRegistered: true
            },
            message_es: 'Interés registrado',
            message_en: 'Interest registered',
            message_de: 'Interesse registriert'
          };
        }

        // Other errors
        return {
          success: false,
          error: {
            code: 'INSERT_FAILED',
            message_es: 'No se pudo registrar tu interés. Intentá de nuevo.',
            message_en: 'Could not register your interest. Please try again.',
            message_de: 'Ihr Interesse konnte nicht registriert werden. Bitte versuchen Sie es erneut.'
          }
        };
      }

      // Success!
      this.isProcessing = false;

      return {
        success: true,
        data: {
          lot_id: interestData.lotId
        },
        message_es: 'Interés registrado',
        message_en: 'Interest registered',
        message_de: 'Interesse registriert'
      };

    } catch (error) {
      this.error = error.message;
      this.isProcessing = false;

      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message_es: 'No se pudo registrar tu interés. Intentá de nuevo.',
          message_en: 'Could not register your interest. Please try again.',
          message_de: 'Ihr Interesse konnte nicht registriert werden. Bitte versuchen Sie es erneut.'
        }
      };
    }
  }

  /**
   * Validate interest data
   * @param {Object} data - Interest data
   * @returns {Object} Validation result
   */
  validateInterestData(data) {
    // Validate lot ID
    if (!data.lotId) {
      return {
        isValid: false,
        field: 'lotId',
        message_es: 'ID de lote inválido.',
        message_en: 'Invalid lot ID.',
        message_de: 'Ungültige Grundstücks-ID.'
      };
    }

    // Validate contact name (min 2 chars)
    if (!data.contactName || data.contactName.trim().length < 2) {
      return {
        isValid: false,
        field: 'contactName',
        message_es: 'El nombre debe tener al menos 2 caracteres.',
        message_en: 'Name must be at least 2 characters.',
        message_de: 'Der Name muss mindestens 2 Zeichen lang sein.'
      };
    }

    // Validate contact phone (min 6 chars)
    if (!data.contactPhone || data.contactPhone.trim().length < 6) {
      return {
        isValid: false,
        field: 'contactPhone',
        message_es: 'El teléfono debe tener al menos 6 caracteres.',
        message_en: 'Phone must be at least 6 characters.',
        message_de: 'Die Telefonnummer muss mindestens 6 Zeichen lang sein.'
      };
    }

    return { isValid: true };
  }

  /**
   * Check if interest has already been registered (from localStorage)
   * @param {string} lotId - Lot ID
   * @returns {boolean} True if already registered
   */
  hasRegisteredInterest(lotId) {
    try {
      const key = `interest_${lotId}`;
      return localStorage.getItem(key) === '1';
    } catch (error) {
      console.warn('localStorage access failed:', error);
      return false;
    }
  }

  /**
   * Mark interest as registered in localStorage
   * @param {string} lotId - Lot ID
   */
  markInterestRegistered(lotId) {
    try {
      const key = `interest_${lotId}`;
      localStorage.setItem(key, '1');
    } catch (error) {
      console.warn('localStorage write failed:', error);
    }
  }

  /**
   * Check if service is currently processing
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
  window.InterestService = new InterestService();
}
