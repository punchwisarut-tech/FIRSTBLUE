const { handleError, sendJson, supabaseAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code) {
      const error = new Error("กรุณากรอกรหัส");
      error.statusCode = 400;
      throw error;
    }

    const supabase = supabaseAdmin();

    // ดึงข้อมูลก่อน ตรวจว่ารหัสมีอยู่
    const { data: found, error: findError } = await supabase
      .from("download_codes")
      .select("code, product_name, file_path, file_name, used_at, expires_at")
      .eq("code", code)
      .single();

    if (findError || !found) {
      const error = new Error("รหัสนี้ไม่ถูกต้องหรือถูกใช้ไปแล้ว");
      error.statusCode = 404;
      throw error;
    }

    // เช็คว่ารหัสหมดอายุหรือยัง (7 วัน)
    if (found.expires_at && new Date(found.expires_at) < new Date()) {
      const error = new Error("รหัสนี้หมดอายุแล้ว (7 วันหลังสร้าง)");
      error.statusCode = 403;
      throw error;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET || "ebooks")
      .createSignedUrl(found.file_path, 60);

    if (signError) throw signError;

    return sendJson(res, 200, {
      url: signed.signedUrl,
      productName: found.product_name,
      fileName: found.file_name
    });
  } catch (error) {
    return handleError(res, error);
  }
};
