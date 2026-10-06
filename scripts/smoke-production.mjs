import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { put as clientPut } from '@vercel/blob/client';
import { del } from '@vercel/blob';
const base=process.env.TEST_BASE_URL||'https://muhammad-waiz-imran.vercel.app';
if(!process.env.TEST_ADMIN_PASSWORD)throw Error('Set TEST_ADMIN_PASSWORD');
let cookie='';
async function req(route,method='GET',payload){const r=await fetch(base+route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:base,'Content-Type':'application/json'}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {r,data};}
let x=await req('/api/content','PUT',{});assert.equal(x.r.status,401);
x=await req('/api/login','POST',{password:process.env.TEST_ADMIN_PASSWORD});assert.equal(x.r.status,200,JSON.stringify(x.data));cookie=x.r.headers.get('set-cookie').split(';')[0];
assert.equal((await req('/api/auth-status')).data.authenticated,true);console.log('Login and access control passed');
const current=(await req('/api/content')).data;assert.equal((await req('/api/content','PUT',current)).r.status,200);assert.deepEqual((await req('/api/content')).data,current);console.log('Content persistence passed');
const original=(await req('/api/source?file=gallery.css')).data.text;
const before=(await req('/api/backups')).data;
try{
 assert.equal((await req('/api/source','PUT',{file:'gallery.css',text:original+'\n/* deployment persistence check */'})).r.status,200);
 const css=await (await fetch(base+'/gallery.css')).text();assert.ok(css.endsWith('/* deployment persistence check */'));
 const after=(await req('/api/backups')).data;const backup=after.find(n=>!before.includes(n));assert.ok(backup);
 assert.equal((await req('/api/restore','POST',{name:backup})).r.status,200);
 assert.equal(await (await fetch(base+'/gallery.css')).text(),original);console.log('Source persistence and restore passed');
}finally{if((await req('/api/source?file=gallery.css')).data.text!==original)await req('/api/source','PUT',{file:'gallery.css',text:original});}
const pathname='media/upload-verification-'+Date.now()+'.png';
x=await req('/api/upload-token','POST',{type:'blob.generate-client-token',payload:{pathname,multipart:false,clientPayload:null}});assert.equal(x.r.status,200,JSON.stringify(x.data));assert.ok(x.data.clientToken);
let blob;
try{blob=await clientPut(pathname,await fs.readFile('public/media/badge-1.png'),{access:'private',token:x.data.clientToken,contentType:'image/png'});const media=await fetch(base+'/api/media?file='+encodeURIComponent(blob.pathname));assert.equal(media.status,200);assert.match(media.headers.get('content-type'),/image\/png/);console.log('Authenticated direct upload and media delivery passed');}finally{if(blob)await del(blob.url);}
assert.equal((await req('/api/logout','POST',{})).r.status,200);assert.equal((await req('/api/auth-status')).data.authenticated,false);assert.equal((await req('/api/source')).r.status,401);console.log('Logout revocation passed');
