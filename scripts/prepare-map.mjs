import fs from 'node:fs';

// Public OSM snapshots; all coordinates remain longitude/latitude in the asset.
const input = JSON.parse(fs.readFileSync(process.argv[2]));
const extra = JSON.parse(fs.readFileSync(process.argv[3]));
const bounds = [126.858, 37.469, 126.892, 37.492];
function clipPolygon(points) {
  let out = points;
  for (const [axis, edge, greater] of [[0,bounds[0],true],[0,bounds[2],false],[1,bounds[1],true],[1,bounds[3],false]]) {
    const src=out; out=[];
    for(let i=0;i<src.length;i++) {
      const a=src[i], b=src[(i+1)%src.length];
      const ia=greater?a[axis]>=edge:a[axis]<=edge, ib=greater?b[axis]>=edge:b[axis]<=edge;
      if(ia)out.push(a);
      if(ia!==ib){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    }
  }
  return out;
}
function clipLines(points){
  const lines=[];let current=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1,ok=true;
    for(const [p,q] of [[-dx,a[0]-bounds[0]],[dx,bounds[2]-a[0]],[-dy,a[1]-bounds[1]],[dy,bounds[3]-a[1]]]){
      if(p===0){if(q<0)ok=false;continue;}const r=q/p;if(p<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);
    }
    if(ok&&lo<=hi){const start=[a[0]+lo*dx,a[1]+lo*dy],end=[a[0]+hi*dx,a[1]+hi*dy];if(current.length&&Math.hypot(current.at(-1)[0]-start[0],current.at(-1)[1]-start[1])>1e-8){lines.push(current);current=[];}if(!current.length)current.push(start);current.push(end);}else if(current.length){lines.push(current);current=[];}
  }
  if(current.length)lines.push(current);return lines;
}
const rounded=pts=>pts.map(p=>p.map(x=>+x.toFixed(7)));
const features=[];const seen=new Set();
for(const e of [...input.elements,...extra.elements]){
  if(seen.has(`${e.type}/${e.id}`))continue;seen.add(`${e.type}/${e.id}`);
  const t=e.tags||{};if(!e.geometry)continue;
  const points=e.geometry.map(p=>[p.lon,p.lat]);
  const linear=!!(t.highway||t.railway||t.waterway);
  const parts=linear?clipLines(points):[clipPolygon(points)];
  for(const p of parts){if(p.length<(linear?2:3))continue;features.push({id:e.id,tags:t,points:rounded(p)});}
}
for(const e of extra.elements.filter(e=>e.type==='relation')){
  const remaining=(e.members||[]).filter(m=>m.role==='outer'&&m.geometry).map(m=>m.geometry.map(p=>[p.lon,p.lat]));
  const same=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])<1e-7;
  while(remaining.length){let ring=remaining.shift();let joined=true;
    while(joined&&!same(ring[0],ring.at(-1))){joined=false;for(let i=0;i<remaining.length;i++){let p=remaining[i];if(same(ring.at(-1),p.at(-1)))p=p.toReversed();if(same(ring.at(-1),p[0])){ring.push(...p.slice(1));remaining.splice(i,1);joined=true;break;}if(same(ring[0],p[0]))p=p.toReversed();if(same(ring[0],p.at(-1))){ring=[...p.slice(0,-1),...ring];remaining.splice(i,1);joined=true;break;}}}
    const clipped=clipPolygon(ring);if(clipped.length>2)features.push({id:e.id,tags:{...e.tags,name:'안양천'},points:rounded(clipped)});
  }
}
const out={metadata:{bounds,center:[126.875,37.4805],source:'OpenStreetMap contributors',sourceUrl:'https://www.openstreetmap.org/copyright',license:'ODbL-1.0',fetchedAt:new Date().toISOString(),osmTimestamp:input.osm3s.timestamp_osm_base,note:'Mapped footprints, roads and water boundaries. Heights use OSM height or building:levels where available; otherwise estimated. Facade colors, vegetation and terrain elevation are illustrative.'},features};
fs.writeFileSync('dist/data/corridor.json',JSON.stringify(out));
console.log(`${features.length} clipped features; ${fs.statSync('dist/data/corridor.json').size} bytes`);
