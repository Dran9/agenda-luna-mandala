const crypto = require("node:crypto");

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(padLength)}`;

  return Buffer.from(padded, "base64");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signToken(payload, { secret, now = new Date() } = {}) {
  if (!secret) {
    throw new Error("JWT secret requerido");
  }

  const headerSegment = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();

  return `${headerSegment}.${payloadSegment}.${base64UrlEncode(signature)}`;
}

function verifyToken(token, { secret, now = new Date() } = {}) {
  if (!secret) {
    throw new Error("JWT secret requerido");
  }

  const rawToken = String(token || "").trim();
  const parts = rawToken.split(".");

  if (parts.length !== 3) {
    const error = new Error("TOKEN_FORMAT_INVALID");
    error.code = "TOKEN_FORMAT_INVALID";
    throw error;
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const expectedSignature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(signingInput).digest()
  );

  if (!safeCompare(expectedSignature, signatureSegment)) {
    const error = new Error("TOKEN_SIGNATURE_INVALID");
    error.code = "TOKEN_SIGNATURE_INVALID";
    throw error;
  }

  let header;
  let payload;

  try {
    header = JSON.parse(base64UrlDecode(headerSegment).toString("utf8"));
    payload = JSON.parse(base64UrlDecode(payloadSegment).toString("utf8"));
  } catch {
    const error = new Error("TOKEN_PARSE_ERROR");
    error.code = "TOKEN_PARSE_ERROR";
    throw error;
  }

  if (!header || header.alg !== "HS256" || header.typ !== "JWT") {
    const error = new Error("TOKEN_HEADER_INVALID");
    error.code = "TOKEN_HEADER_INVALID";
    throw error;
  }

  const nowSeconds = Math.floor((now instanceof Date ? now : new Date(now)).getTime() / 1000);

  if (payload.exp && nowSeconds >= Number(payload.exp)) {
    const error = new Error("TOKEN_EXPIRED");
    error.code = "TOKEN_EXPIRED";
    throw error;
  }

  if (payload.nbf && nowSeconds < Number(payload.nbf)) {
    const error = new Error("TOKEN_NOT_ACTIVE");
    error.code = "TOKEN_NOT_ACTIVE";
    throw error;
  }

  return payload;
}

module.exports = {
  signToken,
  verifyToken
};
