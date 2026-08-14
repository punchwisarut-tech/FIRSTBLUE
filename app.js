const DEFAULT_PRODUCT_NAME = "FIRSTBLUE SNR PDF";
const ADMIN_PASSWORD_KEY = "firstblue-admin-password";
const CURRENT_PRODUCT_KEY = "firstblue-current-product";

const adminDialog = document.querySelector("#admin-dialog");
const adminLogin = document.querySelector("#admin-login");
const adminPanel = document.querySelector("#admin-panel");
const uploadForm = document.querySelector("#upload-form");
const codeForm = document.querySelector("#code-form");
const deleteAllCodesForm = document.querySelector("#delete-all-codes-form");
const downloadCodeForm = document.querySelector("#download-code-form");
const uploadResult = document.querySelector("#upload-result");
const codeList = document.querySelector("#code-list");
const downloadPanel = document.querySelector("#download-panel");
const downloadStatus = document.querySelector("#download-status");
const downloadBtn = document.querySelector("#download-btn");

let activeDownload = null;

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
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    const file = document.querySelector("#product-file").files[0];
    const productName = document.querySelector("#product-name").value.trim();
    if (!password || !file || !productName) return;
    if (file.type && file.type !== "application/pdf") {
      uploadResult.textContent = "กรุณาเลือกไฟล์ PDF เท่านั้น";
      return;
    }

    try {
      uploadResult.textContent = `กำลังอัปโหลด ${file.name}...`;
      const upload = await apiPost("/api/create-upload-url", {
        password,
        fileName: file.name
      });
      const formData = new FormData();
      formData.append("cacheControl", "3600");
      formData.append("", file);
      const response = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: formData
      });
      if (!response.ok) throw new Error("Supabase ปฏิเสธการอัปโหลดไฟล์");

      const product = {
        productName,
        fileName: file.name,
        filePath: upload.filePath
      };
      localStorage.setItem(CURRENT_PRODUCT_KEY, JSON.stringify(product));
      uploadResult.textContent = `อัปโหลดสำเร็จ: ${file.name} — รหัสใหม่จะใช้ไฟล์นี้`;
    } catch (error) {
      uploadResult.textContent = error.message || "อัปโหลดไฟล์ไม่สำเร็จ";
    }
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
    const currentProduct = readCurrentProduct();
    const record = await apiPost("/api/create-code", {
      password,
      productName: currentProduct.productName,
      fileName: currentProduct.fileName,
      filePath: currentProduct.filePath
    });
    renderCodeRows([record, ...readRenderedCodes()]);
  } catch (error) {
    setHint(codeForm, error.message || "สร้างรหัสไม่สำเร็จ");
  }
});

deleteAllCodesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const result = document.querySelector("#delete-all-codes-result");
  if (!password) return;

  if (!window.confirm("ยืนยันลบรหัสดาวน์โหลดทั้งหมด? การดำเนินการนี้ย้อนกลับไม่ได้")) return;

  try {
    const response = await apiPost("/api/delete-all-codes", {
      password,
      confirmation: "DELETE_ALL_CODES"
    });
    renderCodeRows([]);
    result.textContent = `ลบเรียบร้อย ${response.deletedCount || 0} รหัส`;
  } catch (error) {
    result.textContent = error.message || "ลบรหัสไม่สำเร็จ";
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
  const currentProduct = readCurrentProduct();
  document.querySelector("#product-name").value = currentProduct.productName;
  uploadResult.textContent = `ไฟล์ปัจจุบัน: ${currentProduct.fileName}`;
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  if (password) loadCodes(password).catch(() => {});
}

function readCurrentProduct() {
  try {
    const saved = JSON.parse(localStorage.getItem(CURRENT_PRODUCT_KEY));
    if (saved?.productName && saved?.fileName && saved?.filePath) return saved;
  } catch {}
  return {
    productName: DEFAULT_PRODUCT_NAME,
    fileName: "FIRSTBLUE SNR 169.-.pdf",
    filePath: ""
  };
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

    // ลบรหัสที่ใช้แล้วออกจาก list ทันที
    const remaining = readRenderedCodes().filter(
      (item) => item.code.toUpperCase() !== codeValue.toUpperCase()
    );
    renderCodeRows(remaining);
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

  try {
    if (document.execCommand("copy")) return true;
  } catch {
    // Continue to the next clipboard method.
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some embedded browsers report clipboard support but do not grant write access.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "0";
  textarea.style.top = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    selectField(fallbackField);
  }
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
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
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

// Admin dropdown toggle
const adminArrowBtn = document.querySelector("#admin-arrow-btn");
const adminDropdownMenu = document.querySelector("#admin-dropdown-menu");

if (adminArrowBtn) {
  adminArrowBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    adminDropdownMenu.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    adminDropdownMenu.classList.remove("open");
  });
}
