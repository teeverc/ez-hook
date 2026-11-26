import type { IAttachment } from './IAttachment.js'
import type { IEmbed } from './IEmbed.js'

/**
 * Message returned by Discord when a webhook message is sent, fetched or edited.
 * Only the most commonly used fields are typed; everything Discord returns is present at runtime.
 * @see https://discord.com/developers/docs/resources/message#message-object
 */
export interface IMessage {
	/** Message ID (snowflake). */
	id: string

	/** Channel (or thread) ID the message was posted in. */
	channel_id: string

	/** Message type. */
	type: number

	/** Message content. */
	content: string

	/** ISO8601 timestamp of when the message was sent. */
	timestamp: string

	/** ISO8601 timestamp of the last edit, or null. */
	edited_timestamp: string | null

	/** Whether this was a TTS message. */
	tts: boolean

	/** Whether the message mentions everyone. */
	mention_everyone: boolean

	/** Embeds attached to the message. */
	embeds: IEmbed[]

	/** Files attached to the message. */
	attachments: IAttachment[]

	/** Message flags bitfield. */
	flags?: number

	/** ID of the webhook that sent the message. */
	webhook_id?: string

	/** Author shown on the message (webhook name/avatar or override). */
	author: {
		id: string
		username: string
		avatar: string | null
		bot?: boolean
		[key: string]: unknown
	}

	/** Whether the message is pinned. */
	pinned: boolean

	[key: string]: unknown
}
