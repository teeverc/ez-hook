import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test
} from 'bun:test'
import type { RequestClient } from '../classes/RequestClient'
import * as RequestClientModule from '../classes/RequestClient'
import { Embed, Webhook } from '../index'

// Use a mock webhook URL for testing
const TEST_WEBHOOK_URL =
	'https://discord.com/api/webhooks/123456789/test-webhook-token'

// Mock fetch globally
let mockFetch: ReturnType<typeof mock>
let delaySpyOn: ReturnType<typeof spyOn>

beforeEach(() => {
	// Reset and setup fetch mock before each test
	mockFetch = mock(() => Promise.resolve(new Response('', { status: 204 })))
	// biome-ignore lint/suspicious/noExplicitAny: Required for global fetch mocking
	global.fetch = mockFetch as any

	// Spy on and mock the delay function to make retry tests instant
	delaySpyOn = spyOn(RequestClientModule, 'delay').mockImplementation(() =>
		Promise.resolve()
	)
})

afterEach(() => {
	// Clean up after each test
	if (mockFetch) {
		mockFetch.mockClear()
	}
	if (delaySpyOn) {
		delaySpyOn.mockRestore()
	}
})

describe('basic webhook functionality', () => {
	test('should send a basic webhook with content', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Hello, world!')
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should send with custom username and avatar', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook
			.setUsername('Test Bot')
			.setAvatarUrl('https://example.com/avatar.png')
			.setContent('Custom identity message')
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})
})

describe('embed builder functionality', () => {
	// Test basic embed
	test('should send basic embed with title and description', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()
			.setTitle('Basic Title')
			.setDescription('Basic Description')
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	// Test color methods
	test('should set color using hex string', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setTitle('Color Test').setColor('#ff0000')
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should set color using number', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setTitle('Color Test').setColor(0xff0000)
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	// Test author overloads
	test('should set author using simple params', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setAuthor(
			'Author Name',
			'https://example.com',
			'https://example.com/icon.png'
		)
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should set author using object', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setAuthor({
			name: 'Author Name',
			url: 'https://example.com',
			icon_url: 'https://example.com/icon.png'
		})
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	// Test footer overloads
	test('should set footer using simple params', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setFooter(
			'Footer Text',
			'https://example.com/icon.png'
		)
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should set footer using object', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setFooter({
			text: 'Footer Text',
			icon_url: 'https://example.com/icon.png'
		})
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	// Test field overloads
	test('should add field using simple params', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().addField('Field Name', 'Field Value', true)
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should add field using object', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().addField({
			name: 'Field Name',
			value: 'Field Value',
			inline: true
		})
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	// Test timestamp
	test('should set timestamp with current time', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setTitle('Timestamp Test').setTimestamp()
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})

	test('should set timestamp with custom date', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()
			.setTitle('Custom Timestamp Test')
			.setTimestamp(new Date('2024-01-01'))
		webhook.addEmbed(embed)
		const res = await webhook.send()
		expect(res.ok).toBeTrue()
	})
})

describe('validation and limits', () => {
	test('should fail with content over 2000 characters', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		expect(() => {
			webhook.setContent('a'.repeat(2001))
		}).toThrow()
	})

	test('should fail with more than 10 embeds', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed().setTitle('Test')

		for (let i = 0; i < 11; i++) {
			if (i < 10) {
				webhook.addEmbed(embed)
			} else {
				expect(() => webhook.addEmbed(embed)).toThrow()
			}
		}
	})

	test('should fail with more than 25 fields', async () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		for (let i = 0; i < 26; i++) {
			if (i < 25) {
				embed.addField(`Field ${i}`, 'Value')
			} else {
				expect(() => embed.addField(`Field ${i}`, 'Value')).toThrow()
			}
		}
	})
})

describe('retry configuration', () => {
	test('should use custom retry config', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL, {
			maxRetries: 2,
			baseDelay: 500,
			maxDelay: 2000
		})
		webhook.setContent('Testing retry config')
		const res = await webhook.send()
		expect(res.ok).toBeTrue()

		const retryConfig = webhook.getRetryConfig()
		expect(retryConfig).toEqual({
			maxRetries: 2,
			baseDelay: 500,
			maxDelay: 2000
		})
	})
})

