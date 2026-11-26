<div align="center">
  <h1>EZ Hook</h1>
  <p>Zero-dependency, fully typed Discord webhooks for Node, Bun, Deno, Cloudflare Workers, Vercel and the browser.</p>
</div>

```ts
import { Webhook } from '@teever/ez-hook'

const hook = new Webhook(process.env.DISCORD_WEBHOOK_URL!)

await hook.send('Deploy finished ✅')
```

## Features

- **Zero dependencies**, built on `fetch`, `FormData` and `Blob`
- **One call to send**: a string, or a full message object with embeds, files, threads and flags
- **Typed errors**: `ValidationError` before the request is made, `WebhookError` with Discord's status, code and readable details after
- **Automatic retries** for rate limits (respects `retry_after`), server errors and network errors, without double-posting messages
- **Full message lifecycle**: send, get, edit and delete messages, plus get, modify and delete the webhook
- **Every Discord limit is checked**, including the 6000-character embed total, with exact paths like `embeds[1].fields[3].value`
- Timeouts and `AbortSignal` support, fluent `Embed` builder, ESM and type definitions

> Upgrading from 0.3.x/0.4.x? `send()` now **throws** instead of returning `{ ok }`. See the [migration guide](./CHANGELOG.md#migrating-from-03x).

## Install

```sh
npm install @teever/ez-hook     # or pnpm add / yarn add / bun add
deno add jsr:@teever/ez-hook    # or npx jsr add @teever/ez-hook
```

## Usage

### Send a message

```ts
import { Embed, Webhook } from '@teever/ez-hook'

const hook = new Webhook(url, {
  username: 'Deploy Bot',          // defaults for every message
  allowedMentions: { parse: [] },  // never ping @everyone by accident
})

const message = await hook.send({
  content: 'Nightly report',
  embeds: [
    new Embed()
      .setTitle('Build #128')
      .setColor('#00ff00')
      .addField('Duration', '4m 12s', true)
      .addField('Tests', '312 passed', true)
      .setTimestamp(),
    { title: 'Coverage', description: '91.2%' }, // plain objects work too
  ],
  files: [{ filename: 'report.json', data: JSON.stringify(report) }],
  flags: ['SuppressNotifications'],
})

console.log(message.id) // the created message, typed
```

### Edit and delete messages

```ts
const status = await hook.send({ embeds: [new Embed().setTitle('Deploying...')] })
await hook.editMessage(status.id, { embeds: [new Embed().setTitle('Deployed ✅')] })
await hook.deleteMessage(status.id)
```

### Threads and forums

```ts
await hook.send({ content: 'In a thread', threadId: '123456789' })
await hook.send({ content: 'New forum post', threadName: 'Incident #42', appliedTags: ['987'] })
```

### Files

`data` can be a string, `Blob`, `ArrayBuffer` or typed array (such as a `Uint8Array` or Node `Buffer`). Up to 10 files per message.

```ts
await hook.send({
  files: [
    { filename: 'log.txt', data: logText },
    { filename: 'chart.png', data: pngBytes, contentType: 'image/png', description: 'CPU usage' },
    { filename: 'data.bin', data: base64String, encoding: 'base64' },
  ],
})
```

### Builder style

The setters build a draft that `send()` uses. A message passed to `send()` overrides it.

```ts
await new Webhook(url)
  .setUsername('CI')
  .setContent('Build passed')
  .addEmbed(new Embed().setTitle('main @ 3f2a1c'))
  .send()
```

The draft stays on the instance after sending. Call `hook.clear()` to reset it, or pass the message to `send()` directly when reusing one `Webhook`.

## Error handling

Every method that talks to Discord throws on failure:

```ts
import { RateLimitError, ValidationError, WebhookError, WebhookNotFoundError } from '@teever/ez-hook'

try {
  await hook.send(message)
} catch (error) {
  if (error instanceof ValidationError) {
    // Nothing was sent. error.field is e.g. "embeds[0].fields[2].value"
  } else if (error instanceof WebhookNotFoundError) {
    // Webhook was deleted or the URL is wrong
  } else if (error instanceof RateLimitError) {
    // Still rate limited after retries; error.retryAfter is in ms
  } else if (error instanceof WebhookError) {
    // error.status, error.code (Discord JSON code), error.body
    // error.message: "Invalid Form Body (code 50035): embeds.0.description: Must be 4096 or fewer in length."
  }
}
```

| Error | When |
| --- | --- |
| `ValidationError` | Input breaks a Discord limit. Thrown before any request. |
| `WebhookError` | Discord returned an error status. Base class of the errors below. |
| `WebhookNotFoundError` | 404: unknown webhook or message. |
| `RateLimitError` | 429 after all retries, or `retry_after` is longer than `retry.maxDelay`. |
| `NetworkError` | No response (`status` is 0). |
| `TimeoutError` | `timeoutMs` exceeded. Extends `NetworkError`. |
| `RequestAbortedError` | The `signal` you passed was aborted. Extends `NetworkError`. |

All of them extend `EzHookError`.

If you'd rather not use `try/catch`, use `trySend`:

```ts
const result = await hook.trySend('Hello')
if (!result.ok) console.error(result.error.message)
else console.log(result.data.id)
```

## Options

```ts
const hook = new Webhook(url, {
  retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 60_000 }, // defaults
  timeoutMs: 10_000,                // per attempt
  headers: { 'User-Agent': 'my-app' },
  username: 'Bot',                  // default username
  avatarUrl: 'https://…',           // default avatar
  allowedMentions: { parse: [] },   // default allowed mentions
})

// Per request
await hook.send('Hi', { signal: AbortSignal.timeout(5000), headers: {}, timeoutMs: 2000 })
await hook.send('Fire and forget', { wait: false }) // returns void
```

Retries happen on 429 (after Discord's `retry_after`), on 5xx (exponential backoff with jitter), and on network errors. Network errors are only retried for GET, PATCH and DELETE, so a lost response never causes a duplicate message.

## API

| Method | Returns |
| --- | --- |
| `send(message?, options?)` | `Promise<IMessage>` (`void` with `wait: false`) |
| `trySend(message?, options?)` | `Promise<Result<IMessage>>` |
| `getMessage(id, { threadId? })` | `Promise<IMessage>` |
| `editMessage(id, edit, options?)` | `Promise<IMessage>` |
| `deleteMessage(id, { threadId? })` | `Promise<void>` |
| `get()` | `Promise<IWebhookResponse>` |
| `modify({ name?, avatar? })` | `Promise<IWebhookResponse>` |
| `deleteWebhook()` | `Promise<void>` |
| `isValid()` | `Promise<boolean>`, never throws |

See [docs.md](./docs.md) for the full reference, and [examples](./examples) for more patterns.

## Discord limits

ez-hook checks these limits before sending (exported as `Limits`):

| | Limit |
| --- | --- |
| Content | 2000 characters |
| Username override | 80 characters |
| Embeds per message | 10 |
| Files per message | 10 |
| Embed title / description | 256 / 4096 characters |
| Fields per embed | 25 |
| Field name / value | 256 / 1024 characters |
| Footer text / author name | 2048 / 256 characters |
| All embeds combined | 6000 characters |
| Thread name | 100 characters |

## License

MIT
