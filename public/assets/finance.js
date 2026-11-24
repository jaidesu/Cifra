const FONTE = "Archivo, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MESN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESC = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIAS = ['dom','seg','ter','qua','qui','sex','sáb'];
const CATS_PADRAO = [
  {n:'Fatura',     ic:'💳', cor:'#e11d2e'},
  {n:'Empréstimo', ic:'🏦', cor:'#a855f7'},
  {n:'Internet',   ic:'🌐', cor:'#06b6d4'},
  {n:'Roupas',     ic:'👕', cor:'#ff6b35'},
  {n:'Lazer',      ic:'🎮', cor:'#f5a524'},
  {n:'Comida',     ic:'🍔', cor:'#84cc16'},
  {n:'Eletrônico', ic:'💻', cor:'#3b82f6'},
  {n:'Objeto',     ic:'📦', cor:'#94a3b8'},
  {n:'Social',     ic:'🎉', cor:'#ec4899'}
];
const AVATARES = ['inicial','🙂','😎','🤑','🦊','🐱','🐶','🚀','🎮','💼','👑','🔥','⚡','🌙','🍀','💎'];
const CORES = [['Vermelho','#e11d2e'],['Laranja','#f97316'],['Âmbar','#f59e0b'],['Verde','#16a34a'],['Turquesa','#14b8a6'],['Azul','#3b82f6'],['Roxo','#8b5cf6'],['Rosa','#ec4899']];
const TONS = {neutro:['Neutro',0,0], azul:['Azul-noite',222,24], violeta:['Violeta',265,20], musgo:['Musgo',155,16], cafe:['Café',28,16]};
const PGS = {painel:'Painel', lanc:'Lançamentos', graficos:'Gráficos e números', orc:'Orçamentos', ajustes:'Ajustes'};

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const r2 = v => Math.round(v*100)/100;
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const deISO = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const hojeISO = () => iso(new Date());
const dBR = s => s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const difDias = (a,b) => Math.round((deISO(b)-deISO(a))/864e5);
const fmt = v => (v<0?'−':'')+'R$ '+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const num = v => (v<0?'−':'')+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(v)?0:2,maximumFractionDigits:2});
const pct = (a,b) => b ? (a/b*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%' : '0%';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const soma = a => r2(a.reduce((t,l)=>t+l.valor,0));
const plural = (n,um,varios) => `${n} ${n===1?um:varios}`;
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const nomeMes = ym => `${MESN[+ym.slice(5,7)-1]} de ${ym.slice(0,4)}`;
const rotMes = ym => `${MESC[+ym.slice(5,7)-1]}/${ym.slice(2,4)}`;
const ymNum = ym => +ym.slice(0,4)*12 + (+ym.slice(5,7)-1);
const numYm = n => `${Math.floor(n/12)}-${pad(n%12+1)}`;

function lerValor(t){
  t = String(t).replace(/[R$\s]/g,'');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g,'').replace(',','.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g,'');
  return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}
function somaMes(s,k){
  const d = deISO(s), n = new Date(d.getFullYear(), d.getMonth()+k, 1);
  const ult = new Date(n.getFullYear(), n.getMonth()+1, 0).getDate();
  n.setDate(Math.min(d.getDate(), ult));
  return iso(n);
}
function hexRgb(h){ const n = parseInt(h.replace('#',''),16); return [n>>16&255, n>>8&255, n&255]; }
const lum = ([r,g,b]) => (0.299*r+0.587*g+0.114*b)/255;
const alfa = (hex,a) => `rgba(${hexRgb(hex).join(',')},${a})`;
const mistura = (hex,alvo,t) => { const a = hexRgb(hex), b = hexRgb(alvo); return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*t)).join(',')+')'; };
const corTexto = hex => lum(hexRgb(hex)) > .6 ? '#111111' : '#ffffff';
let S = null;
const acha = id => S.lanc.find(l=>l.id===id);
/* ===================== TEMA E CORES ===================== */
let PAL = {};
const temChart = typeof Chart !== 'undefined';
const CALMO = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function aplicarTema(){
  const c = S.cfg, r = document.documentElement;
  const escuro = c.tema === 'escuro' || (c.tema === 'auto' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const [, h, s] = TONS[c.tom] || TONS.neutro;
  const hs = l => `hsl(${h}, ${s}%, ${l}%)`;
  const ac = /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor.toLowerCase() : '#e11d2e';
  
  PAL = escuro
    ? {bg:hs(4), card:hs(8), card2:hs(12), borda:hs(18), txt:hs(95), sub:hs(64), grade:hs(15), verde:'#22c55e', verm:'#ff4d5e', amar:'#f5a524'}
    : {bg:hs(95), card:hs(100), card2:hs(92), borda:hs(83), txt:hs(10), sub:hs(36), grade:hs(90), verde:'#15803d', verm:'#dc2626', amar:'#b45309'};
  PAL.escuro = escuro; PAL.ac = ac;
  const rgb = hexRgb(ac), l = lum(rgb);
  const vars = {
    bg:PAL.bg, card:PAL.card, card2:PAL.card2, borda:PAL.borda, txt:PAL.txt, sub:PAL.sub,
    verde:PAL.verde, verm:PAL.verm, amar:PAL.amar,
    verdebg:alfa(PAL.verde,.13), vermbg:alfa(PAL.verm,.13), amarbg:alfa(PAL.amar,.15),
    ac, ac2:mistura(ac, escuro?'#ffffff':'#000000', .16), acbg:alfa(ac, escuro?.18:.12), actx:l > .62 ? '#111111' : '#ffffff',
    acfg: escuro ? mistura(ac,'#ffffff', l<.45?.28 : l<.6?.12 : 0) : mistura(ac,'#000000', l>.6?.45 : l>.45?.25 : .08)
  };
  Object.entries(vars).forEach(([k,v])=>r.style.setProperty('--'+k, v));
  r.style.colorScheme = escuro ? 'dark' : 'light';
  const marca = $('marcaLateral'), arquivoMarca = escuro ? 'assets/marca/cifra-escuro.svg' : 'assets/marca/cifra-claro.svg';
  if (marca.getAttribute('src') !== arquivoMarca) marca.src = arquivoMarca;
  $('btTema').textContent = escuro ? '☀️' : '🌙';
  if (temChart){ Chart.defaults.color = PAL.sub; Chart.defaults.borderColor = PAL.grade; Chart.defaults.font.family = FONTE; Chart.defaults.font.size = 12; }
}
/* ===================== PERÍODO (dia, semana, mês, ano, tudo, entre datas) ===================== */
function periodoInicial(){
  const h = hojeISO(), ym = h.slice(0,7);
  if (S.lanc.some(l=>l.data.slice(0,7) === ym)) return h;
  const fut = S.lanc.map(l=>l.data).filter(d=>d >= h).sort()[0];
  if (fut) return fut.slice(0,7)+'-01';
  const pas = S.lanc.map(l=>l.data).sort().pop();
  return pas ? pas.slice(0,7)+'-01' : h;
}
let P = {modo:'mes', ref:hojeISO(), de:'', ate:''};

function intervalo(p){
  const r = deISO(p.ref);
  if (p.modo === 'dia') return [p.ref, p.ref];
  if (p.modo === 'semana'){
    const ini = new Date(r); ini.setDate(r.getDate()-r.getDay());
    const fim = new Date(ini); fim.setDate(ini.getDate()+6);
    return [iso(ini), iso(fim)];
  }
  if (p.modo === 'mes') return [iso(new Date(r.getFullYear(), r.getMonth(), 1)), iso(new Date(r.getFullYear(), r.getMonth()+1, 0))];
  if (p.modo === 'ano') return [`${r.getFullYear()}-01-01`, `${r.getFullYear()}-12-31`];
  if (p.modo === 'custom') return [p.de || '0000-01-01', p.ate || '9999-12-31'];
  return ['0000-01-01', '9999-12-31'];
}
function doPeriodo(){ const [a,b] = intervalo(P); return S.lanc.filter(l=>l.data >= a && l.data <= b); }

/* ===================== CAIXINHA ===================== */
/* Tudo o que sobrou (ou faltou) antes do início do período. A sobra de um mês passa para o seguinte
   e cobre automaticamente os meses em que sai mais do que entra. */
function caixinhaAntes(ini){
  return r2(S.lanc.reduce((t,l)=> l.data < ini ? t+(l.tipo==='entrada'?l.valor:-l.valor) : t, 0));
}
function renderCaixinha(cxIni, sob, cxFim, usou, np){
  const semAntes = intervalo(P)[0] < '1000', cls = v => v < 0 ? 'neg' : 'pos';
  let nota, tipo = 'neutro';
  if (semAntes) nota = 'Em "Tudo" não existe período anterior, então o valor final já é a caixinha inteira.';
  else if (usou && -sob > cxIni){ nota = `A caixinha cobriu ${fmt(usou)}, mas ainda faltaram ${fmt(r2(-sob-cxIni))} ${np}.`; tipo = 'ruim'; }
  else if (usou){ nota = `Saiu mais do que entrou ${np}. A caixinha cobriu os ${fmt(usou)} que faltaram.`; tipo = 'aviso'; }
  else if (sob < 0){ nota = `Faltaram ${fmt(-sob)} ${np} e a caixinha já estava vazia.`; tipo = 'ruim'; }
  else if (sob > 0 && cxIni < 0){ nota = `Os ${fmt(sob)} que sobraram ${np} ajudaram a cobrir o que faltava de antes.`; tipo = 'aviso'; }
  else if (sob > 0){ nota = `Os ${fmt(sob)} que sobraram ${np} foram para a caixinha.`; tipo = 'ok'; }
  else nota = 'Nada entrou nem saiu da caixinha neste período.';
  $('cxCard').innerHTML = `<h2>🐷 Caixinha</h2>
    <p class="sub">O que sobra fica guardado e passa para o período seguinte. Quando você gasta mais do que entra, a caixinha cobre a diferença.</p>
    <div class="cxl"><span>Veio de antes</span><b class="${cls(cxIni)}">${fmt(cxIni)}</b></div>
    <div class="cxl"><span>Resultado ${np}</span><b class="${cls(sob)}">${sob > 0 ? '+ ' : ''}${fmt(sob)}</b></div>
    <div class="cxl fim"><span>Caixinha no fim</span><b class="${cls(cxFim)}">${fmt(cxFim)}</b></div>
    <div class="cxnota ${tipo}">${nota}</div>`;
}

function periodoAnterior(){
  if (!['dia','semana','mes','ano'].includes(P.modo)) return null;
  const d = deISO(P.ref);
  if (P.modo === 'dia') d.setDate(d.getDate()-1);
  else if (P.modo === 'semana') d.setDate(d.getDate()-7);
  else if (P.modo === 'mes'){ d.setDate(1); d.setMonth(d.getMonth()-1); }
  else { d.setDate(1); d.setFullYear(d.getFullYear()-1); }
  return intervalo({modo:P.modo, ref:iso(d)});
}
function moverPeriodo(k){
  const d = deISO(P.ref);
  if (P.modo === 'dia') d.setDate(d.getDate()+k);
  else if (P.modo === 'semana') d.setDate(d.getDate()+7*k);
  else if (P.modo === 'mes'){ d.setDate(1); d.setMonth(d.getMonth()+k); }
  else if (P.modo === 'ano'){ d.setDate(1); d.setFullYear(d.getFullYear()+k); }
  else return;
  P.ref = iso(d); render();
}
function irPara(v){ if (/^\d{4}-\d{2}-\d{2}$/.test(v)){ P.ref = v; render(); } }
function irHoje(){ P.ref = hojeISO(); render(); }
function defCustom(){ P.de = $('pDe').value; P.ate = $('pAte').value; render(); }
function rotuloPeriodo(){
  const [a,b] = intervalo(P), d = deISO(P.ref);
  if (P.modo === 'dia') return cap(d.toLocaleDateString('pt-BR',{weekday:'long', day:'numeric', month:'long', year:'numeric'}));
  if (P.modo === 'semana'){ const x = deISO(a), y = deISO(b); return `${pad(x.getDate())} ${MESC[x.getMonth()]} a ${pad(y.getDate())} ${MESC[y.getMonth()]} de ${y.getFullYear()}`; }
  if (P.modo === 'mes') return `${MESN[d.getMonth()]} de ${d.getFullYear()}`;
  if (P.modo === 'ano') return String(d.getFullYear());
  return P.modo === 'custom' ? '' : 'Todo o período';
}
function noPeriodo(){
  const [a,b] = intervalo(P), d = deISO(P.ref);
  if (P.modo === 'dia') return 'em '+dBR(P.ref);
  if (P.modo === 'semana') return `na semana de ${dBR(a).slice(0,5)} a ${dBR(b).slice(0,5)}`;
  if (P.modo === 'mes') return `em ${MESN[d.getMonth()]} de ${d.getFullYear()}`;
  if (P.modo === 'ano') return 'em '+d.getFullYear();
  if (P.modo === 'custom') return 'entre as datas escolhidas';
  return 'em todo o período';
}
function diasPeriodo(L){
  let [a,b] = intervalo(P);
  if (a < '1000' || b > '9000'){
    const ds = L.map(l=>l.data).sort();
    if (!ds.length) return 1;
    if (a < '1000') a = ds[0];
    if (b > '9000') b = ds[ds.length-1];
  }
  return Math.max(1, difDias(a,b)+1);
}
function renderPeriodo(){
  document.querySelectorAll('#pModo button').forEach(b=>b.classList.toggle('sel', b.dataset.v === P.modo));
  const nav = ['dia','semana','mes','ano'].includes(P.modo);
  $('pNav').style.display = P.modo === 'custom' ? 'none' : 'flex';
  document.querySelectorAll('#pNav .seta').forEach(s=>s.style.visibility = nav ? 'visible' : 'hidden');
  $('pIrBox').style.display = nav ? 'flex' : 'none';
  $('pCustom').style.display = P.modo === 'custom' ? 'flex' : 'none';
  $('pLabel').textContent = rotuloPeriodo();
  $('pIr').value = P.ref; $('pDe').value = P.de; $('pAte').value = P.ate;
}
function mesesJanela(){
  if (P.modo === 'ano') return Array.from({length:12}, (_,i)=>`${P.ref.slice(0,4)}-${pad(i+1)}`);
  const ref = ymNum(P.ref.slice(0,7));
  const ds = S.lanc.map(l=>l.data.slice(0,7)).sort();
  let a = ds.length ? ymNum(ds[0]) : ref-2, b = ds.length ? ymNum(ds[ds.length-1]) : ref+3;
  a = Math.min(a, ref); b = Math.max(b, ref);
  if (b-a < 5) b = a+5;
  if (b-a > 11){ a = Math.max(a, Math.min(ref-5, b-11)); b = a+11; }
  return Array.from({length:b-a+1}, (_,i)=>numYm(a+i));
}
function dadosMeses(){
  const M = mesesJanela();
  const ent = M.map(m=>soma(S.lanc.filter(l=>l.tipo==='entrada' && l.data.startsWith(m))));
  const sai = M.map(m=>soma(S.lanc.filter(l=>l.tipo==='gasto' && l.data.startsWith(m))));
  const sob = M.map((m,i)=>r2(ent[i]-sai[i]));
  const ac = M.map(m=>r2(S.lanc.reduce((t,l)=> l.data.slice(0,7) <= m ? t+(l.tipo==='entrada'?l.valor:-l.valor) : t, 0)));
  const qtd = M.map(m=>S.lanc.filter(l=>l.data.startsWith(m)).length);
  return {M, ent, sai, sob, ac, qtd};
}

/* ===================== PEÇAS DE LISTA ===================== */
function catDe(l){
  if (l.tipo === 'entrada') return {n:'Entrada', ic:'💰', cor:PAL.verde};
  return S.cats.find(c=>c.n === l.cat) || {n:l.cat, ic:'📦', cor:'#94a3b8'};
}
function statusDe(l){
  if (l.tipo === 'entrada') return {txt:'', cls:''};
  if (l.pago) return {txt:'pago', cls:'ok'};
  const h = hojeISO();
  if (l.data < h) return {txt:'atrasado', cls:'ruim'};
  if (l.data === h) return {txt:'vence hoje', cls:'aviso'};
  return {txt:'a pagar', cls:'neutro'};
}
function botoes(l){
  const d = esc(l.desc);
  return (l.tipo === 'gasto' ? `<button class="ac ${l.pago?'feito':''}" title="${l.pago?'Desmarcar como pago':'Marcar como pago'}" aria-label="${l.pago?'Desmarcar':'Marcar'} ${d} como pago" onclick="alternarPago(${l.id})">✔</button>` : '') +
    `<button class="ac" title="Editar" aria-label="Editar ${d}" onclick="abrirForm(${l.id})">✏️</button>` +
    `<button class="ac" title="Duplicar" aria-label="Duplicar ${d}" onclick="duplicar(${l.id})">⧉</button>` +
    `<button class="ac del" title="Apagar" aria-label="Apagar ${d}" onclick="excluir(${l.id})">✕</button>`;
}
function linhaItem(l){
  const e = l.tipo === 'entrada', c = catDe(l), st = statusDe(l);
  return `<div class="item ${!e && l.pago ? 'pago' : ''}">
    <div class="bola" style="background:${c.cor}22">${esc(c.ic)}</div>
    <div class="meio"><div class="nome">${esc(l.desc)}</div>
      <div class="info"><span>${esc(c.n)}</span><span>${dBR(l.data)}</span>${st.txt ? `<span class="tag ${st.cls}">${st.txt}</span>` : ''}</div></div>
    <div class="valor ${e?'pos':'neg'}">${e?'+':'−'} ${fmt(l.valor)}</div>
    <div class="acoes">${botoes(l)}</div>
  </div>`;
}
function linhaTabela(l){
  const e = l.tipo === 'entrada', c = catDe(l), st = statusDe(l);
  return `<div class="tr ${!e && l.pago ? 'pago' : ''}">
    <span class="c-data">${dBR(l.data)}<small>${DIAS[deISO(l.data).getDay()]}</small></span>
    <span class="c-desc"><span class="bola peq" style="background:${c.cor}22">${esc(c.ic)}</span><span class="tx"><b>${esc(l.desc)}</b><small class="soMob">${esc(c.n)}, ${dBR(l.data)}${st.txt ? ', '+st.txt : ''}</small></span></span>
    <span class="c-cat">${esc(c.n)}</span>
    <span class="c-st">${st.txt ? `<span class="tag ${st.cls}">${st.txt}</span>` : '<span class="tag ok">entrada</span>'}</span>
    <span class="c-val ${e?'pos':'neg'}">${e?'+':'−'} ${fmt(l.valor)}</span>
    <span class="c-ac">${botoes(l)}</span>
  </div>`;
}
function barra(nome, valor, total, max, cor, extra){
  return `<div class="barl"><div class="cat-top"><span>${nome} <small>${extra}</small></span><b>${fmt(valor)} <em>${pct(valor,total)}</em></b></div>
    <div class="trilho"><span style="width:${max ? valor/max*100 : 0}%;background:${cor}"></span></div></div>`;
}

/* ===================== PAINEL ===================== */
let visao = 'gasto';
function verNoPainel(v){
  visao = v; renderPainel();
  if (window.innerWidth < 980) $('blocoLista').scrollIntoView({behavior:CALMO?'auto':'smooth', block:'start'});
}
const NOME_ANT = {dia:'o dia anterior', semana:'a semana anterior', mes:'o mês anterior', ano:'o ano anterior'};
function delta(atual, antes, altaBoa){
  if (!antes) return '';
  const p = (atual-antes)/antes*100;
  if (Math.abs(p) < 0.5) return ` <b>igual a ${NOME_ANT[P.modo]}</b>`;
  const boa = (p > 0) === altaBoa;
  return ` <b class="${boa?'pos':'neg'}">${p>0?'▲':'▼'} ${Math.abs(p).toLocaleString('pt-BR',{maximumFractionDigits:0})}%</b> sobre ${NOME_ANT[P.modo]}`;
}
function renderPainel(){
  const L = doPeriodo(), E = L.filter(l=>l.tipo==='entrada'), G = L.filter(l=>l.tipo==='gasto');
  const ent = soma(E), sai = soma(G), sob = r2(ent-sai), pg = soma(G.filter(g=>g.pago)), falta = r2(sai-pg);
  const np = noPeriodo(), h = hojeISO();

  $('kEnt').textContent = fmt(ent);
  $('kSai').textContent = fmt(sai);
  $('kSob').textContent = fmt(sob); $('kSob').className = 'num '+(sob<0?'neg':'pos');
  $('kFal').textContent = fmt(falta);
  let cE = '', cS = '';
  const ant = periodoAnterior();
  if (ant){
    const A = S.lanc.filter(l=>l.data >= ant[0] && l.data <= ant[1]);
    cE = delta(ent, soma(A.filter(l=>l.tipo==='entrada')), true);
    cS = delta(sai, soma(A.filter(l=>l.tipo==='gasto')), false);
  }
  $('kEntM').innerHTML = plural(E.length,'entrada','entradas') + (cE ? ',' + cE : '');
  $('kSaiM').innerHTML = plural(G.length,'gasto','gastos') + (cS ? ',' + cS : '');

  /* caixinha: o que sobrou antes do período cobre o que faltar agora */
  const cxIni = caixinhaAntes(intervalo(P)[0]), cxFim = r2(cxIni + sob);
  const usou = sob < 0 && cxIni > 0 ? Math.min(-sob, cxIni) : 0;
  $('kSobM').textContent = usou ? `a caixinha cobriu ${fmt(usou)}`
    : ent > 0 ? (sob >= 0 ? `${Math.round(sob/ent*100)}% do que entrou` : 'saiu mais do que entrou')
    : (sai > 0 ? 'nada entrou neste período' : 'sem lançamentos');
  renderCaixinha(cxIni, sob, cxFim, usou, np);

  $('kFalM').textContent = sai ? `pago ${fmt(pg)} de ${fmt(sai)}` : 'nada a pagar';
  $('kBar').style.width = (sai ? pg/sai*100 : 0)+'%';
  document.querySelectorAll('.kpi').forEach(k=>k.classList.toggle('sel', k.dataset.v === visao));

  /* lista ligada à aba clicada */
  const V = {
    entrada:{arr:E, tit:'Tudo o que entrou', tot:'Total que entrou', val:ent, cls:'pos'},
    gasto:{arr:G, tit:'Tudo o que saiu', tot:'Total que saiu', val:sai, cls:'neg'},
    tudo:{arr:L, tit:'Entradas e gastos juntos', tot:'Sobrou', val:sob, cls:sob<0?'neg':'pos'},
    pendente:{arr:G.filter(g=>!g.pago), tit:'O que falta pagar', tot:'Total a pagar', val:falta, cls:'neg'}
  }[visao];
  const arr = [...V.arr].sort((a,b)=>a.data.localeCompare(b.data) || b.valor-a.valor);
  const MAX = 14;
  $('lTit').textContent = V.tit;
  $('lSub').textContent = `${plural(arr.length,'lançamento','lançamentos')} ${np}`;
  $('lista').innerHTML = arr.length
    ? arr.slice(0,MAX).map(linhaItem).join('') +
      (arr.length > MAX ? `<button class="link bloco" onclick="irLanc('${visao}')">Ver todos os ${arr.length} em Lançamentos</button>` : '') +
      `<div class="totalzinho"><span>${V.tot}</span><span class="${V.cls}">${fmt(V.val)}</span></div>`
    : `<div class="vazio">Nada aqui ${np}.<br><button class="link" onclick="abrirForm()">Fazer um lançamento</button></div>`;

  /* categorias */
  const porCat = S.cats.map((c,i)=>{ const g = G.filter(x=>x.cat===c.n); return {...c, i, total:soma(g), qtd:g.length}; }).sort((a,b)=>b.total-a.total);
  const usadas = porCat.filter(c=>c.total > 0), mx = usadas.length ? usadas[0].total : 1;
  $('cSub').textContent = `Onde o dinheiro foi ${np}. Clique numa categoria para ver os lançamentos dela.`;
  $('cats').innerHTML = usadas.length
    ? usadas.map(c=>`<button class="catb" onclick="irCat(${c.i})"><span class="cat-top"><span>${esc(c.ic)} ${esc(c.n)} <small>${plural(c.qtd,'lançamento','lançamentos')}</small></span><b>${fmt(c.total)} <em>${pct(c.total,sai)}</em></b></span><span class="trilho"><span style="width:${c.total/mx*100}%;background:${c.cor}"></span></span></button>`).join('')
    : `<div class="vazio">Nenhum gasto ${np}.</div>`;

  /* próximas contas */
  const pend = S.lanc.filter(l=>l.tipo==='gasto' && !l.pago).sort((a,b)=>a.data.localeCompare(b.data));
  $('prox').innerHTML = pend.length
    ? pend.slice(0,6).map(l=>{
        const d = difDias(h, l.data);
        const q = d < 0 ? `<span class="tag ruim">atrasada há ${plural(-d,'dia','dias')}</span>` : d === 0 ? '<span class="tag aviso">vence hoje</span>' : `<span class="tag neutro">em ${plural(d,'dia','dias')}</span>`;
        return `<div class="item"><div class="meio"><div class="nome">${esc(l.desc)}</div><div class="info"><span>${dBR(l.data)}</span>${q}</div></div>
          <div class="valor neg">${fmt(l.valor)}</div>
          <div class="acoes"><button class="ac" title="Marcar como pago" aria-label="Marcar ${esc(l.desc)} como pago" onclick="alternarPago(${l.id})">✔</button></div></div>`;
      }).join('') + (pend.length > 6 ? `<button class="link bloco" onclick="verPendentes()">Ver as ${pend.length} contas a pagar</button>` : '')
    : '<div class="vazio">Nenhuma conta esperando pagamento.</div>';

  /* indicadores */
  const dias = diasPeriodo(L), maior = G.reduce((m,g)=>!m || g.valor > m.valor ? g : m, null), top = usadas[0];
  const fim = intervalo(P)[1];
  const acum = r2(S.lanc.reduce((t,l)=> l.data <= fim ? t+(l.tipo==='entrada'?l.valor:-l.valor) : t, 0));
  const atr = S.lanc.filter(l=>l.tipo==='gasto' && !l.pago && l.data < h);
  const ind = (r,v,s,cls) => `<div class="ind"><span>${r}</span><b class="${cls||''}">${v}</b><small>${s}</small></div>`;
  $('inds').innerHTML =
    ind('Taxa de economia', ent > 0 ? Math.round(sob/ent*100)+'%' : 'sem entrada', ent > 0 ? 'do que entrou ficou com você' : 'nada entrou no período', ent > 0 ? (sob<0?'neg':'pos') : '') +
    ind('🐷 Caixinha no fim do período', fmt(acum), 'tudo o que sobrou até aqui', acum<0?'neg':'pos') +
    ind('Gasto médio por dia', fmt(r2(sai/dias)), `${plural(dias,'dia','dias')} no período`) +
    ind('Maior gasto', maior ? fmt(maior.valor) : 'nenhum', maior ? esc(maior.desc) : 'nada saiu no período') +
    ind('Categoria que mais pesou', top ? `${esc(top.ic)} ${esc(top.n)}` : 'nenhuma', top ? `${fmt(top.total)}, ${pct(top.total,sai)} dos gastos` : 'nada saiu no período') +
    ind('Contas atrasadas hoje', String(atr.length), atr.length ? fmt(soma(atr))+' em aberto' : 'nenhuma em atraso', atr.length?'neg':'pos');

  const D = dadosMeses();
  $('pSubMes').textContent = `De ${nomeMes(D.M[0])} a ${nomeMes(D.M[D.M.length-1])}. Os números em cima das barras são em reais.`;
  barrasES('chPainel', D.M.map(rotMes), D.ent, D.sai);
}
function irLanc(v){
  $('qTipo').value = v === 'entrada' ? 'entrada' : v === 'tudo' ? '' : 'gasto';
  $('qStatus').value = v === 'pendente' ? 'pendente' : '';
  $('qCat').value = ''; $('qBusca').value = ''; $('qMin').value = ''; $('qMax').value = '';
  abrir('lanc');
}
function irCat(i){
  if (!S.cats[i]) return;
  $('qTipo').value = 'gasto'; $('qStatus').value = ''; $('qBusca').value = ''; $('qMin').value = ''; $('qMax').value = '';
  $('qCat').value = S.cats[i].n;
  abrir('lanc');
}
function irMes(m){ P.modo = 'mes'; P.ref = m+'-01'; abrir('painel'); }
function verPendentes(){ P.modo = 'tudo'; irLanc('pendente'); }

/* ===================== LANÇAMENTOS ===================== */
function filtrados(){
  const q = $('qBusca').value.trim().toLowerCase(), t = $('qTipo').value, c = $('qCat').value, st = $('qStatus').value;
  const mn = lerValor($('qMin').value), mx = lerValor($('qMax').value), h = hojeISO();
  const L = doPeriodo().filter(l =>
    (!q || l.desc.toLowerCase().includes(q) || l.cat.toLowerCase().includes(q)) &&
    (!t || l.tipo === t) && (!c || l.cat === c) &&
    (!st || (l.tipo === 'gasto' && (st === 'pago' ? l.pago : st === 'pendente' ? !l.pago : (!l.pago && l.data < h)))) &&
    (isNaN(mn) || l.valor >= mn) && (isNaN(mx) || l.valor <= mx));
  const cmp = {
    dataA:(a,b)=>a.data.localeCompare(b.data) || a.id-b.id,
    dataD:(a,b)=>b.data.localeCompare(a.data) || b.id-a.id,
    valD:(a,b)=>b.valor-a.valor, valA:(a,b)=>a.valor-b.valor,
    desc:(a,b)=>a.desc.localeCompare(b.desc,'pt-BR')
  }[$('qOrd').value] || ((a,b)=>a.data.localeCompare(b.data));
  return L.sort(cmp);
}
function renderLanc(){
  const L = filtrados();
  const ent = soma(L.filter(l=>l.tipo==='entrada')), sai = soma(L.filter(l=>l.tipo==='gasto')), sal = r2(ent-sai);
  const ind = (r,v,cls) => `<div class="ind"><span>${r}</span><b class="${cls||''}">${v}</b></div>`;
  $('lResumo').innerHTML = ind('Lançamentos na lista', String(L.length)) + ind('Entrou', fmt(ent), 'pos') + ind('Saiu', fmt(sai), 'neg') + ind('Saldo da lista', fmt(sal), sal<0?'neg':'pos');
  $('lTabela').innerHTML = '<div class="tr th"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Situação</span><span class="c-val">Valor</span><span></span></div>' +
    (L.length ? L.map(linhaTabela).join('') : `<div class="vazio">Nenhum lançamento com esses filtros ${noPeriodo()}. Troque o período ou limpe os filtros.</div>`);
}
function limparFiltros(){
  ['qBusca','qTipo','qCat','qStatus','qMin','qMax'].forEach(id=>$(id).value = '');
  $('qOrd').value = 'dataA';
  renderLanc();
}
function preencherSelects(){
  const s = $('qCat'), v = s.value;
  s.innerHTML = '<option value="">Todas as categorias</option>' + S.cats.map(c=>`<option value="${esc(c.n)}">${esc(c.ic)} ${esc(c.n)}</option>`).join('');
  s.value = S.cats.some(c=>c.n === v) ? v : '';
}

/* ===================== GRÁFICOS ===================== */
const GR = {};
const rotulos = {             /* escreve o valor em cima de cada barra ou ponto */
  id:'rotulos',
  afterDatasetsDraw(chart){
    const ctx = chart.ctx;
    const nBar = chart.data.datasets.filter((d,i)=>chart.isDatasetVisible(i) && chart.getDatasetMeta(i).type === 'bar').length || 1;
    const vaga = chart.chartArea.width / Math.max(1, chart.data.labels.length) / nBar;
    chart.data.datasets.forEach((ds,i)=>{
      if (!chart.isDatasetVisible(i)) return;
      const meta = chart.getDatasetMeta(i), linha = meta.type === 'line';
      ctx.save();
      ctx.font = '700 11.5px ' + FONTE;
      ctx.fillStyle = ds.corRotulo || PAL.txt;
      meta.data.forEach((el,j)=>{
        const v = ds.data[j];
        if (v == null || (v === 0 && !linha)) return;
        const t = num(v), baixo = v < 0, dist = linha ? 9 : 5, y = baixo ? el.y+dist : el.y-dist;
        if (!linha && ctx.measureText(t).width > vaga-2){     /* barra estreita: texto em pé */
          ctx.save(); ctx.translate(el.x, y); ctx.rotate(-Math.PI/2);
          ctx.textAlign = baixo ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, 0); ctx.restore();
        } else {
          ctx.textAlign = 'center'; ctx.textBaseline = baixo ? 'top' : 'bottom'; ctx.fillText(t, el.x, y);
        }
      });
      ctx.restore();
    });
  }
};
const centro = {              /* total no meio da rosca */
  id:'centro',
  afterDraw(chart, args, o){
    if (!o || !o.l1) return;
    const a = chart.chartArea, x = (a.left+a.right)/2, y = (a.top+a.bottom)/2, ctx = chart.ctx;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.sub; ctx.font = '600 12.5px ' + FONTE; ctx.fillText(o.l2, x, y-14);
    ctx.fillStyle = PAL.txt; ctx.font = '800 19px ' + FONTE; ctx.fillText(o.l1, x, y+9);
    ctx.restore();
  }
};
const fatias = {              /* porcentagem dentro de cada fatia grande */
  id:'fatias',
  afterDatasetsDraw(chart){
    const ds = chart.data.datasets[0], tot = ds.data.reduce((a,b)=>a+b,0);
    if (!tot) return;
    const ctx = chart.ctx;
    ctx.save(); ctx.font = '800 12.5px ' + FONTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((arc,i)=>{
      const p = ds.data[i]/tot*100;
      if (p < 6) return;
      const c = arc.getCenterPoint();
      ctx.fillStyle = corTexto(ds.backgroundColor[i]);
      ctx.fillText(Math.round(p)+'%', c.x, c.y);
    });
    ctx.restore();
  }
};
function grafico(id, cfg){
  const cv = $(id);
  if (!temChart || !cv) return;
  if (GR[id]) GR[id].destroy();
  if (CALMO) cfg.options.animation = false;
  GR[id] = new Chart(cv, cfg);
}
function opBarras(){
  return {responsive:true, maintainAspectRatio:false, layout:{padding:{top:26}},
    plugins:{legend:{position:'bottom', labels:{boxWidth:12, boxHeight:12, padding:16}},
             tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.raw)}`}}},
    scales:{x:{grid:{display:false}},
            y:{beginAtZero:true, grace:'18%', grid:{color:PAL.grade}, ticks:{callback:v=>'R$ '+num(v)}}}};
}
function barrasES(id, rots, ent, sai){
  grafico(id, {type:'bar', plugins:[rotulos],
    data:{labels:rots, datasets:[
      {label:'Entrou', data:ent, backgroundColor:PAL.verde, corRotulo:PAL.verde, borderRadius:6, maxBarThickness:48},
      {label:'Saiu', data:sai, backgroundColor:PAL.verm, corRotulo:PAL.verm, borderRadius:6, maxBarThickness:48}]},
    options:opBarras()});
}
function renderGraficos(){
  const L = doPeriodo(), G = L.filter(l=>l.tipo==='gasto'), E = L.filter(l=>l.tipo==='entrada');
  const sai = soma(G), ent = soma(E), np = noPeriodo(), nada = t => `<div class="vazio">${t} ${np}.</div>`;

  /* rosca com legenda de números */
  const porCat = S.cats.map(c=>({...c, total:soma(G.filter(g=>g.cat===c.n))})).filter(c=>c.total > 0).sort((a,b)=>b.total-a.total);
  $('gSub1').textContent = `Gastos por categoria ${np}.`;
  $('legCat').innerHTML = porCat.length
    ? porCat.map(c=>`<div class="lg"><i style="background:${c.cor}"></i><span>${esc(c.ic)} ${esc(c.n)}</span><b>${fmt(c.total)}</b><em>${pct(c.total,sai)}</em></div>`).join('') +
      `<div class="lg tot"><i></i><span>Total</span><b>${fmt(sai)}</b><em>100%</em></div>`
    : nada('Nenhum gasto');
  grafico('chCat', {type:'doughnut', plugins:[centro, fatias],
    data:{labels:porCat.map(c=>c.n), datasets:[{data:porCat.map(c=>c.total), backgroundColor:porCat.map(c=>c.cor), borderColor:PAL.card, borderWidth:3, hoverOffset:6}]},
    options:{responsive:true, maintainAspectRatio:false, cutout:'60%',
      plugins:{legend:{display:false}, centro:{l1:fmt(sai), l2:'Total gasto'},
               tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.raw)} (${pct(c.raw,sai)})`}}}}});

  /* entradas por origem */
  const mapa = Object.create(null);
  E.forEach(l=>{ const k = l.desc.trim().toLowerCase(); if (!mapa[k]) mapa[k] = {n:l.desc.trim(), total:0, qtd:0}; mapa[k].total += l.valor; mapa[k].qtd++; });
  const fontes = Object.values(mapa).map(f=>({...f, total:r2(f.total)})).sort((a,b)=>b.total-a.total);
  $('gSub2').textContent = `Entradas somadas por descrição ${np}. Total: ${fmt(ent)}.`;
  $('fontes').innerHTML = fontes.length ? fontes.map(f=>barra(esc(f.n), f.total, ent, fontes[0].total, 'var(--verde)', plural(f.qtd,'vez','vezes'))).join('') : nada('Nenhuma entrada');

  /* maiores gastos */
  const tops = [...G].sort((a,b)=>b.valor-a.valor).slice(0,8);
  $('gSub3').textContent = `Os maiores gastos ${np}, com a fatia de cada um no total.`;
  $('tops').innerHTML = tops.length ? tops.map((l,i)=>barra(`${i+1}. ${esc(l.desc)}`, l.valor, sai, tops[0].valor, catDe(l).cor, dBR(l.data))).join('') : nada('Nenhum gasto');

  /* mês a mês */
  const D = dadosMeses(), rots = D.M.map(rotMes);
  $('gSubMes').textContent = `De ${nomeMes(D.M[0])} a ${nomeMes(D.M[D.M.length-1])}. Os números em cima das barras são em reais.`;
  barrasES('chMes', rots, D.ent, D.sai);
  const o1 = opBarras(); o1.plugins.legend.display = false;
  grafico('chSob', {type:'bar', plugins:[rotulos],
    data:{labels:rots, datasets:[{label:'Sobrou', data:D.sob, backgroundColor:D.sob.map(v=>v<0?PAL.verm:PAL.verde), borderRadius:6, maxBarThickness:56}]}, options:o1});
  const o2 = opBarras(); o2.plugins.legend.display = false; o2.scales.x.offset = true;
  grafico('chAcum', {type:'line', plugins:[rotulos],
    data:{labels:rots, datasets:[{label:'Caixinha', data:D.ac, borderColor:PAL.ac, backgroundColor:alfa(PAL.ac,.14), fill:true, tension:.25, borderWidth:2.5, pointRadius:5, pointBackgroundColor:PAL.ac}]}, options:o2});

  /* dia a dia */
  const [a,b] = intervalo(P);
  const diario = ['dia','semana','mes'].includes(P.modo) || (P.modo === 'custom' && !!P.de && !!P.ate && P.de <= P.ate && difDias(P.de,P.ate) <= 62);
  $('boxDia').style.display = diario ? 'block' : 'none';
  $('diaMsg').style.display = diario ? 'none' : 'block';
  $('gSubDia').textContent = diario ? `Entradas e gastos de cada dia ${np}.` : '';
  if (diario){
    const dias = [];
    for (let d = deISO(a); iso(d) <= b; d.setDate(d.getDate()+1)) dias.push(iso(d));
    barrasES('chDia', dias.map(d=> P.modo === 'mes' ? d.slice(8) : d.slice(8)+'/'+d.slice(5,7)),
      dias.map(d=>soma(E.filter(l=>l.data === d))), dias.map(d=>soma(G.filter(l=>l.data === d))));
  }

  /* tabela mês a mês */
  const atual = P.ref.slice(0,7);
  let t = '<thead><tr><th>Mês</th><th>Entrou</th><th>Saiu</th><th>Sobrou</th><th>Caixinha</th><th>Economia</th><th>Lançamentos</th></tr></thead><tbody>';
  D.M.forEach((m,i)=>{
    t += `<tr class="${m === atual ? 'atual' : ''}"><td><button class="link" onclick="irMes('${m}')">${nomeMes(m)}</button></td>
      <td class="pos">${fmt(D.ent[i])}</td><td class="neg">${fmt(D.sai[i])}</td>
      <td class="${D.sob[i]<0?'neg':'pos'}">${fmt(D.sob[i])}</td><td class="${D.ac[i]<0?'neg':'pos'}">${fmt(D.ac[i])}</td>
      <td>${D.ent[i] > 0 ? Math.round(D.sob[i]/D.ent[i]*100)+'%' : 'sem entrada'}</td><td>${D.qtd[i]}</td></tr>`;
  });
  const tE = r2(D.ent.reduce((x,y)=>x+y,0)), tS = r2(D.sai.reduce((x,y)=>x+y,0)), tQ = D.qtd.reduce((x,y)=>x+y,0), tR = r2(tE-tS);
  t += `</tbody><tfoot><tr><td>Total desses meses</td><td class="pos">${fmt(tE)}</td><td class="neg">${fmt(tS)}</td><td class="${tR<0?'neg':'pos'}">${fmt(tR)}</td><td></td><td>${tE > 0 ? Math.round(tR/tE*100)+'%' : ''}</td><td>${tQ}</td></tr></tfoot>`;
  $('tbMes').innerHTML = t;

  /* tabela categoria x mês */
  const linhas = S.cats.map(c=>({c, v:D.M.map(m=>soma(S.lanc.filter(l=>l.tipo==='gasto' && l.cat===c.n && l.data.startsWith(m))))})).filter(x=>x.v.some(n=>n > 0));
  let mt = '<thead><tr><th>Categoria</th>' + D.M.map(m=>`<th>${rotMes(m)}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  linhas.forEach(x=>{
    mt += `<tr><td>${esc(x.c.ic)} ${esc(x.c.n)}</td>` + x.v.map(n=>`<td class="${n ? '' : 'zero'}">${n ? fmt(n) : '0'}</td>`).join('') +
          `<td><b>${fmt(r2(x.v.reduce((p,q)=>p+q,0)))}</b></td></tr>`;
  });
  mt += '</tbody><tfoot><tr><td>Total</td>' + D.sai.map(n=>`<td>${fmt(n)}</td>`).join('') + `<td>${fmt(tS)}</td></tr></tfoot>`;
  $('tbMatriz').innerHTML = linhas.length ? mt : '<tbody><tr><td class="vazio">Nenhum gasto nesses meses.</td></tr></tbody>';
}

/* ===================== ORÇAMENTOS ===================== */
function renderOrc(){
  const m = P.ref.slice(0,7), G = S.lanc.filter(l=>l.tipo==='gasto' && l.data.startsWith(m));
  $('oTit').textContent = `Orçamento de ${nomeMes(m)}`;
  let lim = 0, gastoLim = 0;
  $('oLista').innerHTML = S.cats.map((c,i)=>{
    const g = soma(G.filter(x=>x.cat===c.n)), l = +S.orc[c.n] || 0;
    if (l){ lim += l; gastoLim += g; }
    const p = l ? g/l*100 : 0, cls = !l ? '' : p >= 100 ? 'ruim' : p >= 80 ? 'aviso' : 'ok';
    return `<div class="card">
      <div class="otop"><span class="bola" style="background:${c.cor}22">${esc(c.ic)}</span><b>${esc(c.n)}</b>
        <label class="olim">Limite em R$ <input inputmode="decimal" value="${l ? String(l).replace('.',',') : ''}" placeholder="sem limite" onchange="defOrc(${i},this.value)"></label></div>
      <div class="onum"><span>Gasto no mês: <b>${fmt(g)}</b></span><span>${l ? (g <= l ? `Ainda cabe <b class="pos">${fmt(r2(l-g))}</b>` : `Passou <b class="neg">${fmt(r2(g-l))}</b>`) : 'Sem limite definido'}</span></div>
      <div class="trilho"><span style="width:${Math.min(p,100)}%;background:${cls==='ruim' ? 'var(--verm)' : cls==='aviso' ? 'var(--amar)' : c.cor}"></span></div>
      ${l ? `<div class="opct ${cls}">${Math.round(p)}% do limite usado</div>` : ''}
    </div>`;
  }).join('');
  lim = r2(lim); gastoLim = r2(gastoLim);
  $('oResumo').innerHTML = lim
    ? `<div class="onum"><span>Soma dos limites: <b>${fmt(lim)}</b></span><span>Gasto nessas categorias: <b>${fmt(gastoLim)}</b> (${pct(gastoLim,lim)})</span></div>
       <div class="trilho"><span style="width:${Math.min(gastoLim/lim*100,100)}%;background:${gastoLim > lim ? 'var(--verm)' : 'var(--verde)'}"></span></div>`
    : '<div class="sub">Nenhum limite definido ainda. Digite um valor em qualquer categoria abaixo.</div>';
}
let NOTIFS = [];
function calcNotif(includeDismissed=false){
  const h = hojeISO(), c = S.cfg, N = [];
  if (S.migradoDe) N.push({k:'migr', ic:'📅', cls:'info', tit:'Seus lançamentos ganharam data completa',
    txt:`O que era de Dezembro a Maio ficou de dez/${S.anoMigracao} a mai/${S.anoMigracao+1}. O que não tinha dia ficou no dia 1. Se o ano estiver errado, dá para mover tudo em Ajustes, parte Dados.`,
    btn:['Abrir Ajustes', "abrir('ajustes')"]});
  if (c.avVenc) S.lanc.filter(l=>l.tipo==='gasto' && !l.pago).sort((a,b)=>a.data.localeCompare(b.data)).forEach(l=>{
    const d = difDias(h, l.data), pagar = ['Marcar como pago', `alternarPago(${l.id})`];
    if (d < 0) N.push({k:`atr:${l.id}:${l.data}`, ic:'⚠️', cls:'ruim', tit:`Venceu: ${l.desc}`, txt:`${fmt(l.valor)}, venceu em ${dBR(l.data)}, há ${plural(-d,'dia','dias')}.`, btn:pagar});
    else if (d === 0) N.push({k:`hoje:${l.id}:${l.data}`, ic:'⏰', cls:'aviso', tit:`Vence hoje: ${l.desc}`, txt:fmt(l.valor), btn:pagar});
    else if (d <= c.diasAviso) N.push({k:`prox:${l.id}:${l.data}`, ic:'🗓️', cls:'aviso', tit:`Vence em ${plural(d,'dia','dias')}: ${l.desc}`, txt:`${fmt(l.valor)}, no dia ${dBR(l.data)}.`, btn:pagar});
  });
  const ym = h.slice(0,7), doMes = S.lanc.filter(l=>l.data.startsWith(ym));
  if (c.avOrc) S.cats.forEach(cat=>{
    const lim = +S.orc[cat.n] || 0; if (!lim) return;
    const g = soma(doMes.filter(l=>l.tipo==='gasto' && l.cat===cat.n)), p = g/lim*100;
    if (p >= 100) N.push({k:`orc100:${cat.n}:${ym}`, ic:'🚨', cls:'ruim', tit:`${cat.n} passou do limite`, txt:`Gasto de ${fmt(g)} para um limite de ${fmt(lim)} neste mês.`});
    else if (p >= 80) N.push({k:`orc80:${cat.n}:${ym}`, ic:'🎯', cls:'aviso', tit:`${cat.n} chegou a ${Math.round(p)}% do limite`, txt:`Gasto de ${fmt(g)} de ${fmt(lim)} neste mês.`});
  });
  if (c.avSaldo){
    const e = soma(doMes.filter(l=>l.tipo==='entrada')), g = soma(doMes.filter(l=>l.tipo==='gasto'));
    const cx = caixinhaAntes(ym+'-01'), falta = r2(g-e-cx), mes = MESN[+ym.slice(5,7)-1];
    if (falta > 0) N.push({k:`saldo:${ym}`, ic:'📉', cls:'ruim', tit:`${mes} está no vermelho`, txt:`Saiu ${fmt(g)}, entrou ${fmt(e)} e a caixinha começou o mês com ${fmt(cx)}. Faltam ${fmt(falta)}.`});
    else if (g > e) N.push({k:`cx:${ym}`, ic:'🐷', cls:'info', tit:`A caixinha está cobrindo ${mes}`, txt:`Saiu ${fmt(r2(g-e))} a mais do que entrou. A caixinha cobre e ainda fica com ${fmt(r2(-falta))}.`});
  }

  if (includeDismissed) return N;
  const dismissed = new Set(S.disp);
  return N.filter(n=>!dismissed.has(n.k));
}
function renderNotif(){
  NOTIFS = calcNotif();
  const b = $('nBadge'); b.textContent = NOTIFS.length; b.style.display = NOTIFS.length ? 'grid' : 'none';
  $('btSino').setAttribute('aria-label', `Notificações, ${plural(NOTIFS.length,'aviso','avisos')}`);
  $('notif').innerHTML = `<div class="nTop"><b>Notificações</b>${NOTIFS.length ? '<button class="link" onclick="dispensarTudo()">Dispensar todas</button>' : ''}</div>` +
    (NOTIFS.length ? NOTIFS.map((n,i)=>`<div class="nItem ${n.cls}"><span class="nIc">${n.ic}</span>
        <div class="nTx"><b>${esc(n.tit)}</b><small>${esc(n.txt)}</small>${n.btn ? `<button class="link" onclick="${n.btn[1]}">${n.btn[0]}</button>` : ''}</div>
        <button class="ac" title="Dispensar" aria-label="Dispensar aviso" onclick="dispensar(${i})">✕</button></div>`).join('')
      : '<div class="vazio">Tudo em dia. Nenhum aviso agora.</div>');
}
function alternarNotif(e){ e.stopPropagation(); $('notif').classList.toggle('on'); }
function fecharNotif(){ $('notif').classList.remove('on'); }
function avisarNav(){
  if (!S.cfg.avNav || !('Notification' in window) || Notification.permission !== 'granted') return;
  const urg = calcNotif().filter(n=>n.cls === 'ruim' || n.cls === 'aviso');
  if (!urg.length) return;
  try { new Notification('Minhas Finanças', {body: urg.length === 1 ? urg[0].tit : `${urg[0].tit} e mais ${plural(urg.length-1,'aviso','avisos')}.`}); } catch(e){}
}
let F = null;
function dataPadrao(){
  const h = hojeISO(), [a,b] = intervalo(P);
  return (h >= a && h <= b) || a < '1000' ? h : a;
}
function abrirForm(id, copia){
  const l = id ? acha(id) : null;
  F = {id: l && !copia ? l.id : null, tipo: l ? l.tipo : 'gasto', cat: l && l.tipo === 'gasto' ? l.cat : null, pago: l ? !!l.pago : true, tocou: !!l};
  $('fTit').textContent = F.id ? 'Editar lançamento' : copia ? 'Duplicar lançamento' : 'Novo lançamento';
  $('fVal').value = l ? String(l.valor).replace('.',',') : '';
  $('fDesc').value = l ? l.desc : '';
  $('fData').value = l ? l.data : dataPadrao();
  $('fRep').value = '1';
  $('fBlocoRep').style.display = F.id ? 'none' : 'block';
  $('fDel').style.display = F.id ? 'inline-flex' : 'none';
  $('fMsg').textContent = '';
  if (!l) F.pago = $('fData').value <= hojeISO();
  pintarForm();
  fecharNotif();
  $('mdForm').classList.add('aberto');
  setTimeout(()=>$('fVal').focus(), 60);
}
function duplicar(id){ abrirForm(id, true); }
function fecharForm(){ $('mdForm').classList.remove('aberto'); F = null; }
function pintarForm(){
  if (!F) return;
  const ent = F.tipo === 'entrada';
  document.querySelectorAll('#fTipo button').forEach(b=>b.classList.toggle('sel', b.dataset.v === F.tipo));
  $('fBlocoCat').style.display = ent ? 'none' : 'block';
  $('fBlocoPago').style.display = ent ? 'none' : 'block';
  $('fCats').innerHTML = S.cats.map((c,i)=>`<button type="button" class="chip ${F.cat === c.n ? 'sel' : ''}" onclick="fCat(${i})"><span>${esc(c.ic)}</span>${esc(c.n)}</button>`).join('');
  document.querySelectorAll('#fPago button').forEach(b=>b.classList.toggle('sel', (b.dataset.v === '1') === F.pago));
  $('fDesc').placeholder = ent ? 'Ex: Salário, venda, YouTube' : 'Ex: iFood, tênis, cinema (se deixar vazio, uso o nome da categoria)';
}
function fCat(i){ if (F && S.cats[i]){ F.cat = S.cats[i].n; $('fMsg').textContent = ''; pintarForm(); } }
function apagarDoForm(){ const id = F && F.id; fecharForm(); if (id) excluir(id); }
const inicial = () => (S.perfil.nome.trim()[0] || '?').toUpperCase();
const avatarTxt = () => S.perfil.avatar === 'inicial' ? inicial() : S.perfil.avatar;
function saudacao(){
  const h = new Date().getHours(), s = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return S.perfil.nome ? `${s}, ${S.perfil.nome}` : s;
}
function pintarPerfil(){
  $('sAv').textContent = avatarTxt();
  $('sNome').textContent = S.perfil.nome || 'Defina seu nome';
  $('oi').textContent = saudacao();
}
function pintarAvatares(){
  $('aAvs').innerHTML = AVATARES.map((a,i)=>`<button type="button" class="chip redondo ${S.perfil.avatar === a ? 'sel' : ''}" onclick="defAvatar(${i})" aria-label="${a === 'inicial' ? 'Usar a inicial do nome' : 'Avatar '+a}">${a === 'inicial' ? esc(inicial()) : a}</button>`).join('');
}
function renderCats(){
  $('aCats').innerHTML = S.cats.map((c,i)=>{
    const n = S.lanc.filter(l=>l.tipo==='gasto' && l.cat===c.n).length;
    return `<div class="catEd">
      <input class="emo" value="${esc(c.ic)}" maxlength="4" aria-label="Ícone de ${esc(c.n)}" onchange="edCat(${i},'ic',this.value)">
      <input value="${esc(c.n)}" maxlength="24" aria-label="Nome da categoria" onchange="edCat(${i},'n',this.value)">
      <input type="color" value="${esc(c.cor)}" aria-label="Cor de ${esc(c.n)}" onchange="edCat(${i},'cor',this.value)">
      <small>${n} lanç.</small>
      <button class="ac del" title="Apagar categoria" aria-label="Apagar ${esc(c.n)}" onclick="delCat(${i})">✕</button></div>`;
  }).join('');
  preencherSelects();
}
function renderAjustes(){
  $('aNome').value = S.perfil.nome;
  pintarAvatares();
  document.querySelectorAll('#aTema button').forEach(b=>b.classList.toggle('sel', b.dataset.v === S.cfg.tema));
  $('aCores').innerHTML = CORES.map(([n,c])=>`<button type="button" class="cor ${S.cfg.cor === c ? 'sel' : ''}" style="background:${c}" title="${n}" aria-label="Cor ${n}" onclick="defCor('${c}')"></button>`).join('');
  $('aCorLivre').value = S.cfg.cor;
  $('aTons').innerHTML = Object.entries(TONS).map(([k,[n,h,s]])=>`<button type="button" class="chip ${S.cfg.tom === k ? 'sel' : ''}" onclick="defTom('${k}')"><i class="amostra" style="background:hsl(${h},${s}%,${PAL.escuro ? 14 : 88}%)"></i>${n}</button>`).join('');
  $('nVenc').checked = S.cfg.avVenc; $('nOrc').checked = S.cfg.avOrc; $('nSaldo').checked = S.cfg.avSaldo; $('nNav').checked = S.cfg.avNav;
  $('nDias').value = String(S.cfg.diasAviso);
  renderCats();
}

/* ===================== BACKUP, PLANILHA E RECOMEÇO ===================== */
function baixar(conteudo, nome, tipo){
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([conteudo], {type:tipo}));
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}
function exportar(){ baixar(JSON.stringify(S,null,2), `backup-financas-${hojeISO()}.json`, 'application/json'); toast('Backup baixado.'); }
function csvTexto(s){ return /^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'"+s : s; }
function exportarCSV(soLista){
  const L = soLista ? filtrados() : [...S.lanc].sort((a,b)=>a.data.localeCompare(b.data));
  if (!L.length) return toast('Não há lançamentos para baixar.');
  const linhas = [['Data','Tipo','Categoria','Descrição','Valor','Situação'],
    ...L.map(l=>[dBR(l.data), l.tipo === 'entrada' ? 'Entrada' : 'Gasto', csvTexto(l.cat), csvTexto(l.desc),
                 (l.tipo === 'entrada' ? l.valor : -l.valor).toFixed(2).replace('.',','), l.tipo === 'gasto' ? (l.pago ? 'Pago' : 'A pagar') : ''])];
  baixar('\ufeff' + linhas.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n'), `financas-${hojeISO()}.csv`, 'text/csv;charset=utf-8');
  toast(`Planilha baixada com ${plural(L.length,'lançamento','lançamentos')}.`);
}
/* ===================== NAVEGAÇÃO, AVISO RÁPIDO E INÍCIO ===================== */
let pg = 'painel';
function abrir(p){
  pg = p;
  document.querySelectorAll('.pg').forEach(s=>s.classList.toggle('ativa', s.id === 'pg-'+p));
  document.querySelectorAll('[data-pg]').forEach(b=>b.classList.toggle('ativa', b.dataset.pg === p));
  $('tituloPg').textContent = PGS[p];
  $('barraPeriodo').style.display = p === 'ajustes' ? 'none' : '';
  fecharNotif();
  if (p === 'ajustes') renderAjustes();
  render();
  window.scrollTo(0,0);
}
function render(){
  renderPeriodo(); pintarPerfil();
  if (pg === 'painel') renderPainel();
  else if (pg === 'lanc') renderLanc();
  else if (pg === 'graficos') renderGraficos();
  else if (pg === 'orc') renderOrc();
  renderNotif();

}
let toastT, toastFn = null;
function toast(t, rot, fn){
  $('toastTx').textContent = t;
  const b = $('toastBt'); toastFn = fn || null;
  b.style.display = fn ? 'inline' : 'none'; b.textContent = rot || '';
  $('toast').classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(()=>$('toast').classList.remove('on'), fn ? 7000 : 3000);
}
$('toastBt').onclick = () => { if (toastFn){ const f = toastFn; toastFn = null; $('toast').classList.remove('on'); f(); } };

$('pModo').addEventListener('click', e=>{
  const bt = e.target.closest('button'); if (!bt) return;
  P.modo = bt.dataset.v;
  if (P.modo === 'custom' && !P.de && !P.ate){ const [a,b] = intervalo({modo:'mes', ref:P.ref}); P.de = a; P.ate = b; }
  render();
});
$('aTema').addEventListener('click', e=>{ const bt = e.target.closest('button'); if (bt) defTema(bt.dataset.v); });
$('fTipo').addEventListener('click', e=>{ const bt = e.target.closest('button'); if (bt && F){ F.tipo = bt.dataset.v; $('fMsg').textContent = ''; pintarForm(); } });
$('fPago').addEventListener('click', e=>{ const bt = e.target.closest('button'); if (bt && F){ F.pago = bt.dataset.v === '1'; F.tocou = true; pintarForm(); } });
$('fData').addEventListener('change', ()=>{ if (F && !F.tocou){ F.pago = $('fData').value <= hojeISO(); pintarForm(); } });
$('notif').addEventListener('click', e=>e.stopPropagation());
document.addEventListener('click', fecharNotif);
document.addEventListener('keydown', e=>{
  if (e.key === 'Escape'){ fecharForm(); fecharNotif(); }
  if (e.key === 'Enter' && F && e.target.matches && e.target.matches('#fVal,#fDesc,#fData')) salvarForm();
});
if (window.matchMedia){
  const mq = matchMedia('(prefers-color-scheme: dark)'), f = () => { if (S && S.cfg.tema === 'auto'){ aplicarTema(); render(); } };
  if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f);
}
if (temChart) Chart.defaults.animation.duration = 450;
else document.querySelectorAll('.chartbox').forEach(b=>{ b.innerHTML = '<div class="vazio">Os gráficos não carregaram. As listas e tabelas de números continuam funcionando.</div>'; });
