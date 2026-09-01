const ADMIN_PASSWORD_KEY = "firstblue-admin-password";
const PRODUCTS = {
  snr: { productName: "FIRSTBLUE SNR PDF", fileName: "FIRSTBLUE SNR 169.-.pdf" },
  bluefang: { productName: "BLUEFANG XAUUSD M3", fileName: "XAUUSD_M3_FIRSTBLUE.pdf" },
  course: { productName: "FIRSTBLUE VIDEO COURSE", fileName: "คอร์สเทรดตามเจ้าตลาด" }
};

const loginSection = document.querySelector("#admin-page-login");
const dashboard = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#admin-page-login-form");
const productSelect = document.querySelector("#admin-product-select");
const generateForm = document.querySelector("#admin-generate-form");
const codeList = document.querySelector("#admin-code-list");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#admin-page-password").value.trim();
  if (!password) return;
  try {
    await loadCodes(password);
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
    loginSection.hidden = true;
    dashboard.hidden = false;
    renderSelectedProduct();
  } catch (error) {
    document.querySelector("#admin-page-login-hint").textContent = error.message || "รหัสผ่านไม่ถูกต้อง";
  }
});

document.querySelector("#admin-page-toggle").addEventListener("click", () => {
  const input = document.querySelector("#admin-page-password");
  input.type = input.type === "password" ? "text" : "password";
  document.querySelector("#admin-page-toggle").textContent = input.type === "password" ? "แสดง" : "ซ่อน";
});

document.querySelector("#admin-logout").addEventListener("click", () => {
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
  location.reload();
});

productSelect.addEventListener("change", renderSelectedProduct);

generateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const productKey = productSelect.value;
  const product = PRODUCTS[productKey];
  const result = document.querySelector("#admin-generate-result");

  try {
    result.textContent = `กำลังสร้างรหัส ${product.productName}...`;
    const record = await apiPost("/api/create-code", { password, productKey });
    result.textContent = `สร้างรหัส ${record.code} เรียบร้อย`;
    await loadCodes(password);
  } catch (error) {
    result.textContent = error.message || "สร้างรหัสไม่สำเร็จ";
  }
});

document.querySelector("#admin-delete-all").addEventListener("click", async () => {
  if (!confirm("ยืนยันลบรหัสดาวน์โหลดของทุกสินค้าทั้งหมด?")) return;
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const result = document.querySelector("#admin-delete-result");
  try {
    const response = await apiPost("/api/delete-all-codes", { password, confirmation: "DELETE_ALL_CODES" });
    result.textContent = `ลบเรียบร้อย ${response.deletedCount || 0} รหัส`;
    renderCodes([]);
  } catch (error) {
    result.textContent = error.message || "ลบรหัสไม่สำเร็จ";
  }
});

function renderSelectedProduct() {
  const productKey = productSelect.value;
  const product = PRODUCTS[productKey];
  const isCourse = productKey === "course";
  const label = productKey === "snr" ? "SNR" : productKey === "bluefang" ? "BLUEFANG" : "VIDEO COURSE";
  document.querySelector("#fixed-file-status").innerHTML = `<span>${isCourse ? "ระบบคอร์สพร้อมใช้งาน" : "PDF พร้อมใช้งาน"}</span><strong>${escapeHtml(product.fileName)}</strong><small>${isCourse ? "รหัสนี้ใช้เข้าสู่หน้าเรียนได้ตลอดอายุ 7 วัน" : `ระบบจะผูกไฟล์นี้กับรหัส ${label} ทุกครั้ง`}</small>`;
  document.querySelector("#selected-product-preview").innerHTML = `<span>${isCourse ? "COURSE 01" : productKey === "snr" ? "BOOK 01" : "BOOK 02"}</span><strong>${escapeHtml(product.productName)}</strong><small>${escapeHtml(product.fileName)}</small>`;
  document.querySelector(".admin-generate-btn").textContent = `เจนรหัส ${label}`;
  document.querySelector("#admin-generate-result").textContent = "";
}

async function loadCodes(password) {
  const result = await apiPost("/api/list-codes", { password });
  renderCodes(result.codes || []);
}

function renderCodes(codes) {
  if (!codes.length) return codeList.innerHTML = `<p class="hint">ยังไม่มีรหัสดาวน์โหลด</p>`;
  codeList.innerHTML = codes.map((item) => {
    const expired = item.expiresAt && new Date(item.expiresAt) <= new Date();
    const isCourse = item.productName === "FIRSTBLUE VIDEO COURSE";
    const activated = isCourse && item.usedAt;
    const expiry = item.expiresAt ? new Date(item.expiresAt).toLocaleString("th-TH") : "-";
    return `<article class="code-row"><div><strong>${escapeHtml(item.productName)}</strong><input class="download-code" value="${escapeHtml(item.code)}" readonly /><small>หมดอายุ: ${escapeHtml(expiry)}</small></div><span class="${expired || activated ? "status-used" : "status-ready"}">${expired ? "หมดอายุ" : activated ? "เปิดใช้งานแล้ว" : "พร้อมใช้งาน"}</span><button class="line-btn copy-code-btn" type="button" data-code="${escapeHtml(item.code)}">คัดลอก</button></article>`;
  }).join("");
  codeList.querySelectorAll(".copy-code-btn").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.code);
    button.textContent = "คัดลอกแล้ว";
    setTimeout(() => button.textContent = "คัดลอก", 1400);
  }));
}

async function apiPost(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Server error");
  return data;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
