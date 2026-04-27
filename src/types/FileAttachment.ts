/**
 * Simple file attachment interface for webhook files
 * This is different from IAttachment which represents Discord's attachment response
 */
export interface FileAttachment {
	/** Name of the file */
	filename: string
	/** File content. Strings are sent as text unless encoding is set to "base64". */
	data: string | Blob | ArrayBuffer | ArrayBufferView
	/** Set to "base64" when data is a base64 encoded string. Defaults to "text". */
	encoding?: 'text' | 'base64'
	/** MIME type of the file */
	contentType?: string
	/** Description of the file */
	description?: string
}

/**
 * Union type for file attachments - can be string content or file object
 */
export type WebhookFile = string | FileAttachment
