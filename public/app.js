const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const validUrl=value=>{try{const url=new URL(String(value),location.origin);return ['http:','https:','mailto:'].includes(url.protocol)?url.href:'#'}catch{return '#'}};
const pad=index=>String(index+1).padStart(2,'0');
let observer;
function reveal(){observer?.disconnect();observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}},{threshold:.08});document.querySelectorAll('.reveal:not(.visible)').forEach(el=>observer.observe(el));}
function setText(id,value){const el=document.getElementById(id);if(el&&value!==undefined)el.textContent=value;}
function setVideo(selector,source){const video=$(selector);if(!video||!source)return;const node=video.querySelector('source');if(node&&node.getAttribute('src')!==source){node.src=source;video.load();}}
function bindCommon(){
  const toggle=$('.menu-toggle');toggle?.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu')});
  $('.mobile-nav')?.addEventListener('click',event=>{if(event.target.closest('a')){document.body.classList.remove('menu-open');toggle?.setAttribute('aria-expanded','false')}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('menu-open');toggle?.setAttribute('aria-expanded','false')}});
  const bar=$('.progress');let ticking=false;const update=()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${max>0?scrollY/max:0})`;ticking=false})};addEventListener('scroll',update,{passive:true});update();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mediaVisibility=new Map();
  const syncMedia=element=>{
    const active=mediaVisibility.get(element)===true&&!document.hidden;
    if(element.tagName==='VIDEO'){
      if(active&&!reduced.matches)element.play().catch(()=>{});else element.pause();
    }else element.contentWindow?.postMessage({type:'portfolio-visibility',visible:active},location.origin);
  };
  const mediaObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    mediaVisibility.set(entry.target,entry.isIntersecting);syncMedia(entry.target);
  }));
  document.querySelectorAll('video, .glass-chapter iframe').forEach(element=>{
    mediaVisibility.set(element,false);mediaObserver.observe(element);syncMedia(element);
    element.addEventListener(element.tagName==='VIDEO'?'loadeddata':'load',()=>syncMedia(element));
  });
  const sync=()=>mediaVisibility.forEach((_,element)=>syncMedia(element));
  document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);
  const artObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('art-in-view',entry.isIntersecting)));
  window.observePortfolioArt=()=>document.querySelectorAll('.featured-art').forEach(el=>artObserver.observe(el));
  window.observePortfolioArt();
  reveal();
}
function serviceMarkup(service,index){return `<article class="method-item reveal"><span class="method-num">${pad(index)} /</span><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p></article>`}
function tagsMarkup(tags){return (Array.isArray(tags)?tags:[]).map(tag=>`<span>${escapeHtml(tag)}</span>`).join('')}
function artMarkup(project,index){if(project.image)return `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} project visual" loading="lazy" decoding="async" width="1448" height="1086">`;
  const labels=(Array.isArray(project.stack)?project.stack:[]).slice(0,4);return `<div class="architecture" aria-label="Technology flow"><div class="architecture-line"><span class="architecture-node">${escapeHtml(labels[0]||'SOURCE')}</span><span class="architecture-arrow">→</span><span class="architecture-node">${escapeHtml(labels[1]||'INGEST')}</span></div><div class="architecture-line"><span class="architecture-arrow">↓</span></div><div class="architecture-line"><span class="architecture-node">${escapeHtml(labels[2]||'PROCESS')}</span><span class="architecture-arrow">→</span><span class="architecture-node">${escapeHtml(labels[3]||'DELIVER')}</span></div></div><div class="architecture-caption"><span>ARCHITECTURE / ${pad(index)}</span><span>MOVE · TRANSFORM · DELIVER</span></div>`}
