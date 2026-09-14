import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SCALE, project, polygon, flatGeometry, stripGeometry, combine, inside, segmentDistance, sunDirection } from './geo.js';
import { waterMaterial } from './water.js?v=9';
import { setupTransit } from './transit.js?v=14';
import { setupExplore } from './explore.js?v=14';

const $=s=>document.querySelector(s), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=THREE.MathUtils.clamp;
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch(error){$('#loading').hidden=true;$('#error').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#scene').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe4edf0);scene.fog=new THREE.Fog(0xe4edf0,24,55);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.025,100);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.45;controls.zoomSpeed=.72;controls.panSpeed=.85;controls.mouseButtons.LEFT=THREE.MOUSE.PAN;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;controls.touches.ONE=THREE.TOUCH.PAN;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
controls.minDistance=1.2;controls.maxDistance=32;controls.minPolarAngle=.12;controls.maxPolarAngle=1.23;controls.screenSpacePanning=false;
const skyLight=new THREE.HemisphereLight(0xe5f2ff,0xb0baa2,2.1);scene.add(skyLight);
const sun=new THREE.DirectionalLight(0xfff3dc,3.2);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:50});sun.shadow.bias=-.00008;sun.shadow.normalBias=.003;sun.shadow.radius=2;scene.add(sun,sun.target);
const bounce=new THREE.DirectionalLight(0xd8eaff,.4);bounce.position.set(5,8,-5);scene.add(bounce);
const envScene=new THREE.Scene();envScene.background=new THREE.Color(0xd3e2ed);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene).texture;scene.environmentIntensity=.25;pmrem.dispose();
const detail=new THREE.Group(),country=new THREE.Group();scene.add(detail,country);country.visible=false;
const riverMat=waterMaterial(),seaMat=waterMaterial(true),waterMaterials=[riverMat,seaMat];
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const m={ground:mat(0xd2d5ce),base:mat(0xa7b5af),curb:mat(0xd6d7d0),road:mat(0x646e70),path:mat(0xdacdb1),cycle:mat(0xb58373),lane:mat(0xe9e4cd),rail:mat(0x5b6462),railBed:mat(0xb4b4a4),grass:mat(0x8dac72),park:mat(0x6f985a),wood:mat(0x568352),bank:mat(0x97b77b),sand:mat(0xc3c0a4),court:mat(0x749d85),asphalt:mat(0x89958e),concrete:mat(0xd0d4cd),trunk:mat(0x746e52),tree:mat(0x6b965b),roof:mat(0xd0d4d0),roofDark:mat(0x919f9a)};
const batches=new Map();
function batch(geometry,material,parent=detail){const key=material.uuid+parent.uuid;if(!batches.has(key))batches.set(key,{geometries:[],material,parent});batches.get(key).geometries.push(geometry);}
function mesh(geometry,material,parent=detail,cast=true){const obj=new THREE.Mesh(geometry,material);obj.castShadow=cast;obj.receiveShadow=true;parent.add(obj);return obj;}
function flush(){for(const b of batches.values()){if(b.geometries.length)mesh(combine(b.geometries),b.material,b.parent);}batches.clear();}
function plane(points,material,y=.004){batch(flatGeometry(points,y),material);}
let seed=9247;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const dummy=new THREE.Object3D();
let mode='detail',animation=null,autoTour=false,labels=[],riverLine=[],features=[],traffic=[],trafficBody,trafficRoof,trainBody,trainPath;
const nightLights=new THREE.Group();detail.add(nightLights);
const subwayLayer=new THREE.Group();detail.add(subwayLayer);subwayLayer.visible=false;
let landmarks,neighborhood,busCatalog,subwayTrains=[],transitUI,exploreUI,stopsVisible=true;
const liveBuses=new THREE.Group();detail.add(liveBuses);let busSnapshotAt=0;
let riverPolygons=[],parkPolygons=[],buildingPolygons=[],roadPaths=[];
const localBounds=[project([126.858,37.492]),project([126.895,37.455])];
const within=p=>p.x>localBounds[0].x&&p.x<localBounds[1].x&&p.y>localBounds[0].y&&p.y<localBounds[1].y;
function riverX(z){for(let i=1;i<riverLine.length;i++){const a=riverLine[i-1],b=riverLine[i];if(z>=Math.min(a.y,b.y)&&z<=Math.max(a.y,b.y)){return a.x+(b.x-a.x)*(z-a.y)/(b.y-a.y);}}return riverLine.length?riverLine.reduce((a,b)=>Math.abs(b.y-z)<Math.abs(a.y-z)?b:a).x:0;}
const riverDistance=p=>Math.abs(p.x-riverX(p.y));
function roadHeight(p,road){const inRiver=riverDistance(p)<.48;const major=['primary','secondary','tertiary'].includes(road.tags.highway);return .023+(major&&inRiver?.055*Math.max(0,1-Math.pow(riverDistance(p)/.48,4)):0)+(road.tags.bridge==='yes'?.009:0);}

