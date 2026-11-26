import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test
} from 'bun:test'
import * as RequestClientModule from '../classes/RequestClient.js'
import {
	Embed,
	EzHookError,
	MessageFlags,
	NetworkError,
	RateLimitError,
	RequestAbortedError,
	TimeoutError,
	ValidationError,
	Webhook,
	WebhookError,
	WebhookNotFoundError
} from '../index.js'

const URL_BASE = 'https://discord.com/api/webhooks/123456789/test-token'

const MESSAGE = {
	id: '111',
	channel_id: '222',
	type: 0,
	content: 'Hello',
	timestamp: '2026-01-01T00:00:00.000Z',
	edited_timestamp: null,
	tts: false,
	mention_everyone: false,
	embeds: [],
	attachments: [],
	author: { id: '123456789', username: 'Hook', avatar: null, bot: true },
	pinned: false
}

type FetchCall = { url: URL; init: RequestInit }

let calls: FetchCall[]
let responses: Array<
	Response | Error | ((init: RequestInit) => Promise<Response>)
>
let delaySpy: ReturnType<typeof spyOn>

const json = (
	body: unknown,
	status = 200,
	headers: Record<string, string> = {}
) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	})

beforeEach(() => {
	calls = []
	responses = []
	globalThis.fetch = mock(
		async (input: string | URL | Request, init: RequestInit = {}) => {
			calls.push({ url: new URL(String(input)), init })
			const next = responses.shift() ?? json(MESSAGE)
			if (next instanceof Error) throw next
			if (typeof next === 'function') return next(init)
			return next
		}
	) as unknown as typeof fetch
	delaySpy = spyOn(RequestClientModule, 'delay').mockImplementation(() =>
		Promise.resolve()
	)
})

afterEach(() => {
	delaySpy.mockRestore()
})

const lastBody = () => JSON.parse(String(calls.at(-1)?.init.body))
const lastForm = () => calls.at(-1)?.init.body as FormData
const lastHeaders = () => new Headers(calls.at(-1)?.init.headers)

const catchError = async (promise: Promise<unknown>) => {
	try {
		await promise
	} catch (error) {
		return error
	}
	throw new Error('Expected promise to reject')
}

describe('Webhook constructor', () => {
	test('rejects invalid URLs', () => {
		expect(() => new Webhook('not a url')).toThrow(ValidationError)
		expect(() => new Webhook('ftp://discord.com/api/webhooks/1/x')).toThrow(
			ValidationError
		)
	})

	test('accepts the legacy retry config argument', () => {
		const hook = new Webhook(URL_BASE, { maxRetries: 7 })
		expect(hook.getRetryConfig()).toEqual({
			maxRetries: 7,
			baseDelay: 1000,
			maxDelay: 60000
		})
	})

	test('accepts retry inside options', () => {
		const hook = new Webhook(URL_BASE, { retry: { baseDelay: 5 } })
		expect(hook.getRetryConfig()).toEqual({
			maxRetries: 3,
			baseDelay: 5,
			maxDelay: 60000
		})
	})

	test('applies default username, avatar, mentions and headers', async () => {
		const hook = new Webhook(URL_BASE, {
			username: 'Bot',
			avatarUrl: 'https://example.com/a.png',
			allowedMentions: { parse: [] },
			headers: { 'x-trace': 'abc' }
		})
		await hook.send('hi')
		expect(lastBody()).toEqual({
			content: 'hi',
			username: 'Bot',
			avatar_url: 'https://example.com/a.png',
			allowed_mentions: { parse: [] }
		})
		expect(lastHeaders().get('x-trace')).toBe('abc')
	})
})

