/* =========================================================
   ACCESSIBILITY MENU
   A floating button that opens a panel of display settings. Each setting
   adds a class to <html>, and choices are saved for the next visit.
   No external libraries, nothing is sent anywhere.
========================================================= */

(function () {
  const STORAGE_KEY = "lihi-a11y";
  const root = document.documentElement;
  const SIZES = [100, 112, 125, 137, 150];          // text size, percent

  const OPTIONS = [
    { key: "contrast", label: "High contrast", icon: "◐" },
    { key: "gray", label: "Grayscale", icon: "◑" },
    { key: "links", label: "Highlight links", icon: "🔗" },
    { key: "readable", label: "Readable font", icon: "Aa" },
    { key: "spacing", label: "Text spacing", icon: "↕" },
    { key: "noanim", label: "Stop animations", icon: "⏸" },
    { key: "cursor", label: "Large cursor", icon: "➤" },
    { key: "focus", label: "Focus highlight", icon: "▢" }
  ];

  /* ---------- save / load ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    catch (e) { /* private mode – keep going without saving */ }
  }

  let state = load();
  if (typeof state.size !== "number") state.size = 0;

  /* ---------- apply ---------- */
  function apply() {
    OPTIONS.forEach(function (o) {
      root.classList.toggle("a11y-" + o.key, !!state[o.key]);
    });
    root.style.fontSize = state.size ? SIZES[state.size] + "%" : "";
    if (state.noanim) document.querySelectorAll("video").forEach(function (v) { v.pause(); });
  }

  apply();   // straight away, before the page paints, so there is no flash

  /* ---------- build the button and panel ---------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  // universal-access symbol, drawn with SVG (no icon font on this site)
  function accessIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "currentColor");
    const head = document.createElementNS(ns, "circle");
    head.setAttribute("cx", "12"); head.setAttribute("cy", "4.2"); head.setAttribute("r", "2.2");
    const body = document.createElementNS(ns, "path");
    body.setAttribute("d", "M4 8.2c2.6.7 5.3 1 8 1s5.4-.3 8-1l.5 1.9c-1.9.5-3.9.9-5.9 1v3.3l2 7.4-1.9.5-2.2-6.6h-1l-2.2 6.6-1.9-.5 2-7.4V11.1c-2-.1-4-.5-5.9-1z");
    svg.appendChild(head);
    svg.appendChild(body);
    return svg;
  }

  function build() {
    const toggle = el("button", {
      type: "button",
      class: "a11y-toggle",
      "aria-label": "Open accessibility menu",
      "aria-expanded": "false",
      "aria-controls": "a11y-panel"
    }, [accessIcon()]);

    const closeBtn = el("button", {
      type: "button", class: "a11y-close", "aria-label": "Close accessibility menu", text: "×"
    });

    const sizeValue = el("span", { class: "a11y-size-value", "aria-live": "polite" });
    const minus = el("button", { type: "button", "aria-label": "Decrease text size", text: "A-" });
    const plus = el("button", { type: "button", "aria-label": "Increase text size", text: "A+" });
    const sizeRow = el("div", { class: "a11y-size" }, [
      el("span", { text: "Text size" }),
      el("div", { class: "a11y-size-buttons" }, [minus, sizeValue, plus])
    ]);

    const grid = el("div", { class: "a11y-grid" }, [sizeRow]);
    const optionButtons = OPTIONS.map(function (o) {
      const b = el("button", {
        type: "button", class: "a11y-option", "aria-pressed": String(!!state[o.key])
      }, [
        el("span", { class: "a11y-ico", "aria-hidden": "true", text: o.icon }),
        el("span", { text: o.label })
      ]);
      b.addEventListener("click", function () {
        state[o.key] = !state[o.key];
        b.setAttribute("aria-pressed", String(state[o.key]));
        save(state);
        apply();
      });
      grid.appendChild(b);
      return b;
    });

    const reset = el("button", { type: "button", class: "a11y-reset", text: "Reset settings" });
    const statement = el("a", {
      href: "accessibility.html", class: "a11y-statement-link", text: "Accessibility statement"
    });

    const panel = el("div", {
      id: "a11y-panel",
      class: "a11y-panel",
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "a11y-title",
      hidden: ""
    }, [
      el("div", { class: "a11y-panel-header" }, [
        el("h2", { id: "a11y-title", class: "a11y-panel-title", text: "Accessibility" }),
        closeBtn
      ]),
      grid,
      el("div", { class: "a11y-footer" }, [reset, statement])
    ]);

    function showSize() {
      sizeValue.textContent = SIZES[state.size] + "%";
      minus.disabled = state.size === 0;
      plus.disabled = state.size === SIZES.length - 1;
    }

    minus.addEventListener("click", function () {
      if (state.size > 0) { state.size--; save(state); apply(); showSize(); }
    });
    plus.addEventListener("click", function () {
      if (state.size < SIZES.length - 1) { state.size++; save(state); apply(); showSize(); }
    });

    reset.addEventListener("click", function () {
      state = { size: 0 };
      save(state);
      apply();
      showSize();
      optionButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    });

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close accessibility menu");
      closeBtn.focus();
    }

    function close(returnFocus) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open accessibility menu");
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) open(); else close(false);
    });
    closeBtn.addEventListener("click", function () { close(true); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close(true);
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) close(false);
    });

    showSize();
    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();

  document.addEventListener("play", function (e) {
    if (state.noanim && e.target.tagName === "VIDEO") e.target.pause();
  }, true);
})();
