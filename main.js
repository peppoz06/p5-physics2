// main.js — mobile-first 3D physics demo
// signal module load and handle runtime errors so the page doesn't stay blank
console.log('main.js loaded');
window.addEventListener('error', (ev) => {
  console.error('Runtime error', ev.error || ev.message);
  const overlay = document.getElementById('errOverlay');
  const msg = document.getElementById('errMsg');
  if(msg) msg.textContent = String((ev && (ev.error && ev.error.message)) || ev.message || 'Unknown runtime error');
  if(overlay) overlay.style.display = 'flex';
});
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled rejection', ev.reason);
  const overlay = document.getElementById('errOverlay');
  const msg = document.getElementById('errMsg');
  if(msg) msg.textContent = String(ev.reason && ev.reason.message ? ev.reason.message : ev.reason);
  if(overlay) overlay.style.display = 'flex';
});
// main.js now expects global THREE and CANNON from UMD bundles
(function(){
  // --- Basic setup ---
  const canvas = document.getElementById('c');
// WebGL availability check
function webglAvailable(){
  try{
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }catch(e){ return false; }
}
if(!webglAvailable()){
  const overlay = document.getElementById('errOverlay');
  const msg = document.getElementById('errMsg');
  if(msg) msg.textContent = 'WebGL not available or blocked. Try a different browser or enable WebGL.';
  if(overlay) overlay.style.display = 'flex';
}
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 2.6, 6);

// lights
const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 8, 2);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -8;
dir.shadow.camera.right = 8;
dir.shadow.camera.top = 8;
dir.shadow.camera.bottom = -8;
scene.add(dir);

// floor pedestal
const pedestalGeo = new THREE.BoxGeometry(4.2, 0.5, 4.2);
const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.45 });
const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
pedestal.position.set(0, -1.25, 0);
pedestal.receiveShadow = true;
scene.add(pedestal);

// subtle ground shadow
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.12 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
scene.add(ground);

// --- Physics world (using global CANNON UMD) ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// static walls (a hollow cube) — we'll create 6 thin planes as static bodies
const cubeSize = 2.2; // half extents considered during visuals
const wallThickness = 0.12;

const walls = [];
function makeWall(pos, quat, size){
  const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
  const body = new CANNON.Body({ mass: 0, shape });
  body.position.copy(pos);
  body.quaternion.copy(quat);
  world.addBody(body);
  walls.push(body);
  return body;
}

// create the 6 walls: left/right/front/back/top/bottom
makeWall(new CANNON.Vec3( cubeSize/2 + wallThickness/2, 0, 0), new CANNON.Quaternion(), {x: wallThickness, y: cubeSize + wallThickness*2, z: cubeSize + wallThickness*2});
makeWall(new CANNON.Vec3(-cubeSize/2 - wallThickness/2, 0, 0), new CANNON.Quaternion(), {x: wallThickness, y: cubeSize + wallThickness*2, z: cubeSize + wallThickness*2});
makeWall(new CANNON.Vec3(0, cubeSize/2 + wallThickness/2, 0), new CANNON.Quaternion(), {x: cubeSize + wallThickness*2, y: wallThickness, z: cubeSize + wallThickness*2});
makeWall(new CANNON.Vec3(0, -cubeSize/2 - wallThickness/2, 0), new CANNON.Quaternion(), {x: cubeSize + wallThickness*2, y: wallThickness, z: cubeSize + wallThickness*2});
makeWall(new CANNON.Vec3(0, 0, cubeSize/2 + wallThickness/2), new CANNON.Quaternion(), {x: cubeSize + wallThickness*2, y: cubeSize + wallThickness*2, z: wallThickness});
makeWall(new CANNON.Vec3(0, 0, -cubeSize/2 - wallThickness/2), new CANNON.Quaternion(), {x: cubeSize + wallThickness*2, y: cubeSize + wallThickness*2, z: wallThickness});

// --- Visual cube (transparent, frosted) ---
const cubeGroup = new THREE.Group();

