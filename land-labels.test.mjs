import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {landLabels} from './land-labels.mjs';
test('clasificaciones privadas de terrenos, valores válidos y eliminación',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE records(id TEXT,kind TEXT,body TEXT)');
 db.prepare('INSERT INTO records VALUES(?,?,?)').run('p','inmuebles',JSON.stringify({estado:'activo',tipo:'Terreno sin clasificar'}));
 const handler=landLabels(db);
 async function call(user,method='GET',body){let status,result;const req={user:user?{id:user}:null,method,async *[Symbol.asyncIterator](){yield JSON.stringify(body);}};await handler(req,{writeHead(code){status=code;},end(value){result=JSON.parse(value);}},{pathname:'/api/land_labels'});return {status,result};}
 try{
 assert.equal((await call(null)).status,401);
 for(const classification of ['Terreno rústico','Terreno urbano','Terreno sin clasificar'])assert.equal((await call('a','POST',{id:'p',classification})).status,200);
 assert.deepEqual((await call('a')).result,[{id:'p',classification:'Terreno sin clasificar'}]);
 assert.deepEqual((await call('b')).result,[]);
 assert.equal((await call('a','POST',{id:'p',classification:'invalid'})).status,400);
 assert.equal((await call('a','POST',{id:'missing',classification:'Terreno urbano'})).status,404);
 await call('b','POST',{id:'p',remove:true});assert.equal((await call('a')).result.length,1);
 await call('a','POST',{id:'p',remove:true});assert.deepEqual((await call('a')).result,[]);
 }finally{db.close();}
});
