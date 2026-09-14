const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function makeRoadRouter(paths){
 const nodes=[],edges=[],lookup=new Map();
 const node=p=>{const key=p.map(v=>v.toFixed(4)).join(',');if(!lookup.has(key)){lookup.set(key,nodes.length);nodes.push({p,edges:[]});}return lookup.get(key);};
 for(const path of paths)for(let i=1;i<path.length;i++){const a=node(path[i-1]),b=node(path[i]);if(a===b)continue;const length=distance(nodes[a].p,nodes[b].p);nodes[a].edges.push({id:b,cost:length});nodes[b].edges.push({id:a,cost:length});edges.push({a,b,length});}
 function nearest(p){let best=null;for(const edge of edges){const a=nodes[edge.a].p,b=nodes[edge.b].p,dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),point=[a[0]+t*dx,a[1]+t*dy],d=distance(p,point);if(!best||d<best.d)best={...edge,point,d,t};}return best;}
 return (from,to)=>{
  if(distance(from,to)<.0005)return[from,to];
  if(distance(from,to)>2.8)return null; // GPS discontinuity; do not animate a jump across town.
  const start=nearest(from),end=nearest(to);if(!start||!end||start.d>.16||end.d>.16)return null;
  if(start.a===end.a&&start.b===end.b)return[from,start.point,end.point,to];
  const costs=new Map([[start.a,start.length*start.t],[start.b,start.length*(1-start.t)]]),previous=new Map(),open=new Set([start.a,start.b]),done=new Set();let winner=null,best=Infinity;
  while(open.size&&done.size<2500){let id=null,cost=Infinity;for(const n of open)if(costs.get(n)<cost){cost=costs.get(n);id=n;}if(cost>best||cost>5)break;open.delete(id);done.add(id);
   if(id===end.a||id===end.b){const total=cost+end.length*(id===end.a?end.t:1-end.t);if(total<best){best=total;winner=id;}}
   for(const e of nodes[id].edges){const next=cost+e.cost;if(!done.has(e.id)&&next<(costs.get(e.id)??Infinity)){costs.set(e.id,next);previous.set(e.id,id);open.add(e.id);}}
  }
  if(winner===null||best>Math.max(.4,distance(from,to)*3))return null;
  const middle=[];let id=winner;while(id!==undefined){middle.unshift(nodes[id].p);id=previous.get(id);}return[from,start.point,...middle,end.point,to];
 };
}
export function samplePath(points,fraction){
 const lengths=points.slice(1).map((p,i)=>distance(points[i],p)),total=lengths.reduce((a,b)=>a+b,0);let remaining=Math.max(0,Math.min(1,fraction))*total;
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],t=lengths[i]?remaining/lengths[i]:1;return{point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],angle:Math.atan2(b[0]-a[0],b[1]-a[1])};}remaining-=lengths[i];}
 return {point:points.at(-1),angle:0};
}
