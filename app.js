const DEFAULT_PRODUCT_NAME = "FIRSTBLUE SNR PDF";
const ADMIN_PASSWORD_KEY = "firstblue-admin-password";

const adminDialog = document.querySelector("#admin-dialog");
const adminLogin = document.querySelector("#admin-login");
const adminPanel = document.querySelector("#admin-panel");
const uploadForm = document.querySelector("#upload-form");
const codeForm = document.querySelector("#code-form");
const downloadCodeForm = document.querySelector("#download-code-form");
const uploadResult = document.querySelector("#upload-result");
const codeList = document.querySelector("#code-list");
const downloadPanel = document.querySelector("#download-panel");
const downloadStatus = document.querySelector("#download-status");
const downloadBtn = document.querySelector("#download-btn");

let activeDownload = null;

// ซ่อน download panel ถ้าไม่มี hash
if (!location.hash.includes("download?code=")) {
  downloadPanel.hidden = true;
}

document.querySelectorAll("[data-open-admin]").forEach((button) => {
  button.addEventListener("click", () => {
    adminDialog.showModal();
    adminLogin.hidden = false;
    adminPanel.hidden = true;
  });
});

document.querySelectorAll("[data-close-admin]").forEach((button) => {
  button.addEventListener("click", () => adminDialog.close());
});

adminLogin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#admin-password").value.trim();
  if (!password) return;

  try {
    await loadCodes(password);
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
    adminLogin.hidden = true;
    adminPanel.hidden = false;
    renderAdmin();
  } catch {
    setHint(adminLogin, "รหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า server");
  }
});

if (uploadForm) {
  uploadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    uploadResult.textContent = "เวอร์ชันออนไลน์ใช้ไฟล์ PDF จาก Supabase Storage: firstblue-snr.pdf";
  });
}

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  if (!password) {
    setHint(codeForm, "กรุณาเข้าสู่ระบบแอดมินก่อน");
    return;
  }

  try {
    const record = await apiPost("/api/create-code", {
      password,
      productName: DEFAULT_PRODUCT_NAME
    });
    renderCodeRows([record, ...readRenderedCodes()]);
  } catch (error) {
    setHint(codeForm, error.message || "สร้างรหัสไม่สำเร็จ");
  }
});

downloadCodeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#download-code-input");
  const code = input.value.trim().toUpperCase();
  if (!code) return;
  location.hash = `download?code=${encodeURIComponent(code)}`;
});

downloadBtn.addEventListener("click", () => {
  if (!activeDownload?.url) return;
  window.location.href = activeDownload.url;
  activeDownload = null;
  downloadBtn.disabled = true;
  downloadStatus.textContent = "ลิงก์ดาวน์โหลดถูกใช้แล้ว หากกดซ้ำไม่ได้ กรุณาติดต่อแอดมิน";
  history.replaceState(null, "", location.pathname);
  setTimeout(() => { downloadPanel.hidden = true; }, 2000);
});

window.addEventListener("hashchange", renderDownload);
renderDownload();

async function loadCodes(password) {
  const result = await apiPost("/api/list-codes", { password });
  renderCodeRows(result.codes || []);
}

function renderAdmin() {
  uploadResult.textContent = "ไฟล์ออนไลน์พร้อมใช้งาน: firstblue-snr.pdf";
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  if (password) loadCodes(password).catch(() => {});
}

function renderCodeRows(codes) {
  codeList.dataset.codes = JSON.stringify(codes);

  if (!codes.length) {
    codeList.innerHTML = `<p class="hint">ยังไม่มีรหัสดาวน์โหลด</p>`;
    return;
  }

  codeList.innerHTML = codes
    .map((item) => {
      const statusClass = item.usedAt ? "status-used" : "status-ready";
      const statusText = item.usedAt ? "ใช้แล้ว" : "พร้อมใช้งาน";
      return `
        <div class="code-row">
          <div>
            <strong>${escapeHtml(item.productName || DEFAULT_PRODUCT_NAME)}</strong>
            <input class="download-code" value="${escapeHtml(item.code)}" readonly />
            <small>ให้ลูกค้ากรอกรหัสนี้ในช่อง Download Ebook</small>
          </div>
          <span class="${statusClass}">${statusText}</span>
          <button class="line-btn" type="button" data-copy="${escapeHtml(item.code)}">คัดลอก</button>
        </div>
      `;
    })
    .join("");

  codeList.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = button.closest(".code-row").querySelector(".download-code");
      const code = button.dataset.copy;
      const copied = await copyText(code, field);
      button.textContent = copied ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ";
      setTimeout(() => { button.textContent = "คัดลอก"; }, 1600);

      // ปิด admin dialog แล้วเลื่อนไปช่อง download
      adminDialog.close();
      const downloadInput = document.querySelector("#download-code-input");
      if (downloadInput) {
        downloadInput.value = code;
        downloadInput.scrollIntoView({ behavior: "smooth", block: "center" });
        downloadInput.focus();
      }
    });
  });

  codeList.querySelectorAll(".download-code").forEach((field) => {
    field.addEventListener("click", () => selectField(field));
  });
}

function readRenderedCodes() {
  try {
    return JSON.parse(codeList.dataset.codes || "[]");
  } catch {
    return [];
  }
}

async function renderDownload() {
  const params = new URLSearchParams(location.hash.replace("#download?", ""));
  const codeValue = params.get("code");
  if (!codeValue) {
    downloadPanel.hidden = true;
    activeDownload = null;
    return;
  }

  downloadPanel.hidden = false;
  downloadPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  downloadBtn.disabled = true;
  downloadStatus.textContent = "กำลังตรวจสอบรหัส...";

  try {
    activeDownload = await apiPost("/api/redeem-code", { code: codeValue });
    downloadStatus.textContent = `มีไฟล์ ${activeDownload.fileName || DEFAULT_PRODUCT_NAME} พร้อมดาวน์โหลดด้านล่าง กดได้ 1 ครั้ง`;
    downloadBtn.disabled = false;
  } catch (error) {
    activeDownload = null;
    downloadStatus.textContent = error.message || "รหัสนี้ไม่ถูกต้องหรือถูกใช้ไปแล้ว";
  }
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Server error");
  return data;
}

async function copyText(text, fallbackField) {
  selectField(fallbackField);
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  try {
    if (document.execCommand("copy")) return true;
  } catch {}
  return false;
}

function selectField(field) {
  if (!field) return;
  field.focus();
  field.select();
  field.setSelectionRange(0, field.value.length);
}

function setHint(scope, message) {
  const hint = scope.querySelector(".hint");
  if (hint) hint.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "toggle-password") {
    const input = document.querySelector("#admin-password");
    const btn = e.target;
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "ซ่อน";
    } else {
      input.type = "password";
      btn.textContent = "แสดง";
    }
  }
});
