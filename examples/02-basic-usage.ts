/**
 * Basic usage - simplest possible webhook send
 */

import { Webhook } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Send a simple text message
async function _sendSimpleMessage() {
	const webhook = new Webhook(WEBHOOK_URL)

	const message = await webhook.send('Hello from ez-hook!')
	console.log('Message sent:', message.id)
}

// Example 2: Send with username and avatar override
async function _sendWithOverrides() {
	const webhook = new Webhook(WEBHOOK_URL)

	webhook
		.setUsername('Custom Bot Name')
		.setAvatarUrl('https://example.com/avatar.png')
		.setContent('This message appears from a custom bot!')

	await webhook.send()
}

// Example 3: Send with text-to-speech
async function _sendWithTTS() {
	const webhook = new Webhook(WEBHOOK_URL)

	webhook.setTTS(true).setContent('This will be read aloud!')

	await webhook.send()
}

// Example 4: Check if webhook is valid before sending
async function _validateBeforeSend() {
	const webhook = new Webhook(WEBHOOK_URL)

	const isValid = await webhook.isValid()
	if (!isValid) {
		console.error('Webhook URL is invalid!')
		return
	}

	webhook.setContent('Webhook validated successfully!')
	await webhook.send()
}

// Example 5: Method chaining
async function _methodChaining() {
	await new Webhook(WEBHOOK_URL)
		.setUsername('Chained Bot')
		.setContent('Sent using method chaining!')
		.send()
}
