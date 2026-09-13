import * as THREE from './vendor/three.module.js';
export const SCALE=.004;
export const CENTER=[126.875,37.4805];
export const project=([lon,lat])=>new THREE.Vector2((lon-CENTER[0])*111320*Math.cos(CENTER[1]*Math.PI/180)*SCALE,-(lat-CENTER[1])*111320*SCALE);
export function polygon(points){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p.x,-p.y):s.moveTo(p.x,-p.y));s.closePath();return s;}
export function flatGeometry(points,y){return new THREE.ShapeGeometry(polygon(points)).rotateX(-Math.PI/2).translate(0,y,0);}
export function stripGeometry(points,width,height=.02){
 const pos=[],uv=[],indices=[];
 for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
  const d=b.clone().sub(a).normalize(),n=new THREE.Vector2(-d.y,d.x).multiplyScalar(width/2),p=points[i];
  const y=typeof height==='function'?height(p):height;
  pos.push(p.x+n.x,y,p.y+n.y,p.x-n.x,y,p.y-n.y);uv.push(0,i,1,i);
  // Counterclockwise as seen from above; the old strip faced underground.
  if(i<points.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function combine(geometries){
 const attrs={position:[],normal:[],uv:[]};
 for(let g of geometries){if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}for(const name of Object.keys(attrs)){const a=g.getAttribute(name);if(a)attrs[name].push(a.array);else attrs[name].push(new Float32Array(g.getAttribute('position').count*(name==='uv'?2:3)));}g.dispose();}
 const result=new THREE.BufferGeometry();for(const [name,arrays]of Object.entries(attrs)){const size=arrays.reduce((n,a)=>n+a.length,0),out=new Float32Array(size);let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}result.setAttribute(name,new THREE.BufferAttribute(out,name==='uv'?2:3));}result.computeBoundingSphere();return result;
}
export function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a.y>p.y)!==(b.y>p.y))&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export function segmentDistance(p,a,b){const d=b.clone().sub(a),t=THREE.MathUtils.clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1);return p.distanceTo(a.clone().addScaledVector(d,t));}
export function sunDirection(date,lat=CENTER[1],lon=CENTER[0]){
 const r=Math.PI/180,d=date.getTime()/86400000-10957.5,M=r*(357.5291+.98560028*d);
 const L=M+r*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M))+r*(102.9372+180),e=23.4397*r;
 const dec=Math.asin(Math.sin(L)*Math.sin(e)),ra=Math.atan2(Math.sin(L)*Math.cos(e),Math.cos(L));
 const H=r*(280.16+360.9856235*d+lon)-ra,phi=lat*r;
 const altitude=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
 const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi));
 return {altitude,azimuth:az+Math.PI,vector:new THREE.Vector3(-Math.sin(az)*Math.cos(altitude),Math.sin(altitude),Math.cos(az)*Math.cos(altitude))};
}
