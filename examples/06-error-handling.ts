/**
 * Error handling - comprehensive error handling patterns
 */

import {
	Embed,
	RateLimitError,
	ValidationError,
	Webhook,
	WebhookError,
	WebhookNotFoundError
} from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Handle all error types
async function _comprehensiveErrorHandling() {
	const webhook = new Webhook(WEBHOOK_URL)

	try {
		webhook.setContent('Hello!')
		await webhook.send()
	} catch (error) {
		if (error instanceof ValidationError) {
			console.error(
				`Validation error on field "${error.field}": ${error.message}`
			)
			if (error.maxLength) {
				console.error(`Max: ${error.maxLength}, Actual: ${error.actualLength}`)
			}
		} else if (error instanceof RateLimitError) {
			console.error(`Rate limited! Retry after ${error.retryAfter}ms`)
		} else if (error instanceof WebhookNotFoundError) {
			console.error('Webhook URL is invalid or has been deleted')
		} else if (error instanceof WebhookError) {
			console.error(`HTTP error ${error.statusCode}: ${error.message}`)
		} else {
			throw error
		}
	}
}

// Example 2: Validation errors - content length
function _contentValidation() {
	const webhook = new Webhook(WEBHOOK_URL)

	try {
		webhook.setContent('a'.repeat(2001))
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Field: ${error.field}`)
			console.log(`Max allowed: ${error.maxLength}`)
			console.log(`Your length: ${error.actualLength}`)
		}
	}
}

// Example 3: Validation errors - embed limits
function _embedValidation() {
	const webhook = new Webhook(WEBHOOK_URL)

	try {
		for (let i = 0; i < 11; i++) {
			webhook.addEmbed(new Embed().setTitle(`Embed ${i + 1}`))
		}
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Cannot add more than 10 embeds: ${error.message}`)
		}
	}
}

// Example 4: Validation errors - field limits
function _fieldValidation() {
	const embed = new Embed()

	try {
		for (let i = 0; i < 26; i++) {
			embed.addField(`Field ${i + 1}`, 'value', true)
		}
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Field limit exceeded: ${error.message}`)
		}
	}

	try {
		new Embed().addField('Name', 'x'.repeat(1025))
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Field value too long: ${error.field}`)
		}
	}
}

// Example 5: Rate limit handling with retry
async function _rateLimitWithRetry() {
	const webhook = new Webhook(WEBHOOK_URL)
	webhook.setContent('Message')

	const maxAttempts = 3
	let attempt = 0

	while (attempt < maxAttempts) {
		try {
			await webhook.send()
			console.log('Message sent successfully')
			break
		} catch (error) {
			if (error instanceof RateLimitError && error.retryAfter) {
				attempt++
				console.log(
					`Rate limited, waiting ${error.retryAfter}ms (attempt ${attempt}/${maxAttempts})`
				)
				await new Promise((resolve) => setTimeout(resolve, error.retryAfter))
			} else {
				throw error
			}
		}
	}
}

// Example 6: Graceful degradation
async function _gracefulDegradation() {
	const webhook = new Webhook(WEBHOOK_URL)

	const sendNotification = async (message: string): Promise<boolean> => {
		try {
			webhook.setContent(message)
			await webhook.send()
			return true
		} catch (error) {
			if (error instanceof WebhookNotFoundError) {
				console.warn('Discord webhook unavailable, logging locally instead')
				console.log(`[LOCAL LOG]: ${message}`)
				return false
			}
			if (error instanceof RateLimitError) {
				console.warn('Rate limited, queuing message for later')
				return false
			}
			throw error
		}
	}

	await sendNotification('Important notification!')
}

// Example 7: Validate before send pattern
async function _validateFirst() {
	const webhook = new Webhook(WEBHOOK_URL)

	webhook.setContent('Test message')
	webhook.addEmbed(new Embed().setTitle('Test').setDescription('Description'))

	try {
		webhook.validate()
		await webhook.send()
	} catch (error) {
		if (error instanceof ValidationError) {
			console.error('Payload validation failed:', error.message)
		}
	}
}

// Example 8: Error recovery with fallback content
async function _errorRecoveryWithFallback() {
	const webhook = new Webhook(WEBHOOK_URL)

	const sendWithFallback = async (content: string) => {
		try {
			webhook.setContent(content)
		} catch (error) {
			if (error instanceof ValidationError && error.field === 'content') {
				const truncated = `${content.slice(0, 1997)}...`
				webhook.setContent(truncated)
				console.warn('Content truncated to fit limit')
			} else {
				throw error
			}
		}

		await webhook.send()
	}

	await sendWithFallback('a'.repeat(3000))
}
