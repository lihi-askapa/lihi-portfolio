/* ==========================================
   SKILLS IN 3D
   21 interlocking jigsaw pieces (Three.js) with real physics (cannon-es).
   The pieces drop, collide, then fly up and click together into a wall.
   Grab any piece to pull it out and throw it.
=========================================== */

import * as THREE from "three";
import * as CANNON from "cannon-es";

const SKILLS = [
  "Python", "SQL", "AWS", "Azure", "Linux", "Git & GitHub", "CI/CD",
  "Coralogix", "Grafana", "Kibana", "PagerDuty", "Incident Response",
  "AI Agents & Skills", "Claude Code", "Prompt Engineering", "Automation",
  "Flask", "REST APIs", "JavaScript", "Leadership", "Problem Solving"
];

const COLORS = ["#db2777", "#c026d3", "#9333ea"];   // same palette as the 2D puzzle
const PIECE_DEPTH = 0.26;
const BASE_Y = 0.85;                                 // centre of the bottom row
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- text version (screen readers / no WebGL) ---------- */
const list = document.getElementById("skills-list");
SKILLS.forEach((s) => {
  const li = document.createElement("li");
  li.textContent = s;
  list.appendChild(li);
});

/* ---------- renderer ---------- */
const canvas = document.getElementById("scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xc7d2fe, 0x1e1b4b, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(4, 9, 7);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -4, near: 1, far: 30 });
key.shadow.radius = 4;
scene.add(key);
const rim = new THREE.DirectionalLight(0xf472b6, 0.8);
rim.position.set(-6, 4, -6);
scene.add(rim);

/* ---------- floor (shadow only + faint drafting grid) ---------- */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.ShadowMaterial({ opacity: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x6d28d9, 0x312e81);
grid.material.transparent = true;
grid.material.opacity = 0.25;
scene.add(grid);

/* ---------- physics world ---------- */
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.4;
world.defaultContactMaterial.restitution = 0.15;

const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(ground);

// invisible walls keep thrown pieces on screen
const walls = [];
function placeWalls(halfW) {
  walls.forEach((w) => world.removeBody(w));
  walls.length = 0;
  const add = (pos, euler) => {
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    b.position.set(pos[0], pos[1], pos[2]);
    b.quaternion.setFromEuler(euler[0], euler[1], euler[2]);
    world.addBody(b);
    walls.push(b);
  };
  add([-halfW, 0, 0], [0, Math.PI / 2, 0]);    // left
  add([halfW, 0, 0], [0, -Math.PI / 2, 0]);    // right
  add([0, 0, -2.5], [0, 0, 0]);                // back
  add([0, 0, 3], [0, Math.PI, 0]);             // front
}

/* ---------- jigsaw geometry ---------- */
// deterministic "random" so the puzzle looks the same on every visit
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function edge(shape, P, d, t) {
  const end = { x: P.x + d.x, y: P.y + d.y };
  if (!t) { shape.lineTo(end.x, end.y); return; }
  const n = { x: d.y, y: -d.x };                    // outward normal
  const h = 0.1, r = 0.12, s = Math.sqrt(r * r - h * h);   // knob reaches 0.22 past the edge
  const C = { x: P.x + d.x * 0.5 + n.x * h * t, y: P.y + d.y * 0.5 + n.y * h * t };
  const N1 = { x: P.x + d.x * (0.5 - s), y: P.y + d.y * (0.5 - s) };
  const N2 = { x: P.x + d.x * (0.5 + s), y: P.y + d.y * (0.5 + s) };
  shape.lineTo(N1.x, N1.y);
  const a1 = Math.atan2(N1.y - C.y, N1.x - C.x);
  const a2 = Math.atan2(N2.y - C.y, N2.x - C.x);
  const apex = Math.atan2(n.y * t, n.x * t);
  const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const ccwHasApex = norm(apex - a1) < norm(a2 - a1);
  shape.absarc(C.x, C.y, r, a1, a2, !ccwHasApex);
  shape.lineTo(end.x, end.y);
}

function pieceGeometry(e) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  edge(shape, { x: -0.5, y: -0.5 }, { x: 1, y: 0 }, e.bottom);
  edge(shape, { x: 0.5, y: -0.5 }, { x: 0, y: 1 }, e.right);
  edge(shape, { x: 0.5, y: 0.5 }, { x: -1, y: 0 }, e.top);
  edge(shape, { x: -0.5, y: 0.5 }, { x: 0, y: -1 }, e.left);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: PIECE_DEPTH, bevelEnabled: true, bevelThickness: 0.03,
    bevelSize: 0.03, bevelSegments: 2, curveSegments: 10
  });
  g.translate(0, 0, -PIECE_DEPTH / 2);
  return g;
}

