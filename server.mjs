import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const dataDir = process.env.PORTFOLIO_DATA_DIR ? path.resolve(process.env.PORTFOLIO_DATA_DIR) : path.join(root, 'data');
const contentFile = path.join(dataDir, 'content.json');
const authFile = path.join(dataDir, 'admin.json');
const port = Number(process.env.PORT || 5200);
const host = process.env.HOST || '127.0.0.1';
const sessions = new Map();
const attempts=new Map();
const backupDir=path.join(dataDir,'backups');
await fsp.mkdir(backupDir,{recursive:true});
async function backup(kind,file,text){const name=Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.json';await fsp.writeFile(path.join(backupDir,name),JSON.stringify({kind,file,text}));}
function sourcePath(name){if(typeof name!=='string'||!/^[-a-zA-Z0-9_./]+\.(html|css|js)$/.test(name))throw Error('Invalid source filename');const file=path.resolve(publicDir,name);if(!file.startsWith(publicDir+path.sep))throw Error('Invalid source path');return file;}
async function sources(dir=publicDir){const items=await fsp.readdir(dir,{withFileTypes:true});const result=[];for(const item of items){if(item.name==='media'||item.name==='vendor')continue;const file=path.join(dir,item.name);if(item.isDirectory())result.push(...await sources(file));else if(/\.(html|css|js)$/.test(item.name))result.push(path.relative(publicDir,file).split(path.sep).join('/'));}return result;}

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.pdf':'application/pdf', '.ico':'image/x-icon' };

function json(res, code, value, headers={}) { res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...headers }); res.end(JSON.stringify(value)); }
function safeOrigin(req) { const origin=req.headers.origin; return !origin || origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`; }
function hashPassword(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function adminSession(req) { const token=(req.headers.cookie||'').match(/(?:^|; )waiz_admin=([a-f0-9]{64})/)?.[1]; const expires=token&&sessions.get(token); if (!expires || expires<Date.now()) { if(token) sessions.delete(token); return false; } return true; }
async function body(req, max=2_000_000) { const parts=[]; let size=0; for await(const part of req){size+=part.length;if(size>max)throw new Error('Payload too large');parts.push(part);}return Buffer.concat(parts); }
async function streamFile(res, file, req) {
  const stat=await fsp.stat(file); if(!stat.isFile())throw new Error('Not a file');
  const type=mime[path.extname(file).toLowerCase()]||'application/octet-stream';
  const headers={'Content-Type':type,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
  if (file.endsWith('.html')) headers['Cache-Control']='no-store';
  const match=/bytes=(\d*)-(\d*)/.exec(req.headers.range||'');
  if(match){const start=match[1]?Number(match[1]):0;const end=match[2]?Math.min(Number(match[2]),stat.size-1):stat.size-1;if(start> end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});fs.createReadStream(file,{start,end}).pipe(res);return;}
  res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);
}

const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/api/')) {
      if(req.method!=='GET'&&!safeOrigin(req))return json(res,403,{error:'Origin rejected'});
      if(pathname==='/api/content'&&req.method==='GET')return json(res,200,JSON.parse(await fsp.readFile(contentFile,'utf8')));
      if(pathname==='/api/auth-status'&&req.method==='GET')return json(res,200,{configured:fs.existsSync(authFile),authenticated:adminSession(req)});
      if(pathname==='/api/setup'&&req.method==='POST') {
        if(fs.existsSync(authFile))return json(res,409,{error:'Admin is already configured'});
        const {password}=JSON.parse((await body(req)).toString());
        if(typeof password!=='string'||password.length<12)return json(res,400,{error:'Use at least 12 characters'});
        const salt=crypto.randomBytes(24).toString('hex');
        await fsp.writeFile(authFile,JSON.stringify({salt,hash:hashPassword(password,salt)}),{flag:'wx',mode:0o600});
        return json(res,201,{ok:true});
      }
      if(pathname==='/api/login'&&req.method==='POST') {
        if(!fs.existsSync(authFile))return json(res,400,{error:'Set up admin first'});
        const key=req.socket.remoteAddress;const rate=attempts.get(key);if(rate&&rate.until>Date.now()&&rate.count>=10)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});attempts.set(key,{count:rate&&rate.until>Date.now()?rate.count+1:1,until:Date.now()+900000});
        const {password}=JSON.parse((await body(req)).toString());
        const saved=JSON.parse(await fsp.readFile(authFile,'utf8'));
        const actual=Buffer.from(hashPassword(String(password||''),saved.salt),'hex');
        const expected=Buffer.from(saved.hash,'hex');
        if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return json(res,401,{error:'Incorrect password'});
        attempts.delete(key);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+12*60*60*1000);
        return json(res,200,{ok:true},{'Set-Cookie':`waiz_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${req.socket.encrypted?'; Secure':''}`});
      }
      if(pathname==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/waiz_admin=([a-f0-9]{64})/)?.[1];if(token)sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':'waiz_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
      if(!adminSession(req))return json(res,401,{error:'Sign in required'});
      if(pathname==='/api/content'&&req.method==='PUT') {
        const incoming=JSON.parse((await body(req,4_000_000)).toString());
        if(!incoming||typeof incoming.site!=='object'||!Array.isArray(incoming.projects)||!Array.isArray(incoming.certificates)||!Array.isArray(incoming.services)||!Array.isArray(incoming.experience))return json(res,400,{error:'Invalid content structure'});
        if(!Array.isArray(incoming.sections)||!Array.isArray(incoming.skills)||!incoming.design||typeof incoming.design.css!=='string')return json(res,400,{error:'Sections, skills and design are required'});
        const ids=incoming.sections.map(x=>x.id);if(ids.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_]+$/.test(id))||new Set(ids).size!==ids.length)return json(res,400,{error:'Section IDs must be unique and use letters, numbers or hyphens'});
        for(const key of ['featuredLimit','certificateLimit'])if(!Number.isInteger(incoming.design[key])||incoming.design[key]<0)return json(res,400,{error:'Preview counts must be non-negative whole numbers'});
        await backup('content','content.json',await fsp.readFile(contentFile,'utf8'));const temp=contentFile+'.tmp';await fsp.writeFile(temp,JSON.stringify(incoming,null,2));await fsp.rename(temp,contentFile);return json(res,200,{ok:true});
      }
      if(pathname==='/api/source'&&req.method==='GET'){const name=url.searchParams.get('file');return json(res,200,name?{text:await fsp.readFile(sourcePath(name),'utf8')}:await sources());}
      if(pathname==='/api/source'&&req.method==='PUT'){const {file,text}=JSON.parse((await body(req,4000000)).toString());const target=sourcePath(file);if(typeof text!=='string')return json(res,400,{error:'Source must be text'});if(fs.existsSync(target))await backup('source',file,await fsp.readFile(target,'utf8'));await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.writeFile(target,text);return json(res,200,{ok:true});}
      if(pathname==='/api/backups'&&req.method==='GET')return json(res,200,(await fsp.readdir(backupDir)).filter(n=>/^[0-9]+-[a-f0-9]+\.json$/.test(n)).sort().reverse());
      if(pathname==='/api/restore'&&req.method==='POST'){const {name}=JSON.parse((await body(req)).toString());if(!/^[0-9]+-[a-f0-9]+\.json$/.test(name))return json(res,400,{error:'Invalid backup'});const item=JSON.parse(await fsp.readFile(path.join(backupDir,name),'utf8'));const target=item.kind==='content'?contentFile:sourcePath(item.file);await backup(item.kind,item.file,await fsp.readFile(target,'utf8'));await fsp.writeFile(target,item.text);return json(res,200,{ok:true});}
      if(pathname==='/api/upload'&&req.method==='POST') {
        const contentType=(req.headers['content-type']||'').split(';')[0];
        const ext=({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','video/mp4':'.mp4','application/pdf':'.pdf'})[contentType];
        if(!ext)return json(res,415,{error:'Use PNG, JPG, WebP, MP4 or PDF'});
        const bytes=await body(req,30_000_000);const name=`upload-${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
        await fsp.writeFile(path.join(publicDir,'media',name),bytes,{flag:'wx'});return json(res,201,{url:`/media/${name}`});
      }
      return json(res,404,{error:'API route not found'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const routes={'/':'index.html','/projects':'projects.html','/certifications':'certifications.html','/admin':'admin.html','/glass':'glass.html'};
    const target=routes[pathname]||pathname.replace(/^\//,'');
    const file=path.resolve(publicDir,target);
    if(file!==publicDir&&!file.startsWith(publicDir+path.sep)){res.writeHead(403);res.end();return;}
    await streamFile(res,file,req);
  } catch(error) { if(error.code==='ENOENT'){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found');}else if(error.message==='Payload too large')json(res,413,{error:error.message});else{console.error(error);json(res,500,{error:'Server error'});} }
});
server.listen(port,host,()=>console.log(`Portfolio running at http://${host}:${port}`));