function featuredMarkup(project,index){return `<article class="featured-card reveal"><div class="featured-copy"><div class="featured-meta"><span>${pad(index)} / PROJECT DELIVERY</span><span>${escapeHtml(project.category)}</span></div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.summary)}</p><div class="featured-tags">${tagsMarkup(project.stack)}</div><div class="featured-links"><a href="/projects#${encodeURIComponent(project.id)}">READ THE CASE ↗</a><a href="${escapeHtml(validUrl(project.github))}" target="_blank" rel="noopener">VIEW CODE ↗</a></div></div><div class="featured-art${project.image?' has-thumbnail':''}">${artMarkup(project,index)}</div></article>`}
function certMarkup(cert,index){return `<a class="cert-card reveal" href="/certificate.html?id=${encodeURIComponent(cert.id)}"><img src="${escapeHtml(cert.image||'')}" alt="${escapeHtml(cert.title)} certificate" loading="lazy"><div class="cert-meta"><span>${escapeHtml(cert.issuer)}</span><span>${escapeHtml(cert.date)}</span></div><h3>${escapeHtml(cert.title)}</h3><span class="cert-open">VIEW CREDENTIAL DETAILS &#8599;</span></a>`}
function renderHome(data){const site=data.site||{};document.title=`${site.name||'Muhammad Waiz Imran'} — ${site.role||'Forward Deployed Engineer'}`;setText('hero-eyebrow',site.eyebrow);setText('hero-role',site.role);setText('hero-line1',site.heroLine1);setText('hero-line2',site.heroLine2);setText('hero-strapline',site.heroStrapline);setText('hero-description',site.heroDescription);setText('about-title',site.aboutTitle);setText('about-body',site.aboutBody);setText('contact-location',(site.location||'').toUpperCase());document.querySelectorAll('.brand-name').forEach(el=>el.textContent=(site.name||'').toUpperCase());const mail=$('#contact-email');if(mail&&site.email){mail.firstChild.textContent=site.email+' ';mail.href='mailto:'+site.email}const github=$('#footer-github');if(github)github.href=validUrl(site.github);const linkedin=$('#footer-linkedin');if(linkedin)linkedin.href=validUrl(site.linkedin);const resume=$('.text-link');if(resume)resume.href=validUrl(site.resume);setVideo('.hero-video',site.heroVideo);setVideo('.manifesto-visual video',site.meshVideo);
  $('#services-list').innerHTML=(data.services||[]).map(serviceMarkup).join('');$('#featured-projects').innerHTML=(data.projects||[]).filter(p=>p.featured).slice(0,Number(data.design?.featuredLimit??3)).map(featuredMarkup).join('');$('#cert-preview').innerHTML=(data.certificates||[]).slice(0,Number(data.design?.certificateLimit??3)).map((c,i)=>certMarkup(c,i)).join('');$('#experience-list').innerHTML=(data.experience||[]).map((e,i)=>`<article class="experience-item reveal"><span class="experience-node" aria-hidden="true">${pad(i)}</span><div class="experience-period">${escapeHtml(e.period)}</div><h3>${escapeHtml(e.role)}</h3><strong>${escapeHtml(e.company)}</strong><div class="experience-description">${String(e.detail||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div></article>`).join('');applyStudio(data);window.observePortfolioArt?.();reveal();}
