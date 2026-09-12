import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (s) => document.querySelector(s);
const icons = {
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
 buildings:'<path d="M3 21V9h7v12M10 21V3h9v18M1 21h21M6 12v1m0 3v1m7-10h3m-3 4h3m-3 4h3m-3 4h3"/>',
 sound:'<path d="M11 4L6 8H3v8h3l5 4V4zM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 16v.1"/>',
 moon:'<path d="M20.5 14.5A9 9 0 019.5 3.5a9 9 0 1011 11z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5L16 8z"/>',
 rotate:'<path d="M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0114-1l1 3M4 15l1 3a8 8 0 0014-1"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 9h12"/>',
 passport:'<rect x="5" y="2" width="15" height="20" rx="2"/><path d="M5 5H3v17h14"/><circle cx="12.5" cy="10" r="4"/><path d="M8.5 10h8m-4-4c-2 2-2 6 0 8 2-2 2-6 0-8M10 18h5"/>',
 pavilion:'<path d="M2 11c4-1 7-2 10-7 3 5 6 6 10 7H2zM4 16h16M5 11v9m14-9v9M9 11v9m6-9v9M2 20h20"/>',
 apartments:'<path d="M3 21V7h7v14M12 21V3h8v18M1 21h22M5 10h3m-3 4h3m-3 4h3M14 6h4m-4 4h4m-4 4h4m-4 4h4"/>',
 waves:'<path d="M2 19c3-4 5 4 8 0s5 4 8 0 4 0 4 0M3 15V7h4v8m3 0V3h4v12m3 0V6h4v9M11 1h2"/>',
 bridge:'<path d="M2 19h20M5 19V5m14 14V5M2 11c4 0 6-2 10-5 4 3 6 5 10 5M8 10v9m4-11v11m4-9v9"/>'
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.buildings}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = svg(el.dataset.icon));

