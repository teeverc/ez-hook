# EZ-Hook API Reference

- [Webhook](#webhook)
  - [Constructor](#constructor)
  - [Sending messages](#sending-messages)
  - [Managing messages](#managing-messages)
  - [Managing the webhook](#managing-the-webhook)
  - [Builder methods](#builder-methods)
- [Embed](#embed)
- [Types](#types)
- [Errors](#errors)
- [Retries, timeouts and cancellation](#retries-timeouts-and-cancellation)
- [Limits](#limits)
- [Troubleshooting](#troubleshooting)

## Webhook

### Constructor

```ts
new Webhook(webhookUrl: string, options?: WebhookOptions)
```

| Option | Type | Description |
| --- | --- | --- |
| `retry` | `Partial<RetryConfig>` | `{ maxRetries: 3, baseDelay: 1000, maxDelay: 60000 }` by default |
| `timeoutMs` | `number` | Timeout per attempt. No timeout by default. |
| `headers` | `HeadersInit` | Headers added to every request |
| `username` | `string` | Default username override for every message |
| `avatarUrl` | `string` | Default avatar override for every message |
| `allowedMentions` | `IAllowedMentions` | Default allowed mentions, e.g. `{ parse: [] }` |

Throws `ValidationError` if `webhookUrl` is not a valid http(s) URL. Query parameters already in the URL (such as `?thread_id=`) are kept.

### Sending messages

#### `send(message?, options?): Promise<IMessage>`

Sends a message and returns the message Discord created.

`message` can be a string (used as `content`) or a `WebhookMessage`:

| Field | Type | Description |
| --- | --- | --- |
| `content` | `string` | Up to 2000 characters |
| `embeds` | `Array<Embed \| IEmbed>` | Up to 10 |
| `files` | `WebhookFile[]` | Up to 10, see [files](#webhookfile) |
| `username` | `string` | Username override, up to 80 characters |
| `avatarUrl` | `string` | Avatar override |
| `tts` | `boolean` | Text to speech |
| `allowedMentions` | `IAllowedMentions` | Who may be pinged |
| `flags` | `number \| MessageFlagName[]` | `'SuppressEmbeds'`, `'SuppressNotifications'` |
| `threadId` | `string` | Post into an existing thread |
| `threadName` | `string` | Create a forum/media post with this name |
| `appliedTags` | `string[]` | Tags for the new forum post |

The final message is merged in this order: constructor defaults, then builder state, then `message`.

`options` (`SendOptions`): `signal`, `headers`, `timeoutMs`, and `wait` (default `true`). With `wait: false` Discord doesn't return the message, `send` resolves to `void`, and some errors may not be reported.

Throws `ValidationError` before sending if the message is empty or breaks a limit, and `WebhookError` (or a subclass) if the request fails.

```ts
const message = await hook.send({ content: 'Hi', flags: ['SuppressNotifications'] })
```

#### `trySend(message?, options?): Promise<Result<IMessage>>`

Same as `send`, but it never throws:

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: EzHookError }
```

### Managing messages

Only messages sent by this webhook can be fetched, edited or deleted. For messages inside a thread, pass the `threadId`.

#### `getMessage(messageId, options?: MessageOptions): Promise<IMessage>`

#### `editMessage(messageId, edit: string | WebhookMessageEdit, options?): Promise<IMessage>`

`WebhookMessageEdit` accepts `content`, `embeds`, `files`, `allowedMentions`, `flags` and `threadId`. Only the fields you pass change. Passing `files` replaces the message's attachments. Constructor defaults are not applied to edits.

```ts
await hook.editMessage(message.id, { embeds: [new Embed().setTitle('Done')] })
```

#### `deleteMessage(messageId, options?: MessageOptions): Promise<void>`

`MessageOptions` is `RequestOptions` plus `threadId`.

### Managing the webhook

#### `get(options?): Promise<IWebhookResponse>`

Fetches the webhook's name, avatar, channel and guild.

#### `modify(changes: IWebhookParameter, options?): Promise<IWebhookResponse>`

Changes the webhook's default `name` or `avatar`. The avatar must be an image data URI, or `null` to remove it.

#### `deleteWebhook(options?): Promise<void>`

Permanently deletes the webhook. The URL stops working afterwards.

#### `isValid(options?): Promise<boolean>`

Returns `true` if `get()` succeeds. Never throws.

### Builder methods

Every setter returns `this`. They set a draft that `send()` uses when called without a message, or that a passed message overrides.

| Method | Notes |
| --- | --- |
| `setContent(content)` | Throws if longer than 2000 characters |
| `setUsername(username)` | Throws if longer than 80 characters |
| `setAvatarUrl(url)` | |
| `setTTS(flag)` | |
| `addEmbed(embed)` | `Embed` or `IEmbed`, max 10. Builders are serialized when sending. |
| `setEmbeds(embeds)` | Replaces all embeds |
| `setFile(file)` | Replaces all files with this one |
| `addFile(file)` | Max 10 |
| `setAllowedMentions(mentions)` | |
| `setFlags(flags)` | |
| `setThreadId(id)` / `setThreadName(name)` | |
| `clear()` | Resets the draft. Constructor defaults are kept. |
| `validate()` | Throws `ValidationError` if the draft would be rejected |
| `toObject()` | The JSON body `send()` would post, without files |
| `getRetryConfig()` | The resolved retry configuration |

The draft is **not** cleared after sending.

## Embed

```ts
new Embed(data?: IEmbed)
Embed.from(data: IEmbed)
```

| Method | Notes |
| --- | --- |
| `setTitle(title)` | Max 256 characters |
| `setDescription(text)` | Max 4096 characters |
| `setUrl(url)` | Makes the title a link. `setURL` is a deprecated alias. |
| `setColor(color)` | `0x5865f2`, `'#5865f2'` or `'5865f2'` |
| `setTimestamp(date?)` | `Date`, epoch ms or date string. Defaults to now. |
| `setAuthor(name, url?, iconUrl?)` / `setAuthor(IAuthor)` | Name max 256 characters |
| `setFooter(text, iconUrl?)` / `setFooter(IFooter)` | Text max 2048 characters |
| `setImage(url, height?, width?)` / `setImage(IImage)` | |
| `setThumbnail(url, height?, width?)` / `setThumbnail(IThumbnail)` | |
| `addField(name, value, inline?)` / `addField(IField)` | Max 25 fields. Name max 256, value 1024, neither may be empty. |
| `addFields(...fields)` | |
| `setFields(fields)` | Replaces all fields |
| `setVideo(...)` / `setProvider(...)` | Discord ignores these for webhooks |
| `toObject()` / `toJSON()` | The plain `IEmbed` object |

To show an uploaded file in an embed, reference it with `attachment://filename`:

```ts
await hook.send({
  embeds: [new Embed().setImage('attachment://chart.png')],
  files: [{ filename: 'chart.png', data: png, contentType: 'image/png' }],
})
```

## Types

All types are exported from the package root.

### `WebhookFile`

```ts
type WebhookFile = string | FileAttachment // a plain string is sent as file.txt

interface FileAttachment {
  filename: string
  data: string | Blob | ArrayBuffer | ArrayBufferView
  encoding?: 'text' | 'base64' // decode base64 string data before upload
  contentType?: string
  description?: string         // alt text, max 1024 characters
}
```

### `IAllowedMentions`

```ts
interface IAllowedMentions {
  parse?: Array<'roles' | 'users' | 'everyone'>
  roles?: string[]
  users?: string[]
  replied_user?: boolean
}
```

### `MessageFlags`

```ts
MessageFlags.SuppressEmbeds        // 1 << 2
MessageFlags.SuppressNotifications // 1 << 12
```

Other exported types: `IMessage`, `IEmbed`, `IField`, `IAuthor`, `IFooter`, `IImage`, `IThumbnail`, `IVideo`, `IProvider`, `IAttachment`, `IUser`, `IWebhook`, `IWebhookParameter`, `IWebhookResponse`, `WebhookMessage`, `WebhookMessageEdit`, `WebhookOptions`, `SendOptions`, `MessageOptions`, `RequestOptions`, `RetryConfig`, `Result`.

## Errors

```
EzHookError
├── ValidationError         field, maxLength, actualLength
└── WebhookError            status (statusCode), retryAfter, code, body
    ├── WebhookNotFoundError    404
    ├── RateLimitError          429
    └── NetworkError            status 0, cause
        ├── TimeoutError
        └── RequestAbortedError
```

- `ValidationError.field` is a path such as `content`, `embeds[2].fields[0].value` or `files[1].description`.
- `WebhookError.code` is Discord's JSON error code, such as `50035` (Invalid Form Body) or `10015` (Unknown Webhook).
- `WebhookError.message` includes Discord's field-level details, for example `Invalid Form Body (code 50035): embeds.0.description: Must be 4096 or fewer in length.`
- `NetworkError.cause` holds the original `fetch` error.

## Retries, timeouts and cancellation

| Response | Behaviour |
| --- | --- |
| 429 | Waits for Discord's `retry_after` (from the body, or the `Retry-After` header), then retries. Throws `RateLimitError` if retries run out or the wait would be longer than `maxDelay`. |
| 5xx | Exponential backoff (`baseDelay * 2^n`, ±10% jitter, capped at `maxDelay`), then retries |
| Network error / timeout | Retried for GET, PATCH and DELETE. **Not** retried for `send()`, to avoid duplicate messages. |
| Other 4xx | Thrown immediately |

`timeoutMs` applies to each attempt. `signal` cancels the whole operation, including any backoff delay, and throws `RequestAbortedError`.

## Limits

`Limits` is exported:

```ts
Limits.content          // 2000
Limits.username         // 80
Limits.threadName       // 100
Limits.embeds           // 10
Limits.files            // 10
Limits.embedTitle       // 256
Limits.embedDescription // 4096
Limits.embedFields      // 25
Limits.fieldName        // 256
Limits.fieldValue       // 1024
Limits.footerText       // 2048
Limits.authorName       // 256
Limits.embedTotal       // 6000 (title + description + fields + footer + author, across all embeds)
Limits.fileDescription  // 1024
```

Discord also limits the total upload size per message, depending on the server's boost level. ez-hook does not check that limit. Discord rejects oversized uploads with a 413 `WebhookError`.

## Troubleshooting

- **`WebhookNotFoundError`**: the webhook was deleted, or the URL or token is wrong. Copy the URL again from the channel's integration settings.
- **`Invalid Form Body (code 50035)`**: the message has the details, for example an invalid URL in an embed image.
- **Mentions don't ping**: check `allowedMentions`. `{ parse: [] }` disables all pings.
- **Embeds pile up across sends**: builder state is kept after `send()`. Use `hook.clear()`, or pass the message to `send()`.
- **Can't edit a message in a thread**: pass `threadId` to `editMessage` / `deleteMessage` / `getMessage`.