/* ---------- label texture ---------- */
function labelTexture(text, color) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shade(color, -0.18));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // keep the text inside the middle of the piece, clear of the neighbours' tabs
  // (the face spans -0.8..0.8 on the canvas; a neighbour's knob reaches 0.28 from
  // the centre, so the text stays within about ±0.24)
  const maxW = 150;
  let fontSize = 40;
  const words = text.split(" ");
  let lines;
  do {
    ctx.font = `700 ${fontSize}px Sora, sans-serif`;
    lines = [];
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    lines.push(line);
    fontSize -= 2;
  } while ((lines.some((l) => ctx.measureText(l).width > maxW) || lines.length > 2) && fontSize > 20);

  const lh = fontSize * 1.18;
  lines.forEach((l, i) => ctx.fillText(l, size / 2, size / 2 + (i - (lines.length - 1) / 2) * lh));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // the cap UVs are the shape's x/y (about -0.8..0.8) – map that onto the canvas
  tex.repeat.set(1 / 1.6, 1 / 1.6);
  tex.offset.set(0.5, 0.5);
  return tex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + v * amt)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/* ---------- pieces ---------- */
const pieces = [];        // { mesh, body, target: {pos, quat}, tween }
let layout = null;        // { cols, rows }
const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, PIECE_DEPTH / 2 + 0.03));

function buildLayout(cols) {
  const rows = Math.ceil(SKILLS.length / cols);
  seed = 7;
  const hEdge = [], vEdge = [];
  for (let r = 0; r < rows; r++) {
    hEdge[r] = []; vEdge[r] = [];
    for (let c = 0; c < cols; c++) {
      hEdge[r][c] = rand() > 0.5 ? 1 : -1;
      vEdge[r][c] = rand() > 0.5 ? 1 : -1;
    }
  }
  const lastRowCount = SKILLS.length - (rows - 1) * cols;
  return { cols, rows, hEdge, vEdge, lastRowCount };
}

function cellOf(i) {
  const { cols } = layout;
  return { c: i % cols, r: Math.floor(i / cols) };
}

function exists(c, r) {
  const { cols, rows } = layout;
  return c >= 0 && c < cols && r >= 0 && r < rows && r * cols + c < SKILLS.length;
}

function edgesFor(c, r) {
  const { hEdge, vEdge } = layout;
  return {
    bottom: exists(c, r + 1) ? vEdge[r][c] : 0,
    right: exists(c + 1, r) ? hEdge[r][c] : 0,
    top: exists(c, r - 1) ? -vEdge[r - 1][c] : 0,
    left: exists(c - 1, r) ? -hEdge[r][c - 1] : 0
  };
}

function targetFor(i) {
  const { cols, rows } = layout;
  const { c, r } = cellOf(i);
  return {
    pos: new CANNON.Vec3(c - (cols - 1) / 2, BASE_Y + (rows - 1 - r), 0),
    quat: new CANNON.Quaternion(0, 0, 0, 1)
  };
}