export const places = [
 {id:'jonggak',name:'Jonggak',ko:'종각',region:'Seoul',lat:37.5702,lon:126.9831,icon:'pavilion',tag:'Old Seoul, softly unfolding',title:'The heart of old Seoul.',description:'Bell pavilion, little alleyways, and a city full of stories.',landmark:'Bosingak bell pavilion',color:0xb38969},
 {id:'gangnam',name:'Gangnam',ko:'강남',region:'Seoul',lat:37.4979,lon:127.0276,icon:'buildings',tag:'A little city that never sleeps',title:'A different kind of sparkle.',description:'Follow Gangnam-daero through a forest of tiny city towers.',landmark:'Gangnam Station crossroads',color:0xb7b5a5},
 {id:'cheolsan',name:'Cheolsan',ko:'철산',region:'Gyeonggi-do',lat:37.476,lon:126.8683,icon:'apartments',tag:'Everyday life, in miniature',title:'The beauty of the everyday.',description:'Apartment gardens and familiar corners of Gwangmyeong.',landmark:'Cheolsan Station',color:0xc6b995},
 {id:'gasan',name:'Gasan Digital',ko:'가산',region:'Seoul',lat:37.4811,lon:126.8825,icon:'buildings',tag:'Big ideas in small buildings',title:'Where little ideas grow.',description:'The offices and workshops around Gasan Digital Complex.',landmark:'Gasan Digital Complex Station',color:0xb79e85},
 {id:'haeundae',name:'Haeundae',ko:'해운대',region:'Busan',lat:35.1587,lon:129.1604,icon:'waves',tag:'A breath of sea air',title:'Meet me by the sea.',description:'A sandy crescent, ocean breezes, and Busan’s beachside streets.',landmark:'Haeundae Beach',color:0xd0be9c},
 {id:'busan',name:'Busan',ko:'부산',region:'City Hall',lat:35.1796,lon:129.0756,icon:'bridge',tag:'A new corner of the city',title:'Slow down in Busan.',description:'A tiny world around City Hall, in the heart of Yeonje-gu.',landmark:'Busan City Hall',color:0xc1aa89}
];
let selected=places[0], mode='globe', minute=0, stamps=new Set(), soundEnabled=false;
try { stamps=new Set(JSON.parse(localStorage.getItem('sogeum-stamps')||'[]').filter(id=>places.some(p=>p.id===id))); } catch {}
$('#destinations').innerHTML=places.map(p=>`<button class="destination" data-id="${p.id}" aria-label="Visit ${p.name}, ${p.ko}, ${p.region}"><span class="dest-thumb">${svg(p.icon)}</span><span class="dest-text"><strong>${p.name}<em>${p.ko}</em></strong><small>${p.region}${p.id==='jonggak'?' <span class="capital-label"> · Capital</span>':''} · ${p.id==='haeundae'?'By the sea':p.id==='jonggak'?'History':p.id==='gangnam'?'City lights':p.id==='cheolsan'?'Neighborhood':p.id==='gasan'?'Digital district':'City center'}</small></span><span class="dest-arrow">↗</span></button>`).join('');
function updatePassport(){ $('#stamp-count').textContent=`${stamps.size}/6`; $('#stamp-status').textContent=stamps.size===6?'Every little corner, discovered.':stamps.size?`${stamps.size} little ${stamps.size===1?'star':'stars'} collected`:'Find a star in every neighborhood'; }
updatePassport();
let toastTimeout;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),3300);}

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
$('#world').appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,200);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=3.1;controls.maxDistance=11;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.autoRotateSpeed=.45;
const ambient=new THREE.HemisphereLight(0xfff2d4,0x2c493f,1.8);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffedc6,3);sun.position.set(-4,5,4);sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.2,far:35});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc2e0da,.45);fill.position.set(3,-1,5);scene.add(fill);
const globeGroup=new THREE.Group();scene.add(globeGroup);
const cityGroup=new THREE.Group();cityGroup.visible=false;scene.add(cityGroup);
const radius=2;
const latLon=(lat,lon,r=radius)=>{const a=THREE.MathUtils.degToRad(lat),b=THREE.MathUtils.degToRad(lon+180);return new THREE.Vector3(-r*Math.cos(a)*Math.cos(b),r*Math.sin(a),r*Math.cos(a)*Math.sin(b));};
let globe, cityBuilder=null, cityCache=new Map(), cityRequest=0, frame=0, transition=null, starPosition=new THREE.Vector3(0,1,0);
const nightUniform={value:new THREE.Vector3()};
let globeLabels=[];
function makeCanvas(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;}
const worldData=await fetch('/data/world.geojson').then(r=>{if(!r.ok)throw Error('World map unavailable');return r.json();});
function paintMap(){
 const canvas=makeCanvas(4096,2048),ctx=canvas.getContext('2d');ctx.fillStyle='#6b9d9a';ctx.fillRect(0,0,4096,2048);
 const bump=makeCanvas(4096,2048),bc=bump.getContext('2d');bc.fillStyle='#101010';bc.fillRect(0,0,4096,2048);
 const colors=['#b0be91','#b7c097','#bfc5a0','#aeba90','#c4c49c','#b6c09c'];
 const drawRing=(context,ring)=>{ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*4096,y=(90-lat)/180*2048;i?context.lineTo(x,y):context.moveTo(x,y)});context.closePath();};
 worldData.features.forEach((f,i)=>{const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const korea=f.properties.isoA3==='KOR'||f.properties.name==='South Korea';polygons.forEach(poly=>{ctx.beginPath();bc.beginPath();poly.forEach(ring=>{drawRing(ctx,ring);drawRing(bc,ring)});ctx.fillStyle=korea?'#e3c481':colors[i%colors.length];ctx.fill('evenodd');ctx.strokeStyle=korea?'#f2d99c':'#d2d0ac';ctx.lineWidth=korea?2.5:.8;ctx.stroke();bc.fillStyle='#eeeeee';bc.fill('evenodd');});});
 ctx.strokeStyle='#f6f1d70c';ctx.lineWidth=1;for(let i=0;i<4096;i+=4096/24){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,2048);ctx.stroke();}for(let i=0;i<2048;i+=2048/12){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(4096,i);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const bumpMap=new THREE.CanvasTexture(bump);
 const lights=makeCanvas(2048,1024),lc=lights.getContext('2d');lc.fillStyle='black';lc.fillRect(0,0,2048,1024);
 const clusters=[[37.56,126.98,20],[35.18,129.08,10],[35.87,128.6,8],[36.35,127.38,6],[35.16,126.85,6],[37.26,127.03,8],[37.46,126.7,8],[35.68,139.69,20],[34.69,135.5,15],[31.23,121.47,20],[39.9,116.4,18],[22.3,114.17,14],[25.03,121.56,10],[1.35,103.8,8],[28.6,77.2,20],[48.85,2.35,14],[51.5,-.12,14],[40.71,-74,17],[34.05,-118.2,16],[-23.55,-46.6,15]];
 let seed=41;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 clusters.forEach(([lat,lon,n])=>{for(let i=0;i<n*4;i++){const x=(lon+180+(rand()-.5)*2.7)/360*2048,y=(90-lat+(rand()-.5)*1.5)/180*1024;const g=lc.createRadialGradient(x,y,0,x,y,2.5);g.addColorStop(0,'#ffd489');g.addColorStop(.35,'#bb7d2a');g.addColorStop(1,'#000000');lc.globalCompositeOperation='lighter';lc.fillStyle=g;lc.fillRect(x-3,y-3,6,6);}});
 const lightMap=new THREE.CanvasTexture(lights);lightMap.colorSpace=THREE.SRGBColorSpace;
 return {texture,bumpMap,lightMap};
}
const maps=paintMap();
const globeMaterial=new THREE.MeshStandardMaterial({map:maps.texture,bumpMap:maps.bumpMap,bumpScale:.038,roughness:.96,metalness:0,emissive:0xffd39c,emissiveMap:maps.lightMap,emissiveIntensity:2.35});
globeMaterial.onBeforeCompile=shader=>{shader.uniforms.sunDirection=nightUniform;shader.vertexShader='varying vec3 globeNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nglobeNormal = normalize((modelMatrix * vec4(position, 0.0)).xyz);');shader.fragmentShader='uniform vec3 sunDirection;\nvarying vec3 globeNormal;\n'+shader.fragmentShader.replace('#include <lights_fragment_begin>','float sunFacing = dot(normalize(globeNormal), normalize(sunDirection));\ndiffuseColor.rgb *= mix(vec3(0.22, 0.26, 0.30), vec3(1.0), smoothstep(-0.12, 0.20, sunFacing));\n#include <lights_fragment_begin>').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 - smoothstep(-0.10, 0.16, sunFacing);');};
globe=new THREE.Mesh(new THREE.SphereGeometry(radius,144,96),globeMaterial);globeGroup.add(globe);
// A fine, translucent shell gives the horizon a tactile, softly lit edge.
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.018,96,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(.84,.86,.68,a*.33);}'}));globeGroup.add(atmosphere);
const ringMat=new THREE.LineBasicMaterial({color:0xb2b99a,transparent:true,opacity:.16});
for(let j=0;j<2;j++){const pts=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*2.4,0,Math.sin(a)*2.4));}const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),ringMat);ring.rotation.z=j?-.28:.23;ring.rotation.x=j?.32:0;globeGroup.add(ring);}
const cloudMat=new THREE.MeshStandardMaterial({color:0xfff6dc,roughness:1,transparent:true,opacity:.82});
const cloudGeo=new THREE.SphereGeometry(1,10,7);
[[20,148],[49,145],[12,104],[49,95],[6,163],[-17,134],[59,178],[-15,95],[18,-153],[-30,-65],[45,-20],[1,30]].forEach(([lat,lon],i)=>{const g=new THREE.Group();g.position.copy(latLon(lat,lon,2.045));g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),g.position.clone().normalize());for(let j=0;j<4;j++){const c=new THREE.Mesh(cloudGeo,cloudMat);c.position.set((j-1.5)*.066,.01+Math.sin(j)*.012,Math.cos(j)*.02);c.scale.set(.065+(j%2)*.017,.025,.045);g.add(c);}globeGroup.add(g);});
function label(text,sub,lat,lon,city,country=false){const el=document.createElement(city?'button':'div');el.className='map-label'+(country?' country':'');el.innerHTML=country?text:`<strong>${text}</strong>${sub?`<small>${sub}</small>`:''}<i class="pin ${sub==='Capital'?'capital':''}"></i>`;if(city){el.setAttribute('aria-label',`Explore ${text}`);el.onclick=()=>visit(places.find(p=>p.id===city));}$('#map-labels').appendChild(el);globeLabels.push({el,pos:latLon(lat,lon,2.045)});}
label('Seoul 서울','Capital',37.5665,126.978,'jonggak');label('Busan 부산','By the sea',35.1796,129.0756,'haeundae');label('Tokyo','',35.68,139.69);label('Beijing','Capital',39.9,116.4);label('CHINA','',29,109,null,true);label('JAPAN','',41,142,null,true);label('MONGOLIA','',46,103,null,true);label('PHILIPPINES','',12,123,null,true);label('AUSTRALIA','',-25,134,null,true);

