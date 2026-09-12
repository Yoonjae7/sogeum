# Korea atlas map assets

All files are under `/tmp/korea-atlas-assets` (the same directory is `/private/tmp/korea-atlas-assets` on macOS). Downloaded September 13, 2026 local time. The normalized files can be served directly as static assets; no API key or live map service is required.

## Ready-to-use files

| File | Buildings | Road lines | Other mapped geometry |
| --- | ---: | ---: | --- |
| `jonggak.json` | 300 | 200 | 5 water features, including Cheonggye Stream |
| `gangnam.json` | 300 | 200 | — |
| `cheolsan.json` | 289 | 177 | — |
| `gasan.json` | 300 | 157 | 1 water feature |
| `haeundae.json` | 300 | 140 | 4 coastline fragments and Haeundae Beach polygon |
| `busan.json` | 281 | 169 | 1 water feature |
| `world-countries-slim.geojson` | — | — | Natural Earth 1:110m countries, 177 features |

Each neighborhood uses `{metadata,buildings,roads,water,coastline,beaches}`. Geometry is WGS84 decimal degrees with coordinate order **[longitude,latitude]**. The supplied center is `metadata.center`. Query radius is 600 meters; roads and coastline are clipped to a square 650 meters either side of the center. Buildings are selected from mapped closed OSM building ways, excluding explicitly underground structures, negative building layers, zero aboveground floor counts, and basement-only levels, then limited to 300 by area with a mild center preference. Up to 200 road lines remain after connecting contiguous fragments with matching names and types. This is a curated illustrative sample of mapped features, not complete survey coverage. Surface roads omit known tunnels, indoor paths, platforms, and construction. Beach polygons retain their mapped extent and may exceed the 650 m square.

Building fields include `points`, `height` in meters, `heightSource`, `osmId`, `type`, and `area` in square meters; named features also have `name` and sometimes `nameEn`. `heightSource` is `osm-height` for tagged meter heights, `estimated-from-osm-levels` for tagged floor counts × 3.2 m, or `illustrative-default` for a simple default based on building use. **Footprints/streets are real mapped geometry; many heights are estimated.**

Roads have `points`, the OSM highway class in `type`, and an `osmId` identifying the retained source way (a line may join multiple contiguous source way fragments). Water has `type: "line"` or `"polygon"`; line features may include `waterway`. `coastline` is line geometry and `beaches` is polygon geometry. Building rings are closed. Inner rings and relation-only buildings are not included.

Country features use standard GeoJSON Polygon/MultiPolygon geometry and properties `{name,nameKo,isoA2,isoA3}`. Country coordinate precision is reduced to five decimal places. The source 110m geography is suitable for a world overview; it is intentionally coarse at neighborhood zoom.

## Data attribution and sources

Neighborhood geometry is **© OpenStreetMap contributors**, provided under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Display [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright) on the map. These normalized JSON databases are also made available under ODbL 1.0. API endpoint used: [Overpass API](https://overpass-api.de/api/interpreter). Each file records its upstream OSM timestamp in `metadata.osmTimestamp`. Original response files are preserved as `*-raw.json`, and the normalization script is `normalize.py`.

World country geometry is [Natural Earth](https://www.naturalearthdata.com/), whose map data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Source file: [ne_110m_admin_0_countries.geojson in the official Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Optional credit: “Made with Natural Earth.” Original response retained as `world-countries.geojson`.

## Official neighborhood and landmark context

The six requested numeric centers were retained as supplied. The official sources below verify place names, local context, and addresses; they are not claimed to certify the precise input coordinates.

- **Jonggak / 종각** — Center [126.9831,37.5702]. Korea Tourism Organization identifies Bosingak Belfry as also known as Jonggak and gives 54 Jong-ro, Jongno-gu, Seoul. The bell pavilion is the local historical landmark. [KTO Bosingak](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=111240).
- **Gangnam / 강남** — Center [127.0276,37.4979]. Gangnam-gu locates the station area on Gangnam-daero and describes the street between Gangnam and Sinnonhyeon stations, shopping, and the performance plaza near exit 11. [Gangnam-gu official attraction page](https://www.gangnam.go.kr/global/board/attractions_en/6/view.do?mid=GEM0202&pgno=1).
- **Cheolsan / 철산** — Center [126.8683,37.4760]. Gwangmyeong City identifies the commercial area around Line 7 Cheolsan Station in Cheolsan 3-dong, with shops and a central performance plaza. Cheolsan is in **Gwangmyeong, Gyeonggi-do**, not Seoul proper. [Gwangmyeong official Cheolsan commercial district page](https://www.gm.go.kr/tour/tourInfo/fas/food/food02.jsp).
- **Gasan Digital Complex / 가산디지털단지** — Center [126.8825,37.4811]. Geumcheon-gu's official tourist map identifies Gasan Digital Complex Station and its address at 309 Beotkkot-ro; its district map labels the Line 1 and Line 7 station entrances and Gasan Digital Complex. [Official tourist map](https://www.geumcheon.go.kr/site/portal/down/cts3723_file02.pdf), [official Gasan district map](https://www.geumcheon.go.kr/site/portal/down/cts406_file02.pdf).
- **Haeundae / 해운대** — Center [129.1604,35.1587]. KTO gives Haeundae Beach's address as 264 Haeundaehaebyeon-ro, Haeundae-gu, Busan, and describes a beach about 1.5 km long. The supplied center is in the beach area, so the beach/coast geometry is useful for this view. [KTO Haeundae Beach](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=111053).
- **Busan City Hall / 부산시청** — Center [129.0756,35.1796]. This point corresponds to the city hall area in **Yeonje-gu**. The city government locates City Hall at 1001 Jungang-daero and states it is connected to Line 1 City Hall Station. Label this destination “Busan City Hall” rather than implying the old harbor downtown. [Busan Metropolitan City directions](https://www.busan.go.kr/eng/bsorganiz02).


## Underground audit and landmark reservations

The six raw extracts were checked for underground locations, negative layers, zero aboveground floor counts, basement-only levels, tunnel tags, and underground-name clues. One whole building was incorrectly included: Gangnam Station Underground Shopping Center, OSM way 305923846, tagged `location=underground`, `layer=-1`, and `tunnel=yes`. It is now excluded from `gangnam.json`; the next eligible footprint (way 509535468) fills its former slot. Gangnam remains at 300 footprints. No other neighborhood JSON changed in this audit. Towers with positive aboveground floors and separate `building:levels:underground` basement counts remain correctly included. Mixed `level=-1;1;2;3;4` is not treated as an entirely underground building. The normalizer now applies these checks to future runs.

Negative road layers alone can identify lower outdoor streets or streamside paths and are not sufficient evidence that a road is enclosed below ground. Known road tunnels/underground locations already remain excluded.

`landmark-reservations.json` identifies generic footprints to reserve if a custom model replaces them: Bosingak's likely pavilion footprint (unnamed OSM way 708772637, address 54, inside the historical-site outline), Jongno Tower (1206228046), Busan City Hall (468977727), and optional adjacent civic-campus buildings. It contains the original footprints and accurate footprint centers for positioning; the Bosingak historical-site centroid is about 24 m west of the pavilion-footprint center.