function facadeTexture(glass=false,warm=false){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');
 c.fillStyle=glass?'#617f89':warm?'#e8e5dc':'#e6eae7';c.fillRect(0,0,128,128);
 if(glass){c.fillStyle='#a5bfc6';c.fillRect(6,4,52,116);c.fillStyle='#7c9eac';c.fillRect(65,4,57,116);c.fillStyle='#bfd0d1';c.fillRect(0,120,128,8);c.fillStyle='#d0d6d2';c.fillRect(60,0,4,128);}
 else{c.fillStyle='#bac6c5';c.fillRect(17,20,39,78);c.fillRect(72,20,39,78);c.fillStyle='#526d75';c.fillRect(20,23,33,69);c.fillRect(75,23,33,69);c.fillStyle='#8da9af';c.fillRect(23,26,28,30);c.fillRect(78,26,28,30);c.fillStyle='#d6ddda';c.fillRect(35,23,3,69);c.fillRect(90,23,3,69);c.fillStyle='#b4bcb5';c.fillRect(15,99,42,3);c.fillRect(70,99,42,3);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
}
const facadeMats=[mat(0xffffff,{map:facadeTexture(),roughness:.78}),mat(0xeeeae0,{map:facadeTexture(false,true),roughness:.8}),mat(0xf4f9fb,{map:facadeTexture(true),roughness:.29,metalness:.18}),mat(0xc0d4d8,{map:facadeTexture(true),roughness:.32,metalness:.15}),mat(0xd2bdb0,{map:facadeTexture(false,true)}),mat(0xe4ebdf,{map:facadeTexture()})];
function windowLights(glass){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,512,512);for(let row=0;row<4;row++)for(let col=0;col<4;col++)for(let side=0;side<2;side++){if(random()>.48)continue;c.fillStyle=['#dfb46b','#afc3c2','#ecce8c'][Math.floor(random()*3)];c.fillRect(col*128+(glass?(side?65:6):(side?75:20)),row*128+(glass?4:23),glass?52:33,glass?116:69);}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(.25,.25);texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;}
facadeMats.forEach((material,i)=>{material.emissive=new THREE.Color(0xffdda8);material.emissiveMap=windowLights(i===2||i===3);material.emissiveIntensity=0;});
const roofMats=[m.roof,m.roofDark,mat(0x8faaa1),mat(0xc2c7bc),mat(0xc3b6ac)];
function sliceGeometry(g,start,count){const out=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const a=g.getAttribute(name);out.setAttribute(name,new THREE.BufferAttribute(a.array.slice(start*a.itemSize,(start+count)*a.itemSize),a.itemSize));}return out;}
function buildBuilding(f,index){
 const p=f.points,t=f.tags; if(p.length<3)return;
 const c=p.reduce((s,p)=>s.add(p),new THREE.Vector2()).multiplyScalar(1/p.length);
 const box=new THREE.Box2().setFromPoints(p),size=box.getSize(new THREE.Vector2());if(size.x<.004||size.y<.004)return;
 const office=['office','commercial','retail'].includes(t.building)||t.office||(/타워|센터|밸리|플라츠|테크노|디폴리스/.test(t.name||''));
 const apartment=t.building==='apartments';
 const taggedHeight=parseFloat(t.height),levels=parseFloat(t['building:levels']);
 const height=Number.isFinite(taggedHeight)?taggedHeight:Number.isFinite(levels)?levels*3.1:apartment?45:office?32:t.building==='industrial'?14:t.building==='garage'?3.5:9;
 const h=clamp(height,3,200)*SCALE;
 const geometry=new THREE.ExtrudeGeometry(polygon(p),{depth:h,bevelEnabled:false,steps:1,UVGenerator:{
  generateTopUV:(g,v,a,b,c)=>[a,b,c].map(i=>new THREE.Vector2(v[i*3],v[i*3+1])),
  generateSideWallUV:(g,v,a,b,c,d)=>{const len=Math.hypot(v[a*3]-v[b*3],v[a*3+1]-v[b*3+1]);return [new THREE.Vector2(0,v[a*3+2]/(.0124)),new THREE.Vector2(len/(office?.017:.022),v[b*3+2]/.0124),new THREE.Vector2(len/(office?.017:.022),v[c*3+2]/.0124),new THREE.Vector2(0,v[d*3+2]/.0124)];}
 }});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,.027,0);
 const facade=f.id===1493983001?facadeMats[0]:facadeMats[office?(index%3?2:3):apartment?index%2:[0,1,4,5][index%4]],roof=roofMats[index%roofMats.length];
 for(const group of geometry.groups)batch(sliceGeometry(geometry,group.start,group.count),group.materialIndex===0?roof:facade);geometry.dispose();
 buildingPolygons.push({points:p,box});
 if(height>20&&size.x>.045&&size.y>.045){
  batch(stripGeometry([...p,p[0]],.0028,.029+h),m.concrete);
  if(inside(c,p)){const w=Math.min(.025,size.x*.17),d=Math.min(.024,size.y*.17);batch(new THREE.BoxGeometry(w,.009,d).translate(c.x,.032+h,c.y),m.roofDark);}
 }
}
function treeGeometry(){const parts=[];for(const [x,y,z,r]of [[0,.026,0,.016],[-.007,.022,0,.013],[.007,.022,.004,.013],[0,.034,-.003,.011]])parts.push(new THREE.IcosahedronGeometry(r,1).translate(x,y,z));return combine(parts);}
function placeTrees(points){
 const foliage=new THREE.InstancedMesh(treeGeometry(),m.tree,points.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.0018,.0025,.025,5).translate(0,.012,0),m.trunk,points.length);
 foliage.castShadow=true;foliage.receiveShadow=true;trunks.castShadow=true;
 points.forEach((p,i)=>{dummy.position.set(p.x,p.h||.016,p.y);dummy.rotation.set(0,random()*Math.PI,0);const scale=.8+random()*.85;dummy.scale.set(scale,scale*(.85+random()*.3),scale);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);trunks.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.25+random()*.07,.23+random()*.18,.29+random()*.12));});
 detail.add(foliage,trunks);dummy.scale.set(1,1,1);
}
function inBuilding(p){return buildingPolygons.some(b=>b.box.containsPoint(p)&&inside(p,b.points));}
function nearRoad(p){return roadPaths.some(r=>r.box.containsPoint(p)&&r.points.some((a,i)=>i&&segmentDistance(p,r.points[i-1],a)<r.width*.65));}
function getPath(points){let length=0;const distances=[0];for(let i=1;i<points.length;i++){length+=points[i].distanceTo(points[i-1]);distances.push(length);}return{points,distances,length};}
function placeStreetlights(){const positions=[];for(const road of roadPaths.filter(r=>r.width>=.03)){const path=getPath(road.points);for(let d=.06;d<path.length;d+=.19){const{point:p,angle}=atPath(path,d);p.x+=Math.cos(angle)*(road.width/2+.007);p.y-=Math.sin(angle)*(road.width/2+.007);if(within(p)&&!inBuilding(p))positions.push(p);}}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,220,151,.65)');gradient.addColorStop(.24,'rgba(255,204,112,.25)');gradient.addColorStop(1,'rgba(255,190,90,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
 const halos=new THREE.InstancedMesh(new THREE.PlaneGeometry(.085,.085).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}),positions.length);
 const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.0025,6,5),new THREE.MeshBasicMaterial({color:0xffd59a,toneMapped:false}),positions.length);
 const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.0008,.001,.023,5),m.rail,positions.length);
 positions.forEach((p,i)=>{dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.position.set(p.x,.030,p.y);dummy.updateMatrix();halos.setMatrixAt(i,dummy.matrix);dummy.position.y=.05;dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);dummy.position.y=.037;dummy.updateMatrix();poles.setMatrixAt(i,dummy.matrix);});
 nightLights.add(halos,bulbs);detail.add(poles);
}
function atPath(path,d){d=((d%path.length)+path.length)%path.length;for(let i=1;i<path.distances.length;i++)if(path.distances[i]>=d){const a=path.points[i-1],b=path.points[i],t=(d-path.distances[i-1])/(path.distances[i]-path.distances[i-1]);return{point:a.clone().lerp(b,t),angle:Math.atan2(b.x-a.x,b.y-a.y)};}return{point:path.points[0],angle:0};}

