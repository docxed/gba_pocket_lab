const BASE=0x08000000;
const le=(number,width)=>Array.from({length:width},(_,i)=>(number>>>(8*i))&255);
const enc={' ':0};
for(let i=0;i<26;i++){
  enc[String.fromCharCode(65+i)]=187+i;
  enc[String.fromCharCode(97+i)]=213+i;
}

export const soulGoldPatch={
  maxSize:32*1024*1024,
  profiles:[
    {
      title:'Soulgold\0\0\0\0',
      source:'2cbd389822d80db1b7575b4e064e155bcfdbe17d000b324076d99fa6f7a8804b',
      target:'9cc2de4679a7e1c2e79ca2ff2541e0835d6b08fa4c9c3ba484f16f8c6364bce3',
      callback:'00b5fff7c3ff0520fcf71afd5ef710fa01215ef76df95ef711fa012002bc0847',
      debugEntry:'bb2000b5064980008bf058fd0022054b1860054bc2540548fdf7d4ff01bc0047',
      normalBuilder:'1c48e7f645f8012804d13379f2180133147233711848e7f63bf83379012804d1f21801331b0610721b0e0221f2181172013312483371e7f62bf83379012805d10321f21801331b0611721b0e'
    },
    {
      title:'POKEMON EMER',
      source:'01a6af0953a68732579360988edd3338e5b24d2e48248f3239e851adf2557b31',
      target:'ace9e07650a857ff928dec1ebbaa23f7cfe9fa8cb387da655132e1e72c20e134',
      callback:'00b5fff7c3ff0520fcf71afd60f786fd012160f7affc60f787fd012002bc0847',
      debugEntry:'bb2000b5064980008bf036fb0022054b1860054bc2540548fdf7d4ff01bc0047',
      normalBuilder:'1c48e9f6bdfd012804d13379f2180133147233711848e9f6b3fd3379012804d1f21801331b0610721b0e0221f2181172013312483371e9f6a3fd3379012805d10321f21801331b0611721b0e'
    },
    {
      game:'soulgold-mega-xtream',
      title:'POKEMON EMER',
      source:'338f3bb39f3b315aaa6c3e358c0812c1a4e1e0f70e6d9e10f7ef857e9f5dde2f',
      target:'0033c4412a6926ac3b2a08b134102963af208e4a715ebabede707fbdadf4747d',
      callback:'00b5fff7c3ff0520fcf71afd60f724ff012160f74dfe60f725ff012002bc0847',
      debugEntry:'bb2000b5064980008bf036f90022054b1860054bc2540548fdf7d4ff01bc0047',
      normalBuilder:'1c48eaf65df9012804d13379f2180133147233711848eaf653f93379012804d1f21801331b0610721b0e0221f2181172013312483371eaf643f93379012805d10321f21801331b0611721b0e'
    }
  ],
  renderer:'cc4b9846cc4b09359b46cc4b2d069a462d0e1ee0',
  normalTail:'0421f21811725a1c1206120eb218013111729a1c1206120e0333b21801311b0611721b0e90e6c046',
  docsTail:'0f21f21801333371337e013311723376bce7',
  advanceState:'337e01333376a1e7'
};
const fromHex=value=>Uint8Array.from(value.match(/../g),byte=>parseInt(byte,16));

