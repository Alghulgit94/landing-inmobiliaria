/**
 * Index Page JavaScript - Inmobiliaria Mega Proyectos
 * Carousel functionality for the "Why Live Here" section
 */

(function() {
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