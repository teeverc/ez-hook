/**
 * Delays the execution of the code for a specified number of seconds.
 * @param second - The number of seconds to delay.
 * @returns A Promise that resolves after the specified number of seconds.
 */
export function delay(second: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, second * 1000)
	})
}

export interface RetryConfig {
	maxRetries: number
	baseDelay: number
	maxDelay: number
}
export interface RequestResult {
	ok: boolean
	status: number
	retryAfter?: number
	bodyText?: string
	error?: string
}

export interface FilePayload {
	filename: string
	data: string | Blob | ArrayBuffer | ArrayBufferView
	encoding?: 'text' | 'base64'
	contentType?: string
	description?: string
}

export interface MultipartPayload {
	payload: unknown
	file: string | FilePayload
}

/**
 * Class for handling HTTP requests with customizable headers, body, and parameters.
 *
 * @class
 * @internal
 * @category Internal
 */
export class RequestClient {
	private static DEFAULT_RETRY_CONFIG: RetryConfig = {
		maxRetries: 3,
		baseDelay: 1000, // 1 second
		maxDelay: 60000 // 60 seconds
	}

	public webhookUrl: string
	public retryConfig: RetryConfig

	constructor(webhookUrl: string, retryConfig?: Partial<RetryConfig>) {
		this.webhookUrl = webhookUrl
		this.retryConfig = { ...RequestClient.DEFAULT_RETRY_CONFIG, ...retryConfig }
	}

	private calculateBackoff(retryCount: number): number {
		// Exponential backoff with jitter
		const exponential = Math.min(
			this.retryConfig.maxDelay,
			this.retryConfig.baseDelay * 2 ** retryCount
		)
		// Add random jitter +/- 20%
		const jitter = exponential * 0.2 * (Math.random() - 0.5)
		const withJitter = exponential + jitter
		return Math.max(0, withJitter)
	}

	private shouldRetry(status: number, retryCount: number): boolean {
		// Retry on rate limits and server errors
		return (
			retryCount < this.retryConfig.maxRetries &&
			(status === 429 || status === 0 || (status >= 500 && status < 600))
		)
	}

	private createSignal(
		signal: AbortSignal | undefined,
		timeoutMs: number | undefined
	): { signal?: AbortSignal; cleanup: () => void } {
		if (!timeoutMs) return { signal, cleanup: () => {} }

		const timeoutController = new AbortController()
		const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)

		if (!signal) {
			return {
				signal: timeoutController.signal,
				cleanup: () => clearTimeout(timeout)
			}
		}

		if (signal.aborted) timeoutController.abort(signal.reason)

		const abortTimeout = () => timeoutController.abort(signal.reason)
		signal.addEventListener('abort', abortTimeout, { once: true })

