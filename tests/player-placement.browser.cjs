// Fixtures mirror the supplied bar: Lyrics, Queue, Connect, volume, Miniplayer, Full screen.
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function verifyPlayerPlacement(browser, source, captureDirectory) {
  const results = [];
  const measurements = [];
  const check = (value, label) => {
    if (!value) throw new Error(label);
    results.push(label);
  };
  if (captureDirectory) fs.mkdirSync(captureDirectory, { recursive: true });
  const fixture = `<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;background:#121212;color:white;font:14px Arial;height:100vh}
    header{display:flex;justify-content:space-between;align-items:center;height:64px;padding:0 16px;background:#000}
    .logo{display:grid;place-items:center;background:white;color:black;border-radius:50%;width:32px;height:32px;text-decoration:none}
    .account{display:flex;align-items:center;gap:20px}.avatar-wrap{width:40px;height:40px}
    .avatar{display:block;width:40px;height:40px;border-radius:50%;border:5px solid #252525;background:#e2b88b;color:black}
    header a{color:#b3b3b3;text-decoration:none}main{padding:48px;color:#b3b3b3}main h1{color:white}
    footer{position:fixed;left:0;right:0;bottom:0;height:90px;background:#000;display:flex;align-items:center;padding:12px 16px}
    .now-playing{width:30%;display:flex;gap:16px;align-items:center;min-width:0}
    .art{width:56px;height:56px;background:#634a42;border-radius:3px;display:grid;place-items:center;color:#e0ccc0;font-size:10px;flex:none}
    .track-text{min-width:0}.track-text a{display:block;color:white;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track-text small{display:block;color:#b3b3b3;margin-top:5px}
    .player-controls{position:absolute;left:50%;transform:translateX(-50%);width:40%;height:60px;text-align:center}
    .transport{display:flex;align-items:center;justify-content:center;gap:18px;height:36px}.progress{display:flex;align-items:center;gap:8px;color:#b3b3b3;font-size:11px;margin-top:9px}.progress i{flex:1;height:4px;background:#454545;border-radius:4px}.progress i::before{content:'';display:block;height:4px;width:50%;background:white;border-radius:4px}
    .utilities{margin-left:auto;display:flex;align-items:center;height:40px;gap:0}
    button{font:inherit;cursor:pointer}footer button{color:#b3b3b3;background:transparent;border:0;width:32px;height:32px;display:grid;place-items:center;padding:6px;border-radius:4px}footer button:hover{color:white;background:#282828}svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.play{width:32px;height:32px;border-radius:50%;background:white;color:black;font-size:18px}.queue{color:#1ed760;position:relative}.queue::after{content:'';position:absolute;bottom:-2px;width:4px;height:4px;background:currentColor;border-radius:50%}.volume{display:flex;align-items:center}.volume input{width:92px;height:4px;accent-color:white;margin:0 4px}
    @media(max-width:1100px){.player-controls{width:32%}}
    @media(max-width:900px){.volume input{display:none}.track-text small{max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
    @media(max-width:650px){.extra{display:none}.player-controls{width:30%}.transport{gap:0}.transport .secondary{display:none}.now-playing{width:30%;gap:8px}.art{width:38px;height:38px}.track-text small{display:none}.track-text a{font-size:12px}}
  </style></head><body><header data-testid="global-nav"><a class="logo" href="https://open.spotify.com/" aria-label="Spotify">S</a><div class="account"><a href="/download">Install App</a><button aria-label="Notifications">♧</button><div class="avatar-wrap"><button class="avatar" data-testid="user-widget-link" aria-label="Account">JD</button></div></div></header>
  <main><h1>Player placement verification</h1><p>History must preserve the account avatar and every native player control.</p></main>
  <footer data-testid="now-playing-bar"><div class="now-playing" data-testid="now-playing-widget"><div class="art" aria-hidden="true">AREPA<br>3000</div><div class="track-text"><div data-testid="context-item-info-title"><a href="https://open.spotify.com/track/Track1">Qué Rico</a></div><small><a href="https://open.spotify.com/artist/Artist1">Los Amigos Invisibles</a></small></div></div>
  <div class="player-controls" data-testid="player-controls"><div class="transport"><button class="secondary" aria-label="Shuffle">⤨</button><button aria-label="Previous track">◀</button><button class="play" aria-label="Play">▶</button><button aria-label="Next track">▶</button><button class="secondary" aria-label="Repeat">▱</button></div><div class="progress" role="slider" aria-label="Playback progress" tabindex="0"><span>1:55</span><i></i><span>3:48</span></div></div>
  <div class="utilities"><button class="lyrics extra" aria-label="Lyrics"><svg viewBox="0 0 24 24"><path d="m5 16-2 5 5-2L20 7a3 3 0 0 0-4-4zM14 5l5 5"/></svg></button><button class="queue" data-testid="control-button-queue" aria-label="Queue"><svg viewBox="0 0 24 24"><path d="M3 4h17v5H3zM3 14h17M3 19h17"/></svg></button><button class="extra" aria-label="Connect to a device"><svg viewBox="0 0 24 24"><path d="M6 3H3v18h3M20 3h-9v18h9z"/><circle cx="15.5" cy="16" r="1"/></svg></button><div class="volume"><button aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M3 9h4l5-5v16l-5-5H3zm12-2a7 7 0 0 1 0 10"/></svg></button><input aria-label="Volume" type="range" value="100"></div><button class="extra" aria-label="Open Miniplayer"><svg viewBox="0 0 24 24"><path d="M20 9V4H3v15h7m3-8h9v10h-9z"/></svg></button><button class="extra" aria-label="Full screen"><svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button></div></footer></body></html>`;
  const cases = [
    ...[1440,1200,1024,900,600,420,360].map(width=>({name:`width-${width}`,width})),
    {name:'no-lyrics',width:1440,remove:'.lyrics'},
    {name:'no-queue',width:1440,remove:'.queue'},
    {name:'no-player',width:1440,remove:'footer'},
    {name:'spanish-500',width:1200,language:'es-ES',count:500},
    {name:'portuguese-500',width:420,language:'pt-BR',count:500},
    {name:'hidden-fullscreen-player',width:1440,fullscreen:true},
    {name:'faded-fullscreen-player',width:1440,fullscreen:true,fade:true},
    {name:'compact-player',width:1440,footerHeight:77},
    {name:'tall-player',width:1440,footerHeight:114},
    {name:'short-window',width:900,height:400},
    {name:'nested-avatar-no-install',width:1440,remove:'a[href="/download"]'},
    {name:'floating-wide',width:1440,position:'floating'},
    {name:'floating-narrow',width:360,position:'floating'},
    {name:'header-wide',width:1440,position:'header'},
    {name:'header-narrow',width:360,position:'header'},
    {name:'header-no-install',width:1440,position:'header',remove:'a[href="/download"]'},
    {name:'header-unavailable',width:1440,position:'header',remove:'header'},
    {name:'header-spanish-500',width:1440,position:'header',language:'es-ES',count:500},
    {name:'invalid-saved-position',width:1440,position:'invalid'}
  ];
  const reference = captureDirectory && path.join(captureDirectory,'reference-player.png');
  if(reference && fs.existsSync(reference))cases.push({name:'supplied-bar',width:1440,footerHeight:77,reference:true});
  for (const scenario of cases) {
    const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height||800}});
    try {
      await page.setContent(fixture);
      if(scenario.footerHeight)await page.locator('footer').evaluate((footer,height)=>footer.style.height=height+'px',scenario.footerHeight);
      if(scenario.reference){
        await page.locator('footer').evaluate((footer,image)=>{
          footer.style.backgroundImage=`url("${image}")`;
          footer.style.backgroundSize='100% 100%';
          for(const child of footer.children)child.style.opacity='0';
        },'data:image/png;base64,'+fs.readFileSync(reference).toString('base64'));
      }
      if (scenario.remove) await page.locator(scenario.remove).evaluate(element=>element.remove());
      if (scenario.fullscreen) await page.evaluate(fade=>{
        document.querySelector('footer').style[fade?'opacity':'display']=fade?'0':'none';
        Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.body});
      },scenario.fade);
      const nativeGeometry=()=>page.evaluate(()=>[...document.querySelectorAll('header a,header button,footer button,footer input,.player-controls,.now-playing')].map(element=>{
        const rect=element.getBoundingClientRect();return {label:element.getAttribute('aria-label')||element.className,x:rect.x,y:rect.y,width:rect.width,height:rect.height};
      }));
      const before=await nativeGeometry();
      await page.evaluate(({source,language,count,position})=>{
        const key='spotify-web-local-queue-history-v1';
        const records=Array.from({length:count||0},(_,index)=>({id:'Track'+index,name:'Previously played '+index,artist:'Artist',url:'https://open.spotify.com/track/Track'+index,startedAt:Date.now()-120000*(index+1),endedAt:Date.now()-120000*index}));
        const values=new Map([[key,JSON.stringify(records)],[key+'-limit','500']]);
        if(position)values.set(key+'-position',position);
        Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}});
        Object.defineProperty(navigator,'language',{configurable:true,value:language||'en-US'});
        window.setInterval=callback=>{window.__historyTick=callback;return 1};
        (0,eval)(source);
      },{source,language:scenario.language,count:scenario.count,position:scenario.position});
      check(JSON.stringify(before)===JSON.stringify(await nativeGeometry()),`${scenario.name}: injection leaves avatar and native player geometry unchanged`);
      const trigger=page.locator('#swh-root .trigger');
      check(await trigger.evaluate(button=>button.getRootNode()===document.querySelector('#swh-root').shadowRoot),`${scenario.name}: trigger keeps its own shadow-root styles`);
      if(scenario.fullscreen){
        check(await trigger.isHidden(),`${scenario.name}: auto-hidden fullscreen playback does not gain a floating overlay`);
        continue;
      }
      const geometry=await page.evaluate(()=>{
        const shadow=document.querySelector('#swh-root').shadowRoot;
        const trigger=shadow.querySelector('.trigger'),r=trigger.getBoundingClientRect();
        const footer=document.querySelector('footer'),f=footer?.getBoundingClientRect();
        const blockers=[...document.querySelectorAll('header a,header button,header input,footer button,footer input,.player-controls,.now-playing')].map(element=>element.getBoundingClientRect()).filter(rect=>rect.width&&rect.height);
        const overlap=blockers.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top);
        return {mode:trigger.classList.contains('header-trigger')?'header':trigger.classList.contains('player-trigger')?'player':'floating',x:r.x,y:r.y,width:r.width,height:r.height,overlap,inViewport:r.left>=8&&r.right<=innerWidth-8&&r.top>=8&&r.bottom<=innerHeight-8,footerTop:f?.top,
          iconOnly:getComputedStyle(shadow.querySelector('.trigger-label')).display==='none'&&(!shadow.querySelector('.trigger-count')||getComputedStyle(shadow.querySelector('.trigger-count')).display==='none')};
      });
      measurements.push({case:scenario.name,...geometry});
      check(!geometry.overlap&&geometry.inViewport,`${scenario.name}: History does not overlap native controls or leave the viewport`);
      if(scenario.name==='width-1440'||scenario.name==='no-lyrics')check(geometry.mode==='player',`${scenario.name}: free space uses the player clock`);
      if(scenario.name==='no-queue'||scenario.name==='no-player'||scenario.name==='width-1024')check(geometry.mode==='floating',`${scenario.name}: unavailable player slot uses the floating icon`);
      if(geometry.mode==='player')check(geometry.width===40&&geometry.height===40,`${scenario.name}: clock has a stable 40px target`);
      if(geometry.mode!=='header')check(geometry.iconOnly&&geometry.width===40&&geometry.height===40,`${scenario.name}: player and floating positions are icon-only`);
      if(scenario.name.startsWith('floating-'))check(geometry.mode==='floating',`${scenario.name}: saved floating preference skips the player slot`);
      if(['header-wide','header-no-install','header-spanish-500'].includes(scenario.name))check(geometry.mode==='header'&&!geometry.iconOnly,`${scenario.name}: saved top-bar preference uses the text button without moving the avatar`);
      if(['header-narrow','header-unavailable'].includes(scenario.name))check(geometry.mode==='floating',`${scenario.name}: unsafe top-bar placement falls back to an icon`);
      if(scenario.reference)await page.locator('footer').screenshot({path:path.join(captureDirectory,'supplied-bar-with-history.png')});
      await trigger.focus();await page.keyboard.press('Enter');
      check(await page.locator('#swh-root .search').evaluate(element=>element===element.getRootNode().activeElement),`${scenario.name}: keyboard opening focuses Search`);
      const bounds=await page.locator('#swh-root .panel').boundingBox();
      check(bounds.x>=8&&bounds.x+bounds.width<=scenario.width-8&&bounds.y>=8&&bounds.y+bounds.height<=Math.min(scenario.height||800,geometry.footerTop??(scenario.height||800))+1,`${scenario.name}: panel fits above playback and inside the viewport`);
      await page.keyboard.press('Escape');
      check(await trigger.evaluate(element=>element===element.getRootNode().activeElement)&&await page.locator('#swh-root .panel').isHidden(),`${scenario.name}: Escape restores the opener`);
      await trigger.click();
      if(scenario.position){
        await page.locator('#swh-root .settings-toggle').click();
        check(await page.locator('#swh-root .position-setting select').inputValue()===(scenario.position==='invalid'?'player':scenario.position),`${scenario.name}: settings retain the selected preference even during fallback`);
      }
      if(captureDirectory&&['width-1440','width-1024','width-420','no-lyrics','no-queue','spanish-500','short-window','floating-wide','header-wide','header-no-install','header-narrow','header-spanish-500'].includes(scenario.name)){
        await trigger.evaluate(element=>element.blur());
        await page.screenshot({path:path.join(captureDirectory,scenario.name+'.png')});
      }
      await page.evaluate(()=>window.__historyTick());
      check(JSON.stringify(before)===JSON.stringify(await nativeGeometry()),`${scenario.name}: polling and panel opening preserve every native control`);
      if(scenario.name==='width-1440'){
        await page.evaluate(()=>{document.querySelector('footer').outerHTML=document.querySelector('footer').outerHTML;window.__historyTick()});
        check(await page.locator('#swh-root .trigger.player-trigger').isVisible()&&await page.locator('#swh-root .trigger').count()===1,'Player rerender repositions one isolated History trigger');
        await page.locator('.queue').evaluate(element=>element.style.display='none');
        await page.evaluate(()=>window.__historyTick());
        check(!await trigger.evaluate(element=>element.classList.contains('player-trigger')),'Queue disappearing changes to the floating fallback');
        await page.locator('.queue').evaluate(element=>element.style.display='');
        await page.evaluate(()=>window.__historyTick());
        check(await trigger.evaluate(element=>element.classList.contains('player-trigger')),'Queue returning restores the player clock');
      }
      if(scenario.name==='floating-wide'){
        await page.evaluate(()=>{
          const key='spotify-web-local-queue-history-v1-position';
          localStorage.setItem(key,'header');
          window.dispatchEvent(new StorageEvent('storage',{key}));
        });
        check(await trigger.evaluate(element=>element.classList.contains('header-trigger'))&&await page.locator('#swh-root .position-setting select').inputValue()==='header',
          'Position storage events synchronize the trigger and settings');
      }
      if(scenario.name==='header-wide'){
        const reply=await page.evaluate(()=>new Promise(resolve=>{
          const id='position-import-check';
          const receive=event=>{const reply=JSON.parse(event.detail);if(reply.id===id){window.removeEventListener('swh-extension-response',receive);resolve(reply)}};
          window.addEventListener('swh-extension-response',receive);
          const now=Date.now();
          const tracks=Array.from({length:500},(_,index)=>({id:'Imported'+index,name:'Imported '+index,artist:'Artist',startedAt:now-index*1000,endedAt:now-index*1000+500}));
          window.dispatchEvent(new CustomEvent('swh-extension-request',{detail:JSON.stringify({id,action:'import',json:JSON.stringify(tracks)})}));
        }));
        check(!reply.error&&reply.snapshot.history.length===500,'Position setting does not change import or retention behavior');
        const countPlacement=await trigger.evaluate(element=>{
          const a=element.getBoundingClientRect(),b=document.querySelector('a[href="/download"]').getBoundingClientRect();
          return {gap:b.left-a.right,mode:element.className};
        });
        check(countPlacement.gap>=8&&countPlacement.mode.includes('header-trigger'),`Top-bar count growth remeasures the slot before overlapping native controls: ${JSON.stringify(countPlacement)}`);
      }
    } finally {await page.close()}
  }
  if(captureDirectory)fs.writeFileSync(path.join(captureDirectory,'verification.json'),JSON.stringify({checks:results.length,measurements,results},null,2)+'\n');
  return results;
};
