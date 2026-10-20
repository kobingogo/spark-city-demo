import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { SCENES } from "./scenes.js";
import { WalkControls } from "./walk.js";

const $ = (id) => document.getElementById(id);
const canvas = $("c");
const isMobile = matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const DPR_CAP = isMobile ? 1.5 : 2;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x0b0d12, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 3000);
const spark = new SparkRenderer({ renderer });
scene.add(spark);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = isMobile ? 0.6 : 0.8;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.8;
controls.screenSpacePanning = true;
controls.minDistance = 0.3;
controls.maxDistance = 200;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);

// ---------- UI ----------
const nav = $("scenes");
const buttons = new Map();
for (const s of SCENES) {
  const b = document.createElement("button");
  b.textContent = s.label;
  b.title = s.title;
  b.addEventListener("click", () => loadScene(s.id));
  nav.appendChild(b);
  buttons.set(s.id, b);
}
const mb = (n) => (n / 1048576).toFixed(1) + " MB";
$("info-panel").innerHTML =
  SCENES.map(
    (s) => `<h3>${s.label} · ${s.title}</h3>
<p>作者 <a href="${s.authorUrl}" target="_blank" rel="noopener">${s.author}</a> ·
来源 <a href="${s.source}" target="_blank" rel="noopener">SuperSplat</a> ·
许可 <a href="${s.licenseUrl}" target="_blank" rel="noopener">${s.license}</a><br/>
修改：${s.changes} 本站文件 ${mb(s.bytes)} / ${s.splats} splats。</p>`
  ).join("") +
  `<h3>软件</h3><p><a href="https://github.com/sparkjsdev/spark" target="_blank" rel="noopener">Spark</a> (MIT) ·
<a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> (MIT) · 转换工具
<a href="https://github.com/playcanvas/splat-transform" target="_blank" rel="noopener">splat-transform</a> (MIT)。</p>`;
$("info-toggle").addEventListener("click", () => {
  const p = $("info-panel");
  p.hidden = !p.hidden;
  $("info-toggle").setAttribute("aria-expanded", String(!p.hidden));
});

function setCredit(s) {
  $("copy-pop").innerHTML = `<div class="copy-title">「${s.title}」</div>
<div>作者 <a href="${s.authorUrl}" target="_blank" rel="noopener">${s.author}</a></div>
<div>来源 <a href="${s.source}" target="_blank" rel="noopener">${s.source.replace("https://", "")}</a></div>
<div>许可 <a href="${s.licenseUrl}" target="_blank" rel="noopener">${s.license}</a></div>
<div class="copy-mod">已修改：${s.changes}</div>
<button type="button" class="copy-more" id="copy-more">查看全部数据来源与许可 →</button>`;
  $("copy-more").addEventListener("click", () => {
    setCopyOpen(false);
    $("info-panel").hidden = false;
    $("info-toggle").setAttribute("aria-expanded", "true");
  });
}

// © popover: hover opens (desktop), click pins/toggles, click outside or Esc closes.
let copyPinned = false;
function setCopyOpen(open) {
  $("copy-pop").hidden = !open;
  $("copy-btn").setAttribute("aria-expanded", String(open));
  if (!open) copyPinned = false;
}
$("copy-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  copyPinned = !copyPinned || $("copy-pop").hidden;
  setCopyOpen(copyPinned);
});
if (matchMedia("(hover: hover)").matches) {
  $("copy").addEventListener("mouseenter", () => setCopyOpen(true));
  $("copy").addEventListener("mouseleave", () => { if (!copyPinned) setCopyOpen(false); });
}
document.addEventListener("pointerdown", (e) => { if (!$("copy").contains(e.target)) setCopyOpen(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setCopyOpen(false); });

function showLoader(title, frac, sub) {
  $("loader").hidden = false;
  $("loader-title").textContent = title;
  $("progress-fill").style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  $("loader-sub").textContent = sub;
}

// ---------- Scene loading ----------
let current = null;
let loadToken = 0;

function applyCamera(cam) {
  const p = new THREE.Vector3(...cam.position);
  let t = new THREE.Vector3(...cam.target);
  if (cam.targetDist) {
    const dir = t.clone().sub(p).normalize();
    t = p.clone().addScaledVector(dir, cam.targetDist);
  }
  camera.fov = cam.fov || 70;
  camera.position.copy(p);
  controls.target.copy(t);
  camera.updateProjectionMatrix();
  camera.lookAt(t);
  controls.update();
}

// ---------- Mode: walk (first person) / orbit ----------
const walk = new WalkControls(camera, canvas, $("joystick"), {
  onSpeedChange: (m) => toast(`速度 ×${m.toFixed(1)}`),
});
let mode = localStorage.getItem("scd-mode") === "orbit" ? "orbit" : "walk";
let currentScene = null;

function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1200);
}