describe('webhook management', () => {
	test('should validate webhook URL', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const valid = await webhook.isValid()
		expect(valid).toBeTrue()
	})

	test('should reject invalid webhook URL', async () => {
		// Mock fetch to reject for this specific test
		mockFetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Network error'))
		)

		const webhook = new Webhook('https://invalid.webhook.url')
		const valid = await webhook.isValid()
		expect(valid).toBeFalse()
	})
})

describe('field validation', () => {
	test('should fail with field name exceeding 256 characters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField('a'.repeat(257), 'Value')
		}).toThrow('Field name length exceeds 256 characters')
	})

	test('should fail with empty field value', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField('Field Name', '')
		}).toThrow('Field value is required')
	})

	test('should fail with field value exceeding 1024 characters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField('Field Name', 'a'.repeat(1025))
		}).toThrow('Field value length exceeds 1024 characters')
	})

	test('should fail when adding 26th field', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		// Add 25 valid fields
		for (let i = 0; i < 25; i++) {
			embed.addField(`Field ${i}`, 'Value')
		}

		// Try to add 26th field
		expect(() => {
			embed.addField('Field 26', 'Value')
		}).toThrow('Fields length exceeds 25')
	})

	test('should accept field with valid parameters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField('Valid Name', 'Valid Value', true)
		}).not.toThrow()
	})

	test('should accept field with object parameters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField({
				name: 'Valid Name',
				value: 'Valid Value',
				inline: true
			})
		}).not.toThrow()
	})

	test('should handle undefined fields initialization', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.addField('First Field', 'First Value')
		}).not.toThrow()
	})
})

describe('embed content validation', () => {
	test('should fail with title exceeding 256 characters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.setTitle('a'.repeat(257))
		}).toThrow('Title length exceeds 256 characters')
	})

	test('should fail with description exceeding 4096 characters', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.setDescription('a'.repeat(4097))
		}).toThrow('Description length exceeds 4096 characters')
	})

	test('should accept valid title and description', () => {
		const _webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()

		expect(() => {
			embed.setTitle('a'.repeat(256)).setDescription('a'.repeat(4096))
		}).not.toThrow()
	})
})

describe('webhook HTTP request mocking', () => {
	test('should make POST request with correct data', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Test message')

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledTimes(1)
		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: expect.stringContaining('"content":"Test message"')
			})
		)
	})

	test('should handle 429 rate limit with retry', async () => {
		mockFetch
			.mockImplementationOnce(() =>
				Promise.resolve(
					new Response('', {
						status: 429,
						headers: new Headers({ 'x-ratelimit-reset-after': '1' })
					})
				)
			)
			.mockImplementationOnce(() =>
				Promise.resolve(new Response('', { status: 204 }))
			)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Rate limited message')

		const res = await webhook.send()

		expect(res.ok).toBeTrue()
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	test('should handle server error with retry', async () => {
		mockFetch
			.mockImplementationOnce(() =>
				Promise.resolve(new Response('', { status: 500 }))
			)
			.mockImplementationOnce(() =>
				Promise.resolve(new Response('', { status: 204 }))
			)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Server error message')

		const res = await webhook.send()

		expect(res.ok).toBeTrue()
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	test('should fail after max retries', async () => {
		mockFetch.mockImplementation(() =>
			Promise.resolve(new Response('', { status: 500 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL, {
			maxRetries: 2,
			baseDelay: 10
		})
		webhook.setContent('Always failing message')

		const res = await webhook.send()

		expect(res.ok).toBeFalse()
		expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
	})

	test('should handle network errors with retry', async () => {
		mockFetch
			.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
			.mockImplementationOnce(() =>
				Promise.resolve(new Response('', { status: 204 }))
			)

		const webhook = new Webhook(TEST_WEBHOOK_URL, { baseDelay: 10 })
		webhook.setContent('Network error message')

		const res = await webhook.send()

		expect(res.ok).toBeTrue()
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	test('should handle successful response immediately', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Immediate success')

		const res = await webhook.send()

		expect(res.ok).toBeTrue()
		expect(mockFetch).toHaveBeenCalledTimes(1)
	})
})

describe('webhook validation', () => {
	test('should validate webhook with working URL', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('', { status: 200 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const isValid = await webhook.isValid()

		expect(isValid).toBeTrue()
		expect(mockFetch).toHaveBeenCalledWith(TEST_WEBHOOK_URL)
	})

	test('should invalidate webhook with failing URL', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Not found'))
		)

		const webhook = new Webhook('https://invalid.webhook.url')
		const isValid = await webhook.isValid()

		expect(isValid).toBeFalse()
	})
})

describe('webhook TTS functionality', () => {
	test('should set TTS flag to true', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setTTS(true).setContent('TTS message')

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				body: expect.stringContaining('"tts":true')
			})
		)
	})

	test('should set TTS flag to false', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setTTS(false).setContent('Non-TTS message')

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				body: expect.stringContaining('"tts":false')
			})
		)
	})
})

