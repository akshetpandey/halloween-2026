const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/review.html','utf8');
const actions=html.slice(html.indexOf('async function post('),html.indexOf('async function load('));
function page(response,{fail=false}={}){
 const elements={status:{textContent:''},reason:{value:'my note'},advance:{checked:false}};
 const state={tracks:[{id:'a',vote:'up',personal_vote:'unrated',reason:''}],selected:'a',csrf:'token',busy:false,
  drafts:new Map([['a','my note']]),el:id=>elements[id],calls:[],renders:0,
  visible:()=>state.tracks,setBusy:value=>{state.busy=value},render:()=>{state.renders++},
  updateBatchFilters:()=>{state.filterUpdates=(state.filterUpdates||0)+1},
  player:{pause(){}},selectTrack:()=>assert.fail('unexpected advance'),
  fetch:async(url,request)=>{state.calls.push({url,body:JSON.parse(request.body)});if(fail)throw new Error('offline');
   return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({saved:true,track:response})}}};
 vm.createContext(state);vm.runInContext(actions,state);return {state,elements};
}
test('voting uses the returned shared result rather than an optimistic personal vote',async()=>{
 const {state,elements}=page({id:'a',vote:'down',personal_vote:'up',vote_origin:'host',reason:'my note'});
 await state.vote('up');assert.equal(state.tracks[0].vote,'down');assert.equal(state.tracks[0].personal_vote,'up');
 assert.equal(state.calls[0].body.review_version,2);assert.match(elements.status.textContent,/host’s choice remains shared/);
 assert.equal(state.busy,false);
 assert.equal(state.filterUpdates,1);assert.equal(state.renders,1);
});
test('individual votes identify people and escape their display identifiers',()=>{
 const context={};vm.createContext(context);
 const escaping=html.slice(html.indexOf('const esc='),html.indexOf('const allowedLink='));
 const renderer=html.slice(html.indexOf('function voteBreakdown('),html.indexOf('function audioSummary('));
 vm.runInContext(escaping+renderer,context);
 const result=context.voteBreakdown({has_disagreement:true,votes_by_person:[
  {reviewer:'host@example.test',role:'host',is_you:true,vote:'down'},
  {reviewer:'<img src=x onerror=alert(1)>@example.test',role:'reviewer',is_you:false,vote:'up'}]});
 assert.match(result,/You \(host\)/);assert.match(result,/<strong>Cut<\/strong>/);assert.match(result,/<strong>Keep<\/strong>/);
 assert.match(result,/Disagreement/);assert(!result.includes('<img'));
});
test('a disagreement deep link retains its room and removes the old batch',()=>{
 const context={URL,location:{href:'https://review.example/?room=living-room&batch=15'},
  el:id=>({value:id==='room'?'living-room':'disagreements'}),history:{replaceState(_a,_b,url){context.url=url.href}}};
 vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function saveView()'),html.indexOf('function updateBatchFilters()')),context);
 context.saveView();const url=new URL(context.url);
 assert.equal(url.searchParams.get('filter'),'disagreements');assert.equal(url.searchParams.get('room'),'living-room');
 assert.equal(url.searchParams.has('batch'),false);
});
test('saving a note uses its own endpoint without voting on the shared choice',async()=>{
 const {state}=page({id:'a',vote:'up',personal_vote:'unrated',vote_origin:'reviewer',reason:'my note'});
 await state.saveNote();assert.equal(state.calls[0].url,'/api/note');assert.equal('vote' in state.calls[0].body,false);
 assert.equal(state.tracks[0].personal_vote,'unrated');assert.equal(state.drafts.has('a'),false);
});
test('a failed save retains both the draft and previous shared decision',async()=>{
 const {state,elements}=page(null,{fail:true});await state.vote('down');
 assert.equal(state.tracks[0].vote,'up');assert.equal(state.drafts.get('a'),'my note');
 assert.match(elements.status.textContent,/Save failed/);assert.equal(state.busy,false);
});