export async function patchSoulGold(rom,game='soulgold'){
  if(rom.length<192||rom.length>soulGoldPatch.maxSize)throw Error('Select a GBA ROM between 192 bytes and 32 MiB.');
  const view=new DataView(rom.buffer,rom.byteOffset,rom.byteLength);
  const word=p=>view.getUint16(p,true);
  const header=new TextDecoder().decode(rom.subarray(0xa0,0xb0));
  const check=(-0x19-rom.subarray(0xa0,0xbd).reduce((sum,byte)=>sum+byte,0))&255;
  const profiles=soulGoldPatch.profiles.filter(build=>(build.game??'soulgold')===game&&header===build.title+'BPEE');
  if(!profiles.length||rom[0xb2]!==0x96||rom[0xbd]!==check){
    throw Error('The GBA header does not match a supported SoulGold build.');
  }
  if(!globalThis.crypto?.subtle)throw Error('Open Pocket Lab over HTTPS or localhost to verify the ROM.');
  const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
    byte=>byte.toString(16).padStart(2,'0')).join('');
  const unsupported=()=>Error('Unsupported SoulGold layout or ROM already patched.');
  const encoded=text=>[...text].map(char=>enc[char]);
  const matches=(p,bytes)=>p>=0&&p+bytes.length<=rom.length&&bytes.every((byte,i)=>rom[p+i]===byte);
  function locate(bytes){
    let found=-1;
    for(let p=rom.indexOf(bytes[0]);p>=0;p=rom.indexOf(bytes[0],p+1)){
      if(!(p&1)&&matches(p,bytes)){
        if(found>=0)throw unsupported();
        found=p;
      }
    }
    if(found<0)throw unsupported();
    return found;
  }
  function literal(instruction){
    const op=word(instruction);
    const pool=((instruction+4)&~3)+4*(op&255);
    if((op&0xf800)!==0x4800||pool+4>rom.length)throw unsupported();
    return view.getUint32(pool,true)-BASE;
  }
  function branchTarget(p){
    const op=word(p);
    if((op&0xf800)!==0xe000)throw unsupported();
    return p+4+((op<<21)>>20);
  }
  function callTarget(p){
    const hi=word(p),lo=word(p+2);
    if((hi&0xf800)!==0xf000||(lo&0xf800)!==0xf800)throw unsupported();
    const target=p+4+((hi<<21)>>9)+((lo&2047)<<1);
    if(target<192||target+2>rom.length||word(target)===0xffff)throw unsupported();
    return target;
  }
  function encodeBranch(p,target,link){
    const delta=target-p-4,limit=link?0x400000:0x800;
    if(delta%2||delta < -limit||delta>=limit)throw unsupported();
    return link?[0xf000|((delta>>12)&2047),0xf800|((delta>>1)&2047)]:[0xe000|((delta>>1)&2047)];
  }

  const renderer=locate(fromHex(soulGoldPatch.renderer));
  // Resolve the action table from the renderer before selecting a build with a shared header.
  const table=literal(renderer);
  const docsId=15,cheatId=13;
  if(table<192||table%4||table+(docsId+1)*8>rom.length)throw unsupported();
  const docsAction=table+docsId*8,cheatAction=table+cheatId*8;
  const callbackPointer=view.getUint32(cheatAction+4,true);
  const callback=callbackPointer-BASE-1;
  if(callback<192||callback%2)throw unsupported();
  const profile=profiles.find(build=>matches(callback,fromHex(build.callback)));
  if(!profile||locate(fromHex(profile.callback))!==callback)throw unsupported();
  const debugEntry=locate(fromHex(profile.debugEntry));
  const prefix=fromHex(profile.normalBuilder);
  const tail=fromHex(soulGoldPatch.normalTail);
  const builder=locate([...prefix,...tail])+prefix.length;
  const docsTail=branchTarget(builder+tail.length-4);
  const advance=docsTail+0x40; // The normal menu uses this existing state-machine epilogue.
  if(!matches(docsTail,fromHex(soulGoldPatch.docsTail))||
    !matches(advance,fromHex(soulGoldPatch.advanceState))||
    branchTarget(advance+6)!==branchTarget(docsTail+16))throw unsupported();

  // Cross-check both menu entries.
  const debugLabel=view.getUint32(cheatAction,true)-BASE;
  const docsLabel=view.getUint32(docsAction,true)-BASE;
  const docsCallback=view.getUint32(docsAction+4,true)-BASE;
  if(!matches(debugLabel,[...encoded('Debug'),255])||!matches(docsLabel,[...encoded('Docs'),255])||
    docsCallback<192||docsCallback>=rom.length||!(docsCallback&1))throw unsupported();
  const debugActions=literal(debugEntry+22);
  if(debugActions<192||debugActions%4||debugActions+4*12>rom.length||
    !matches(view.getUint32(debugActions,true)-BASE,encoded('Utilities'))||
    !matches(view.getUint32(debugActions+3*12,true)-BASE,encoded('Give X')))throw unsupported();

  // Retain the window cleanup calls, omitting the sound to make room for Debug_ShowMainMenu.
  const callbackWords=[0xb500];
  const appendCall=target=>callbackWords.push(...encodeBranch(callback+2*callbackWords.length,target,true));
  appendCall(callTarget(callback+2));
  appendCall(callTarget(callback+12));
  callbackWords.push(0x2101);
  appendCall(callTarget(callback+18));
  appendCall(callTarget(callback+22));
  appendCall(debugEntry);
  callbackWords.push(0x2001,0xbc02,0x4708,0x46c0);

  // The normal builder may already have Pok?dex, Pok?mon and Pok?gear. Adding these
  // five actions yields at most eight entries. Special menus retain the original Docs tail.
  const builderWords=[0x18f2];
  [4,5,6,docsId,cheatId].forEach((action,i)=>builderWords.push(0x2100|action,0x7211+(i<<6)));
  builderWords.push(0x3305,0x7133);
  builderWords.push(...encodeBranch(builder+2*builderWords.length,advance,false));
  while(builderWords.length*2<tail.length)builderWords.push(0x46c0);

  const output=rom.slice();
  output.set(callbackWords.flatMap(value=>le(value,2)),callback);
  output.set(builderWords.flatMap(value=>le(value,2)),builder);
  output.set(encoded('Cheat'),debugLabel);
  const verified=await sha256(rom)===profile.source;
  if(verified&&await sha256(output)!==profile.target)throw Error('Patched ROM checksum mismatch.');
  return {output,verified};
}
