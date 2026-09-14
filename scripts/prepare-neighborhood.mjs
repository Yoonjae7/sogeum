import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('dist/data/corridor.json'));
const centroid=points=>points.slice(0,-1).reduce((p,c)=>[p[0]+c[0]/(points.length-1),p[1]+c[1]/(points.length-1)],[0,0]);
const complexes=data.features.filter(f=>f.tags.landuse==='residential'&&/^하안주공/.test(f.tags.name||'')).map(f=>({id:f.id,name:f.tags.name,coord:centroid(f.points),points:f.points}));
const church={name:'광명교회',coord:[126.872499,37.4729575],address:'경기도 광명시 하안로 437',source:'http://kmchurch.kr/main/sub.html?pageCode=12',coordinateSource:'https://t1.daumcdn.net/roughmap/27jr9.json',note:'Official church map marker, WCONGNAMUL / 2.5 converted from EPSG:5181 to WGS84. Building envelope and facade are illustrative, not surveyed.'};
fs.writeFileSync('dist/data/neighborhood.json',JSON.stringify({church,complexes},null,0));
console.log(`${complexes.length} Haan Jugong complexes, official church location`);
