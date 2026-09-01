const { handleError, sendJson, supabaseAdmin } = require("./_supabase");
const { sign } = require("./_course-token");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  try {
    const code = String((req.body || {}).code || "").trim().toUpperCase();
    if (!code) return sendJson(res, 400, { error: "กรุณากรอกรหัสเข้าเรียน" });
    const { data, error } = await supabaseAdmin().from("download_codes")
      .select("code, product_name, file_path, expires_at")
      .eq("code", code).eq("file_path", "course:firstblue-trading").maybeSingle();
    if (error) throw error;
    if (!data) return sendJson(res, 401, { error: "รหัสไม่ถูกต้อง หรือไม่ใช่รหัสคอร์ส" });
    const expiresAt = new Date(data.expires_at).getTime();
    if (!expiresAt || Date.now() >= expiresAt) return sendJson(res, 401, { error: "รหัสนี้หมดอายุแล้ว" });
    const token = sign({ course: "firstblue-trading", code: data.code, exp: expiresAt });
    return sendJson(res, 200, { token, expiresAt: data.expires_at });
  } catch (error) { return handleError(res, error); }
};
