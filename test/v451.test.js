const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { createSaveQueue, deletionInfo } = require('../src/song-ui');

async function main() {
  let song = {text:'first'}, fail = true, writes = [], states = [];
  const queue = createSaveQueue({read:()=>song, write:async snapshot=>{writes.push(snapshot);return !fail;},status:s=>states.push(s)});
  queue.changed();
  assert.strictEqual(await queue.flush(), false);
  assert.strictEqual(queue.dirty, true);
  fail = false;
  assert.strictEqual(await queue.flush(), true);
  assert.strictEqual(queue.dirty, false);
  assert.deepStrictEqual(states, ['saving','failed','saved']);
  console.log('✓ failed saves remain dirty and can be retried');

  let release, inFlight = 0, maxInFlight = 0;
  writes = [];
  const serial = createSaveQueue({read:()=>song,write:async snapshot=>{
    inFlight++; maxInFlight=Math.max(maxInFlight,inFlight); writes.push(snapshot);
    if(writes.length===1) await new Promise(resolve=>{release=resolve;});
    inFlight--;return true;
  }});
  serial.changed();const first=serial.flush();
  song.text='second';serial.changed();const second=serial.flush();
  assert.strictEqual(first,second);release();await first;
  assert.deepStrictEqual(writes,[{text:'first'},{text:'second'}]);
  assert.strictEqual(maxInFlight,1);assert.strictEqual(serial.dirty,false);
  console.log('✓ typing during a save is serialized and the latest revision is persisted');

  const shared=deletionInfo({title:'A song',cloud:{folder:'A song'}},true);
  assert.match(shared.confirm,/other devices and folder members/);
  assert.match(shared.note,/Archived songs/);
  assert.match(deletionInfo({cloud:{folder:'A song'}},false).label,/this device/);
  console.log('✓ deletion wording distinguishes shared archives and local removal');

  const window = {setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};
  vm.runInNewContext(fs.readFileSync('src/playback-audio.js','utf8'),{window,Map,Math,Promise,setTimeout});
  const player=new window.UkePlayer();
  let suspended=0,resumed=0,ended=0;
  player.ctx={currentTime:12,state:'running',suspend:async()=>{suspended++;},resume:async()=>{resumed++;}};
  player.playing=true;player.startTime=2;player.callbacks={onEnd:()=>ended++};
  const before=player.position();await player.pause();
  assert.strictEqual(player.playing,true);assert.strictEqual(player.paused,true);
  assert.strictEqual(player.position(),before);assert.strictEqual(ended,0);
  await player.resume();assert.strictEqual(player.paused,false);
  await player.pause();player.stop();
  assert.strictEqual(player.playing,false);assert.strictEqual(player.paused,false);
  assert.strictEqual(suspended,2);assert.strictEqual(resumed,2);assert.strictEqual(ended,1);
  console.log('✓ pause preserves the transport and stopping a paused song releases audio');

  for(const file of ['index.html','web/app.html']) {
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      if(/<script[^>]*type="(?:application\/json|text\/plain)"/.test(match[0]))continue;
      new vm.Script(match[1],{filename:file});
    }
  }
  console.log('✓ desktop and built web scripts parse successfully');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