const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, metalness: 0.6, roughness: 0.3 });
const edgeGeo = new THREE.BoxGeometry(cubeSize + 0.18, 0.06, 0.06);
// create 12 edge bars
const edgePositions = [];
// X edges
edgePositions.push({pos:[0, cubeSize/2+0.06, cubeSize/2+0.06], rot:[0,0,0]});
edgePositions.push({pos:[0, -cubeSize/2-0.06, cubeSize/2+0.06], rot:[0,0,0]});
edgePositions.push({pos:[0, cubeSize/2+0.06, -cubeSize/2-0.06], rot:[0,0,0]});
edgePositions.push({pos:[0, -cubeSize/2-0.06, -cubeSize/2-0.06], rot:[0,0,0]});
// Y edges (rotate 90deg about Z)
edgePositions.push({pos:[cubeSize/2+0.06, 0, cubeSize/2+0.06], rot:[0,0,Math.PI/2]});
edgePositions.push({pos:[-cubeSize/2-0.06, 0, cubeSize/2+0.06], rot:[0,0,Math.PI/2]});
edgePositions.push({pos:[cubeSize/2+0.06, 0, -cubeSize/2-0.06], rot:[0,0,Math.PI/2]});
edgePositions.push({pos:[-cubeSize/2-0.06, 0, -cubeSize/2-0.06], rot:[0,0,Math.PI/2]});
// Z edges (rotate 90deg about Y)
edgePositions.push({pos:[cubeSize/2+0.06, cubeSize/2+0.06, 0], rot:[0,Math.PI/2,0]});
edgePositions.push({pos:[-cubeSize/2-0.06, cubeSize/2+0.06, 0], rot:[0,Math.PI/2,0]});
edgePositions.push({pos:[cubeSize/2+0.06, -cubeSize/2-0.06, 0], rot:[0,Math.PI/2,0]});
edgePositions.push({pos:[-cubeSize/2-0.06, -cubeSize/2-0.06, 0], rot:[0,Math.PI/2,0]});

edgePositions.forEach(ep=>{
  const m = new THREE.Mesh(edgeGeo, frameMat);
  m.position.set(...ep.pos);
  m.rotation.set(...ep.rot);
  cubeGroup.add(m);
});

// frosted faces
const faceMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.35,
  transmission: 0.6,
  transparent: true,
  opacity: 0.9,
  clearcoat: 0.2,
  clearcoatRoughness: 0.3
});

const faceGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubeInner = new THREE.Mesh(faceGeo, faceMat);
cubeInner.castShadow = true;
cubeInner.receiveShadow = true;
cubeGroup.add(cubeInner);

cubeGroup.position.set(0, 0.2, 0);
scene.add(cubeGroup);

// make sure cubeGroup visually rotates; physics walls are in world space — we'll rotate gravity instead

// --- Spheres (physics + visuals) ---
const sphereCount = 10;
const spheres = [];
const pastel = [0xffb3c7, 0xffe2b3, 0xd6f3ff, 0xe9d6ff, 0xcfffe3, 0xffd9e6, 0xe8f0ff];

function createBall(radius=0.18){
  // physics
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({ mass: 0.45, shape });
  body.position.set((Math.random()-0.5)*1.2, (Math.random()-0.5)*1.2 + 0.2, (Math.random()-0.5)*1.2);
  body.linearDamping = 0.02;
  body.angularDamping = 0.02;
  body.material = new CANNON.Material({ friction: 0.02, restitution: 0.75 });
  world.addBody(body);

  // visual
  const color = pastel[Math.floor(Math.random()*pastel.length)];
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.35,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
    reflectivity: 0.2
  });
  const geo = new THREE.SphereGeometry(radius, 28, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  spheres.push({ body, mesh, radius });
}

for(let i=0;i<sphereCount;i++) createBall(0.18 + Math.random()*0.06);

// collisions tuning using contact materials (CANNON.ContactMaterial)
const defaultMat = new CANNON.Material('default');
const contact = new CANNON.ContactMaterial(defaultMat, defaultMat, { friction: 0.02, restitution: 0.78 });
world.addContactMaterial(contact);
world.defaultContactMaterial = contact;

// keep spheres constrained inside by slightly larger physics walls already created

// --- Interaction & controls ---
// We use a lightweight custom pointer drag to avoid importing OrbitControls

let deviceEnabled = false;
const motionBtn = document.getElementById('motionBtn');
const motionState = document.getElementById('motionState');

motionBtn.addEventListener('click', async ()=>{
  // iOS requires permission
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'){
    try{
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') enableDevice();
    }catch(e){
      // fall back
      enableDevice();
    }
  } else {
    enableDevice();
  }
});

function enableDevice(){
  deviceEnabled = true;
  motionState.textContent = 'on';
  motionBtn.style.display = 'none';
  // listen to deviceorientation
  window.addEventListener('deviceorientation', handleOrientation, true);
  // use devicemotion for shake intensity
  window.addEventListener('devicemotion', handleMotion, true);
}

// we will keep a smoothed gravity vector
let gravityTarget = new THREE.Vector3(0, -9.82, 0);
let gravityCurrent = gravityTarget.clone();

