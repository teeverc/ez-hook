import type { IAllowedMentions } from './IAllowedMentions.js'
import type { IEmbed } from './IEmbed.js'

/**
 * JSON body sent to Discord's "Execute Webhook" endpoint (snake_case, as Discord expects it).
 */
export interface IWebhook {
	/** Webhook username override (1-80 characters). */
	username?: string

	/** Webhook avatar override. */
	avatar_url?: string

	/** Whether this message should be read as text to speech. */
	tts?: boolean

	/** Message contents (max 2000 characters). */
	content?: string

	/** Embedded "rich" content (max 10). */
	embeds?: Array<IEmbed>

	/** Which mentions are allowed to ping. */
	allowed_mentions?: IAllowedMentions

	/** Message flags bitfield. */
	flags?: number

	/** Name of the thread to create (forum and media channels only). */
	thread_name?: string

	/** Tag IDs to apply to the created thread (forum and media channels only). */
	applied_tags?: string[]
}
