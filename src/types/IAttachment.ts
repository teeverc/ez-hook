export interface IAttachment {
	/**
	 * Attachment ID.
	 */
	id: string

	/**
	 * Name of the file attached.
	 */
	filename: string

	/**
	 * Size of the file in bytes.
	 */
	size: number

	/**
	 * Source URL of the file.
	 */
	url: string

	/**
	 * A proxied URL of the file.
	 */
	proxy_url: string

	/**
	 * Height of the file. (if image)
	 */
	height?: number

	/**
	 * Width of the file. (if image)
	 */
	width?: number

	/**
	 * 	Base64 encoded bytearray representing a sampled waveform (currently for voice messages)
	 */
	waveform?: string

	/**
	 * Description for the file (max 1024 characters)
	 */
	description?: string
}