describe('send', () => {
	test('sends a string and returns the parsed message', async () => {
		const message = await new Webhook(URL_BASE).send('Hello')
		expect(message.id).toBe('111')
		const call = calls[0]
		expect(call?.init.method).toBe('POST')
		expect(call?.url.pathname).toBe('/api/webhooks/123456789/test-token')
		expect(call?.url.searchParams.get('wait')).toBe('true')
		expect(lastHeaders().get('content-type')).toBe('application/json')
		expect(lastBody()).toEqual({ content: 'Hello' })
	})

	test('wait: false returns undefined', async () => {
		responses.push(new Response(null, { status: 204 }))
		const result = await new Webhook(URL_BASE).send('Hello', { wait: false })
		expect(result).toBeUndefined()
		expect(calls[0]?.url.searchParams.get('wait')).toBe('false')
	})

	test('maps options to Discord fields', async () => {
		await new Webhook(URL_BASE).send({
			content: 'x',
			username: 'U',
			avatarUrl: 'https://a',
			tts: true,
			allowedMentions: { users: ['1'] },
			flags: ['SuppressEmbeds', 'SuppressNotifications'],
			threadId: '999',
			threadName: 'New thread',
			appliedTags: ['5']
		})
		expect(calls[0]?.url.searchParams.get('thread_id')).toBe('999')
		expect(lastBody()).toEqual({
			content: 'x',
			username: 'U',
			avatar_url: 'https://a',
			tts: true,
			allowed_mentions: { users: ['1'] },
			flags: MessageFlags.SuppressEmbeds | MessageFlags.SuppressNotifications,
			thread_name: 'New thread',
			applied_tags: ['5']
		})
	})

	test('accepts flags as a number', async () => {
		await new Webhook(URL_BASE).send({ content: 'x', flags: 4096 })
		expect(lastBody().flags).toBe(4096)
	})

	test('keeps query parameters already in the URL', async () => {
		await new Webhook(`${URL_BASE}?thread_id=42`).send('x')
		expect(calls[0]?.url.searchParams.get('thread_id')).toBe('42')
		expect(calls[0]?.url.searchParams.get('wait')).toBe('true')
	})

	test('accepts Embed builders and plain embed objects', async () => {
		await new Webhook(URL_BASE).send({
			embeds: [new Embed().setTitle('A'), { title: 'B', color: 1 }]
		})
		expect(lastBody().embeds).toEqual([
			{ type: 'rich', title: 'A' },
			{ title: 'B', color: 1 }
		])
	})

	test('per-call message overrides builder state', async () => {
		const hook = new Webhook(URL_BASE)
			.setUsername('Builder')
			.setContent('draft')
		await hook.send({ content: 'override' })
		expect(lastBody()).toEqual({ username: 'Builder', content: 'override' })
	})

	test('custom per-request headers override defaults', async () => {
		await new Webhook(URL_BASE, { headers: { 'x-a': '1' } }).send('x', {
			headers: { 'x-a': '2' }
		})
		expect(lastHeaders().get('x-a')).toBe('2')
	})
})

