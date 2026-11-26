# Changelog

## 0.5.0

A reworked, more predictable API. **This release has breaking changes**, see [Migrating from 0.3.x](#migrating-from-03x).

### Breaking

- `send()`, `get()` and `modify()` now **throw** typed errors on failure instead of returning `{ ok, status, error }`.
- `send()` now waits for Discord to confirm the message (`?wait=true`) and returns the created message (`IMessage`). Pass `{ wait: false }` for the old fire-and-forget behaviour; it then returns `void`.
- `get()` and `modify()` return the parsed webhook object (`IWebhookResponse`) instead of the raw body text.
- Empty messages (no content, embeds or files) are rejected with a `ValidationError` instead of being sent to Discord.
- Invalid webhook URLs are rejected in the constructor.
- Network errors are no longer retried for `send()`, so a lost response can't post the same message twice. GET, PATCH and DELETE are still retried.
- If Discord asks to wait longer than `retry.maxDelay`, a `RateLimitError` is thrown immediately.
- Setters return `this`, so subclasses keep their type.
- `Embed.toObject()` omits unset properties.
- Some `IWebhookResponse` fields are now typed as nullable, matching Discord's API.

### Added

- `send(message)` takes a string or a `WebhookMessage` object (`content`, `embeds`, `files`, `username`, `avatarUrl`, `tts`, `allowedMentions`, `flags`, `threadId`, `threadName`, `appliedTags`).
- `trySend()` never throws and returns `{ ok: true, data } | { ok: false, error }`.
- `getMessage()`, `editMessage()`, `deleteMessage()` and `deleteWebhook()`.
- Thread and forum support: `threadId`, `threadName`, `appliedTags`, plus `setThreadId()` and `setThreadName()`.
- `allowedMentions`, both per message and as a constructor default.
- `MessageFlags` (`SuppressEmbeds`, `SuppressNotifications`), passed as names or as a bitfield.
- Multiple files per message: `files: [...]` and `addFile()`.
- Constructor options: `retry`, `timeoutMs`, `headers`, plus default `username`, `avatarUrl` and `allowedMentions`.
- New error classes `NetworkError`, `TimeoutError` and `RequestAbortedError`. `WebhookError` gains `status`, `code` (Discord JSON error code) and `body`, and its message includes Discord's field-level details.
- Full validation at send time, including the 6000-character embed total, field names, username length and file count. Errors report exact paths such as `embeds[1].fields[0].value`.
- `new Embed(data)` / `Embed.from(data)`, `addFields(...)`, `setUrl()`, `toJSON()`. `setTimestamp()` accepts a `Date`, number or string.
- `Webhook.setEmbeds()` and `clear()`.
- All public types are exported from the package root, along with `EzHookError` and `Limits`.

### Fixed

- Errors documented in the README (`RateLimitError`, `WebhookNotFoundError`, ...) were never thrown.
- Changes made to an `Embed` after `addEmbed()` were silently lost.
- `retry_after` from Discord's JSON body is now used, which has millisecond precision.
- Aborting a request during a retry delay now cancels it immediately.

### Deprecated

- Passing a bare retry config as the second constructor argument (`new Webhook(url, { maxRetries })`). Use `new Webhook(url, { retry: { maxRetries } })`.
- `Embed.setURL()`. Use `setUrl()`.

### Migrating from 0.3.x

```ts
// Before
const res = await hook.setContent('Hi').send()
if (!res.ok) console.error(res.error)

// After: throws
try {
  const message = await hook.send('Hi')
} catch (error) {
  console.error(error)
}

// After: result object
const result = await hook.trySend('Hi')
if (!result.ok) console.error(result.error)
```

```ts
// Before
const info = JSON.parse((await hook.get()).bodyText ?? '{}')
// After
const info = await hook.get()
```

```ts
// Before
new Webhook(url, { maxRetries: 5 })
// After
new Webhook(url, { retry: { maxRetries: 5 } })
```

If you reused one `Webhook` with `addEmbed()` and `send()`, embeds kept piling up across sends. Pass the message to `send()` directly, or call `hook.clear()` between messages.