		return {
			signal: timeoutController.signal,
			cleanup: () => {
				clearTimeout(timeout)
				signal.removeEventListener('abort', abortTimeout)
			}
		}
	}

	private createBodyAndHeaders(
		method: 'GET' | 'POST' | 'PATCH',
		data: unknown,
		headers: HeadersInit
	): { body?: BodyInit; headers: HeadersInit } {
		if (method === 'GET') return { headers }

		if (this.isMultipartPayload(data)) {
			const formData = new FormData()
			formData.append(
				'payload_json',
				JSON.stringify(this.createMultipartJsonPayload(data))
			)

			if (typeof data.file === 'string') {
				formData.append('files[0]', new Blob([data.file]), 'file.txt')
			} else {
				const blob = this.createFileBlob(data.file)
				formData.append('files[0]', blob, data.file.filename)
			}

			return {
				body: formData,
				headers: this.removeContentTypeHeader(headers)
			}
		}

		return {
			body: JSON.stringify(data),
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		}
	}

	private isMultipartPayload(data: unknown): data is MultipartPayload {
		return (
			typeof data === 'object' &&
			data !== null &&
			'payload' in data &&
			'file' in data
		)
	}

	private createMultipartJsonPayload(data: MultipartPayload): unknown {
		if (typeof data.payload !== 'object' || data.payload === null) {
			return data.payload
		}

		const filename =
			typeof data.file === 'string' ? 'file.txt' : data.file.filename
		const description =
			typeof data.file === 'string' ? undefined : data.file.description

		return {
			...data.payload,
			attachments: [
				{
					id: 0,
					filename,
					description
				}
			]
		}
	}

	private createFileBlob(file: FilePayload): Blob {
		if (file.data instanceof Blob) return file.data

		if (typeof file.data === 'string' && file.encoding === 'base64') {
			return new Blob([this.decodeBase64(file.data)], {
				type: file.contentType
			})
		}

		return new Blob([this.toBlobPart(file.data)], { type: file.contentType })
	}

	private toBlobPart(data: FilePayload['data']): BlobPart {
		if (data instanceof Blob) return data
		if (typeof data === 'string' || data instanceof ArrayBuffer) return data

		const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
		return new Uint8Array(bytes).buffer as ArrayBuffer
	}

	private decodeBase64(value: string): ArrayBuffer {
		const binary = atob(value)
		const bytes = new Uint8Array(binary.length)

		for (let index = 0; index < binary.length; index++) {
			bytes[index] = binary.charCodeAt(index)
		}

		return bytes.buffer as ArrayBuffer
	}

	private isAbortError(
		error: unknown,
		signal: AbortSignal | undefined
	): boolean {
		return (
			signal?.aborted === true ||
			(error instanceof DOMException && error.name === 'AbortError') ||
			(error instanceof Error && error.name === 'AbortError')
		)
	}

	private removeContentTypeHeader(headers: HeadersInit): HeadersInit {
		if (headers instanceof Headers) {
			const nextHeaders = new Headers(headers)
			nextHeaders.delete('content-type')
			return nextHeaders
		}

		if (Array.isArray(headers)) {
			return headers.filter(([key]) => key.toLowerCase() !== 'content-type')
		}

		return Object.fromEntries(
			Object.entries(headers).filter(
				([key]) => key.toLowerCase() !== 'content-type'
			)
		)
	}

	public async send(
		method: 'GET' | 'POST' | 'PATCH',
		data: unknown,
		init?: Pick<RequestInit, 'signal' | 'headers'> & { timeoutMs?: number }
	): Promise<RequestResult> {
		let retryCount = 0

		while (true) {
			const { signal, headers = {}, timeoutMs } = init ?? {}
			const requestSignal = this.createSignal(signal ?? undefined, timeoutMs)
			const request = this.createBodyAndHeaders(method, data, headers)

			try {
				const response = await fetch(this.webhookUrl, {
					method,
					headers: request.headers,
					body: request.body,
					signal: requestSignal.signal ?? undefined
				})

				const text = await response.text()
				const retryAfterHeader =
					response.headers.get('retry-after') ??
					response.headers.get('x-ratelimit-reset-after') ??
					undefined
				const retryAfterSeconds = retryAfterHeader
					? Number.parseFloat(retryAfterHeader)
					: undefined

				const retryAfterMs =
					Number.isFinite(retryAfterSeconds) && retryAfterSeconds
						? retryAfterSeconds * 1000
						: undefined

				if (response.ok) {
					return {
						ok: true,
						status: response.status,
						retryAfter: retryAfterMs,
						bodyText: text || undefined
					}
				}

				if (this.shouldRetry(response.status, retryCount)) {
					retryCount++
					const delayMs =
						response.status === 429
							? (retryAfterMs ?? this.calculateBackoff(retryCount))
							: this.calculateBackoff(retryCount)

					await delay(delayMs / 1000)
					continue
				}

				return {
					ok: false,
					status: response.status,
					retryAfter: retryAfterMs,
					bodyText: text || undefined,
					error: text || response.statusText || `HTTP ${response.status}`
				}
			} catch (_error) {
				const message =
					_error instanceof Error
						? _error.message
						: _error
							? String(_error)
							: ''

				if (this.isAbortError(_error, requestSignal.signal)) {
					return {
						ok: false,
						status: 0,
						error: message || 'Request aborted'
					}
				}

				if (this.shouldRetry(0, retryCount)) {
					retryCount++
					await delay(this.calculateBackoff(retryCount) / 1000)
					continue
				}

				return {
					ok: false,
					status: 0,
					error: message || 'Network error'
				}
			} finally {
				requestSignal.cleanup()
			}
		}
	}
}
