/**
 * Gallery Modal - Image Carousel for Land Images
 * Displays all land*.jpg/JPG images in a modal with keyboard and touch navigation
 *
 * NOTE: This modal is only used in index.html for land image galleries.
 * It is disabled on mapa.html as the carousel functionality is not needed there.
 */

(function () {
  'use strict';

  // Only initialize on index.html, skip on mapa.html
  const currentPage = window.location.pathname;
  const isMapPage = currentPage.includes('mapa.html') || currentPage.endsWith('mapa');

  if (isMapPage) {
    console.log('Gallery Modal: Skipping initialization on mapa.html');
    return; // Exit early on map page
  }

  // Land images array (11 total)
  const landImages = [
    'assets/img/land1.jpg',
    'assets/img/land2.jpg',
    'assets/img/land3.jpg',
    'assets/img/land4.jpg',
    'assets/img/land5.JPG',
    'assets/img/land6.JPG',
    'assets/img/land7.JPG',
    'assets/img/land8.JPG',
    'assets/img/land9.JPG',
    'assets/img/land10.JPG',
    'assets/img/land11.JPG'
  ];

  // DOM Elements
  const modal = document.getElementById('galleryModal');
  const overlay = document.getElementById('galleryOverlay');
  const closeBtn = document.getElementById('galleryClose');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  const galleryImage = document.getElementById('galleryImage');
  const currentIndexEl = document.getElementById('galleryCurrentIndex');
  const totalImagesEl = document.getElementById('galleryTotal');

  // State
  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;

  /**
   * Initialize gallery modal
   */
  function init() {
    // Set total images
    totalImagesEl.textContent = landImages.length;

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', showPrevImage);
    nextBtn.addEventListener('click', showNextImage);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyPress);

    // Touch/swipe support for mobile
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });

    console.log('✓ Gallery Modal initialized with', landImages.length, 'images');
  }

  /**
   * Open modal at specific index
   */
  function openModal(index = 0) {
    currentIndex = Math.max(0, Math.min(index, landImages.length - 1));
    updateImage();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-modal-open');

    // Preload adjacent images for smooth transitions
    preloadAdjacentImages();
  }

  /**
   * Close modal
   */
  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-modal-open');
  }

  /**
   * Show previous image
   */
  function showPrevImage() {
    currentIndex = (currentIndex - 1 + landImages.length) % landImages.length;
    updateImage();
    preloadAdjacentImages();
  }

  /**
   * Show next image
   */
  function showNextImage() {
    currentIndex = (currentIndex + 1) % landImages.length;
    updateImage();
    preloadAdjacentImages();
  }

  /**
   * Update displayed image
   */
  function updateImage() {
    const imageSrc = landImages[currentIndex];
    galleryImage.src = imageSrc;
    galleryImage.alt = `Imagen de terreno ${currentIndex + 1} de ${landImages.length}`;
    currentIndexEl.textContent = currentIndex + 1;

    // Update ARIA labels for accessibility
    prevBtn.setAttribute(
      'aria-label',
      `Imagen anterior (${((currentIndex - 1 + landImages.length) % landImages.length) + 1})`
    );
    nextBtn.setAttribute(
      'aria-label',
      `Siguiente imagen (${((currentIndex + 1) % landImages.length) + 1})`
    );
  }

  /**
   * Preload adjacent images for smooth navigation
   */
  function preloadAdjacentImages() {
    const prevIndex = (currentIndex - 1 + landImages.length) % landImages.length;
    const nextIndex = (currentIndex + 1) % landImages.length;

    // Preload previous image
    const prevImg = new Image();
    prevImg.src = landImages[prevIndex];

    // Preload next image
    const nextImg = new Image();
    nextImg.src = landImages[nextIndex];
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeyPress(e) {
    if (!modal.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        closeModal();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        showPrevImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        showNextImage();
        break;
    }
  }

  /**
   * Handle touch start (swipe detection)
   */
  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
  }

  /**
   * Handle touch end (swipe detection)
   */
  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
  }

  /**
   * Detect swipe direction and navigate
   */
  function handleSwipeGesture() {
    const swipeThreshold = 50; // Minimum distance for swipe
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe right → previous image
        showPrevImage();
      } else {
        // Swipe left → next image
        showNextImage();
      }
    }
  }

  /**
   * Expose openModal globally for gallery buttons
   */
  window.GalleryModal = {
    open: openModal,
    close: closeModal
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
