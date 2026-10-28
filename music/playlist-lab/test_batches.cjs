const test=require('node:test'),assert=require('node:assert/strict');
const {batches,visibleRows,voteSummary}=require('./batches.js');
const rows=[{id:'old',artist:'Old',vote:'down',audition_rank:1},{id:'b',artist:'Bravo',vote:'unrated',batch_id:'02',batch_name:'New batch',batch_rank:2},{id:'a',artist:'Alpha',vote:'up',batch_id:'02',batch_name:'New batch',batch_rank:1}];
test('batch contains only new tracks, in audition order, without changing feedback',()=>{const before=JSON.stringify(rows);assert.deepEqual(visibleRows(rows,'batch:02').map(t=>t.id),['a','b']);assert.equal(JSON.stringify(rows),before);assert.deepEqual(visibleRows(rows,'audition').map(t=>t.id),['old']);assert.deepEqual(visibleRows(rows,'up').map(t=>t.id),['a']);});
test('batch search and unavailable batch cannot leak unrelated tracks',()=>{assert.deepEqual(visibleRows(rows,'batch:02','bravo').map(t=>t.id),['b']);assert.deepEqual(visibleRows(rows,'batch:03'),[]);});
test('latest batch comes first and reports its own count',()=>{assert.deepEqual(batches([...rows,{batch_id:'10',batch_name:'Later'}]),[{id:'10',name:'Later',count:1},{id:'02',name:'New batch',count:2}]);});
test('needs review contains only undecided tracks; editorial flags remain separate',()=>{
 const flagged=[{id:'cut',artist:'Cut',vote:'down',flags:['artist concentration']},{id:'keep',artist:'Keep',vote:'up',flags:['version question']},{id:'pending',artist:'Pending',vote:'maybe',flags:[]},{id:'new',artist:'New',vote:'unrated'}];
 assert.deepEqual(visibleRows(flagged,'needs-review').map(t=>t.id),['pending','new']);
 assert.deepEqual(visibleRows(flagged,'flagged').map(t=>t.id),['cut','keep']);
});
test('room filters isolate batches, review queues and artist searches; legacy rows are living room',()=>{
 const mixed=[...rows,{id:'rave',artist:'Alpha',room:'bedroom',vote:'unrated',batch_id:'hollow-01',batch_name:'The Hollow 01',batch_rank:1}];
 assert.deepEqual(visibleRows(mixed,'all','','bedroom').map(t=>t.id),['rave']);
 assert.deepEqual(visibleRows(mixed,'needs-review','','living-room').map(t=>t.id),['b']);
 assert.deepEqual(visibleRows(mixed,'batch:hollow-01','','living-room'),[]);
 assert.deepEqual(visibleRows(mixed,'all','alpha','living-room').map(t=>t.id),['a']);
 assert.deepEqual(batches(mixed,'bedroom'),[{id:'hollow-01',name:'The Hollow 01',count:1}]);
 assert.deepEqual(batches(mixed,'living-room'),[{id:'02',name:'New batch',count:2}]);
});
test('shared filters use the resolved vote while the summary distinguishes your choice',()=>{
 const shared=[{id:'a',vote:'up',personal_vote:'unrated',vote_origin:'reviewer'},
  {id:'b',vote:'down',personal_vote:'up',vote_origin:'host'},
  {id:'c',vote:'unrated',personal_vote:'unrated',vote_origin:'none'}];
 assert.deepEqual(visibleRows(shared,'up').map(t=>t.id),['a']);
 assert.deepEqual(visibleRows(shared,'needs-review').map(t=>t.id),['c']);
 assert.match(voteSummary(shared[0]),/Shared: Keep \(reviewer\) · Your vote: Unrated/);
 assert.match(voteSummary(shared[1]),/Shared: Cut \(host\) · Your vote: Keep/);
 assert.match(voteSummary(shared[2]),/Reset mine removes only your choice/);
});
test('disagreements span batches but remain room- and search-scoped',()=>{
 const reviewed=[{id:'one',room:'living-room',artist:'Alpha',vote:'down',batch_id:'02',has_disagreement:true},
  {id:'two',room:'living-room',artist:'Bravo',vote:'up',batch_id:'15',has_disagreement:true},
  {id:'same',room:'living-room',artist:'Alpha',vote:'up',has_disagreement:false},
  {id:'pending',room:'living-room',artist:'Alpha',vote:'up'},
  {id:'hollow',room:'bedroom',artist:'Alpha',vote:'up',has_disagreement:true}];
 assert.deepEqual(visibleRows(reviewed,'disagreements','','living-room').map(t=>t.id),['one','two']);
 assert.deepEqual(visibleRows(reviewed,'disagreements','alpha','living-room').map(t=>t.id),['one']);
 assert.deepEqual(visibleRows(reviewed,'disagreements','','bedroom').map(t=>t.id),['hollow']);
});