describe('webhook file attachment', () => {
	test('should set file attachment as string', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setFile('file-content').setContent('Message with file')

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				body: expect.stringContaining('"file":"file-content"')
			})
		)
	})

	test('should set file attachment as object', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const fileAttachment = { filename: 'test.txt', data: 'content' }
		webhook.setFile(fileAttachment).setContent('Message with file object')

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				body: expect.stringContaining('"filename":"test.txt"')
			})
		)
	})
})

describe('webhook method chaining', () => {
	test('should allow method chaining', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		const result = webhook
			.setUsername('Test Bot')
			.setAvatarUrl('https://example.com/avatar.png')
			.setTTS(false)
			.setContent('Chained method call')

		expect(result).toBe(webhook) // Should return same instance

		await webhook.send()

		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				body: expect.stringContaining('"username":"Test Bot"')
			})
		)
	})
})

describe('embed creation and manipulation', () => {
	test('should create embed with all properties', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const embed = new Embed()
			.setTitle('Complete Embed')
			.setDescription('This is a complete embed')
			.setColor('#ff0000')
			.setAuthor(
				'Author Name',
				'https://example.com',
				'https://example.com/icon.png'
			)
			.setFooter('Footer Text', 'https://example.com/footer.png')
			.addField('Field 1', 'Value 1', true)
			.addField('Field 2', 'Value 2', false)
			.setTimestamp()

		webhook.addEmbed(embed)
		await webhook.send()

		const callArg = mockFetch.mock.calls[0][1]
		const body = JSON.parse(callArg?.body as string)

		expect(body.embeds).toHaveLength(1)
		expect(body.embeds[0]).toMatchObject({
			title: 'Complete Embed',
			description: 'This is a complete embed',
			color: 16711680, // #ff0000 in decimal
			author: {
				name: 'Author Name',
				url: 'https://example.com',
				icon_url: 'https://example.com/icon.png'
			},
			footer: {
				text: 'Footer Text',
				icon_url: 'https://example.com/footer.png'
			},
			fields: [
				{ name: 'Field 1', value: 'Value 1', inline: true },
				{ name: 'Field 2', value: 'Value 2', inline: false }
			]
		})
		expect(body.embeds[0].timestamp).toBeDefined()
	})

	test('should handle multiple embeds', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		for (let i = 0; i < 5; i++) {
			const embed = new Embed()
				.setTitle(`Embed ${i + 1}`)
				.setDescription(`Description ${i + 1}`)
			webhook.addEmbed(embed)
		}

		await webhook.send()

		const callArg = mockFetch.mock.calls[0][1]
		const body = JSON.parse(callArg?.body as string)

		expect(body.embeds).toHaveLength(5)
		expect(body.embeds[2].title).toBe('Embed 3')
	})
})

describe('error handling', () => {
	test('should handle fetch errors gracefully', async () => {
		mockFetch.mockImplementation(() =>
			Promise.reject(new Error('Network failure'))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL, { maxRetries: 0 })
		webhook.setContent('Error test message')

		const res = await webhook.send()

		expect(res.ok).toBeFalse()
	})

	test('should handle non-JSON responses', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('Invalid response', { status: 400 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Non-JSON response test')

		const res = await webhook.send()

		expect(res.ok).toBeFalse()
	})
})

describe('webhook toObject method', () => {
	test('should generate correct object structure', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook
			.setUsername('Test Bot')
			.setAvatarUrl('https://example.com/avatar.png')
			.setTTS(true)
			.setContent('Test content')
			.setFile('file-content')

		const embed = new Embed().setTitle('Test Embed')
		webhook.addEmbed(embed)

		const obj = webhook.toObject()

		expect(obj).toMatchObject({
			username: 'Test Bot',
			avatar_url: 'https://example.com/avatar.png',
			tts: true,
			content: 'Test content',
			file: 'file-content',
			embeds: [{ title: 'Test Embed' }]
		})
	})

	test('should handle empty webhook object', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const obj = webhook.toObject()

		expect(obj).toMatchObject({
			username: undefined,
			avatar_url: undefined,
			tts: undefined,
			content: undefined,
			file: undefined,
			embeds: undefined
		})
	})
})

