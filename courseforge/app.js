/**
 * CourseForge — UI (MVP + UX polish)
 * - Visible fields: Title, Description, CLOs (required) + optional fields
 * - Inline client validation for required and numeric fields
 * - Spinner/status handling with elapsed timer
 * - POST to Supabase Edge Function (returns { markdown })
 * - Download + Copy Markdown actions
 * - A11y: aria-busy, focus management, status live region
 * - Persistence: Autosave to localStorage and restore on load
 */

const FUNCTION_URL =
  "https://hfybwdjnnhdiuqmnyyir.supabase.co/functions/v1/courseforge-generate";

const $ = (sel) => document.querySelector(sel);
const form = $("#course-form");
const titleInput = $("#title");
const descInput = $("#description");
const closInput = $("#clos");
const descError = $("#description-error");
const closError = $("#clos-error");
const titleError = $("#title-error");
const lengthError = $("#length-error");
const creditHoursError = $("#creditHours-error");
const targetModuleCountError = $("#targetModuleCount-error");

const plosInput = $("#plos");
const creditHoursInput = $("#creditHours");
const keyTopicsInput = $("#keyTopics");
const keyTakeawaysInput = $("#keyTakeaways");
const prerequisitesInput = $("#prerequisites");
const lengthInput = $("#length");
const formatInput = $("#format");
const textbookInput = $("#textbook");
const classTimeStrategyInput = $("#classTimeStrategy");
const homeworkStrategyInput = $("#homeworkStrategy");
const majorAssessmentsInput = $("#majorAssessments");
const learnerCharacteristicsInput = $("#learnerCharacteristics");
const otherInfoInput = $("#otherInfo");
const targetModuleCountInput = $("#targetModuleCount");

const statusEl = $("#status");
const submitBtn = $("#submit-btn");
const yearEl = $("#year");
const downloadBtn = $("#downloadBtn");
const copyBtn = $("#copyBtn");
const docxBtn = $("#docxBtn");
const resetBtn = $("#resetBtn");
const resetModal = $("#confirmResetModal");
const confirmResetBtn = $("#confirmReset");
const cancelResetBtn = $("#cancelReset");

let latestMarkdown = "";
let timerId = null;
let startTs = 0;

const STORAGE_KEY = "cf.form.v1";

// Utility: set year in footer
(() => {
  try {
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
  } catch {}
})();

// Live integer enforcement for numeric fields
function enforcePositiveInteger(el, errorEl, label) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = (el.value || "").trim();
    if (!raw || isPositiveInteger(raw)) {
      if (errorEl) errorEl.textContent = "";
    } else {
      if (errorEl)
        errorEl.textContent = label + " must be a positive whole number.";
    }
  });
  el.addEventListener("blur", () => {
    const raw = (el.value || "").trim();
    if (raw && !isPositiveInteger(raw) && errorEl) {
      errorEl.textContent = label + " must be a positive whole number.";
    }
  });
}

// Attach to Credit Hours and Target Module Count
enforcePositiveInteger(creditHoursInput, creditHoursError, "Credit Hours");
enforcePositiveInteger(
  targetModuleCountInput,
  targetModuleCountError,
  "Target Module Count"
);

// Timer helpers
function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startProgressTimer(
  label = "Processing your course map. This could take a few minutes…"
) {
  startTs = Date.now();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    const elapsed = Date.now() - startTs;
    if (statusEl) {
      statusEl.textContent = `${label} (Elapsed: ${formatElapsed(
        elapsed
      )} — This may take 1–3 minutes for long maps)`;
    }
  }, 1000);
}

function stopProgressTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

// UI helpers
function setBusy(
  isBusy,
  labelWhenBusy = "Processing your course map. This could take a few minutes…"
) {
  if (isBusy) {
    submitBtn.setAttribute("disabled", "true");
    submitBtn.dataset.prev = submitBtn.textContent || "Generate Course Map";
    submitBtn.innerHTML = `${labelWhenBusy} <span class="spinner" aria-hidden="true"></span>`;
    statusEl.classList.remove("status--error", "status--success");
    statusEl.textContent = labelWhenBusy;
    form?.setAttribute("aria-busy", "true");
    startProgressTimer(labelWhenBusy);
  } else {
    submitBtn.removeAttribute("disabled");
    submitBtn.textContent = submitBtn.dataset.prev || "Generate Course Map";
    submitBtn.dataset.prev = "";
    form?.removeAttribute("aria-busy");
    stopProgressTimer();
  }
}

