/**
 * Controls which mentions in a message actually ping users and roles.
 * @see https://discord.com/developers/docs/resources/message#allowed-mentions-object
 */
export interface IAllowedMentions {
	/**
	 * Mention types to parse from the content.
	 * Pass an empty array to suppress every ping.
	 */
	parse?: Array<'roles' | 'users' | 'everyone'>

	/** Role IDs allowed to be mentioned (max 100). */
	roles?: string[]

	/** User IDs allowed to be mentioned (max 100). */
	users?: string[]

	/** Whether to mention the author of the replied message. */
	replied_user?: boolean
}
