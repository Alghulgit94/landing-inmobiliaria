# MVP Inmobiliaria v2

A modern real estate website featuring interactive maps and multilingual support for property lot visualization and sales.

## Features

### 🏠 Core Functionality
- **Interactive Property Maps**: High-precision maps using Leaflet.js for visualizing property lots
- **Multilingual Support**: Available in Spanish (ES), English (EN), and German (DE)
- **Responsive Design**: Mobile-first approach with modern CSS3 and HTML5
- **Property Visualization**: KML file support for detailed lot boundaries and information

### 🌍 Internationalization
- Dynamic language switching with real-time content updates
- Comprehensive translation system covering:
  - Navigation elements
  - Property descriptions
  - User interface labels
  - Accessibility labels

### 🗺️ Interactive Maps
- **Satellite View**: Toggle between standard and satellite imagery
- **Lot Details**: Click on individual lots for detailed information
- **KML Integration**: Support for precise lot boundary visualization
- **Multiple Map Styles**: Standard and grayscale view options

### 🎨 User Experience
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Carousel Components**: Interactive property showcase with navigation controls
- **Video Backgrounds**: Engaging hero section with video content
- **Accessibility**: Full ARIA support and semantic HTML structure

## Project Structure

```
mvp_inmobiliaria_v2/
├── assets/
│   ├── css/
│   │   └── index.css           # Main stylesheet
│   ├── js/
│   │   ├── dashboard.js        # Dashboard functionality
│   │   ├── i18n.js            # Internationalization logic
│   │   ├── index.js           # Homepage carousel and interactions
│   │   └── mapa.js            # Interactive map functionality
│   ├── videos/
│   │   └── hero-bg.mp4        # Hero section background video
│   └── loteo.kml              # Property lot boundaries data
├── locales/
│   ├── es.json                # Spanish translations
│   ├── en.json                # English translations
│   └── de.json                # German translations
├── index.html                 # Homepage
├── mapa.html                 # Interactive map page
└── README.md                 # Project documentation
```

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mapping**: [Leaflet.js](https://leafletjs.com/) for interactive maps
- **Geospatial Data**: KML file format for lot boundaries
- **Internationalization**: Custom JSON-based translation system
- **Media**: HTML5 video for background content
- **Icons**: Emoji-based icon system for cross-platform compatibility

## Key Pages

### Homepage (`index.html`)
- Hero section with video background
- Interactive carousel showcasing property benefits
- Company information and values
- Call-to-action sections for map exploration
- Complete contact information

### Interactive Map (`mapa.html`)
- Full-screen map interface using Leaflet.js
- KML overlay for property lot visualization
- Map controls (satellite/standard view, grayscale toggle)
- Lot selection and information display

## Features by Section

### 🏡 Property Showcase
- **Strategic Location**: Proximity to shopping centers, schools, and hospitals
- **Complete Infrastructure**: Paved streets, utilities, and modern amenities
- **Quality of Life**: Green spaces, recreational areas, and family facilities
- **Investment Value**: Growing market with 15% annual appreciation

### 🛠️ Technical Features
- Responsive carousel with touch/swipe support
- Smooth CSS transitions and animations
- Cross-browser compatibility
- Mobile-optimized interface
- SEO-friendly structure with semantic HTML

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

This is a static website that can be served directly from any web server. No build process or dependencies are required beyond the external CDN resources for Leaflet.js.

### Local Development
1. Clone or download the project files
2. Serve the files through a local web server
3. Open `index.html` in your browser

### External Dependencies
- Leaflet.js (CDN): Interactive mapping functionality
- ToGeoJSON (CDN): KML file processing

## License

© 2025 Inmobiliaria Mega Proyectos. All rights reserved.

---

*Developed with high-precision mapping technology for superior real estate visualization.*