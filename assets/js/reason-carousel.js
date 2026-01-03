/**
 * Reason Carousel - Automatic Image Carousel for Reason Items
 * Step-based carousel that only pauses between complete slides
 */

(function() {
  'use strict';

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }

  function initCarousels() {
    const carousels = document.querySelectorAll('.reason-carousel');

    carousels.forEach((carousel) => {
      const track = carousel.querySelector('.reason-carousel__track');
      const images = Array.from(track.querySelectorAll('.reason-item__image'));

      if (images.length <= 1) {
        // No need for carousel if there's only one image
        return;
      }

      // Clone images for seamless loop
      const originalImageCount = images.length;
      images.forEach(img => {
        const clone = img.cloneNode(true);
        track.appendChild(clone);
      });

      // Carousel state
      let currentIndex = 0;
      let isAnimating = false;
      let isPaused = false;
      let isVisible = false; // Start as false, let observer set it
      let autoPlayInterval = null;

      // Constants
      const SLIDE_DURATION = 4000; // 4 seconds per slide
      const TRANSITION_DURATION = 800; // 0.8s transition

      // Function to go to next slide
      function goToNextSlide() {
        if (isAnimating || isPaused || !isVisible) return;

        isAnimating = true;
        track.classList.add('animating');
        currentIndex++;

        // Apply transform
        const translateX = -(currentIndex * 100);
        track.style.transform = `translateX(${translateX}%)`;

        // After transition completes
        setTimeout(() => {
          // Reset to first image when we reach the cloned set
          if (currentIndex >= originalImageCount) {
            track.style.transition = 'none';
            currentIndex = 0;
            track.style.transform = 'translateX(0)';

            // Force reflow
            track.offsetHeight;

            // Re-enable transition
            setTimeout(() => {
              track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
              isAnimating = false;
              track.classList.remove('animating');
            }, 50);
          } else {
            isAnimating = false;
            track.classList.remove('animating');
          }
        }, TRANSITION_DURATION);
      }

      // Start auto-play
      function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(goToNextSlide, SLIDE_DURATION);
      }

      // Stop auto-play
      function stopAutoPlay() {
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
        }
      }

      // Hover handlers - only pause when not animating
      carousel.addEventListener('mouseenter', () => {
        isPaused = true;
        stopAutoPlay();
      });

      carousel.addEventListener('mouseleave', () => {
        isPaused = false;
        if (isVisible && !isAnimating) {
          startAutoPlay();
        }
      });

      // Intersection observer for performance
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
          if (isVisible && !isPaused) {
            startAutoPlay();
          } else {
            stopAutoPlay();
          }
        });
      }, {
        threshold: 0.1
      });

      observer.observe(carousel);

      // Initialize styles
      track.style.transform = 'translateX(0)';
      track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  }

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reason-carousel__track').forEach(track => {
      track.style.transition = 'none';
    });
  }
})();
