/**
 * Enhanced usage examples demonstrating new features
 */

import {
	Embed,
	RateLimitError,
	ValidationError,
	Webhook,
	WebhookError
} from '../src/index'

// Example 1: Enhanced error handling
async function _exampleWithErrorHandling() {
	const webhook = new Webhook(
		'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
	)

	try {
		// This will throw a ValidationError
		webhook.setContent('a'.repeat(2001))
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Validation failed: ${error.message}`)
			console.log(`Field: ${error.field}`)
			console.log(
				`Max length: ${error.maxLength}, Actual: ${error.actualLength}`
			)
		}
	}

	try {
		const result = await webhook.send()
		console.log('Webhook sent successfully:', result)
	} catch (error) {
		if (error instanceof RateLimitError) {
			console.log(`Rate limited! Retry after: ${error.retryAfter}ms`)
		} else if (error instanceof WebhookError) {
			console.log(
				`Webhook error: ${error.message} (Status: ${error.statusCode})`
			)
		}
	}
}

// Example 2: Building complex embeds with validation
async function _exampleComplexEmbed() {
	const webhook = new Webhook(
		'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
	)

	const embed = new Embed()
		.setTitle('Server Status Update')
		.setDescription('All systems operational')
		.setColor('#00FF00')
		.setAuthor({
			name: 'System Monitor',
			url: 'https://status.example.com',
			icon_url: 'https://example.com/icon.png'
		})
		.addField('CPU Usage', '45%', true)
		.addField('Memory Usage', '67%', true)
		.addField('Disk Usage', '23%', true)
		.addField('Network Status', '✅ Online', false)
		.setFooter({
			text: 'Last updated',
			icon_url: 'https://example.com/footer-icon.png'
		})
		.setTimestamp()

	webhook.addEmbed(embed)

	try {
		const success = await webhook.send()
		if (success) {
			console.log('Status update sent successfully!')
		} else {
			console.log('Failed to send status update')
		}
	} catch (error) {
		console.error('Unexpected error:', error)
	}
}

// Example 3: Retry configuration with custom settings
async function _exampleWithRetryConfig() {
	const webhook = new Webhook(
		'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
		{
			maxRetries: 5,
			baseDelay: 500,
			maxDelay: 30000
		}
	)

	webhook.setContent('Message with custom retry configuration')

	try {
		const result = await webhook.send()
		console.log('Message sent with custom retry config:', result)
	} catch (error) {
		console.error('Failed after all retries:', error)
	}
}

// Run examples (uncomment to test)
// exampleWithErrorHandling()
// exampleComplexEmbed()
// exampleWithRetryConfig()