function offsetCamera(){if(innerWidth>800)camera.setViewOffset(innerWidth,innerHeight,-Math.min(145,innerWidth*.12),-8,innerWidth,innerHeight);else camera.setViewOffset(innerWidth,innerHeight,0,32,innerWidth,innerHeight);}
function globeCamera(){const pixels=Math.min(innerWidth>800?(innerWidth-450)*.35:innerWidth*.39,Math.max(95,(innerHeight-(innerWidth>800?470:520))*.5));const distance=radius/Math.sin(Math.atan(pixels/(innerHeight*.5)*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))));return latLon(28,128,distance);}
camera.position.copy(globeCamera());controls.target.set(0,0,0);offsetCamera();controls.update();
function flyTo(position,target,duration=1300){transition={from:camera.position.clone(),to:position.clone(),fromTarget:controls.target.clone(),toTarget:target.clone(),start:performance.now(),duration};controls.enabled=false;}

export function solarDirection(date){
 const start=Date.UTC(date.getUTCFullYear(),0,0),day=(date.getTime()-start)/86400000;
 const hour=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
 const g=2*Math.PI/365*(Math.floor(day)-1+(hour-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 return latLon(THREE.MathUtils.radToDeg(decl),(720-hour*60-eq)/4,1);
}
function shownDate(){return new Date();}
let currentDay=0;
function updateTime(){const d=shownDate(),kst=new Date(d.getTime()+9*3600000);minute=kst.getUTCHours()*60+kst.getUTCMinutes();$('#local-time').textContent=`${String(kst.getUTCHours()).padStart(2,'0')}:${String(kst.getUTCMinutes()).padStart(2,'0')}`;document.documentElement.style.setProperty('--korea-day-progress',`${minute/1439*100}%`);
 const dir=solarDirection(d);nightUniform.value.copy(dir);const altitude=THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(dir.dot(latLon(selected.lat,selected.lon,1)),-1,1)));currentDay=THREE.MathUtils.smoothstep(altitude,-8,20);
 const daylight=altitude>0,twilight=altitude>-8&&altitude<=8;
 $('#light-label').textContent=twilight?'Golden edges of the day':daylight?'Daylight in Korea':'Quiet hours in Korea';
 $('#time-icon').innerHTML=svg(daylight?'sun':'moon');$('#time-heading').textContent='Korea, right now';
 $('#date-label').textContent=`${new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'Asia/Seoul'}).format(d).toUpperCase()} · KST (UTC+9)`;
 $('#time-mood').textContent=twilight?'The whole world feels a little softer.':daylight?'A little sunshine for your wandering.':'Windows glow. The world slows down.';
 document.body.classList.toggle('night',!daylight);
 if(mode==='globe'){sun.castShadow=false;sun.position.copy(dir).multiplyScalar(12);sun.intensity=3.8;ambient.intensity=.65;fill.intensity=.12;renderer.toneMappingExposure=1.28;}
 else{sun.castShadow=currentDay>.18;const east=latLon(selected.lat,selected.lon+.01,1).sub(latLon(selected.lat,selected.lon,1)).normalize();const north=latLon(selected.lat+.01,selected.lon,1).sub(latLon(selected.lat,selected.lon,1)).normalize();sun.position.set(dir.dot(east)*12,Math.max(.9,dir.dot(latLon(selected.lat,selected.lon,1))*12),-dir.dot(north)*12);sun.intensity=.28+currentDay*4.2;ambient.intensity=.28+currentDay*.5;fill.intensity=.08+currentDay*.1;renderer.toneMappingExposure=1.08;cityBuilder?.setDaylight(currentDay);}
}
updateTime();