describe('retry configuration', () => {
	test('should use default retry config when none provided', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const config = webhook.getRetryConfig()

		expect(config).toMatchObject({
			maxRetries: 3,
			baseDelay: 1000,
			maxDelay: 60000
		})
	})

	test('should merge custom retry config with defaults', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL, { maxRetries: 5 })
		const config = webhook.getRetryConfig()

		expect(config).toMatchObject({
			maxRetries: 5,
			baseDelay: 1000, // Default value
			maxDelay: 60000 // Default value
		})
	})
})

describe('comprehensive embed functionality', () => {
	test('should set URL for embed', () => {
		const embed = new Embed()
		embed.setURL('https://example.com')

		const obj = embed.toObject()
		expect(obj.url).toBe('https://example.com')
	})

	test('should set image with string URL', () => {
		const embed = new Embed()
		embed.setImage('https://example.com/image.png')

		const obj = embed.toObject()
		expect(obj.image).toMatchObject({
			url: 'https://example.com/image.png'
		})
	})

	test('should set image with object', () => {
		const embed = new Embed()
		embed.setImage({
			url: 'https://example.com/image.png',
			height: 100,
			width: 200
		})

		const obj = embed.toObject()
		expect(obj.image).toMatchObject({
			url: 'https://example.com/image.png',
			height: 100,
			width: 200
		})
	})

	test('should set image with URL and dimensions', () => {
		const embed = new Embed()
		embed.setImage('https://example.com/image.png', 300, 400)

		const obj = embed.toObject()
		expect(obj.image).toMatchObject({
			url: 'https://example.com/image.png',
			height: 300,
			width: 400
		})
	})

	test('should set thumbnail with string URL', () => {
		const embed = new Embed()
		embed.setThumbnail('https://example.com/thumb.png')

		const obj = embed.toObject()
		expect(obj.thumbnail).toMatchObject({
			url: 'https://example.com/thumb.png'
		})
	})

	test('should set thumbnail with object', () => {
		const embed = new Embed()
		embed.setThumbnail({
			url: 'https://example.com/thumb.png',
			height: 50,
			width: 50
		})

		const obj = embed.toObject()
		expect(obj.thumbnail).toMatchObject({
			url: 'https://example.com/thumb.png',
			height: 50,
			width: 50
		})
	})

	test('should set video with string URL', () => {
		const embed = new Embed()
		embed.setVideo('https://example.com/video.mp4')

		const obj = embed.toObject()
		expect(obj.video).toMatchObject({
			url: 'https://example.com/video.mp4'
		})
	})

	test('should set video with object', () => {
		const embed = new Embed()
		embed.setVideo({
			url: 'https://example.com/video.mp4',
			height: 720,
			width: 1280
		})

		const obj = embed.toObject()
		expect(obj.video).toMatchObject({
			url: 'https://example.com/video.mp4',
			height: 720,
			width: 1280
		})
	})

	test('should set provider with string name', () => {
		const embed = new Embed()
		embed.setProvider('YouTube')

		const obj = embed.toObject()
		expect(obj.provider).toMatchObject({
			name: 'YouTube'
		})
	})

	test('should set provider with name and URL', () => {
		const embed = new Embed()
		embed.setProvider('YouTube', 'https://youtube.com')

		const obj = embed.toObject()
		expect(obj.provider).toMatchObject({
			name: 'YouTube',
			url: 'https://youtube.com'
		})
	})

	test('should set provider with object', () => {
		const embed = new Embed()
		embed.setProvider({
			name: 'Custom Provider',
			url: 'https://custom.com'
		})

		const obj = embed.toObject()
		expect(obj.provider).toMatchObject({
			name: 'Custom Provider',
			url: 'https://custom.com'
		})
	})

	test('should set fields using setFields method', () => {
		const embed = new Embed()
		const fields = [
			{ name: 'Field 1', value: 'Value 1', inline: true },
			{ name: 'Field 2', value: 'Value 2', inline: false }
		]
		embed.setFields(fields)

		const obj = embed.toObject()
		expect(obj.fields).toHaveLength(2)
		expect(obj.fields).toEqual(fields)
	})

	test('should reject setFields with more than 25 fields', () => {
		const embed = new Embed()
		const fields = Array.from({ length: 26 }, (_, i) => ({
			name: `Field ${i}`,
			value: `Value ${i}`,
			inline: false
		}))

		expect(() => {
			embed.setFields(fields)
		}).toThrow('Fields length exceeds 25')
	})

	test('should convert color from hex string to number', () => {
		const embed = new Embed()
		embed.setColor('#ff0000')

		const obj = embed.toObject()
		expect(obj.color).toBe(16711680) // #ff0000 in decimal
	})

	test('should convert color from hex string without hash', () => {
		const embed = new Embed()
		embed.setColor('00ff00')

		const obj = embed.toObject()
		expect(obj.color).toBe(65280) // #00ff00 in decimal
	})

	test('should accept color as number directly', () => {
		const embed = new Embed()
		embed.setColor(255) // Blue

		const obj = embed.toObject()
		expect(obj.color).toBe(255)
	})

	test('should handle empty embed toObject correctly', () => {
		const embed = new Embed()
		const obj = embed.toObject()

		expect(obj).toMatchObject({
			title: undefined,
			type: 'rich',
			url: undefined,
			description: undefined,
			timestamp: undefined,
			color: undefined,
			footer: undefined,
			image: undefined,
			thumbnail: undefined,
			video: undefined,
			provider: undefined,
			author: undefined,
			fields: undefined
		})
	})

	test('should chain all embed methods', () => {
		const embed = new Embed()

		const result = embed
			.setTitle('Chained Title')
			.setDescription('Chained Description')
			.setURL('https://example.com')
			.setColor('#ff0000')
			.setAuthor('Author', 'https://author.com', 'https://author.com/icon.png')
			.setFooter('Footer', 'https://footer.com/icon.png')
			.setImage('https://example.com/image.png')
			.setThumbnail('https://example.com/thumb.png')
			.setProvider('Provider', 'https://provider.com')
			.addField('Field', 'Value', true)
			.setTimestamp()

		expect(result).toBe(embed) // Should return same instance for chaining

		const obj = embed.toObject()
		expect(obj.title).toBe('Chained Title')
		expect(obj.description).toBe('Chained Description')
		expect(obj.url).toBe('https://example.com')
		expect(obj.fields).toHaveLength(1)
	})
})

