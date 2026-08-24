const ADMIN_PASSWORD_KEY = "firstblue-admin-password";
const CURRENT_PRODUCT_KEY = "firstblue-current-product";

const PRODUCTS = {
  snr: { productName: "FIRSTBLUE SNR PDF", fileName: "FIRSTBLUE SNR 169.-.pdf", filePath: "" },
  bluefang: { productName: "BLUEFANG XAUUSD M3", fileName: "XAUUSD_M3_FIRSTBLUE.pdf", filePath: "" }
};

const loginSection = document.querySelector("#admin-page-login");
const dashboard = document.querySelector("#admin-dashboard");
const loginForm = document.querySelector("#admin-page-login-form");
const productSelect = document.querySelector("#admin-product-select");
const productNameInput = document.querySelector("#admin-product-name");
const uploadForm = document.querySelector("#admin-upload-form");
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

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const productKey = productSelect.value;
  const file = document.querySelector("#admin-product-file").files[0];
  const productName = productNameInput.value.trim();
  const result = document.querySelector("#admin-upload-result");
  if (!password || !file || !productName) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) return result.textContent = "กรุณาเลือกไฟล์ PDF เท่านั้น";

  try {
    result.textContent = `กำลังอัปโหลด ${file.name}...`;
    const upload = await apiPost("/api/create-upload-url", { password, fileName: file.name });
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);
    const response = await fetch(upload.signedUrl, { method: "PUT", headers: { "x-upsert": "false" }, body: formData });
    if (!response.ok) throw new Error("Supabase ปฏิเสธการอัปโหลดไฟล์");

    const product = { productName, fileName: file.name, filePath: upload.filePath };
    localStorage.setItem(`${CURRENT_PRODUCT_KEY}:${productKey}`, JSON.stringify(product));
    result.textContent = `อัปโหลดสำเร็จ: ${file.name}`;
    renderSelectedProduct();
  } catch (error) {
    result.textContent = error.message || "อัปโหลดไฟล์ไม่สำเร็จ";
  }
});

generateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const productKey = productSelect.value;
  const product = readProduct(productKey);
  const result = document.querySelector("#admin-generate-result");
  if (productKey === "bluefang" && !product.filePath) {
    result.textContent = "กรุณาอัปโหลดไฟล์ BLUEFANG ก่อนสร้างรหัส";
    return;
  }

  try {
    const record = await apiPost("/api/create-code", { password, ...product });
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
  const product = readProduct(productKey);
  productNameInput.value = product.productName;
  document.querySelector("#admin-upload-result").textContent = product.filePath ? `ไฟล์ปัจจุบัน: ${product.fileName}` : productKey === "snr" ? "ใช้ไฟล์ SNR เดิมจากระบบ หรือเลือกไฟล์ใหม่เพื่อเปลี่ยน" : "ยังไม่ได้อัปโหลดไฟล์ BLUEFANG";
  document.querySelector("#selected-product-preview").innerHTML = `<span>${productKey === "snr" ? "BOOK 01" : "BOOK 02"}</span><strong>${escapeHtml(product.productName)}</strong><small>${escapeHtml(product.fileName)}</small>`;
  document.querySelector(".admin-generate-btn").textContent = `เจนรหัส ${productKey === "snr" ? "SNR" : "BLUEFANG"}`;
  document.querySelector("#admin-generate-result").textContent = "";
}

function readProduct(productKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(`${CURRENT_PRODUCT_KEY}:${productKey}`));
    if (saved?.productName && saved?.fileName && saved?.filePath) return saved;
  } catch {}
  return { ...PRODUCTS[productKey] };
}

async function loadCodes(password) {
  const result = await apiPost("/api/list-codes", { password });
  renderCodes(result.codes || []);
}

function renderCodes(codes) {
  if (!codes.length) return codeList.innerHTML = `<p class="hint">ยังไม่มีรหัสดาวน์โหลด</p>`;
  codeList.innerHTML = codes.map((item) => {
    const expired = item.expiresAt && new Date(item.expiresAt) <= new Date();
    const expiry = item.expiresAt ? new Date(item.expiresAt).toLocaleString("th-TH") : "-";
    return `<article class="code-row"><div><strong>${escapeHtml(item.productName)}</strong><input class="download-code" value="${escapeHtml(item.code)}" readonly /><small>หมดอายุ: ${escapeHtml(expiry)}</small></div><span class="${expired ? "status-used" : "status-ready"}">${expired ? "หมดอายุ" : "พร้อมใช้งาน"}</span><button class="line-btn copy-code-btn" type="button" data-code="${escapeHtml(item.code)}">คัดลอก</button></article>`;
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
