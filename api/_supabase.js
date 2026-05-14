const { createClient } = require("@supabase/supabase-js");

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

function requireAdmin(password) {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("Missing ADMIN_PASSWORD");
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    const error = new Error("รหัสผ่านแอดมินไม่ถูกต้อง");
    error.statusCode = 401;
    throw error;
  }
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(body);
}

function handleError(res, error) {
  const status = error.statusCode || 500;
  sendJson(res, status, { error: error.message || "Server error" });
}

module.exports = {
  handleError,
  requireAdmin,
  sendJson,
  supabaseAdmin
};
