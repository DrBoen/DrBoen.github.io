/**
 * CourseForge — Step 5a UI
 * - Visible fields: Title, Description, CLOs
 * - Inline client validation for required fields
 * - Spinner/status handling
 * - POST to Supabase Edge Function (stub returns { ok: true } at this stage)
 *
 * NOTE: For real end-to-end POST without CORS errors, host this page on the same origin
 * as the Edge Function (Supabase Websites). Running from file:// or a different localhost
 * origin will likely be blocked by CORS because the function allows only FRONTEND_ORIGIN.
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
let latestMarkdown = "";

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
      if (errorEl) errorEl.textContent = label + " must be a positive whole number.";
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
enforcePositiveInteger(targetModuleCountInput, targetModuleCountError, "Target Module Count");

// UI helpers
function setBusy(isBusy, labelWhenBusy = "Processing your course map…") {
  if (isBusy) {
    submitBtn.setAttribute("disabled", "true");
    submitBtn.dataset.prev = submitBtn.textContent || "Generate Course Map";
    submitBtn.innerHTML = `${labelWhenBusy} <span class="spinner" aria-hidden="true"></span>`;
    statusEl.classList.remove("status--error", "status--success");
    statusEl.textContent = labelWhenBusy;
  } else {
    submitBtn.removeAttribute("disabled");
    submitBtn.textContent = submitBtn.dataset.prev || "Generate Course Map";
    submitBtn.dataset.prev = "";
  }
}

function showError(msg) {
  statusEl.classList.remove("status--success");
  statusEl.classList.add("status--error");
  statusEl.textContent = msg;
}

function showSuccess(msg) {
  statusEl.classList.remove("status--error");
  statusEl.classList.add("status--success");
  statusEl.textContent = msg;
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

// Strict positive integer check (no decimals, no signs, no scientific notation)
function isPositiveInteger(str) {
  return /^[1-9]\d*$/.test(str);
}

function clearFieldErrors() {
  titleError.textContent = "";
  if (descError) descError.textContent = "";
  if (closError) closError.textContent = "";
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

  // Validate Target Module Count if provided (positive whole number)
  const tmcRaw = targetModuleCountInput?.value?.trim?.() || "";
  if (tmcRaw !== "") {
    if (!isPositiveInteger(tmcRaw)) {
      if (targetModuleCountError)
        targetModuleCountError.textContent =
          "Target Module Count must be a positive whole number.";
      ok = false;
    }
  }

  return ok;
}

async function postGenerate(payload) {
  // Important: CORS will succeed only when this page is served from FRONTEND_ORIGIN.
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errText = "Generation failed. Please try again.";
    try {
      const data = await res.json();
      if (data && data.error) errText = data.error;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }

  return res.json();
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateClient()) return;

  // Build payload from visible fields (Step 5 complete)
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
    if (data && typeof data.markdown === "string" && data.markdown.trim().length > 0) {
      latestMarkdown = data.markdown;
      showSuccess("Course map ready. Click Download Markdown.");
      if (downloadBtn) {
        downloadBtn.style.display = "";
        downloadBtn.onclick = () => triggerMarkdownDownload("course-map.md", latestMarkdown);
      }
    } else {
      showError("Unexpected response format. Please try again.");
    }
  } catch (err) {
    if (location.protocol === "file:") {
      showError("Generation failed due to CORS in file:// preview. Serve via GitHub Pages (https://drboen.github.io/courseforge) or http://127.0.0.1:5500 and try again.");
    } else {
      showError((err && err.message) || "Generation failed. Please try again.");
    }
  } finally {
    setBusy(false);
  }
});
