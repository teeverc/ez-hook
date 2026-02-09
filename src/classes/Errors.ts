/**
 * Base error class for ez-hook library
 */
export class EzHookError extends Error {
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Error thrown when webhook validation fails
 * @example
 * ```typescript
 * try {
 *   webhook.setContent('a'.repeat(2001)); // Too long
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(`Validation failed for field: ${error.field}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends EzHookError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly maxLength?: number,
		public readonly actualLength?: number
	) {
		super(message)
	}
}

/**
 * Error thrown when webhook HTTP request fails
 * @example
 * ```typescript
 * try {
 *   await webhook.send();
 * } catch (error) {
 *   if (error instanceof WebhookError) {
 *     console.log(`Request failed with status: ${error.statusCode}`);
 *     if (error.retryAfter) {
 *       console.log(`Retry after: ${error.retryAfter}ms`);
 *     }
 *   }
 * }
 * ```
 */
export class WebhookError extends EzHookError {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly retryAfter?: number
	) {
		super(message)
	}
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends WebhookError {
	constructor(retryAfter?: number) {
		super('Rate limit exceeded', 429, retryAfter)
	}
}

/**
 * Error thrown when webhook URL is invalid or unreachable
 */
export class WebhookNotFoundError extends WebhookError {
	constructor() {
		super('Webhook not found or invalid URL', 404)
	}
}
