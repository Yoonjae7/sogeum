const fs=require('node:fs');
const full=JSON.parse(fs.readFileSync('dist/data/corridor.json'));
const river=full.features.find(f=>f.tags.waterway==='river'&&f.tags.name==='안양천').points;
const bounds=[126.858,37.469,126.882,37.492];
function riverLon(lat){for(let i=1;i<river.length;i++){const a=river[i-1],b=river[i];if(lat>=a[1]&&lat<=b[1])return a[0]+(b[0]-a[0])*(lat-a[1])/(b[1]-a[1]);}return river.at(-1)[0];}
const edge=[[riverLon(bounds[1])+.001,bounds[1]],...river.filter(p=>p[1]>bounds[1]&&p[1]<bounds[3]).map(([x,y])=>[x+.001,y]),[riverLon(bounds[3])+.001,bounds[3]]];
const boundary=[[bounds[0],bounds[1]],...edge,[bounds[0],bounds[3]],[bounds[0],bounds[1]]];
const within=([x,y])=>y>=bounds[1]&&y<=bounds[3]&&x>=bounds[0]&&x<=riverLon(y)+.001;
function clipRectangle(points,closed){
 if(!closed){const out=[];let run=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;for(const [p,q]of[[-dx,a[0]-bounds[0]],[dx,bounds[2]-a[0]],[-dy,a[1]-bounds[1]],[dy,bounds[3]-a[1]]]){if(!p){if(q<0)hi=-1;}else if(p<0)lo=Math.max(lo,q/p);else hi=Math.min(hi,q/p);}if(lo<=hi){const p=[a[0]+lo*dx,a[1]+lo*dy],q=[a[0]+hi*dx,a[1]+hi*dy];if(within(p)&&within(q)){if(!run.length)run.push(p);run.push(q);}else if(run.length){out.push(run);run=[];}}else if(run.length){out.push(run);run=[];}}if(run.length)out.push(run);return out;}
 let out=points;for(const [axis,e,gt]of[[0,bounds[0],true],[0,bounds[2],false],[1,bounds[1],true],[1,bounds[3],false]]){const src=out;out=[];for(let i=0;i<src.length;i++){const a=src[i],b=src[(i+1)%src.length],ia=gt?a[axis]>=e:a[axis]<=e,ib=gt?b[axis]>=e:b[axis]<=e;if(ia)out.push(a);if(ia!==ib){const t=(e-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}}return out.length>=3?[out]:[];
}
const features=[];
for(const f of full.features){const linear=!!(f.tags.highway||f.tags.railway||f.tags.waterway);for(const points of clipRectangle(f.points,!linear)){if(!linear&&f.tags.natural!=='water'&&!points.every(within))continue;features.push({...f,points});}}
fs.writeFileSync('dist/data/cheolsan-detail.json',JSON.stringify({metadata:{...full.metadata,bounds,boundary,note:'Cheolsan west bank only. Gasan and southern Haan are not rendered.'},features}));
const buses=JSON.parse(fs.readFileSync('dist/data/bus-stops.json'));buses.stops=buses.stops.filter(s=>within(s.coord));const ids=new Set(buses.stops.flatMap(s=>s.routes));buses.routes=buses.routes.filter(r=>ids.has(r.id));buses.metadata={...buses.metadata,bounds,boundary};fs.writeFileSync('dist/data/cheolsan-buses.json',JSON.stringify(buses));
console.log(`${full.features.length} → ${features.length} features; ${buses.stops.length} stops; ${buses.routes.length} routes`);