function createPieces() {
  const { cols } = layout;
  SKILLS.forEach((name, i) => {
    const { c, r } = cellOf(i);
    const color = COLORS[(r + 2 * c) % 3];
    const capMat = new THREE.MeshStandardMaterial({ map: labelTexture(name, color), roughness: 0.45, metalness: 0.05 });
    const sideMat = new THREE.MeshStandardMaterial({ color: shade(color, -0.3), roughness: 0.6 });
    const mesh = new THREE.Mesh(pieceGeometry(edgesFor(c, r)), [capMat, sideMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.index = i;
    scene.add(mesh);

    const body = new CANNON.Body({ mass: 1, shape: boxShape, angularDamping: 0.2, linearDamping: 0.05 });
    body.sleepSpeedLimit = 0.2;
    world.addBody(body);

    pieces.push({ mesh, body, target: targetFor(i), tween: null, cols });
  });
}

function rebuildGeometry() {
  pieces.forEach((p, i) => {
    const { c, r } = cellOf(i);
    p.mesh.geometry.dispose();
    p.mesh.geometry = pieceGeometry(edgesFor(c, r));
    const color = COLORS[(r + 2 * c) % 3];
    p.mesh.material[0].map.dispose();
    p.mesh.material[0].map = labelTexture(SKILLS[i], color);
    p.mesh.material[0].needsUpdate = true;
    p.mesh.material[1].color.set(shade(color, -0.3));
    p.target = targetFor(i);
  });
}

/* ---------- body helpers ---------- */
function makeKinematic(b) {
  b.type = CANNON.Body.KINEMATIC;
  b.mass = 0;
  b.updateMassProperties();
  b.velocity.setZero();
  b.angularVelocity.setZero();
}

function makeDynamic(b) {
  b.type = CANNON.Body.DYNAMIC;
  b.mass = 1;
  b.updateMassProperties();
  b.wakeUp();
}

/* ---------- scenes: drop and assemble ---------- */
let autoAssembleAt = 0;

function dropFromSky() {
  const { cols, rows } = layout;
  pieces.forEach((p, i) => {
    p.tween = null;
    makeDynamic(p.body);
    p.body.position.set((rand() - 0.5) * cols * 0.9, BASE_Y + rows + 2 + i * 0.35, (rand() - 0.5) * 1.6);
    p.body.quaternion.setFromEuler(rand() * 6, rand() * 6, rand() * 6);
    p.body.velocity.setZero();
    p.body.angularVelocity.set((rand() - 0.5) * 4, (rand() - 0.5) * 4, (rand() - 0.5) * 4);
  });
  setHint("Watch the pieces fall…");
}

function collapse() {
  autoAssembleAt = 0;
  pieces.forEach((p) => {
    p.tween = null;
    makeDynamic(p.body);
    p.body.applyImpulse(
      new CANNON.Vec3((rand() - 0.5) * 3, rand() * 2, 1 + rand() * 2),
      p.body.position
    );
  });
  setHint("Press “Assemble” to put it back together.");
}

function assemble() {
  autoAssembleAt = 0;
  const now = performance.now();
  pieces.forEach((p, i) => {
    makeKinematic(p.body);
    if (reduceMotion) {
      p.body.position.copy(p.target.pos);
      p.body.quaternion.copy(p.target.quat);
      p.tween = null;
      return;
    }
    p.tween = {
      start: now + i * 45,
      dur: 900,
      fromPos: p.body.position.clone(),
      fromQuat: new THREE.Quaternion().copy(p.body.quaternion),
      toQuat: new THREE.Quaternion().copy(p.target.quat)
    };
  });
  setHint("Grab any piece and throw it.");
}

const easeOutBack = (t) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const tmpQ = new THREE.Quaternion();

function runTweens(now) {
  pieces.forEach((p) => {
    const tw = p.tween;
    if (!tw) return;
    const t = Math.min(Math.max((now - tw.start) / tw.dur, 0), 1);
    if (t <= 0) return;
    const e = easeOutBack(t);
    const lift = Math.sin(t * Math.PI) * 0.8;          // small arc on the way up
    p.body.position.set(
      tw.fromPos.x + (p.target.pos.x - tw.fromPos.x) * e,
      tw.fromPos.y + (p.target.pos.y - tw.fromPos.y) * e + lift,
      tw.fromPos.z + (p.target.pos.z - tw.fromPos.z) * e
    );
    tmpQ.copy(tw.fromQuat).slerp(tw.toQuat, Math.min(t * 1.2, 1));
    p.body.quaternion.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w);
    if (t >= 1) {
      p.body.position.copy(p.target.pos);
      p.body.quaternion.copy(p.target.quat);
      p.tween = null;
    }
  });
}

/* ---------- drag and throw ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const jointBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
jointBody.collisionFilterGroup = 0;
jointBody.collisionFilterMask = 0;
world.addBody(jointBody);
let joint = null;

function setPointer(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener("pointerdown", (e) => {
  setPointer(e);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pieces.map((p) => p.mesh), false)[0];
  if (!hit) return;
  const p = pieces[hit.object.userData.index];
  p.tween = null;
  autoAssembleAt = 0;
  makeDynamic(p.body);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  // drag on a plane 1.2 units in front of the piece, so a grabbed piece pops out
  // of the wall towards the viewer instead of getting stuck between its neighbours
  const grabPoint = hit.point.clone().addScaledVector(camDir, -1.2);
  dragPlane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), grabPoint);

  jointBody.position.set(grabPoint.x, grabPoint.y, grabPoint.z);
  const local = p.body.pointToLocalFrame(new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z));
  joint = new CANNON.PointToPointConstraint(p.body, local, jointBody, new CANNON.Vec3(0, 0, 0), 60);
  world.addConstraint(joint);

  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* keep dragging without capture */ }
  canvas.classList.add("dragging");
  setHint("Let go to throw it.");
});