describe('builder', () => {
	test('chains and sends builder state', async () => {
		await new Webhook(URL_BASE)
			.setUsername('Bot')
			.setAvatarUrl('https://a')
			.setTTS(true)
			.setContent('hello')
			.setAllowedMentions({ parse: ['users'] })
			.setFlags(['SuppressNotifications'])
			.setThreadId('7')
			.send()
		expect(calls[0]?.url.searchParams.get('thread_id')).toBe('7')
		expect(lastBody()).toEqual({
			username: 'Bot',
			avatar_url: 'https://a',
			tts: true,
			content: 'hello',
			allowed_mentions: { parse: ['users'] },
			flags: 4096
		})
	})

	test('embeds are serialized at send time', async () => {
		const embed = new Embed().setTitle('Before')
		const hook = new Webhook(URL_BASE).addEmbed(embed)
		embed.setTitle('After')
		await hook.send()
		expect(lastBody().embeds[0].title).toBe('After')
	})

	test('addEmbed throws past 10 embeds', () => {
		const hook = new Webhook(URL_BASE)
		for (let i = 0; i < 10; i++) hook.addEmbed(new Embed().setTitle(`${i}`))
		expect(() => hook.addEmbed(new Embed())).toThrow(ValidationError)
	})

	test('setEmbeds replaces embeds', () => {
		const hook = new Webhook(URL_BASE)
			.addEmbed({ title: 'a' })
			.setEmbeds([{ title: 'b' }])
		expect(hook.toObject().embeds).toEqual([{ title: 'b' }])
	})

	test('setContent and setUsername validate eagerly', () => {
		const hook = new Webhook(URL_BASE)
		expect(() => hook.setContent('a'.repeat(2001))).toThrow(ValidationError)
		expect(() => hook.setUsername('a'.repeat(81))).toThrow(ValidationError)
		expect(() => hook.setThreadName('a'.repeat(101))).toThrow(ValidationError)
	})

	test('clear resets builder state but keeps defaults', () => {
		const hook = new Webhook(URL_BASE, { username: 'Default' })
			.setUsername('Temp')
			.setContent('x')
			.addEmbed({ title: 'e' })
		hook.clear()
		expect(hook.toObject()).toEqual({ username: 'Default' })
	})

	test('toObject returns the JSON body', () => {
		const hook = new Webhook(URL_BASE)
			.setContent('x')
			.addEmbed(new Embed().setTitle('t'))
		expect(hook.toObject()).toEqual({
			content: 'x',
			embeds: [{ type: 'rich', title: 't' }]
		})
	})
})

describe('validation before sending', () => {
	const expectValidation = async (promise: Promise<unknown>, field: string) => {
		const error = await catchError(promise)
		expect(error).toBeInstanceOf(ValidationError)
		expect((error as ValidationError).field).toBe(field)
		expect(calls).toHaveLength(0)
	}

	test('rejects empty messages', async () => {
		await expectValidation(new Webhook(URL_BASE).send(), 'content')
		await expectValidation(new Webhook(URL_BASE).send('   '), 'content')
	})

	test('rejects content over 2000 characters', async () => {
		await expectValidation(
			new Webhook(URL_BASE).send('a'.repeat(2001)),
			'content'
		)
	})

	test('rejects more than 10 embeds', async () => {
		const embeds = Array.from({ length: 11 }, () => ({ title: 'x' }))
		await expectValidation(new Webhook(URL_BASE).send({ embeds }), 'embeds')
	})

	test('rejects more than 10 files', async () => {
		const files = Array.from({ length: 11 }, () => 'x')
		await expectValidation(new Webhook(URL_BASE).send({ files }), 'files')
	})

	test('reports the path of invalid embed values', async () => {
		await expectValidation(
			new Webhook(URL_BASE).send({
				embeds: [
					{ title: 'ok' },
					{ fields: [{ name: 'a', value: 'a'.repeat(1025) }] }
				]
			}),
			'embeds[1].fields[0].value'
		)
		await expectValidation(
			new Webhook(URL_BASE).send({
				embeds: [{ description: 'a'.repeat(4097) }]
			}),
			'embeds[0].description'
		)
		await expectValidation(
			new Webhook(URL_BASE).send({
				embeds: [{ fields: [{ name: '', value: 'v' }] }]
			}),
			'embeds[0].fields[0].name'
		)
	})

	test('enforces the 6000 character total across embeds', async () => {
		const embeds = [
			{ description: 'a'.repeat(4000) },
			{ description: 'a'.repeat(2001) }
		]
		const error = await catchError(new Webhook(URL_BASE).send({ embeds }))
		expect(error).toBeInstanceOf(ValidationError)
		expect((error as ValidationError).actualLength).toBe(6001)
	})

	test('validate() checks builder state', () => {
		expect(() => new Webhook(URL_BASE).validate()).toThrow(ValidationError)
		expect(() => new Webhook(URL_BASE).setContent('x').validate()).not.toThrow()
	})
})

