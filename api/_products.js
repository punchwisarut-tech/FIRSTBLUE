const PRODUCTS = {
  snr: {
    key: "snr",
    productName: "FIRSTBLUE SNR PDF",
    fileName: "FIRSTBLUE SNR 169.-.pdf",
    filePath: "firstblue-snr.pdf"
  },
  bluefang: {
    key: "bluefang",
    productName: "BLUEFANG XAUUSD M3",
    fileName: "XAUUSD_M3_FIRSTBLUE.pdf",
    filePath: "products/bluefang-xauusd-m3.pdf",
    bundledUrl: "/assets/XAUUSD_M3_FIRSTBLUE.pdf"
  }
};

function getProduct(productKey) {
  return PRODUCTS[productKey] || PRODUCTS.snr;
}

async function ensureProductFile(supabase, product, req) {
  if (!product.bundledUrl) return;
  const bucket = process.env.SUPABASE_BUCKET || "ebooks";
  const folder = product.filePath.split("/").slice(0, -1).join("/");
  const objectName = product.filePath.split("/").pop();
  const { data: existing, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder, { search: objectName, limit: 10 });

  if (listError) throw listError;
  if ((existing || []).some((item) => item.name === objectName)) return;

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const source = await fetch(`${protocol}://${host}${product.bundledUrl}`);
  if (!source.ok) throw new Error(`Bundled PDF not available: ${product.fileName}`);

  const fileBody = await source.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(product.filePath, fileBody, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError && !/already exists/i.test(uploadError.message || "")) {
    throw uploadError;
  }
}

module.exports = { getProduct, ensureProductFile, PRODUCTS };