function makeSign(text,color='#28668b',width=.24,height=.035){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f4f5ee';ctx.fillRect(0,0,768,128);ctx.fillStyle=color;ctx.font='700 86px "Noto Sans KR", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,68);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
}
function buildLandmarks(){
 const campus=landmarks.hospital.campus.map(project),hospital=project(landmarks.hospital.coord);
 plane(campus,m.asphalt,.011);
 const parkingMat=mat(0xf0ede0),hospitalBuilding=features.find(f=>f.id===landmarks.hospital.buildingId);
 // Existing surveyed building footprint is retained; this adds its forecourt and roof sign.
 for(let row=0;row<2;row++)for(let col=0;col<12;col++){
  const p=project([126.8714+col*.000105,37.47377-row*.00012]);
  if(inside(p,campus)&&!inBuilding(p)){batch(stripGeometry([p,new THREE.Vector2(p.x,p.y+.019)],.001,.014),parkingMat);if(col%3!==0)batch(new THREE.BoxGeometry(.007,.006,.015).translate(p.x+.004,.018,p.y+.008),mat([0xebedeb,0x657c88,0xabb8b4][col%3]));}
 }
 if(hospitalBuilding){const box=new THREE.Box2().setFromPoints(hospitalBuilding.points),center=box.getCenter(new THREE.Vector2());
  const sign=makeSign('광명성애병원','#286d98',.24,.034);sign.position.set(center.x,.027+.12+.022,box.max.y);detail.add(sign);
  const northSign=sign.clone();northSign.position.z=box.min.y;northSign.rotation.y=Math.PI;detail.add(northSign);
  const entrance=project([126.87194,37.47340]);batch(new THREE.BoxGeometry(.075,.004,.032).translate(entrance.x,.05,entrance.y-.02),m.concrete);
  for(const dx of [-.032,.032])batch(new THREE.CylinderGeometry(.0012,.0012,.025,6).translate(entrance.x+dx,.036,entrance.y-.03),m.rail);
 }
 const station=project(landmarks.stations.find(s=>s.name==='철산').coord);
 for(const exit of landmarks.exits){const p=project(exit.coord);batch(new THREE.BoxGeometry(.018,.005,.038).translate(p.x,.028,p.y),m.concrete);batch(new THREE.BoxGeometry(.02,.003,.032).translate(p.x,.045,p.y),mat(0x8ea6a5,{roughness:.35}));for(const dx of [-.008,.008])batch(new THREE.BoxGeometry(.0015,.018,.032).translate(p.x+dx,.035,p.y),m.rail);const sign=makeSign(`7  ${exit.number}`,'#7e8a33',.028,.012);sign.position.set(p.x,.054,p.y+.019);detail.add(sign);}
 const trackMat=new THREE.MeshBasicMaterial({color:0x9dac50,transparent:true,opacity:.74,depthTest:false,depthWrite:false});
 const tunnelMat=new THREE.MeshBasicMaterial({color:0x536136,transparent:true,opacity:.18,depthTest:false,depthWrite:false});
 landmarks.tracks.forEach((track,index)=>{
  const points=track.points.map(project);if(index===1)points.reverse();const path=getPath(points);
  const tunnel=new THREE.Mesh(stripGeometry(points,.085,.018),tunnelMat);tunnel.renderOrder=40;subwayLayer.add(tunnel);
  const rail=new THREE.Mesh(stripGeometry(points,.01,.022),trackMat);rail.renderOrder=41;subwayLayer.add(rail);
  let distance=0,closest=Infinity,stationDistance=0;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],delta=b.clone().sub(a),length=delta.length(),t=clamp(station.clone().sub(a).dot(delta)/(length*length),0,1),dist=station.distanceTo(a.clone().lerp(b,t));if(dist<closest){closest=dist;stationDistance=distance+t*length;}distance+=length;}
  const {point:p,angle}=atPath(path,stationDistance);const platform=new THREE.Mesh(new THREE.BoxGeometry(.046,.008,.9),new THREE.MeshBasicMaterial({color:0xd7dca6,transparent:true,opacity:.7,depthTest:false,depthWrite:false}));platform.position.set(p.x,.024,p.y);platform.rotation.y=angle;platform.renderOrder=42;subwayLayer.add(platform);
  const body=new THREE.InstancedMesh(new THREE.BoxGeometry(.023,.023,.098),new THREE.MeshBasicMaterial({color:0xe8ece9,depthTest:false}),8);
  const stripe=new THREE.InstancedMesh(new THREE.BoxGeometry(.0235,.005,.096),new THREE.MeshBasicMaterial({color:0x7e8a33,depthTest:false}),8);
  const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.02,.003,.068),new THREE.MeshBasicMaterial({color:0x344d59,depthTest:false}),8);
  body.renderOrder=43;stripe.renderOrder=44;windows.renderOrder=45;subwayLayer.add(body,stripe,windows);subwayTrains.push({path,stationDistance,body,stripe,windows,index});
 });
 flush();
}
function animateSubway(t){
 if(!subwayLayer.visible||mode!=='detail')return;
 for(const train of subwayTrains){const speed=.05,approach=1.7,travel=approach/speed,phase=(t+travel-8+train.index*24)%(travel*2+20);let head;
  if(phase<travel)head=train.stationDistance+.3-approach+phase*speed;else if(phase<travel+20)head=train.stationDistance+.3;else head=train.stationDistance+.3+(phase-travel-20)*speed;
  for(let i=0;i<8;i++){const {point:p,angle}=atPath(train.path,head-i*.108);dummy.position.set(p.x,.042,p.y);dummy.rotation.set(0,angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();train.body.setMatrixAt(i,dummy.matrix);dummy.position.y=.041;dummy.updateMatrix();train.stripe.setMatrixAt(i,dummy.matrix);dummy.position.y=.055;dummy.updateMatrix();train.windows.setMatrixAt(i,dummy.matrix);}train.body.instanceMatrix.needsUpdate=true;train.stripe.instanceMatrix.needsUpdate=true;train.windows.instanceMatrix.needsUpdate=true;
 }
}
function focusPlace(coord,kind){if(mode!=='detail')setMode('detail');stopTour();const p=project(coord),target=new THREE.Vector3(p.x,0,p.y);fly(target.clone().add(kind==='district'?new THREE.Vector3(0,9.8,3.5):new THREE.Vector3(0,3.8,1.8)),target,1100);document.body.classList.toggle('subway-focus',kind==='station');}

async function buildDetail(){
 const response=await fetch('/data/corridor.json');if(!response.ok)throw new Error('Map data could not load');const data=await response.json();
 features=data.features.map(f=>({...f,points:f.points.map(project)}));
 const landmarkResponse=await fetch('/data/landmarks.json');if(!landmarkResponse.ok)throw new Error('Landmarks unavailable');landmarks=await landmarkResponse.json();
 const [nr,br]=await Promise.all([fetch('/data/neighborhood.json'),fetch('/data/bus-stops.json')]);if(!nr.ok||!br.ok)throw new Error('Neighborhood unavailable');[neighborhood,busCatalog]=await Promise.all([nr.json(),br.json()]);
 riverLine=features.find(f=>f.tags.waterway==='river'&&f.tags.name==='안양천').points;
 riverPolygons=features.filter(f=>f.tags.natural==='water').map(f=>f.points);
 const size=localBounds[1].clone().sub(localBounds[0]),center=localBounds[0].clone().lerp(localBounds[1],.5);
 // The entire map surface sits above the base; roads, parks and water cannot be buried.
 mesh(new THREE.BoxGeometry(size.x,.1,size.y).translate(center.x,-.053,center.y),m.base);
 mesh(new THREE.PlaneGeometry(size.x,size.y).rotateX(-Math.PI/2).translate(center.x,0,center.y),m.ground,detail,false);
 for(const f of features){const t=f.tags;
  if(t.landuse&&!t.highway){const material=['grass','recreation_ground','forest'].includes(t.landuse)?m.grass:t.landuse==='residential'?mat(0xd3d9c9):t.landuse==='construction'?mat(0xc2bda7):m.curb;plane(f.points,material,.003);}
 }
 // The OSM river centerline and banks are continuous across both districts.
 batch(stripGeometry(riverLine,.73,.007),m.bank);batch(stripGeometry(riverLine,.43,.009),m.sand);
 const waterShadow=new THREE.ShadowMaterial({color:0x18363c,opacity:.32,depthWrite:false});
 for(const f of features.filter(f=>f.tags.natural==='water')){mesh(flatGeometry(f.points,.016),riverMat,detail,false);mesh(flatGeometry(f.points,.0163),waterShadow,detail,false);}
 for(const f of features){const t=f.tags;
  if(t.natural==='wood'||['park','garden','pitch','playground'].includes(t.leisure)){
   const wooded=t.natural==='wood',sport=t.leisure==='pitch';plane(f.points,wooded?m.wood:sport?m.court:m.park,.009);
   if(!sport&&t.leisure!=='playground')parkPolygons.push({points:f.points,wooded});
   if(sport){batch(stripGeometry([...f.points,f.points[0]],.0018,.012),m.lane);}
  }
 }
 const roadWidth={motorway:12,trunk:11,primary:10,secondary:10,tertiary:8,residential:6,living_street:5,unclassified:5,service:3.5,footway:2,path:1.5,cycleway:3,steps:1.5,pedestrian:5};
 for(const f of features){const t=f.tags;if(!t.highway||['construction','proposed','corridor'].includes(t.highway)||t.tunnel==='yes'||t.covered==='yes'||Number(t.layer)<0)continue;
  const foot=['footway','path','steps','cycleway','pedestrian'].includes(t.highway),width=(parseFloat(t.width)||roadWidth[t.highway]||5)*SCALE*(foot?1.12:['primary','secondary','tertiary','motorway','trunk'].includes(t.highway)?1.65:1.35);
  const pts=[];for(let i=1;i<f.points.length;i++){const a=f.points[i-1],b=f.points[i],steps=Math.max(1,Math.ceil(a.distanceTo(b)/.04));if(!pts.length)pts.push(a);for(let j=1;j<=steps;j++)pts.push(a.clone().lerp(b,j/steps));}
  if(pts.length<2)continue;
  batch(stripGeometry(pts,width+.009,p=>roadHeight(p,f)-.003),foot?m.grass:m.curb);
  batch(stripGeometry(pts,width,p=>roadHeight(p,f)),foot?(t.highway==='cycleway'?m.cycle:m.path):m.road);
  if(!foot){roadPaths.push({points:f.points,width,box:new THREE.Box2().setFromPoints(f.points).expandByScalar(width)});
   if(['primary','secondary','tertiary'].includes(t.highway)){
    const path=getPath(pts);
    for(let distance=.015;distance<path.length;distance+=.05){const a=atPath(path,distance).point,b=atPath(path,Math.min(distance+.021,path.length-.00001)).point;batch(stripGeometry([a,b],.0018,p=>roadHeight(p,f)+.0007),m.lane);}
    if(path.length>.35)traffic.push({path,road:f,speed:.025+random()*.025,offset:random()*path.length,reverse:random()>.5,width});
   }
  }
  // Raised crossings cast real shadows on the channel.
  if(t.bridge==='yes'&&!foot){for(let i=0;i<pts.length;i+=Math.max(1,Math.floor(pts.length/3))){const p=pts[i],h=roadHeight(p,f);if(riverDistance(p)<.24)batch(new THREE.BoxGeometry(width*.6,h,.01).translate(p.x,h/2,p.y),m.concrete);}}
 }
 for(const f of features.filter(f=>f.tags.railway==='rail'&&f.tags.tunnel!=='yes'&&Number(f.tags.layer||0)>=0)){
  batch(stripGeometry(f.points,.016,.028),m.railBed);batch(stripGeometry(f.points,.0055,.03),m.rail);
  const path=getPath(f.points);for(let d=.01;d<path.length;d+=.012){const {point:p,angle}=atPath(path,d);const a=new THREE.Vector2(p.x+Math.cos(angle)*.005,p.y-Math.sin(angle)*.005),b=new THREE.Vector2(p.x-Math.cos(angle)*.005,p.y+Math.sin(angle)*.005);batch(stripGeometry([a,b],.0015,.031),m.roofDark);}
  if(!trainPath||path.length>trainPath.length)trainPath=path;
 }
 features.filter(f=>f.tags.building&&!['construction','no'].includes(f.tags.building)).forEach(buildBuilding);
 const trees=[];
 for(const park of parkPolygons){const box=new THREE.Box2().setFromPoints(park.points),sz=box.getSize(new THREE.Vector2()),n=Math.min(1300,Math.round(sz.x*sz.y*(park.wooded?260:90)));
  for(let i=0;i<n;i++){const p=new THREE.Vector2(box.min.x+random()*sz.x,box.min.y+random()*sz.y);if(within(p)&&inside(p,park.points)&&!inBuilding(p)&&!nearRoad(p)&&!riverPolygons.some(poly=>inside(p,poly)))trees.push(p);}
 }
 // Riverside avenues follow mapped paths; planting avoids buildings and the channel.
 for(let z=localBounds[0].y+.04;z<localBounds[1].y;z+=.057){for(const side of [-1,1]){const p=new THREE.Vector2(riverX(z)+side*(.26+random()*.055),z);if(within(p)&&!inBuilding(p)&&!nearRoad(p)&&!riverPolygons.some(poly=>inside(p,poly)))trees.push(p);}}
 for(const r of roadPaths.filter(r=>r.width>=.03)){const path=getPath(r.points);for(let d=.03;d<path.length;d+=.13){const{point:p,angle}=atPath(path,d);p.x+=Math.cos(angle)*(r.width/2+.016);p.y-=Math.sin(angle)*(r.width/2+.016);if(within(p)&&!inBuilding(p)&&!riverPolygons.some(poly=>inside(p,poly)))trees.push(p);}}
 placeTrees(trees);placeStreetlights();flush();buildLandmarks();buildNeighborhood();
 traffic=traffic.slice(0,110);
 trafficBody=new THREE.InstancedMesh(new THREE.BoxGeometry(.007,.005,.017),mat(0xffffff,{roughness:.45}),traffic.length);
 trafficRoof=new THREE.InstancedMesh(new THREE.BoxGeometry(.0055,.0025,.008),mat(0x39545b,{roughness:.3}),traffic.length);
 trafficBody.castShadow=true;detail.add(trafficBody,trafficRoof);
 const carColors=[0xf6f5ed,0xb9c5c6,0x536a77,0xede9dd,0xaeb9bb,0xc77455,0x4d6d54];traffic.forEach((_,i)=>trafficBody.setColorAt(i,new THREE.Color(carColors[i%7])));
 if(trainPath){trainBody=new THREE.InstancedMesh(new THREE.BoxGeometry(.023,.023,.098),mat(0xebedef,{roughness:.45}),6);trainBody.castShadow=true;detail.add(trainBody);}
 return {buildings:buildingPolygons.length,trees:trees.length,features:features.length};
}

function buildNeighborhood(){
 const church=project(neighborhood.church.coord),white=mat(0xece6dd),glass=mat(0x63878f,{metalness:.15,roughness:.3});
 // Official marker location; envelope dimensions are explicitly illustrative.
 batch(new THREE.BoxGeometry(.108,.072,.1).translate(church.x,.063,church.y),white);
 batch(new THREE.BoxGeometry(.07,.024,.065).translate(church.x-.015,.111,church.y-.012),white);
 for(let i=0;i<7;i++)batch(new THREE.BoxGeometry(.005,.06,.001).translate(church.x-.045+i*.015,.068,church.y+.0506),glass);
 batch(new THREE.BoxGeometry(.003,.035,.003).translate(church.x+.04,.137,church.y+.015),m.concrete);
 batch(new THREE.BoxGeometry(.019,.003,.003).translate(church.x+.04,.143,church.y+.015),m.concrete);
 const sign=makeSign('광명교회','#53675d',.09,.018);sign.position.set(church.x,.111,church.y+.052);detail.add(sign);
 const complexEdge=mat(0xadbca2);
 for(const complex of neighborhood.complexes){batch(stripGeometry(complex.points.map(project),.003,.015),complexEdge);}
 const stopMat=mat(0x428d78);for(const stop of busCatalog.stops){const p=project(stop.coord);batch(new THREE.CylinderGeometry(.001,.001,.023,5).translate(p.x,.03,p.y),m.rail);batch(new THREE.BoxGeometry(.008,.008,.002).translate(p.x,.044,p.y),stopMat);if(stop.shelter){batch(new THREE.BoxGeometry(.018,.003,.009).translate(p.x+.01,.04,p.y),m.roofDark);}}
 flush();
}
const busBodyMat=mat(0x358969,{roughness:.5}),busGlassMat=mat(0x234956,{roughness:.25}),busRoofMat=mat(0xe9eee7);
function updateBuses(rows){
 for(const label of labels.filter(l=>l.kind==='vehicle'))label.el.remove();labels=labels.filter(l=>l.kind!=='vehicle');

 for(const obj of [...liveBuses.children]){liveBuses.remove(obj);obj.traverse(child=>{child.geometry?.dispose();if(child.userData.labelMaterial){child.material.map?.dispose();child.material.dispose();}});}
 liveBuses.visible=true;busSnapshotAt=Date.now();
 for(const row of rows){const p=project(row.coord),group=new THREE.Group();group.position.set(p.x,.042,p.y);
  const from=busCatalog.stops.find(s=>s.id===row.fromStationId),to=busCatalog.stops.find(s=>s.id===row.toStationId);if(from&&to){const a=project(from.coord),b=project(to.coord);group.rotation.y=Math.atan2(b.x-a.x,b.y-a.y);}
  mesh(new THREE.BoxGeometry(.021,.023,.081),busBodyMat,group);mesh(new THREE.BoxGeometry(.0215,.009,.067).translate(0,.005,0),busGlassMat,group);mesh(new THREE.BoxGeometry(.021,.003,.081).translate(0,.014,0),busRoofMat,group);
  const sign=makeSign(row.name,'#1c664a',.075,.026);sign.position.y=.058;sign.userData.labelMaterial=true;group.add(sign);
  liveBuses.add(group);
  const el=document.createElement('div');el.className='map-label vehicle';const b=document.createElement('button');b.className='label-body';b.textContent=`▰ ${row.name}`;b.title=`${row.name}번 버스 · GBIS 수신 위치`;b.onclick=()=>focusPlace(row.coord,'bus');el.append(b,document.createElement('i'));$('#labels').append(el);labels.unshift({name:row.name,kind:'vehicle',pos:new THREE.Vector3(p.x,.11,p.y),el});

 }
}

const kProject=([lon,lat])=>new THREE.Vector2((lon-127.7)*Math.cos(36*Math.PI/180)*1.8,-(lat-36)*1.8);
async function buildKorea(){
 const res=await fetch('/data/korea.geojson');if(!res.ok)throw new Error('Korea outline could not load');const kor=await res.json();
 const polys=kor.geometry.type==='MultiPolygon'?kor.geometry.coordinates: [kor.geometry.coordinates];
 const area=ring=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0));polys.sort((a,b)=>area(b[0])-area(a[0]));
 const sea=mesh(new THREE.PlaneGeometry(70,70).rotateX(-Math.PI/2).translate(0,-.05,0),seaMat,country,false);
 const green=mat(0x6d9263),edge=mat(0xa8bba0);
 const regionResponse=await fetch('/data/region.geojson');if(!regionResponse.ok)throw new Error('Regional coastline unavailable');const region=await regionResponse.json();
 const contextLand=mat(0x99ae85);
 for(const f of region.features)for(const coords of f.geometry.coordinates){if(coords[0].length<3)continue;const ring=coords[0].map(kProject);mesh(flatGeometry(ring,.089),contextLand,country,false);}
 // A continuous peninsula and nearby coastlines give the national view geographic context.
 for(const coords of polys){const ring=coords[0].map(kProject),shape=polygon(ring);mesh(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,.073,0),edge,country);mesh(flatGeometry(ring,.089),green,country);}
 // Smooth relief in the Taebaek / Sobaek spine, contained within the mainland.
 const mainland=polys[0][0].map(kProject),hillGeo=new THREE.PlaneGeometry(6.6,8.6,160,200).rotateX(-Math.PI/2),pa=hillGeo.getAttribute('position');
 const mountains=[[128.4,37.6,.34],[128.2,36.9,.28],[127.7,36.0,.22],[127.6,35.4,.28],[129.0,35.7,.18]];
 const reliefColors=[];
 for(let i=0;i<pa.count;i++){const p=new THREE.Vector2(pa.getX(i),pa.getZ(i));let h=0;if(inside(p,mainland)){for(const [lon,lat,amp]of mountains){const c=kProject([lon,lat]);h+=amp*Math.exp(-p.distanceToSquared(c)/.42);}h*=.9+.10*Math.sin(p.x*10+p.y*3)*Math.cos(p.y*8);}pa.setY(i,.095+h);const color=new THREE.Color().lerpColors(new THREE.Color(0x829d6b),new THREE.Color(0x416c53),clamp(h*2.3,0,1));reliefColors.push(color.r,color.g,color.b);}
 // Remove triangles outside the coastline instead of putting a rectangle over it.
 const idx=hillGeo.getIndex(),kept=[];for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];if(ids.every(j=>inside(new THREE.Vector2(pa.getX(j),pa.getZ(j)),mainland)))kept.push(...ids);}hillGeo.setIndex(kept);hillGeo.setAttribute('color',new THREE.Float32BufferAttribute(reliefColors,3));hillGeo.computeVertexNormals();mesh(hillGeo,mat(0xffffff,{vertexColors:true}),country);
 const p=kProject([126.875,37.4805]);mesh(new THREE.CylinderGeometry(.027,.027,.3,12).translate(p.x,.21,p.y),mat(0xeabd69),country);mesh(new THREE.SphereGeometry(.065,20,12).translate(p.x,.4,p.y),mat(0xffdf98,{emissive:0x8a5b24,emissiveIntensity:.3}),country);
}

