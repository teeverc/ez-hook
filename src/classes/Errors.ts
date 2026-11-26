/**
 * Base class for every error thrown by ez-hook.
 * Catch this to handle any library error in one place.
 */
export class EzHookError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = new.target.name
	}
}

/**
 * Thrown when a message, embed or option breaks one of Discord's limits.
 * Thrown before any request is made.
 *
 * @example
 * ```ts
 * try {
 *   await hook.send('a'.repeat(2001))
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.field) // "content"
 *   }
 * }
 * ```
 */
export class ValidationError extends EzHookError {
	constructor(
		message: string,
		/** Path of the invalid value, e.g. `embeds[0].fields[3].value`. */
		public readonly field?: string,
		/** The limit that was exceeded, when relevant. */
		public readonly maxLength?: number,
		/** The actual length/value, when relevant. */
		public readonly actualLength?: number
	) {
		super(message)
	}
}

export interface WebhookErrorOptions {
	/** Discord JSON error code (e.g. 50035 for "Invalid Form Body"). */
	code?: number
	/** Parsed response body (JSON object, or raw text). */
	body?: unknown
	/** Underlying error, e.g. the fetch failure. */
	cause?: unknown
}

/**
 * Thrown when Discord answers with a non-2xx status, or the request fails.
 *
 * @example
 * ```ts
 * try {
 *   await hook.send('Hello')
 * } catch (error) {
 *   if (error instanceof WebhookError) {
 *     console.log(error.status, error.code, error.message)
 *   }
 * }
 * ```
 */
export class WebhookError extends EzHookError {
	/** Discord JSON error code (e.g. 50035 for "Invalid Form Body"), if any. */
	public readonly code?: number
	/** Parsed response body (JSON object, or raw text), if any. */
	public readonly body?: unknown

	constructor(
		message: string,
		/** HTTP status code. 0 when no response was received. */
		public readonly statusCode?: number,
		/** Milliseconds to wait before retrying, when Discord provided it. */
		public readonly retryAfter?: number,
		options: WebhookErrorOptions = {}
	) {
		super(message, { cause: options.cause })
		this.code = options.code
		this.body = options.body
	}

	/** HTTP status code. 0 when no response was received. */
	get status(): number {
		return this.statusCode ?? 0
	}
}

/**
 * Thrown when Discord keeps rate limiting the webhook after all retries,
 * or asks to wait longer than `retry.maxDelay`.
 */
export class RateLimitError extends WebhookError {
	constructor(retryAfter?: number, options: WebhookErrorOptions = {}) {
		super('Rate limit exceeded', 429, retryAfter, options)
	}
}

/**
 * Thrown when the webhook (or message) does not exist, e.g. it was deleted
 * or the URL/token is wrong.
 */
export class WebhookNotFoundError extends WebhookError {
	constructor(
		message = 'Webhook not found or invalid URL',
		options: WebhookErrorOptions = {}
	) {
		super(message, 404, undefined, options)
	}
}

/**
 * Thrown when no response was received (DNS failure, connection reset, ...).
 * `status` is always 0.
 */
export class NetworkError extends WebhookError {
	constructor(message = 'Network error', options: WebhookErrorOptions = {}) {
		super(message, 0, undefined, options)
	}
}

/**
 * Thrown when a request takes longer than `timeoutMs`.
 */
export class TimeoutError extends NetworkError {
	constructor(timeoutMs: number, options: WebhookErrorOptions = {}) {
		super(`Request timed out after ${timeoutMs}ms`, options)
	}
}

/**
 * Thrown when a request is cancelled through the `signal` option.
 */
export class RequestAbortedError extends NetworkError {
	constructor(options: WebhookErrorOptions = {}) {
		super('Request aborted', options)
	}
}
