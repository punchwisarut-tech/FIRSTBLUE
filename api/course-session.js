const { handleError, sendJson } = require("./_supabase");
const { verify } = require("./_course-token");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  try {
    const session = verify((req.body || {}).token);
    if (!session || session.course !== "firstblue-trading") return sendJson(res, 401, { error: "เซสชันหมดอายุ กรุณาใส่รหัสอีกครั้ง" });
    const videoUrl = process.env.COURSE_VIDEO_URL || "";
    const youtubeVideoId = process.env.COURSE_YOUTUBE_VIDEO_ID || "AIM3iOcVdQ8";
    return sendJson(res, 200, {
      expiresAt: new Date(session.exp).toISOString(), videoUrl, youtubeVideoId,
      lessons: [{ id: "0901", number: "01", title: "เทรดตามเจ้าตลาด", duration: "1 ชั่วโมง 35 นาที", description: "ปูพื้นฐานการอ่านโครงสร้างตลาด และมองจังหวะ Buy / Sell อย่างเป็นระบบ" }]
    });
  } catch (error) { return handleError(res, error); }
};
