import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {stripGeometry,flatGeometry,combine,project,sunDirection} from '../dist/geo.js';

for(const points of [[[0,0],[0,1]],[[0,0],[1,0]],[[0,0],[1,1],[2,1]]]){
  const g=stripGeometry(points.map(p=>new THREE.Vector2(...p)),.1,.02);
  const normals=g.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.99,'Street and riverbank faces must face the camera above ground.');
}
const square=[[0,0],[0,1],[1,1],[1,0]].map(p=>new THREE.Vector2(...p));
const surface=flatGeometry(square,.016),combined=combine([surface]);
for(let i=0;i<combined.getAttribute('position').count;i++){
  assert(Math.abs(combined.getAttribute('position').getY(i)-.016)<1e-5);
  assert(combined.getAttribute('normal').getY(i)>.99);
}
assert(project([126.88,37.48]).x>project([126.87,37.48]).x);
assert(project([126.87,37.49]).y<project([126.87,37.48]).y);
assert(sunDirection(new Date('2026-09-13T03:30:00Z')).altitude>.8);
assert(sunDirection(new Date('2026-09-13T15:30:00Z')).altitude<-.8);
assert(sunDirection(new Date('2026-09-13T00:00:00Z')).vector.x>0);
assert(sunDirection(new Date('2026-09-13T08:00:00Z')).vector.x<0);
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/corridor.json',import.meta.url)));
assert(data.features.filter(f=>f.tags.building).length>2000);
assert(data.features.some(f=>f.tags.name==='안양천'&&f.tags.natural==='water'));
for(const f of data.features)for(const [lon,lat]of f.points){assert(Number.isFinite(lon)&&Number.isFinite(lat));assert(lon>=126.8579999&&lon<=126.8920001&&lat>=37.4689999&&lat<=37.4920001);}
const korea=JSON.parse(fs.readFileSync(new URL('../dist/data/korea.geojson',import.meta.url)));
assert(korea.geometry.coordinates.length>30);
console.log('Passed: upward map surfaces, batched geometry, geographic axes and bounds, continuous river data, detailed coastline, solar day/night and sun direction.');
