(function () {
  "use strict";

  const PRESETS = {
    "ig-post": { width: 1080, height: 1080 },
    "ig-story": { width: 1080, height: 1920 },
    "x-header": { width: 1500, height: 500 },
    "a4-poster": { width: 1240, height: 1754 },
  };

  const SNAP_THRESHOLD = 8;

  const el = (id) => document.getElementById(id);
  const designNameInput = el("design-name");
  const presetSelect = el("preset-select");
  const openSelect = el("open-select");
  const statusLine = el("status-line");
  const layersList = el("layers-list");
  const brandColors = el("brand-colors");
  const brandFonts = el("brand-fonts");
  const propFontFamily = el("prop-font-family");
  const propFontSize = el("prop-font-size");
  const propFill = el("prop-fill");
  const propStroke = el("prop-stroke");

  let centerGuideV = null;
  let centerGuideH = null;

  // ---- canvas setup -------------------------------------------------

  const canvas = new fabric.Canvas("editor-canvas", {
    preserveObjectStacking: true,
    backgroundColor: "#ffffff",
  });

  function setCanvasSize(width, height) {
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.calcOffset();
    canvas.renderAll();
  }

  setCanvasSize(PRESETS["ig-post"].width, PRESETS["ig-post"].height);
  presetSelect.value = "ig-post";

  function setStatus(msg) {
    statusLine.textContent = msg;
    if (msg) setTimeout(() => { if (statusLine.textContent === msg) statusLine.textContent = ""; }, 3000);
  }

  // ---- presets & custom size -----------------------------------------

  presetSelect.addEventListener("change", () => {
    const val = presetSelect.value;
    if (!val) return;
    if (val === "custom") {
      el("custom-width").value = canvas.getWidth();
      el("custom-height").value = canvas.getHeight();
      el("custom-size-dialog").classList.remove("hidden");
      return;
    }
    const preset = PRESETS[val];
    if (preset) setCanvasSize(preset.width, preset.height);
  });

  el("custom-size-cancel").addEventListener("click", () => {
    el("custom-size-dialog").classList.add("hidden");
  });
  el("custom-size-ok").addEventListener("click", () => {
    const w = parseInt(el("custom-width").value, 10);
    const h = parseInt(el("custom-height").value, 10);
    if (w > 0 && h > 0) setCanvasSize(w, h);
    el("custom-size-dialog").classList.add("hidden");
    presetSelect.value = "custom";
  });

  // ---- fonts ----------------------------------------------------------

  async function loadFonts(extraFamilies) {
    const res = await fetch("/api/fonts");
    const { local, system } = await res.json();
    const all = [...new Set([...local, ...system, ...(extraFamilies || [])])];
    propFontFamily.innerHTML = all.map((f) => `<option value="${f}">${f}</option>`).join("");
    return all;
  }

  // ---- brand panel ------------------------------------------------------

  async function loadBrand() {
    const res = await fetch("/api/brand");
    const brand = await res.json();
    await loadFonts((brand.fonts || []).map((f) => f.family));

    brandColors.innerHTML = "";
    (brand.colors || []).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "color-swatch";
      btn.style.background = c.hex;
      btn.title = `${c.name} (${c.hex})`;
      btn.addEventListener("click", () => applyColorToSelection(c.hex));
      brandColors.appendChild(btn);
    });

    brandFonts.innerHTML = "";
    (brand.fonts || []).forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "font-swatch";
      btn.style.fontFamily = f.family;
      btn.textContent = f.name;
      btn.title = f.family;
      btn.addEventListener("click", () => applyFontToSelection(f.family));
      brandFonts.appendChild(btn);
    });
  }

  function applyColorToSelection(hex) {
    const obj = canvas.getActiveObject();
    if (!obj) { setStatus("Select an object first"); return; }
    obj.set("fill", hex);
    canvas.requestRenderAll();
    propFill.value = hex;
  }

  function applyFontToSelection(family) {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "textbox") { setStatus("Select a text object first"); return; }
    obj.set("fontFamily", family);
    canvas.requestRenderAll();
    propFontFamily.value = family;
  }

  // ---- adding objects -----------------------------------------------

  el("btn-add-text").addEventListener("click", () => {
    const text = new fabric.Textbox("Edit me", {
      left: canvas.getWidth() / 2 - 100,
      top: canvas.getHeight() / 2 - 20,
      width: 200,
      fontSize: 48,
      fontFamily: propFontFamily.value || "Arial",
      fill: "#1b1f2a",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  });

  el("btn-add-rect").addEventListener("click", () => {
    const rect = new fabric.Rect({
      left: canvas.getWidth() / 2 - 75,
      top: canvas.getHeight() / 2 - 50,
      width: 150,
      height: 100,
      fill: "#ff6b5b",
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  });

  el("btn-add-line").addEventListener("click", () => {
    const cx = canvas.getWidth() / 2;
    const cy = canvas.getHeight() / 2;
    const line = new fabric.Line([cx - 100, cy, cx + 100, cy], {
      stroke: "#1b1f2a",
      strokeWidth: 4,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.requestRenderAll();
  });

  el("image-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      fabric.Image.fromURL(ev.target.result, (img) => {
        const maxDim = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.6;
        if (img.width > maxDim || img.height > maxDim) {
          const scale = maxDim / Math.max(img.width, img.height);
          img.scale(scale);
        }
        img.set({
          left: canvas.getWidth() / 2 - (img.getScaledWidth() || img.width) / 2,
          top: canvas.getHeight() / 2 - (img.getScaledHeight() || img.height) / 2,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });

  el("btn-delete").addEventListener("click", () => {
    const active = canvas.getActiveObjects();
    active.forEach((o) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  });

  // ---- align helpers --------------------------------------------------

  el("btn-center-h").addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.centerObjectH(obj);
    obj.setCoords();
    canvas.requestRenderAll();
  });
  el("btn-center-v").addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.centerObjectV(obj);
    obj.setCoords();
    canvas.requestRenderAll();
  });
  el("btn-center-both").addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.centerObject(obj);
    obj.setCoords();
    canvas.requestRenderAll();
  });

  el("btn-forward").addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringForward(obj);
    refreshLayers();
  });
  el("btn-backward").addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendBackwards(obj);
    refreshLayers();
  });

  // ---- snap guides at canvas center ------------------------------------

  function clearGuides() {
    if (centerGuideV) { canvas.remove(centerGuideV); centerGuideV = null; }
    if (centerGuideH) { canvas.remove(centerGuideH); centerGuideH = null; }
  }

  function showGuideV() {
    if (centerGuideV) return;
    centerGuideV = new fabric.Line([canvas.getWidth() / 2, 0, canvas.getWidth() / 2, canvas.getHeight()], {
      stroke: "#ff6b5b",
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    canvas.add(centerGuideV);
  }
  function showGuideH() {
    if (centerGuideH) return;
    centerGuideH = new fabric.Line([0, canvas.getHeight() / 2, canvas.getWidth(), canvas.getHeight() / 2], {
      stroke: "#ff6b5b",
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    canvas.add(centerGuideH);
  }

  canvas.on("object:moving", (e) => {
    const obj = e.target;
    const center = obj.getCenterPoint();
    const cx = canvas.getWidth() / 2;
    const cy = canvas.getHeight() / 2;

    clearGuides();

    if (Math.abs(center.x - cx) < SNAP_THRESHOLD) {
      obj.setPositionByOrigin(new fabric.Point(cx, center.y), "center", "center");
      showGuideV();
    }
    if (Math.abs(center.y - cy) < SNAP_THRESHOLD) {
      obj.setPositionByOrigin(new fabric.Point(obj.getCenterPoint().x, cy), "center", "center");
      showGuideH();
    }
  });

  canvas.on("object:modified", clearGuides);
  canvas.on("mouse:up", clearGuides);

  // ---- properties panel -------------------------------------------------

  function syncPropertiesPanel() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.fill && typeof obj.fill === "string" && obj.fill.startsWith("#")) propFill.value = obj.fill;
    if (obj.stroke && typeof obj.stroke === "string" && obj.stroke.startsWith("#")) propStroke.value = obj.stroke;
    if (obj.type === "textbox") {
      propFontFamily.value = obj.fontFamily || "Arial";
      propFontSize.value = obj.fontSize || 48;
    }
  }

  canvas.on("selection:created", syncPropertiesPanel);
  canvas.on("selection:updated", syncPropertiesPanel);

  propFontFamily.addEventListener("change", () => {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === "textbox") { obj.set("fontFamily", propFontFamily.value); canvas.requestRenderAll(); }
  });
  propFontSize.addEventListener("input", () => {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === "textbox") { obj.set("fontSize", parseInt(propFontSize.value, 10) || 1); canvas.requestRenderAll(); }
  });
  propFill.addEventListener("input", () => applyColorToSelection(propFill.value));
  propStroke.addEventListener("input", () => {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set("stroke", propStroke.value);
    canvas.requestRenderAll();
  });

  // ---- layers panel (reorder via drag & drop) ----------------------------

  function objectLabel(obj, index) {
    if (obj.type === "textbox") return `Text: ${(obj.text || "").slice(0, 18)}`;
    if (obj.type === "image") return "Image";
    if (obj.type === "rect") return "Rectangle";
    if (obj.type === "line") return "Line";
    return `Layer ${index + 1}`;
  }

  function refreshLayers() {
    const objects = canvas.getObjects().filter((o) => !o.excludeFromExport);
    layersList.innerHTML = "";
    // Render top-most layer first in the list.
    [...objects].reverse().forEach((obj, i) => {
      const index = objects.length - 1 - i;
      const li = document.createElement("li");
      li.textContent = "";
      li.draggable = true;
      li.dataset.index = String(index);
      if (obj === canvas.getActiveObject()) li.classList.add("selected");

      const nameSpan = document.createElement("span");
      nameSpan.className = "layer-name";
      nameSpan.textContent = objectLabel(obj, index);
      li.appendChild(nameSpan);

      li.addEventListener("click", () => {
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        refreshLayers();
      });

      li.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", String(index));
      });
      li.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        li.classList.add("drag-over");
      });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", (ev) => {
        ev.preventDefault();
        li.classList.remove("drag-over");
        const fromIndex = parseInt(ev.dataTransfer.getData("text/plain"), 10);
        const toIndex = index;
        if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
        const moved = objects[fromIndex];
        canvas.moveTo(moved, toIndex);
        canvas.requestRenderAll();
        refreshLayers();
      });

      layersList.appendChild(li);
    });
  }

  canvas.on("object:added", refreshLayers);
  canvas.on("object:removed", refreshLayers);
  canvas.on("selection:created", refreshLayers);
  canvas.on("selection:updated", refreshLayers);
  canvas.on("selection:cleared", refreshLayers);

  // ---- save / open / duplicate -------------------------------------------

  function currentMeta() {
    return {
      name: designNameInput.value.trim() || "untitled",
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      preset: presetSelect.value || "custom",
      updatedAt: new Date().toISOString(),
    };
  }

  function serializeCanvas() {
    // Fabric skips objects flagged excludeFromExport (the snap guides) automatically.
    return canvas.toJSON();
  }

  async function saveDesign() {
    const name = designNameInput.value.trim();
    if (!name) { setStatus("Enter a design name first"); return; }
    const payload = { meta: currentMeta(), fabric: serializeCanvas() };
    const res = await fetch(`/api/designs/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { setStatus("Save failed"); return; }
    setStatus(`Saved to designs/${name}.json`);
    await refreshOpenList(name);
  }

  async function refreshOpenList(selectName) {
    const res = await fetch("/api/designs");
    const list = await res.json();
    openSelect.innerHTML = '<option value="">Open design…</option>' +
      list.map((d) => `<option value="${d.name}">${d.name} (${d.width}×${d.height})</option>`).join("");
    if (selectName) openSelect.value = selectName;
  }

  async function openDesign(name) {
    const res = await fetch(`/api/designs/${encodeURIComponent(name)}`);
    if (!res.ok) { setStatus("Could not open design"); return; }
    const data = await res.json();
    setCanvasSize(data.meta.width, data.meta.height);
    presetSelect.value = data.meta.preset && PRESETS[data.meta.preset] ? data.meta.preset : "custom";
    designNameInput.value = data.meta.name || name;
    canvas.loadFromJSON(data.fabric, () => {
      centerGuideV = null;
      centerGuideH = null;
      canvas.requestRenderAll();
      refreshLayers();
      setStatus(`Opened ${name}`);
    });
  }

  el("btn-save").addEventListener("click", saveDesign);

  openSelect.addEventListener("change", () => {
    if (openSelect.value) openDesign(openSelect.value);
  });

  el("btn-duplicate").addEventListener("click", async () => {
    const current = designNameInput.value.trim();
    if (!current) { setStatus("Save the design first"); return; }
    const newName = prompt("New design name:", `${current}-copy`);
    if (!newName) return;
    // Ensure the current state is on disk before duplicating it.
    await saveDesign();
    const res = await fetch(`/api/designs/${encodeURIComponent(current)}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error || "Duplicate failed"); return; }
    setStatus(`Duplicated as ${newName}`);
    await refreshOpenList(newName);
    openDesign(newName);
  });

  // ---- export -----------------------------------------------------------

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportPng(multiplier) {
    clearGuides();
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const dataUrl = canvas.toDataURL({ format: "png", multiplier });
    const name = designNameInput.value.trim() || "untitled";
    downloadDataUrl(dataUrl, `${name}@${multiplier}x.png`);
  }

  el("btn-export-png1").addEventListener("click", () => exportPng(1));
  el("btn-export-png2").addEventListener("click", () => exportPng(2));

  el("btn-export-pdf").addEventListener("click", async () => {
    const name = designNameInput.value.trim();
    if (!name) { setStatus("Save the design first"); return; }
    setStatus("Saving and rendering PDF…");
    await saveDesign();
    const res = await fetch(`/api/export/pdf/${encodeURIComponent(name)}`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(err.error || "PDF export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `${name}.pdf`);
    URL.revokeObjectURL(url);
    setStatus("PDF exported");
  });

  // ---- keyboard shortcuts -------------------------------------------------

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      const active = canvas.getActiveObjects();
      if (active.length) {
        active.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        e.preventDefault();
      }
    }
  });

  // ---- init ---------------------------------------------------------------

  (async function init() {
    await loadBrand(); // also populates the font dropdown, including brand fonts
    await refreshOpenList();
    refreshLayers();
  })();
})();
