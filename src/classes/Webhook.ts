import type {
	IAllowedMentions,
	IEmbed,
	IMessage,
	IWebhook,
	IWebhookParameter,
	IWebhookResponse,
	WebhookFile
} from '../types/index.js'
import { Embed } from './Embed.js'
import { EzHookError, ValidationError } from './Errors.js'
import { type MessageFlagsInput, resolveFlags } from './MessageFlags.js'
import {
	RequestClient,
	type RequestOptions,
	type RetryConfig
} from './RequestClient.js'
import {
	Limits,
	assertMaxCount,
	assertMaxLength,
	validateMessage
} from './validate.js'

/**
 * A message to send. Every field is optional, but a message needs
 * content, at least one embed, or a file.
 */
export interface WebhookMessage {
	/** Message text (max 2000 characters). */
	content?: string
	/** Override the webhook's name for this message (max 80 characters). */
	username?: string
	/** Override the webhook's avatar for this message. */
	avatarUrl?: string
	/** Read the message aloud with text to speech. */
	tts?: boolean
	/** Embeds, as `Embed` builders or plain objects (max 10). */
	embeds?: Array<Embed | IEmbed>
	/** Files to upload (max 10). A plain string is sent as `file.txt`. */
	files?: WebhookFile[]
	/** Control who gets pinged. `{ parse: [] }` disables all pings. */
	allowedMentions?: IAllowedMentions
	/** Message flags, e.g. `['SuppressNotifications']`. */
	flags?: MessageFlagsInput
	/** Post into an existing thread of the webhook's channel. */
	threadId?: string
	/** Create a new thread with this name (forum and media channels only). */
	threadName?: string
	/** Tag IDs for the new thread (forum and media channels only). */
	appliedTags?: string[]
}

/**
 * Fields that can be changed when editing a message.
 */
export type WebhookMessageEdit = Pick<
	WebhookMessage,
	'content' | 'embeds' | 'files' | 'allowedMentions' | 'flags' | 'threadId'
>

export interface SendOptions extends RequestOptions {
	/**
	 * Wait for Discord to confirm the message and return it. Default: `true`.
	 * With `false`, Discord may not report some errors and nothing is returned.
	 */
	wait?: boolean
}

export interface MessageOptions extends RequestOptions {
	/** Thread the message lives in, if it isn't in the webhook's channel. */
	threadId?: string
}

export interface WebhookOptions {
	/** Retry behaviour for rate limits, server errors and network errors. */
	retry?: Partial<RetryConfig>
	/** Default timeout for each attempt, in ms. */
	timeoutMs?: number
	/** Headers added to every request. */
	headers?: HeadersInit
	/** Default username for every message. */
	username?: string
	/** Default avatar URL for every message. */
	avatarUrl?: string
	/** Default allowed mentions for every message, e.g. `{ parse: [] }`. */
	allowedMentions?: IAllowedMentions
}

/**
 * Result of {@link Webhook.trySend}: never throws, check `ok` instead.
 */
export type Result<T> =
	| { ok: true; data: T; error?: undefined }
	| { ok: false; data?: undefined; error: EzHookError }

const RETRY_KEYS = ['maxRetries', 'baseDelay', 'maxDelay'] as const

/**
 * Discord webhook client.
 *
 * ```ts
 * import { Webhook } from '@teever/ez-hook'
 *
 * const hook = new Webhook(process.env.DISCORD_WEBHOOK_URL!)
 *
 * // One call
 * const message = await hook.send('Deploy finished ✅')
 *
 * // Or with options
 * await hook.send({ content: 'Report', embeds: [embed], files: [file] })
 *
 * // Or with the builder
 * await hook.setUsername('CI').setContent('Build passed').send()
 * ```
 *
 * Methods that talk to Discord throw on failure: `ValidationError` for invalid input,
 * `WebhookError` (and subclasses) for HTTP/network failures. Use {@link Webhook.trySend}
 * if you prefer a result object.
 */
export class Webhook {
	protected client: RequestClient
	protected defaults: WebhookMessage
	/** Message built with the setter methods. Used by `send()` and kept after sending. */
	protected draft: WebhookMessage = {}

	/**
	 * @param webhookUrl Webhook URL, e.g. `https://discord.com/api/webhooks/{id}/{token}`.
	 * @param options Client options. A plain retry config (`{ maxRetries }`) is still accepted but deprecated.
	 */
	constructor(
		webhookUrl: string,
		options: WebhookOptions | Partial<RetryConfig> = {}
	) {
		const opts: WebhookOptions = RETRY_KEYS.some((key) => key in options)
			? { retry: options as Partial<RetryConfig> }
			: (options as WebhookOptions)

		this.client = new RequestClient(webhookUrl, {
			retry: opts.retry,
			headers: opts.headers,
			timeoutMs: opts.timeoutMs
		})
		this.defaults = {
			username: opts.username,
			avatarUrl: opts.avatarUrl,
			allowedMentions: opts.allowedMentions
		}
	}

