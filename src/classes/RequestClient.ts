import type { FileAttachment, WebhookFile } from '../types/index.js'
import {
	NetworkError,
	RateLimitError,
	RequestAbortedError,
	TimeoutError,
	ValidationError,
	WebhookError,
	WebhookNotFoundError
} from './Errors.js'

/**
 * Waits for `ms` milliseconds. Rejects early if `signal` is aborted.
 * @internal
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason)
			return
		}
		const onAbort = () => {
			clearTimeout(timer)
			reject(signal?.reason)
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort)
			resolve()
		}, ms)
		signal?.addEventListener('abort', onAbort, { once: true })
	})
}

export interface RetryConfig {
	/** Maximum number of retries after the first attempt. Default: 3 */
	maxRetries: number
	/** Base delay for exponential backoff, in ms. Default: 1000 */
	baseDelay: number
	/**
	 * Maximum delay between attempts, in ms. Default: 60000.
	 * If Discord asks to wait longer than this, a RateLimitError is thrown instead.
	 */
	maxDelay: number
}

/**
 * Per-request options accepted by every method that talks to Discord.
 */
export interface RequestOptions {
	/** Cancel the request. Throws RequestAbortedError when aborted. */
	signal?: AbortSignal
	/** Extra headers, merged over the webhook's default headers. */
	headers?: HeadersInit
	/** Timeout for each attempt, in ms. Throws TimeoutError when exceeded. */
	timeoutMs?: number
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** @internal */
export interface RequestSpec {
	/** Path appended to the webhook URL, e.g. `/messages/123`. */
	path?: string
	/** Query parameters. `undefined` values are skipped. */
	query?: Record<string, string | boolean | undefined>
	/** JSON body. */
	body?: unknown
	/** Files to upload. Switches the request to multipart/form-data. */
	files?: WebhookFile[]
}

/** @internal */
export interface RequestClientOptions {
	retry?: Partial<RetryConfig>
	headers?: HeadersInit
	timeoutMs?: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 60000
}

/**
 * Low level HTTP client: builds requests, retries, and turns failures into typed errors.
 *
 * @internal
 */
export class RequestClient {
	public readonly webhookUrl: string
	public readonly retryConfig: RetryConfig
	private readonly defaultHeaders?: HeadersInit
	private readonly defaultTimeoutMs?: number

	constructor(webhookUrl: string, options: RequestClientOptions = {}) {
		this.webhookUrl = RequestClient.assertWebhookUrl(webhookUrl)
		this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retry }
		this.defaultHeaders = options.headers
		this.defaultTimeoutMs = options.timeoutMs
	}

	private static assertWebhookUrl(webhookUrl: string): string {
		let url: URL
		try {
			url = new URL(webhookUrl)
		} catch {
			throw new ValidationError('Webhook URL is not a valid URL', 'webhookUrl')
		}
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			throw new ValidationError('Webhook URL must use http(s)', 'webhookUrl')
		}
		return webhookUrl
	}

	/**
	 * Sends a request and returns the parsed JSON body (or undefined for empty responses).
	 * Throws a WebhookError subclass on failure.
	 */
	public async request<T>(
		method: HttpMethod,
		spec: RequestSpec = {},
		options: RequestOptions = {}
	): Promise<T> {
		const url = this.buildUrl(spec)
		const { body, headers } = this.buildBody(method, spec, options.headers)
		const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs
		// Retrying a POST after a lost response could post the message twice.
		const retryNetworkErrors = method !== 'POST'

		for (let attempt = 0; ; attempt++) {
			const canRetry = attempt < this.retryConfig.maxRetries
			const attemptSignal = this.createSignal(options.signal, timeoutMs)
			let response: Response
			let text: string

			try {
				response = await fetch(url, {
					method,
					headers,
					body,
					signal: attemptSignal.signal
				})
				text = await response.text()
			} catch (error) {
				if (options.signal?.aborted) {
					throw new RequestAbortedError({
						cause: options.signal.reason ?? error
					})
				}
				const networkError =
					attemptSignal.timedOut() && timeoutMs
						? new TimeoutError(timeoutMs, { cause: error })
						: new NetworkError(
								error instanceof Error && error.message
									? error.message
									: 'Network error',
								{ cause: error }
							)
				if (retryNetworkErrors && canRetry) {
					await this.wait(this.calculateBackoff(attempt + 1), options.signal)
					continue
				}
				throw networkError
			} finally {
				attemptSignal.cleanup()
			}

			const data = parseBody(text)

			if (response.ok) return data as T

			const retryAfter = getRetryAfter(response, data)
			const code = getErrorCode(data)

			if (response.status === 429) {
				const waitMs = retryAfter ?? this.calculateBackoff(attempt + 1)
				if (canRetry && waitMs <= this.retryConfig.maxDelay) {
					await this.wait(waitMs, options.signal)
					continue
				}
				throw new RateLimitError(retryAfter, { code, body: data })
			}

			if (response.status >= 500 && canRetry) {
				await this.wait(this.calculateBackoff(attempt + 1), options.signal)
				continue
			}

			const message = formatErrorMessage(response, data)
			if (response.status === 404) {
				throw new WebhookNotFoundError(message, { code, body: data })
			}
			throw new WebhookError(message, response.status, retryAfter, {
				code,
				body: data
			})
		}
	}

	private async wait(ms: number, signal?: AbortSignal): Promise<void> {
		try {
			await delay(ms, signal)
		} catch (error) {
			throw new RequestAbortedError({ cause: error })
		}
	}

	private calculateBackoff(retryCount: number): number {
		const exponential = Math.min(
			this.retryConfig.maxDelay,
			this.retryConfig.baseDelay * 2 ** (retryCount - 1)
		)
		// Random jitter of +/- 10%
		const jitter = exponential * 0.2 * (Math.random() - 0.5)
		return Math.max(0, exponential + jitter)
	}

	private buildUrl(spec: RequestSpec): string {
		const url = new URL(this.webhookUrl)
		if (spec.path) {
			url.pathname = url.pathname.replace(/\/+$/, '') + spec.path
		}
		for (const [key, value] of Object.entries(spec.query ?? {})) {
			if (value !== undefined) url.searchParams.set(key, String(value))
		}
		return url.toString()
	}

	private buildBody(
		method: HttpMethod,
		spec: RequestSpec,
		requestHeaders?: HeadersInit
	): { body?: BodyInit; headers: Headers } {
		const headers = new Headers(this.defaultHeaders)
		for (const [key, value] of new Headers(requestHeaders)) {
			headers.set(key, value)
		}

		if (method === 'GET' || method === 'DELETE' || spec.body === undefined) {
			return { headers }
		}

		if (!spec.files?.length) {
			if (!headers.has('content-type')) {
				headers.set('content-type', 'application/json')
			}
			return { body: JSON.stringify(spec.body), headers }
		}

		// fetch sets the multipart boundary itself.
		headers.delete('content-type')
		const files = spec.files.map(normalizeFile)
		const formData = new FormData()
		formData.append(
			'payload_json',
			JSON.stringify({
				...(spec.body as object),
				attachments: files.map((file, id) => ({
					id,
					filename: file.filename,
					description: file.description
				}))
			})
		)
		files.forEach((file, index) => {
			formData.append(`files[${index}]`, createFileBlob(file), file.filename)
		})

		return { body: formData, headers }
	}

	private createSignal(
		signal: AbortSignal | undefined,
		timeoutMs: number | undefined
	): {
		signal?: AbortSignal
		cleanup: () => void
		timedOut: () => boolean
	} {
		if (!timeoutMs) {
			return { signal, cleanup: () => {}, timedOut: () => false }
		}

		let didTimeOut = false
		const controller = new AbortController()
		const timeout = setTimeout(() => {
			didTimeOut = true
			controller.abort()
		}, timeoutMs)
		const forwardAbort = () => controller.abort(signal?.reason)

		if (signal?.aborted) forwardAbort()
		else signal?.addEventListener('abort', forwardAbort, { once: true })

		return {
			signal: controller.signal,
			timedOut: () => didTimeOut,
			cleanup: () => {
				clearTimeout(timeout)
				signal?.removeEventListener('abort', forwardAbort)
			}
		}
	}
}

