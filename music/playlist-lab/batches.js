/* Batch filters retain earlier votes and keep each audition's sequence separate. */
(function(root){
 function batches(tracks){
  const groups=new Map();
  for(const t of tracks){
   if(typeof t.batch_id!=='string'||!t.batch_id)continue;
   if(!groups.has(t.batch_id))groups.set(t.batch_id,{id:t.batch_id,name:t.batch_name||t.batch_id,count:0});
   groups.get(t.batch_id).count++;
  }
  return [...groups.values()].sort((a,b)=>b.id.localeCompare(a.id,undefined,{numeric:true}));
 }
 function visibleRows(tracks,filter,query=''){
  const q=query.toLowerCase(),batch=filter.startsWith('batch:')?filter.slice(6):null;
  const matches=t=>{
   if(batch)return t.batch_id===batch;
   if(filter==='all')return true;
   if(filter==='audition')return Boolean(t.audition_rank);
   if(filter==='needs-review')return t.vote==='unrated'||t.vote==='maybe';
   if(filter==='flagged')return Boolean(t.flags?.length);
   return t.vote===filter;
  };
  return tracks.filter(t=>matches(t)&&JSON.stringify([t.artist,t.title,t.style,t.album,t.artist_genres]).toLowerCase().includes(q))
   .sort((a,b)=>batch?(a.batch_rank||999)-(b.batch_rank||999):filter==='audition'?(a.audition_rank||999)-(b.audition_rank||999):0);
 }
 const api={batches,visibleRows};
 if(typeof module!=='undefined')module.exports=api;else root.GroveBatches=api;
})(typeof window==='undefined'?globalThis:window);
