const STORAGE_KEY = "firstblue-course-session";
const loginView = document.querySelector("#login-view");
const classroom = document.querySelector("#classroom");
const message = document.querySelector("#login-message");

document.querySelector("#course-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = document.querySelector("#course-code").value.trim();
  message.textContent = "กำลังตรวจสอบรหัส...";
  try {
    const response = await post("/api/course-login", { code });
    localStorage.setItem(STORAGE_KEY, response.token);
    await openClassroom(response.token);
  } catch (error) { message.textContent = error.message; }
});

document.querySelector("#course-logout").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  classroom.hidden = true; loginView.hidden = false;
});

async function openClassroom(token) {
  const data = await post("/api/course-session", { token });
  loginView.hidden = true; classroom.hidden = false;
  const lifetime = new Date(data.expiresAt).getFullYear() >= 9999;
  document.querySelector("#access-expiry").textContent = lifetime ? "สิทธิ์นักเรียนตลอดชีพ · ผูกกับอุปกรณ์นี้" : `สิทธิ์รับชมถึง ${new Date(data.expiresAt).toLocaleString("th-TH")}`;
  const shell = document.querySelector("#video-shell");
  if (data.videoUrl) {
    shell.innerHTML = `<video controls controlsList="nodownload" playsinline poster="assets/course/lesson-0901-cover.png"><source src="${escapeHtml(data.videoUrl)}" type="video/mp4" />เบราว์เซอร์นี้ไม่รองรับวิดีโอ</video>`;
  } else {
    document.querySelector("#video-status").textContent = "บทเรียนพร้อมแล้ว — กำลังเชื่อมวิดีโอขึ้นระบบสตรีม";
  }
}

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ไม่สามารถเชื่อมต่อระบบได้");
  return data;
}

function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"})[c]); }

const token = localStorage.getItem(STORAGE_KEY);
if (token) openClassroom(token).catch(() => localStorage.removeItem(STORAGE_KEY));