const HINTS = {
  walk: isMobile
    ? "<b>漫游</b>：左下摇杆移动 · 单指拖动屏幕转头 · 双指捏合调速度"
    : "<b>漫游</b>：W/S 或 ↑/↓ 前进后退 · A/D 或 ←/→ 横移 · 按住左键拖动转头 · Q/E 下降/上升 · 按住 Shift 加速 · L 锁定/解锁鼠标",
  orbit: isMobile
    ? "<b>环绕</b>：单指拖动旋转 · 双指捏合缩放 · 双指拖动平移"
    : "<b>环绕</b>：左键拖动旋转 · 滚轮缩放 · 右键拖动平移",
};

function setMode(m, { fromUser = false } = {}) {
  mode = m;
  localStorage.setItem("scd-mode", m);
  document.body.dataset.mode = m;
  const b = $("mode-toggle");
  b.textContent = m === "walk" ? "漫游中 · 切到环绕" : "环绕中 · 切到漫游";
  b.setAttribute("aria-label", m === "walk" ? "当前漫游模式，点击切换到环绕模式" : "当前环绕模式，点击切换到漫游模式");
  $("hint-text").innerHTML = HINTS[m];
  $("joystick").hidden = !(m === "walk" && isMobile);
  if (m === "walk") {
    controls.enabled = false;
    walk.setEnabled(true);
    walk.syncFromCamera();
  } else {
    walk.setEnabled(false);
    controls.enabled = true;
    // when the user switches from walk, orbit around a point in front of the camera
    if (fromUser) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const d = currentScene?.camera.targetDist || 6;
    controls.target.copy(camera.position).addScaledVector(dir, d);
    }
    controls.update();
  }
  if (fromUser) setHintOpen(true);
}
$("mode-toggle").addEventListener("click", () => setMode(mode === "walk" ? "orbit" : "walk", { fromUser: true }));

function setHintOpen(open) {
  $("hint").dataset.open = String(open);
  $("hint-close").textContent = open ? "收起" : "操作提示";
  if (!open) localStorage.setItem("scd-hint-closed", "1");
}
$("hint-close").addEventListener("click", () => setHintOpen($("hint").dataset.open !== "true"));
setHintOpen(localStorage.getItem("scd-hint-closed") !== "1");

async function loadScene(id) {
  const s = SCENES.find((x) => x.id === id) || SCENES[0];
  const token = ++loadToken;
  for (const [k, b] of buttons) b.setAttribute("aria-pressed", String(k === s.id));
  $("error").hidden = true;
  setCredit(s);
  history.replaceState(null, "", `#${s.id}`);

  if (current) {
    scene.remove(current);
    current.dispose();
    current = null;
  }

  const t0 = performance.now();
  showLoader(`加载「${s.label}」`, 0, `0 / ${mb(s.bytes)}`);
  let mesh;
  try {
    mesh = new SplatMesh({
      url: s.file,
      onProgress: (e) => {
        if (token !== loadToken) return;
        const total = e.total || s.bytes;
        const f = e.loaded / total;
        showLoader(`加载「${s.label}」`, f * 0.95, f >= 1 ? "解析中…" : `${mb(e.loaded)} / ${mb(total)}`);
      },
    });
    // Match SuperSplat's convention (data is Y-down): rotate 180° about Z.
    mesh.quaternion.set(0, 0, 1, 0);
    await mesh.initialized;
  } catch (err) {
    if (token !== loadToken) return;
    console.error(err);
    $("loader").hidden = true;
    $("error").hidden = false;
    $("error").textContent = `场景加载失败：${err?.message || err}`;
    return;
  }
  if (token !== loadToken) {
    mesh.dispose();
    return;
  }
  current = mesh;
  currentScene = s;
  scene.add(mesh);
  walk.setScene({ bounds: s.walk, speed: s.walk.speed });
  applyCamera(s.camera); // every scene switch resets to its start camera
  setMode(mode);
  $("loader").hidden = true;
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  console.info(`[spark-city-demo] ${s.id} loaded in ${secs}s`);
  document.body.dataset.loaded = s.id;
  window.__lastLoad = { id: s.id, secs: Number(secs), numSplats: mesh.numSplats };
}

let lastT = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - lastT) / 1000;
  lastT = now;
  if (mode === "walk") walk.update(dt);
  else controls.update();
  renderer.render(scene, camera);
});

window.__demo = { walk, camera, getMode: () => mode, setMode };
setMode(mode);
const initial = location.hash.slice(1);
loadScene(SCENES.some((s) => s.id === initial) ? initial : SCENES[0].id);