describe('files', () => {
	test('sends multipart with payload_json and attachment metadata', async () => {
		await new Webhook(URL_BASE).send({
			content: 'files',
			files: [
				{ filename: 'a.txt', data: 'hello', description: 'first' },
				{
					filename: 'b.bin',
					data: new Uint8Array([1, 2, 3]),
					contentType: 'application/octet-stream'
				}
			]
		})
		const form = lastForm()
		expect(form).toBeInstanceOf(FormData)
		expect(lastHeaders().has('content-type')).toBeFalse()
		expect(JSON.parse(String(form.get('payload_json')))).toEqual({
			content: 'files',
			attachments: [
				{ id: 0, filename: 'a.txt', description: 'first' },
				{ id: 1, filename: 'b.bin' }
			]
		})
		const first = form.get('files[0]') as File
		const second = form.get('files[1]') as File
		expect(first.name).toBe('a.txt')
		expect(await first.text()).toBe('hello')
		expect(second.type).toBe('application/octet-stream')
		expect([...new Uint8Array(await second.arrayBuffer())]).toEqual([1, 2, 3])
	})

	test('a file alone is a valid message', async () => {
		await new Webhook(URL_BASE).setFile('plain text').send()
		const file = lastForm().get('files[0]') as File
		expect(file.name).toBe('file.txt')
		expect(await file.text()).toBe('plain text')
	})

	test('addFile appends and setFile replaces', async () => {
		const hook = new Webhook(URL_BASE).addFile('a').addFile('b')
		await hook.send()
		expect(lastForm().get('files[1]')).not.toBeNull()
		await hook.setFile('c').send()
		expect(lastForm().get('files[1]')).toBeNull()
	})

	test('decodes base64 data', async () => {
		await new Webhook(URL_BASE).send({
			files: [{ filename: 'x.txt', data: btoa('decoded!'), encoding: 'base64' }]
		})
		expect(await (lastForm().get('files[0]') as File).text()).toBe('decoded!')
	})

	test('sends only the bytes of a typed array view', async () => {
		const view = new Uint8Array([9, 1, 2, 9]).subarray(1, 3)
		await new Webhook(URL_BASE).send({ files: [{ filename: 'x', data: view }] })
		const bytes = new Uint8Array(
			await (lastForm().get('files[0]') as File).arrayBuffer()
		)
		expect([...bytes]).toEqual([1, 2])
	})

	test('sends Blob and ArrayBuffer data', async () => {
		await new Webhook(URL_BASE).send({
			files: [
				{ filename: 'a', data: new Blob(['blob']) },
				{ filename: 'b', data: new TextEncoder().encode('buf').buffer }
			]
		})
		expect(await (lastForm().get('files[0]') as File).text()).toBe('blob')
		expect(await (lastForm().get('files[1]') as File).text()).toBe('buf')
	})
})

