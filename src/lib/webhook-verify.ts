import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a webhook signature using HMAC-SHA256.
 * Returns true if the signature matches, false otherwise.
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
	const expected = createHmac('sha256', secret).update(body).digest('hex');

	// Support both raw hex and prefixed formats (e.g. "sha256=...")
	const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature;

	// Compare decoded buffers — handles non-hex input gracefully
	const providedBuf = Buffer.from(provided, 'hex');
	const expectedBuf = Buffer.from(expected, 'hex');

	if (providedBuf.length !== expectedBuf.length) {
		return false;
	}

	return timingSafeEqual(providedBuf, expectedBuf);
}
