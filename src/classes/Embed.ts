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
} from '../types'
import { ValidationError } from './Errors'

/**
 * Embed builder class
 *
 * ```ts
 * import { Webhook, Embed } from '@teever/ez-hook'
 *
 * const embed = new Embed()
 * 	.setTitle('Title')
 * 	.setDescription('Description')
 * 	.setColor(0x00ff00)
 * 	.setImage({
 * 		url: 'https://example.com/image.png'
 * 	})
 * 	.setAuthor({
 * 		name: 'Author',
 * 		url: 'https://example.com/author'
 * 	})
 * 	.addField({
 * 		name: 'Field 1',
 * 		value: 'Value 1',
 * 		inline: true
 * 	})
 * 	.addField({
 * 		name: 'Field 2',
 * 		value: 'Value 2',
 * 		inline: true
 * 	})
 * 	.addField({
 * 		name: 'Field 3',
 * 		value: 'Value 3',
 * 		inline: false
 * 	})
 *
 * const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz')
 *
 * const success = await webhook.addEmbed(embed).send()
 * ```
 */

export class Embed {
	/**
	 * Title of the embed.
	 * Up to 256 characters.
	 */
	protected title?: string

	/**
	 * Embed type.
	 * (Always "rich" for webhook embeds)
	 */
	protected type = 'rich'

	/**
	 * URL of embed.
	 */
	protected url?: string

	/**
	 * Description of the embed.
	 * Up to 2048 characters.
	 */
	protected description?: string

	/**
	 * ISO8601 timestamp of the embed content.
	 */
	protected timestamp?: string

	/**
	 * color code of the embed.
	 */
	protected color?: number

	/**
	 * Footer information.
	 */
	protected footer?: IFooter

	/**
	 * Image information.
	 */
	protected image?: IImage

	/**
	 * Thumbnail information.
	 */
	protected thumbnail?: IThumbnail

	/**
	 * Video information.
	 */
	protected video?: IVideo

	/**
	 * Provider information.
	 */
	protected provider?: IProvider

	/**
	 * Author information.
	 */
	protected author?: IAuthor

	/**
	 * Fields information.
	 * Up to 25 fields.
	 */
	protected fields?: Array<IField>

	/**
	 * Set Title of the embed.
	 *
	 * @param title string
	 * @returns this
	 */
	public setTitle(title: string): Embed {
		if (title.length > 256) {
			throw new Error('Title length exceeds 256 characters')
		}
		this.title = title
		return this
	}

	/**
	 * Set URL of embed.
	 *
	 * @param url string
	 * @returns this
	 */
	public setURL(url: string): Embed {
		this.url = url
		return this
	}

	/**
	 * Description of the embed.
	 *
	 * @param description string
	 * @returns Embed
	 */
	public setDescription(description: string): Embed {
		if (description.length > 4096) {
			throw new Error('Description length exceeds 4096 characters')
		}
		this.description = description
		return this
	}

	/**
	 * Set ISO8601 timestamp of the embed content.
	 *
	 * @returns this
	 */
	public setTimestamp(date?: Date): Embed {
		if (date) {
			this.timestamp = date.toISOString()
			return this
		}

		this.timestamp = new Date().toISOString()
		return this
	}

	/**
	 * Set color code of the embed.
	 *
	 * @param color - number | string
	 * @returns this
	 */
	public setColor(color: number | string): Embed {
		if (typeof color === 'string') {
			const intColor = Number.parseInt(color.toString().replace('#', ''), 16)
			this.color = intColor
		} else {
			this.color = color
		}

		return this
	}

	/**
	 * Set Footer information.
	 *
	 * @param footer Footer
	 * @returns this
	 */
	public setFooter(footer: IFooter): Embed
	public setFooter(
		text: string,
		icon_url?: string | IAttachment,
		proxy_icon_url?: string
	): Embed
	public setFooter(
		footerOrText: IFooter | string,
		icon_url?: string | IAttachment,
		proxy_icon_url?: string
	): Embed {
		if (typeof footerOrText === 'string') {
			this.footer = {
				text: footerOrText,
				icon_url,
				proxy_icon_url
			}
		} else {
			this.footer = footerOrText
		}
		return this
	}

	/**
	 * Set Image information
	 *
	 * @param image Image
	 * @returns this
	 */
	public setImage(image: IImage): Embed
	public setImage(url: string, height?: number, width?: number): Embed
	public setImage(
		imageOrUrl: IImage | string,
		height?: number,
		width?: number
	): Embed {
		if (typeof imageOrUrl === 'string') {
			this.image = {
				url: imageOrUrl,
				height,
				width
			}
		} else {
			this.image = imageOrUrl
		}
		return this
	}

