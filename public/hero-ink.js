import { NothFluid, originalSettings } from './noth-fluid.js';

const hero = document.querySelector('.noth-hero');
const title = document.getElementById('hero-title');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const base = document.createElement('canvas');
const reveal = document.createElement('canvas');
let fluid;
let resizing;

function paintLayers() {
  const bounds = hero.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  for (const canvas of [base, reveal]) {
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = canvas === base ? '#fff' : '#050505';
    ctx.fillRect(0, 0, bounds.width, bounds.height);
  }
  const ctx = base.getContext('2d');
  ctx.fillStyle = '#050505';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const line of title.children) {
    const rect = line.getBoundingClientRect();
    const style = getComputedStyle(line);
    const size = parseFloat(style.fontSize);
    ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    ctx.letterSpacing = style.letterSpacing;
    const metrics = ctx.measureText(line.textContent);
    const ascent = metrics.fontBoundingBoxAscent || size * .95;
    const descent = metrics.fontBoundingBoxDescent || size * .25;
    const baseline = rect.top - bounds.top + (rect.height - ascent - descent) / 2 + ascent;
    ctx.fillText(line.textContent, rect.left - bounds.left + rect.width / 2, baseline);
  }
  const r = reveal.getContext('2d');
  const area = title.getBoundingClientRect();
  const role=(document.getElementById('hero-role')?.textContent||'Forward Deployed Engineer').trim().toUpperCase();
  const words=role.split(/\s+/);
  const lines=bounds.width<650?words:[words.slice(0,-1).join(' '),words.at(-1)].filter(Boolean);
  let size = Math.min(area.height / (lines.length * 1.07), bounds.width * .11);
  r.font = `800 ${size}px Manrope`;
  size *= Math.min(1, bounds.width * .94 / Math.max(...lines.map(line => r.measureText(line).width)));
  r.font = `800 ${size}px Manrope`;
  r.fillStyle = '#fff';
  r.textAlign = 'center';
  r.textBaseline = 'middle';
  const gap = size * 1.02;
  const center = area.top - bounds.top + area.height / 2;
  lines.forEach((line, i) => r.fillText(line, bounds.width / 2, center + (i - (lines.length - 1) / 2) * gap));
  if (fluid) {
    fluid._cleanRendered = false;
    fluid.baseTexture.needsUpdate = true;
    fluid.revealTexture.needsUpdate = true;
    fluid.baseAspect = base.width / base.height;
    fluid.revealAspect = reveal.width / reveal.height;
  }
}

async function entrance() {
  if (reduced.matches) return;
  const lines = [...title.children];
  const originals = lines.map(line => line.textContent);
  const letters = [];
  lines.forEach(line => {
    const text = line.textContent;
    line.textContent = '';
    for (const character of text) {
      const letter = document.createElement('span');
      letter.className = 'intro-letter';
      letter.textContent = character === ' ' ? '\u00a0' : character;
      line.append(letter);
      letters.push(letter);
    }
  });
  const order = letters.map((_, i) => i).sort(() => Math.random() - .5);
  await Promise.all(letters.map((letter, i) => letter.animate([
    {transform: 'translateY(120%)'}, {transform: 'translateY(0)'}
  ], {duration:1800, delay:200 + order.indexOf(i) * 70, easing:'cubic-bezier(.76,0,.24,1)', fill:'both'}).finished));
  lines.forEach((line, i) => line.textContent = originals[i]);
}

async function start() {
  await document.fonts.ready;
  await entrance();
  paintLayers();
  try {
    fluid = new NothFluid(hero, base, reveal, {
      ...originalSettings,
      // Wider dye injection keeps the two-line hero reveal substantial.
      splatRadius: 0.00065,
      revealSize: 5.2,
      dyeDissipation: 0.991
    });
    hero.classList.add('fluid-ready');
    let inView = true;
    const syncAnimation = () => {
      cancelAnimationFrame(fluid._rafId);
      if (inView && !document.hidden && !reduced.matches) fluid._rafId = requestAnimationFrame(fluid._animate);
    };
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncAnimation(); }).observe(hero);
    document.addEventListener('visibilitychange', syncAnimation);
    reduced.addEventListener('change', syncAnimation);
    if (reduced.matches) {
      cancelAnimationFrame(fluid._rafId);
      fluid._renderClean();
    }
    const refresh = () => { clearTimeout(resizing); resizing = setTimeout(paintLayers, 140); };
    new ResizeObserver(refresh).observe(hero);
    new MutationObserver(refresh).observe(title, {childList:true,subtree:true,characterData:true});
    hero.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      const rect = hero.getBoundingClientRect();
      fluid.prevMouse = {x:(event.clientX-rect.left)/rect.width-.012,y:1-(event.clientY-rect.top)/rect.height};
      fluid.mouse = {...fluid.prevMouse,x:fluid.prevMouse.x+.012};
      fluid.mouseHasMoved = true;
    });
  } catch (error) {
    console.warn('Fluid renderer unavailable; retaining accessible headline.', error);
  }
}
start();
