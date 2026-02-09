import type {
	IAttachment,
	IEmbed,
	IWebhook,
	IWebhookParameter,
	WebhookFile
} from '../types'
import type { Embed } from './Embed'
import { ValidationError } from './Errors'
import {
	RequestClient,
	type RequestResult,
	type RetryConfig
} from './RequestClient'

/**
 * Webhook class
 *
 * ```ts
 * import { Webhook } from '@teever/ez-hook'
 * const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz')
 * webhook.setUsername('username')
 * webhook.setContent('Hello world!')
 *
 * const success = await webhook.send()
 * ```
 */

export class Webhook {
	protected client: RequestClient

	/**
	 * Webhook username override.
	 */
	protected username?: string

	/**
	 * Webhook avatar override.
	 */
	protected avatar_url?: string

	/**
	 * Whether or not this notification should be read as text to speech.
	 */
	protected tts?: boolean

	/**
	 * Message contents.
	 * Max 2000 characters
	 */
	protected content?: string

	/**
	 * Contents of a file being sent.
	 */
	protected file?: WebhookFile

	/**
	 * Embedded "rich" content.
	 */
	protected embeds?: Array<IEmbed>

	/**
	 *
	 * @param webhookUrl
	 */
	constructor(webhookUrl: string, retryConfig?: Partial<RetryConfig>) {
		this.client = new RequestClient(webhookUrl, retryConfig)
	}

	/**
	 * Set Webhook username override.
	 *
	 * @param username string
	 * @returns Embed
	 */
	public setUsername(username: string): Webhook {
		this.username = username
		return this
	}

	/**
	 * Set Webhook avatar override.
	 *
	 * @param url string
	 * @returns Embed
	 */
	public setAvatarUrl(url: string): Webhook {
		this.avatar_url = url
		return this
	}

	/**
	 * Set Whether or not this notification should be read as text to speech.
	 *
	 * @param flag boolean
	 * @returns Embed
	 */
	public setTTS(flag: boolean): Webhook {
		this.tts = flag
		return this
	}

	/**
	 * Set Message contents.
	 * Max 2000 characters
	 *
	 * @param content string
	 * @returns Embed
	 */
	public setContent(content: string): Webhook {
		if (content.length > 2000) {
			throw new ValidationError(
				'Content length exceeds 2000 characters',
				'content',
				2000,
				content.length
			)
		}
		this.content = content
		return this
	}

	/**
	 * Add Embedded "rich" content.
	 * Max 10 embeds
	 *
	 * @param embed string
	 * @returns Embed
	 */
	public addEmbed(embed: Embed): Webhook {
		if (typeof this.embeds === 'undefined') {
			this.embeds = [embed.toObject()]
		} else if (this.embeds.length < 10) {
			this.embeds.push(embed.toObject())
		} else {
			throw new ValidationError('Embeds length exceeds 10', 'embeds', 10)
		}

		return this
	}

	/**
	 * Set Contents of a file being sent.
	 *
	 * @param file Attachment | string
	 * @returns Embed
	 */
	public setFile(file: WebhookFile): Webhook {
		this.file = file
		return this
	}

	/**
	 * Validate the webhook
	 *
	 * @returns void
	 */
	public validate(): void {
		if ((this.content?.length ?? 0) > 2000) {
			throw new ValidationError(
				'Content length exceeds 2000 characters',
				'content',
				2000,
				this.content?.length
			)
		}

		if ((this.embeds?.length ?? 0) > 10) {
			throw new ValidationError('Embeds length exceeds 10', 'embeds', 10)
		}

		for (const embed of this.embeds ?? []) {
			if ((embed.fields?.length ?? 0) > 25) {
				throw new ValidationError('Fields length exceeds 25', 'fields', 25)
			}

			for (const field of embed.fields ?? []) {
				if ((field.name?.length ?? 0) > 255) {
					throw new ValidationError(
						'Field name length exceeds 255 characters',
						'field.name',
						255,
						field.name?.length
					)
				}

				if ((field.value?.length ?? 0) > 1024) {
					throw new ValidationError(
						'Field value length exceeds 1024 characters',
						'field.value',
						1024,
						field.value?.length
					)
				}
			}
		}
	}

	/**
	 * Send webhook
	 *
	 * @returns Promise<boolean>
	 */
	public async send(
		init?: Parameters<RequestClient['send']>[2]
	): Promise<RequestResult> {
		this.validate()
		return this.client.send('POST', this.toObject(), init)
	}

	/**
	 * Modify the current webhook.
	 *
	 * @param options IWebHookParameter
	 * @returns Promise<IWebhookResponse>
	 */
	public async modify(
		options: IWebhookParameter,
		init?: Parameters<RequestClient['send']>[2]
	): Promise<RequestResult> {
		return this.client.send('PATCH', options, init)
	}

	/**
	 * Get the current webhook.
	 *
	 * @returns Promise<IWebhookResponse>
	 */
	public async get(
		init?: Parameters<RequestClient['send']>[2]
	): Promise<RequestResult> {
		return this.client.send('GET', '', init)
	}

	/**
	 * Check whether or not the current webhook is valid.
	 *
	 * @returns Promise<boolean>
	 */
	public async isValid(): Promise<boolean> {
		return fetch(this.client.webhookUrl)
			.then(() => true)
			.catch(() => false)
	}

	/**
	 * Generate parameter ready object
	 *
	 * @returns IWebhook
	 */
	public toObject(): IWebhook {
		return {
			username: this.username,
			avatar_url: this.avatar_url,
			tts: this.tts,
			content: this.content,
			file: this.file as IAttachment | string | undefined,
			embeds: this.embeds
		}
	}

	/**
	 * Get the current retry configuration.
	 *
	 * @returns RetryConfig
	 */
	public getRetryConfig(): RetryConfig {
		return this.client.retryConfig
	}
}
