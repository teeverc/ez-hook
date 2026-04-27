/**
 * File attachments - send text, binary, Blob, and base64 file payloads
 */

import { Webhook } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Send a simple text file
async function _sendTextFile() {
	await new Webhook(WEBHOOK_URL)
		.setContent('Attached a text file.')
		.setFile({
			filename: 'hello.txt',
			data: 'Hello from ez-hook!',
			contentType: 'text/plain'
		})
		.send()
}

// Example 2: Send a JSON Blob
async function _sendBlobFile() {
	const payload = new Blob([JSON.stringify({ ok: true }, null, 2)], {
		type: 'application/json'
	})

	await new Webhook(WEBHOOK_URL)
		.setContent('Attached a JSON report.')
		.setFile({
			filename: 'report.json',
			data: payload
		})
		.send()
}

// Example 3: Send raw bytes from a typed array
async function _sendTypedArrayFile() {
	const bytes = new Uint8Array([0x45, 0x5a, 0x2d, 0x48, 0x4f, 0x4f, 0x4b])

	await new Webhook(WEBHOOK_URL)
		.setContent('Attached raw bytes.')
		.setFile({
			filename: 'payload.bin',
			data: bytes,
			contentType: 'application/octet-stream'
		})
		.send()
}

// Example 4: Send bytes from an ArrayBuffer
async function _sendArrayBufferFile() {
	const bytes = new TextEncoder().encode('ArrayBuffer content')

	await new Webhook(WEBHOOK_URL)
		.setContent('Attached an ArrayBuffer file.')
		.setFile({
			filename: 'buffer.txt',
			data: bytes.buffer,
			contentType: 'text/plain'
		})
		.send()
}

// Example 5: Send base64 content explicitly decoded before upload
async function _sendBase64File() {
	await new Webhook(WEBHOOK_URL)
		.setContent('Attached a base64-decoded text file.')
		.setFile({
			filename: 'decoded.txt',
			data: 'SGVsbG8gZnJvbSBiYXNlNjQh',
			encoding: 'base64',
			contentType: 'text/plain',
			description: 'Decoded from base64 before upload'
		})
		.send()
}
