/* One persistent Spotify embed. No account tokens are sent to the browser. */
(function(root){
  class GrovePlayer {
    constructor({element,onStatus=()=>{},onEnd=()=>{}}){
      this.element=element;this.onStatus=onStatus;this.onEnd=onEnd;
      this.api=null;this.controller=null;this.uri=null;this.creating=false;
      this.ready=false;this.pendingPlay=false;this.playing=false;this.heard=false;this.ended=false;
    }
    attach(api){this.api=api;this.mount();}
    mount(){
      if(!this.api||!this.uri||this.controller||this.creating)return;
      this.creating=true;const initial=this.uri;
      this.api.createController(this.element,{uri:initial,width:'100%',height:152},controller=>{
        this.controller=controller;
        controller.addListener('ready',()=>{
          this.ready=true;
          if(this.uri!==initial&&this.uri)this.load();
          else if(this.pendingPlay){this.pendingPlay=false;controller.play();}
          this.onStatus('Player ready. Press Play to begin.');
        });
        controller.addListener('playback_update',e=>this.update(e.data||{}));
      });
    }
    setTrack(uri,autoplay=false){
      if(!/^spotify:track:[A-Za-z0-9]{22}$/.test(uri||'')){
        this.pause();this.uri=null;this.onStatus('This track needs an exact Spotify version before it can play here.');return;
      }
      if(uri===this.uri){if(autoplay)this.play();return;}
      this.controller?.pause();this.uri=uri;this.playing=false;this.heard=false;this.ended=false;
      this.pendingPlay=autoplay;
      this.onStatus(autoplay?'Loading next track…':'Press Play to listen here.');
      if(this.ready)this.load();else this.mount();
    }
    load(){
      if(!this.uri)return;
      // loadEntity is the current API; loadUri supports earlier deployed versions.
      const method=this.controller.loadEntity||this.controller.loadUri;
      method.call(this.controller,this.uri);
      if(this.pendingPlay){this.pendingPlay=false;this.controller.play();}
    }
    play(){
      if(!this.uri)return;
      this.pendingPlay=true;
      if(this.ready){this.pendingPlay=false;this.controller.play();}
    }
    pause(){this.pendingPlay=false;this.playing=false;this.controller?.pause();}
    toggle(){if(this.playing)this.pause();else this.play();}
    update(data){
      // Ignore late events from the previous track, especially its end event.
      if(!this.uri||data.playingURI!==this.uri)return;
      this.playing=!data.isPaused&&!data.isBuffering;
      if(this.playing&&data.position>0)this.heard=true;
      const duration=Number(data.duration),position=Number(data.position);
      if(duration>0){
        const format=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');
        this.onStatus(`${this.playing?'Playing':'Paused'} · ${format(position)} / ${format(duration)}${duration<=31000?' · Spotify preview':''}`);
      }
      if(this.heard&&!this.ended&&!data.isBuffering&&duration>0&&position>=duration-200){
        this.ended=true;this.playing=false;this.onEnd();
      }
    }
  }
  if(typeof module!=='undefined')module.exports=GrovePlayer;
  else root.GrovePlayer=GrovePlayer;
})(typeof window==='undefined'?globalThis:window);

(function(root){
  class GroveYouTubePlayer {
    constructor({element,onStatus=()=>{},onEnd=()=>{},onUnavailable=()=>{}}){
      this.element=element;this.onStatus=onStatus;this.onEnd=onEnd;this.onUnavailable=onUnavailable;
      this.api=null;this.controller=null;this.video=null;this.ready=false;this.pendingPlay=false;this.playing=false;this.heard=false;
    }
    attach(api){this.api=api;this.mount();}
    mount(){
      if(!this.api||!this.video||this.controller)return;
      this.controller=new this.api.Player(this.element,{width:'100%',height:300,videoId:this.video,
        playerVars:{playsinline:1,origin:location.origin},events:{
          onReady:()=>{this.ready=true;this.load();},
          onStateChange:e=>{
            // Ignore callbacks for a video that has just been replaced.
            if(this.controller.getVideoData().video_id!==this.video)return;
            this.playing=e.data===1;
            if(this.playing){this.heard=true;this.onStatus('Playing YouTube video · use the timeline to hear a later section.');}
            if(e.data===2)this.onStatus('Paused');
            if(e.data===0&&this.heard){this.heard=false;this.onEnd();}
          },
          onError:e=>{this.pendingPlay=false;this.playing=false;this.onStatus(`YouTube cannot play this video here (${e.data}).`);this.onUnavailable(this.video,e.data);},
          onAutoplayBlocked:()=>this.onStatus('Press Play inside the YouTube player to allow playback.')
        }});
    }
    setTrack(video,autoplay=false){
      if(!/^[A-Za-z0-9_-]{11}$/.test(video||'')){this.pause();this.video=null;return;}
      if(video===this.video){if(autoplay)this.play();return;}
      this.pause();this.video=video;this.heard=false;this.pendingPlay=autoplay;
      this.onStatus(autoplay?'Loading next YouTube video…':'Press Play to listen here.');
      if(this.ready)this.load();else this.mount();
    }
    load(){
      if(!this.video)return;
      if(this.pendingPlay){this.pendingPlay=false;this.controller.loadVideoById(this.video);}
      else this.controller.cueVideoById(this.video);
    }
    play(){if(!this.video)return;this.pendingPlay=true;if(this.ready){this.pendingPlay=false;this.controller.playVideo();}}
    pause(){this.pendingPlay=false;this.playing=false;if(this.ready)this.controller.pauseVideo();}
    toggle(){if(this.playing)this.pause();else this.play();}
  }
  if(typeof module!=='undefined')module.exports.YouTube=GroveYouTubePlayer;
  else root.GroveYouTubePlayer=GroveYouTubePlayer;
})(typeof window==='undefined'?globalThis:window);