function projectHref(p){return '/project.html?id='+encodeURIComponent(p.id)}
function archiveProjectMarkup(p,index){return `<article class="gallery-card" id="${escapeHtml(p.id)}"><a class="gallery-open" href="${projectHref(p)}" aria-label="View ${escapeHtml(p.title)} details"><div class="gallery-art">${artMarkup(p,index)}</div><div class="gallery-copy"><div class="gallery-meta"><span>${pad(index)} / ${escapeHtml(p.category)}</span><span aria-hidden="true">&#8599;</span></div><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.summary)}</p><div class="gallery-tags">${tagsMarkup((p.stack||[]).slice(0,4))}</div><span class="gallery-cta">EXPLORE PROJECT <span aria-hidden="true">&#8594;</span></span></div></a></article>`}
function bindArchiveDetails(projects){if(location.hash){const id=decodeURIComponent(location.hash.slice(1));const p=projects.find(x=>x.id===id);if(p)location.replace(projectHref(p));}}
function renderProjects(data){const projects=data.projects||[];let filter='ALL',query='';const categories=['ALL',...new Set(projects.map(p=>p.category))];$('#project-count').textContent=`${projects.length} PROJECTS`;$('.archive-hero .micro').textContent=`FDE PROJECT WORK / 01-${String(projects.length).padStart(2,'0')}`;$('#project-filters').innerHTML=categories.map(c=>`<button type="button" data-filter="${escapeHtml(c)}" class="${c==='ALL'?'active':''}" aria-pressed="${c==='ALL'}">${escapeHtml(c)}</button>`).join('');const draw=()=>{const shown=projects.filter(p=>(filter==='ALL'||p.category===filter)&&`${p.title} ${p.category} ${p.summary} ${(p.stack||[]).join(' ')}`.toLowerCase().includes(query));$('#all-projects').innerHTML=shown.map(p=>archiveProjectMarkup(p,projects.indexOf(p))).join('');$('#project-empty').hidden=shown.length>0};draw();$('#project-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();draw()});$('#project-filters').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;filter=btn.dataset.filter;$('#project-filters').querySelectorAll('button').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});draw()});bindArchiveDetails(projects);}

function renderCertificates(data){const certs=data.certificates||[];$('#cert-count').textContent=`${certs.length} CREDENTIALS`;$('#all-certificates').innerHTML=certs.map((cert,i)=>certMarkup(cert,i)).join('');reveal()}
async function main(){bindCommon();try{const response=await fetch('/api/content');if(!response.ok)throw Error('Content unavailable');const data=await response.json();const custom=document.createElement('style');custom.textContent=data.design?.css||'';document.head.append(custom);const page=document.body.dataset.page;if(page==='home')renderHome(data);if(page==='projects')renderProjects(data);if(page==='certifications')renderCertificates(data)}catch(error){console.error(error);const main=$('main');if(main)main.insertAdjacentHTML('afterbegin','<p class="content-error">Content could not be loaded. Please refresh the page.</p>')}}
function applyStudio(data){
 const main=document.querySelector('main');
 const existing=new Map(Array.from(main.children).filter(e=>e.tagName==='SECTION').map(e=>[e.id,e]));
 for(const config of data.sections||[]){
  let el=existing.get(config.id);
  if(!el){el=document.createElement('section');el.id=config.id;el.className='section-pad manifesto';}
  main.append(el);el.hidden=config.visible===false;
  if(config.html)el.innerHTML=config.html;
  if(config.heading){const h=el.querySelector('h2');if(h)h.textContent=config.heading;else{const h=document.createElement('h2');h.textContent=config.heading;el.prepend(h);}}
  if(config.body){let p=el.querySelector('p');if(!p){p=document.createElement('p');el.append(p);}p.textContent=config.body;}
  existing.delete(config.id);
 }
 if(data.sections)for(const el of existing.values())el.hidden=true;
 if(data.skills){
  document.querySelectorAll('.skill-domain').forEach(e=>e.remove());
  const section=document.querySelector('#skills');const nav=section?.querySelector('.skills-jump');
  const groups=[...new Set(data.skills.map(s=>s.domain))];
  if(nav)nav.innerHTML=groups.map((g,i)=>`<a href="#skills-${escapeHtml(g)}"><span>${pad(i)}</span>${escapeHtml(g)} <b>&#8600;</b></a>`).join('');
  groups.forEach((group,i)=>{const items=data.skills.filter(s=>s.domain===group);const article=document.createElement('article');article.className='skill-domain';article.id=`skills-${escapeHtml(group)}`;article.innerHTML=`<div class="skill-domain-heading"><span class="skill-domain-index">${pad(i)} /</span><div class="skill-orbit" aria-hidden="true"><i></i><i></i><i></i><b>+</b></div><h3>${escapeHtml(({web:'Web & interfaces',cloud:'Cloud & data',ai:'AI & automation'})[group]||group)}</h3><p>${escapeHtml(({web:'Build interfaces around real user workflows and connect them to the application behind it.',cloud:'Connect operational sources to usable data, with infrastructure that supports the complete workflow.',ai:'Integrate models and automation into a focused use case, with outputs people can review and act on.'})[group]||'')}</p><span class="skill-domain-count">${items.length} TOOLS / ${escapeHtml(group.toUpperCase())}</span></div><ul class="skill-grid">${items.map(s=>`<li class="skill-tile"><div class="skill-icon"><img src="${escapeHtml(s.image)}" alt="" loading="lazy" decoding="async"></div><span class="skill-name">${escapeHtml(s.title)}</span><span class="skill-corner" aria-hidden="true">&#8599;</span></li>`).join('')}</ul>`;section?.insertBefore(article,section.querySelector('.skills-outro'));});
  window.observePortfolioSkills?.();
  const total=section?.querySelector('.skills-total strong');if(total)total.textContent=data.skills.length;
 }
 document.querySelectorAll('.noth-social a').forEach(a=>{a.href=validUrl(a.textContent.includes('GITHUB')?data.site.github:data.site.linkedin)});
 window.dispatchEvent(new Event('resize'));
}
main();
