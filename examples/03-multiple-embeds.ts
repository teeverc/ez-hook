/**
 * Multiple embeds - sending up to 10 embeds in a single message
 */

import { Embed, Webhook } from '../src/index'

const WEBHOOK_URL =
	'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'

// Example 1: Send multiple embeds at once
async function _sendMultipleEmbeds() {
	const webhook = new Webhook(WEBHOOK_URL)

	const embed1 = new Embed()
		.setTitle('First Embed')
		.setDescription('This is the first embed')
		.setColor('#FF0000')

	const embed2 = new Embed()
		.setTitle('Second Embed')
		.setDescription('This is the second embed')
		.setColor('#00FF00')

	const embed3 = new Embed()
		.setTitle('Third Embed')
		.setDescription('This is the third embed')
		.setColor('#0000FF')

	webhook.addEmbed(embed1).addEmbed(embed2).addEmbed(embed3)

	await webhook.send()
}

// Example 2: Product catalog display
async function _productCatalog() {
	const webhook = new Webhook(WEBHOOK_URL)

	const products = [
		{ name: 'Product A', price: '$29.99', stock: 'In Stock', color: '#4CAF50' },
		{
			name: 'Product B',
			price: '$49.99',
			stock: 'Low Stock',
			color: '#FF9800'
		},
		{
			name: 'Product C',
			price: '$19.99',
			stock: 'Out of Stock',
			color: '#F44336'
		}
	]

	for (const product of products) {
		const embed = new Embed()
			.setTitle(product.name)
			.setColor(product.color)
			.addField('Price', product.price, true)
			.addField('Availability', product.stock, true)

		webhook.addEmbed(embed)
	}

	webhook.setContent("📦 **Today's Featured Products**")
	await webhook.send()
}

// Example 3: Multi-server status dashboard
async function _serverStatusDashboard() {
	const webhook = new Webhook(WEBHOOK_URL)

	const servers = [
		{ name: 'API Server', status: 'Online', uptime: '99.9%', latency: '12ms' },
		{ name: 'Database', status: 'Online', uptime: '99.8%', latency: '5ms' },
		{ name: 'CDN', status: 'Degraded', uptime: '98.5%', latency: '45ms' },
		{ name: 'Auth Service', status: 'Online', uptime: '99.95%', latency: '8ms' }
	]

	for (const server of servers) {
		const color =
			server.status === 'Online'
				? '#00FF00'
				: server.status === 'Degraded'
					? '#FFFF00'
					: '#FF0000'

		const embed = new Embed()
			.setTitle(`${server.status === 'Online' ? '🟢' : '🟡'} ${server.name}`)
			.setColor(color)
			.addField('Status', server.status, true)
			.addField('Uptime', server.uptime, true)
			.addField('Latency', server.latency, true)

		webhook.addEmbed(embed)
	}

	webhook.setContent('**System Status Dashboard**')
	await webhook.send()
}

// Example 4: Leaderboard with rankings
async function _leaderboard() {
	const webhook = new Webhook(WEBHOOK_URL)

	const players = [
		{ rank: 1, name: 'Player1', score: 15000, medal: '🥇' },
		{ rank: 2, name: 'Player2', score: 12500, medal: '🥈' },
		{ rank: 3, name: 'Player3', score: 10000, medal: '🥉' }
	]

	for (const player of players) {
		const embed = new Embed()
			.setTitle(`${player.medal} #${player.rank} - ${player.name}`)
			.setColor(
				player.rank === 1
					? '#FFD700'
					: player.rank === 2
						? '#C0C0C0'
						: '#CD7F32'
			)
			.addField('Score', player.score.toLocaleString(), true)
			.setThumbnail(`https://example.com/avatars/${player.name}.png`)

		webhook.addEmbed(embed)
	}

	await webhook.send()
}
