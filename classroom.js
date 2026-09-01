const ENTRY_KEY = "firstblue-classroom-entry";
const rawEntry = sessionStorage.getItem(ENTRY_KEY);

if (!rawEntry) {
  window.location.replace("course.html");
} else {
  try {
    const data = JSON.parse(rawEntry);
    sessionStorage.removeItem(ENTRY_KEY);
    showClassroom(data);
  } catch (_) {
    sessionStorage.removeItem(ENTRY_KEY);
    window.location.replace("course.html");
  }
}

document.querySelector("#course-logout").addEventListener("click", () => {
  sessionStorage.removeItem(ENTRY_KEY);
  window.location.replace("course.html");
});

function showClassroom(data) {
  if (!data || !data.youtubeVideoId || !data.expiresAt) {
    window.location.replace("course.html");
    return;
  }
  const classroom = document.querySelector("#classroom");
  classroom.hidden = false;
  document.querySelector("#access-expiry").textContent = "สิทธิ์นักเรียนตลอดชีพ · ใช้ได้หลายอุปกรณ์";
  const videoId = encodeURIComponent(data.youtubeVideoId);
  document.querySelector("#video-shell").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1" title="บทที่ 1 เทรดตามเจ้าตลาด" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}
