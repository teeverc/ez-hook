/**
 * Message flags that webhooks are allowed to set.
 *
 * ```ts
 * await hook.send({ content: 'Quiet deploy', flags: ['SuppressNotifications'] })
 * // or as a bitfield
 * await hook.send({ content: 'Quiet deploy', flags: MessageFlags.SuppressNotifications })
 * ```
 */
export const MessageFlags = {
	/** Do not show link previews (embeds) for URLs in the content. */
	SuppressEmbeds: 1 << 2,
	/** Send without a push/desktop notification ("@silent"). */
	SuppressNotifications: 1 << 12
} as const

export type MessageFlagName = keyof typeof MessageFlags

/** A flags bitfield, or a list of flag names. */
export type MessageFlagsInput = number | MessageFlagName[]

/** @internal */
export function resolveFlags(
	flags: MessageFlagsInput | undefined
): number | undefined {
	if (flags === undefined || typeof flags === 'number') return flags
	return flags.reduce((bits, name) => bits | MessageFlags[name], 0)
}
