<div align="center">
  <h1>EZ Hook - TypeScript/JavaScript</h1>
</div>

Zero dependency, TypeScript/JavaScript library for sending Discord webhooks.
<br>
Useful for edge runtimes, Cloudflare Workers, Vercel, Deno, etc.
<br>
Create embeds using builder methods with flexible parameter options - pass objects or individual values for customization.
<br>
### Built-in Input Validation Errors

The hook throws validation errors in the following cases:

- **Size Constraints**:
  - Content exceeds maximum allowed length
  - Content is shorter than minimum required length
  - Field size is larger than permitted limit
  - Field size is smaller than required minimum

- **Invalid Content**:
  - Content format doesn't match required pattern
  - Content contains invalid characters
  - Content structure violates specified rules

These validations comply with Discord's limits.

### Discord Webhook Limits

- **Content Limits**:
  - Message content: 2000 characters
  - Embed title: 256 characters
  - Embed description: 4096 characters
  - Embed fields: Up to 25 fields
  - Embed field name: 256 characters
  - Embed field value: 1024 characters
  - Embed footer text: 2048 characters
  - Embed author name: 256 characters
  - Total embeds per message: 10
  - Total character limit across all embeds: 6000 characters

- **Media Limits**:
  - Image URLs: 2048 characters
  - Thumbnail URLs: 2048 characters
  - Author icon URLs: 2048 characters
  - Footer icon URLs: 2048 characters

- **Rate Limits**:
  - Default rate limit: 30 requests per minute per webhook
  - Responses include retry-after header when rate limited

These limits are enforced by Discord's API and this library validates inputs against these limits to prevent API errors.

## Install

Install from npm:

- `npm install @teever/ez-hook`
- `pnpm add @teever/ez-hook`
- `yarn add @teever/ez-hook`
- `bun add @teever/ez-hook`

Install from JSR:

- `deno add @teever/ez-hook`
- `npx jsr add @teever/ez-hook`
- `yarn dlx jsr add @teever/ez-hook`
- `pnpm dlx jsr add @teever/ez-hook`
- `bunx jsr add @teever/ez-hook`


# Features

- Zero dependencies
- TypeScript support
- Automatic retry on rate limits and server errors
- Configurable retry behavior
- Fluent builder API
- Overloaded methods for simpler usage
- Structured responses with status/retry metadata

## Response shape

`send`, `modify`, and `get` return a `RequestResult` object:
- `ok`: boolean success indicator
- `status`: HTTP status code (0 on network failure)
- `retryAfter`: milliseconds until retry if provided by Discord
- `bodyText`: raw response text, when present
- `error`: message for non-OK responses

Input validation errors throw `ValidationError` with the field path and limit details.

## Request options

You can pass a second parameter with `signal`, custom `headers`, and `timeoutMs`:

```ts
const controller = new AbortController()
const res = await hook.send({
  headers: { 'X-Custom-Header': 'value' },
  signal: controller.signal,
  timeoutMs: 5000
})
```

# Example


## Basic Use

```ts
import { Webhook } from '@teever/ez-hook'

// Optional retry configuration 
const retryConfig = {
  maxRetries: 3,      // Maximum number of retries
  baseDelay: 1000,    // Base delay in ms (1 second)
  maxDelay: 60000     // Maximum delay in ms (60 seconds)
} // Also the default configuration

const hook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz', retryConfig)

hook
  .setUsername('Username')
  .setContent('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')

const result = await hook.send()

if (!result.ok) {
  console.error('Webhook failed', result)
}

```

## Custom Embeds (Rich Message)

```ts
import { Embed, Webhook } from '@teever/ez-hook'

const hook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz')

const embed = new Embed()
embed
  .setTitle('Embed Title')
  .setDescription('Embed Description')
  // Use hex string or number for color
  .setColor('#ffffff')  // (Note: must be prefixed with #)
  // Example number for color
  .setColor(12345)
  // Simple method overload
  .setThumbnail('https://example.com/image.png')  
  // Or use full object
  .setThumbnail({
    url: 'https://example.com/image.png',
    height: 100,
    width: 100
  })
  // Simple author setting
  .setAuthor('Author Name', 'https://discord.com', 'https://example.com/icon.png')
  // Or use full object
  .setAuthor({
    name: 'Author Name',
    icon_url: 'https://example.com/icon.png',
    url: 'https://discord.com'
  })
  // Simple footer setting
  .setFooter('Footer Text', 'https://example.com/icon.png')
  // Or use full object
  .setFooter({
    text: 'Footer Text',
    icon_url: 'https://example.com/icon.png'
  })
  .setTimestamp()
  // Simple field adding
  .addField('Field 1', 'Value 1', true)
  // Or use full object
  .addField({
    name: 'Field 2',
    value: 'Value 2',
    inline: true
  })

const res = await hook.addEmbed(embed).send()

if (!res.ok) {
  console.error('Webhook failed', res)
}

```

## Error Handling

EZ-Hook provides typed error classes for precise error handling:

```ts
import {
  Webhook,
  ValidationError,
  RateLimitError,
  WebhookError,
  WebhookNotFoundError
} from '@teever/ez-hook'

const hook = new Webhook('https://discord.com/api/webhooks/...')

try {
  hook.setContent('Hello!')
  await hook.send()
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed: ${error.field}`)
    console.error(`Max: ${error.maxLength}, Actual: ${error.actualLength}`)
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited! Retry after ${error.retryAfter}ms`)
  } else if (error instanceof WebhookNotFoundError) {
    console.error('Webhook URL is invalid or deleted')
  } else if (error instanceof WebhookError) {
    console.error(`HTTP error ${error.statusCode}: ${error.message}`)
  }
}
```

## Examples

See the [examples](./examples) directory for more usage patterns:

- [Basic usage](./examples/02-basic-usage.ts) - simple messages, overrides, TTS
- [Multiple embeds](./examples/03-multiple-embeds.ts) - dashboards, catalogs, leaderboards  
- [Embed features](./examples/04-embed-features.ts) - all embed options, colors, fields
- [Webhook management](./examples/05-webhook-management.ts) - get/modify webhooks
- [Error handling](./examples/06-error-handling.ts) - comprehensive error patterns