/**
 * Internationalization (i18n) System - Inmobiliaria Mega Proyectos
 * Handles language switching, automatic detection, and text translation
 */

(function() {
  'use strict';

  // Configuration
  const I18N_CONFIG = {
    defaultLanguage: 'es',
    supportedLanguages: ['es', 'en', 'de'],
    storageKey: 'selected-language',
    localesPath: 'locales/',
    fallbackLanguage: 'es'
  };

  // Language data cache
  let languageCache = {};
  let currentLanguage = I18N_CONFIG.defaultLanguage;
  let isInitialized = false;

  /**
   * Initialize the i18n system
   */
  async function initializeI18n() {
    try {
      // Detect and set initial language
      const detectedLanguage = detectLanguage();
      await setLanguage(detectedLanguage);
      
      // Setup language switcher if present
      setupLanguageSwitcher();
      
      isInitialized = true;
      console.log(`i18n initialized with language: ${currentLanguage}`);
      
      // Dispatch initialization event
      document.dispatchEvent(new CustomEvent('i18nInitialized', {
        detail: { language: currentLanguage }
      }));
      
    } catch (error) {
      console.error('Failed to initialize i18n:', error);
      // Fallback to default language
      await setLanguage(I18N_CONFIG.fallbackLanguage);
    }
  }

  /**
   * Detect user's preferred language
   * @returns {string} Detected language code
   */
  function detectLanguage() {
    // 1. Check if user has previously selected a language
    const savedLanguage = localStorage.getItem(I18N_CONFIG.storageKey);
    if (savedLanguage && I18N_CONFIG.supportedLanguages.includes(savedLanguage)) {
      return savedLanguage;
    }

    // 2. Detect from browser language
    const browserLanguage = getBrowserLanguage();
    if (browserLanguage && I18N_CONFIG.supportedLanguages.includes(browserLanguage)) {
      return browserLanguage;
    }

    // 3. Try to detect from user location (basic implementation)
    const locationLanguage = getLocationBasedLanguage();
    if (locationLanguage && I18N_CONFIG.supportedLanguages.includes(locationLanguage)) {
      return locationLanguage;
    }

    // 4. Fallback to default
    return I18N_CONFIG.defaultLanguage;
  }

  /**
   * Get browser language preference
   * @returns {string|null} Language code or null
   */
  function getBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (!browserLang) return null;
    
    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase();
    return I18N_CONFIG.supportedLanguages.includes(langCode) ? langCode : null;
  }

  /**
   * Basic location-based language detection
   * @returns {string|null} Language code or null
   */
  function getLocationBasedLanguage() {
    // This is a basic implementation. In production, you might use:
    // - IP geolocation services
    // - Browser geolocation API with user permission
    // - Country code mapping
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Simple timezone to language mapping
    const timezoneToLanguage = {
      'Europe/Berlin': 'de',
      'Europe/Vienna': 'de',
      'Europe/Zurich': 'de',
      'America/New_York': 'en',
      'America/Los_Angeles': 'en',
      'America/Chicago': 'en',
      'Europe/London': 'en',
      'America/Mexico_City': 'es',
      'America/Bogota': 'es',
      'America/Lima': 'es',
      'Europe/Madrid': 'es'
    };

    return timezoneToLanguage[timezone] || null;
  }

  /**
   * Load language file
   * @param {string} languageCode - Language code to load
   * @returns {Promise<Object>} Language data
   */
  async function loadLanguageFile(languageCode) {
    // Check cache first
    if (languageCache[languageCode]) {
      return languageCache[languageCode];
    }

    try {
      const response = await fetch(`${I18N_CONFIG.localesPath}${languageCode}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const languageData = await response.json();
      
      // Cache the data
      languageCache[languageCode] = languageData;
      
      return languageData;
      
    } catch (error) {
      console.error(`Failed to load language file for ${languageCode}:`, error);
      
      // Try to load fallback language if not already trying
      if (languageCode !== I18N_CONFIG.fallbackLanguage) {
        return await loadLanguageFile(I18N_CONFIG.fallbackLanguage);
      }
      
      throw error;
    }
  }

  /**
   * Set and apply language
   * @param {string} languageCode - Language code to set
   */
  async function setLanguage(languageCode) {
    if (!I18N_CONFIG.supportedLanguages.includes(languageCode)) {
      console.warn(`Unsupported language: ${languageCode}. Using fallback.`);
      languageCode = I18N_CONFIG.fallbackLanguage;
    }

    try {
      // Load language data
      const languageData = await loadLanguageFile(languageCode);
      
      // Update current language
      currentLanguage = languageCode;
      
      // Save to localStorage
      localStorage.setItem(I18N_CONFIG.storageKey, languageCode);
      
      // Update HTML lang attribute
      document.documentElement.lang = languageCode;
      
      // Apply translations to DOM
      applyTranslations(languageData);
      
      // Update language switcher UI
      updateLanguageSwitcherUI(languageCode);
      
      // Dispatch language change event
      document.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { 
          language: languageCode,
          languageData: languageData 
        }
      }));
      
      console.log(`Language set to: ${languageCode}`);
      
    } catch (error) {
      console.error(`Failed to set language to ${languageCode}:`, error);
      throw error;
    }
  }

  /**
   * Apply translations to DOM elements
   * @param {Object} languageData - Language data object
   */
  function applyTranslations(languageData) {
    // Handle text content translations
    const elementsWithText = document.querySelectorAll('[data-i18n]');
    elementsWithText.forEach(element => {
      const translationKey = element.getAttribute('data-i18n');
      const translation = getNestedTranslation(languageData, translationKey);
      
      if (translation) {
        // Handle HTML content properly
        if (element.innerHTML.includes('<strong>') || element.innerHTML.includes('<br>')) {
          // Preserve HTML structure for certain elements
          const currentHTML = element.innerHTML;
          const hasStrong = currentHTML.includes('<strong>');
          const hasBr = currentHTML.includes('<br>');
          
          let newContent = translation;
          
          // Re-apply HTML tags if they existed
          if (hasStrong && translation.includes('Inmobiliaria Mega Proyectos')) {
            newContent = newContent.replace('Inmobiliaria Mega Proyectos', '<strong>Inmobiliaria Mega Proyectos</strong>');
          } else if (hasStrong && translation.includes('Mega Projects Real Estate')) {
            newContent = newContent.replace('Mega Projects Real Estate', '<strong>Mega Projects Real Estate</strong>');
          } else if (hasStrong && translation.includes('Immobilien Mega Projekte')) {
            newContent = newContent.replace('Immobilien Mega Projekte', '<strong>Immobilien Mega Projekte</strong>');
          }
          
          if (hasBr) {
            newContent = newContent.replace(/\n/g, '<br>');
          }
          
          element.innerHTML = newContent;
        } else {
          element.textContent = translation;
        }
      } else {
        console.warn(`Translation not found for key: ${translationKey}`);
      }
    });

    // Handle attribute translations
    const elementsWithAttrs = document.querySelectorAll('[data-i18n-attr]');
    elementsWithAttrs.forEach(element => {
      const attrConfig = element.getAttribute('data-i18n-attr');
      const [attrName, translationKey] = attrConfig.split(':');
      
      const translation = getNestedTranslation(languageData, translationKey);
      
      if (translation) {
        element.setAttribute(attrName, translation);
      } else {
        console.warn(`Translation not found for attribute key: ${translationKey}`);
      }
    });

    // Update meta tags
    updateMetaTags(languageData);
  }

  /**
   * Get nested translation value
   * @param {Object} obj - Language data object
   * @param {string} path - Dot-separated path to translation
   * @returns {string|null} Translation or null if not found
   */
  function getNestedTranslation(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Update meta tags with translations
   * @param {Object} languageData - Language data object
   */
  function updateMetaTags(languageData) {
    // Update title
    const title = getNestedTranslation(languageData, 'index.page_title');
    if (title) {
      document.title = title;
    }

    // Update meta description
    const description = getNestedTranslation(languageData, 'index.meta_description');
    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) {
      ogTitle.setAttribute('content', title);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && description) {
      ogDesc.setAttribute('content', description);
    }
  }

  /**
   * Setup language switcher functionality
   */
  function setupLanguageSwitcher() {
    const languageSelector = document.getElementById('language-selector');
    if (!languageSelector) {
      console.warn('Language selector not found');
      return;
    }

    languageSelector.addEventListener('change', async (e) => {
      const selectedLanguage = e.target.value;
      
      if (selectedLanguage && selectedLanguage !== currentLanguage) {
        // Add loading state
        languageSelector.style.opacity = '0.6';
        languageSelector.disabled = true;
        
        try {
          await setLanguage(selectedLanguage);
        } catch (error) {
          console.error('Failed to change language:', error);
          // Reset selector to previous value on error
          languageSelector.value = currentLanguage;
        } finally {
          languageSelector.style.opacity = '1';
          languageSelector.disabled = false;
        }
      }
    });
  }

  /**
   * Update language switcher UI
   * @param {string} languageCode - Current language code
   */
  function updateLanguageSwitcherUI(languageCode) {
    const languageSelector = document.getElementById('language-selector');
    if (!languageSelector) return;

    // Update the select element value
    languageSelector.value = languageCode;
    
    // Update the option selected state
    const options = languageSelector.querySelectorAll('option');
    options.forEach(option => {
      if (option.value === languageCode) {
        option.selected = true;
      } else {
        option.selected = false;
      }
    });
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  function getCurrentLanguage() {
    return currentLanguage;
  }

  /**
   * Get available languages
   * @returns {string[]} Array of supported language codes
   */
  function getSupportedLanguages() {
    return [...I18N_CONFIG.supportedLanguages];
  }

  /**
   * Check if i18n is initialized
   * @returns {boolean} Initialization status
   */
  function isI18nInitialized() {
    return isInitialized;
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key (e.g., 'reservation.validation.required')
   * @returns {string} Translation or key if not found
   */
  function translate(key) {
    if (!isInitialized || !languageCache[currentLanguage]) {
      console.warn(`i18n not initialized or language data not loaded for key: ${key}`);
      return key;
    }

    const translation = getNestedTranslation(languageCache[currentLanguage], key);

    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    return translation;
  }

  /**
   * Public API
   */
  window.I18n = {
    init: initializeI18n,
    setLanguage: setLanguage,
    getCurrentLanguage: getCurrentLanguage,
    getSupportedLanguages: getSupportedLanguages,
    isInitialized: isI18nInitialized,
    t: translate,

    // Expose language cache for external use
    get _languageCache() {
      return languageCache;
    },

    // Events: 'languageChanged', 'i18nInitialized'
  };

  // Create lowercase alias for convenience
  window.i18n = window.I18n;

  // Auto-initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeI18n);
  } else {
    // DOM is already loaded
    initializeI18n();
  }

})();