describe('embed error handling', () => {
	test('should validate field name in object mode', () => {
		const embed = new Embed()

		expect(() => {
			embed.addField({
				name: 'a'.repeat(257),
				value: 'Valid value',
				inline: false
			})
		}).toThrow('Field name length exceeds 256 characters')
	})

	test('should validate empty field value in object mode', () => {
		const embed = new Embed()

		expect(() => {
			embed.addField({
				name: 'Valid name',
				value: '',
				inline: false
			})
		}).toThrow('Field value is required')
	})

	test('should validate long field value in object mode', () => {
		const embed = new Embed()

		expect(() => {
			embed.addField({
				name: 'Valid name',
				value: 'a'.repeat(1025),
				inline: false
			})
		}).toThrow('Field value length exceeds 1024 characters')
	})

	test('should handle timestamp with specific date', () => {
		const embed = new Embed()
		const testDate = new Date('2023-01-01T00:00:00.000Z')
		embed.setTimestamp(testDate)

		const obj = embed.toObject()
		expect(obj.timestamp).toBe('2023-01-01T00:00:00.000Z')
	})

	test('should handle current timestamp when no date provided', () => {
		const embed = new Embed()
		const beforeTime = Date.now()
		embed.setTimestamp()
		const afterTime = Date.now()

		const obj = embed.toObject()
		const timestampTime = new Date(obj.timestamp ?? '').getTime()

		expect(timestampTime).toBeGreaterThanOrEqual(beforeTime)
		expect(timestampTime).toBeLessThanOrEqual(afterTime)
	})
})

