import type {
	IAttachment,
	IAuthor,
	IEmbed,
	IField,
	IFooter,
	IImage,
	IProvider,
	IThumbnail,
	IVideo
} from '../types/index.js'
import { ValidationError } from './Errors.js'
import { Limits, assertMaxCount, assertMaxLength } from './validate.js'

/**
 * Embed builder.
 *
 * ```ts
 * import { Embed, Webhook } from '@teever/ez-hook'
 *
 * const embed = new Embed()
 * 	.setTitle('Deploy finished')
 * 	.setDescription('All checks passed')
 * 	.setColor('#00ff00')
 * 	.addField('Duration', '42s', true)
 * 	.setTimestamp()
 *
 * await new Webhook(url).send({ embeds: [embed] })
 *
 * // Or start from a plain object
 * const fromObject = new Embed({ title: 'Hello', color: 0x5865f2 })
 * ```
 */
export class Embed {
	protected data: IEmbed

	/**
	 * @param data Optional plain embed object to start from.
	 */
	constructor(data: IEmbed = {}) {
		this.data = {
			...data,
			fields: data.fields ? [...data.fields] : undefined
		}
	}

	/**
	 * Create an embed from a plain object.
	 */
	public static from(data: IEmbed): Embed {
		return new Embed(data)
	}

	/**
	 * Set the title (max 256 characters).
	 */
	public setTitle(title: string): this {
		assertMaxLength(title, Limits.embedTitle, 'title', 'Title')
		this.data.title = title
		return this
	}

	/**
	 * Set the URL the title links to.
	 */
	public setUrl(url: string): this {
		this.data.url = url
		return this
	}

	/**
	 * @deprecated Use {@link Embed.setUrl}.
	 */
	public setURL(url: string): this {
		return this.setUrl(url)
	}

	/**
	 * Set the description (max 4096 characters).
	 */
	public setDescription(description: string): this {
		assertMaxLength(
			description,
			Limits.embedDescription,
			'description',
			'Description'
		)
		this.data.description = description
		return this
	}

	/**
	 * Set the timestamp shown in the footer. Defaults to now.
	 */
	public setTimestamp(date: Date | number | string = new Date()): this {
		const value = new Date(date)
		if (Number.isNaN(value.getTime())) {
			throw new ValidationError('Timestamp is not a valid date', 'timestamp')
		}
		this.data.timestamp = value.toISOString()
		return this
	}