function focusStatus() {
  try {
    statusEl?.focus();
  } catch {}
}

function showError(msg) {
  statusEl.classList.remove("status--success");
  statusEl.classList.add("status--error");
  statusEl.textContent = msg;
  focusStatus();
}

function showSuccess(msg) {
  statusEl.classList.remove("status--error");
  statusEl.classList.add("status--success");
  statusEl.textContent = msg;
  focusStatus();
}

function triggerMarkdownDownload(filename, text) {
  try {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  } catch (e) {
    console.error(e);
    showError("Unable to download file. Please copy the Markdown manually.");
  }
}

async function triggerCopy(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showSuccess("Markdown copied to clipboard.");
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showSuccess("Markdown copied to clipboard.");
    }
  } catch (e) {
    console.error(e);
    showError("Unable to copy. Please download or copy manually.");
  }
}

async function triggerDocxDownload(filename, markdown) {
  try {
    // Ensure at least one exporter is ready (tries fallbacks if missing)
    const which = await ensureDocxLib();

    const unsafeHtml = marked.parse(markdown || "");
    const cleanHtml = DOMPurify.sanitize(unsafeHtml, { USE_PROFILES: { html: true } });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Course Map</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; line-height: 1.4; color: #111; }
    h1, h2, h3, h4 { color: #111; }
    h1 { font-size: 20pt; margin: 18pt 0 8pt; page-break-before: always; }
    h1:first-of-type { page-break-before: auto; }
    h2 { font-size: 16pt; margin: 16pt 0 6pt; }
    h3 { font-size: 13pt; margin: 12pt 0 4pt; }
    p, li { font-size: 11pt; }
    ul, ol { margin: 0 0 12pt 22pt; }
    table { border-collapse: collapse; margin: 12pt 0; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6pt 8pt; font-size: 10.5pt; }
    code, pre { font-family: Consolas, "Courier New", monospace; font-size: 10pt; }
    pre { background: #f6f8fa; padding: 8pt; border: 1px solid #eee; }
    hr { border: none; border-top: 1px solid #ddd; margin: 12pt 0; }
  </style>
</head>
<body>
${cleanHtml}
</body>
</html>`.trim();

    const options = {
      orientation: "portrait",
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1"
    };

    let blob = null;
    if (which === "html-docx-js" && window.htmlDocx?.asBlob) {
      blob = window.htmlDocx.asBlob(html, options);
    } else if (window.HTMLtoDOCX) {
      const arrayBuffer = await window.HTMLtoDOCX(html, null, options);
      blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    } else {
      showError("DOCX exporter failed to load. Please refresh the page and try again.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  } catch (e) {
    console.error(e);
    showError("Unable to generate DOCX. Please download Markdown or try again.");
  }
}

/* Dynamic DOCX library loader (fallback across CDNs) */
function loadScriptOnce(id, src) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

function waitFor(testFn, timeout = 6000, interval = 100) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      try {
        if (testFn()) {
          clearInterval(timer);
          resolve(true);
          return;
        }
      } catch {}
      if (Date.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error("waitFor timeout"));
      }
    }, interval);
  });
}

async function ensureDocxLib() {
  if (window.htmlDocx && typeof window.htmlDocx.asBlob === "function") {
    return "html-docx-js";
  }
  if (window.HTMLtoDOCX && typeof window.HTMLtoDOCX === "function") {
    return "html-to-docx";
  }

  // Try alternate CDN: html-docx-js via jsDelivr
  try {
    await loadScriptOnce(
      "html-docx-js-jsdelivr",
      "https://cdn.jsdelivr.net/npm/html-docx-js@0.4.1/dist/html-docx.js"
    );
    await waitFor(() => window.htmlDocx && typeof window.htmlDocx.asBlob === "function");
    return "html-docx-js";
  } catch (e) {
    console.warn("Fallback html-docx-js load failed:", e?.message);
  }

  // Try alternate CDN: html-to-docx via unpkg
  try {
    await loadScriptOnce(
      "html-to-docx-unpkg",
      "https://unpkg.com/html-to-docx@1.8.0/dist/browser.js"
    );
    await waitFor(() => window.HTMLtoDOCX && typeof window.HTMLtoDOCX === "function");
    return "html-to-docx";
  } catch (e) {
    console.warn("Fallback html-to-docx load failed:", e?.message);
  }

  throw new Error("No DOCX library available after fallbacks.");
}

/* Reset Modal + Reset Logic */
let resetModalPrevFocus = null;

function openResetModal() {
  if (!resetModal) return;
  resetModal.classList.remove("hidden");
  resetModal.setAttribute("aria-hidden", "false");

  // Save previous focus and move focus into modal
  resetModalPrevFocus = document.activeElement;
  const focusables = resetModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  (focusables[0] || confirmResetBtn || cancelResetBtn)?.focus?.();

  // Key handlers: Escape to close, basic focus trap
  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeResetModal();
      return;
    }
    if (e.key === "Tab") {
      const list = Array.from(
        resetModal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  resetModal._keydownHandler = onKeyDown;
  document.addEventListener("keydown", onKeyDown);
}

function closeResetModal() {
  if (!resetModal) return;
  resetModal.classList.add("hidden");
  resetModal.setAttribute("aria-hidden", "true");
  if (resetModal._keydownHandler) {
    document.removeEventListener("keydown", resetModal._keydownHandler);
    resetModal._keydownHandler = null;
  }
  try {
    (resetModalPrevFocus || resetBtn)?.focus?.();
  } catch {}
}

function resetFormAndStorage() {
  try {
    setBusy(false);
  } catch {}
  stopProgressTimer();

  // Clear form values and validation errors
  form?.reset();
  clearFieldErrors();
  // Re-run autoresize to collapse/fit textareas after reset
  attachAutoResize();

  // Clear autosaved state
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  // Clear generated content/actions
  latestMarkdown = "";
  if (downloadBtn) {
    downloadBtn.style.display = "none";
    downloadBtn.onclick = null;
  }
  if (copyBtn) {
    copyBtn.style.display = "none";
    copyBtn.onclick = null;
  }

  // Clear status (user requested no post-reset message)
  if (statusEl) {
    statusEl.classList.remove("status--error", "status--success");
    statusEl.textContent = "";
  }
}

// Strict positive integer check (no decimals, no signs, no scientific notation)
function isPositiveInteger(str) {
  return /^[1-9]\d*$/.test(str);
}

function clearFieldErrors() {
  titleError.textContent = "";
  if (descError) descError.textContent = "";
  if (closError) closError.textContent = "";
  if (lengthError) lengthError.textContent = "";
  if (creditHoursError) creditHoursError.textContent = "";
  if (targetModuleCountError) targetModuleCountError.textContent = "";
}

function validateClient() {
  clearFieldErrors();
  let ok = true;

  const title = (titleInput.value || "").trim();
  const desc = (descInput?.value || "").trim();
  const clos = (closInput?.value || "").trim();

  if (!title) {
    titleError.textContent = "Please enter a course title.";
    ok = false;
  }
  if (!desc) {
    if (descError) descError.textContent = "Please enter a course description.";
    ok = false;
  }
  if (!clos) {
    if (closError) closError.textContent = "Please enter at least one CLO.";
    ok = false;
  }

  // Validate Course Length (required)
  const lengthVal = (lengthInput?.value || "").trim();
  if (!lengthVal) {
    if (lengthError) lengthError.textContent = "Please enter course length.";
    ok = false;
  }

  // Validate Credit Hours if provided (positive whole number)
  const chRaw = creditHoursInput?.value?.trim?.() || "";
  if (chRaw !== "") {
    if (!isPositiveInteger(chRaw)) {
      if (creditHoursError)
        creditHoursError.textContent =
          "Credit Hours must be a positive whole number.";
      ok = false;
    }
  }

  // Validate Target Module Count (required, positive whole number)
  const tmcRaw = targetModuleCountInput?.value?.trim?.() || "";
  if (tmcRaw === "") {
    if (targetModuleCountError)
      targetModuleCountError.textContent =
        "Please enter a Target Module Count.";
    ok = false;
  } else if (!isPositiveInteger(tmcRaw)) {
    if (targetModuleCountError)
      targetModuleCountError.textContent =
        "Target Module Count must be a positive whole number.";
    ok = false;
  }

  return ok;
}

async function postGenerate(payload) {
  // Important: CORS will succeed only when this page is served from allowed origin(s).
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errText = "Generation failed. Please try again.";
    const status = res.status;
    try {
      const data = await res.json();
      if (data && data.error) errText = data.error;
    } catch {
      // ignore
    }
    const err = new Error(errText);
    err.status = status;
    throw err;
  }

  return res.json();
}

/* Auto-resize textareas to fit content */
function attachAutoResize() {
  const textareas = document.querySelectorAll("#course-form textarea");
  textareas.forEach((ta) => {
    const resize = () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    };
    if (!ta.dataset.autoresizeAttached) {
      ta.addEventListener("input", resize);
      ta.dataset.autoresizeAttached = "true";
    }
    // Initialize height to current content
    resize();
  });
}

/* Convert field-hint text into native tooltips on the label */
function applyLabelTooltips() {
  const rows = document.querySelectorAll("#course-form .form-row");
  rows.forEach((row) => {
    const label = row.querySelector("label.label");
    const hint = row.querySelector(".field-hint");
    const text = hint?.textContent?.trim?.();
    if (label && text) {
      label.setAttribute("title", text);
      label.setAttribute("data-hint", text);
    }
  });
}

// Local storage persistence
function collectFormValues() {
  return {
    title: titleInput?.value ?? "",
    description: descInput?.value ?? "",
    clos: closInput?.value ?? "",
    plos: plosInput?.value ?? "",
    creditHours: creditHoursInput?.value ?? "",
    keyTopics: keyTopicsInput?.value ?? "",
    keyTakeaways: keyTakeawaysInput?.value ?? "",
    prerequisites: prerequisitesInput?.value ?? "",
    length: lengthInput?.value ?? "",
    format: formatInput?.value ?? "",
    textbook: textbookInput?.value ?? "",
    classTimeStrategy: classTimeStrategyInput?.value ?? "",
    homeworkStrategy: homeworkStrategyInput?.value ?? "",
    majorAssessments: majorAssessmentsInput?.value ?? "",
    learnerCharacteristics: learnerCharacteristicsInput?.value ?? "",
    otherInfo: otherInfoInput?.value ?? "",
    targetModuleCount: targetModuleCountInput?.value ?? "",
  };
}

function saveFormToStorage() {
  try {
    const data = collectFormValues();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function restoreFormFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (titleInput) titleInput.value = data.title ?? "";
    if (descInput) descInput.value = data.description ?? "";
    if (closInput) closInput.value = data.clos ?? "";
    if (plosInput) plosInput.value = data.plos ?? "";
    if (creditHoursInput) creditHoursInput.value = data.creditHours ?? "";
    if (keyTopicsInput) keyTopicsInput.value = data.keyTopics ?? "";
    if (keyTakeawaysInput) keyTakeawaysInput.value = data.keyTakeaways ?? "";
    if (prerequisitesInput) prerequisitesInput.value = data.prerequisites ?? "";
    if (lengthInput) lengthInput.value = data.length ?? "";
    if (formatInput) formatInput.value = data.format ?? "";
    if (textbookInput) textbookInput.value = data.textbook ?? "";
    if (classTimeStrategyInput)
      classTimeStrategyInput.value = data.classTimeStrategy ?? "";
    if (homeworkStrategyInput)
      homeworkStrategyInput.value = data.homeworkStrategy ?? "";
    if (majorAssessmentsInput)
      majorAssessmentsInput.value = data.majorAssessments ?? "";
    if (learnerCharacteristicsInput)
      learnerCharacteristicsInput.value = data.learnerCharacteristics ?? "";
    if (otherInfoInput) otherInfoInput.value = data.otherInfo ?? "";
    if (targetModuleCountInput)
      targetModuleCountInput.value = data.targetModuleCount ?? "";
  } catch {}
}

/* Restore on load and autosave on changes */
restoreFormFromStorage();
attachAutoResize();
applyLabelTooltips();
(() => {
  const inputs = document.querySelectorAll(
    "#course-form input, #course-form textarea"
  );
  inputs.forEach((el) => {
    el.addEventListener("input", saveFormToStorage);
    el.addEventListener("blur", saveFormToStorage);
  });
})();

// Reset modal wiring
resetBtn?.addEventListener("click", openResetModal);
confirmResetBtn?.addEventListener("click", () => {
  resetFormAndStorage();
  closeResetModal();
});
cancelResetBtn?.addEventListener("click", closeResetModal);
resetModal?.addEventListener("click", (e) => {
  if (e.target === resetModal) closeResetModal();
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateClient()) return;

  // Build payload from visible fields
  const courseInfo = {
    title: titleInput.value.trim(),
    description: (descInput?.value || "").trim(),
    clos: (closInput?.value || "").trim(),
  };

  const plos = (plosInput?.value || "").trim();
  if (plos) courseInfo.plos = plos;

  const keyTopics = (keyTopicsInput?.value || "").trim();
  if (keyTopics) courseInfo.keyTopics = keyTopics;

  const keyTakeaways = (keyTakeawaysInput?.value || "").trim();
  if (keyTakeaways) courseInfo.keyTakeaways = keyTakeaways;

  const prerequisites = (prerequisitesInput?.value || "").trim();
  if (prerequisites) courseInfo.prerequisites = prerequisites;

  const lengthVal = (lengthInput?.value || "").trim();
  if (lengthVal) courseInfo.length = lengthVal;

  const formatVal = (formatInput?.value || "").trim();
  if (formatVal) courseInfo.format = formatVal;

  const textbook = (textbookInput?.value || "").trim();
  if (textbook) courseInfo.textbook = textbook;

  const classTimeStrategy = (classTimeStrategyInput?.value || "").trim();
  if (classTimeStrategy) courseInfo.classTimeStrategy = classTimeStrategy;

  const homeworkStrategy = (homeworkStrategyInput?.value || "").trim();
  if (homeworkStrategy) courseInfo.homeworkStrategy = homeworkStrategy;

  const majorAssessments = (majorAssessmentsInput?.value || "").trim();
  if (majorAssessments) courseInfo.majorAssessments = majorAssessments;

  const learnerCharacteristics = (
    learnerCharacteristicsInput?.value || ""
  ).trim();
  if (learnerCharacteristics)
    courseInfo.learnerCharacteristics = learnerCharacteristics;

  const otherInfo = (otherInfoInput?.value || "").trim();
  if (otherInfo) courseInfo.otherInfo = otherInfo;

  const chRaw2 = creditHoursInput?.value?.trim?.() || "";
  if (isPositiveInteger(chRaw2)) {
    courseInfo.creditHours = parseInt(chRaw2, 10);
  }

  const tmcRaw2 = targetModuleCountInput?.value?.trim?.() || "";
  if (isPositiveInteger(tmcRaw2)) {
    courseInfo.targetModuleCount = parseInt(tmcRaw2, 10);
  }

  const payload = { courseInfo };

  setBusy(true);

  try {
    const data = await postGenerate(payload);
    if (
      data &&
      typeof data.markdown === "string" &&
      data.markdown.trim().length > 0
    ) {
      latestMarkdown = data.markdown;
      showSuccess(
        "Course map ready. Click Download Markdown or Copy Markdown."
      );
      if (downloadBtn) {
        downloadBtn.style.display = "";
        downloadBtn.onclick = () =>
          triggerMarkdownDownload("course-map.md", latestMarkdown);
      }
      if (copyBtn) {
        copyBtn.style.display = "";
        copyBtn.onclick = () => triggerCopy(latestMarkdown);
      }
      if (docxBtn) {
        docxBtn.style.display = "";
        docxBtn.onclick = () => triggerDocxDownload("course-map.docx", latestMarkdown);
      }
    } else {
      showError("Unexpected response format. Please try again.");
    }
  } catch (err) {
    if (location.protocol === "file:") {
      showError(
        "Generation failed due to CORS in file:// preview. Serve via GitHub Pages (https://drboen.github.io/courseforge) or http://127.0.0.1:5500 and try again."
      );
    } else {
      const s = err && err.status;
      if (s === 400)
        showError(
          err.message || "Invalid input. Check required fields and numbers."
        );
      else if (s === 504)
        showError(
          "Request timed out. Very long maps can take minutes. Try again or reduce scope."
        );
      else if (s === 500)
        showError("Server not configured. Please try again later.");
      else if (s === 502) showError("Upstream error. Please try again.");
      else
        showError(
          (err && err.message) || "Generation failed. Please try again."
        );
    }
  } finally {
    setBusy(false);
  }
});
