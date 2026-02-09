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
	private retryCount = 0
	public retryConfig: RetryConfig

	constructor(webhookUrl: string, retryConfig?: Partial<RetryConfig>) {
		this.webhookUrl = webhookUrl
		this.retryConfig = { ...RequestClient.DEFAULT_RETRY_CONFIG, ...retryConfig }
	}

	private calculateBackoff(): number {
		// Exponential backoff with jitter
		const exponential = Math.min(
			this.retryConfig.maxDelay,
			this.retryConfig.baseDelay * 2 ** this.retryCount
		)
		// Add random jitter +/- 20%
		const jitter = exponential * 0.2 * (Math.random() - 0.5)
		const withJitter = exponential + jitter
		return Math.max(0, withJitter)
	}

	private shouldRetry(status: number): boolean {
		// Retry on rate limits and server errors
		return (
			this.retryCount < this.retryConfig.maxRetries &&
			(status === 429 || status === 0 || (status >= 500 && status < 600))
		)
	}

	public async send(
		method: 'GET' | 'POST' | 'PATCH',
		data: unknown,
		init?: Pick<RequestInit, 'signal' | 'headers'> & { timeoutMs?: number }
	): Promise<RequestResult> {
		const { signal, headers = {}, timeoutMs } = init ?? {}
		const controller = timeoutMs ? new AbortController() : undefined
		const timeout = timeoutMs
			? setTimeout(() => controller?.abort(), timeoutMs)
			: undefined

		try {
			const response = await fetch(this.webhookUrl, {
				method,
				headers: {
					'Content-Type': 'application/json',
					...headers
				},
				body: method === 'GET' ? undefined : JSON.stringify(data),
				signal: controller?.signal ?? signal
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
				this.retryCount = 0
				return {
					ok: true,
					status: response.status,
					retryAfter: retryAfterMs,
					bodyText: text || undefined
				}
			}

			if (this.shouldRetry(response.status)) {
				this.retryCount++
				const delayMs =
					response.status === 429
						? (retryAfterMs ?? this.calculateBackoff())
						: this.calculateBackoff()

				await delay(delayMs / 1000)
				return this.send(method, data, init)
			}

			const errorResult: RequestResult = {
				ok: false,
				status: response.status,
				retryAfter: retryAfterMs,
				bodyText: text || undefined,
				error: text || response.statusText || `HTTP ${response.status}`
			}

			this.retryCount = 0
			return errorResult
		} catch (_error) {
			const message =
				_error instanceof Error ? _error.message : _error ? String(_error) : ''

			if (this.shouldRetry(0)) {
				this.retryCount++
				await delay(this.calculateBackoff() / 1000)
				return this.send(method, data, init)
			}

			this.retryCount = 0
			return {
				ok: false,
				status: 0,
				error: message || 'Network error'
			}
		} finally {
			if (timeout) clearTimeout(timeout)
		}
	}
}
