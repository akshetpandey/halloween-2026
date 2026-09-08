const test=require('node:test'),assert=require('node:assert/strict');
const {batches,visibleRows}=require('./batches.js');
const rows=[{id:'old',artist:'Old',vote:'down',audition_rank:1},{id:'b',artist:'Bravo',vote:'unrated',batch_id:'02',batch_name:'New batch',batch_rank:2},{id:'a',artist:'Alpha',vote:'up',batch_id:'02',batch_name:'New batch',batch_rank:1}];
test('batch contains only new tracks, in audition order, without changing feedback',()=>{const before=JSON.stringify(rows);assert.deepEqual(visibleRows(rows,'batch:02').map(t=>t.id),['a','b']);assert.equal(JSON.stringify(rows),before);assert.deepEqual(visibleRows(rows,'audition').map(t=>t.id),['old']);assert.deepEqual(visibleRows(rows,'up').map(t=>t.id),['a']);});
test('batch search and unavailable batch cannot leak unrelated tracks',()=>{assert.deepEqual(visibleRows(rows,'batch:02','bravo').map(t=>t.id),['b']);assert.deepEqual(visibleRows(rows,'batch:03'),[]);});
test('latest batch comes first and reports its own count',()=>{assert.deepEqual(batches([...rows,{batch_id:'10',batch_name:'Later'}]),[{id:'10',name:'Later',count:1},{id:'02',name:'New batch',count:2}]);});