describe('errors', () => {
	test('throws WebhookError with Discord code and readable details', async () => {
		responses.push(
			json(
				{
					message: 'Invalid Form Body',
					code: 50035,
					errors: {
						embeds: {
							'0': {
								description: {
									_errors: [
										{
											code: 'BASE_TYPE_MAX_LENGTH',
											message: 'Must be 4096 or fewer in length.'
										}
									]
								}
							}
						}
					}
				},
				400
			)
		)
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as WebhookError
		expect(error).toBeInstanceOf(WebhookError)
		expect(error.status).toBe(400)
		expect(error.statusCode).toBe(400)
		expect(error.code).toBe(50035)
		expect(error.message).toBe(
			'Invalid Form Body (code 50035): embeds.0.description: Must be 4096 or fewer in length.'
		)
		expect(error.body).toMatchObject({ code: 50035 })
		expect(calls).toHaveLength(1)
	})

	test('throws WebhookNotFoundError on 404', async () => {
		responses.push(json({ message: 'Unknown Webhook', code: 10015 }, 404))
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as WebhookNotFoundError
		expect(error).toBeInstanceOf(WebhookNotFoundError)
		expect(error.message).toBe('Unknown Webhook (code 10015)')
		expect(error.code).toBe(10015)
	})

	test('uses plain text bodies as the message', async () => {
		responses.push(new Response('Bad gateway text', { status: 401 }))
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as WebhookError
		expect(error.message).toBe('Bad gateway text')
		expect(error.status).toBe(401)
	})

	test('retries 429 using retry_after from the body', async () => {
		responses.push(
			json(
				{
					message: 'You are being rate limited.',
					retry_after: 1.5,
					global: false
				},
				429
			)
		)
		const message = await new Webhook(URL_BASE).send('x')
		expect(message.id).toBe('111')
		expect(calls).toHaveLength(2)
		expect(delaySpy.mock.calls[0]?.[0]).toBe(1500)
	})

	test('retries 429 using the retry-after header', async () => {
		responses.push(
			new Response('', { status: 429, headers: { 'retry-after': '2' } })
		)
		await new Webhook(URL_BASE).send('x')
		expect(delaySpy.mock.calls[0]?.[0]).toBe(2000)
	})

	test('throws RateLimitError after exhausting retries', async () => {
		for (let i = 0; i < 4; i++) responses.push(json({ retry_after: 0.1 }, 429))
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as RateLimitError
		expect(error).toBeInstanceOf(RateLimitError)
		expect(error.retryAfter).toBe(100)
		expect(calls).toHaveLength(4)
	})

	test('throws RateLimitError immediately when retry_after exceeds maxDelay', async () => {
		responses.push(json({ retry_after: 120 }, 429))
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as RateLimitError
		expect(error).toBeInstanceOf(RateLimitError)
		expect(error.retryAfter).toBe(120000)
		expect(calls).toHaveLength(1)
	})

	test('retries server errors with backoff', async () => {
		responses.push(
			new Response('', { status: 502 }),
			new Response('', { status: 503 })
		)
		await new Webhook(URL_BASE).send('x')
		expect(calls).toHaveLength(3)
	})

	test('throws after exhausting server error retries', async () => {
		for (let i = 0; i < 3; i++)
			responses.push(new Response('', { status: 500 }))
		const error = (await catchError(
			new Webhook(URL_BASE, { retry: { maxRetries: 2 } }).send('x')
		)) as WebhookError
		expect(error.status).toBe(500)
		expect(calls).toHaveLength(3)
	})

	test('does not retry network errors on send (avoids duplicate messages)', async () => {
		responses.push(new TypeError('fetch failed'))
		const error = (await catchError(
			new Webhook(URL_BASE).send('x')
		)) as NetworkError
		expect(error).toBeInstanceOf(NetworkError)
		expect(error.status).toBe(0)
		expect(error.message).toBe('fetch failed')
		expect(error.cause).toBeInstanceOf(TypeError)
		expect(calls).toHaveLength(1)
	})

	test('retries network errors on idempotent requests', async () => {
		responses.push(new TypeError('fetch failed'), json({ id: '1' }))
		await new Webhook(URL_BASE).get()
		expect(calls).toHaveLength(2)
	})

	test('throws TimeoutError when timeoutMs is exceeded', async () => {
		responses.push(
			(init) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(new DOMException('aborted', 'AbortError'))
					)
				})
		)
		const error = await catchError(
			new Webhook(URL_BASE).send('x', { timeoutMs: 5 })
		)
		expect(error).toBeInstanceOf(TimeoutError)
		expect((error as TimeoutError).message).toBe('Request timed out after 5ms')
	})

	test('throws RequestAbortedError when the signal aborts', async () => {
		const controller = new AbortController()
		controller.abort()
		responses.push(
			new DOMException('aborted', 'AbortError') as unknown as Error
		)
		const error = await catchError(
			new Webhook(URL_BASE).send('x', { signal: controller.signal })
		)
		expect(error).toBeInstanceOf(RequestAbortedError)
	})

	test('stops retrying when aborted during the backoff delay', async () => {
		const controller = new AbortController()
		delaySpy.mockImplementation(() => {
			controller.abort()
			return Promise.reject(controller.signal.reason)
		})
		responses.push(new Response('', { status: 500 }))
		const error = await catchError(
			new Webhook(URL_BASE).send('x', { signal: controller.signal })
		)
		expect(error).toBeInstanceOf(RequestAbortedError)
		expect(calls).toHaveLength(1)
	})
})

