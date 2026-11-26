/**
 * Messages and threads - edit/delete sent messages, post into threads and forums
 */

import { Embed, Webhook } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

const hook = new Webhook(WEBHOOK_URL)

// Example 1: A status message that updates in place
async function _liveStatus() {
	const message = await hook.send({
		embeds: [new Embed().setTitle('Deploying...').setColor('#f1c40f')]
	})

	// ... do the work ...

	await hook.editMessage(message.id, {
		embeds: [new Embed().setTitle('Deployed ✅').setColor('#2ecc71')]
	})
}

// Example 2: Fetch and delete a message
async function _fetchAndDelete(messageId: string) {
	const message = await hook.getMessage(messageId)
	console.log(message.content)
	await hook.deleteMessage(messageId)
}

// Example 3: Post into an existing thread
async function _postInThread(threadId: string) {
	const message = await hook.send({ content: 'Reply in thread', threadId })
	// Messages in threads need the thread ID to be edited or deleted
	await hook.editMessage(message.id, { content: 'Edited reply', threadId })
	await hook.deleteMessage(message.id, { threadId })
}

// Example 4: Create a forum post
async function _createForumPost() {
	await hook.send({
		threadName: 'Incident 2026-11-26',
		content: 'API latency is elevated',
		appliedTags: ['TAG_ID']
	})
}
