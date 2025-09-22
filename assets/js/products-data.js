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
  {
    id: "ci_005",
    name: "Lote Valle Verde",
    description: "Lote residencial con vista panorámica al valle, ideal para construcción de vivienda con paisaje natural.",
    photo: "https://picsum.photos/seed/lot5/400/300",
    location: "colonia-independencia",
    lat: -25.2630,
    long: -57.5750,
    type: "lote", 
    parcel_quantity: 1,
    total_dim_m2: 450,
    features: ["Vista al valle", "Paisaje natural", "Zona tranquila"],
    dimensions: "18m x 25m"
  },
  {
    id: "ci_006",
    name: "Lote Industrial Pro",
    description: "Lote destinado para uso industrial con excelente acceso carretero y zonificación apropiada.",
    photo: "https://picsum.photos/seed/lot6/400/300",
    location: "colonia-independencia",
    lat: -25.2645,
    long: -57.5765,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 1200,
    features: ["Zona industrial", "Acceso carretero", "Zonificación industrial"],
    dimensions: "30m x 40m"
  },
  {
    id: "ci_007",
    name: "Lote Club Exclusivo",
    description: "Lote exclusivo ubicado cerca del prestigioso club alemán, ideal para familias que buscan estilo de vida premium.",
    photo: "https://picsum.photos/seed/lot7/400/300",
    location: "colonia-independencia",
    lat: -25.2632,
    long: -57.5752,
    type: "lote",
    parcel_quantity: 1, 
    total_dim_m2: 448,
    features: ["Zona exclusiva", "Cerca del club alemán", "Estilo premium"],
    dimensions: "16m x 28m"
  },
  {
    id: "ci_008",
    name: "Lote Esquinero Plus",
    description: "Lote esquinero con doble frente que ofrece múltiples posibilidades de desarrollo y excelente visibilidad.",
    photo: "https://picsum.photos/seed/lot8/400/300",
    location: "colonia-independencia",
    lat: -25.2638,
    long: -57.5758,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 440,
    features: ["Esquina privilegiada", "Doble frente", "Alta visibilidad"],
    dimensions: "20m x 22m"
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
  {
    id: "ot_004",
    name: "Lote Urbano Plus", 
    description: "Lote urbano moderno con todos los servicios completos y excelente ubicación en zona consolidada.",
    photo: "https://picsum.photos/seed/lotother4/400/300",
    location: "other-options",
    lat: -25.2750,
    long: -57.5950,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 360,
    features: ["Zona urbana", "Servicios completos", "Ubicación central"],
    dimensions: "12m x 30m"
  },
  {
    id: "ot_005",
    name: "Lote Comercial Sur",
    description: "Lote comercial estratégico en zona de alto tráfico vehicular, ideal para negocios y comercios.",
    photo: "https://picsum.photos/seed/lotother5/400/300",
    location: "other-options",
    lat: -25.2850,
    long: -57.6050,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 300,
    features: ["Zona comercial", "Alto tráfico vehicular", "Ubicación estratégica"],
    dimensions: "15m x 20m"
  },
  {
    id: "ot_006",
    name: "Lote Vista Montaña",
    description: "Lote residencial premium con vista panorámica a las montañas, ideal para vivienda de lujo.",
    photo: "https://picsum.photos/seed/lotother6/400/300",
    location: "other-options",
    lat: -25.2720,
    long: -57.5920,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 770,
    features: ["Vista a montañas", "Premium residencial", "Paisaje natural"],
    dimensions: "22m x 35m"
  },
  {
    id: "ot_007",
    name: "Lote Eco Premium",
    description: "Lote ecológico con certificación ambiental, ideal para desarrollo sustentable y eco-friendly.",
    photo: "https://picsum.photos/seed/lotother7/400/300",
    location: "other-options",
    lat: -25.2780,
    long: -57.5980,
    type: "lote",
    parcel_quantity: 1,
    total_dim_m2: 750,
    features: ["Eco-friendly", "Certificado ecológico", "Desarrollo sustentable"],
    dimensions: "25m x 30m"
  }
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