describe('trySend', () => {
	test('returns data on success', async () => {
		const result = await new Webhook(URL_BASE).trySend('x')
		expect(result.ok).toBeTrue()
		expect(result.data?.id).toBe('111')
	})

	test('returns the error instead of throwing', async () => {
		responses.push(json({ message: 'Unknown Webhook', code: 10015 }, 404))
		const result = await new Webhook(URL_BASE).trySend('x')
		expect(result.ok).toBeFalse()
		expect(result.error).toBeInstanceOf(WebhookNotFoundError)
	})

	test('returns validation errors too', async () => {
		const result = await new Webhook(URL_BASE).trySend('')
		expect(result.error).toBeInstanceOf(ValidationError)
	})
})

describe('messages', () => {
	test('getMessage', async () => {
		const message = await new Webhook(URL_BASE).getMessage('555', {
			threadId: '9'
		})
		expect(message.id).toBe('111')
		expect(calls[0]?.init.method).toBe('GET')
		expect(calls[0]?.url.pathname).toBe(
			'/api/webhooks/123456789/test-token/messages/555'
		)
		expect(calls[0]?.url.searchParams.get('thread_id')).toBe('9')
		expect(calls[0]?.init.body).toBeUndefined()
	})

	test('editMessage with a string', async () => {
		await new Webhook(URL_BASE).editMessage('555', 'edited')
		expect(calls[0]?.init.method).toBe('PATCH')
		expect(calls[0]?.url.pathname).toEndWith('/messages/555')
		expect(lastBody()).toEqual({ content: 'edited' })
	})

	test('editMessage does not apply sender defaults and allows partial edits', async () => {
		await new Webhook(URL_BASE, { username: 'Bot' }).editMessage('555', {
			embeds: [],
			threadId: '3'
		})
		expect(lastBody()).toEqual({ embeds: [] })
		expect(calls[0]?.url.searchParams.get('thread_id')).toBe('3')
	})

	test('editMessage validates', async () => {
		const error = await catchError(
			new Webhook(URL_BASE).editMessage('1', 'a'.repeat(2001))
		)
		expect(error).toBeInstanceOf(ValidationError)
	})

	test('deleteMessage', async () => {
		responses.push(new Response(null, { status: 204 }))
		const result = await new Webhook(URL_BASE).deleteMessage('555')
		expect(result).toBeUndefined()
		expect(calls[0]?.init.method).toBe('DELETE')
		expect(calls[0]?.url.pathname).toEndWith('/messages/555')
	})

	test('requires a message id', async () => {
		const error = await catchError(new Webhook(URL_BASE).deleteMessage(''))
		expect(error).toBeInstanceOf(ValidationError)
		expect(calls).toHaveLength(0)
	})
})

describe('webhook management', () => {
	const WEBHOOK = {
		id: '123456789',
		type: 1,
		name: 'Hook',
		channel_id: '2',
		avatar: null,
		application_id: null
	}

	test('get returns parsed webhook info', async () => {
		responses.push(json(WEBHOOK))
		const info = await new Webhook(URL_BASE).get()
		expect(info.name).toBe('Hook')
		expect(calls[0]?.url.search).toBe('')
	})

	test('modify sends PATCH with changes', async () => {
		responses.push(json({ ...WEBHOOK, name: 'New' }))
		const info = await new Webhook(URL_BASE).modify({ name: 'New' })
		expect(info.name).toBe('New')
		expect(calls[0]?.init.method).toBe('PATCH')
		expect(lastBody()).toEqual({ name: 'New' })
	})

	test('modify validates the name', async () => {
		const error = await catchError(
			new Webhook(URL_BASE).modify({ name: 'a'.repeat(81) })
		)
		expect(error).toBeInstanceOf(ValidationError)
	})

	test('deleteWebhook sends DELETE', async () => {
		responses.push(new Response(null, { status: 204 }))
		await new Webhook(URL_BASE).deleteWebhook()
		expect(calls[0]?.init.method).toBe('DELETE')
		expect(calls[0]?.url.pathname).toBe('/api/webhooks/123456789/test-token')
	})

	test('isValid', async () => {
		responses.push(json(WEBHOOK))
		expect(await new Webhook(URL_BASE).isValid()).toBeTrue()
		responses.push(json({ message: 'Unknown Webhook', code: 10015 }, 404))
		expect(await new Webhook(URL_BASE).isValid()).toBeFalse()
	})
})

