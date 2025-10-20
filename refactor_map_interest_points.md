Add Interest Places Feature to Map View
Context
On the map view I need to add a new feature that displays interest points on the map by markers.

Requirements
1. Controls Menu Addition

Add a new checkbox control labeled "Interest Places" to the existing right-side controls menu
The checkbox should be checked by default when the map loads
Position it appropriately within the existing controls section

2. Database Integration

Fetch interest points data from the supabase db
The data is stored in the interest_points column
Each interest point should contain:

Name/label
Coordinates (latitude, longitude)
Any additional relevant metadata

3. Map Markers Display

When the checkbox is checked, display all interest points as markers on the map
Each marker should represent one interest point from the database
Markers should be visually distinct and clickable
When the checkbox is unchecked, remove all interest point markers from the map
The checkbox is checked by default

4. Interest Points List

Display a list of all interest points alongside the map
Each list item should show the point's name and coordinates
The list should be visible when the checkbox is checked
List items should be clickable/selectable

5. Route Drawing Feature

When a user clicks on an interest point (either marker or list item):

Draw a route/path line from the loteamiento coordinates to the selected interest point
This provides visual feedback about the distance between locations
Clear any previously drawn route when a new point is selected
Style the route line clearly (e.g., dashed line, distinct color)

6. State Management

Maintain the state of:

Checkbox checked/unchecked status
Currently selected interest point (if any)
Active route drawing


Ensure smooth toggling between showing/hiding markers and list

Technical Considerations

Use the project map lib methods for adding/removing markers
Optimize database queries for fetching interest points
Handle edge cases (no interest points available, invalid coordinates)
Ensure responsive design for the controls menu and list
Consider adding loading states while fetching data

7. Expected User Flow

User opens map view → Interest Places checkbox is checked by default
Map loads with all interest point markers visible
List of interest points is displayed in the controls menu
User clicks on an interest point → Route draws from loteamiento to point
User clicks another point → Previous route clears, new route draws
User unchecks checkbox → Markers and list hide, route clears
User checks checkbox again → Everything reappears

8. Files to Modify/Create
Please identify and modify the relevant files for:

Map view component
Controls menu component
Database query/API endpoint for interest_points
Marker management logic
Route drawing functionality
@mapa.html and related files should be covered

you can get help from @agents/frontend-architect.md
the loteamiento json format is:
```json
{
  "interest_points": [
    {
      "id": 1,
      "name": "Coro Polifónico Independencia",
      "latitude": -25.69759688493059,
      "longitude": -56.1781185229467,
      "coordinates": {
        "lat": -25.69759688493059,
        "lng": -56.1781185229467
      }
    },
    {
      "id": 2,
      "name": "Super Almacén 50",
      "latitude": -25.7096615663765,
      "longitude": -56.18206673461658,
      "coordinates": {
        "lat": -25.7096615663765,
        "lng": -56.18206673461658
      }
    },
    {
      "id": 3,
      "name": "Colegio San Bonifacio",
      "latitude": -25.6952223762762,
      "longitude": -56.16662570367225,
      "coordinates": {
        "lat": -25.6952223762762,
        "lng": -56.16662570367225
      }
    },
    {
      "id": 4,
      "name": "Planta Urbana",
      "latitude": -25.70480608865481,
      "longitude": -56.18067216973634,
      "coordinates": {
        "lat": -25.70480608865481,
        "lng": -56.18067216973634
      }
    },
    {
      "id": 5,
      "name": "Club Deportivo Aleman",
      "latitude": -25.732025576688933,
      "longitude": -56.19354677300774,
      "coordinates": {
        "lat": -25.732025576688933,
        "lng": -56.19354677300774
      }
    }
  ]
}

```
