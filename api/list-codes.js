const { handleError, requireAdmin, sendJson, supabaseAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    requireAdmin(password);

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("download_codes")
      .select("code, product_name, file_name, created_at, used_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return sendJson(res, 200, {
      codes: (data || []).map((row) => ({
        code: row.code,
        productName: row.product_name,
        fileName: row.file_name,
        createdAt: row.created_at,
        usedAt: row.used_at,
        expiresAt: row.expires_at
      }))
    });
  } catch (error) {
    return handleError(res, error);
  }
};
