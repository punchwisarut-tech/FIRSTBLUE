const { handleError, requireAdmin, sendJson, supabaseAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { password, confirmation } = req.body || {};
    requireAdmin(password);
    if (confirmation !== "DELETE_ALL_CODES") {
      return sendJson(res, 400, { error: "Missing deletion confirmation" });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("download_codes")
      .delete()
      .not("code", "is", null)
      .select("code");

    if (error) throw error;
    return sendJson(res, 200, { deletedCount: (data || []).length });
  } catch (error) {
    return handleError(res, error);
  }
};
