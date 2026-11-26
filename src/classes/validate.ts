import type { IEmbed, IWebhook, WebhookFile } from '../types/index.js'
import { ValidationError } from './Errors.js'

/**
 * Discord's documented limits for webhook messages.
 * @see https://discord.com/developers/docs/resources/message#embed-object-embed-limits
 */
export const Limits = {
	content: 2000,
	username: 80,
	threadName: 100,
	embeds: 10,
	files: 10,
	embedTitle: 256,
	embedDescription: 4096,
	embedFields: 25,
	fieldName: 256,
	fieldValue: 1024,
	footerText: 2048,
	authorName: 256,
	embedTotal: 6000,
	fileDescription: 1024
} as const

/** @internal */
export function assertMaxLength(
	value: string | undefined,
	max: number,
	field: string,
	label: string
): void {
	if (value !== undefined && value.length > max) {
		throw new ValidationError(
			`${label} exceeds ${max} characters (got ${value.length})`,
			field,
			max,
			value.length
		)
	}
}

/** @internal */
export function assertMaxCount(
	count: number,
	max: number,
	field: string,
	label: string
): void {
	if (count > max) {
		throw new ValidationError(
			`Too many ${label}: maximum is ${max} (got ${count})`,
			field,
			max,
			count
		)
	}
}

/** Number of characters counting towards the 6000 character embed limit. */
function embedLength(embed: IEmbed): number {
	let total =
		(embed.title?.length ?? 0) +
		(embed.description?.length ?? 0) +
		(embed.footer?.text?.length ?? 0) +
		(embed.author?.name?.length ?? 0)
	for (const field of embed.fields ?? []) {
		total += (field.name?.length ?? 0) + (field.value?.length ?? 0)
	}
	return total
}

/** @internal */
export function validateEmbed(embed: IEmbed, path: string): void {
	assertMaxLength(embed.title, Limits.embedTitle, `${path}.title`, 'Title')
	assertMaxLength(
		embed.description,
		Limits.embedDescription,
		`${path}.description`,
		'Description'
	)
	assertMaxLength(
		embed.footer?.text,
		Limits.footerText,
		`${path}.footer.text`,
		'Footer text'
	)
	assertMaxLength(
		embed.author?.name,
		Limits.authorName,
		`${path}.author.name`,
		'Author name'
	)

	const fields = embed.fields ?? []
	assertMaxCount(fields.length, Limits.embedFields, `${path}.fields`, 'fields')
	fields.forEach((field, index) => {
		const fieldPath = `${path}.fields[${index}]`
		if (!field.name) {
			throw new ValidationError('Field name is required', `${fieldPath}.name`)
		}
		if (!field.value) {
			throw new ValidationError('Field value is required', `${fieldPath}.value`)
		}
		assertMaxLength(
			field.name,
			Limits.fieldName,
			`${fieldPath}.name`,
			'Field name'
		)
		assertMaxLength(
			field.value,
			Limits.fieldValue,
			`${fieldPath}.value`,
			'Field value'
		)
	})
}

/**
 * Validates a full message body against Discord's limits.
 * @internal
 */
export function validateMessage(
	body: IWebhook,
	files: WebhookFile[],
	{ allowEmpty = false }: { allowEmpty?: boolean } = {}
): void {
	assertMaxLength(body.content, Limits.content, 'content', 'Content')
	assertMaxLength(body.username, Limits.username, 'username', 'Username')
	if (body.username !== undefined && body.username.trim().length === 0) {
		throw new ValidationError('Username cannot be empty', 'username')
	}
	assertMaxLength(
		body.thread_name,
		Limits.threadName,
		'threadName',
		'Thread name'
	)

	const embeds = body.embeds ?? []
	assertMaxCount(embeds.length, Limits.embeds, 'embeds', 'embeds')
	let total = 0
	embeds.forEach((embed, index) => {
		validateEmbed(embed, `embeds[${index}]`)
		total += embedLength(embed)
	})
	if (total > Limits.embedTotal) {
		throw new ValidationError(
			`Embeds exceed ${Limits.embedTotal} characters in total (got ${total})`,
			'embeds',
			Limits.embedTotal,
			total
		)
	}

	assertMaxCount(files.length, Limits.files, 'files', 'files')
	files.forEach((file, index) => {
		if (typeof file === 'string') return
		if (!file.filename) {
			throw new ValidationError(
				'File name is required',
				`files[${index}].filename`
			)
		}
		assertMaxLength(
			file.description,
			Limits.fileDescription,
			`files[${index}].description`,
			'File description'
		)
	})

	if (
		!allowEmpty &&
		!body.content?.trim() &&
		embeds.length === 0 &&
		files.length === 0
	) {
		throw new ValidationError(
			'Message is empty: set content, at least one embed, or a file',
			'content'
		)
	}
}
