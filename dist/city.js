// Real OpenStreetMap geometry becomes an intentionally stylized, explorable miniature.
export function buildCity(T, place, data) {
 const group=new T.Group(), geometries=new Set(), materials=new Set(), textures=new Set();
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const material=(color,extra={})=>mat(new T.MeshStandardMaterial({color,roughness:.9,...extra}));
 const boxGeo=geo(new T.BoxGeometry(1,1,1)),sphereGeo=geo(new T.IcosahedronGeometry(1,1)),cylinderGeo=geo(new T.CylinderGeometry(1,1,1,8));
 const S=.0075,R=4.6,TOP=.12,windowMatrices=[],traffic=[];
 let seed=place.id.split('').reduce((s,c)=>s+c.charCodeAt(0),19);
 const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const local=([lon,lat])=>new T.Vector2((lon-place.lon)*111320*Math.cos(place.lat*Math.PI/180)*S,-(lat-place.lat)*111320*S);
 const mesh=(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,parent=group)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const grass=material(0xb3bd91),earth=material(0xbea07b),edge=material(0xd9c29c),trunk=material(0xa28d62),treeMats=[material(0x839c70),material(0x9dab77),material(0xbdbe83),material(0x719c80)],roadMat=material(0x888f81),pavement=material(0xd5ccaf),lineMat=material(0xece4c7),roofMat=material(0x6d817a),water=material(0x80b0ae,{roughness:.36,metalness:.12}),sand=material(0xe6c995);
 const base=mesh(geo(new T.CylinderGeometry(R,R*.96,.3,96)),earth,0,-.16,0);base.receiveShadow=true;
 mesh(geo(new T.CylinderGeometry(R,R,.08,96)),edge,0,.025,0);
 mesh(geo(new T.CylinderGeometry(R-.04,R-.04,.07,96)),grass,0,.09,0);
 // Soft contact shade underneath the floating map tile.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,0,64,64,64);sg.addColorStop(0,'rgba(67,73,54,.25)');sg.addColorStop(.65,'rgba(67,73,54,.10)');sg.addColorStop(1,'rgba(67,73,54,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const st=new T.CanvasTexture(shadowCanvas);textures.add(st);const sm=mat(new T.MeshBasicMaterial({map:st,transparent:true,depthWrite:false}));const sh=mesh(geo(new T.PlaneGeometry(13,13)),sm,0,-.62,0);sh.rotation.x=-Math.PI/2;
 function clipCircle(points){let out=points;for(let i=0;i<64;i++){const a=(i+.5)/64*Math.PI*2,n=new T.Vector2(Math.cos(a),Math.sin(a)),limit=(R-.07)*Math.cos(Math.PI/64),next=[];for(let j=0;j<out.length;j++){const p=out[j],q=out[(j+1)%out.length],pd=p.dot(n)-limit,qd=q.dot(n)-limit;if(pd<=0)next.push(p);if((pd<=0)!==(qd<=0))next.push(p.clone().lerp(q,pd/(pd-qd)));}out=next;if(out.length<3)return [];}return out;}
 function surface(points,m,height=TOP+.008){const p=clipCircle(points);if(p.length<3)return null;const shape=new T.Shape(p.map(v=>new T.Vector2(v.x,-v.y)));const g=geo(new T.ShapeGeometry(shape)),o=mesh(g,m,0,height,0);o.rotation.x=-Math.PI/2;return o;}
 function strip(a,b,width,m,y=TOP+.015){const d=b.clone().sub(a),length=d.length();if(length<.001)return;const n=new T.Vector2(-d.y,d.x).multiplyScalar(width/(2*length));return surface([a.clone().add(n),b.clone().add(n),b.clone().sub(n),a.clone().sub(n)],m,y);}
 function pointIn(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
 const footprints=[];
 const shore=(data.coastline||[]).flatMap(c=>c.points.map(local)).filter(p=>Math.abs(p.x)<9).sort((a,b)=>a.x-b.x);
 function shoreY(x){if(!shore.length)return Infinity;let left=shore[0],right=shore[shore.length-1];for(let i=1;i<shore.length;i++)if(shore[i].x>=x){left=shore[i-1];right=shore[i];break;}return left.y+(right.y-left.y)*T.MathUtils.clamp((x-left.x)/Math.max(.001,right.x-left.x),0,1);}
 if(place.id==='haeundae'&&shore.length){const p=[...shore,new T.Vector2(9,8),new T.Vector2(-9,8)];surface(p,water,TOP+.01);(data.beaches||[]).forEach(b=>surface(b.points.map(local),sand,TOP+.02));for(let i=0;i<7;i++){const pts=[];for(let j=0;j<30;j++){const x=-4.8+j*.33,y=shoreY(x)+.25+i*.34;if(x*x+y*y<(R-.12)**2)pts.push(new T.Vector3(x,TOP+.027,y));}if(pts.length>1){const line=new T.Line(geo(new T.BufferGeometry().setFromPoints(pts)),mat(new T.LineBasicMaterial({color:0xd5e5d2,transparent:true,opacity:.45-i*.035})));group.add(line);}}}
 (data.water||[]).forEach(w=>{const p=w.points.map(local);if(w.type==='polygon')surface(p,water,TOP+.022);else for(let i=1;i<p.length;i++)strip(p[i-1],p[i],.10,water,TOP+.024);});
 const roadSegments=[];
 data.roads.forEach(r=>{const points=r.points.map(local);const major=['trunk','primary','secondary','trunk_link','primary_link','secondary_link'].includes(r.type);const minor=['footway','path','steps','pedestrian','cycleway'].includes(r.type);const width=major?.16:minor?.035:r.type==='tertiary'?.11:.063;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];strip(a,b,width+.045,pavement,TOP+.027);strip(a,b,width,minor?pavement:roadMat,TOP+.03);roadSegments.push({a,b,width});if(major){const len=a.distanceTo(b),d=b.clone().sub(a).normalize();for(let t=.07;t<len;t+=.16){strip(a.clone().addScaledVector(d,t),a.clone().addScaledVector(d,Math.min(len,t+.065)),.008,lineMat,TOP+.033);}if(len>.4&&a.length()<R-.3&&b.length()<R-.3&&traffic.length<22)traffic.push({a,b,len,t:random(),speed:.025+random()*.025});}}});
 const palette=[0xc6b99d,0xd2c4a9,0xbca78a,0xdad0b7,0xb2b9a0,0xc8b09b,0xaebcb4,place.color];
 const buildingMats=palette.map(c=>material(c));const windowDark=material(0x71908b,{roughness:.6});const roofEquipment=material(0x99a59a);
 const dummy=new T.Object3D();
 data.buildings.forEach((b,index)=>{
 if(/지하|Underground/i.test((b.name||'')+' '+(b.nameEn||'')))return;
 let poly=b.points.map(local);if(poly.length>1&&poly[0].distanceTo(poly[poly.length-1])<.00001)poly.pop();if(poly.length<3)return;
 let c=poly.reduce((s,p)=>s.add(p),new T.Vector2()).multiplyScalar(1/poly.length);if(c.length()>R-.15)return;
 if(place.id==='jonggak'){const anchor=local([126.98367885,37.56978835]);if(c.distanceTo(anchor)<.25)return;}
 const p=clipCircle(poly);if(p.length<3)return;footprints.push(p);
 const height=T.MathUtils.clamp(b.height*S,.055,1.65),shape=new T.Shape(p.map(v=>new T.Vector2(v.x,-v.y)));
 const geometry=geo(new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}));
 const color=buildingMats[index%buildingMats.length];const building=mesh(geometry,color,0,TOP+.034,0);building.rotation.x=-Math.PI/2;
 // Small parapets and rooftop equipment give the footprints a miniature character.
 const bounds=new T.Box2().setFromPoints(p),size=bounds.getSize(new T.Vector2());
 if(size.x>.13&&size.y>.13&&height>.2){mesh(boxGeo,roofEquipment,c.x,TOP+height+.052,c.y,Math.min(.09,size.x*.35),.045,Math.min(.08,size.y*.3));}
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=b.clone().sub(a),len=d.length();if(len<.065)continue;const n=new T.Vector2(-d.y,d.x).normalize();const angle=Math.atan2(-d.y,d.x);const cols=Math.max(1,Math.min(14,Math.floor(len/.065))),rows=Math.max(1,Math.min(15,Math.floor(height/.07)));for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){if(windowMatrices.length>16000)break;const t=(col+.5)/cols,at=a.clone().lerp(b,t).addScaledVector(n,.0015);dummy.position.set(at.x,TOP+.034+(row+.6)*height/(rows+.3),at.y);dummy.rotation.set(0,angle,0);dummy.scale.set(Math.min(.024,len/cols*.48),Math.min(.028,height/rows*.43),.003);dummy.updateMatrix();windowMatrices.push({matrix:dummy.matrix.clone(),lit:random()>.3});}}}
 });
 const windowsMat=mat(new T.MeshStandardMaterial({color:0x778d7c,roughness:.65,emissive:0xffcb78,emissiveIntensity:0}));
 const windows=new T.InstancedMesh(boxGeo,windowsMat,windowMatrices.length);windowMatrices.forEach(({matrix,lit},i)=>{windows.setMatrixAt(i,matrix);windows.setColorAt(i,new T.Color(lit?0xffdfa0:0x365c59));});windows.instanceMatrix.needsUpdate=true;windows.instanceColor.needsUpdate=true;group.add(windows);
 // Deterministically place tiny street trees in unbuilt gaps beside actual roads.
 const treeLocations=[];
 function tree(x,z,scale=1){const g=new T.Group();g.position.set(x,TOP,z);mesh(cylinderGeo,trunk,0,.07*scale,0,.014*scale,.14*scale,.014*scale,g);const crown=mesh(sphereGeo,treeMats[Math.floor(random()*treeMats.length)],0,.18*scale,0,.085*scale,.105*scale,.08*scale,g);crown.rotation.y=random()*6;group.add(g);}
 function treeAllowed(p){return p.length()<R-.16&&!footprints.some(f=>pointIn(p,f))&&!(place.id==='haeundae'&&p.y>shoreY(p.x)-.13);}
 for(let i=0;i<roadSegments.length&&treeLocations.length<200;i++){const {a,b,width}=roadSegments[i],d=b.clone().sub(a),len=d.length();if(len<.16)continue;const n=new T.Vector2(-d.y,d.x).normalize();for(let t=.12;t<len;t+=.28){if(treeLocations.length>=200)break;const p=a.clone().lerp(b,t/len).addScaledVector(n,(width*.5+.055)*(random()>.5?1:-1));if(treeAllowed(p)&&!treeLocations.some(q=>q.distanceTo(p)<.12)){tree(p.x,p.y,.75+random()*.45);treeLocations.push(p);}}}
 const carMats=[material(0xe7c995),material(0xf1e7cc),material(0x9cbbb1),material(0xbf8172),material(0xd8b964)];
 traffic.forEach((car,i)=>{const g=new T.Group();mesh(boxGeo,carMats[i%carMats.length],0,.021,0,.04,.036,.075,g);mesh(boxGeo,windowDark,0,.043,0,.03,.02,.038,g);group.add(g);car.mesh=g;});
 // A handful of recognisable, hand-built details around the actual landmark position.
 const red=material(0xa76c4c),tile=material(0x426c61),stone=material(0xe3cfaa),gold=material(0xdcb66b,{metalness:.2}),dark=material(0x526b5b);
 let landmarkPos=new T.Vector2(0,0),starHeight=1.1;
 function pavilion(){landmarkPos=local([126.98367885,37.56978835]);const g=new T.Group();g.position.set(landmarkPos.x,TOP+.035,landmarkPos.y);group.add(g);mesh(boxGeo,stone,0,.035,0,.55,.07,.38,g);for(const x of [-.19,0,.19])for(const z of [-.12,.12])mesh(cylinderGeo,red,x,.19,z,.016,.31,.016,g);mesh(boxGeo,red,0,.25,0,.46,.055,.31,g);
 function roof(y,w,d,h){const v=[-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,-w*.32,h,-d*.18,w*.32,h,-d*.18,w*.32,h,d*.18,-w*.32,h,d*.18];const rg=geo(new T.BufferGeometry());rg.setAttribute('position',new T.Float32BufferAttribute(v,3));rg.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5]);rg.computeVertexNormals();mesh(rg,tile,0,y,0,1,1,1,g);for(const x of [-w/2,w/2])mesh(sphereGeo,gold,x,y+.018,0,.018,.018,.018,g);}
 roof(.31,.64,.48,.10);for(const x of [-.13,.13])for(const z of [-.09,.09])mesh(cylinderGeo,red,x,.47,z,.012,.19,.012,g);roof(.54,.46,.36,.09);mesh(cylinderGeo,gold,0,.16,0,.054,.11,.054,g);starHeight=.98;}
 if(place.id==='jonggak')pavilion();
 else if(place.id==='haeundae'){landmarkPos=new T.Vector2(.4,shoreY(.4)+.22);starHeight=.8;for(let i=0;i<11;i++){const x=-2.2+i*.39,z=shoreY(x)-.15;if(x*x+z*z>18)continue;mesh(cylinderGeo,trunk,x,TOP+.1,z,.009,.2,.009);const umbrella=mesh(geo(new T.ConeGeometry(.09,.05,10)),i%2?stone:red,x,TOP+.21,z);umbrella.rotation.y=i;}}
 else {landmarkPos=new T.Vector2(.16,.18);const signGroup=new T.Group();signGroup.position.set(.16,TOP,.18);group.add(signGroup);mesh(cylinderGeo,dark,0,.17,0,.012,.34,.012,signGroup);mesh(boxGeo,place.id==='gangnam'?tile:gold,0,.35,0,.14,.07,.035,signGroup);starHeight=1.05;}
 // Landmark labels are real mapped names; the models remain illustrations.
 const signCanvas=document.createElement('canvas');signCanvas.width=768;signCanvas.height=128;const ctx=signCanvas.getContext('2d');ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.roundRect(2,2,764,124,36);ctx.fill();ctx.strokeStyle='#bbc4a3';ctx.lineWidth=3;ctx.stroke();ctx.font='500 37px sans-serif';ctx.fillStyle='#50674f';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(place.landmark,384,64);const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;textures.add(signTexture);const signMaterial=mat(new T.SpriteMaterial({map:signTexture,transparent:true,depthTest:false}));const sign=new T.Sprite(signMaterial);sign.position.set(landmarkPos.x,starHeight+.35,landmarkPos.y);sign.scale.set(1.65,.275,1);sign.renderOrder=5;group.add(sign);
 // Quiet compass letters on the rim keep orbiting geographically legible.
 const northCanvas=document.createElement('canvas');northCanvas.width=northCanvas.height=128;const nc=northCanvas.getContext('2d');nc.font='500 70px sans-serif';nc.textAlign='center';nc.fillStyle='#7b8f72';nc.fillText('N',64,91);const nt=new T.CanvasTexture(northCanvas);textures.add(nt);const nm=mat(new T.MeshBasicMaterial({map:nt,transparent:true,depthWrite:false}));const north=mesh(geo(new T.PlaneGeometry(.35,.35)),nm,0,.15,-R+.25);north.rotation.x=-Math.PI/2;
 return {group,starPosition:new T.Vector3(landmarkPos.x,starHeight,landmarkPos.y),
 setDaylight(day){windowsMat.emissiveIntensity=(1-day)*2.2;windowsMat.color.setHex(day>.5?0x778d7c:0xc5ac7e);water.color.setHex(day>.5?0x80b0ae:0x568888);},
 animate(t){traffic.forEach(car=>{const progress=(car.t+t*car.speed)%1,p=car.a.clone().lerp(car.b,progress),d=car.b.clone().sub(car.a).normalize(),n=new T.Vector2(-d.y,d.x);car.mesh.position.set(p.x+n.x*.035,TOP+.045,p.y+n.y*.035);car.mesh.rotation.y=Math.atan2(d.x,d.y);});},
 dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());windows.dispose();}
 };
}
