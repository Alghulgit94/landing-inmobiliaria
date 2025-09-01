// Dashboard JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    
    // Navigation dropdowns
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.querySelector('.dropdown-icon')) {
                e.preventDefault();
                // Add dropdown functionality here if needed
                console.log('Dropdown clicked:', this.textContent.trim());
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    searchBtn.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            console.log('Searching for:', searchTerm);
            // Add search logic here
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // Filter buttons in hero section
    const heroFilterBtns = document.querySelectorAll('.filter-btn');
    heroFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            heroFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            console.log('Hero filter selected:', this.textContent.trim());
        });
    });

    // Filter buttons in featured properties section
    const propertyFilterBtns = document.querySelectorAll('.filter-item');
    propertyFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            propertyFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filterType = this.textContent.trim();
            console.log('Property filter selected:', filterType);
            
            // Filter properties based on selection
            filterProperties(filterType);
        });
    });

    // Property filtering function
    function filterProperties(filterType) {
        const propertyCards = document.querySelectorAll('.property-card');
        
        propertyCards.forEach(card => {
            if (filterType === 'All') {
                card.style.display = 'block';
            } else {
                // In a real implementation, you would check the property type
                // For now, we'll show all properties
                card.style.display = 'block';
            }
        });
        
        // Add animation
        propertyCards.forEach((card, index) => {
            card.style.animation = 'none';
            setTimeout(() => {
                card.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
            }, 10);
        });
    }

    // Property card hover effects and clicks
    const propertyCards = document.querySelectorAll('.property-card');
    propertyCards.forEach(card => {
        card.addEventListener('click', function() {
            const propertyTitle = this.querySelector('.property-title').textContent;
            console.log('Property clicked:', propertyTitle);
            // Add navigation to property details page
        });
    });

    // View More button
    const viewMoreBtn = document.querySelector('.view-more-btn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', function() {
            console.log('View More clicked');
            // Add logic to load more properties
        });
    }

    // Market tags
    const marketTags = document.querySelectorAll('.market-tag');
    marketTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const location = this.textContent.trim();
            console.log('Market selected:', location);
            // Add logic to filter by location
        });
    });

    // Team member clicks
    const teamMembers = document.querySelectorAll('.team-member');
    teamMembers.forEach(member => {
        member.addEventListener('click', function() {
            const memberName = this.querySelector('.member-name').textContent;
            console.log('Team member clicked:', memberName);
            // Add logic to show member details
        });
    });

    // Scroll to top functionality
    const scrollToTopBtn = document.getElementById('scrollToTop');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });

    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add Property button
    const addPropertyBtn = document.querySelector('.add-property-btn');
    if (addPropertyBtn) {
        addPropertyBtn.addEventListener('click', function() {
            console.log('Add Property clicked');
            // Add logic to show add property form/page
        });
    }

    // Phone number click
    const phoneNumber = document.querySelector('.phone-number');
    if (phoneNumber) {
        phoneNumber.addEventListener('click', function() {
            const phone = this.textContent.trim();
            window.location.href = `tel:${phone.replace(/\s/g, '')}`;
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.nav-header');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });

    // Add loading states for buttons
    function addLoadingState(button, duration = 2000) {
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, duration);
    }

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .property-card, .stat-item, .step, .team-member');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero-section');
        if (parallax) {
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        }
    });

    // Stats counter animation
    function animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const finalValue = parseInt(stat.textContent.replace(/\D/g, ''));
            const duration = 2000;
            const increment = finalValue / (duration / 16);
            let currentValue = 0;
            
            const counter = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    currentValue = finalValue;
                    clearInterval(counter);
                }
                
                const suffix = stat.textContent.includes('+') ? '+' : '';
                stat.textContent = Math.floor(currentValue) + suffix;
            }, 16);
        });
    }

    // Trigger stats animation when section is visible
    const statsSection = document.querySelector('.statistics-section');
    if (statsSection) {
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStats();
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        statsObserver.observe(statsSection);
    }

    console.log('Dashboard JavaScript loaded successfully');
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .animate-in {
        animation: fadeInUp 0.8s ease both;
    }

    .nav-header {
        transition: transform 0.3s ease;
    }

    .property-card,
    .feature-card,
    .team-member {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.3s ease;
    }

    .animate-in.property-card,
    .animate-in.feature-card,
    .animate-in.team-member {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);