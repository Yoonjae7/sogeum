import assert from 'node:assert/strict';
import {makeRoadRouter,samplePath} from '../dist/bus-motion.js';
const route=makeRoadRouter([[[0,0],[0,1],[1,1]],[[2,0],[2,1]]]);
const path=route([0,.2],[.8,1]);assert(path&&path.length>2,'Connected road path exists');
for(let i=0;i<=20;i++){const p=samplePath(path,i/20).point;assert(Math.abs(p[0])<1e-8||Math.abs(p[1]-1)<1e-8,'Interpolation follows the corner, not a straight shortcut');}
assert.deepEqual(samplePath(path,0).point,[0,.2]);assert.deepEqual(samplePath(path,1).point,[.8,1]);
assert.equal(route([0,.3],[2,.3]),null,'Disconnected streets do not create a fictional motion path');
assert.equal(route([0,0],[10,10]),null,'Large GPS jumps are not animated');
console.log('Passed: road-following bus interpolation, exact endpoints, disconnected roads and GPS jumps.');
