const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/review.html','utf8');
const actions=html.slice(html.indexOf('async function post('),html.indexOf('async function load('));
function page(response,{fail=false}={}){
 const elements={status:{textContent:''},reason:{value:'my note'},advance:{checked:false}};
 const state={tracks:[{id:'a',vote:'up',personal_vote:'unrated',reason:''}],selected:'a',csrf:'token',busy:false,
  drafts:new Map([['a','my note']]),el:id=>elements[id],calls:[],renders:0,
  visible:()=>state.tracks,setBusy:value=>{state.busy=value},render:()=>{state.renders++},
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