async function visit(place){
 selected=place;mode='city';document.body.classList.add('city');globeGroup.visible=false;cityGroup.visible=true;$('#globe-btn').classList.remove('active');$('#city-btn').classList.add('active');
 document.querySelectorAll('.destination').forEach(el=>{el.classList.toggle('selected',el.dataset.id===place.id);el.setAttribute('aria-pressed',String(el.dataset.id===place.id));});
 $('#scene-eyebrow').textContent=`${place.region.toUpperCase()} · ${place.ko}`;$('#scene-title').textContent=place.title;$('#scene-description').textContent=place.description;
 $('#coordinate-text').textContent=`${place.lat.toFixed(4)}° N  ·  ${place.lon.toFixed(4)}° E`;$('#map-scale').textContent='REAL MAP FOOTPRINTS · MINIATURE BUILDINGS';
 controls.minDistance=4;controls.maxDistance=30;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.12;controls.autoRotate=false;$('#rotate-btn').classList.remove('active');
 const request=++cityRequest;$('#collect-star').hidden=true;
 try{
 if(!cityCache.has(place.id)){const response=await fetch(`/data/${place.id}.json`);if(!response.ok)throw Error('The neighborhood could not load');cityCache.set(place.id,await response.json());}
 const {buildCity}=await import('./city.js');if(request!==cityRequest||mode!=='city')return;
 if(cityBuilder){cityGroup.remove(cityBuilder.group);cityBuilder.dispose();}
 cityBuilder=buildCity(THREE,place,cityCache.get(place.id));cityGroup.add(cityBuilder.group);starPosition.copy(cityBuilder.starPosition);
 camera.position.set(12,12,16);controls.target.set(0,0,0);flyTo(cityCamera(),new THREE.Vector3(0,.3,0),1100);
 $('#collect-star').hidden=stamps.has(place.id);updateTime();
 }catch(error){console.error(error);toast('This little place couldn’t load. Please try again.');showGlobe();}
}
function cityCamera(){return innerWidth>800?new THREE.Vector3(12,13,16):new THREE.Vector3(16,19,22);}
function showGlobe(){mode='globe';cityRequest++;document.body.classList.remove('city');globeGroup.visible=true;cityGroup.visible=false;$('#collect-star').hidden=true;$('#globe-btn').classList.add('active');$('#city-btn').classList.remove('active');$('#scene-eyebrow').textContent='OUR LITTLE BLUE PLANET';$('#scene-title').textContent='A world of possibilities.';$('#scene-description').textContent='Drag to wander. Pick a place to get closer.';$('#map-scale').textContent='EARTH · 1 : A LITTLE WONDER';controls.minDistance=3.1;controls.maxDistance=36;controls.maxPolarAngle=Math.PI;controls.minPolarAngle=0;controls.autoRotate=false;$('#rotate-btn').classList.remove('active');flyTo(globeCamera(),new THREE.Vector3(),1300);updateTime();}
document.querySelectorAll('.destination').forEach(el=>el.onclick=()=>visit(places.find(p=>p.id===el.dataset.id)));
$('#city-btn').onclick=()=>visit(selected);$('#globe-btn').onclick=showGlobe;
function zoom(factor){const p=camera.position.clone().sub(controls.target);p.setLength(THREE.MathUtils.clamp(p.length()*factor,controls.minDistance,controls.maxDistance));flyTo(p.add(controls.target),controls.target,300);}
$('#zoom-in').onclick=()=>zoom(.78);$('#zoom-out').onclick=()=>zoom(1.28);$('#reset-view').onclick=()=>mode==='globe'?showGlobe():flyTo(cityCamera(),new THREE.Vector3(0,.3,0),900);
$('#rotate-btn').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#rotate-btn').classList.toggle('active',controls.autoRotate);$('#rotate-btn').setAttribute('aria-pressed',String(controls.autoRotate));$('#rotate-btn').setAttribute('aria-label',`${controls.autoRotate?'Stop':'Start'} auto rotation`);};
$('#collect-star').onclick=()=>{if(mode!=='city'||stamps.has(selected.id))return;stamps.add(selected.id);try{localStorage.setItem('sogeum-stamps',JSON.stringify([...stamps]));}catch{}updatePassport();$('#collect-star').hidden=true;toast(stamps.size===6?'✦ All six stars! Korea is a little more yours.':`✦ A little piece of ${selected.name}, collected.`);playChime();};
function showDialog(html){$('#dialog-content').innerHTML=html;$('#info-dialog').showModal();}
$('#help-btn').onclick=()=>showDialog(`<div class="eyebrow">WELCOME, LITTLE WANDERER</div><h2>Make yourself a little world.</h2><p>Spin the globe, drop into Korea, and take your time.</p><div class="help-row"><span>${svg('mouse')}</span><span>Drag to look around. Scroll or pinch to zoom.</span></div><div class="help-row"><span>${svg('buildings')}</span><span>Choose a neighborhood to explore its real map in miniature.</span></div><div class="help-row"><span>✦</span><span>Find the floating golden star. Collect all six for your passport.</span></div><div class="help-row"><span>${svg('sun')}</span><span>The sun, shadows, and glowing windows follow the live time in Korea.</span></div><p><kbd>+</kbd> / <kbd>−</kbd> zoom · <kbd>G</kbd> globe · <kbd>R</kbd> rotate · <kbd>Esc</kbd> close</p>`);
$('#passport-btn').onclick=()=>showDialog(`<div class="eyebrow">A PASSPORT FULL OF LITTLE MOMENTS</div><h2>Your little journey <span style="color:#a2ab83">${stamps.size}/6</span></h2><p>Find and tap the golden star in each neighborhood. Your stamps stay on this device.</p><div class="passport-grid">${places.map(p=>`<div class="stamp ${stamps.has(p.id)?'collected':''}"><b>${stamps.has(p.id)?'✦':'✧'}</b><span>${p.name}</span><small>${p.ko}</small></div>`).join('')}</div>`);
$('#credits-btn').onclick=()=>showDialog(`<div class="eyebrow">REAL PLACES. A LITTLE IMAGINATION.</div><h2>About this little world.</h2><p>Sogeum (소금) means salt. Just a little makes the everyday more interesting.</p><p>Neighborhood streets and building footprints are based on <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> (ODbL), captured September 2026. Coastlines and country boundaries use public-domain <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a> data.</p><p>This is a stylized miniature, not a navigation map or an exact 3D survey. Heights use map tags where available and illustrative estimates elsewhere. Landmark details, trees, cars, and window lights are artistic.</p><p>Live light follows the date and sun position using the <a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF" target="_blank" rel="noreferrer">NOAA solar equations</a>. The time slider uses today’s date in Korea (UTC+9). Weather and cloud shapes are decorative.</p><p>Rendered with <a href="https://threejs.org/" target="_blank" rel="noreferrer">Three.js</a>.</p>`);
$('.dialog-close').onclick=()=>$('#info-dialog').close();$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let audioContext,ambientGain;
function playChime(){if(!soundEnabled)return;[523.25,659.25,783.99].forEach((hz,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,audioContext.currentTime+i*.12);gain.gain.linearRampToValueAtTime(.1,audioContext.currentTime+i*.12+.03);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+i*.12+1);osc.connect(gain);gain.connect(audioContext.destination);osc.start(audioContext.currentTime+i*.12);osc.stop(audioContext.currentTime+i*.12+1);});}
$('#sound-btn').onclick=async()=>{if(!audioContext){audioContext=new AudioContext();ambientGain=audioContext.createGain();ambientGain.gain.value=0;ambientGain.connect(audioContext.destination);[130.81,196,261.63].forEach((freq,i)=>{const osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;g.gain.value=.018/(i+1);osc.connect(g);g.connect(ambientGain);osc.start();});}await audioContext.resume();soundEnabled=!soundEnabled;ambientGain.gain.setTargetAtTime(soundEnabled?1:0,audioContext.currentTime,.7);$('#sound-btn').classList.toggle('active',soundEnabled);$('#sound-btn').setAttribute('aria-label',`Turn ${soundEnabled?'off':'on'} ambient sound`);$('#sound-btn').setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)playChime();};
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||$('#info-dialog').open)return;if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);if(e.key.toLowerCase()==='g')showGlobe();if(e.key.toLowerCase()==='r')$('#rotate-btn').click();});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const projection=new THREE.Vector3();
function project(v){projection.copy(v).project(camera);return{x:(projection.x*.5+.5)*innerWidth,y:(-.5*projection.y+.5)*innerHeight,z:projection.z};}
function animate(now){requestAnimationFrame(animate);frame++;
 if(transition){const t=Math.min(1,(now-transition.start)/(reducedMotion?1:transition.duration)),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);if(t===1){transition=null;controls.enabled=true;}}
 controls.update();
 if(frame%1800===0)updateTime();
 globeLabels.forEach(({el,pos})=>{if(mode!=='globe'){el.style.display='none';return;}const p=project(pos);const facing=pos.clone().normalize().dot(camera.position.clone().sub(pos).normalize());const visible=facing>.18&&p.z<1;el.style.display=visible?'flex':'none';if(visible){el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.opacity=Math.min(1,(facing-.18)*4);}});
 if(mode==='city'&&cityBuilder){cityBuilder.animate(reducedMotion?0:now*.001);if(!stamps.has(selected.id)) {const p=project(starPosition.clone().add(new THREE.Vector3(0,Math.sin(now*.002)*.06,0)));$('#collect-star').style.left=`${p.x}px`;$('#collect-star').style.top=`${p.y-$('.topbar').getBoundingClientRect().height}px`;$('#collect-star').hidden=p.z>1;}}
 renderer.render(scene,camera);
}
controls.maxDistance=36;
requestAnimationFrame(animate);$('#loading').classList.add('hidden');$('#loading').setAttribute('aria-hidden','true');
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;offsetCamera();camera.updateProjectionMatrix();});
window.addEventListener('error',()=>{if(!$('#loading').classList.contains('hidden')){$('#loading strong').textContent='This little world needs WebGL. Please refresh or try another browser.';}});
window.sogeum={getState:()=>({view:mode,place:selected.id,live:true,minute,stars:[...stamps],daylight:currentDay}),visit:id=>{const p=places.find(p=>p.id===id);if(!p)throw Error('Unknown neighborhood');return visit(p);},globe:showGlobe};
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const tools=[
 {name:'read_korea_explorer',title:'Read explorer state',description:'Read the current globe or neighborhood, Korea time, and locally collected stars.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>window.sogeum.getState()},
 {name:'explore_korea_place',title:'Explore a Korean neighborhood',description:'Navigate the visible 3D explorer to a neighborhood or the globe. Does not collect a star.',inputSchema:{type:'object',properties:{place:{type:'string',enum:['globe',...places.map(p=>p.id)]}},required:['place'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||typeof input.place!=='string')throw Error('A place is required');if(input.place==='globe')showGlobe();else await window.sogeum.visit(input.place);return window.sogeum.getState();}},
 ];
 for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
