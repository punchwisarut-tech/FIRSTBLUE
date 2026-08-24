const { createClient } = require("@supabase/supabase-js");
const { getProduct, ensureProductFile } = require("./_products");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (req.headers["x-sync-token"] !== "7f7cb791-44c9-46ae-a1f2-3f2c4086aa11") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const product = getProduct("snr");
    await ensureProductFile(supabase, product, req);
    return res.status(200).json({ ok: true, filePath: product.filePath });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Sync failed" });
  }
};
