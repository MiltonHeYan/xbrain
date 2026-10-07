import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLayout,settleLayout} from '../.build/client/graph/layout.js';
test('bounded network layout retains disconnected records and settles without overlapping or nonfinite positions',()=>{
 const nodes=Array.from({length:120},(_,i)=>({id:String(i),label:'Fixture '+i,type:i<30?'resource':'feature'}));
 const edges=Array.from({length:85},(_,i)=>({source:String(i%25),target:String(i+30)}));
 const layout=settleLayout(seedLayout(nodes,edges),edges);
 assert.equal(layout.length,120);assert.equal(new Set(layout.map(n=>n.id)).size,120);
 assert.ok(layout.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
 for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)assert.ok(Math.hypot(layout[i].x-layout[j].x,layout[i].y-layout[j].y)>layout[i].radius+layout[j].radius);
 assert.deepEqual(layout,settleLayout(seedLayout(nodes,edges),edges));
});
