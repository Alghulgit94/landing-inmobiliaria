/**
 * Hardcoded Product Data - Inmobiliaria Mega Proyectos
 * This file contains test data matching the DTO_Product structure
 * This will be replaced with real API calls in the future
 */

// Hardcoded products data matching DTO_Product structure
const PRODUCTS_DATA = [
  // Colonia Independencia Products
  {
    id: "ci_001",
    name: "Lote Premium Vista Norte",
    description: "Lote residencial en zona exclusiva con vista panorámica al norte. Perfecto para construcción de vivienda familiar de lujo.",
    photo: "https://picsum.photos/seed/lot1/400/300",
    location: "colonia-independencia",
    lat: -25.2637,
    long: -57.5759,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 450,
    features: ["Área verde cercana", "Cerca de colegios", "Zona residencial exclusiva"],
    dimensions: "15m x 30m"
  },
  {
    id: "ci_002",
    name: "Lote Comercial Centro",
    description: "Lote comercial estratégicamente ubicado en el centro de Colonia Independencia con acceso a avenida principal.",
    photo: "https://picsum.photos/seed/lot2/400/300",
    location: "colonia-independencia",
    lat: -25.2640,
    long: -57.5762,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 500,
    features: ["Avenida principal", "Zona comercial", "Alto tráfico"],
    dimensions: "20m x 25m"
  },
  {
    id: "ci_003",
    name: "Lote Familiar Los Robles",
    description: "Lote ideal para vivienda familiar con servicios completos y ambiente tranquilo en zona residencial consolidada.",
    photo: "https://picsum.photos/seed/lot3/400/300",
    location: "colonia-independencia",
    lat: -25.2635,
    long: -57.5755,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 420,
    features: ["Servicios completos", "Zona familiar", "Ambiente tranquilo"],
    dimensions: "12m x 35m"
  },
  {
    id: "ci_004",
    name: "Lote Agroindustrial Sur",
    description: "Amplio lote perfecto para desarrollo agroindustrial con acceso a recursos hídricos y excelente conectividad.",
    photo: "https://picsum.photos/seed/lot4/400/300",
    location: "colonia-independencia",
    lat: -25.2650,
    long: -57.5770,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 5000,
    features: ["Uso agroindustrial", "Acceso a agua", "Amplios espacios"],
    dimensions: "50m x 100m"
  },

  // Other Options Products
  {
    id: "ot_001",
    name: "Lote Metro Este",
    description: "Lote residencial en zona metropolitana con excelente conectividad urbana y acceso a transporte público.",
    photo: "https://picsum.photos/seed/lotother1/400/300",
    location: "other-options",
    lat: -25.2800,
    long: -57.6000,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 250,
    features: ["Transporte público", "Conectividad urbana", "Zona metropolitana"],
    dimensions: "10m x 25m"
  },
  {
    id: "ot_002",
    name: "Lote Brisa Mar",
    description: "Lote costero con vista panorámica al océano y brisa natural, perfecto para vivienda de descanso.",
    photo: "https://picsum.photos/seed/lotother2/400/300",
    location: "other-options",
    lat: -25.2900,
    long: -57.6100,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 720,
    features: ["Vista al mar", "Brisa natural", "Zona costera"],
    dimensions: "18m x 40m"
  },
  {
    id: "ot_003",
    name: "Lote Rural Norte",
    description: "Amplio lote rural ideal para desarrollo agrícola con abundante espacio y recursos naturales.",
    photo: "https://picsum.photos/seed/lotother3/400/300",
    location: "other-options",
    lat: -25.2700,
    long: -57.5900,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 15000,
    features: ["Uso agrícola", "Amplios espacios", "Recursos naturales"],
    dimensions: "100m x 150m"
  },
];

// Function to simulate API call with delay
function fetchProducts() {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve(PRODUCTS_DATA);
    }, 500);
  });
}

// Export for use in other modules
window.ProductsData = {
  PRODUCTS_DATA,
  fetchProducts
};