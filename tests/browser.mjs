import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import path from 'node:path';

const runtime=path.resolve('.runtime');
const profile=mkdtempSync(path.join(runtime,'browser-test-'));
const browser=spawn(process.env.CIFRA_TEST_CHROME || path.join(runtime,'chrome-headless-shell-win64/chrome-headless-shell.exe'),
  ['--remote-debugging-port=19286','--user-data-dir='+profile,'--disable-gpu','--in-process-gpu','--single-process','--disable-background-networking','about:blank'],
  {windowsHide:true,stdio:['ignore','ignore','inherit']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try {
  let target;
  for (let i=0;i<100 && !target;i++) {
    try { target=(await (await fetch('http://127.0.0.1:19286/json/list')).json())[0]; } catch { await sleep(100); }
  }
  assert.ok(target,'O navegador de teste precisa estar disponível.');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let seq=0;
  const pending=new Map(), errors=[];
  socket.addEventListener('message',({data})=>{
    const msg=JSON.parse(data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  });
  function send(method,params={}) {
    return new Promise(resolve=>{const id=++seq;pending.set(id,resolve);socket.send(JSON.stringify({id,method,params}));});
  }
  async function run(expression) {
    const message=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (message.result?.exceptionDetails) throw Error(message.result.exceptionDetails.exception?.description);
    return message.result?.result?.value;
  }
  async function wait(expression) {
    for(let i=0;i<100;i++) { if(await run(expression)) return; await sleep(80); }
    throw Error('Tempo esgotado: '+expression+' '+JSON.stringify(errors)+' '+await run('document.body.innerText.slice(-350)'));
  }
  await send('Runtime.enable');
  await send('Page.navigate',{url:process.env.CIFRA_TEST_URL});
  await wait("document.querySelector('#loginForm')?.hidden===false");
  if (process.env.CIFRA_TEST_FIRST_ACCESS === '1') {
    assert.equal(await run("!$('nameGroup').hidden"),true);
    await run("$('ownerName').value='Conta de teste'");
  }
  await run("$('remember').checked=true");
  await run("$('email').value="+JSON.stringify(process.env.CIFRA_TEST_B)+"; $('password').value="+JSON.stringify(process.env.CIFRA_TEST_PASSWORD)+"; $('enter').click()");
  await wait("!$('workspace').hidden && $('kEnt').textContent");
  for (const width of [820,1024]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await run("$('menuToggle').click()");
    assert.equal(await run("$('menuToggle').getAttribute('aria-expanded')"),'false');
    assert.equal(await run("getComputedStyle($('sideMenu')).display==='none' && getComputedStyle($('bottomMenu')).display==='none'"),true);
    await run("$('menuToggle').click()");
    assert.equal(await run("getComputedStyle($('sideMenu')).display!=='none' || getComputedStyle($('bottomMenu')).display!=='none'"),true);
  }
  await run("abrir('ajustes'); $('confirmPassword').value="+JSON.stringify(process.env.CIFRA_TEST_PASSWORD)+"; $('privacySecret').value='641973'; $('privacyForm').requestSubmit()");
  await wait("protectedPanel && !$('privacyForm').inert");
  const jar = (await send('Network.getCookies',{urls:[process.env.CIFRA_TEST_URL+'api/index.php']})).result.cookies;
  const device = jar.find(cookie=>cookie.name.endsWith('_device'));
  assert.ok(device?.httpOnly && device.expires>Date.now()/1000);
  const sessionCookie = jar.find(cookie=>cookie.name.startsWith('cifra_') && !cookie.name.endsWith('_device'));
  await send('Network.deleteCookies',{name:sessionCookie.name,domain:sessionCookie.domain,path:sessionCookie.path});
  await send('Page.reload');
  await wait("document.querySelector('#unlockForm')?.hidden===false");
  assert.equal(await run("$('workspace').hidden"),true);
  assert.equal(await run("fetch('api/index.php?r=state').then(r=>r.status)"),423);
  await run("$('unlockSecret').value='wrong'; $('unlockForm').requestSubmit()");
  await wait("$('loginStatus').textContent.includes('incorretos')");
  await run("$('unlockSecret').value='641973'; $('unlockForm').requestSubmit()");
  await wait("!$('workspace').hidden && $('kEnt').textContent");
  await run("abrir('ajustes'); $('confirmPassword').value="+JSON.stringify(process.env.CIFRA_TEST_PASSWORD)+"; $('privacySecret').value='minha senha fictícia'; $('privacyForm').requestSubmit()");
  await wait("!$('privacyForm').inert");
  await send('Page.reload');
  await wait("document.querySelector('#unlockForm')?.hidden===false");
  await run("$('unlockSecret').value='minha senha fictícia'; $('unlockForm').requestSubmit()");
  await wait("!$('workspace').hidden && $('kEnt').textContent");
  await run("abrir('ajustes'); window.confirm=()=>true; $('confirmPassword').value="+JSON.stringify(process.env.CIFRA_TEST_PASSWORD)+"; $('disablePrivacy').click()");
  await wait("!protectedPanel && !$('privacyForm').inert");
  await run("abrir('painel')");
  await run("document.querySelector('.ladoBase button').click(); document.querySelector('#fCats button').click(); $('fVal').value='24,90'; $('fData').value='2024-01-31'; $('fDesc').value='Fatura fictícia'; $('fRep').value='3'; document.querySelector('.mdBase .btn:last-child').click()");
  await wait('S.lanc.length===3 && !busy');
  assert.deepEqual(await run('S.lanc.map(l=>l.data)'),['2024-01-31','2024-02-29','2024-03-31']);
  const rev=await run('revision');
  await run("document.querySelector('[data-pg=lanc]').click(); document.querySelector('#pModo [data-v=tudo]').click(); $('qBusca').value='fictícia'; $('qBusca').dispatchEvent(new Event('input'));");
  assert.equal(await run('filtrados().length'),3);
  await run("document.querySelector('[data-pg=graficos]').click()");
  assert.ok(await run("Chart.getChart('chCat') && $('tbMes').innerText.includes('74,70')"));
  await run("document.querySelector('[data-pg=painel]').click()");
  assert.ok((await run("$('kSai').innerText")).includes('74,70'));
  assert.equal(await run('revision'),rev);
  await run("document.querySelector('[data-pg=orc]').click();const limit=document.querySelector('.olim input');limit.value='90,25';limit.dispatchEvent(new Event('change'));");
  await wait('S.orc.Fatura===90.25 && !busy');
  await run("document.querySelector('[data-pg=ajustes]').click();window.confirm=()=>true;window.alert=t=>window.report=t; URL.createObjectURL=b=>{window.lastBlob=b;return 'blob:test'}; HTMLAnchorElement.prototype.click=function(){window.downloadName=this.download}; exportar();");
  const backup=await run('lastBlob.text()');
  assert.equal(JSON.parse(backup).lanc.length,3);
  await run('exportarCSV(false)');
  assert.match(await run('lastBlob.text()'),/Fatura fictícia/);
  await run('apagarLancamentos()');
  await wait('S.lanc.length===0 && !busy');
  await run("const transfer=new DataTransfer();transfer.items.add(new File(["+JSON.stringify(backup)+"],'backup.json'));$('arq').files=transfer.files;$('arq').dispatchEvent(new Event('change'));");
  await wait("window.report?.includes('totais conferidos') && S.lanc.length===3");
  const legacy=await run("backupState({ver:3,lanc:[{id:2,tipo:'gasto',mes:'Janeiro',cat:'Teste',valor:2.25,desc:'Teste (vence 14/01)',pago:true}]})");
  assert.ok(legacy.lanc[0].data.endsWith('-01-14'));
  assert.equal(legacy.lanc[0].pago,true);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await run("document.querySelector('.baixo [data-pg=painel]').click()");
  assert.ok(await run('document.documentElement.scrollWidth <= window.innerWidth'));
  await run("window.realFetch=window.fetch;window.fetch=()=>Promise.reject(new TypeError('offline'));");
  assert.equal(await run("change('settings/set',{cfg:{tom:'azul'}})"),false);
  assert.equal(await run('S.cfg.tom'),'neutro');
  assert.equal(await run("$('refresh').hidden"),false);
  await run("window.fetch=window.realFetch; sair()");
  await wait("document.querySelector('#loginForm')?.hidden===false");
  const afterLogout = (await send('Network.getCookies',{urls:[process.env.CIFRA_TEST_URL+'api/index.php']})).result.cookies;
  assert.ok(!afterLogout.some(cookie=>cookie.name.endsWith('_device')));
  assert.deepEqual(errors,[]);
  console.log('OK: telas desktop e móvel, recorrência, filtros, gráficos, orçamento, exportação JSON/CSV, importação, falha de rede e renderização sem gravação.');
} finally {
  socket?.close();
  if (browser.exitCode === null && browser.signalCode === null) {
    const closed = new Promise(resolve=>browser.once('close',resolve));
    browser.kill();
    await closed;
  }
  if (path.dirname(profile) === runtime && path.basename(profile).startsWith('browser-test-')) {
    rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
}

