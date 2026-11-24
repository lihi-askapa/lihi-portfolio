/* ==========================================
   WELCOME BEE – 3D version
   A small cartoon bee (Three.js) flies in from the left, does a loop in the
   middle of the screen and flies out on the right, leaving a glitter trail.
   Same flight path as bee.js. If 3D can't run, the 2D bee (bee.js) flies instead.
   Skipped for people who turned on "reduce motion".
=========================================== */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function fallbackTo2D() {
    const s = document.createElement("script");
    s.src = "bee.js";
    document.body.appendChild(s);
  }

  function whenLoaded(fn) {
    if (document.readyState === "complete") setTimeout(fn, 600);
    else window.addEventListener("load", () => setTimeout(fn, 600), { once: true });
  }

  whenLoaded(async () => {
    let THREE;
    try {
      THREE = await import(THREE_URL);
      const test = document.createElement("canvas");
      if (!(test.getContext("webgl2") || test.getContext("webgl"))) throw new Error("no webgl");
    } catch (e) {
      fallbackTo2D();
      return;
    }
    fly(THREE);
  });

  /* ---------------------------------------------------------------- */

  function fly(THREE) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    /* ---- renderer on a see-through layer above the page ---- */
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "9999"
    });
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.set(0, 0, 10);

    scene.add(new THREE.HemisphereLight(0xfff6dd, 0x3b1d5e, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xf9a8d4, 1.2);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    /* ---- the bee ---- */
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };

    const yellow = keep(new THREE.MeshPhysicalMaterial({ color: 0xffd24d, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
    const brown = keep(new THREE.MeshPhysicalMaterial({ color: 0x3b2614, roughness: 0.5, clearcoat: 0.4 }));
    const white = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 }));
    const pupilMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x1a0f08, roughness: 0.1, clearcoat: 1 }));
    const pink = keep(new THREE.MeshStandardMaterial({ color: 0xff7aa8, roughness: 0.6, transparent: true, opacity: 0.85 }));
    const wingMat = keep(new THREE.MeshPhysicalMaterial({
      color: 0xdff3ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3
    }));

    // striped body texture: the sphere is turned so its stripes run around the body
    const stripes = document.createElement("canvas");
    stripes.width = 16; stripes.height = 256;
    const sc = stripes.getContext("2d");
    const g = sc.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#f08c00"); g.addColorStop(0.5, "#ffc93c"); g.addColorStop(1, "#ffe48a");
    sc.fillStyle = g; sc.fillRect(0, 0, 16, 256);
    sc.fillStyle = "#3b2614";
    [[0.17, 0.27], [0.37, 0.47], [0.57, 0.66]].forEach(([a, b]) => sc.fillRect(0, a * 256, 16, (b - a) * 256));
    const stripeTex = keep(new THREE.CanvasTexture(stripes));
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    const bodyMat = keep(new THREE.MeshPhysicalMaterial({ map: stripeTex, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }));

    const model = new THREE.Group();              // faces +x
    const mesh = (geo, mat, x, y, z) => {
      keep(geo);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      model.add(m);
      return m;
    };

    // body (poles along x so the stripes wrap around it)
    const bodyGeo = new THREE.SphereGeometry(0.75, 48, 32);
    bodyGeo.rotateZ(-Math.PI / 2);
    mesh(bodyGeo, bodyMat, -0.15, 0, 0).scale.set(1.35, 1, 1);

    // stinger
    const sting = mesh(new THREE.ConeGeometry(0.11, 0.38, 16), brown, -1.3, -0.02, 0);
    sting.rotation.z = Math.PI / 2;

    // head
    mesh(new THREE.SphereGeometry(0.62, 40, 28), yellow, 1.05, 0.12, 0);

    // eyes (with pupils and highlights) – grouped so they can blink
    const eyes = new THREE.Group();
    eyes.position.set(1.48, 0.3, 0);
    model.add(eyes);
    [0.26, -0.26].forEach((z) => {
      const e = new THREE.Mesh(keep(new THREE.SphereGeometry(0.24, 28, 18)), white);
      e.position.set(0, 0, z);
      e.scale.set(0.8, 1.15, 1);
      eyes.add(e);
      const p = new THREE.Mesh(keep(new THREE.SphereGeometry(0.13, 20, 14)), pupilMat);
      p.position.set(0.15, -0.02, z * 1.08);
      eyes.add(p);
      const hl = new THREE.Mesh(keep(new THREE.SphereGeometry(0.035, 10, 8)), white);
      hl.position.set(0.25, 0.05, z * 1.0);
      eyes.add(hl);
    });

    // cheeks
    [0.4, -0.4].forEach((z) => {
      mesh(new THREE.SphereGeometry(0.1, 16, 12), pink, 1.5, 0.0, z).scale.set(0.6, 0.6, 1);
    });

    // smile
    const smile = mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 24, Math.PI), brown, 1.64, -0.04, 0);
    smile.rotation.set(0, Math.PI / 2, Math.PI);

    // antennae
    [0.18, -0.18].forEach((z) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(1.25, 0.6, z),
        new THREE.Vector3(1.3, 1.05, z * 1.4),
        new THREE.Vector3(1.65, 1.15, z * 2.2)
      );
      mesh(new THREE.TubeGeometry(curve, 16, 0.03, 8), brown, 0, 0, 0);
      mesh(new THREE.SphereGeometry(0.08, 14, 10), brown, 1.65, 1.15, z * 2.2);
    });

    // wings: an oval with its pivot at the base, so they flap from the body
    const wingShape = new THREE.Shape();
    wingShape.absellipse(0, 0.5, 0.34, 0.52, 0, Math.PI * 2, false, 0);
    const wingGeo = keep(new THREE.ShapeGeometry(wingShape, 24));
    const wings = [0.16, -0.16].map((z) => {
      const pivot = new THREE.Group();
      pivot.position.set(-0.05, 0.62, z);
      const w = new THREE.Mesh(wingGeo, wingMat);
      w.rotation.z = 0.35;                         // sweep the wings back a little
      pivot.add(w);
      model.add(pivot);
      return { pivot, side: Math.sign(z) };
    });

    // 3/4 view: turn the face towards the viewer
    model.rotation.y = -0.9;
    const bee = new THREE.Group();
    bee.add(model);
    scene.add(bee);

    /* ---- screen ⇄ world ---- */
    const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldPerPx = visibleH / H;
    const sizePx = W < 600 ? 85 : 120;              // bee length on screen
    bee.scale.setScalar((sizePx * worldPerPx) / 3.0);
    const toWorld = (p) => ({ x: (p.x - W / 2) * worldPerPx, y: -(p.y - H / 2) * worldPerPx });

    /* ---- same flight path as the 2D bee ---- */
    const startP = { x: -sizePx, y: H * 0.32 };
    const loopP = { x: W * 0.5, y: H * 0.5 };
    const R = Math.min(W, H) * 0.14;
    const endP = { x: W + sizePx, y: H * 0.18 };
    const lerp = (a, b, u) => a + (b - a) * u;
    const smooth = (u) => u * u * (3 - 2 * u);

    function pos(t) {
      if (t < 0.38) {
        const u = t / 0.38;
        return { x: lerp(startP.x, loopP.x, u), y: lerp(startP.y, loopP.y, smooth(u)) + Math.sin(u * Math.PI * 2) * 22 };
      }
      if (t < 0.7) {
        const a = ((t - 0.38) / 0.32) * Math.PI * 2;
        return { x: loopP.x + R * Math.sin(a), y: loopP.y - R + R * Math.cos(a) };
      }
      const u = (t - 0.7) / 0.3;
      return { x: lerp(loopP.x, endP.x, u), y: lerp(loopP.y, endP.y, smooth(u)) - Math.sin(u * Math.PI) * 30 };
    }

    /* ---- glitter trail (same sparkles as the 2D bee, styled in style.css) ---- */
    const SPARKLE_COLORS = ["#ffd24d", "#fff4b0", "#ffffff", "#f32e90", "#f9a8d4", "#c084fc"];
    let liveSparkles = 0;
    function spawnSparkle(x, y) {
      if (liveSparkles > 220) return;
      liveSparkles++;
      const s = document.createElement("span");
      s.className = Math.random() < 0.35 ? "bee-sparkle star" : "bee-sparkle";
      s.setAttribute("aria-hidden", "true");
      const sz = s.classList.contains("star") ? 9 + Math.random() * 13 : 4 + Math.random() * 7;
      s.style.left = x + (Math.random() - 0.5) * 14 + "px";
      s.style.top = y + (Math.random() - 0.5) * 14 + "px";
      s.style.width = sz + "px";
      s.style.height = sz + "px";
      s.style.setProperty("--c", SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]);
      s.style.setProperty("--dx", (Math.random() - 0.5) * 40 + "px");
      s.style.setProperty("--dy", 20 + Math.random() * 45 + "px");
      s.style.setProperty("--rot", (Math.random() - 0.5) * 360 + "deg");
      s.style.animationDuration = 0.9 + Math.random() * 0.9 + "s";
      document.body.appendChild(s);
      s.addEventListener("animationend", () => { s.remove(); liveSparkles--; }, { once: true });
    }

    /* ---- animation ---- */
    const DURATION = 4200;
    const t0 = performance.now();
    let lastTrail = 0;

    function frame(now) {
      const elapsed = now - t0;
      const t = Math.min(elapsed / DURATION, 1);
      const p = pos(t);
      const q = pos(Math.min(t + 0.004, 1));
      const angle = Math.atan2(q.y - p.y, q.x - p.x);   // screen angle (y down)

      const w = toWorld(p);
      const bob = Math.sin(now / 90) * 2 * worldPerPx;
      bee.position.set(w.x, w.y + bob, 0);
      bee.rotation.z = -angle;                           // follow the path, like the 2D bee
      model.rotation.x = Math.sin(now / 260) * 0.12;     // a little wobble

      // fast wing flaps
      const flap = Math.sin(now / 14);
      wings.forEach(({ pivot, side }) => { pivot.rotation.x = side * (0.35 + flap * 0.55); });

      // one blink, mid-loop
      const blink = elapsed > 2300 && elapsed < 2420 ? 0.12 : 1;
      eyes.scale.y = blink;

      // glitter from behind the bee
      if (now - lastTrail > 30 && t < 0.98) {
        lastTrail = now;
        const tailX = p.x - Math.cos(angle) * sizePx * 0.45;
        const tailY = p.y - Math.sin(angle) * sizePx * 0.45;
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) spawnSparkle(tailX, tailY);
      }

      renderer.render(scene, camera);

      if (t < 1) requestAnimationFrame(frame);
      else cleanUp();
    }

    function cleanUp() {
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      canvas.remove();
    }

    requestAnimationFrame(frame);
  }
})();
