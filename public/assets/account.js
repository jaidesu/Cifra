'use strict';
let panelProof = '', protectedPanel = false, pendingSession = null, signedIn = false;
let firstAccess = false;
let registrationMode = false;
let csrf = '', revision = 0, busy = false, stale = false;

async function api(route, data) {
  let response, result;
  const options = {credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(90000)};
  if (data !== undefined) Object.assign(options, {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(data)});
  if (panelProof) options.headers = {...options.headers,'X-Panel-Proof':panelProof};
  try {
    response = await fetch('api/index.php?r='+encodeURIComponent(route), options);
    result = await response.json();
  } catch {
    throw new Error('A conexão foi interrompida. Recarregue para conferir o que ficou salvo.');
  }
  if (!response.ok || !result.success) {
    if (result.error?.code === 'PANEL_LOCKED') lockPanel();
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

function setAccessMode(register) {
  registrationMode = register;
  $('accessTitle').textContent = registrationMode ? 'Crie sua conta do Cifra' : 'Acesse sua conta';
  $('nameGroup').hidden = !registrationMode;
  $('ownerName').required = registrationMode;
  $('password').autocomplete = registrationMode ? 'new-password' : 'current-password';
  $('password').minLength = registrationMode ? 12 : 1;
  $('enter').textContent = registrationMode ? 'Criar conta' : 'Entrar';
  $('accessSwitchMessage').textContent = registrationMode ? 'Já tem uma conta?' : 'Ainda não tem uma conta?';
  $('accessSwitch').textContent = registrationMode ? 'Entrar' : 'Cadastre-se';
  $('loginStatus').textContent = registrationMode
    ? 'Escolha uma senha de pelo menos 12 caracteres.'
    : '';
  $(registrationMode ? 'ownerName' : 'email').focus();
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
    const result = await apiRenewing(route,{...payload,revision,expiredKeys});
    accept(result);
    if (after) after();
    redraw();
    syncMessage('');
    return true;
  } catch (error) {
    if (error.code === 'PANEL_LOCKED') { syncMessage(''); return false; }
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

// A remembered browser gets a new server session without asking for the password.
// With the privacy lock on, the person types only the PIN.
async function renewSession() {
  const session = await api('auth/me');
  csrf = session.csrf;
  if (!session.user) { location.reload(); throw Object.assign(new Error('Entre novamente.'),{code:'UNAUTHENTICATED'}); }
  protectedPanel = session.protected === true;
  if (protectedPanel) {
    panelProof = '';
    showUnlock(session);
    throw Object.assign(new Error('Digite seu PIN para continuar.'),{code:'PANEL_LOCKED'});
  }
}
async function apiRenewing(route, data) {
  try { return await api(route, data); }
  catch (error) {
    if (!['UNAUTHENTICATED','CSRF'].includes(error.code)) throw error;
    await renewSession();
    return api(route, data);
  }
}

function unlockMode(mode) {
  const pin = mode !== 'senha';
  const input = $('unlockSecret');
  input.inputMode = pin ? 'numeric' : 'text';
  input.classList.toggle('pin',pin);
  input.autocomplete = pin ? 'off' : 'current-password';
  $('unlockLabel').textContent = pin ? 'PIN' : 'Senha da conta';
  $('unlockMode').textContent = pin ? 'Usar a senha da conta' : 'Usar o PIN';
  $('unlockForm').dataset.mode = pin ? 'pin' : 'senha';
}
function showUnlock(session) {
  pendingSession = session;
  $('workspace').hidden = true;
  $('sync').hidden = true;
  $('loginPane').hidden = false;
  $('loginForm').hidden = $('accessSwitchBox').hidden = $('retry').hidden = true;
  const name = (session.user.name || '').trim().split(/\s+/)[0];
  $('accessTitle').textContent = name ? `Olá, ${name}` : 'Desbloqueie seu painel';
  let mode = 'pin';
  try { mode = localStorage.getItem('cifra.unlockMode') || 'pin'; } catch {}
  unlockMode(mode);
  $('unlockSecret').value = '';
  $('unlockForm').hidden = false;
  $('loginStatus').textContent = '';
  $('unlockSecret').focus();
}

async function openAccount(session, keepView=false) {
  csrf = session.csrf;
  if (!session.user) {
    firstAccess = session.setup === true;
    $('loginForm').hidden = false;
    setAccessMode(firstAccess);
    return;
  }
  protectedPanel = session.protected === true;
  if (session.proof) panelProof = session.proof;
  if (protectedPanel && !panelProof) { showUnlock(session); return; }
  accept(await api('state'));
  showPrivacyState();
  if (!keepView || !signedIn) P.ref = periodoInicial();
  $('accountEmail').textContent = session.user.email;
  $('loginPane').hidden = true;
  $('unlockForm').hidden = true;
  $('workspace').hidden = false;
  redraw();
  if (!signedIn) avisarNav();
  signedIn = true;
}

async function start() {
  try { await openAccount(await api('auth/me')); }
  catch (error) {
    if (error.code === 'UNAUTHENTICATED') { location.reload(); return; }
    $('loginStatus').textContent = error.message;
    $('retry').hidden = false;
  }
}

$('accessSwitch').addEventListener('click',()=>{
  setAccessMode(!registrationMode);
  $('retry').hidden = true;
});

$('loginForm').addEventListener('submit', async event=>{
  event.preventDefault();
  if ($('enter').disabled) return;
  $('enter').disabled = true;
  $('loginStatus').textContent = registrationMode ? 'Preparando sua conta…' : 'Entrando…';
  try {
    const credentials = {email:$('email').value.trim(), password:$('password').value,remember:$('remember').checked};
    if (registrationMode) {
      await api('auth/register',{...credentials,name:$('ownerName').value.trim()});
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
  try {
    try { await api('auth/logout',{}); }
    catch (error) {
      if (error.code !== 'CSRF') throw error;
      csrf = (await api('auth/me')).csrf;
      await api('auth/logout',{});
    }
    try { localStorage.removeItem('cifra.unlockMode'); } catch {}
    location.reload();
  }
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
  if (expense && !F.cat) return erroCampo('fCats','Escolha uma categoria.');
  if (!(r2(value)>0)) return erroCampo('fVal','Informe um valor maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return erroCampo('fData','Informe a data.');
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
function showPrivacyState() {
  $('privacyState').textContent = protectedPanel
    ? 'Bloqueio ativado. Ao abrir o Cifra neste aparelho, basta digitar o PIN.'
    : 'Bloqueio desativado. Com um PIN, você abre o Cifra sem digitar e-mail e senha.';
  $('disablePrivacy').hidden = !protectedPanel;
}

$('unlockMode').addEventListener('click',()=>{
  unlockMode($('unlockForm').dataset.mode === 'pin' ? 'senha' : 'pin');
  $('loginStatus').textContent = '';
  $('unlockSecret').focus();
});

$('unlockForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if ($('unlockButton').disabled) return;
  $('unlockButton').disabled = true;
  $('loginStatus').textContent = 'Desbloqueando…';
  try {
    let result;
    try { result = await api('auth/unlock',{secret:$('unlockSecret').value}); }
    catch (error) {
      // The server session may have expired while the screen was locked.
      if (!['UNAUTHENTICATED','CSRF'].includes(error.code)) throw error;
      const session = await api('auth/me');
      csrf = session.csrf;
      if (!session.user) { location.reload(); return; }
      pendingSession = session;
      result = await api('auth/unlock',{secret:$('unlockSecret').value});
    }
    $('unlockSecret').value = '';
    $('loginStatus').textContent = '';
    panelProof = result.proof;
    await openAccount(pendingSession,true);
  } catch (error) {
    $('loginStatus').textContent = error.message;
    $('unlockSecret').value = '';
    $('unlockSecret').focus();
    $('retry').hidden = ['WRONG_SECRET','TOO_MANY_ATTEMPTS'].includes(error.code);
  }
  finally { $('unlockButton').disabled = false; }
});

$('privacyForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const remove = event.submitter === $('disablePrivacy');
  const secret = remove ? '' : $('privacySecret').value;
  if (!remove && !secret) { $('privacyStatus').textContent = 'Digite o novo PIN ou senha.'; return; }
  if (remove && !confirm('Desativar o bloqueio de privacidade desta conta?')) return;
  const form = event.currentTarget;
  form.inert = true;
  try {
    const result = await api('auth/privacy',{secret,password:$('confirmPassword').value});
    protectedPanel = result.enabled;
    panelProof = result.proof;
    try {
      if (result.enabled) localStorage.setItem('cifra.unlockMode',/^\d+$/.test(secret) ? 'pin' : 'senha');
      else localStorage.removeItem('cifra.unlockMode');
    } catch {}
    form.reset();
    showPrivacyState();
    $('privacyStatus').textContent = result.enabled ? 'PIN salvo. Este aparelho fica conectado.' : 'Bloqueio desativado.';
  } catch (error) { $('privacyStatus').textContent = error.message; }
  finally { form.inert = false; }
});

// Locks the panel in place, keeping the open screen, and asks only for the PIN.
let locking = false;
async function lockPanel() {
  if (locking || !protectedPanel) return;
  locking = true;
  panelProof = '';
  $('workspace').hidden = true;
  $('sync').hidden = true;
  try {
    const session = await api('auth/me');
    csrf = session.csrf;
    if (!session.user) { location.reload(); return; }
    if (session.protected) showUnlock(session);
    else await openAccount(session,true);
  } catch { location.reload(); }
  finally { locking = false; }
}

// Short trips to another app (file picker, notification, a quick message) keep the panel open.
const LOCK_AFTER = 60000;
let hiddenAt = 0;
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) {
    hiddenAt = Date.now();
    if (protectedPanel && panelProof) document.body.classList.add('privado');
    return;
  }
  document.body.classList.remove('privado');
  const away = hiddenAt && Date.now()-hiddenAt >= LOCK_AFTER;
  hiddenAt = 0;
  if (away && protectedPanel && panelProof) lockPanel();
});

function setMenuCollapsed(collapsed) {
  const label = collapsed ? 'Mostrar menu' : 'Recolher menu';
  $('workspace').classList.toggle('menu-collapsed',collapsed);
  $('menuToggle').setAttribute('aria-expanded',String(!collapsed));
  $('menuToggle').setAttribute('aria-label',label);
  $('menuToggle').title = label;
  $('menuToggle').innerHTML = ico(collapsed ? 'panel-left-open' : 'panel-left-close');
}
let collapsed = false;
try { collapsed = localStorage.getItem('cifra.menuCollapsed') === '1'; } catch {}
setMenuCollapsed(collapsed);
$('menuToggle').addEventListener('click',()=>{
  collapsed = !collapsed;
  setMenuCollapsed(collapsed);
  try { localStorage.setItem('cifra.menuCollapsed',collapsed ? '1' : '0'); } catch {}
});
start();
