import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from '../../src/lib/webhook-verify';

function sign(body: string, secret: string): string {
	return createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature', () => {
	const secret = 'whsec_test_secret_123';
	const body = '{"type":"invoice.paid","data":{"id":"inv_001"}}';

	it('returns true for a valid raw hex signature', () => {
		const sig = sign(body, secret);
		expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
	});

	it('returns true for a valid sha256= prefixed signature', () => {
		const sig = `sha256=${sign(body, secret)}`;
		expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
	});

	it('returns false for an invalid signature', () => {
		const badSig = sign(body, 'wrong_secret');
		expect(verifyWebhookSignature(body, badSig, secret)).toBe(false);
	});

	it('returns false for a tampered body', () => {
		const sig = sign(body, secret);
		const tampered = '{"type":"invoice.paid","data":{"id":"inv_999"}}';
		expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
	});

	it('returns false for a signature with wrong length', () => {
		expect(verifyWebhookSignature(body, 'abc123', secret)).toBe(false);
	});

	it('returns false for an empty signature', () => {
		expect(verifyWebhookSignature(body, '', secret)).toBe(false);
	});

	it('handles empty body', () => {
		const sig = sign('', secret);
		expect(verifyWebhookSignature('', sig, secret)).toBe(true);
	});
});