	// ---------------------------------------------------------------------------
	// Builder
	// ---------------------------------------------------------------------------

	/** Set the username override (max 80 characters). */
	public setUsername(username: string): this {
		assertMaxLength(username, Limits.username, 'username', 'Username')
		this.draft.username = username
		return this
	}

	/** Set the avatar URL override. */
	public setAvatarUrl(url: string): this {
		this.draft.avatarUrl = url
		return this
	}

	/** Read the message aloud with text to speech. */
	public setTTS(flag: boolean): this {
		this.draft.tts = flag
		return this
	}

	/** Set the message text (max 2000 characters). */
	public setContent(content: string): this {
		assertMaxLength(content, Limits.content, 'content', 'Content')
		this.draft.content = content
		return this
	}

	/**
	 * Add an embed (max 10). Builders are serialized when the message is sent,
	 * so later changes to the embed are included.
	 */
	public addEmbed(embed: Embed | IEmbed): this {
		const embeds = this.draft.embeds ?? []
		assertMaxCount(embeds.length + 1, Limits.embeds, 'embeds', 'embeds')
		this.draft.embeds = [...embeds, embed]
		return this
	}

	/** Replace all embeds (max 10). */
	public setEmbeds(embeds: Array<Embed | IEmbed>): this {
		assertMaxCount(embeds.length, Limits.embeds, 'embeds', 'embeds')
		this.draft.embeds = [...embeds]
		return this
	}

	/** Attach a file, replacing any files already attached. */
	public setFile(file: WebhookFile): this {
		this.draft.files = [file]
		return this
	}

	/** Attach another file (max 10). */
	public addFile(file: WebhookFile): this {
		const files = this.draft.files ?? []
		assertMaxCount(files.length + 1, Limits.files, 'files', 'files')
		this.draft.files = [...files, file]
		return this
	}

	/** Control who gets pinged. `{ parse: [] }` disables all pings. */
	public setAllowedMentions(allowedMentions: IAllowedMentions): this {
		this.draft.allowedMentions = allowedMentions
		return this
	}

	/** Set message flags, e.g. `['SuppressNotifications']`. */
	public setFlags(flags: MessageFlagsInput): this {
		this.draft.flags = flags
		return this
	}

	/** Post into an existing thread of the webhook's channel. */
	public setThreadId(threadId: string): this {
		this.draft.threadId = threadId
		return this
	}

	/** Create a new thread with this name (forum and media channels only). */
	public setThreadName(threadName: string): this {
		assertMaxLength(threadName, Limits.threadName, 'threadName', 'Thread name')
		this.draft.threadName = threadName
		return this
	}

	/** Reset everything set with the builder methods. Constructor defaults are kept. */
	public clear(): this {
		this.draft = {}
		return this
	}

	/**
	 * Check the builder message against Discord's limits.
	 * Throws `ValidationError` if something is wrong.
	 */
	public validate(): void {
		const message = this.resolve()
		validateMessage(this.toBody(message), message.files ?? [])
	}

	/**
	 * The JSON body that `send()` would post (without files).
	 */
	public toObject(): IWebhook {
		return this.toBody(this.resolve())
	}

	/** Current retry configuration. */
	public getRetryConfig(): RetryConfig {
		return { ...this.client.retryConfig }
	}

	// ---------------------------------------------------------------------------
	// Messages
	// ---------------------------------------------------------------------------

	/**
	 * Send a message and return it.
	 *
	 * The message is built from the constructor defaults, then the builder methods,
	 * then `message` (a string is used as `content`).
	 *
	 * @throws {ValidationError} If the message breaks one of Discord's limits.
	 * @throws {WebhookError} If Discord rejects the request (see subclasses).
	 */
	public send(
		message?: string | WebhookMessage,
		options?: SendOptions & { wait?: true }
	): Promise<IMessage>
	public send(
		message: string | WebhookMessage | undefined,
		options: SendOptions & { wait: false }
	): Promise<void>
	public send(
		message?: string | WebhookMessage,
		options?: SendOptions
	): Promise<IMessage | void>
	public async send(
		message?: string | WebhookMessage,
		options: SendOptions = {}
	): Promise<IMessage | void> {
		const resolved = this.resolve(message)
		const body = this.toBody(resolved)
		const files = resolved.files ?? []
		validateMessage(body, files)

		const { wait = true, ...requestOptions } = options
		const result = await this.client.request<IMessage>(
			'POST',
			{
				query: { wait, thread_id: resolved.threadId },
				body,
				files
			},
			requestOptions
		)
		return wait ? result : undefined
	}