	/**
	 * Set Thumbnail information
	 *
	 * @param thumbnail Thumbnail
	 * @returns this
	 */
	public setThumbnail(thumbnail: IThumbnail): Embed
	public setThumbnail(url: string, height?: number, width?: number): Embed
	public setThumbnail(
		thumbnailOrUrl: IThumbnail | string,
		height?: number,
		width?: number
	): Embed {
		if (typeof thumbnailOrUrl === 'string') {
			this.thumbnail = {
				url: thumbnailOrUrl,
				height,
				width
			}
		} else {
			this.thumbnail = thumbnailOrUrl
		}
		return this
	}

	/**
	 * Set Video information
	 *
	 * @param video Video
	 * @returns this
	 */
	public setVideo(video: IVideo): Embed
	public setVideo(url: string, height?: number, width?: number): Embed
	public setVideo(
		videoOrUrl: IVideo | string,
		height?: number,
		width?: number
	): Embed {
		if (typeof videoOrUrl === 'string') {
			this.video = {
				url: videoOrUrl,
				height,
				width
			}
		} else {
			this.video = videoOrUrl
		}
		return this
	}

	/**
	 * Set Provider information
	 *
	 * @param provider Provider
	 * @returns this
	 */
	public setProvider(provider: IProvider): Embed
	public setProvider(name: string, url?: string): Embed
	public setProvider(providerOrName: IProvider | string, url?: string): Embed {
		if (typeof providerOrName === 'string') {
			this.provider = {
				name: providerOrName,
				url
			}
		} else {
			this.provider = providerOrName
		}
		return this
	}

	/**
	 * Set Author information
	 *
	 * @param author Author
	 * @returns this
	 */
	public setAuthor(author: IAuthor): Embed
	public setAuthor(name: string, url?: string, icon_url?: string): Embed
	public setAuthor(
		authorOrName: IAuthor | string,
		url?: string,
		icon_url?: string
	): Embed {
		if (typeof authorOrName === 'string') {
			this.author = {
				name: authorOrName,
				url,
				icon_url
			}
		} else {
			this.author = authorOrName
		}
		return this
	}

	/**
	 * Set Field information
	 * Maximum 25 fields
	 *
	 * @param field Field
	 * @returns this
	 */
	public addField(field: IField): Embed
	public addField(name: string, value: string, inline?: boolean): Embed
	public addField(
		fieldOrName: IField | string,
		value?: string,
		inline = false
	): Embed {
		if (typeof this.fields === 'undefined') {
			this.fields = []
		}

		if (this.fields.length >= 25) {
			throw new ValidationError('Fields length exceeds 25', 'fields', 25)
		}

		if (typeof fieldOrName === 'string') {
			this.assertFieldName(fieldOrName)
			this.assertFieldValue(value)
			const field: IField = { name: fieldOrName, value: value || '', inline }
			this.fields.push(field)
		} else {
			this.assertFieldName(fieldOrName.name)
			this.assertFieldValue(fieldOrName.value)
			this.fields.push(fieldOrName)
		}

		if (this.fields.length > 25) {
			throw new ValidationError('Fields length exceeds 25', 'fields', 25)
		}

		return this
	}

	/**
	 * Set bulk field information.
	 * Maximum 25 fields
	 *
	 * @param fields Array<IFields>
	 * @returns Embed
	 */
	public setFields(fields: Array<IField>): Embed {
		if (fields.length > 25)
			throw new ValidationError('Fields length exceeds 25', 'fields', 25)

		for (const field of fields) {
			this.assertFieldName(field.name)
			this.assertFieldValue(field.value)
		}

		this.fields = fields

		return this
	}

	/**
	 * Generate object based on input
	 *
	 * @returns IEmbed
	 */
	public toObject(): IEmbed {
		return {
			title: this.title,
			type: 'rich',
			url: this.url,
			description: this.description,
			timestamp: this.timestamp,
			color: this.color,
			footer: this.footer,
			image: this.image,
			thumbnail: this.thumbnail,
			video: this.video,
			provider: this.provider,
			author: this.author,
			fields: this.fields
		}
	}

	private assertFieldName(name: string): void {
		if (name.length > 256) {
			throw new ValidationError(
				'Field name length exceeds 256 characters',
				'field.name',
				256,
				name.length
			)
		}
	}

	private assertFieldValue(value?: string): void {
		if (value === undefined || value.length === 0) {
			throw new ValidationError('Field value is required', 'field.value')
		}
		if (value.length > 1024) {
			throw new ValidationError(
				'Field value length exceeds 1024 characters',
				'field.value',
				1024,
				value.length
			)
		}
	}
}
