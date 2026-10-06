import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/content.json','utf8'));
const projects=new Set();
for(const p of data.projects){if(projects.has(p.id))throw Error('Duplicate project '+p.id);projects.add(p.id);}
function verify(value){
 if(typeof value==='string'&&value.startsWith('/media/')&&!fs.existsSync('public'+value))throw Error('Missing asset '+value);
 if(Array.isArray(value))value.forEach(verify);
 else if(value&&typeof value==='object')Object.values(value).forEach(verify);
}
verify(data);
console.log(`Verified ${projects.size} projects and content media references.`);
