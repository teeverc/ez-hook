# EZ-Hook Documentation

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Core Classes](#core-classes)
  - [Webhook](#webhook)
  - [Embed](#embed)
- [API Reference](#api-reference)
  - [Webhook Class](#webhook-class)
  - [Embed Class](#embed-class)
  - [RetryConfig](#retryconfig)
- [Examples](#examples)
  - [Basic Webhook](#basic-webhook)
  - [Rich Embeds](#rich-embeds)
  - [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)
  - [Common Errors](#common-errors)
  - [Validation Constraints](#validation-constraints)
- [Discord Limits](#discord-limits)
- [Troubleshooting](#troubleshooting)

## Overview

EZ-Hook is a zero-dependency TypeScript/JavaScript library for sending Discord webhooks. It's designed to be easy to use with a fluent builder pattern API and works in edge environments like Cloudflare Workers, Vercel, and Deno.

Key features:
- Zero dependencies
- TypeScript support
- Automatic retry on rate limits and server errors
- Configurable retry behavior
- Fluent builder API
- Validation against Discord's limits
- Method overloads for flexible usage

## Installation

```bash
# JSR (recommended)
npx jsr add @teever/ez-hook
# or with yarn
yarn dlx jsr add @teever/ez-hook
# or with pnpm
pnpm dlx jsr add @teever/ez-hook
# or with bun
bunx jsr add @teever/ez-hook
# or with deno
deno add @teever/ez-hook
```

## Core Classes

### Webhook

The `Webhook` class is used to create and send webhook messages to Discord. It handles the webhook URL, content, username override, avatar override, and embeds.

### Embed

The `Embed` class is used to create rich embed content for Discord webhooks. It allows you to set title, description, color, fields, images, and more.

## API Reference

### Webhook Class

#### Constructor

```typescript
constructor(webhookUrl: string, retryConfig?: Partial<RetryConfig>)
```

Creates a new webhook instance.

- `webhookUrl`: The Discord webhook URL
- `retryConfig` (optional): Configuration for the retry behavior

```typescript
// Example
const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz');
```

#### Methods

##### `setUsername(username: string): Webhook`

Sets the username override for the webhook.

- `username`: The username to display
- Returns: The webhook instance for chaining

```typescript
webhook.setUsername('Bot Name');
```

##### `setAvatarUrl(url: string): Webhook`

Sets the avatar URL override for the webhook.

- `url`: The URL of the avatar image
- Returns: The webhook instance for chaining

```typescript
webhook.setAvatarUrl('https://example.com/avatar.png');
```

##### `setTTS(flag: boolean): Webhook`

Sets whether the message should be read as text-to-speech.

- `flag`: Boolean flag for TTS
- Returns: The webhook instance for chaining

```typescript
webhook.setTTS(true);
```

##### `setContent(content: string): Webhook`

Sets the content of the webhook message.

- `content`: The message content (max 2000 characters)
- Returns: The webhook instance for chaining
- Throws: Error if content exceeds 2000 characters

```typescript
webhook.setContent('Hello, world!');
```

##### `addEmbed(embed: Embed): Webhook`

Adds a rich embed to the webhook message.

- `embed`: An Embed instance
- Returns: The webhook instance for chaining
- Throws: Error if more than 10 embeds are added

```typescript
const embed = new Embed().setTitle('Title').setDescription('Description');
webhook.addEmbed(embed);
```

##### `setFile(file: IAttachment | string): Webhook`

Sets a file to be sent with the webhook.

- `file`: File content as an attachment object or string
- Returns: The webhook instance for chaining

```typescript
webhook.setFile('file contents');
```

##### `validate(): void`

Validates the webhook contents against Discord's limits.

- Throws: Various errors if validation fails

```typescript
webhook.validate();
```

##### `send(): Promise<boolean>`

Sends the webhook to Discord.

- Returns: Promise resolving to a boolean indicating success/failure

```typescript
const success = await webhook.send();
```

##### `modify(options: IWebhookParameter): Promise<boolean>`

Modifies the webhook's properties on Discord.

- `options`: Parameters to modify
- Returns: Promise resolving to a boolean indicating success/failure

```typescript
const success = await webhook.modify({
  name: 'New Webhook Name',
  avatar: 'base64_encoded_avatar_data'
});
```

##### `get(): Promise<boolean>`

Gets the webhook information from Discord.

- Returns: Promise resolving to a boolean indicating success/failure

```typescript
const webhookInfo = await webhook.get();
```

##### `isValid(): Promise<boolean>`

Checks if the webhook URL is valid.

- Returns: Promise resolving to a boolean indicating validity

```typescript
const isValid = await webhook.isValid();
```

##### `toObject(): IWebhook`

Converts the webhook to a plain object.

- Returns: The webhook as a plain object

```typescript
const webhookObject = webhook.toObject();
```

##### `getRetryConfig(): RetryConfig`

Gets the current retry configuration.

- Returns: The current RetryConfig object

```typescript
const retryConfig = webhook.getRetryConfig();
```

### Embed Class

#### Constructor

The Embed class constructor takes no parameters.

```typescript
// Example
const embed = new Embed();
```

#### Methods

##### `setTitle(title: string): Embed`

Sets the title of the embed.

- `title`: The title text (max 256 characters)
- Returns: The embed instance for chaining
- Throws: Error if title exceeds 256 characters

```typescript
embed.setTitle('Embed Title');
```

##### `setURL(url: string): Embed`

Sets the URL of the embed.

- `url`: The URL
- Returns: The embed instance for chaining

```typescript
embed.setURL('https://example.com');
```

##### `setDescription(description: string): Embed`

Sets the description of the embed.

- `description`: The description text (max 4096 characters)
- Returns: The embed instance for chaining
- Throws: Error if description exceeds 4096 characters

```typescript
embed.setDescription('This is a description of the embed');
```

##### `setTimestamp(date?: Date): Embed`

Sets the timestamp of the embed.

- `date` (optional): A Date object (defaults to current time)
- Returns: The embed instance for chaining

```typescript
embed.setTimestamp(); // Current time
embed.setTimestamp(new Date('2023-01-01')); // Specific time
```

##### `setColor(color: number | string): Embed`

Sets the color of the embed.

- `color`: A color as a number or hex string (e.g., '#FF0000' or 0xFF0000)
- Returns: The embed instance for chaining

```typescript
embed.setColor('#FF0000'); // Hex string
embed.setColor(0xFF0000); // Number
```

##### `setFooter(footer: IFooter): Embed`
##### `setFooter(text: string, icon_url?: string | IAttachment, proxy_icon_url?: string): Embed`

Sets the footer of the embed.

- Overload 1: Takes an IFooter object
- Overload 2: Takes text and optional icon URL
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setFooter({
  text: 'Footer text',
  icon_url: 'https://example.com/icon.png'
});

// Parameters format
embed.setFooter('Footer text', 'https://example.com/icon.png');
```

##### `setImage(image: IImage): Embed`
##### `setImage(url: string, height?: number, width?: number): Embed`

Sets the image of the embed.

- Overload 1: Takes an IImage object
- Overload 2: Takes URL and optional dimensions
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setImage({
  url: 'https://example.com/image.png',
  height: 300,
  width: 400
});

// Parameters format
embed.setImage('https://example.com/image.png', 300, 400);
```

##### `setThumbnail(thumbnail: IThumbnail): Embed`
##### `setThumbnail(url: string, height?: number, width?: number): Embed`

Sets the thumbnail of the embed.

- Overload 1: Takes an IThumbnail object
- Overload 2: Takes URL and optional dimensions
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setThumbnail({
  url: 'https://example.com/thumbnail.png',
  height: 100,
  width: 100
});

// Parameters format
embed.setThumbnail('https://example.com/thumbnail.png', 100, 100);
```

##### `setVideo(video: IVideo): Embed`
##### `setVideo(url: string, height?: number, width?: number): Embed`

Sets the video of the embed.

- Overload 1: Takes an IVideo object
- Overload 2: Takes URL and optional dimensions
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setVideo({
  url: 'https://example.com/video.mp4',
  height: 480,
  width: 854
});

// Parameters format
embed.setVideo('https://example.com/video.mp4', 480, 854);
```

##### `setProvider(provider: IProvider): Embed`
##### `setProvider(name: string, url?: string): Embed`

Sets the provider of the embed.

- Overload 1: Takes an IProvider object
- Overload 2: Takes name and optional URL
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setProvider({
  name: 'Provider Name',
  url: 'https://example.com'
});

// Parameters format
embed.setProvider('Provider Name', 'https://example.com');
```

##### `setAuthor(author: IAuthor): Embed`
##### `setAuthor(name: string, url?: string, icon_url?: string): Embed`

Sets the author of the embed.

- Overload 1: Takes an IAuthor object
- Overload 2: Takes name, URL, and icon URL
- Returns: The embed instance for chaining

```typescript
// Object format
embed.setAuthor({
  name: 'Author Name',
  url: 'https://example.com/author',
  icon_url: 'https://example.com/author-icon.png'
});

// Parameters format
embed.setAuthor('Author Name', 'https://example.com/author', 'https://example.com/author-icon.png');
```

##### `addField(field: IField): Embed`
##### `addField(name: string, value: string, inline?: boolean): Embed`

Adds a field to the embed.

- Overload 1: Takes an IField object
- Overload 2: Takes name, value, and optional inline flag
- Returns: The embed instance for chaining
- Throws: Error if adding more than 25 fields, if name exceeds 256 characters, if value is empty, or if value exceeds 1024 characters

```typescript
// Object format
embed.addField({
  name: 'Field Name',
  value: 'Field Value',
  inline: true
});

// Parameters format
embed.addField('Field Name', 'Field Value', true);
```

##### `setFields(fields: Array<IField>): Embed`

Sets multiple fields at once.

- `fields`: Array of IField objects
- Returns: The embed instance for chaining
- Throws: Error if more than 25 fields are provided

```typescript
embed.setFields([
  { name: 'Field 1', value: 'Value 1', inline: true },
  { name: 'Field 2', value: 'Value 2', inline: true }
]);
```

##### `toObject(): IEmbed`

Converts the embed to a plain object.

- Returns: The embed as a plain object

```typescript
const embedObject = embed.toObject();
```

### RetryConfig

Interface for configuring retry behavior.

```typescript
interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * Default: 3
   */
  maxRetries: number;
  
  /**
   * Base delay in milliseconds between retries
   * Default: 1000 (1 second)
   */
  baseDelay: number;
  
  /**
   * Maximum delay in milliseconds between retries
   * Default: 60000 (60 seconds)
   */
  maxDelay: number;
}
```

## Examples

### Basic Webhook

```typescript
import { Webhook } from '@teever/ez-hook';

async function sendBasicWebhook() {
  const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz');
  
  // Set basic properties
  webhook
    .setUsername('Notification Bot')
    .setAvatarUrl('https://example.com/bot-avatar.png')
    .setContent('Hello from EZ-Hook!');
  
  // Send the webhook
  const success = await webhook.send();
  
  console.log(success ? 'Webhook sent successfully!' : 'Failed to send webhook');
}

sendBasicWebhook();
```

### Rich Embeds

```typescript
import { Webhook, Embed } from '@teever/ez-hook';

async function sendRichEmbed() {
  const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz');
  
  // Create an embed
  const embed = new Embed()
    .setTitle('Server Status')
    .setDescription('Current server status and statistics')
    .setColor('#00FF00')
    .setTimestamp()
    .setFooter('Powered by EZ-Hook', 'https://example.com/logo.png')
    .addField('CPU', '34%', true)
    .addField('RAM', '45%', true)
    .addField('Disk', '67%', true)
    .addField('Uptime', '3 days, 7 hours', false)
    .setThumbnail('https://example.com/server-icon.png');
  
  // Add the embed to the webhook
  webhook.addEmbed(embed);
  
  // Send the webhook
  const success = await webhook.send();
  
  console.log(success ? 'Rich embed sent successfully!' : 'Failed to send rich embed');
}

sendRichEmbed();
```

### Advanced Usage

```typescript
import { Webhook, Embed } from '@teever/ez-hook';

async function sendAdvancedWebhook() {
  // Custom retry configuration
  const retryConfig = {
    maxRetries: 5,     // Try up to 5 times
    baseDelay: 500,    // Start with 500ms delay
    maxDelay: 10000    // Max delay of 10 seconds
  };
  
  const webhook = new Webhook(
    'https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz',
    retryConfig
  );
  
  // Set webhook properties
  webhook
    .setUsername('Status Bot')
    .setContent('Weekly system report');
  
  // First embed - System status
  const statusEmbed = new Embed()
    .setTitle('System Status')
    .setColor('#00FF00')
    .setDescription('All systems operational')
    .addField('Uptime', '99.99%', true)
    .addField('Response Time', '124ms', true);
  
  // Second embed - Incident report
  const incidentEmbed = new Embed()
    .setTitle('Recent Incidents')
    .setColor('#FFA500')
    .setDescription('Minor incidents in the past week')
    .addField('Database Slowdown', 'Resolved after 15 minutes', false)
    .setTimestamp(new Date('2023-04-01T14:30:00Z'));
  
  // Add embeds to webhook
  webhook
    .addEmbed(statusEmbed)
    .addEmbed(incidentEmbed);
  
  // Check if webhook is valid before sending
  const isValid = await webhook.isValid();
  
  if (isValid) {
    // Send the webhook
    const success = await webhook.send();
    console.log(success ? 'Advanced webhook sent successfully!' : 'Failed to send advanced webhook');
  } else {
    console.error('Invalid webhook URL');
  }
}

sendAdvancedWebhook();
```

## Error Handling

EZ-Hook provides validation against Discord's limits and throws descriptive errors when limits are exceeded.

### Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Content length exceeds 2000 characters` | Message content is too long | Reduce content length or split into multiple messages |
| `Embeds length exceeds 10` | Too many embeds added | Remove embeds or split into multiple messages |
| `Fields length exceeds 25` | Too many fields in an embed | Remove fields or split across multiple embeds |
| `Field name length exceeds 256 characters` | Field name too long | Shorten field name |
| `Field value length exceeds 1024 characters` | Field value too long | Shorten field value |
| `Field value is required` | Empty field value | Add content to the field value |
| `Title length exceeds 256 characters` | Embed title too long | Shorten embed title |
| `Description length exceeds 4096 characters` | Embed description too long | Shorten embed description |

### Validation Constraints

```typescript
try {
  const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz');
  
  // This will throw an error
  webhook.setContent('a'.repeat(3000)); 
} catch (error) {
  console.error('Validation error:', error.message);
  // Handle the error appropriately
}

try {
  const embed = new Embed();
  
  // Add 26 fields (will throw at the 26th)
  for (let i = 0; i < 26; i++) {
    embed.addField(`Field ${i}`, `Value ${i}`);
  }
} catch (error) {
  console.error('Validation error:', error.message);
  // Handle the error appropriately
}
```

## Discord Limits

EZ-Hook validates against Discord's webhook limits:

- **Content Limits**:
  - Message content: 2000 characters
  - Embed title: 256 characters
  - Embed description: 4096 characters
  - Embed fields: Up to 25 fields
  - Embed field name: 256 characters
  - Embed field value: 1024 characters
  - Total embeds per message: 10

- **Rate Limits**:
  - Default rate limit: 30 requests per minute per webhook
  - EZ-Hook automatically handles rate limits with configurable retry behavior

## Troubleshooting

### Webhook Not Sending

1. Check if the webhook URL is valid using `webhook.isValid()`
2. Ensure you're calling `await webhook.send()` and handling the Promise
3. Make sure your content and embeds don't exceed Discord's limits

### Rate Limiting Issues

EZ-Hook automatically retries on rate limits, but if you're experiencing persistent issues:

1. Reduce the frequency of webhook sends
2. Customize the retry behavior:

```typescript
const webhook = new Webhook('https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz', {
  maxRetries: 5,    // More retries
  baseDelay: 2000,  // Longer delay between retries
  maxDelay: 120000  // Longer maximum delay
});
```

### Webhook Not Appearing as Expected

1. Check that you've set all required properties
2. Ensure URLs for images, thumbnails, and avatars are publicly accessible
3. Verify that your webhook hasn't been deleted or regenerated on Discord
4. Make sure you're not exceeding Discord's limits