describe('Embed', () => {
	test('builds a full embed', () => {
		const date = new Date('2026-01-01T00:00:00.000Z')
		const embed = new Embed()
			.setTitle('Title')
			.setUrl('https://example.com')
			.setDescription('Desc')
			.setColor('#ff0000')
			.setTimestamp(date)
			.setAuthor('Author', 'https://a', 'https://icon')
			.setFooter('Footer', 'https://f')
			.setImage('https://img', 10, 20)
			.setThumbnail({ url: 'https://thumb' })
			.setVideo('https://video')
			.setProvider('Provider', 'https://p')
			.addField('a', 'b', true)
			.addField({ name: 'c', value: 'd' })
		expect(embed.toObject()).toEqual({
			type: 'rich',
			title: 'Title',
			url: 'https://example.com',
			description: 'Desc',
			color: 0xff0000,
			timestamp: '2026-01-01T00:00:00.000Z',
			author: { name: 'Author', url: 'https://a', icon_url: 'https://icon' },
			footer: {
				text: 'Footer',
				icon_url: 'https://f',
				proxy_icon_url: undefined
			},
			image: { url: 'https://img', height: 10, width: 20 },
			thumbnail: { url: 'https://thumb' },
			video: { url: 'https://video', height: undefined, width: undefined },
			provider: { name: 'Provider', url: 'https://p' },
			fields: [
				{ name: 'a', value: 'b', inline: true },
				{ name: 'c', value: 'd' }
			]
		})
	})

	test('toObject omits unset values', () => {
		expect(new Embed().setTitle('x').toObject()).toEqual({
			type: 'rich',
			title: 'x'
		})
	})

	test('can start from a plain object', () => {
		const source = { title: 'Hi', fields: [{ name: 'a', value: 'b' }] }
		const embed = Embed.from(source).addField('c', 'd')
		expect(embed.toObject().fields).toHaveLength(2)
		expect(source.fields).toHaveLength(1)
	})

	test('JSON.stringify uses toObject', () => {
		expect(JSON.parse(JSON.stringify(new Embed().setTitle('x')))).toEqual({
			type: 'rich',
			title: 'x'
		})
	})

	test('setURL is kept as an alias', () => {
		expect(new Embed().setURL('https://x').toObject().url).toBe('https://x')
	})

	test('colors', () => {
		expect(new Embed().setColor('00ff00').toObject().color).toBe(0x00ff00)
		expect(new Embed().setColor('#FFF').toObject().color).toBe(0xfff)
		expect(new Embed().setColor(0).toObject().color).toBe(0)
		expect(() => new Embed().setColor('#zzzzzz')).toThrow(ValidationError)
		expect(() => new Embed().setColor('#1234567')).toThrow(ValidationError)
		expect(() => new Embed().setColor(-1)).toThrow(ValidationError)
		expect(() => new Embed().setColor(0x1000000)).toThrow(ValidationError)
		expect(() => new Embed().setColor(1.5)).toThrow(ValidationError)
	})

	test('timestamps', () => {
		expect(new Embed().setTimestamp(0).toObject().timestamp).toBe(
			'1970-01-01T00:00:00.000Z'
		)
		expect(new Embed().setTimestamp('2026-05-01').toObject().timestamp).toBe(
			'2026-05-01T00:00:00.000Z'
		)
		expect(new Embed().setTimestamp().toObject().timestamp).toBeString()
		expect(() => new Embed().setTimestamp('nope')).toThrow(ValidationError)
	})

	test('length limits', () => {
		expect(() => new Embed().setTitle('a'.repeat(257))).toThrow(ValidationError)
		expect(() => new Embed().setDescription('a'.repeat(4097))).toThrow(
			ValidationError
		)
		expect(() => new Embed().setFooter('a'.repeat(2049))).toThrow(
			ValidationError
		)
		expect(() => new Embed().setFooter({ text: 'a'.repeat(2049) })).toThrow(
			ValidationError
		)
		expect(() => new Embed().setAuthor('a'.repeat(257))).toThrow(
			ValidationError
		)
		expect(() => new Embed().setAuthor({ name: 'a'.repeat(257) })).toThrow(
			ValidationError
		)
		expect(() => new Embed().setTitle('a'.repeat(256))).not.toThrow()
		expect(() => new Embed().setDescription('a'.repeat(4096))).not.toThrow()
	})

	test('field rules', () => {
		expect(() => new Embed().addField('a'.repeat(257), 'v')).toThrow(
			ValidationError
		)
		expect(() => new Embed().addField('n', 'a'.repeat(1025))).toThrow(
			ValidationError
		)
		expect(() => new Embed().addField('n', '')).toThrow(ValidationError)
		expect(() => new Embed().addField('', 'v')).toThrow(ValidationError)

		const embed = new Embed()
		for (let i = 0; i < 25; i++) embed.addField(`${i}`, 'v')
		expect(() => embed.addField('26', 'v')).toThrow(ValidationError)

		const fields = Array.from({ length: 26 }, (_, i) => ({
			name: `${i}`,
			value: 'v'
		}))
		expect(() => new Embed().setFields(fields)).toThrow(ValidationError)
		expect(
			new Embed().addField('x', 'y').setFields(fields.slice(0, 2)).toObject()
				.fields
		).toHaveLength(2)
		expect(
			new Embed().addFields(...fields.slice(0, 3)).toObject().fields
		).toHaveLength(3)
	})

	test('validation errors include field and limits', () => {
		try {
			new Embed().setTitle('a'.repeat(300))
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError)
			expect((error as ValidationError).field).toBe('title')
			expect((error as ValidationError).maxLength).toBe(256)
			expect((error as ValidationError).actualLength).toBe(300)
			expect((error as ValidationError).message).toBe(
				'Title exceeds 256 characters (got 300)'
			)
		}
	})
})

