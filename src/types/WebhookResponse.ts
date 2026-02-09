/**
 * Response interface for webhook operations
 */
export interface WebhookResponse {
	/** Whether the operation was successful */
	success: boolean
	/** HTTP status code from the response */
	statusCode?: number
	/** Error message if the operation failed */
	error?: string
	/** Time to wait before retrying (in milliseconds) */
	retryAfter?: number
	/** Response headers */
	headers?: Record<string, string>
}

/**
 * Validation result interface
 */
export interface ValidationResult {
	/** Whether the validation passed */
	isValid: boolean
	/** List of validation errors */
	errors: ValidationError[]
}

/**
 * Individual validation error
 */
export interface ValidationError {
	/** Field that failed validation */
	field: string
	/** Error message */
	message: string
	/** Expected value or constraint */
	expected?: string | number
	/** Actual value that failed */
	actual?: string | number
}
