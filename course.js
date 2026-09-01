const loginView = document.querySelector("#login-view");
const classroom = document.querySelector("#classroom");
const message = document.querySelector("#login-message");
try { localStorage.removeItem("firstblue-course-session"); } catch (_) {}

document.querySelector("#course-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = document.querySelector("#course-code").value.trim();
  const submitButton = event.currentTarget.querySelector("button[type='submit']");
  submitButton.disabled = true;
  message.textContent = "กำลังตรวจสอบรหัส...";
  try {
    const response = await post("/api/course-login", { code });
    renderClassroom(response);
  } catch (error) {
    message.textContent = error.message;
    submitButton.disabled = false;
  }
});

document.querySelector("#course-logout").addEventListener("click", () => {
  classroom.hidden = true; loginView.hidden = false;
  document.querySelector("#course-code").value = "";
  const submitButton = document.querySelector("#course-login-form button[type='submit']");
  submitButton.disabled = false;
});

function renderClassroom(data) {
  loginView.hidden = true; classroom.hidden = false;
  message.textContent = "";
  const lifetime = new Date(data.expiresAt).getFullYear() >= 9999;
  document.querySelector("#access-expiry").textContent = lifetime ? "สิทธิ์นักเรียนตลอดชีพ · ใช้ได้หลายอุปกรณ์" : `สิทธิ์รับชมถึง ${new Date(data.expiresAt).toLocaleString("th-TH")}`;
  const shell = document.querySelector("#video-shell");
  if (data.youtubeVideoId) {
    const videoId = encodeURIComponent(data.youtubeVideoId);
    shell.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1" title="บทที่ 1 เทรดตามเจ้าตลาด" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  } else if (data.videoUrl) {
    shell.innerHTML = `<video controls controlsList="nodownload" playsinline poster="assets/course/lesson-0901-cover.png"><source src="${escapeHtml(data.videoUrl)}" type="video/mp4" />เบราว์เซอร์นี้ไม่รองรับวิดีโอ</video>`;
  } else {
    document.querySelector("#video-status").textContent = "บทเรียนพร้อมแล้ว — กำลังเชื่อมวิดีโอขึ้นระบบสตรีม";
  }
}

async function post(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("การเชื่อมต่อใช้เวลานาน กรุณากดเข้าเรียนอีกครั้ง");
    throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่");
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ไม่สามารถเชื่อมต่อระบบได้");
  return data;
}

function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"})[c]); }