const labelSpec=[
 {name:'철산역 7호선',sub:'CHEOLSAN · 747',coord:[126.8675973,37.4760012],height:.12,kind:'station'},
 {name:'광명성애병원',sub:'GWANGMYEONG SUNGAE',coord:[126.871875,37.4734763],height:.21,kind:'hospital'},
 {name:'철산동',sub:'CHEOLSAN',coord:[126.8688,37.4805],height:.17},
 {name:'가산디지털단지',sub:'GASAN DIGITAL',coord:[126.8806,37.4809],height:.4},
 {name:'안양천',sub:'ANYANGCHEON',coord:[126.8747,37.4794],height:.04,kind:'water'},
 {name:'철산교',sub:'CHEOLSAN BRIDGE',coord:[126.8770,37.4749],height:.1,kind:'minor'},
 {name:'광명대교',sub:'GWANGMYEONG BRIDGE',coord:[126.8724,37.4851],height:.1,kind:'minor'},
 {name:'철산근린공원',sub:'CHEOLSAN PARK',coord:[126.8713,37.4721],height:.08,kind:'minor'}
];
function setLabels(){
 const dynamic=mode==='detail'&&neighborhood?[
  {name:'광명교회',sub:'하안로 437',coord:neighborhood.church.coord,height:.14,kind:'church'},
  ...neighborhood.complexes.map(c=>({name:c.name,sub:'HAAN · '+c.name.match(/\d+/)?.[0],coord:c.coord,height:.23,kind:'complex'})),
  ...busCatalog.stops.map(stop=>({name:stop.name,sub:stop.ref,coord:stop.coord,height:.055,kind:'bus',stop})),
  ...features.filter(f=>f.tags.highway&&['primary','secondary','tertiary'].includes(f.tags.highway)&&f.tags.name&&f.points.length>3).filter((f,i,a)=>a.findIndex(x=>x.tags.name===f.tags.name)===i).map(f=>({name:f.tags.name,sub:'',world:f.points[Math.floor(f.points.length/2)],height:.035,kind:'road'}))
 ]:[];
 const spec=mode==='detail'?[...labelSpec,...dynamic]:[{name:'북한',sub:'KOREAN PENINSULA',coord:[127.2,39.25],height:.14,kind:'minor'},{name:'일본',sub:'JAPAN',coord:[131.5,33.4],height:.14,kind:'minor'},{name:'중국',sub:'CHINA',coord:[122.6,39.0],height:.14,kind:'minor'},{name:'철산 · 안양천',sub:'CHEOLSAN',coord:[126.875,37.4805],height:.55},{name:'서울',sub:'SEOUL',coord:[127.14,37.75],height:.18,kind:'minor'},{name:'부산',sub:'BUSAN',coord:[129.07,35.18],height:.14},{name:'제주',sub:'JEJU',coord:[126.53,33.38],height:.13}];
 $('#labels').replaceChildren();labels=spec.map(s=>{
 const p=s.world||(mode==='detail'?project(s.coord):kProject(s.coord)),el=document.createElement('div');el.className=`map-label ${s.kind||''}`;
 const clickable=['station','hospital','church','complex','bus'].includes(s.kind),body=document.createElement(clickable?'button':'div');body.className='label-body';body.textContent=s.kind==='bus'?'▰':s.name;
 if(clickable){body.type='button';body.setAttribute('aria-label',s.name+(s.kind==='bus'?` 정류소 ${s.sub}`:''));body.title=s.name;body.onclick=()=>{if(s.kind==='station'){exploreUI?.close();transitUI?.open();}else if(s.kind==='bus')exploreUI?.openStop(s.stop);else if(s.kind==='church')exploreUI?.openPlace(neighborhood.church);else if(s.kind==='complex')exploreUI?.openPlace({...s,description:'하안동 · 실제 단지 배치'});else{exploreUI?.close();focusPlace(s.coord,s.kind);}};}
 const small=document.createElement('small');small.textContent=s.kind==='bus'?s.name:s.sub;body.append(small);el.append(body,document.createElement('i'));$('#labels').append(el);return{...s,pos:new THREE.Vector3(p.x,s.height,p.y),el};});
}
function homePosition(){return mode==='detail'?new THREE.Vector3(0,9.5,5.0):new THREE.Vector3(1.6,13.8,10.8);}
function homeTarget(){return mode==='detail'?new THREE.Vector3(0,0,1.8):new THREE.Vector3(0,0,-1.25);}
function fly(position,target,duration=1300){animation={from:camera.position.clone(),to:position.clone(),fromTarget:controls.target.clone(),target:target.clone(),start:performance.now(),duration:reduced?1:duration};controls.enabled=false;}
function stopTour(){autoTour=false;controls.autoRotate=false;$('#tour').setAttribute('aria-pressed','false');$('#tour').innerHTML='<span>▷</span> 천천히 둘러보기';}
function setMode(next){if(next===mode)return;stopTour();mode=next;document.body.classList.toggle('country-view',mode==='korea');document.body.classList.remove('subway-focus');transitUI?.close();exploreUI?.close();detail.visible=mode==='detail';country.visible=mode==='korea';
 $('#enter-place').classList.toggle('active',mode==='detail');$('#back-korea').classList.toggle('active',mode==='korea');$('#enter-place').setAttribute('aria-pressed',String(mode==='detail'));$('#back-korea').setAttribute('aria-pressed',String(mode==='korea'));
 $('#eyebrow').textContent=mode==='detail'?'CHEOLSAN · GASAN':'SOUTH KOREA';$('#title').textContent=mode==='detail'?'철산 · 하안 · 가산':'대한민국, 가까이.';$('#lede').innerHTML=mode==='detail'?'철산의 주거지와 가산의 빌딩 숲,<br>그 사이로 흐르는 일상의 풍경.':'북쪽으로 이어지는 산줄기와 세 면의 바다.<br>한반도에서 우리 동네를 찾아보세요.';$('#place-region').textContent=mode==='detail'?'광명시 철산동 ↔ 금천구 가산동':'한반도 · 서해 · 동해 · 남해';controls.minDistance=mode==='detail'?1.2:5;setLabels();fly(homePosition(),homeTarget());}
