/**
 * Quick start - the one-call API introduced in 0.5.0
 */

import { Embed, MessageFlags, Webhook, WebhookError } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// One client, configured once, reused everywhere
const hook = new Webhook(WEBHOOK_URL, {
	username: 'Deploy Bot',
	allowedMentions: { parse: [] }, // never ping anyone by accident
	retry: { maxRetries: 5 },
	timeoutMs: 10_000
})

// Example 1: Send a string - returns the created message
async function _sendText() {
	const message = await hook.send('Deploy finished ✅')
	console.log(`Sent message ${message.id}`)
}

// Example 2: Send a full message in one call
async function _sendMessage() {
	await hook.send({
		content: 'Nightly report',
		embeds: [
			new Embed()
				.setTitle('Build #128')
				.setColor('#00ff00')
				.addField('Duration', '4m 12s', true)
				.addField('Tests', '312 passed', true)
				.setTimestamp(),
			// Plain objects work too
			{ title: 'Coverage', description: '91.2%', color: 0x5865f2 }
		],
		files: [{ filename: 'report.json', data: JSON.stringify({ ok: true }) }],
		flags: ['SuppressNotifications']
	})
}

// Example 3: Flags as a bitfield
async function _sendSilently() {
	await hook.send({
		content: 'https://example.com (no link preview, no notification)',
		flags: MessageFlags.SuppressEmbeds | MessageFlags.SuppressNotifications
	})
}

// Example 4: Errors are thrown by default...
async function _handleErrors() {
	try {
		await hook.send('Hello')
	} catch (error) {
		if (error instanceof WebhookError) {
			console.error(
				`Discord said ${error.status} (code ${error.code}): ${error.message}`
			)
		}
		throw error
	}
}

// Example 5: ...or use trySend for a result object
async function _trySend() {
	const result = await hook.trySend('Hello')
	if (!result.ok) {
		console.error('Webhook failed:', result.error.message)
		return
	}
	console.log('Sent', result.data.id)
}
