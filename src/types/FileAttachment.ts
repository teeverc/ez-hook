/**
 * Simple file attachment interface for webhook files
 * This is different from IAttachment which represents Discord's attachment response
 */
export interface FileAttachment {
	/** Name of the file */
	filename: string
	/** File content (base64 encoded or raw data) */
	data: string
	/** MIME type of the file */
	contentType?: string
	/** Description of the file */
	description?: string
}

/**
 * Union type for file attachments - can be string content or file object
 */
export type WebhookFile = string | FileAttachment
