'use strict';

const twilio = require('twilio');

/**
 * Twilio webhook signature validation.
 *
 * Twilio signs every webhook with HMAC-SHA1 over the full request URL +
 * sorted form params, using your account's auth token as the secret. We
 * verify the `X-Twilio-Signature` header on each request so a third party
 * can't POST fake call transcripts to our endpoints.
 *
 * This uses the SAME `TWILIO_AUTH_TOKEN` already in your .env — no new
 * credential is required.
 *
 * Usage in server.js:
 *
 *   const { twilioWebhookGuard } = require('./voice');
 *   app.post('/twilio/incoming', twilioWebhookGuard(), incomingHandler);
 *
 * The guard is a no-op when:
 *   - process.env.NODE_ENV === 'test'  (so tests don't need signatures), OR
 *   - process.env.TWILIO_VALIDATE === 'false' (escape hatch for local dev), OR
 *   - TWILIO_AUTH_TOKEN is unset (we warn loudly instead of blocking startup).
 */

/**
 * Build the absolute URL Twilio used to call us. Twilio signs against the
 * exact public URL, so behind ngrok / a proxy we need to honour
 * X-Forwarded-Proto and X-Forwarded-Host.
 */
function reconstructPublicUrl(req) {
  const proto =
    req.headers['x-forwarded-proto'] ||
    req.protocol ||
    'https';
  const host =
    req.headers['x-forwarded-host'] ||
    req.headers['host'];
  return `${proto}://${host}${req.originalUrl || req.url}`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.authToken] - Override TWILIO_AUTH_TOKEN (mostly for tests)
 * @returns {Function} Express middleware
 */
function twilioWebhookGuard(opts = {}) {
  const explicitToken = opts.authToken;

  return function guard(req, res, next) {
    const authToken = explicitToken || process.env.TWILIO_AUTH_TOKEN;

    if (process.env.NODE_ENV === 'test') return next();
    if (process.env.TWILIO_VALIDATE === 'false') return next();

    if (!authToken) {
      console.warn(
        '[voice/security] TWILIO_AUTH_TOKEN not set — skipping signature check. ' +
          'Do NOT deploy to production in this state.'
      );
      return next();
    }

    const signature = req.headers['x-twilio-signature'];
    if (!signature) {
      return res
        .status(403)
        .send('Missing X-Twilio-Signature header');
    }

    const url = reconstructPublicUrl(req);
    const params = req.body || {};

    const ok = twilio.validateRequest(authToken, signature, url, params);
    if (!ok) {
      return res.status(403).send('Invalid Twilio signature');
    }
    return next();
  };
}

module.exports = {
  twilioWebhookGuard,
  reconstructPublicUrl,
};
