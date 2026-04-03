import { createServer } from 'node:http';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { isInteractive } from '../../lib/tty';
import { verifyWebhookSignature } from '../../lib/webhook-verify';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export const listenCmd = new Command('listen')
	.description('Start a local webhook listener for development')
	.requiredOption('--forward-url <url>', 'Public URL that forwards to this port (e.g. ngrok URL)')
	.option('--port <n>', 'Local port to listen on', '4400')
	.option('--events <events>', 'Comma-separated events to subscribe to')
	.option('--secret <secret>', 'Webhook signing secret for signature verification')
	.option('--no-verify', 'Skip signature verification')
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'Starts a local HTTP server, creates a temporary webhook, and displays events.\n' +
				'  Requires a tunnel (ngrok, cloudflared, etc.) to make localhost reachable.\n' +
				'  The webhook is automatically deleted when you press Ctrl+C.',
			examples: [
				'cynco webhooks listen --forward-url https://abc123.ngrok-free.app',
				'cynco webhooks listen --forward-url https://abc123.ngrok-free.app --port 8080',
				'cynco webhooks listen --forward-url https://tunnel.example.com --events "invoice.paid,payment.received"',
				'cynco webhooks listen --forward-url https://abc123.ngrok-free.app --secret whsec_abc123',
				'cynco webhooks listen --forward-url https://abc123.ngrok-free.app --no-verify',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const port = parseInt(opts.port, 10);

		if (Number.isNaN(port) || port < 1 || port > 65535) {
			outputError(
				{ message: `Invalid port "${opts.port}". Must be 1-65535.`, code: 'invalid_port' },
				{ json: globalOpts.json },
			);
		}

		const client = requireClient(globalOpts);
		let webhookId: string | null = null;

		// Create the temporary webhook
		const webhookBody: Record<string, unknown> = {
			url: opts.forwardUrl,
			active: true,
		};
		if (opts.events) {
			webhookBody.events = opts.events.split(',').map((e) => e.trim());
		}

		const createResult = await client.post<{ id: string }>('/webhooks', webhookBody);
		if (createResult.error || !createResult.data) {
			outputError(
				{
					message: createResult.error?.message ?? 'Failed to create webhook',
					code: 'webhook_create_error',
				},
				{ json: globalOpts.json },
			);
		}

		webhookId = createResult.data.id;

		// Cleanup function
		const cleanup = async () => {
			if (webhookId) {
				const id = webhookId;
				webhookId = null;
				if (isInteractive()) {
					process.stderr.write(`\n  ${pc.dim('Cleaning up webhook')} ${id}${pc.dim('...')}`);
				}
				try {
					await client.delete(`/webhooks/${id}`);
					if (isInteractive()) {
						process.stderr.write(` ${pc.green('done')}\n\n`);
					}
				} catch {
					process.stderr.write(
						isInteractive()
							? ` ${pc.yellow('failed')} — delete manually: cynco webhooks delete ${id}\n\n`
							: `Orphaned webhook: ${id}\n`,
					);
				}
			}
			server.close();
			process.exit(0);
		};

		process.on('SIGINT', () => void cleanup());
		process.on('SIGTERM', () => void cleanup());

		let eventCount = 0;

		// Start local HTTP server
		const server = createServer((req, res) => {
			if (req.method !== 'POST') {
				res.writeHead(405).end();
				return;
			}

			let totalSize = 0;
			const chunks: Buffer[] = [];

			req.on('data', (chunk: Buffer) => {
				totalSize += chunk.length;
				if (totalSize > MAX_BODY_BYTES) {
					res.writeHead(413).end();
					req.destroy();
					return;
				}
				chunks.push(chunk);
			});

			req.on('error', () => {
				res.end();
			});

			req.on('end', () => {
				if (totalSize > MAX_BODY_BYTES) return;
				res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');

				const body = Buffer.concat(chunks).toString('utf-8');
				eventCount++;
				const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

				// Signature verification
				let sigStatus: 'valid' | 'invalid' | 'none' = 'none';
				const signature = req.headers['cynco-signature'] as string | undefined;

				if (opts.secret && opts.verify !== false) {
					if (signature) {
						sigStatus = verifyWebhookSignature(body, signature, opts.secret) ? 'valid' : 'invalid';
					} else {
						sigStatus = 'invalid';
					}
				}

				const sigBadge =
					sigStatus === 'valid'
						? pc.green('\u2713')
						: sigStatus === 'invalid'
							? pc.yellow('\u2717 sig')
							: '';

				try {
					const event = JSON.parse(body) as { type?: string; data?: unknown };

					if (globalOpts.json) {
						const output: Record<string, unknown> = { ...event };
						if (sigStatus !== 'none') {
							output.signatureVerified = sigStatus === 'valid';
						}
						console.log(JSON.stringify(output));
					} else {
						const eventType = event.type ?? 'unknown';
						const badge = sigBadge ? ` ${sigBadge}` : '';
						process.stderr.write(
							`  ${pc.dim(timestamp)} ${pc.cyan(eventType)} ${pc.dim(`#${eventCount}`)}${badge}\n`,
						);
						if (event.data) {
							const preview = JSON.stringify(event.data).slice(0, 120);
							process.stderr.write(`  ${pc.dim(preview)}${preview.length >= 120 ? '...' : ''}\n`);
						}
						process.stderr.write('\n');
					}
				} catch {
					if (globalOpts.json) {
						console.log(JSON.stringify({ raw: body }));
					} else {
						process.stderr.write(
							`  ${pc.dim(timestamp)} ${pc.yellow('unparseable')} ${body.slice(0, 100)}\n`,
						);
						process.stderr.write('\n');
					}
				}
			});
		});

		server.on('error', (err: NodeJS.ErrnoException) => {
			if (err.code === 'EADDRINUSE') {
				process.stderr.write(`\n  ${pc.red(`Port ${port} is already in use.`)}\n\n`);
			} else {
				process.stderr.write(`\n  ${pc.red(`Server error: ${err.message}`)}\n\n`);
			}
			void cleanup();
		});

		server.listen(port, () => {
			if (isInteractive()) {
				process.stderr.write('\n');
				process.stderr.write(`  ${pc.bold('Webhook listener started')}\n`);
				process.stderr.write(`  ${pc.dim('Local:')}       http://localhost:${port}\n`);
				process.stderr.write(`  ${pc.dim('Forward:')}     ${opts.forwardUrl}\n`);
				process.stderr.write(`  ${pc.dim('Webhook ID:')}  ${webhookId}\n`);
				if (opts.events) {
					process.stderr.write(`  ${pc.dim('Events:')}      ${opts.events}\n`);
				}
				if (opts.secret) {
					process.stderr.write(`  ${pc.dim('Signature:')}   ${pc.green('verification enabled')}\n`);
				} else if (opts.verify !== false) {
					process.stderr.write(
						`  ${pc.dim('Signature:')}   ${pc.yellow('not verified')} — add --secret to verify\n`,
					);
				}
				process.stderr.write('\n');
				process.stderr.write(`  ${pc.dim('Waiting for events... Press Ctrl+C to stop.')}\n`);
				process.stderr.write('\n');
			}
		});
	});
