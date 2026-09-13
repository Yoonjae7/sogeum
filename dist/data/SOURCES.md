# Map sources

- `corridor.json`: OpenStreetMap contributors, queried September 13, 2026 through the Overpass API. Geographic bounds: 126.858–126.892° E, 37.469–37.492° N. Public data licensed under ODbL 1.0: https://www.openstreetmap.org/copyright
- `korea.geojson`: Natural Earth 1:10m Admin 0 countries, South Korea geometry. Public domain. https://www.naturalearthdata.com/ and https://github.com/nvkelso/natural-earth-vector

The map uses geographic coordinates for building footprints, road centerlines, railways, water boundaries, land use and parks. Building heights use OSM `height` or `building:levels` tags when present; otherwise heights are estimated by building type. Horizontal and vertical distance use the same scale. Facades, rooftop details, vegetation placement, road widths where untagged, and national relief are illustrative, not surveyed or photogrammetric reconstructions. Vehicles and trains are decorative animations, not live traffic.

Sun position is calculated from the current UTC date and the neighborhood's latitude and longitude. The clock displays Asia/Seoul time. There is no adjustable time control.

`scripts/prepare-map.mjs` clips public Overpass JSON snapshots to the neighborhood bounds and produces the bundled offline map asset. Rendering does not require third-party map API keys or live Overpass availability.