canvas.addEventListener("pointermove", (e) => {
  if (!joint) return;
  setPointer(e);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
    jointBody.position.set(hitPoint.x, Math.max(hitPoint.y, 0.3), hitPoint.z);
  }
});

function release() {
  if (!joint) return;
  world.removeConstraint(joint);
  joint = null;
  canvas.classList.remove("dragging");
  setHint("Press “Assemble” to put it back together.");
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

/* ---------- camera fit + responsive layout ---------- */
function colsForAspect(aspect) {
  return aspect < 0.8 ? 3 : 7;          // portrait phones get a tall 3-column puzzle
}

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;

  const { cols, rows } = layout;
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needW = cols + 1.2;
  const portrait = camera.aspect < 0.8;
  const needH = rows + (portrait ? 3.6 : 2.6);    // room for the title and the buttons
  const dist = Math.max(needW / (2 * tanH * camera.aspect), needH / (2 * tanH));
  const centerY = BASE_Y + (rows - 1) / 2;
  camera.position.set(0, centerY + dist * 0.18, dist);
  // on phones the title takes more room, so aim a bit higher to sit the wall lower
  camera.lookAt(0, centerY + (portrait ? 0.35 : -0.15), 0);
  camera.updateProjectionMatrix();
  placeWalls(Math.max(cols / 2 + 1.5, dist * tanH * camera.aspect * 0.9));
}

function onResize() {
  const cols = colsForAspect(window.innerWidth / window.innerHeight);
  if (cols !== layout.cols) {
    layout = buildLayout(cols);
    rebuildGeometry();
    fitCamera();
    const wasAssembled = pieces.every((p) => p.body.type === CANNON.Body.KINEMATIC);
    if (wasAssembled) {
      pieces.forEach((p) => { p.body.position.copy(p.target.pos); p.body.quaternion.copy(p.target.quat); });
    }
  } else {
    fitCamera();
  }
}
window.addEventListener("resize", onResize);

/* ---------- UI ---------- */
const hint = document.getElementById("hint");
function setHint(t) { hint.textContent = t; }
document.getElementById("btn-drop").addEventListener("click", collapse);
document.getElementById("btn-assemble").addEventListener("click", assemble);

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  runTweens(now);
  world.step(1 / 60, dt, 3);

  if (autoAssembleAt && now > autoAssembleAt) assemble();

  pieces.forEach((p) => {
    p.mesh.position.set(p.body.position.x, p.body.position.y, p.body.position.z);
    p.mesh.quaternion.set(p.body.quaternion.x, p.body.quaternion.y, p.body.quaternion.z, p.body.quaternion.w);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* ---------- start (after the Sora font is ready, so labels use it) ---------- */
(async function start() {
  try { await document.fonts.load("700 50px Sora"); } catch (e) { /* fall back to system font */ }
  layout = buildLayout(colsForAspect(window.innerWidth / window.innerHeight));
  createPieces();
  fitCamera();

  if (reduceMotion) {
    assemble();                                    // no falling: start already assembled
  } else {
    dropFromSky();
    autoAssembleAt = performance.now() + 3200;      // let them land, then click together
  }
  requestAnimationFrame(loop);
})();
