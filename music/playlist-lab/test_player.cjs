const test=require('node:test');const assert=require('node:assert/strict');
const Spotify=require('./player.js');const YouTube=Spotify.YouTube;
const A='spotify:track:'+'A'.repeat(22),B='spotify:track:'+'B'.repeat(22);
function fixture(){const events={},calls=[];const controller={addListener:(n,f)=>events[n]=f,pause:()=>calls.push('pause'),play:()=>calls.push('play'),loadEntity:u=>calls.push(u)};let mounts=0,ends=0;const p=new Spotify({element:{},onEnd:()=>ends++});const api={createController:(el,options,cb)=>{mounts++;cb(controller)}};return {p,api,events,calls,mounts:()=>mounts,ends:()=>ends};}
test('embed persists on unchanged track and same-track note/vote rerenders',()=>{const f=fixture();f.p.setTrack(A);f.p.attach(f.api);f.events.ready();f.calls.length=0;f.p.setTrack(A);assert.equal(f.mounts(),1);assert.deepEqual(f.calls,[])});
test('play requested before SDK ready starts only the latest selected track',()=>{const f=fixture();f.p.setTrack(A,true);f.p.attach(f.api);f.p.setTrack(B,true);f.events.ready();assert.equal(f.calls.at(-1),B);assert.ok(!f.calls.includes('play'));f.events.ready();assert.deepEqual(f.calls.slice(-2),[B,'play']);assert.equal(f.mounts(),1)});
test('late old-track end events cannot advance the new track',()=>{const f=fixture();f.p.setTrack(A);f.p.attach(f.api);f.events.ready();f.p.setTrack(B,true);f.events.ready();f.p.update({playingURI:A,isPaused:false,position:30000,duration:30000});assert.equal(f.ends(),0);f.p.update({playingURI:B,isPaused:false,position:1000,duration:30000});f.p.update({playingURI:B,isPaused:true,position:30000,duration:30000});f.p.update({playingURI:B,isPaused:true,position:30000,duration:30000});assert.equal(f.ends(),1)});
test('pause while SDK loads cancels pending autoplay',()=>{const f=fixture();f.p.setTrack(A,true);f.p.attach(f.api);f.p.pause();f.events.ready();assert.ok(!f.calls.includes('play'))});
test('unknown Spotify identity pauses instead of replaying previous track',()=>{const f=fixture();f.p.setTrack(A);f.p.attach(f.api);f.events.ready();f.p.setTrack(null,true);f.calls.length=0;f.p.play();assert.deepEqual(f.calls,[])});
test('YouTube cue does not autoplay; repeated renders keep iframe and playback',()=>{global.location={origin:'http://127.0.0.1:8767'};let options,mounts=0,current='aaaaaaaaaaa';const calls=[];const api={Player:class{constructor(el,o){options=o;mounts++}cueVideoById(v){current=v;calls.push(['cue',v])}loadVideoById(v){current=v;calls.push(['load',v])}pauseVideo(){calls.push(['pause'])}playVideo(){calls.push(['play'])}getVideoData(){return {video_id:current}}}};let ends=0,errors=[];const p=new YouTube({element:{},onEnd:()=>ends++,onUnavailable:(v,c)=>errors.push([v,c])});p.setTrack(current);p.attach(api);options.events.onReady();assert.deepEqual(calls,[['cue',current]]);calls.length=0;p.setTrack(current);assert.deepEqual(calls,[]);p.setTrack('bbbbbbbbbbb',true);assert.deepEqual(calls.slice(-1),[['load','bbbbbbbbbbb']]);options.events.onStateChange({data:1});options.events.onStateChange({data:0});options.events.onStateChange({data:0});assert.equal(ends,1);options.events.onError({data:150});assert.deepEqual(errors,[['bbbbbbbbbbb',150]]);assert.equal(mounts,1)});

test('every next-track ready completes navigation instead of reloading forever',()=>{
 const f=fixture();f.p.setTrack(A);f.p.attach(f.api);f.events.ready();
 for(const uri of [B,A,B]){
  f.calls.length=0;f.p.setTrack(uri,true);
  assert.deepEqual(f.calls,['pause',uri]);assert.equal(f.p.ready,false);
  f.events.ready();assert.deepEqual(f.calls,['pause',uri,'play']);
  f.events.ready();f.p.setTrack(uri);
  assert.deepEqual(f.calls,['pause',uri,'play']);
 }
});
test('rapid next presses wait for in-flight navigation then play only latest selection',()=>{
 const f=fixture(),C='spotify:track:'+'C'.repeat(22);
 f.p.setTrack(A);f.p.attach(f.api);f.events.ready();f.calls.length=0;
 f.p.setTrack(B,true);f.p.setTrack(C,true);
 assert.deepEqual(f.calls,['pause',B]); // Do not queue a stale pause inside Spotify's loading frame.
 f.events.ready();
 assert.ok(!f.calls.includes('play'));assert.equal(f.calls.at(-1),C);
 f.events.ready();assert.deepEqual(f.calls.slice(-2),[C,'play']);
});
test('pause during next-track navigation cancels play on ready',()=>{
 const f=fixture();f.p.setTrack(A);f.p.attach(f.api);f.events.ready();f.calls.length=0;
 f.p.setTrack(B,true);f.p.pause();f.events.ready();
 assert.ok(!f.calls.includes('play'));assert.equal(f.calls.filter(c=>c===B).length,1);
});
