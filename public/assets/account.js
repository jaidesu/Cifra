'use strict';
let firstAccess = false;
let csrf = '', revision = 0, busy = false, stale = false;

async function api(route, data) {
  let response, result;
  const options = {credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(90000)};
  if (data !== undefined) Object.assign(options, {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(data)});
  try {
    response = await fetch('api/index.php?r='+encodeURIComponent(route), options);
    result = await response.json();
  } catch {
    throw new Error('A conexão foi interrompida. Recarregue para conferir o que ficou salvo.');
  }
  if (!response.ok || !result.success) {
    const error = new Error(result.error?.message || 'O servidor não confirmou a operação.');
    error.code = result.error?.code;
    error.status = response.status;
    throw error;
  }
  return result.data;
}

function syncMessage(message, error=false, reload=false) {
  $('sync').hidden = !message;
  $('sync').classList.toggle('error',error);
  $('syncText').textContent = message;
  $('refresh').hidden = !reload;
}

function accept(data) {
  S = data.state;
  S.orc = Object.assign(Object.create(null),S.orc);
  revision = data.revision;
}

function redraw() {
  aplicarTema();
  preencherSelects();
  if (pg === 'ajustes') renderAjustes();
  render();
}

async function change(route, payload, after) {
  if (busy || stale) return false;
  busy = true;
  $('workspace').inert = true;
  syncMessage('Salvando…');
  try {
    const active = new Set(calcNotif(true).map(n=>n.k));
    const expiredKeys = S.disp.filter(k=>!active.has(k));
    const result = await api(route,{...payload,revision,expiredKeys});
    accept(result);
    if (after) after();
    redraw();
    syncMessage('');
    return true;
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') { location.reload(); return false; }
    stale = !error.status || [403,409,500].includes(error.status);
    redraw();
    syncMessage(error.message,true,stale);
    return false;
  } finally {
    busy = false;
    $('workspace').inert = false;
  }
}

async function openAccount(session) {
  csrf = session.csrf;
  if (!session.user) {
    firstAccess = session.setup === true;
    $('accessTitle').textContent = firstAccess ? 'Crie sua conta do Cifra' : 'Acesse sua conta';
    $('nameGroup').hidden = !firstAccess;
    $('ownerName').required = firstAccess;
    $('password').autocomplete = firstAccess ? 'new-password' : 'current-password';
    $('password').minLength = firstAccess ? 12 : 1;
    $('enter').textContent = firstAccess ? 'Criar conta' : 'Entrar';
    $('loginForm').hidden = false;
    $('loginStatus').textContent = firstAccess ? 'Escolha uma senha de pelo menos 12 caracteres.' : '';
    $(firstAccess ? 'ownerName' : 'email').focus();
    return;
  }
  accept(await api('state'));
  P.ref = periodoInicial();
  $('accountEmail').textContent = session.user.email;
  $('loginPane').hidden = true;
  $('workspace').hidden = false;
  redraw();
  avisarNav();
}

async function start() {
  try { await openAccount(await api('auth/me')); }
  catch (error) {
    if (error.code === 'UNAUTHENTICATED') { location.reload(); return; }
    $('loginStatus').textContent = error.message;
    $('retry').hidden = false;
  }
}

$('loginForm').addEventListener('submit', async event=>{
  event.preventDefault();
  if ($('enter').disabled) return;
  $('enter').disabled = true;
  $('loginStatus').textContent = firstAccess ? 'Preparando sua conta…' : 'Entrando…';
  try {
    const credentials = {email:$('email').value.trim(), password:$('password').value};
    if (firstAccess) {
      await api('setup/owner',{...credentials,name:$('ownerName').value.trim()});
      await openAccount({user:null,csrf,setup:false});
    }
    const session = await api('auth/login',credentials);
    $('password').value = '';
    await openAccount(session);
  } catch (error) {
    $('loginStatus').textContent = error.message;
    $('retry').hidden = error.code === 'INVALID_LOGIN';
  } finally { $('enter').disabled = false; }
});

async function sair() {
  if (busy) return;
  try { await api('auth/logout',{}); location.reload(); }
  catch (error) { syncMessage(error.message,true,true); }
}
window.addEventListener('pageshow', event=>{ if (event.persisted) location.reload(); });

