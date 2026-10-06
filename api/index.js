import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { get, put, list, del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

const root=process.cwd(), publicDir=path.join(root,'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf','.mp4':'video/mp4'};
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function read(key){const result=await get(key,{access:'private',useCache:false});return result?await new Response(result.stream).text():null;}
async function write(key,text){return put(key,text,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});}
async function keys(prefix){let cursor;const result=[];do{const page=await list({prefix,cursor});result.push(...page.blobs.map(b=>b.pathname));cursor=page.hasMore?page.cursor:undefined;}while(cursor);return result;}
async function body(req){if(req.body!==undefined)return typeof req.body==='string'?JSON.parse(req.body):req.body;let bytes=0;const parts=[];for await(const part of req){bytes+=part.length;if(bytes>4000000)throw Error('Payload too large');parts.push(part);}return JSON.parse(Buffer.concat(parts).toString());}
function sourceName(name){if(typeof name!=='string'||!/^[-a-zA-Z0-9_/]+\.(html|css|js)$/.test(name)||name.split('/').some(s=>s==='..')||name.startsWith('/'))throw Error('Invalid source filename');return name;}
async function sourceRead(name){sourceName(name);return await read('cms/source/'+name)??await fs.readFile(path.join(publicDir,name),'utf8');}
async function sourceList(){const local=(await fs.readdir(publicDir)).filter(n=>/\.(html|css|js)$/.test(n));const custom=(await keys('cms/source/')).map(n=>n.slice(11));return [...new Set([...local,...custom])].sort();}
async function contentRead(){return await read('cms/content.json')??await fs.readFile(path.join(root,'data/content.json'),'utf8');}
async function backup(kind,file,text){const name=Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.json';await write('cms/backups/'+name,JSON.stringify({kind,file,text}));}
function token(req){return (req.headers.cookie||'').match(/(?:^|;\s*)waiz_admin=([a-f0-9]{64})/)?.[1];}
async function authorized(req){const t=token(req);if(!t)return false;const raw=await read('auth/sessions/'+digest(t));return !!raw&&JSON.parse(raw).expires>Date.now();}
function sameOrigin(req){const origin=req.headers.origin;return !origin||origin===`https://${req.headers.host}`;}
function validate(data){if(!data?.site||!['projects','certificates','services','experience','sections','skills'].every(k=>Array.isArray(data[k]))||typeof data.design?.css!=='string')throw Error('Invalid content structure');const ids=data.sections.map(s=>s.id);if(ids.some(id=>!/^[-a-zA-Z0-9_]+$/.test(id))||new Set(ids).size!==ids.length)throw Error('Section IDs must be unique');for(const key of ['featuredLimit','certificateLimit'])if(!Number.isInteger(data.design[key])||data.design[key]<0)throw Error('Invalid preview count');}

export default async function handler(req,res){
 try{
  const url=new URL(req.url,'https://'+req.headers.host);
  const route='/'+String(req.query?.route??url.searchParams.get('route')??url.pathname.replace(/^\//,'')).replace(/^\//,'');
  if(route==='/api/upload-token'&&req.method==='POST'){
   const payload=await body(req);
   const result=await handleUpload({request:req,body:payload,onBeforeGenerateToken:async pathname=>{
    if(!sameOrigin(req)||!await authorized(req))throw Error('Sign in required');
    if(!/^media\/upload-[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf|mp4)$/.test(pathname))throw Error('Invalid media filename');
    return {allowedContentTypes:['image/png','image/jpeg','image/webp','application/pdf','video/mp4'],maximumSizeInBytes:30000000,addRandomSuffix:true,allowOverwrite:false};
   },onUploadCompleted:async()=>{}});
   return json(res,200,result);
  }
  if(route==='/api/media'&&['GET','HEAD'].includes(req.method)){
   const name=url.searchParams.get('file');if(!/^media\/upload-[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp|pdf|mp4)$/.test(name||''))return json(res,404,{error:'Media not found'});
   const result=await get(name,{access:'private'});if(!result)return json(res,404,{error:'Media not found'});
   res.writeHead(200,{'Content-Type':result.blob.contentType,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}Readable.fromWeb(result.stream).pipe(res);return;
  }
  if(route.startsWith('/api/')){
   if(req.method!=='GET'&&!sameOrigin(req))return json(res,403,{error:'Origin rejected'});
   if(route==='/api/content'&&req.method==='GET')return json(res,200,JSON.parse(await contentRead()));
   if(route==='/api/auth-status'&&req.method==='GET')return json(res,200,{configured:true,authenticated:await authorized(req),cloudUploads:true});
   if(route==='/api/setup')return json(res,403,{error:'Production accounts are configured by the server owner.'});
   if(route==='/api/login'&&req.method==='POST'){
    const {password}=await body(req);if(typeof password!=='string'||password.length>1024)return json(res,400,{error:'Invalid password'});
    const salt=process.env.ADMIN_PASSWORD_SALT,hash=process.env.ADMIN_PASSWORD_HASH;if(!salt||!hash)return json(res,503,{error:'Admin configuration unavailable'});
    const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0];const key='auth/attempts/'+digest(ip);const raw=await read(key);let attempts=raw?JSON.parse(raw):{count:0,until:Date.now()+900000};if(attempts.until<Date.now())attempts={count:0,until:Date.now()+900000};if(attempts.count>=10)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
    attempts.count++;await write(key,JSON.stringify(attempts));const actual=crypto.scryptSync(password,salt,64),expected=Buffer.from(hash,'hex');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return json(res,401,{error:'Incorrect password'});
    await del(key);const session=crypto.randomBytes(32).toString('hex');await write('auth/sessions/'+digest(session),JSON.stringify({expires:Date.now()+43200000}));res.setHeader('Set-Cookie',`waiz_admin=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`);return json(res,200,{ok:true});
   }
   if(route==='/api/logout'&&req.method==='POST'){const t=token(req);if(t)await del('auth/sessions/'+digest(t));res.setHeader('Set-Cookie','waiz_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
   if(!await authorized(req))return json(res,401,{error:'Sign in required'});
   if(route==='/api/content'&&req.method==='PUT'){const data=await body(req);validate(data);await backup('content','content.json',await contentRead());await write('cms/content.json',JSON.stringify(data,null,2));return json(res,200,{ok:true});}
   if(route==='/api/source'&&req.method==='GET'){const name=url.searchParams.get('file');return json(res,200,name?{text:await sourceRead(name)}:await sourceList());}
   if(route==='/api/source'&&req.method==='PUT'){const {file,text}=await body(req);sourceName(file);if(typeof text!=='string')throw Error('Source must be text');let old;try{old=await sourceRead(file);}catch(error){if(error.code!=='ENOENT')throw error;}if(old!==undefined)await backup('source',file,old);await write('cms/source/'+file,text);return json(res,200,{ok:true});}
   if(route==='/api/backups'&&req.method==='GET')return json(res,200,(await keys('cms/backups/')).map(n=>n.slice(12)).sort().reverse());
   if(route==='/api/restore'&&req.method==='POST'){const {name}=await body(req);if(!/^[0-9]+-[a-f0-9]+\.json$/.test(name))throw Error('Invalid backup');const raw=await read('cms/backups/'+name);if(!raw)return json(res,404,{error:'Backup not found'});const item=JSON.parse(raw);if(item.kind==='content'){validate(JSON.parse(item.text));await backup('content','content.json',await contentRead());await write('cms/content.json',item.text);}else if(item.kind==='source'){sourceName(item.file);await backup('source',item.file,await sourceRead(item.file));await write('cms/source/'+item.file,item.text);}else throw Error('Invalid backup');return json(res,200,{ok:true});}
   return json(res,404,{error:'API route not found'});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  const routes={'/':'index.html','/projects':'projects.html','/certifications':'certifications.html','/admin':'admin.html','/glass':'glass.html'};
  let name=routes[route]||route.slice(1);if(!path.extname(name))name+='.html';sourceName(name);const text=await sourceRead(name);
  res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:text);
 }catch(error){if(error.code==='ENOENT'||error.message==='Invalid source filename')return json(res,404,{error:'Page not found'});console.error('Portfolio request failed:',error.name,error.message);return json(res,400,{error:'Unable to complete request. Please retry.'});}
}