function updateSun(){const now=new Date(),position=sunDirection(now),day=clamp((position.altitude+.10)/.55,0,1),above=Math.max(0,Math.sin(position.altitude));
 sun.position.copy(position.vector).multiplyScalar(20);sun.intensity=position.altitude>0?2.4+above:0;sun.color.setHex(position.altitude<.18?0xffcf98:0xfff2dc);skyLight.intensity=1.15+day*1.05;bounce.intensity=.32+day*.17;scene.environmentIntensity=.25;renderer.toneMappingExposure=1.12;
 const night=1-clamp((position.altitude+.12)/.15,0,1);facadeMats.forEach((material,i)=>material.emissiveIntensity=night*(i===2||i===3?.18:.24));nightLights.visible=night>.15;document.body.classList.toggle('night',night>.4);
 const background=new THREE.Color().lerpColors(new THREE.Color(0x9eafb9),new THREE.Color(0xe4edf0),day);scene.background=background;scene.fog.color.copy(background);
 waterMaterials.forEach(m=>{m.uniforms.uSun.value.copy(position.vector);m.uniforms.uDay.value=day;});
 $('#clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(now);
 $('#period').textContent=position.altitude<-.10?'고요한 밤':position.altitude<0?'해 질 무렵':position.altitude<.18?'따뜻한 낮은 햇살':'햇살이 머무는 오후';$('#sun-angle').textContent=`태양 고도 ${(position.altitude*180/Math.PI).toFixed(1)}°`;$('#sun-symbol').textContent=position.altitude<0?'☾':'☀';
 return position;
}
$('#enter-place').onclick=()=>setMode('detail');$('#back-korea').onclick=()=>setMode('korea');
$('#reset').onclick=()=>{stopTour();fly(homePosition(),homeTarget(),850);};
let overhead=false;$('#top-view').onclick=()=>{stopTour();overhead=!overhead;const d=Math.max(3,camera.position.distanceTo(controls.target));fly(controls.target.clone().add(overhead?new THREE.Vector3(0,d,.01):new THREE.Vector3(0,d*.85,d*.52)),controls.target,900);$('#top-view').textContent=overhead?'3D':'2D';};
function zoom(factor){stopTour();const offset=camera.position.clone().sub(controls.target),length=clamp(offset.length()*factor,controls.minDistance,controls.maxDistance);fly(controls.target.clone().add(offset.setLength(length)),controls.target,420);}
$('#zoom-in').onclick=()=>zoom(.73);$('#zoom-out').onclick=()=>zoom(1.37);
$('#tour').onclick=()=>{autoTour=!autoTour;controls.autoRotate=autoTour;controls.autoRotateSpeed=.32;$('#tour').setAttribute('aria-pressed',String(autoTour));$('#tour').innerHTML=autoTour?'<span>Ⅱ</span> 둘러보기 멈추기':'<span>▷</span> 천천히 둘러보기';};
controls.addEventListener('start',()=>{stopTour();animation=null;controls.enabled=true;});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
let last=0,frame=0;
const projected=new THREE.Vector3();
function animate(time){requestAnimationFrame(animate);const dt=Math.min(.04,(time-last)/1000)||0;last=time;
 if(animation){const t=clamp((time-animation.start)/animation.duration,0,1),e=t*t*(3-2*t);camera.position.lerpVectors(animation.from,animation.to,e);controls.target.lerpVectors(animation.fromTarget,animation.target,e);if(t>=1){animation=null;controls.enabled=true;}}
 controls.update(dt);
 if(mode==='detail'){controls.target.x=clamp(controls.target.x,localBounds[0].x+1,localBounds[1].x-1);controls.target.z=clamp(controls.target.z,localBounds[0].y+1,localBounds[1].y-1);}
 if(busSnapshotAt&&Date.now()-busSnapshotAt>90000){updateBuses([]);busSnapshotAt=0;}
 const t=reduced?0:time/1000;animateSubway(t);waterMaterials.forEach(m=>m.uniforms.uTime.value=t);
 if(mode==='detail'&&trafficBody){traffic.forEach((car,i)=>{const {point:p,angle}=atPath(car.path,car.offset+(car.reverse?-1:1)*t*car.speed),side=car.reverse?-1:1;p.x+=Math.cos(angle)*car.width*.22*side;p.y-=Math.sin(angle)*car.width*.22*side;dummy.position.set(p.x,roadHeight(p,car.road)+.004,p.y);dummy.rotation.set(0,angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trafficBody.setMatrixAt(i,dummy.matrix);dummy.position.y+=.003;dummy.updateMatrix();trafficRoof.setMatrixAt(i,dummy.matrix);});trafficBody.instanceMatrix.needsUpdate=true;trafficRoof.instanceMatrix.needsUpdate=true;
 if(trainBody)for(let i=0;i<6;i++){const{point:p,angle}=atPath(trainPath,t*.065+i*.108);dummy.position.set(p.x,.045,p.y);dummy.rotation.set(0,angle,0);dummy.updateMatrix();trainBody.setMatrixAt(i,dummy.matrix);trainBody.instanceMatrix.needsUpdate=true;}}
 if(frame++%2===0){const occupied=[],distance=camera.position.distanceTo(controls.target);
 for(const label of labels){
  projected.copy(label.pos).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
  const isBus=label.kind==='bus',w=isBus?15:label.kind==='road'?80:label.kind==='minor'?100:145,h=isBus?15:label.kind==='road'?23:44;
  const blocked=occupied.some(b=>Math.abs(x-b.x)<(w+b.w)/2+5&&Math.abs(y-b.y)<(h+b.h)/2+4);
  const panelOpen=!$('#explore-panel').hidden||!$('#arrival-panel').hidden;
  const uiBlocked=(innerWidth>750&&x<370&&y<210)||(innerWidth>750&&panelOpen&&x>innerWidth-370&&y>80)||(innerWidth<=750&&panelOpen&&y>innerHeight-320);
  const visible=projected.z>-1&&projected.z<1&&x>20&&x<innerWidth-45&&y>(innerWidth<750?180:90)&&y<innerHeight-80&&!blocked&&!uiBlocked&&(!isBus||(stopsVisible&&distance<15))&&(label.kind!=='road'||distance<14);
  label.el.hidden=!visible;if(visible){occupied.push({x,y,w,h});label.el.style.left=`${x}px`;label.el.style.top=`${y}px`;}
 }
 $('#compass-needle').style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;
 const meters=mode==='detail'?(distance<4?100:200):100000;
 const scale=mode==='detail'?SCALE:1.8/111320;const pixels=meters*scale*innerHeight/(2*distance*Math.tan(camera.fov*Math.PI/360));$('#scale-line').style.width=`${clamp(pixels,25,180)}px`;$('#scale-text').textContent=meters>=1000?`${meters/1000} km`:`${meters} m`;
 }
 renderer.render(scene,camera);
}
try{
 const stats=await buildDetail();await buildKorea();updateSun();setInterval(updateSun,30000);setLabels();
 camera.position.copy(homePosition().multiplyScalar(1.1));controls.target.copy(homeTarget());controls.update();fly(homePosition(),homeTarget(),1900);
 renderer.compile(scene,camera);$('#loading').classList.add('hidden');$('#loading').setAttribute('aria-hidden','true');requestAnimationFrame(animate);
 transitUI=setupTransit({focusStation:()=>{exploreUI?.close();focusPlace([126.8675973,37.4760012],'station');},focusHospital:()=>{exploreUI?.close();focusPlace(landmarks.hospital.coord,'hospital');},setTransitVisible:enabled=>{subwayLayer.visible=enabled;$('#subway-caption').hidden=!enabled;}});
 exploreUI=setupExplore({catalog:busCatalog,neighborhood,focus:focusPlace,showBuses:updateBuses,toggleStops:value=>stopsVisible=value,closeTransit:()=>transitUI.close()});
 window.sogeum={showKorea:()=>setMode('korea'),showCheolsan:()=>setMode('detail'),getState:()=>({view:mode,koreaTime:$('#clock').textContent,...stats})};
 if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  for(const tool of [{name:'read_korea_map',title:'Read Korea map',description:'Read the current view and Korea time.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>window.sogeum.getState()},{name:'open_cheolsan_map',title:'Open Anyangcheon',description:'Show the Cheolsan–Anyangcheon–Gasan corridor.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>{setMode('detail');return window.sogeum.getState();}}]){
   try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  }
  addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 }
}catch(error){console.error(error);$('#loading').hidden=true;$('#error').hidden=false;}
