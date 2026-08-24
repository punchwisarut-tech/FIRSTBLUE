const { handleError, requireAdmin, sendJson, supabaseAdmin } = require("./_supabase");
const { ensureProductFile, getProduct } = require("./_products");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { password, productKey } = req.body || {};
    requireAdmin(password);

    const supabase = supabaseAdmin();
    const product = getProduct(productKey);
    await ensureProductFile(supabase, product, req);
    const code = createCode();
    const record = {
      code,
      product_name: product.productName,
      file_path: product.filePath,
      file_name: product.fileName,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const { data, error } = await supabase
      .from("download_codes")
      .insert(record)
      .select("code, product_name, file_name, created_at, used_at, expires_at")
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
    usedAt: row.used_at,
    expiresAt: row.expires_at
  };
}
