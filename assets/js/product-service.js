/**
 * Product Service - Inmobiliaria Mega Proyectos
 * Service layer for managing product data
 * This provides an abstraction that can be easily replaced with real API calls
 */

class ProductService {
  constructor() {
    this.products = [];
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Fetch all products
   * @returns {Promise<Array>} Array of products
   */
  async fetchProducts() {
    try {
      this.isLoading = true;
      this.error = null;

      // TODO: Replace with real API call
      // const response = await fetch('/api/products');
      // const products = await response.json();
      
      // For now, use hardcoded data
      const products = await window.ProductsData.fetchProducts();
      
      this.products = products;
      this.isLoading = false;
      
      return products;
    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get products filtered by location
   * @param {string} location - Location to filter by
   * @returns {Array} Filtered products
   */
  getProductsByLocation(location) {
    return this.products.filter(product => product.location === location);
  }

  /**
   * Get product by ID
   * @param {string} id - Product ID
   * @returns {Object|null} Product or null if not found
   */
  getProductById(id) {
    return this.products.find(product => product.id === id) || null;
  }

  /**
   * Get products by type
   * @param {string} type - Product type (lote, Barrio cerrado, Fraccion)
   * @returns {Array} Filtered products
   */
  getProductsByType(type) {
    return this.products.filter(product => product.type === type);
  }

  /**
   * Get all unique locations
   * @returns {Array} Array of unique locations
   */
  getUniqueLocations() {
    const locations = this.products.map(product => product.location);
    return [...new Set(locations)];
  }

  /**
   * Get all unique types
   * @returns {Array} Array of unique types
   */
  getUniqueTypes() {
    const types = this.products.map(product => product.type);
    return [...new Set(types)];
  }

  /**
   * Search products by name or description
   * @param {string} query - Search query
   * @returns {Array} Filtered products
   */
  searchProducts(query) {
    const searchTerm = query.toLowerCase();
    return this.products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get products with filters
   * @param {Object} filters - Filter options
   * @param {string} filters.location - Location filter
   * @param {string} filters.type - Type filter  
   * @param {number} filters.minSize - Minimum size in m2
   * @param {number} filters.maxSize - Maximum size in m2
   * @returns {Array} Filtered products
   */
  getFilteredProducts(filters = {}) {
    let filteredProducts = [...this.products];

    if (filters.location) {
      filteredProducts = filteredProducts.filter(p => p.location === filters.location);
    }

    if (filters.type) {
      filteredProducts = filteredProducts.filter(p => p.type === filters.type);
    }

    if (filters.minSize) {
      filteredProducts = filteredProducts.filter(p => p.total_dim_m2 >= filters.minSize);
    }

    if (filters.maxSize) {
      filteredProducts = filteredProducts.filter(p => p.total_dim_m2 <= filters.maxSize);
    }

    return filteredProducts;
  }

  /**
   * Get loading state
   * @returns {boolean} Loading state
   */
  getLoadingState() {
    return this.isLoading;
  }

  /**
   * Get error state
   * @returns {string|null} Error message or null
   */
  getError() {
    return this.error;
  }

  /**
   * Clear error state
   */
  clearError() {
    this.error = null;
  }

  /**
   * Refresh products (fetch again)
   * @returns {Promise<Array>} Array of products
   */
  async refreshProducts() {
    return await this.fetchProducts();
  }

  /**
   * Get products count by location
   * @returns {Object} Object with location counts
   */
  getProductCountsByLocation() {
    const counts = {};
    this.products.forEach(product => {
      counts[product.location] = (counts[product.location] || 0) + 1;
    });
    return counts;
  }
}

// Create singleton instance
const productService = new ProductService();

// Export for use in other modules
window.ProductService = productService;