describe('error classes', () => {
	test('hierarchy and names', () => {
		const errors = [
			new ValidationError('x', 'f'),
			new WebhookError('x', 400),
			new RateLimitError(5000),
			new WebhookNotFoundError(),
			new NetworkError(),
			new TimeoutError(10),
			new RequestAbortedError()
		]
		for (const error of errors) {
			expect(error).toBeInstanceOf(EzHookError)
			expect(error).toBeInstanceOf(Error)
			expect(error.name).toBe(error.constructor.name)
		}
		expect(new RateLimitError(5000).retryAfter).toBe(5000)
		expect(new RateLimitError().status).toBe(429)
		expect(new WebhookNotFoundError().status).toBe(404)
		expect(new TimeoutError(10)).toBeInstanceOf(NetworkError)
		expect(new RequestAbortedError()).toBeInstanceOf(WebhookError)
		expect(new WebhookError('x').status).toBe(0)
	})
})

describe('delay', () => {
	test('resolves after the delay and rejects on abort', async () => {
		delaySpy.mockRestore()
		const start = Date.now()
		await RequestClientModule.delay(10)
		expect(Date.now() - start).toBeGreaterThanOrEqual(5)

		const controller = new AbortController()
		const pending = RequestClientModule.delay(10_000, controller.signal)
		controller.abort(new Error('stop'))
		expect(pending).rejects.toThrow('stop')
		delaySpy = spyOn(RequestClientModule, 'delay').mockImplementation(() =>
			Promise.resolve()
		)
	})
})