	/**
	 * Like {@link Webhook.send}, but never throws: returns `{ ok, data, error }`.
	 *
	 * ```ts
	 * const result = await hook.trySend('Hello')
	 * if (!result.ok) console.error(result.error.message)
	 * ```
	 */
	public async trySend(
		message?: string | WebhookMessage,
		options: Omit<SendOptions, 'wait'> = {}
	): Promise<Result<IMessage>> {
		try {
			return { ok: true, data: await this.send(message, options) }
		} catch (error) {
			return { ok: false, error: toEzHookError(error) }
		}
	}

	/**
	 * Fetch a message previously sent by this webhook.
	 */
	public async getMessage(
		messageId: string,
		options: MessageOptions = {}
	): Promise<IMessage> {
		const { threadId, ...requestOptions } = options
		return this.client.request<IMessage>(
			'GET',
			{ path: messagePath(messageId), query: { thread_id: threadId } },
			requestOptions
		)
	}

	/**
	 * Edit a message previously sent by this webhook and return the updated message.
	 * Only the given fields change. Passing `files` replaces the message's attachments.
	 */
	public async editMessage(
		messageId: string,
		edit: string | WebhookMessageEdit,
		options: RequestOptions = {}
	): Promise<IMessage> {
		const message: WebhookMessage =
			typeof edit === 'string' ? { content: edit } : edit
		const body = this.toBody(message)
		const files = message.files ?? []
		validateMessage(body, files, { allowEmpty: true })

		return this.client.request<IMessage>(
			'PATCH',
			{
				path: messagePath(messageId),
				query: { thread_id: message.threadId },
				body,
				files
			},
			options
		)
	}

	/**
	 * Delete a message previously sent by this webhook.
	 */
	public async deleteMessage(
		messageId: string,
		options: MessageOptions = {}
	): Promise<void> {
		const { threadId, ...requestOptions } = options
		await this.client.request(
			'DELETE',
			{ path: messagePath(messageId), query: { thread_id: threadId } },
			requestOptions
		)
	}

	// ---------------------------------------------------------------------------
	// Webhook management
	// ---------------------------------------------------------------------------

	/**
	 * Fetch the webhook's details (name, channel, guild, ...).
	 */
	public async get(options: RequestOptions = {}): Promise<IWebhookResponse> {
		return this.client.request<IWebhookResponse>('GET', {}, options)
	}

	/**
	 * Change the webhook's default name or avatar and return the updated webhook.
	 */
	public async modify(
		changes: IWebhookParameter,
		options: RequestOptions = {}
	): Promise<IWebhookResponse> {
		if (changes.name !== undefined) {
			assertMaxLength(changes.name, Limits.username, 'name', 'Name')
		}
		return this.client.request<IWebhookResponse>(
			'PATCH',
			{ body: changes },
			options
		)
	}

	/**
	 * Permanently delete the webhook. The URL stops working afterwards.
	 */
	public async deleteWebhook(options: RequestOptions = {}): Promise<void> {
		await this.client.request('DELETE', {}, options)
	}

	/**
	 * Check whether the webhook URL works. Never throws.
	 */
	public async isValid(options: RequestOptions = {}): Promise<boolean> {
		try {
			await this.get(options)
			return true
		} catch {
			return false
		}
	}

	// ---------------------------------------------------------------------------
	// Internals
	// ---------------------------------------------------------------------------

	private resolve(message?: string | WebhookMessage): WebhookMessage {
		const input = typeof message === 'string' ? { content: message } : message
		return { ...this.defaults, ...this.draft, ...withoutUndefined(input) }
	}

	private toBody(message: WebhookMessage): IWebhook {
		const body: IWebhook = {
			content: message.content,
			username: message.username,
			avatar_url: message.avatarUrl,
			tts: message.tts,
			embeds: message.embeds?.map((embed) =>
				embed instanceof Embed ? embed.toObject() : embed
			),
			allowed_mentions: message.allowedMentions,
			flags: resolveFlags(message.flags),
			thread_name: message.threadName,
			applied_tags: message.appliedTags
		}
		return withoutUndefined(body)
	}
}

function messagePath(messageId: string): string {
	if (!messageId) {
		throw new ValidationError('A message ID is required', 'messageId')
	}
	return `/messages/${encodeURIComponent(messageId)}`
}

function withoutUndefined<T extends object>(value: T | undefined): T {
	if (!value) return {} as T
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined)
	) as T
}

function toEzHookError(error: unknown): EzHookError {
	if (error instanceof EzHookError) return error
	return new EzHookError(
		error instanceof Error ? error.message : String(error),
		{ cause: error }
	)
}
