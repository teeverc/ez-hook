/**
 * Embed features - demonstrating all embed capabilities
 */

import { Embed, Webhook } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Full-featured embed with all options
async function _fullFeaturedEmbed() {
	const webhook = new Webhook(WEBHOOK_URL)

	const embed = new Embed()
		.setTitle('Complete Embed Example')
		.setURL('https://example.com')
		.setDescription(
			'This embed demonstrates all available features including author, footer, fields, images, and more.'
		)
		.setColor('#5865F2')
		.setAuthor({
			name: 'Author Name',
			url: 'https://example.com/author',
			icon_url: 'https://example.com/author-icon.png'
		})
		.setThumbnail('https://example.com/thumbnail.png')
		.setImage('https://example.com/large-image.png')
		.addField('Inline Field 1', 'Value 1', true)
		.addField('Inline Field 2', 'Value 2', true)
		.addField('Inline Field 3', 'Value 3', true)
		.addField('Regular Field', 'This field spans the full width', false)
		.setFooter({
			text: 'Footer text here',
			icon_url: 'https://example.com/footer-icon.png'
		})
		.setTimestamp()

	webhook.addEmbed(embed)
	await webhook.send()
}

// Example 2: Using alternative method signatures
async function _alternativeSignatures() {
	const webhook = new Webhook(WEBHOOK_URL)

	const embed = new Embed()
		.setTitle('Alternative Signatures')
		.setAuthor('Simple Author')
		.setFooter('Simple footer text')
		.setImage('https://example.com/image.png', 400, 300)
		.setThumbnail('https://example.com/thumb.png', 80, 80)
		.addField('Field Name', 'Field Value', true)
		.setColor(0x5865f2)

	webhook.addEmbed(embed)
	await webhook.send()
}

// Example 3: GitHub-style commit notification
async function _gitCommitNotification() {
	const webhook = new Webhook(WEBHOOK_URL)

	const commit = {
		repo: 'user/repo',
		branch: 'main',
		hash: 'abc1234',
		message: 'feat: add new webhook feature',
		author: 'developer',
		files: 3
	}

	const embed = new Embed()
		.setTitle(`[${commit.repo}:${commit.branch}] 1 new commit`)
		.setURL(`https://github.com/${commit.repo}/commit/${commit.hash}`)
		.setColor('#24292e')
		.setAuthor(
			commit.author,
			`https://github.com/${commit.author}`,
			`https://github.com/${commit.author}.png`
		)
		.setDescription(
			`[\`${commit.hash.slice(0, 7)}\`](https://github.com/${commit.repo}/commit/${commit.hash}) ${commit.message}`
		)
		.setFooter(`${commit.files} files changed`)
		.setTimestamp()

	webhook.addEmbed(embed)
	await webhook.send()
}

// Example 4: Color variations
async function _colorVariations() {
	const webhook = new Webhook(WEBHOOK_URL)

	const hexEmbed = new Embed()
		.setTitle('Hex Color')
		.setDescription('Using #FF5733')
		.setColor('#FF5733')

	const intEmbed = new Embed()
		.setTitle('Integer Color')
		.setDescription('Using 0x3498db')
		.setColor(0x3498db)

	const stringIntEmbed = new Embed()
		.setTitle('String Hex')
		.setDescription('Using "9b59b6"')
		.setColor('9b59b6')

	webhook.addEmbed(hexEmbed).addEmbed(intEmbed).addEmbed(stringIntEmbed)
	await webhook.send()
}

// Example 5: Using setFields for bulk field creation
async function _bulkFields() {
	const webhook = new Webhook(WEBHOOK_URL)

	const stats = [
		{ name: 'Users', value: '1,234', inline: true },
		{ name: 'Messages', value: '56,789', inline: true },
		{ name: 'Uptime', value: '99.9%', inline: true },
		{ name: 'Memory', value: '2.4 GB', inline: true },
		{ name: 'CPU', value: '45%', inline: true },
		{ name: 'Ping', value: '12ms', inline: true }
	]

	const embed = new Embed()
		.setTitle('Server Statistics')
		.setColor('#00D166')
		.setFields(stats)
		.setTimestamp()

	webhook.addEmbed(embed)
	await webhook.send()
}

// Example 6: Custom timestamp
async function _customTimestamp() {
	const webhook = new Webhook(WEBHOOK_URL)

	const eventDate = new Date('2025-12-25T12:00:00Z')

	const embed = new Embed()
		.setTitle('Upcoming Event')
		.setDescription('Holiday celebration!')
		.setColor('#E74C3C')
		.setTimestamp(eventDate)

	webhook.addEmbed(embed)
	await webhook.send()
}
