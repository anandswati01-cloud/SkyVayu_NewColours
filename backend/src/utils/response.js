/** Standardised success response */
function success(res, data, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({ success: true, data, ...meta });
}

/** Standardised error response */
function error(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}

module.exports = { success, error };
