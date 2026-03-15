import { createServer } from 'node:http';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { isInteractive } from '../../lib/tty';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export const listenCmd = new Command('listen')
	.description('Start a local webhook listener for development')
	.requiredOption('--forward-url <url>', 'Public URL that forwards to this port (e.g. ngrok URL)')
	.option('--port <n>', 'Local port to listen on', '4400')
	.option('--events <events>', 'Comma-separated events to subscribe to')
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

				try {
					const event = JSON.parse(body) as { type?: string; data?: unknown };

					if (globalOpts.json) {
						console.log(JSON.stringify(event));
					} else {
						const eventType = event.type ?? 'unknown';
						console.log(`  ${pc.dim(timestamp)} ${pc.cyan(eventType)} ${pc.dim(`#${eventCount}`)}`);
						if (event.data) {
							const preview = JSON.stringify(event.data).slice(0, 120);
							console.log(`  ${pc.dim(preview)}${preview.length >= 120 ? '...' : ''}`);
						}
						console.log('');
					}
				} catch {
					if (globalOpts.json) {
						console.log(JSON.stringify({ raw: body }));
					} else {
						console.log(`  ${pc.dim(timestamp)} ${pc.yellow('unparseable')} ${body.slice(0, 100)}`);
						console.log('');
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
				console.log('');
				console.log(`  ${pc.bold('Webhook listener started')}`);
				console.log(`  ${pc.dim('Local:')}       http://localhost:${port}`);
				console.log(`  ${pc.dim('Forward:')}     ${opts.forwardUrl}`);
				console.log(`  ${pc.dim('Webhook ID:')}  ${webhookId}`);
				if (opts.events) {
					console.log(`  ${pc.dim('Events:')}      ${opts.events}`);
				}
				console.log('');
				console.log(`  ${pc.dim('Waiting for events... Press Ctrl+C to stop.')}`);
				console.log('');
			}
		});
	});
