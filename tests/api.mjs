// Run against a separate, disposable database with two newly created accounts.
import assert from 'node:assert/strict';

const base = process.env.CIFRA_TEST_URL;
if (!base || !process.env.CIFRA_TEST_PASSWORD) throw Error('Configure a URL e as contas de teste conforme o README.');
async function client(email) {
  let cookie='', csrf='', revision=0;
  async function request(route,data,token=csrf) {
    const options = {headers:{Cookie:cookie}};
    if (data !== undefined) Object.assign(options,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify(data)});
    const res = await fetch(base+'api/index.php?r='+route,options);
    const set = res.headers.get('set-cookie');
    if (set) cookie=set.split(';')[0];
    const body = await res.json();
    if (body.data?.csrf) csrf=body.data.csrf;
    if (body.data?.revision !== undefined) revision=body.data.revision;
    return {status:res.status,...body};
  }
  const me = await request('auth/me');
  assert.equal(me.data.user,null);
  assert.equal((await request('state')).status,401);
  assert.equal((await request('auth/login',{email,password:'incorrect'})).status,401);
  const old=cookie;
  assert.equal((await request('auth/login',{email,password:process.env.CIFRA_TEST_PASSWORD})).status,200);
  assert.notEqual(cookie,old);
  await request('state');
  return {request,change:(route,p={},token)=>request(route,{revision,...p},token)};
}

const a=await client(process.env.CIFRA_TEST_A), b=await client(process.env.CIFRA_TEST_B);
const state=async c=>(await c.request('state')).data;
const initial=await state(a);
assert.equal(initial.state.lanc.length,0);
assert.equal(initial.state.cats.length,9);
const row={tipo:'gasto',cat:'Comida',desc:'Compra fictícia',valor:12.34,data:'2024-02-29',pago:false};
const income={...row,tipo:'entrada',cat:'Entrada',valor:1000};
async function ok(client,route,p) {
  const res=await client.change(route,p);
  assert.equal(res.status,200,JSON.stringify(res.error));
  return res.data.state;
}
assert.equal((await a.change('transactions/add',{rows:[row]},'')).status,403);
assert.equal((await a.change('transactions/add',{rows:[row],user_id:5})).status,422);
let s=await ok(a,'transactions/add',{rows:[row,income]});
assert.equal(s.lanc.length,2);
assert.equal((await state(b)).state.lanc.length,0);
assert.equal((await b.change('transactions/edit',{id:s.lanc[0].id,row})).status,422);
assert.equal((await b.change('transactions/delete',{id:s.lanc[0].id})).status,422);
assert.equal((await a.request('settings/set',{revision:0,cfg:{tom:'musgo'}})).status,409);
assert.equal((await a.change('transactions/add',{rows:[row,{...row, data:'2024-02-31'}]})).status,422);
assert.equal((await state(a)).state.lanc.length,2);
await ok(a,'transactions/edit',{id:s.lanc[0].id,row:{...row,pago:true}});
await ok(a,'categories/add',{category:{n:'Mercado',ic:'🛒',cor:'#223344'}});
assert.equal((await b.change('budgets/set',{name:'Mercado',amount:100})).status,422);
await ok(a,'budgets/set',{name:'Comida',amount:150.25});
s=await ok(a,'categories/edit',{name:'Comida',category:{n:'Refeições',ic:'🍽️',cor:'#223344'}});
assert.equal(s.lanc[0].cat,'Refeições');
assert.equal(s.orc['Refeições'],150.25);
assert.equal((await a.change('categories/delete',{name:'Refeições'})).status,422);
await ok(a,'categories/delete',{name:'Mercado'});
await ok(a,'settings/set',{cfg:{tom:'musgo'},perfil:{nome:'Teste'}});
s=await ok(a,'notifications/dismiss',{keys:['teste']});
const backup=structuredClone(s);
s=await ok(a,'transactions/shift',{years:1});
assert.equal(s.lanc[0].data,'2025-02-28');
await ok(a,'transactions/delete',{id:s.lanc[0].id});
await ok(a,'transactions/undo',{id:s.lanc[0].id,row:s.lanc[0]});
await ok(a,'transactions/clear',{});
s=await ok(a,'backup/restore',{backup});
assert.deepEqual(s,backup);
assert.deepEqual(await ok(a,'backup/restore',{backup}),backup);
const bad={...backup,lanc:[...backup.lanc,backup.lanc[0]]};
assert.equal((await a.change('backup/restore',{backup:bad})).status,422);
assert.deepEqual((await state(a)).state,backup);
const same=await client(process.env.CIFRA_TEST_A);
assert.deepEqual((await state(same)).state,backup);
await a.request('auth/logout',{});
assert.equal((await a.request('state')).status,401);
console.log('OK: login, sessão, CSRF, isolamento, CRUD, datas, limites, concorrência, persistência e restauração atômica.');

