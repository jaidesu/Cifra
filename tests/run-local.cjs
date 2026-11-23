const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const base=process.cwd(),runtime=path.join(base,'.runtime');
const php=path.join(runtime,'php/php.exe'), dir=path.join(runtime,'php/ext');
const args=['-n','-d','extension_dir='+dir,'-d','extension=pdo_mysql','-d','session.save_path='+path.join(runtime,'sessions')];
const conf=JSON.parse(spawnSync(php,['-n','-r',"echo json_encode(require '.runtime/test-config.php');"],{encoding:'utf8'}).stdout);
const password=require('node:crypto').randomBytes(18).toString('hex');
const id=Date.now();
const env={...process.env,CIFRA_DSN:conf.dsn,CIFRA_DB_USER:conf.user,CIFRA_DB_PASSWORD:conf.password,CIFRA_TEST_URL:'http://127.0.0.1:18786/',CIFRA_TEST_A:'a'+id+'@example.invalid',CIFRA_TEST_B:'b'+id+'@example.invalid',CIFRA_TEST_PASSWORD:password,TMP:runtime,TEMP:runtime};
// The local launcher reserves this separate database and port for synthetic accounts.
const reset=spawnSync(php,[...args,'-r',"require 'app/bootstrap.php'; if (query('SELECT DATABASE()')->fetchColumn() !== 'cifra_tests') exit(1); query('DELETE FROM login_attempts');"],{env,encoding:'utf8'});
if (reset.status!==0) throw Error('O executor exige o banco local cifra_tests.');
for (const email of [env.CIFRA_TEST_A,env.CIFRA_TEST_B]) {
 const user=spawnSync(php,[...args,'bin/create-user.php',email,'Conta fictícia'],{env,input:password+'\n',encoding:'utf8'});
 if(user.status)throw Error(user.stderr);
}
const server=spawn(php,[...args,'-S','127.0.0.1:18786','-t','public'],{env,windowsHide:true,stdio:'ignore'});
async function test() {
 for(let i=0;i<50;i++){try{await (await fetch(env.CIFRA_TEST_URL)).text();break;}catch{await new Promise(r=>setTimeout(r,100));}}
 for(const file of process.argv.slice(2)) {
 const code=await new Promise(resolve=>spawn(process.execPath,[file],{env,windowsHide:true,stdio:'inherit'}).on('exit',resolve));
 if(code!==0)throw Error(file+' falhou.');
 }
}
test().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>server.kill());

