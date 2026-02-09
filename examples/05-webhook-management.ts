/**
 * Webhook management - get and modify webhook settings
 */

import { Webhook, WebhookError, WebhookNotFoundError } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Get webhook information
async function _getWebhookInfo() {
	const webhook = new Webhook(WEBHOOK_URL)

	try {
		const info = await webhook.get()
		console.log('Webhook info:', info)
	} catch (error) {
		if (error instanceof WebhookNotFoundError) {
			console.error('Webhook not found - it may have been deleted')
		} else if (error instanceof WebhookError) {
			console.error(`Error: ${error.message} (Status: ${error.statusCode})`)
		}
	}
}

// Example 2: Modify webhook settings
async function _modifyWebhook() {
	const webhook = new Webhook(WEBHOOK_URL)

	try {
		const result = await webhook.modify({
			name: 'Updated Bot Name',
			avatar: 'data:image/png;base64,...'
		})
		console.log('Webhook updated:', result)
	} catch (error) {
		console.error('Failed to modify webhook:', error)
	}
}

// Example 3: Validate webhook before operations
async function _validateAndOperate() {
	const webhook = new Webhook(WEBHOOK_URL)

	const isValid = await webhook.isValid()

	if (!isValid) {
		console.error('Invalid webhook URL!')
		return
	}

	const info = await webhook.get()
	console.log(`Connected to webhook: ${JSON.stringify(info)}`)

	webhook.setContent('Validation successful!')
	await webhook.send()
}

// Example 4: Check retry configuration
function _checkRetryConfig() {
	const webhook = new Webhook(WEBHOOK_URL, {
		maxRetries: 5,
		baseDelay: 1000,
		maxDelay: 30000
	})

	const config = webhook.getRetryConfig()
	console.log('Retry configuration:', config)
}
