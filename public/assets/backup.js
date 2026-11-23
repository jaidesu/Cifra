'use strict';
function backupState(input) {
  if (!input || !Array.isArray(input.lanc)) throw new Error('O arquivo precisa conter a lista de lançamentos.');
  if (![undefined,1,2,3,4].includes(input.ver)) throw new Error('Versão de backup desconhecida.');
  let state;
  if (input.ver === 4) {
    state = input;
  } else {
    const months = {Dezembro:[0,12],Janeiro:[1,1],Fevereiro:[1,2],'Março':[1,3],Abril:[1,4],Maio:[1,5]};
    const today = new Date(), base = today.getFullYear() - (today.getMonth()<5 ? 1 : 0);
    let largest = input.lanc.reduce((n,l)=>Math.max(n,Number(l?.id)||0),0);
    const cats = CATS_PADRAO.map(c=>({...c}));
    const lanc = input.lanc.map((l,i)=>{
      const month = months[l?.mes];
      if (!Array.isArray(month) || !['entrada','gasto'].includes(l.tipo)) throw new Error('Mês ou tipo inválido no lançamento '+(i+1)+'.');
      const income = l.tipo==='entrada', cat = income ? 'Entrada' : l.cat || 'Outros';
      if (!income && !cats.some(c=>c.n===cat)) cats.push({n:cat,ic:'📦',cor:'#94a3b8'});
      const raw = String(l.desc || '');
      const due = /vence\s+(\d{1,2})\//i.exec(raw);
      const day = due ? Math.max(1,Math.min(28,Number(due[1]))) : 1;
      return {id:l.id ? Number(l.id) : ++largest,tipo:l.tipo,cat,desc:raw.replace(/\s*\(vence [^)]*\)/i,'').trim() || cat,
              valor:Number(l.valor),data:(base+month[0])+'-'+pad(month[1])+'-'+pad(day),pago:!income && !!l.pago};
    });
    state = {ver:4,lanc,cats,nid:Math.max(largest+1,Number(input.nid)||1),orc:{},disp:[],migradoDe:3,anoMigracao:base};
  }
  state.cfg = {tema:'escuro',cor:'#e11d2e',tom:'neutro',diasAviso:5,avVenc:true,avOrc:true,avSaldo:true,avNav:false,...state.cfg};
  state.perfil = {nome:state.perfil?.nome ?? '',avatar:state.perfil?.avatar ?? 'inicial'};
  if (!Array.isArray(state.cats) || !Array.isArray(state.disp) || !state.orc || typeof state.orc !== 'object' || Array.isArray(state.orc)) throw new Error('Categorias, orçamentos ou avisos inválidos.');
  const old = state.cats.find(c=>c.n==='Thayna');
  if (old) {
    if (state.cats.some(c=>c.n==='Social')) state.cats = state.cats.filter(c=>c!==old);
    else { old.n='Social'; if (old.ic==='❤️') old.ic='🎉'; }
    for (const row of state.lanc) if (row.cat==='Thayna') row.cat='Social';
    if (Object.hasOwn(state.orc,'Thayna')) {
      if (Object.hasOwn(state.orc,'Social') && state.orc.Social !== state.orc.Thayna) throw new Error('O backup contém limites diferentes para Thayna e Social. Confira a cópia antes de restaurar.');
      state.orc.Social=state.orc.Thayna;
      delete state.orc.Thayna;
    }
  }
  return state;
}

function backupReport(state) {
  let incomes=0, expenses=0, received=0n, spent=0n, paid=0;
  for (const [i,l] of state.lanc.entries()) {
    if (!l || !['entrada','gasto'].includes(l.tipo) || typeof l.valor !== 'number' ||
        !Number.isFinite(l.valor) || l.valor<=0 || l.valor>=1e12 || Math.abs(l.valor-r2(l.valor))>0.000001) {
      throw new Error('Confira o tipo e o valor do lançamento '+(i+1)+'.');
    }
    const cents = BigInt(Math.round(l.valor*100));
    if (l.tipo==='entrada') { incomes++; received+=cents; }
    else { expenses++; spent+=cents; if (l.pago) paid++; }
  }
  const reais = v=>'R$ '+(v/100n).toLocaleString('pt-BR')+','+String(v%100n).padStart(2,'0');
  return [incomes+' entrada(s) · '+reais(received),expenses+' despesa(s) · '+reais(spent),
    paid+' paga(s), '+(expenses-paid)+' pendente(s)',state.cats.length+' categoria(s), '+Object.keys(state.orc).length+' orçamento(s)'].join('\n');
}

async function importar(event) {
  const file = event.target.files[0];
  event.target.value='';
  if (!file || busy || stale) return;
  try {
    if (file.size>8*1024*1024) throw new Error('O backup excede 8 MiB.');
    const data=backupState(JSON.parse(await file.text()));
    const report=backupReport(data);
    const year=data.migradoDe ? '\nDatas convertidas a partir de dezembro de '+data.anoMigracao+'.' : '';
    if (!confirm('Substituir os dados desta conta pelo backup?\n\n'+report+year+'\n\nGuarde uma cópia do estado atual antes de continuar.')) return;
    const saved=await change('backup/restore',{backup:data},()=>{ P={modo:'mes',ref:periodoInicial(),de:'',ate:''}; });
    if (saved) {
      const actual=backupReport(S);
      alert((actual===report ? 'Backup restaurado e totais conferidos.' : 'Os totais recuperados exigem conferência.')+'\n\n'+actual);
    }
  } catch (error) {
    syncMessage(error instanceof SyntaxError ? 'O arquivo não contém JSON válido.' : error.message,true);
  }
}

