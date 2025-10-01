# Supabase Integration Setup Guide

This guide explains how to configure and use the Supabase integration for the Inmobiliaria Mega Proyectos application.

## Prerequisites

1. A Supabase account (create one at https://supabase.com)
2. A Supabase project with the required database tables

## Database Schema

Your Supabase project needs the following tables:

### 1. `loteamiento` Table

```sql
CREATE TABLE loteamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  photo TEXT,
  owner TEXT,  -- Use "MEGA" for Colonia Independencia location
  centroid_lat DECIMAL(10, 6),
  centroid_long DECIMAL(10, 6),
  geojson JSONB,  -- GeoJSON for loteamiento boundary
  total_dim_m2 DECIMAL(12, 2),
  parcel_quantity INTEGER DEFAULT 0,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `lote` Table

```sql
CREATE TABLE lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loteamiento_id UUID REFERENCES loteamiento(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estado TEXT DEFAULT 'disponible',  -- Values: 'disponible', 'reservado', 'vendido'
  geojson JSONB,  -- GeoJSON for lote polygon
  area DECIMAL(10, 2),
  precio DECIMAL(15, 2),
  largo DECIMAL(8, 2),
  ancho DECIMAL(8, 2),
  dimensions TEXT,
  description TEXT,
  photo TEXT,
  notes TEXT,
  centroid_lat DECIMAL(10, 6),
  centroid_long DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_lote_loteamiento_id ON lote(loteamiento_id);
CREATE INDEX idx_lote_estado ON lote(estado);
```

## Configuration Steps

### Step 1: Get Supabase Credentials

1. Log in to your Supabase dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (this is safe to use in the browser)

### Step 2: Configure the Application

Open `assets/js/supabase-client.js` and update the configuration:

```javascript
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',  // Replace with your Project URL
  anonKey: 'YOUR_SUPABASE_ANON_KEY'  // Replace with your anon key
};
```

**Example:**
```javascript
const SUPABASE_CONFIG = {
  url: 'https://abcdefghijklmnop.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

### Step 3: Set Up Row Level Security (RLS)

For public read access, configure RLS policies:

```sql
-- Enable RLS
ALTER TABLE loteamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Enable read access for all users" ON loteamiento
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON lote
  FOR SELECT USING (true);
```

## Data Structure

### Location Mapping

The `owner` field in the `loteamiento` table determines the location category:

- `owner = "MEGA"` → Displayed in "Colonia Independencia" section
- `owner != "MEGA"` → Displayed in "Otras Opciones" section

### Estado (Status) Values

The `estado` field in the `lote` table must use these exact values:

- `"disponible"` - Available parcels (green on map)
- `"reservado"` - Reserved parcels (yellow on map)
- `"vendido"` - Sold parcels (red on map)

### GeoJSON Format

Both `geojson` fields should contain valid GeoJSON Feature or Geometry objects:

**Example for loteamiento boundary:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-56.174242, -25.695804],
      [-56.174000, -25.695804],
      [-56.174000, -25.696000],
      [-56.174242, -25.696000],
      [-56.174242, -25.695804]
    ]]
  },
  "properties": {
    "name": "Loteamiento Example"
  }
}
```

**Example for lote polygon:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-56.174200, -25.695850],
      [-56.174150, -25.695850],
      [-56.174150, -25.695900],
      [-56.174200, -25.695900],
      [-56.174200, -25.695850]
    ]]
  },
  "properties": {
    "name": "Lote 1"
  }
}
```

## Testing the Integration

### 1. Test Database Connection

Open the browser console and run:

```javascript
await SupabaseClient.testConnection();
```

If successful, you'll see: `✓ Database connection test successful`

### 2. Test Loteamiento Service

```javascript
const loteamientos = await LoteamientoService.fetchAll();
console.log('Loteamientos:', loteamientos);
```

### 3. Test Lote Service

```javascript
const lotes = await LoteService.fetchByLoteamiento('your-loteamiento-id');
console.log('Lotes:', lotes);
```

## Fallback Mechanism

The application includes a fallback to hardcoded data if Supabase is not configured or unavailable:

1. **Supabase configured and working** → Uses live database
2. **Supabase configured but fails** → Falls back to `products-data.js`
3. **Supabase not configured** → Uses `products-data.js`

This ensures the application continues to work during development or if there are connectivity issues.

## Navigation Flow

### Index Page (index.html)

1. Loads loteamientos from Supabase
2. Displays them in product cards
3. Each card stores loteamiento metadata in data attributes
4. "Ver en Mapa" button navigates to: `mapa.html?loteamiento={id}&name={name}&lat={lat}&lng={lng}`

### Map Page (mapa.html)

1. Checks for URL parameters
2. If parameters exist:
   - Fetches loteamiento details from Supabase
   - Fetches lotes for that loteamiento
   - Renders boundary polygon
   - Renders individual lotes with estado-based colors
3. If no parameters:
   - Falls back to loading KML file (backward compatibility)

## Troubleshooting

### Problem: "Supabase client not initialized"

**Solution:** Check that:
1. Supabase credentials are correctly set in `supabase-client.js`
2. Supabase JS library loaded before `supabase-client.js`
3. No browser console errors blocking script execution

### Problem: "Database connection test failed"

**Solution:** Verify:
1. Supabase URL and anon key are correct
2. RLS policies allow public read access
3. Tables `loteamiento` and `lote` exist
4. Network connection to Supabase is working

### Problem: No loteamientos displayed

**Solution:** Check:
1. Database has records in `loteamiento` table
2. Browser console for error messages
3. Network tab shows successful API calls to Supabase

### Problem: Map shows no lotes

**Solution:** Verify:
1. Lotes in database have valid `geojson` field
2. `loteamiento_id` in lotes matches the selected loteamiento
3. `estado` field contains valid values (disponible/reservado/vendido)

## Performance Considerations

### Caching

- LoteamientoService caches data for 5 minutes
- LoteService caches lotes per loteamiento
- Call `clearCache()` to force refresh

### Data Volume

- Recommended: < 100 loteamientos total
- Recommended: < 500 lotes per loteamiento
- For larger datasets, consider pagination

## Security Notes

⚠️ **Important Security Guidelines:**

1. **Never commit credentials to git**
   - Add `supabase-client.js` to `.gitignore` after configuration
   - Use environment variables in production

2. **Use RLS policies**
   - Always enable Row Level Security
   - Limit read access to necessary tables only

3. **anon key is public**
   - The anon key is safe for browser use
   - It respects RLS policies
   - Never use service role key in browser code

## Next Steps

1. Configure Supabase credentials in `supabase-client.js`
2. Create database tables with provided SQL
3. Insert sample data to test
4. Test the integration using browser console
5. Deploy and monitor

## Support

For issues with:
- **Supabase setup**: Check [Supabase Documentation](https://supabase.com/docs)
- **Application integration**: Review browser console errors and this guide
- **GeoJSON format**: Use [geojson.io](https://geojson.io) to validate

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
