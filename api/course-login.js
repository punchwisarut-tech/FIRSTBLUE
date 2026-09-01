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
    if (data.used_at) return sendJson(res, 401, { error: "รหัสนี้เปิดใช้งานกับอุปกรณ์อื่นแล้ว" });
    const { data: activatedRows, error: activateError } = await supabaseAdmin().from("download_codes")
      .update({ used_at: new Date().toISOString() }).eq("code", code).is("used_at", null).select("code");
    if (activateError) throw activateError;
    if (!activatedRows || activatedRows.length !== 1) return sendJson(res, 409, { error: "รหัสนี้ถูกเปิดใช้งานแล้ว" });
    const token = sign({ course: "firstblue-trading", code: data.code, exp: expiresAt });
    return sendJson(res, 200, { token, expiresAt: data.expires_at });
  } catch (error) { return handleError(res, error); }
};
