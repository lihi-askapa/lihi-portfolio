/* ==========================================
   WELCOME BEE
   A small cartoon bee flies in from the left when the site opens,
   does a loop in the middle of the screen and flies out on the right.
   Shown once per browser session; skipped for "reduce motion" users.
=========================================== */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  try {
    if (sessionStorage.getItem("beeFlown")) return;
    sessionStorage.setItem("beeFlown", "1");
  } catch (e) {
    /* storage blocked: just show the bee */
  }

  const BEE_SVG = `
<svg viewBox="0 0 130 110" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="beeBody" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff4b0"/>
      <stop offset="0.45" stop-color="#ffc93c"/>
      <stop offset="1" stop-color="#f08c00"/>
    </radialGradient>
    <radialGradient id="beeHead" cx="40%" cy="32%" r="75%">
      <stop offset="0" stop-color="#fff7c4"/>
      <stop offset="0.5" stop-color="#ffd24d"/>
      <stop offset="1" stop-color="#f29a0b"/>
    </radialGradient>
    <radialGradient id="beeWing" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#bfe6ff" stop-opacity="0.55"/>
    </radialGradient>
    <radialGradient id="beeEye" cx="35%" cy="30%" r="70%">
      <stop offset="0" stop-color="#4a3426"/>
      <stop offset="1" stop-color="#1a0f08"/>
    </radialGradient>
    <clipPath id="beeBodyClip">
      <ellipse cx="58" cy="66" rx="36" ry="28"/>
    </clipPath>
    <filter id="beeShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g filter="url(#beeShadow)">
    <!-- back wing -->
    <ellipse class="bee-wing bee-wing-back" cx="52" cy="30" rx="15" ry="24"
      fill="url(#beeWing)" stroke="#ffffff" stroke-width="1.5" transform="rotate(-22 52 30)"/>

    <!-- stinger -->
    <path d="M23 66 L12 70 L24 73 Z" fill="#3b2614"/>

    <!-- body with stripes -->
    <ellipse cx="58" cy="66" rx="36" ry="28" fill="url(#beeBody)"/>
    <g clip-path="url(#beeBodyClip)" fill="#3b2614">
      <path d="M36 36 Q30 66 36 96 L46 96 Q40 66 46 36 Z"/>
      <path d="M56 34 Q50 66 56 98 L67 98 Q61 66 67 34 Z"/>
    </g>
    <ellipse cx="48" cy="52" rx="14" ry="6" fill="#ffffff" opacity="0.35"/>

    <!-- little legs -->
    <path d="M52 92 q-2 7 -6 8" stroke="#3b2614" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M66 92 q-1 7 -4 9" stroke="#3b2614" stroke-width="3" fill="none" stroke-linecap="round"/>

    <!-- antennae -->
    <path d="M90 36 Q86 20 80 14" stroke="#3b2614" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="79" cy="13" r="4.5" fill="#3b2614"/>
    <path d="M101 37 Q105 21 112 15" stroke="#3b2614" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="113" cy="14" r="4.5" fill="#3b2614"/>

    <!-- head -->
    <circle cx="96" cy="58" r="25" fill="url(#beeHead)"/>
    <ellipse cx="88" cy="45" rx="9" ry="5" fill="#ffffff" opacity="0.4"/>

    <!-- eyes -->
    <ellipse cx="91" cy="55" rx="7.5" ry="9.5" fill="#ffffff"/>
    <ellipse cx="106" cy="54" rx="8.5" ry="10.5" fill="#ffffff"/>
    <g class="bee-pupils">
      <circle cx="93" cy="56" r="5" fill="url(#beeEye)"/>
      <circle cx="108.5" cy="55.5" r="5.6" fill="url(#beeEye)"/>
      <circle cx="94.8" cy="53.8" r="1.8" fill="#ffffff"/>
      <circle cx="110.6" cy="53" r="2" fill="#ffffff"/>
    </g>
    <path class="bee-lids" d="M83 46 Q91 42 99 46 M97 44 Q106 39 115 44" stroke="#3b2614"
      stroke-width="2" fill="none" stroke-linecap="round"/>

    <!-- cheeks and smile -->
    <ellipse cx="86" cy="68" rx="4.5" ry="3" fill="#ff7aa8" opacity="0.7"/>
    <ellipse cx="114" cy="67" rx="4.5" ry="3" fill="#ff7aa8" opacity="0.7"/>
    <path d="M95 69 Q101 76 108 69" stroke="#3b2614" stroke-width="2.4" fill="#7a2e2e" stroke-linecap="round"/>

    <!-- front wing -->
    <ellipse class="bee-wing bee-wing-front" cx="66" cy="32" rx="17" ry="27"
      fill="url(#beeWing)" stroke="#ffffff" stroke-width="1.5" transform="rotate(14 66 32)"/>
  </g>
</svg>`;

  function start() {
    const bee = document.createElement("div");
    bee.className = "welcome-bee";
    bee.setAttribute("aria-hidden", "true");
    // Parse the fixed SVG markup as XML (no innerHTML)
    const svgDoc = new DOMParser().parseFromString(BEE_SVG.trim(), "image/svg+xml");
    bee.appendChild(document.importNode(svgDoc.documentElement, true));
    document.body.appendChild(bee);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const size = W < 600 ? 70 : 100;
    bee.style.width = size + "px";
    bee.style.height = size * 110 / 130 + "px";

    // Key points of the flight
    const startP = { x: -size, y: H * 0.32 };
    const loopP = { x: W * 0.5, y: H * 0.5 };             // bottom of the loop
    const R = Math.min(W, H) * 0.14;                       // loop radius
    const endP = { x: W + size, y: H * 0.18 };

    const lerp = (a, b, u) => a + (b - a) * u;
    const smooth = u => u * u * (3 - 2 * u);

    // Position along the flight for t in [0, 1]
    function pos(t) {
      if (t < 0.38) {                                      // fly in with a gentle wave
        const u = t / 0.38;
        return {
          x: lerp(startP.x, loopP.x, u),
          y: lerp(startP.y, loopP.y, smooth(u)) + Math.sin(u * Math.PI * 2) * 22
        };
      }
      if (t < 0.7) {                                       // full loop
        const a = ((t - 0.38) / 0.32) * Math.PI * 2;
        return {
          x: loopP.x + R * Math.sin(a),
          y: loopP.y - R + R * Math.cos(a)
        };
      }
      const u = (t - 0.7) / 0.3;                           // fly out, up and away
      return {
        x: lerp(loopP.x, endP.x, u),
        y: lerp(loopP.y, endP.y, smooth(u)) - Math.sin(u * Math.PI) * 30
      };
    }

    const DURATION = 4200;
    const t0 = performance.now();
    let lastTrail = 0;

    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1);
      const p = pos(t);
      const q = pos(Math.min(t + 0.004, 1));
      const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      const bob = Math.sin(now / 90) * 2;

      bee.style.transform =
        `translate(${p.x - size / 2}px, ${p.y - size / 2 + bob}px) rotate(${angle}deg)`;

      // Glitter trail: a few sparkles from behind the bee every ~30ms
      if (now - lastTrail > 30 && t < 0.98) {
        lastTrail = now;
        const tailX = p.x - Math.cos(angle * Math.PI / 180) * size * 0.4;
        const tailY = p.y - Math.sin(angle * Math.PI / 180) * size * 0.4;
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) spawnSparkle(tailX, tailY);
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        bee.remove();
      }
    }

    const SPARKLE_COLORS = ["#ffd24d", "#fff4b0", "#ffffff", "#f32e90", "#f9a8d4", "#c084fc"];
    let liveSparkles = 0;

    function spawnSparkle(x, y) {
      if (liveSparkles > 220) return;                      // keep it light on slow phones
      liveSparkles++;

      const s = document.createElement("span");
      // about a third are 4-point stars, the rest round glitter dots
      s.className = Math.random() < 0.35 ? "bee-sparkle star" : "bee-sparkle";
      s.setAttribute("aria-hidden", "true");

      const sz = s.classList.contains("star") ? 9 + Math.random() * 13 : 4 + Math.random() * 7;
      s.style.left = x + (Math.random() - 0.5) * 14 + "px";
      s.style.top = y + (Math.random() - 0.5) * 14 + "px";
      s.style.width = sz + "px";
      s.style.height = sz + "px";
      s.style.setProperty("--c", SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]);
      s.style.setProperty("--dx", (Math.random() - 0.5) * 40 + "px");   // drift sideways
      s.style.setProperty("--dy", 20 + Math.random() * 45 + "px");      // and fall down
      s.style.setProperty("--rot", (Math.random() - 0.5) * 360 + "deg");
      s.style.animationDuration = 0.9 + Math.random() * 0.9 + "s";

      document.body.appendChild(s);
      s.addEventListener("animationend", () => { s.remove(); liveSparkles--; }, { once: true });
    }

    requestAnimationFrame(frame);
  }

  // Start shortly after the page has loaded
  if (document.readyState === "complete") {
    setTimeout(start, 600);
  } else {
    window.addEventListener("load", () => setTimeout(start, 600), { once: true });
  }
})();