function handleOrientation(e){
  // alpha (z), beta (x), gamma (y) in degrees
  const beta = e.beta || 0; // -180..180 (front-back)
  const gamma = e.gamma || 0; // -90..90 (left-right)

  // convert to radians and create gravity vector in world space
  // assume phone flat portrait pointing up is beta~0 gamma~0
  const maxG = 9.82;
  const x = THREE.MathUtils.clamp(Math.sin(THREE.MathUtils.degToRad(gamma)), -1, 1) * maxG;
  const y = -Math.cos(THREE.MathUtils.degToRad(beta)) * maxG; // tilt forward reduces upward component
  const z = THREE.MathUtils.clamp(Math.sin(THREE.MathUtils.degToRad(beta)), -1, 1) * maxG;

  gravityTarget.set(x, y, z);

  // rotate visual cube to reflect orientation (smoothed)
  const targetRotX = THREE.MathUtils.degToRad(beta) * 0.25;
  const targetRotZ = THREE.MathUtils.degToRad(-gamma) * 0.25;
  cubeGroup.rotation.x += (targetRotX - cubeGroup.rotation.x) * 0.08;
  cubeGroup.rotation.z += (targetRotZ - cubeGroup.rotation.z) * 0.08;
}

let lastShake = 0;
function handleMotion(e){
  const acc = e.accelerationIncludingGravity;
  if(!acc) return;
  const mag = Math.sqrt(acc.x*acc.x + acc.y*acc.y + acc.z*acc.z);
  const now = performance.now();
  if(mag > 18 && now - lastShake > 300){
    // apply impulse to all spheres
    spheres.forEach(s=>{
      const impulse = new CANNON.Vec3((Math.random()-0.5)*1.2, (Math.random()-0.5)*1.2 + 0.8, (Math.random()-0.5)*1.2);
      s.body.applyImpulse(impulse, s.body.position);
    });
    lastShake = now;
  }
}

// Desktop fallback: tilt with pointer drag
let isPointerDown = false;
let pointerStart = null;
let lastPointer = null;
renderer.domElement.addEventListener('pointerdown', e=>{
  isPointerDown = true;
  pointerStart = {x:e.clientX, y:e.clientY};
  lastPointer = {x:e.clientX, y:e.clientY};
});
window.addEventListener('pointerup', ()=>{ isPointerDown = false; pointerStart = null; lastPointer = null; });
window.addEventListener('pointercancel', ()=>{ isPointerDown = false; pointerStart = null; lastPointer = null; });

window.addEventListener('pointermove', (e)=>{
  if(!isPointerDown || !pointerStart) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = {x:e.clientX, y:e.clientY};
  // small rotation influence
  cubeGroup.rotation.x += dy * 0.002;
  cubeGroup.rotation.z += dx * 0.002;
  // nudge gravity target based on tilt for desktop feel
  gravityTarget.x += dx * 0.012;
  gravityTarget.z += dy * 0.012;
  // clamp gravity target magnitude
  const maxG = 12;
  gravityTarget.x = Math.max(-maxG, Math.min(maxG, gravityTarget.x));
  gravityTarget.z = Math.max(-maxG, Math.min(maxG, gravityTarget.z));
});

// keyboard optional
window.addEventListener('keydown', e=>{
  const step = 2;
  if(e.key === 'ArrowUp') gravityTarget.z -= 0.6;
  if(e.key === 'ArrowDown') gravityTarget.z += 0.6;
  if(e.key === 'ArrowLeft') gravityTarget.x -= 0.6;
  if(e.key === 'ArrowRight') gravityTarget.x += 0.6;
});

// smoothing helper
function dampVector(a, b, lambda){
  a.x += (b.x - a.x) * lambda;
  a.y += (b.y - a.y) * lambda;
  a.z += (b.z - a.z) * lambda;
}

// animation loop
let last = performance.now();
function animate(){
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 1/30);
  last = now;

  // smooth gravity
  dampVector(gravityCurrent, gravityTarget, 0.06);
  world.gravity.set(gravityCurrent.x, gravityCurrent.y, gravityCurrent.z);

  // step physics
  world.step(1/60, dt, 4);

  // sync visuals
  spheres.forEach(s=>{
    s.mesh.position.copy(s.body.position);
    s.mesh.quaternion.copy(s.body.quaternion);
  });

  // render
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

animate();

// resize handler
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// initial gentle nudge to separate balls
spheres.forEach((s, i)=>{
  s.body.applyImpulse(new CANNON.Vec3((Math.random()-0.5)*0.5, Math.random()*0.4+0.2, (Math.random()-0.5)*0.5), s.body.position);
});

// show helper text fade after some seconds
setTimeout(()=>{ const h = document.getElementById('hint'); if(h) h.style.opacity = '0.6' }, 2500);

// small safety: if a sphere gets very near a wall due to tunneling, push it back in bounds
function correctSpheres(){
  const bound = cubeSize/2 - 0.02;
  spheres.forEach(s=>{
    const p = s.body.position;
    if(p.x > bound) p.x = bound;
    if(p.x < -bound) p.x = -bound;
    if(p.y > bound) p.y = bound;
    if(p.y < -bound) p.y = -bound;
    if(p.z > bound) p.z = bound;
    if(p.z < -bound) p.z = -bound;
    s.body.position.copy(p);
  });
}
setInterval(correctSpheres, 500);

// expose for debugging (optional)
window._demo = { scene, world, spheres };
})();