function setCfg(cfg) { return change('settings/set',{cfg}); }
function defCfg(key,value) { return setCfg({[key]:value}); }
function defTema(value) { return defCfg('tema',value); }
function trocarTema() { return defTema(PAL.escuro ? 'claro' : 'escuro'); }
function defCor(value) { return defCfg('cor',value); }
function defTom(value) { return defCfg('tom',value); }
function padraoVisual() { return setCfg({tema:'escuro',cor:'#e11d2e',tom:'neutro'}); }
function defNome() { return change('settings/set',{perfil:{nome:$('aNome').value.trim()}}); }
function defAvatar(i) { return change('settings/set',{perfil:{avatar:AVATARES[i]}}); }

async function ligarNotifNav(on) {
  if (on && !('Notification' in window)) {
    $('nNav').checked = false;
    return toast('Este navegador não oferece avisos fora do aplicativo.');
  }
  try {
    const allowed = on && (await Notification.requestPermission()) === 'granted';
    await defCfg('avNav',allowed);
    if (on && !allowed) toast('Os avisos continuam disponíveis no sino.');
  } catch { renderAjustes(); toast('O navegador não autorizou os avisos.'); }
}

function dispensar(i) { if (NOTIFS[i]) return change('notifications/dismiss',{keys:[NOTIFS[i].k]}); }
function dispensarTudo() { return change('notifications/dismiss',{keys:NOTIFS.map(n=>n.k)}); }

function salvarForm() {
  if (!F || busy) return;
  const value = lerValor($('fVal').value), date = $('fData').value;
  const expense = F.tipo === 'gasto';
  const error = text=>{ $('fMsg').textContent = text; };
  if (expense && !F.cat) return error('Escolha uma categoria.');
  if (!(r2(value)>0)) return error('Digite um valor maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return error('Escolha a data.');
  const cat = expense ? F.cat : 'Entrada';
  const row = {tipo:F.tipo,cat,desc:$('fDesc').value.trim() || cat,valor:r2(value),data:date,pago:expense && F.pago};
  const done = ()=>{ fecharForm(); toast('Lançamento salvo.'); };
  if (F.id) return change('transactions/edit',{id:F.id,row},done);
  const rows = Array.from({length:Number($('fRep').value)},(_,i)=>{
    const data = somaMes(date,i);
    return {...row,data,pago:row.pago && (i===0 || data<=hojeISO())};
  });
  return change('transactions/add',{rows},done);
}

function alternarPago(id) {
  const l = acha(id);
  if (l) return change('transactions/edit',{id,row:{...l,pago:!l.pago}});
}
function excluir(id) {
  const row = acha(id);
  if (row) return change('transactions/delete',{id},()=>{
    toast('Lançamento apagado.','Desfazer',()=>change('transactions/undo',{id,row},()=>toast('Lançamento recuperado.')));
  });
}

function edCat(i,field,value) {
  const c = S.cats[i];
  return change('categories/edit',{name:c.n,category:{...c,[field]:value.trim() || (field==='ic' ? '📦' : '')}});
}
function delCat(i) { return change('categories/delete',{name:S.cats[i].n}); }
function addCat() {
  const category = {n:$('cNovoNome').value.trim(),ic:$('cNovoIc').value.trim() || '📦',cor:$('cNovoCor').value};
  return change('categories/add',{category},()=>{ $('cNovoNome').value=''; $('cNovoIc').value=''; toast('Categoria criada.'); });
}
function defOrc(i,text) {
  const amount = text.trim() ? lerValor(text) : 0;
  if (!Number.isFinite(amount) || amount < 0) { renderOrc(); return toast('Informe um limite válido.'); }
  return change('budgets/set',{name:S.cats[i].n,amount:amount ? r2(amount) : null});
}
function deslocarAno(years) {
  if (!S.lanc.length) return toast('Não há lançamentos para mover.');
  if (confirm('Mover todos os lançamentos um ano para '+(years>0?'frente':'trás')+'?')) {
    return change('transactions/shift',{years},()=>{ P.ref=somaMes(P.ref,years*12); toast('Datas movidas.'); });
  }
}
function apagarLancamentos() {
  if (S.lanc.length && confirm('Você guardou um backup? Apagar os '+S.lanc.length+' lançamentos da conta?')) {
    return change('transactions/clear',{},()=>toast('Lançamentos apagados.'));
  }
}
start();
