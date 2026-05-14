const { handleError, requireAdmin, sendJson, supabaseAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { password, productName } = req.body || {};
    requireAdmin(password);

    const supabase = supabaseAdmin();
    const code = createCode();
    const record = {
      code,
      product_name: productName || "FIRSTBLUE SNR PDF",
      file_path: process.env.PDF_FILE_PATH || "firstblue-snr.pdf",
      file_name: process.env.PDF_FILE_NAME || "FIRSTBLUE SNR 169.-.pdf"
    };

    const { data, error } = await supabase
      .from("download_codes")
      .insert(record)
      .select("code, product_name, file_name, created_at, used_at")
      .single();

    if (error) throw error;

    return sendJson(res, 200, formatCode(data));
  } catch (error) {
    return handleError(res, error);
  }
};

function createCode() {
  const first = Math.random().toString(36).slice(2, 8).toUpperCase();
  const second = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FB-${first}-${second}`;
}

function formatCode(row) {
  return {
    code: row.code,
    productName: row.product_name,
    fileName: row.file_name,
    createdAt: row.created_at,
    usedAt: row.used_at
  };
}