function normalizeFile(file: WebhookFile): FileAttachment {
	return typeof file === 'string'
		? { filename: 'file.txt', data: file, contentType: 'text/plain' }
		: file
}

function createFileBlob(file: FileAttachment): Blob {
	const { data, contentType: type } = file
	if (data instanceof Blob) return data
	if (typeof data === 'string') {
		return new Blob([file.encoding === 'base64' ? decodeBase64(data) : data], {
			type
		})
	}
	if (data instanceof ArrayBuffer) return new Blob([data], { type })
	// Copy the view so only its bytes (not the whole underlying buffer) are sent.
	const bytes = new Uint8Array(data.byteLength)
	bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
	return new Blob([bytes], { type })
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

function parseBody(text: string): unknown {
	if (!text) return undefined
	try {
		return JSON.parse(text)
	} catch {
		return text
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function getErrorCode(data: unknown): number | undefined {
	return isRecord(data) && typeof data.code === 'number' ? data.code : undefined
}

function getRetryAfter(response: Response, data: unknown): number | undefined {
	// The JSON body has millisecond precision; the header is rounded up.
	const fromBody =
		isRecord(data) && typeof data.retry_after === 'number'
			? data.retry_after
			: undefined
	const header =
		response.headers.get('retry-after') ??
		response.headers.get('x-ratelimit-reset-after')
	const seconds = fromBody ?? (header ? Number.parseFloat(header) : undefined)
	return seconds !== undefined && Number.isFinite(seconds) && seconds >= 0
		? Math.ceil(seconds * 1000)
		: undefined
}

/**
 * Turns Discord's nested `errors` object into readable lines like
 * `embeds.0.description: Must be 4096 or fewer in length.`
 */
function flattenDiscordErrors(errors: unknown, path = ''): string[] {
	if (!isRecord(errors)) return []
	const messages: string[] = []
	for (const [key, value] of Object.entries(errors)) {
		if (key === '_errors' && Array.isArray(value)) {
			for (const item of value) {
				if (isRecord(item) && typeof item.message === 'string') {
					messages.push(path ? `${path}: ${item.message}` : item.message)
				}
			}
		} else {
			messages.push(
				...flattenDiscordErrors(value, path ? `${path}.${key}` : key)
			)
		}
	}
	return messages
}

function formatErrorMessage(response: Response, data: unknown): string {
	if (isRecord(data) && typeof data.message === 'string') {
		const code = typeof data.code === 'number' ? ` (code ${data.code})` : ''
		const details = flattenDiscordErrors(data.errors).slice(0, 5)
		return details.length > 0
			? `${data.message}${code}: ${details.join('; ')}`
			: `${data.message}${code}`
	}
	if (typeof data === 'string' && data) return data
	return response.statusText || `HTTP ${response.status}`
}
