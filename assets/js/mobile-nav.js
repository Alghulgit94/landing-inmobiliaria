/**
 * Mobile Navigation - Sidebar Toggle
 * Handles hamburger menu and sidebar navigation for mobile/tablet screens
 */

(function () {
  'use strict';

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function () {
    // Get elements
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    // Get language elements (desktop selector and mobile chips)
    const languageSelectorDesktop = document.getElementById('language-selector');
    const languageChips = document.querySelectorAll('.language-chip');

    // Function to open sidebar
    function openSidebar() {
      mobileSidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      hamburgerMenu.classList.add('active');
      mobileSidebar.setAttribute('aria-hidden', 'false');
      hamburgerMenu.setAttribute('aria-expanded', 'true');

      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    }

    // Function to close sidebar
    function closeSidebar() {
      mobileSidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      hamburgerMenu.classList.remove('active');
      mobileSidebar.setAttribute('aria-hidden', 'true');
      hamburgerMenu.setAttribute('aria-expanded', 'false');

      // Restore body scroll
      document.body.style.overflow = '';
    }

    // Hamburger menu click event
    if (hamburgerMenu) {
      hamburgerMenu.addEventListener('click', function () {
        const isOpen = mobileSidebar.classList.contains('active');
        if (isOpen) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    // Close button click event
    if (sidebarClose) {
      sidebarClose.addEventListener('click', closeSidebar);
    }

    // Overlay click event (close sidebar when clicking outside)
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when clicking any navigation link
    if (sidebarLinks.length > 0) {
      sidebarLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          // Close sidebar with a small delay for better UX
          setTimeout(closeSidebar, 200);
        });
      });
    }

    // Keyboard accessibility - close sidebar on ESC key
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileSidebar.classList.contains('active')) {
        closeSidebar();
      }
    });

    // Initialize language chip states based on desktop selector
    function updateLanguageChips() {
      if (!languageSelectorDesktop) return;

      const currentLang = languageSelectorDesktop.value;
      languageChips.forEach(function (chip) {
        const chipLang = chip.getAttribute('data-lang');
        if (chipLang === currentLang) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    // Handle language chip clicks
    if (languageChips.length > 0) {
      languageChips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          const selectedLang = this.getAttribute('data-lang');

          // Update desktop selector
          if (languageSelectorDesktop) {
            languageSelectorDesktop.value = selectedLang;

            // Trigger change event on desktop selector to update i18n
            const changeEvent = new Event('change', { bubbles: true });
            languageSelectorDesktop.dispatchEvent(changeEvent);
          }

          // Update chip states
          updateLanguageChips();
        });
      });
    }

    // Listen to desktop selector changes and update chips
    if (languageSelectorDesktop) {
      languageSelectorDesktop.addEventListener('change', updateLanguageChips);

      // Initialize chips on load
      updateLanguageChips();
    }

    // Handle window resize - close sidebar if resizing to desktop view
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // Close sidebar if window is resized above 1024px (desktop view)
        if (window.innerWidth > 1024 && mobileSidebar.classList.contains('active')) {
          closeSidebar();
        }
      }, 250);
    });
  });
})();
