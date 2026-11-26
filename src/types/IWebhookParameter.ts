export interface IWebhookParameter {
	/**
	 * Update the default name of the webhook (1-80 characters).
	 */
	name?: string

	/**
	 * Update the default avatar of the webhook.
	 * Must be an image data URI (e.g. `data:image/png;base64,...`), or `null` to remove it.
	 */
	avatar?: string | null

	/**
	 * Move the webhook to another channel (snowflake).
	 * Note: Discord only accepts this with bot authorization, not with a webhook token.
	 */
	channel_id?: string
}
