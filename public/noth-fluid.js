// Fluid solver and reveal shaders adapted from https://nothinv1.netlify.app/main.js.
// Original reference: https://www.noth.in/ (Pierre Patrault & Thomas Carre).
import {WebGLRenderer as tA,Scene as T0,OrthographicCamera as Dd,PerspectiveCamera as mi,WebGLRenderTarget as xi,LinearFilter as yt,NearestFilter as an,RGBAFormat as ei,HalfFloatType as zi,Vector2 as dt,Vector3 as Y,PlaneGeometry as Lo,ShaderMaterial as pi,Mesh as Ti,CanvasTexture,SRGBColorSpace} from './vendor/three.module.js';
function Bo(canvas){const texture=new CanvasTexture(canvas);texture.minFilter=yt;texture.magFilter=yt;texture.colorSpace=SRGBColorSpace;return {texture,aspect:canvas.width/canvas.height,onLoaded:null};}
function Jc(){}
const nA=`varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,iA=`varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,rA=`precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

varying vec2 vUv;

vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
  vec4 result = uDissipation * bilerp(uSource, coord, uTexelSize);
  gl_FragColor = result;
}`,sA=`precision highp float;

uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;

varying vec2 vUv;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`,oA=`precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`,aA=`precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDt;

varying vec2 vUv;

void main() {
  float L = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float C = texture2D(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  float len = length(force) + 0.0001;
  force = force / len * uCurlStrength * C;

  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * uDt;

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,lA=`precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;

  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`,cA=`precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float C = texture2D(uDivergence, vUv).x;

  float pressure = (L + R + B + T - C) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`,uA=`precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;

  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B) * 0.5;
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,hA=`uniform sampler2D uBaseTexture;
uniform sampler2D uRevealTexture;
uniform sampler2D uDye;

uniform float uRevealSize;
uniform float uEdgeSoftness;
uniform float uEdgeWidth;

uniform float uBaseImageAspect;
uniform float uRevealImageAspect;
uniform float uPlaneAspect;

varying vec2 vUv;

vec2 coverUv(vec2 uv, float imageAspect, float planeAspect) {
  vec2 ratio = vec2(
    min(planeAspect / imageAspect, 1.0),
    min(imageAspect / planeAspect, 1.0)
  );
  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  float dye = texture2D(uDye, vUv).r;

  vec2 baseUv = coverUv(vUv, uBaseImageAspect, uPlaneAspect);
  baseUv = clamp(baseUv, 0.001, 0.999);
  vec4 baseColor = texture2D(uBaseTexture, baseUv);

  vec2 revealUv = coverUv(vUv, uRevealImageAspect, uPlaneAspect);
  revealUv = clamp(revealUv, 0.001, 0.999);
  vec4 revealColor = texture2D(uRevealTexture, revealUv);

  float raw  = dye * uRevealSize;
  float mask = smoothstep(uEdgeSoftness, uEdgeSoftness + uEdgeWidth, raw);
  mask = clamp(mask, 0.0, 1.0);

  gl_FragColor = mix(baseColor, revealColor, mask);
}`,fA={simResolution:256,dyeResolution:512,velocityDissipation:.962,dyeDissipation:.988,pressureIterations:20,curlStrength:0,splatRadius:6e-5,splatForce:5900,revealSize:3.9,edgeSoftness:.5,edgeWidth:.01};class gA{constructor(e,t,n,i){this.container=e,this.settings=i,this.disposed=!1,this.mouse={x:.5,y:.5},this.prevMouse={x:.5,y:.5},this.mouseHasMoved=!1,this.size={width:1,height:1},this.baseAspect=1,this.revealAspect=16/9,this._ownedVideos={base:null,reveal:null},this._bakedSources={base:t,reveal:n},this._svgLayerSources={base:null,reveal:null},this._svgLayerBg={base:null,reveal:null},this._buildCanvas(),this._buildRenderer(),this._buildScenes(),this._buildTextures(t,n),this._initFluid(),this._buildMaskMaterial(),this._buildMeshes(),this._bindEvents(),this._resize(),this._animate=this._animate.bind(this),this._rafId=requestAnimationFrame(this._animate)}_buildCanvas(){const e=document.createElement("canvas");e.className="mask-reveal-canvas",Object.assign(e.style,{position:"absolute",inset:"0",width:"100%",height:"100%",display:"block",pointerEvents:"none",zIndex:"1"}),getComputedStyle(this.container).position==="static"&&(this.container.style.position="relative");const t=this.container.querySelector(".section.hero-home");t?this.container.insertBefore(e,t):this.container.appendChild(e),this.canvas=e}_buildRenderer(){this.renderer=new tA({canvas:this.canvas,antialias:!1,alpha:!0,premultipliedAlpha:!1,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),this.renderer.setClearColor(0,0),this.renderer.autoClear=!1}_buildScenes(){this.quadScene=new T0,this.quadCamera=new Dd(-1,1,1,-1,0,1),this.scene=new T0,this.camera=new mi(50,1,.1,100),this.camera.position.set(0,0,5)}_createRT(e,t,n){return new xi(e,t,{minFilter:n,magFilter:n,format:ei,type:zi,depthBuffer:!1,stencilBuffer:!1})}_createDoubleFBO(e,t,n){return{read:this._createRT(e,t,n),write:this._createRT(e,t,n),swap(){const i=this.read;this.read=this.write,this.write=i}}}_initFluid(){const e=this.settings,t=e.simResolution,n=e.simResolution,i=e.dyeResolution,s=e.dyeResolution,o=yt,a=an;this.velocity=this._createDoubleFBO(t,n,o),this.pressure=this._createDoubleFBO(t,n,a),this.dye=this._createDoubleFBO(i,s,o),this.curlRT=this._createRT(t,n,a),this.divergenceRT=this._createRT(t,n,a),this.simTexelSize=new dt(1/t,1/n),this.dyeTexelSize=new dt(1/i,1/s),this.quadGeo=new Lo(2,2),this.curlMat=this._makePassMat(oA,{uVelocity:{value:null},uTexelSize:{value:this.simTexelSize}}),this.vorticityMat=this._makePassMat(aA,{uVelocity:{value:null},uCurl:{value:null},uTexelSize:{value:this.simTexelSize},uCurlStrength:{value:e.curlStrength},uDt:{value:.016}}),this.advectionMat=this._makePassMat(rA,{uVelocity:{value:null},uSource:{value:null},uTexelSize:{value:this.simTexelSize},uDt:{value:1},uDissipation:{value:e.velocityDissipation}}),this.splatMat=this._makePassMat(sA,{uTarget:{value:null},uAspectRatio:{value:1},uPoint:{value:new dt},uColor:{value:new Y},uRadius:{value:e.splatRadius}}),this.divergenceMat=this._makePassMat(lA,{uVelocity:{value:null},uTexelSize:{value:this.simTexelSize}}),this.pressureMat=this._makePassMat(cA,{uPressure:{value:null},uDivergence:{value:null},uTexelSize:{value:this.simTexelSize}}),this.gradientSubMat=this._makePassMat(uA,{uPressure:{value:null},uVelocity:{value:null},uTexelSize:{value:this.simTexelSize}}),this.quadMesh=new Ti(this.quadGeo,this.curlMat),this.quadScene.add(this.quadMesh)}_makePassMat(e,t){return new pi({vertexShader:nA,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1})}_renderPass(e,t){this.quadMesh.material=e,this.renderer.setRenderTarget(t),this.renderer.render(this.quadScene,this.quadCamera)}_buildMaskMaterial(){const e=this.settings;this.maskMaterial=new pi({vertexShader:iA,fragmentShader:hA,transparent:!0,depthWrite:!1,uniforms:{uBaseTexture:{value:this.baseTexture},uRevealTexture:{value:this.revealTexture},uDye:{value:null},uRevealSize:{value:e.revealSize},uEdgeSoftness:{value:e.edgeSoftness},uEdgeWidth:{value:e.edgeWidth},uBaseImageAspect:{value:this.baseAspect},uRevealImageAspect:{value:this.revealAspect},uPlaneAspect:{value:1}}})}_buildMeshes(){this.planeGeo=new Lo(1,1,1,1),this.planeMesh=new Ti(this.planeGeo,this.maskMaterial),this.scene.add(this.planeMesh)}_buildTextures(e,t){const n=Bo(e);this.baseTexture=n.texture,this.baseAspect=n.aspect,n.ownedVideo&&(this._ownedVideos.base=n.ownedVideo),n.onLoaded&&n.onLoaded(s=>{this.baseAspect=s});const i=Bo(t);this.revealTexture=i.texture,this.revealAspect=i.aspect,i.ownedVideo&&(this._ownedVideos.reveal=i.ownedVideo),i.onLoaded&&i.onLoaded(s=>{this.revealAspect=s})}async setLayers({base:e,reveal:t,hideOriginal:n=!0,baseBg:i=null,revealBg:s=null}={}){if(this.disposed)return;const o=[],a=async(c,l=null)=>c instanceof SVGElement?(o.push(c),await yA(c,this.container,l)):c;if(e!==void 0){this._svgLayerBg.base=e instanceof SVGElement?i:null;const c=await a(e,i);this._svgLayerSources.base=e instanceof SVGElement?e:null;const l=Bo(c);this.baseTexture?.dispose?.(),this._ownedVideos.base&&Jc(this._ownedVideos.base),this.baseTexture=l.texture,this.baseAspect=l.aspect,this._ownedVideos.base=l.ownedVideo||null,this._bakedSources.base=c,l.onLoaded&&l.onLoaded(u=>{this.baseAspect=u,this.maskMaterial.uniforms.uBaseImageAspect.value=u}),this.maskMaterial.uniforms.uBaseTexture.value=this.baseTexture,this.maskMaterial.uniforms.uBaseImageAspect.value=this.baseAspect}if(t!==void 0){this._svgLayerBg.reveal=t instanceof SVGElement?s:null;const c=await a(t,s);this._svgLayerSources.reveal=t instanceof SVGElement?t:null;const l=Bo(c);this.revealTexture?.dispose?.(),this._ownedVideos.reveal&&Jc(this._ownedVideos.reveal),this.revealTexture=l.texture,this.revealAspect=l.aspect,this._ownedVideos.reveal=l.ownedVideo||null,this._bakedSources.reveal=c,l.onLoaded&&l.onLoaded(u=>{this.revealAspect=u,this.maskMaterial.uniforms.uRevealImageAspect.value=u}),this.maskMaterial.uniforms.uRevealTexture.value=this.revealTexture,this.maskMaterial.uniforms.uRevealImageAspect.value=this.revealAspect}n&&o.forEach(c=>{c.dataset._maskHidden="1",c.style.visibility="hidden"})}_bindEvents(){this._onMouseMove=e=>{const t=this.canvas.getBoundingClientRect();this.mouse.x=(e.clientX-t.left)/t.width,this.mouse.y=1-(e.clientY-t.top)/t.height,this.mouseHasMoved=!0},this._onTouchMove=e=>{if(!e.touches.length)return;const t=e.touches[0],n=this.canvas.getBoundingClientRect();this.mouse.x=(t.clientX-n.left)/n.width,this.mouse.y=1-(t.clientY-n.top)/n.height,this.mouseHasMoved=!0},this._onResize=()=>this._resize(),this.container.addEventListener("mousemove",this._onMouseMove,{passive:!0}),this.container.addEventListener("touchmove",this._onTouchMove,{passive:!0}),window.addEventListener("resize",this._onResize),typeof ResizeObserver<"u"&&(this._ro=new ResizeObserver(()=>this._resize()),this._ro.observe(this.container))}_resize(){const e=this.container.getBoundingClientRect(),t=Math.max(1,e.width),n=Math.max(1,e.height);this._documentTop=e.top+window.scrollY;if(this.size.width===t&&this.size.height===n)return;this.size={width:t,height:n},this.renderer.setSize(t,n,!1);const i=t/n;this.camera.aspect=i,this.camera.fov=50,this.camera.updateProjectionMatrix();const s=this.camera.position.z,o=this.camera.fov*Math.PI/180,a=2*Math.tan(o/2)*s,c=a*i;this.planeMesh.scale.set(c,a,1),this.maskMaterial.uniforms.uPlaneAspect.value=i,this._cleanRendered=false,this._scheduleSvgRebake()}_scheduleSvgRebake(){this._svgLayerSources&&(!this._svgLayerSources.base&&!this._svgLayerSources.reveal||(clearTimeout(this._rebakeTimeout),this._rebakeTimeout=setTimeout(()=>{const{base:e,reveal:t}=this._svgLayerSources,n={};e instanceof SVGElement&&(n.base=e,n.baseBg=this._svgLayerBg.base),t instanceof SVGElement&&(n.reveal=t,n.revealBg=this._svgLayerBg.reveal),Object.keys(n).length&&(n.hideOriginal=!1,this.setLayers(n).catch(()=>{}))},120)))}_computeScrollFade(){return Math.max(0,Math.min(1,(window.scrollY-this._documentTop)/(this.size.height||1)))}_getShowreelScaleEl(){return this._showreelScaleEl&&this._showreelScaleEl.isConnected?this._showreelScaleEl:(this._showreelScaleEl=document.querySelector(".section.showreel .video-showreel-full-w"),this._showreelScaleEl)}_isShowreelFull(){const e=this._getShowreelScaleEl();if(!e)return!0;const t=e.style.width;if(!t)return!0;const n=t.trim().match(/^([\d.]+)%$/);return n?parseFloat(n[1])>=99:!0}_clearFluid(){const e=t=>{this.renderer.setRenderTarget(t),this.renderer.clear()};e(this.dye.read),e(this.dye.write),e(this.velocity.read),e(this.velocity.write),e(this.pressure.read),e(this.pressure.write),this.renderer.setRenderTarget(null)}_renderClean(){this.maskMaterial.uniforms.uDye.value=this.dye.read.texture,this.renderer.setRenderTarget(null),this.renderer.clear(),this.renderer.render(this.scene,this.camera)}_animate(){if(!this.disposed){if(this._rafId=requestAnimationFrame(this._animate),!this._isShowreelFull()){this._maskCleaned||(this._clearFluid(),this._renderClean(),this._maskCleaned=!0);return}this._maskCleaned&&(this._maskCleaned=!1,this.prevMouse.x=this.mouse.x,this.prevMouse.y=this.mouse.y,this.mouseHasMoved=!1);if(this.mouseHasMoved||this._hasFluid){this._hasFluid=true;this._step()}else if(!this._cleanRendered){this._renderClean();this._cleanRendered=true}}}_step(){const e=this.settings,t=this.size.width/this.size.height,n=this._computeScrollFade(),i=n*n,s=1-i;if(this.mouseHasMoved){const u=this.mouse.x-this.prevMouse.x,f=this.mouse.y-this.prevMouse.y;Math.sqrt(u*u+f*f)>0&&s>.001&&(this.splatMat.uniforms.uTarget.value=this.velocity.read.texture,this.splatMat.uniforms.uAspectRatio.value=t,this.splatMat.uniforms.uPoint.value.set(this.mouse.x,this.mouse.y),this.splatMat.uniforms.uColor.value.set(u*e.splatForce*s,f*e.splatForce*s,0),this.splatMat.uniforms.uRadius.value=e.splatRadius,this._renderPass(this.splatMat,this.velocity.write),this.velocity.swap(),this.splatMat.uniforms.uTarget.value=this.dye.read.texture,this.splatMat.uniforms.uColor.value.set(s,s,s),this.splatMat.uniforms.uRadius.value=e.splatRadius,this._renderPass(this.splatMat,this.dye.write),this.dye.swap()),this.prevMouse.x=this.mouse.x,this.prevMouse.y=this.mouse.y}if(e.curlStrength!==0){this.curlMat.uniforms.uVelocity.value=this.velocity.read.texture,this._renderPass(this.curlMat,this.curlRT),this.vorticityMat.uniforms.uVelocity.value=this.velocity.read.texture,this.vorticityMat.uniforms.uCurl.value=this.curlRT.texture,this.vorticityMat.uniforms.uCurlStrength.value=e.curlStrength,this.vorticityMat.uniforms.uDt.value=.016,this._renderPass(this.vorticityMat,this.velocity.write),this.velocity.swap();}this.advectionMat.uniforms.uVelocity.value=this.velocity.read.texture,this.advectionMat.uniforms.uSource.value=this.velocity.read.texture,this.advectionMat.uniforms.uTexelSize.value=this.simTexelSize,this.advectionMat.uniforms.uDissipation.value=e.velocityDissipation,this._renderPass(this.advectionMat,this.velocity.write),this.velocity.swap();const a=e.dyeDissipation+(.97-e.dyeDissipation)*i;this.advectionMat.uniforms.uVelocity.value=this.velocity.read.texture,this.advectionMat.uniforms.uSource.value=this.dye.read.texture,this.advectionMat.uniforms.uTexelSize.value=this.dyeTexelSize,this.advectionMat.uniforms.uDissipation.value=a,this._renderPass(this.advectionMat,this.dye.write),this.dye.swap(),this.divergenceMat.uniforms.uVelocity.value=this.velocity.read.texture,this._renderPass(this.divergenceMat,this.divergenceRT),this.renderer.setRenderTarget(this.pressure.read),this.renderer.clear(),this.renderer.setRenderTarget(null),this.pressureMat.uniforms.uDivergence.value=this.divergenceRT.texture;for(let u=0;u<e.pressureIterations;u++)this.pressureMat.uniforms.uPressure.value=this.pressure.read.texture,this._renderPass(this.pressureMat,this.pressure.write),this.pressure.swap();this.gradientSubMat.uniforms.uPressure.value=this.pressure.read.texture,this.gradientSubMat.uniforms.uVelocity.value=this.velocity.read.texture,this._renderPass(this.gradientSubMat,this.velocity.write),this.velocity.swap();const c=this.revealTexture?.image;if(c instanceof HTMLVideoElement&&c.videoWidth&&c.videoHeight){const u=c.videoWidth/c.videoHeight;Math.abs(u-this.revealAspect)>.001&&(this.revealAspect=u)}const l=this.maskMaterial.uniforms;l.uDye.value=this.dye.read.texture,l.uRevealSize.value=e.revealSize,l.uEdgeSoftness.value=e.edgeSoftness,l.uEdgeWidth.value=e.edgeWidth,l.uBaseImageAspect.value=this.baseAspect,l.uRevealImageAspect.value=this.revealAspect,this.renderer.setRenderTarget(null),this.renderer.clear(),this.renderer.render(this.scene,this.camera)}updateSettings(e){Object.assign(this.settings,e)}destroy(){if(this.disposed)return;this.disposed=!0,this._rafId&&cancelAnimationFrame(this._rafId),this.container.removeEventListener("mousemove",this._onMouseMove),this.container.removeEventListener("touchmove",this._onTouchMove),window.removeEventListener("resize",this._onResize),this._ro&&this._ro.disconnect();const e=t=>{t?.read?.dispose(),t?.write?.dispose()};if(e(this.velocity),e(this.pressure),e(this.dye),this.curlRT?.dispose(),this.divergenceRT?.dispose(),this.quadGeo?.dispose(),this.planeGeo?.dispose(),[this.curlMat,this.vorticityMat,this.advectionMat,this.splatMat,this.divergenceMat,this.pressureMat,this.gradientSubMat,this.maskMaterial].forEach(t=>t?.dispose()),this.baseTexture?.dispose?.(),this.revealTexture?.dispose?.(),this.renderer?.dispose(),this._ownedVideos&&(this._ownedVideos.base&&Jc(this._ownedVideos.base),this._ownedVideos.reveal&&Jc(this._ownedVideos.reveal)),this._svgLayerSources)for(const t of Object.values(this._svgLayerSources))t instanceof SVGElement&&t.dataset._maskHidden&&(t.style.visibility="",delete t.dataset._maskHidden);this.canvas?.parentNode&&this.canvas.parentNode.removeChild(this.canvas)}}
export {gA as NothFluid,fA as originalSettings};
