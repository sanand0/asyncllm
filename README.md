# asyncLLM

[![npm version](https://img.shields.io/npm/v/asyncllm.svg)](https://www.npmjs.com/package/asyncllm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fetch LLM responses as an async iterable.

## Features

- 🚀 Lightweight (<2KB) and dependency-free
- 🔄 Works with multiple LLM providers (OpenAI, Anthropic, Gemini, and more)
- 🌐 Browser and Node.js compatible
- 📦 Easy to use with ES modules

## Installation

```bash
npm install asyncllm
```

## Usage

Call `asyncLLM()` just like you would use `fetch` with any LLM provider with streaming responses.

- [OpenAI Streaming](https://platform.openai.com/docs/api-reference/chat/streaming). Many providers like Azure, Groq, OpenRouter, etc. follow the OpenAI API.
- [Anthropic Streaming](https://docs.anthropic.com/en/api/messages-streaming)
- [Gemini Streaming](https://ai.google.dev/gemini-api/docs/text-generation?lang=rest#generate-a-text-stream)

The result is an async generator that yields objects with `content`, `tool`, and `args` properties.

For example, to update the DOM with the LLM's response:

```html
<!doctype html>
<html lang="en">
  <body>
    <div id="output"></div>
  </body>

  <script type="module">
    import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";

    const apiKey = "YOUR_API_KEY";

    // Example usage with OpenAI
    for await (const { content } of asyncLLM("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        // You MUST enable streaming, else the API will return an {error}
        stream: true,
        messages: [{ role: "user", content: "Hello, world!" }],
      }),
    })) {
      // Update the output in real time.
      document.getElementById("output").textContent = content;
    }
  </script>
</html>
```

### Node.js or bundled projects

```javascript
import { asyncLLM } from "asyncllm";

// Usage is the same as in the browser example
```

## API

### `asyncLLM(request: string | Request, options?: RequestInit, config?: SSEConfig): AsyncGenerator<LLMEvent, void, unknown>`

Fetches streaming responses from LLM providers and yields events.

- `request`: The URL or Request object for the LLM API endpoint
- `options`: Optional [fetch options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters)
- `config`: Optional configuration object for SSE handling
  - `fetch`: Custom fetch implementation (defaults to global fetch)
  - `onResponse`: Async callback function that receives the Response object before streaming begins. If the callback returns a promise, it will be awaited before continuing the stream.

Returns an async generator that yields [`LLMEvent` objects](#llmevent).

#### LLMEvent

- `content`: The text content of the response
- `tool`: The name of the tool being called (for function calling)
- `args`: The arguments for the tool call (for function calling) as a JSON-encoded string, e.g. `{"order_id":"123456"}`
- `message`: The raw message object from the LLM provider (may include id, model, usage stats, etc.)
- `error`: Error message if the request fails

## Examples

### OpenAI

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";

const body = {
  model: "gpt-4o-mini",
  // You MUST enable streaming, else the API will return an {error}
  stream: true,
  messages: [{ role: "user", content: "Hello, world!" }],
};

for await (const data of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify(body),
})) {
  console.log(data);
}
```

This will log something like this on the console:

```js
{ content: "", tool: undefined, args: undefined, message: { "id": "chatcmpl-...", ...} }
{ content: "Hello", tool: undefined, args: undefined, message: { "id": "chatcmpl-...", ...} }
{ content: "Hello!", tool: undefined, args: undefined, message: { "id": "chatcmpl-...", ...} }
{ content: "Hello! How", tool: undefined, args: undefined, message: { "id": "chatcmpl-...", ...} }
...
{ content: "Hello! How can I assist you today?", tool: undefined, args: undefined, message: { "id": "chatcmpl-...", ...} }
```

### Anthropic

The package includes an Anthropic adapter that converts OpenAI-style requests to Anthropic's format,
allowing you to use the same code structure across providers.

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";
import { anthropic } from "https://cdn.jsdelivr.net/npm/asyncllm@1/dist/anthropic.js";

// You can use the anthropic() adapter to convert OpenAI-style requests to Anthropic's format.
const body = anthropic({
  // Same as OpenAI example above
});

// Or you can use the asyncLLM() function directly with the Anthropic API endpoint.
const body = {
  model: "claude-3-haiku-20240307",
  // You MUST enable streaming, else the API will return an {error}
  stream: true,
  max_tokens: 10,
  messages: [{ role: "user", content: "What is 2 + 2" }],
};

for await (const data of asyncLLM("https://api.anthropic.com/v1/messages", {
  headers: { "Content-Type": "application/json", "x-api-key": apiKey },
  body: JSON.stringify(body),
})) {
  console.log(data);
}
```

The Anthropic adapter supports:

- System messages
- Multi-modal content (text and images only, no audio support)
- Model parameters (temperature, max_tokens, top_p, stop, metadata.user_id, but not n, presence_penalty, frequency_penalty, logprobs, top_logprobs)
- User metadata
- Function/tool calling with parallel execution control
- Stop sequences

### Gemini

The package includes a Gemini adapter that converts OpenAI-style requests to Gemini's format,
allowing you to use the same code structure across providers.

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";
import { gemini } from "https://cdn.jsdelivr.net/npm/asyncllm@1/dist/gemini.js";

// You can use the gemini() adapter to convert OpenAI-style requests to Gemini's format.
const body = gemini({
  // Same as OpenAI example above
});

// Or you can use the asyncLLM() function directly with the Gemini API endpoint.
const body = {
  contents: [{ role: "user", parts: [{ text: "What is 2+2?" }] }],
};

for await (const data of asyncLLM(
  // You MUST use a streaming endpoint, else the API will return an {error}
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:streamGenerateContent?alt=sse",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  },
)) {
  console.log(data);
}
```

The Gemini adapter supports:

- System messages
- Multi-modal content (text, images, audio via URL or data URI)
- Model parameters (temperature, max_tokens, top_p, stop, n, presence_penalty, frequency_penalty, logprobs, top_logprobs, but not metadata)
- Function calling (no parallel execution support)
- JSON mode and schema validation
- Stop sequences
- Multiple candidates

### Function Calling

asyncLLM supports function calling (aka tools). Here's an example with OpenAI:

```javascript
for await (const data of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      { role: "system", content: "Call get_delivery_date with the order ID." },
      { role: "user", content: "123456" },
    ],
    tool_choice: "required",
    tools: [
      {
        type: "function",
        function: {
          name: "get_delivery_date",
          description: "Get the delivery date for a customer order.",
          parameters: {
            type: "object",
            properties: { order_id: { type: "string", description: "The customer order ID." } },
            required: ["order_id"],
          },
        },
      },
    ],
  }),
})) {
  console.log(data.tool, data.args);
}
```

The `tool` and `args` properties are incrementally streamed, like this:

```js
{tool: 'get_delivery_date', args: '', content: undefined, message: { ... }}
{tool: 'get_delivery_date', args: '{\n', content: undefined, message: { ... }}
{tool: 'get_delivery_date', args: '{\n  "order_id":', content: undefined, message: { ... }}
...
{tool: 'get_delivery_date', args: '{\n  "order_id": "123456"\n}', content: undefined, message: { ... }}
```

- `tool` is the name of the tool being called.
- `args` is JSON-encoded. Parse with a partial JSON parser like [partial-json](https://www.npmjs.com/package/partial-json).
- **NOTE**: Multiple tool calls are not explicitly supported yet.

### Config

asyncLLM accepts a `config` object with the following properties:

- `fetch`: Custom fetch implementation (defaults to global `fetch`).
- `onResponse`: Async callback function that receives the Response object before streaming begins. If the callback returns a promise, it will be awaited before continuing the stream.

Here's how you can use a custom fetch implementation:

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";

const body = {
  // Same as OpenAI example above
};

// Optional configuration. You can ignore it for most use cases.
const config = {
  onResponse: async (response) => {
    console.log(response.status, response.headers);
  },
  // You can use a custom fetch implementation if needed
  fetch: fetch,
};

for await (const { content } of asyncLLM(
  "https://api.openai.com/v1/chat/completions",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  },
  config,
)) {
  console.log(content);
}
```

