const { handleError, requireAdmin, sendJson, supabaseAdmin } = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { password, fileName } = req.body || {};
    requireAdmin(password);

    const safeName = sanitizeFileName(fileName);
    if (!safeName.toLowerCase().endsWith(".pdf")) {
      const error = new Error("รองรับเฉพาะไฟล์ PDF");
      error.statusCode = 400;
      throw error;
    }

    const filePath = `products/${Date.now()}-${safeName}`;
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET || "ebooks")
      .createSignedUploadUrl(filePath);

    if (error) throw error;
    return sendJson(res, 200, {
      filePath,
      fileName: String(fileName || safeName),
      signedUrl: data.signedUrl,
      token: data.token
    });
  } catch (error) {
    return handleError(res, error);
  }
};

function sanitizeFileName(value) {
  const name = String(value || "product.pdf").split(/[\\/]/).pop();
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "") || "product.pdf";
}
