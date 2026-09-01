const { handleError, sendJson, supabaseAdmin } = require("./_supabase");
const { sign } = require("./_course-token");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  try {
    const code = String((req.body || {}).code || "").trim().toUpperCase();
    if (!code) return sendJson(res, 400, { error: "กรุณากรอกรหัสเข้าเรียน" });
    const { data, error } = await supabaseAdmin().from("download_codes")
      .select("code, product_name, file_path, expires_at, used_at")
      .eq("code", code).eq("file_path", "course:firstblue-trading").maybeSingle();
    if (error) throw error;
    if (!data) return sendJson(res, 401, { error: "รหัสไม่ถูกต้อง หรือไม่ใช่รหัสคอร์ส" });
    // Course access is lifetime. Keep expires_at in the shared table for
    // compatibility with ebook codes, but issue a lifetime course session.
    const expiresAt = new Date("9999-12-31T23:59:59.000Z").getTime();
    const token = sign({ course: "firstblue-trading", code: data.code, exp: expiresAt });
    return sendJson(res, 200, {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      youtubeVideoId: process.env.COURSE_YOUTUBE_VIDEO_ID || "AIM3iOcVdQ8",
      lessons: [{
        id: "0901",
        number: "01",
        title: "เทรดตามเจ้าตลาด",
        duration: "1 ชั่วโมง 35 นาที",
        description: "ปูพื้นฐานการอ่านโครงสร้างตลาด และมองจังหวะ Buy / Sell อย่างเป็นระบบ"
      }]
    });
  } catch (error) { return handleError(res, error); }
};