	/**
	 * Set the side color, as a number (`0x5865f2`) or hex string (`'#5865f2'` or `'5865f2'`).
	 */
	public setColor(color: number | string): this {
		if (typeof color === 'string') {
			const hex = color.startsWith('#') ? color.slice(1) : color
			if (!/^[0-9a-fA-F]{1,6}$/.test(hex)) {
				throw new ValidationError('Color must be a valid hex color', 'color')
			}
			this.data.color = Number.parseInt(hex, 16)
			return this
		}

		if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
			throw new ValidationError(
				'Color must be an integer between 0 and 16777215',
				'color',
				0xffffff,
				color
			)
		}
		this.data.color = color
		return this
	}

	/**
	 * Set the footer (text max 2048 characters).
	 */
	public setFooter(footer: IFooter): this
	public setFooter(
		text: string,
		icon_url?: string | IAttachment,
		proxy_icon_url?: string
	): this
	public setFooter(
		footerOrText: IFooter | string,
		icon_url?: string | IAttachment,
		proxy_icon_url?: string
	): this {
		const footer =
			typeof footerOrText === 'string'
				? { text: footerOrText, icon_url, proxy_icon_url }
				: footerOrText
		assertMaxLength(
			footer.text,
			Limits.footerText,
			'footer.text',
			'Footer text'
		)
		this.data.footer = footer
		return this
	}

	/**
	 * Set the large image.
	 */
	public setImage(image: IImage): this
	public setImage(url: string, height?: number, width?: number): this
	public setImage(
		imageOrUrl: IImage | string,
		height?: number,
		width?: number
	): this {
		this.data.image =
			typeof imageOrUrl === 'string'
				? { url: imageOrUrl, height, width }
				: imageOrUrl
		return this
	}

	/**
	 * Set the small thumbnail image.
	 */
	public setThumbnail(thumbnail: IThumbnail): this
	public setThumbnail(url: string, height?: number, width?: number): this
	public setThumbnail(
		thumbnailOrUrl: IThumbnail | string,
		height?: number,
		width?: number
	): this {
		this.data.thumbnail =
			typeof thumbnailOrUrl === 'string'
				? { url: thumbnailOrUrl, height, width }
				: thumbnailOrUrl
		return this
	}

	/**
	 * Set video information.
	 * Note: Discord ignores videos in embeds sent by webhooks.
	 */
	public setVideo(video: IVideo): this
	public setVideo(url: string, height?: number, width?: number): this
	public setVideo(
		videoOrUrl: IVideo | string,
		height?: number,
		width?: number
	): this {
		this.data.video =
			typeof videoOrUrl === 'string'
				? { url: videoOrUrl, height, width }
				: videoOrUrl
		return this
	}

	/**
	 * Set provider information.
	 * Note: Discord ignores providers in embeds sent by webhooks.
	 */
	public setProvider(provider: IProvider): this
	public setProvider(name: string, url?: string): this
	public setProvider(providerOrName: IProvider | string, url?: string): this {
		this.data.provider =
			typeof providerOrName === 'string'
				? { name: providerOrName, url }
				: providerOrName
		return this
	}

	/**
	 * Set the author shown above the title (name max 256 characters).
	 */
	public setAuthor(author: IAuthor): this
	public setAuthor(name: string, url?: string, icon_url?: string): this
	public setAuthor(
		authorOrName: IAuthor | string,
		url?: string,
		icon_url?: string
	): this {
		const author =
			typeof authorOrName === 'string'
				? { name: authorOrName, url, icon_url }
				: authorOrName
		assertMaxLength(
			author.name,
			Limits.authorName,
			'author.name',
			'Author name'
		)
		this.data.author = author
		return this
	}

	/**
	 * Add a field (max 25 fields; name max 256, value max 1024 characters).
	 */
	public addField(field: IField): this
	public addField(name: string, value: string, inline?: boolean): this
	public addField(
		fieldOrName: IField | string,
		value?: string,
		inline = false
	): this {
		const field =
			typeof fieldOrName === 'string'
				? { name: fieldOrName, value: value ?? '', inline }
				: fieldOrName
		return this.addFields(field)
	}

	/**
	 * Add several fields at once.
	 */
	public addFields(...fields: IField[]): this {
		const current = this.data.fields ?? []
		assertMaxCount(
			current.length + fields.length,
			Limits.embedFields,
			'fields',
			'fields'
		)
		for (const field of fields) assertField(field)
		this.data.fields = [...current, ...fields]
		return this
	}

	/**
	 * Replace all fields.
	 */
	public setFields(fields: IField[]): this {
		this.data.fields = []
		return this.addFields(...fields)
	}

	/**
	 * Get the plain embed object sent to Discord.
	 */
	public toObject(): IEmbed {
		const embed: IEmbed = { type: 'rich' }
		for (const [key, value] of Object.entries(this.data)) {
			if (value !== undefined) (embed as Record<string, unknown>)[key] = value
		}
		if (this.data.fields) embed.fields = [...this.data.fields]
		return embed
	}

	/**
	 * Called by `JSON.stringify`.
	 */
	public toJSON(): IEmbed {
		return this.toObject()
	}
}

function assertField(field: IField): void {
	if (!field.name) {
		throw new ValidationError('Field name is required', 'field.name')
	}
	if (!field.value) {
		throw new ValidationError('Field value is required', 'field.value')
	}
	assertMaxLength(field.name, Limits.fieldName, 'field.name', 'Field name')
	assertMaxLength(field.value, Limits.fieldValue, 'field.value', 'Field value')
}
