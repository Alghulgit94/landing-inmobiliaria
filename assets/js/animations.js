/**
 * GSAP Animations - Inmobiliaria Mega Proyectos
 * Professional real estate website animations with accessibility support
 */

(function() {
  'use strict';

  // Animation configuration
  const ANIMATION_CONFIG = {
    // Timing
    fast: 0.3,
    normal: 0.6,
    slow: 1.2,
    
    // Easing
    ease: {
      smooth: "power2.out",
      elastic: "back.out(1.7)",
      bounce: "bounce.out",
      slide: "power3.out"
    },
    
    // Stagger timing
    stagger: {
      fast: 0.1,
      normal: 0.2,
      slow: 0.3
    }
  };

  // Check for reduced motion preference
  let prefersReducedMotion = false;
  
  /**
   * Initialize all animations when DOM is loaded
   */
  function initializeAnimations() {
    // Check for reduced motion preference
    prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Register GSAP plugins
    if (typeof gsap !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger, TextPlugin);
      
      // Set global animation defaults
      gsap.defaults({
        duration: prefersReducedMotion ? 0.01 : ANIMATION_CONFIG.normal,
        ease: ANIMATION_CONFIG.ease.smooth
      });
      
      // Initialize animations by section
      initHeaderAnimations();
      initHeroAnimations();
      initReasonsGridAnimations();
      initScrollTriggerAnimations();
      
      console.log('GSAP animations initialized successfully');
    } else {
      console.warn('GSAP library not loaded. Animations will be skipped.');
    }
  }

  /**
   * Header and Navigation Load Animations
   * NOTE: Header itself is NOT animated to preserve position: sticky behavior
   * Only child elements (logo, nav, buttons) are animated
   */
  function initHeaderAnimations() {
    if (prefersReducedMotion) return;

    const header = document.querySelector('.site-header');
    const logo = document.querySelector('.brand-logo');
    const navItems = document.querySelectorAll('.main-nav a');
    const langSelector = document.querySelector('.language-selector-wrapper');
    const ctaButton = document.querySelector('.header-right .cta');

    if (!header) return;

    // Initial state - hide child elements only (not header)
    // Using scale instead of y transform to avoid breaking sticky positioning
    gsap.set([logo, navItems, langSelector, ctaButton], {
      scale: 0.9,
      opacity: 0
    });

    // DO NOT animate header itself - transform breaks position: sticky
    // Header is visible immediately to ensure sticky behavior works

    // Create timeline for child elements entrance
    const headerTimeline = gsap.timeline({
      delay: 0.3
    });

    headerTimeline
      .to(logo, {
        scale: 1,
        opacity: 1,
        duration: ANIMATION_CONFIG.fast,
        ease: ANIMATION_CONFIG.ease.elastic
      })
      .to(navItems, {
        scale: 1,
        opacity: 1,
        duration: ANIMATION_CONFIG.fast,
        stagger: ANIMATION_CONFIG.stagger.fast,
        ease: ANIMATION_CONFIG.ease.smooth
      }, "-=0.2")
      .to([langSelector, ctaButton], {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.fast,
        stagger: ANIMATION_CONFIG.stagger.fast,
        ease: ANIMATION_CONFIG.ease.smooth
      }, "-=0.1");
    
    // Add hover animations for navigation
    navItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (!prefersReducedMotion) {
          gsap.to(item, {
            scale: 1.05,
            duration: ANIMATION_CONFIG.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
      
      item.addEventListener('mouseleave', () => {
        if (!prefersReducedMotion) {
          gsap.to(item, {
            scale: 1,
            duration: ANIMATION_CONFIG.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
    });
  }

  /**
   * Hero Section Entrance Animations
   */
  function initHeroAnimations() {
    if (prefersReducedMotion) return;
    
    const heroTitle = document.querySelector('.hero__title');
    const heroSubtitle = document.querySelector('.hero__subtitle');
    const heroDescription = document.querySelector('.hero__description');
    const heroButton = document.querySelector('.hero__cta');
    const heroOverlay = document.querySelector('.hero__overlay');
    
    if (!heroTitle) return;
    
    // Set initial states
    gsap.set([heroTitle, heroSubtitle, heroDescription], {
      y: 60,
      opacity: 0
    });
    
    gsap.set(heroButton, {
      scale: 0,
      opacity: 0
    });
    
    gsap.set(heroOverlay, {
      opacity: 0
    });
    
    // Create hero timeline
    const heroTimeline = gsap.timeline({
      delay: 1 // Wait for header animation
    });
    
    heroTimeline
      .to(heroOverlay, {
        opacity: 0.7,
        duration: ANIMATION_CONFIG.slow,
        ease: ANIMATION_CONFIG.ease.smooth
      })
      .to(heroTitle, {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        ease: ANIMATION_CONFIG.ease.slide
      }, "-=0.5")
      .to(heroSubtitle, {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        ease: ANIMATION_CONFIG.ease.slide
      }, "-=0.3")
      .to(heroDescription, {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        ease: ANIMATION_CONFIG.ease.slide
      }, "-=0.2")
      .to(heroButton, {
        scale: 1,
        opacity: 1,
        duration: ANIMATION_CONFIG.fast,
        ease: ANIMATION_CONFIG.ease.elastic
      }, "-=0.1");
    
    // Add button hover animation
    if (heroButton) {
      heroButton.addEventListener('mouseenter', () => {
        if (!prefersReducedMotion) {
          gsap.to(heroButton, {
            scale: 1.05,
            duration: ANIMATION_CONFIG.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
      
      heroButton.addEventListener('mouseleave', () => {
        if (!prefersReducedMotion) {
          gsap.to(heroButton, {
            scale: 1,
            duration: ANIMATION_CONFIG.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
    }
  }

  /**
   * Reasons Grid Animations (replaces carousel animations)
   */
  function initReasonsGridAnimations() {
    if (prefersReducedMotion) return;
    
    const reasonItems = document.querySelectorAll('.reason-item');
    
    if (reasonItems.length === 0) return;
    
    // Set up hover animations for each reason item
    reasonItems.forEach((item, index) => {
      const content = item.querySelector('.reason-item__content');
      const image = item.querySelector('.reason-item__image');
      const features = item.querySelectorAll('.reason-item__features li');
      
      // Hover enter animation
      item.addEventListener('mouseenter', () => {
        if (!prefersReducedMotion) {
          gsap.to(image, {
            scale: 1.05,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.smooth
          });
          
          gsap.to(features, {
            x: 5,
            duration: ANIMATION_CONFIG.fast,
            stagger: ANIMATION_CONFIG.stagger.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
      
      // Hover leave animation
      item.addEventListener('mouseleave', () => {
        if (!prefersReducedMotion) {
          gsap.to(image, {
            scale: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.smooth
          });
          
          gsap.to(features, {
            x: 0,
            duration: ANIMATION_CONFIG.fast,
            stagger: ANIMATION_CONFIG.stagger.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          });
        }
      });
    });
    
    // Keep the carousel transition function for backward compatibility
    // (in case other parts of the code still reference it)
    window.animateCarouselTransition = function(fromIndex, toIndex) {
      // Return a dummy timeline for compatibility
      const dummyTimeline = gsap.timeline();
      dummyTimeline.set({}, {duration: 0.01});
      return dummyTimeline;
    };
  }

  /**
   * Scroll-triggered animations for all sections
   */
  function initScrollTriggerAnimations() {
    if (prefersReducedMotion) return;
    
    // Why Live Here section entrance
    const whyLiveSection = document.getElementById('why-live-here');
    if (whyLiveSection) {
      const sectionTitle = whyLiveSection.querySelector('.section__title');
      const sectionSubtitle = whyLiveSection.querySelector('.section__subtitle');
      const reasonsGrid = whyLiveSection.querySelector('.reasons-grid');
      
      const reasonItems = whyLiveSection.querySelectorAll('.reason-item');
      
      gsap.set([sectionTitle, sectionSubtitle], {
        y: 50,
        opacity: 0
      });
      
      gsap.set(reasonItems, {
        y: 80,
        opacity: 0
      });
      
      // Animate section header
      gsap.to([sectionTitle, sectionSubtitle], {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        stagger: ANIMATION_CONFIG.stagger.normal,
        ease: ANIMATION_CONFIG.ease.slide,
        scrollTrigger: {
          trigger: whyLiveSection,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      });
      
      // Animate each reason item with stagger effect
      reasonItems.forEach((item, index) => {
        const content = item.querySelector('.reason-item__content');
        const image = item.querySelector('.reason-item__image');
        const features = item.querySelectorAll('.reason-item__features li');
        
        // Set initial states for item elements
        gsap.set(content, { x: item.classList.contains('reason-item--reverse') ? 50 : -50, opacity: 0 });
        gsap.set(image, { x: item.classList.contains('reason-item--reverse') ? -50 : 50, opacity: 0, scale: 0.9 });
        gsap.set(features, { y: 20, opacity: 0 });
        
        // Create timeline for this reason item
        const itemTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        });
        
        itemTimeline
          .to(item, {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.slide
          })
          .to(content, {
            x: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.slide
          }, "-=0.5")
          .to(image, {
            x: 0,
            opacity: 1,
            scale: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.slide
          }, "-=0.4")
          .to(features, {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.fast,
            stagger: ANIMATION_CONFIG.stagger.fast,
            ease: ANIMATION_CONFIG.ease.smooth
          }, "-=0.2");
      });
      
      // Why Live Here CTA animation
      const whyLiveCta = whyLiveSection.querySelector('.why-live-cta');
      if (whyLiveCta) {
        const ctaTitle = whyLiveCta.querySelector('.why-live-cta__title');
        const ctaDescription = whyLiveCta.querySelector('.why-live-cta__description');
        const ctaButton = whyLiveCta.querySelector('.why-live-cta__button');
        
        gsap.set([ctaTitle, ctaDescription, ctaButton], {
          y: 50,
          opacity: 0
        });
        
        const ctaTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: whyLiveCta,
            start: "top 90%",
            toggleActions: "play none none reverse"
          }
        });
        
        ctaTimeline
          .to(whyLiveCta, {
            opacity: 1,
            duration: ANIMATION_CONFIG.fast
          })
          .to(ctaTitle, {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.slide
          })
          .to(ctaDescription, {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.normal,
            ease: ANIMATION_CONFIG.ease.slide
          }, "-=0.3")
          .to(ctaButton, {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.fast,
            ease: ANIMATION_CONFIG.ease.elastic
          }, "-=0.2");
      }
    }
    
    // Loteamiento CTA section
    const loteamientoSection = document.getElementById('loteamiento');
    if (loteamientoSection) {
      const textContent = loteamientoSection.querySelector('.loteamiento-cta__text');
      const mediaContent = loteamientoSection.querySelector('.loteamiento-cta__media');
      const featureItems = loteamientoSection.querySelectorAll('.feature-item');
      
      gsap.set(textContent, { x: -100, opacity: 0 });
      gsap.set(mediaContent, { x: 100, opacity: 0 });
      gsap.set(featureItems, { y: 30, opacity: 0 });
      
      const loteamientoTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: loteamientoSection,
          start: "top 70%",
          end: "bottom 30%",
          toggleActions: "play none none reverse"
        }
      });
      
      loteamientoTimeline
        .to(textContent, {
          x: 0,
          opacity: 1,
          duration: ANIMATION_CONFIG.normal,
          ease: ANIMATION_CONFIG.ease.slide
        })
        .to(mediaContent, {
          x: 0,
          opacity: 1,
          duration: ANIMATION_CONFIG.normal,
          ease: ANIMATION_CONFIG.ease.slide
        }, "-=0.3")
        .to(featureItems, {
          y: 0,
          opacity: 1,
          duration: ANIMATION_CONFIG.fast,
          stagger: ANIMATION_CONFIG.stagger.fast,
          ease: ANIMATION_CONFIG.ease.smooth
        }, "-=0.2");
    }
    
    // About Us section with stats counter
    const aboutSection = document.getElementById('about-us');
    if (aboutSection) {
      const sectionTitle = aboutSection.querySelector('.section__title');
      const sectionSubtitle = aboutSection.querySelector('.section__subtitle');
      const valueItems = aboutSection.querySelectorAll('.value-item');
      const statNumbers = aboutSection.querySelectorAll('.stat-item__number');
      const aboutImage = aboutSection.querySelector('.about__team-image');
      
      // Set initial states
      gsap.set([sectionTitle, sectionSubtitle], { y: 50, opacity: 0 });
      gsap.set(valueItems, { y: 30, opacity: 0 });
      gsap.set(aboutImage, { scale: 0.8, opacity: 0 });
      
      // Section header animation
      gsap.to([sectionTitle, sectionSubtitle], {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        stagger: ANIMATION_CONFIG.stagger.normal,
        ease: ANIMATION_CONFIG.ease.slide,
        scrollTrigger: {
          trigger: aboutSection,
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      });
      
      // Value items animation
      gsap.to(valueItems, {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.fast,
        stagger: ANIMATION_CONFIG.stagger.fast,
        ease: ANIMATION_CONFIG.ease.smooth,
        scrollTrigger: {
          trigger: ".values-grid",
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      });
      
      // Stats counter animation
      statNumbers.forEach(statNumber => {
        const finalValue = statNumber.textContent.replace(/[^0-9]/g, '');
        if (finalValue) {
          const counter = { value: 0 };
          const suffix = statNumber.textContent.replace(/[0-9]/g, '');
          
          gsap.to(counter, {
            value: parseInt(finalValue),
            duration: ANIMATION_CONFIG.slow,
            ease: ANIMATION_CONFIG.ease.smooth,
            onUpdate: function() {
              statNumber.textContent = Math.round(counter.value) + suffix;
            },
            scrollTrigger: {
              trigger: statNumber,
              start: "top 85%",
              toggleActions: "play none none none"
            }
          });
        }
      });
      
      // About image animation
      if (aboutImage) {
        gsap.to(aboutImage, {
          scale: 1,
          opacity: 1,
          duration: ANIMATION_CONFIG.normal,
          ease: ANIMATION_CONFIG.ease.elastic,
          scrollTrigger: {
            trigger: aboutImage,
            start: "top 90%",
            toggleActions: "play none none reverse"
          }
        });
      }
    }
    
    // Footer animation
    const footer = document.querySelector('.site-footer');
    if (footer) {
      const footerSections = footer.querySelectorAll('.footer__section');
      const socialLinks = footer.querySelectorAll('.social-link');
      
      gsap.set(footerSections, { y: 50, opacity: 0 });
      
      gsap.to(footerSections, {
        y: 0,
        opacity: 1,
        duration: ANIMATION_CONFIG.normal,
        stagger: ANIMATION_CONFIG.stagger.normal,
        ease: ANIMATION_CONFIG.ease.slide,
        scrollTrigger: {
          trigger: footer,
          start: "top 90%",
          toggleActions: "play none none reverse"
        }
      });
      
      // Social links hover animation
      socialLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
          if (!prefersReducedMotion) {
            gsap.to(link, {
              y: -5,
              duration: ANIMATION_CONFIG.fast,
              ease: ANIMATION_CONFIG.ease.smooth
            });
          }
        });
        
        link.addEventListener('mouseleave', () => {
          if (!prefersReducedMotion) {
            gsap.to(link, {
              y: 0,
              duration: ANIMATION_CONFIG.fast,
              ease: ANIMATION_CONFIG.ease.smooth
            });
          }
        });
      });
    }
  }

  /**
   * Utility function to refresh ScrollTrigger (useful for dynamic content)
   */
  function refreshAnimations() {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }

  // Initialize animations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
  } else {
    initializeAnimations();
  }

  // Listen for reduced motion preference changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        // Kill all animations if user prefers reduced motion
        gsap.globalTimeline.clear();
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.killAll();
        }
      }
    });
  }

  // Export refresh function for external use
  window.refreshAnimations = refreshAnimations;

})();