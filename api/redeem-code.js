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
    const { data: updated, error: updateError } = await supabase
      .from("download_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
      .is("used_at", null)
      .select("code, product_name, file_path, file_name")
      .single();

    if (updateError || !updated) {
      const error = new Error("รหัสนี้ไม่ถูกต้องหรือถูกใช้ไปแล้ว");
      error.statusCode = 404;
      throw error;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET || "ebooks")
      .createSignedUrl(updated.file_path, 60);

    if (signError) throw signError;

    return sendJson(res, 200, {
      url: signed.signedUrl,
      productName: updated.product_name,
      fileName: updated.file_name
    });
  } catch (error) {
    return handleError(res, error);
  }
};