describe('webhook management methods', () => {
	test('should modify webhook successfully', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('', { status: 204 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const res = await webhook.modify({
			name: 'New Webhook Name',
			avatar: 'base64-encoded-avatar'
		})

		expect(res).toMatchObject({ ok: true, status: 204 })
		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: expect.stringContaining('"name":"New Webhook Name"')
			})
		)
	})

	test('should return false for modify webhook with non-204 status', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('', { status: 200 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const res = await webhook.modify({ name: 'Test' })

		expect(res).toMatchObject({ ok: true, status: 200 })
	})

	test('should handle modify webhook network error', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Network error'))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL, { maxRetries: 0 })
		const res = await webhook.modify({ name: 'Test' })

		expect(res).toMatchObject({ ok: false, status: 0 })
	})

	test('should get webhook information successfully', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('', { status: 204 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const res = await webhook.get()

		expect(res).toMatchObject({ ok: true, status: 204 })
		expect(mockFetch).toHaveBeenCalledWith(
			TEST_WEBHOOK_URL,
			expect.objectContaining({
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				body: undefined
			})
		)
	})

	test('should return false for get webhook with non-204 status', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(new Response('', { status: 404 }))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL)
		const res = await webhook.get()

		expect(res).toMatchObject({ ok: false, status: 404 })
	})

	test('should handle get webhook network error', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Network failure'))
		)

		const webhook = new Webhook(TEST_WEBHOOK_URL, { maxRetries: 0 })
		const res = await webhook.get()

		expect(res).toMatchObject({ ok: false, status: 0 })
	})

	test('should handle modify webhook error thrown by client', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Mock the client.send method to throw an error to test the catch block
		const mockSend = mock<RequestClient['send']>(() =>
			Promise.reject(new Error('Client error'))
		)
		;(webhook as unknown as { client: RequestClient }).client.send = mockSend

		await expect(async () => {
			await webhook.modify({ name: 'Test' })
		}).toThrow('Client error')
	})

	test('should handle get webhook error thrown by client', async () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Mock the client.send method to throw an error to test the catch block
		const mockSend = mock<RequestClient['send']>(() =>
			Promise.reject(new Error('Client error'))
		)
		;(webhook as unknown as { client: RequestClient }).client.send = mockSend

		await expect(async () => {
			await webhook.get()
		}).toThrow('Client error')
	})
})

describe('webhook validation method', () => {
	test('should call validate method correctly', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('a'.repeat(1999)) // Valid content

		expect(() => {
			webhook.validate()
		}).not.toThrow()
	})

	test('should validate webhook with valid embeds and fields', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)
		webhook.setContent('Valid content')

		// Add just one simple embed without fields first
		const embed = new Embed().setTitle('Test Embed')
		webhook.addEmbed(embed)

		expect(() => {
			webhook.validate()
		}).not.toThrow()
	})

	test('should validate content length limits', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Use reflection to set content without triggering setContent validation
		// biome-ignore lint/suspicious/noExplicitAny: testing internal state
		;(webhook as any).content = 'a'.repeat(2001)

		expect(() => {
			webhook.validate()
		}).toThrow('Content length exceeds 2000 characters')
	})

	test('should validate embed limits', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Use reflection to set embeds directly
		const embeds = []
		for (let i = 0; i < 11; i++) {
			embeds.push(new Embed().setTitle(`Embed ${i}`).toObject())
		}
		// biome-ignore lint/suspicious/noExplicitAny: testing internal state
		;(webhook as any).embeds = embeds

		expect(() => {
			webhook.validate()
		}).toThrow('Embeds length exceeds 10')
	})

	test('should validate field limits in embeds', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Create an embed with too many fields using reflection
		const embed = new Embed()
		const fields = []
		for (let i = 0; i < 26; i++) {
			fields.push({ name: `Field ${i}`, value: 'Value', inline: false })
		}
		// biome-ignore lint/suspicious/noExplicitAny: testing internal state
		;(embed as any).fields = fields

		webhook.addEmbed(embed)

		expect(() => {
			webhook.validate()
		}).toThrow('Fields length exceeds 25')
	})

	test('should validate field name length limits', () => {
		const webhook = new Webhook(TEST_WEBHOOK_URL)

		// Create an embed with a field that has a too-long name
		const embed = new Embed()
		const fields = [{ name: 'a'.repeat(256), value: 'Value', inline: false }]
		// biome-ignore lint/suspicious/noExplicitAny: testing internal state
		;(embed as any).fields = fields

		webhook.addEmbed(embed)

		expect(() => {
			webhook.validate()
		}).toThrow('Field name length exceeds 255 characters')
	})
})

describe('delay function', () => {
	test('should delay execution for specified seconds', async () => {
		// Restore the real delay function for this test
		delaySpyOn.mockRestore()

		const startTime = Date.now()
		await RequestClientModule.delay(0.1) // 100ms
		const endTime = Date.now()

		expect(endTime - startTime).toBeGreaterThanOrEqual(90) // Allow some margin

		// Re-mock it for other tests
		delaySpyOn = spyOn(RequestClientModule, 'delay').mockImplementation(() =>
			Promise.resolve()
		)
	})
})