## Streaming from text

You can parse streamed SSE events from a text string (e.g. from a cached response) using the provided `fetchText` helper:

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";
import { fetchText } from "https://cdn.jsdelivr.net/npm/asyncsse@1/dist/fetchtext.js";

const text = `
data: {"candidates": [{"content": {"parts": [{"text": "2"}],"role": "model"}}]}

data: {"candidates": [{"content": {"parts": [{"text": " + 2 = 4\\n"}],"role": "model"}}]}

data: {"candidates": [{"content": {"parts": [{"text": ""}],"role": "model"}}]}
`;

// Stream events from text
for await (const event of asyncLLM(text, {}, { fetch: fetchText })) {
  console.log(event);
}
```

This outputs:

```
{ data: "Hello" }
{ data: "World" }
```

This is particularly useful for testing SSE parsing without making actual HTTP requests.

### Error handling

If an error occurs, it will be yielded in the `error` property. For example:

```javascript
for await (const { content, error } of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  // ...
})) {
  if (error) console.error(error);
  else console.log(content);
}
```

The `error` property is set if:

- The underlying API (e.g. OpenAI, Anthropic, Gemini) returns an error in the response (e.g. `error.message` or `message.error` or `error`)
- The fetch request fails (e.g. network error)
- The response body cannot be parsed as JSON

## Changelog

- 1.2.2: Added streaming from text documentation via `config.fetch`. Upgrade to asyncSSE 1.3.1 (bug fix).
- 1.2.1: Added `config.fetch` for custom fetch implementation
- 1.2.0: Added `config.onResponse(response)` that receives the Response object before streaming begins
- 1.1.3: Ensure `max_tokens` for Anthropic. Improve error handling
- 1.1.1: Added [Anthropic adapter](#anthropic)
- 1.1.0: Added [Gemini adapter](#gemini)
- 1.0.0: Initial release with [asyncLLM](#asyncllm) and [LLMEvent](#llmevent)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
