# asyncLLM

[![npm version](https://img.shields.io/npm/v/asyncllm.svg)](https://www.npmjs.com/package/asyncllm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fetch LLM responses across multiple providers as an async iterable.

## Features

- 🚀 Lightweight (~2KB) and dependency-free
- 🔄 Works with multiple LLM providers (OpenAI, Anthropic, Gemini, and more)
- 🌐 Browser and Node.js compatible
- 📦 Easy to use with ES modules

## Installation

```bash
npm install asyncllm
```

## Anthropic and Gemini Adapters

Adapters convert OpenAI-style request bodies to the [Anthropic](https://docs.anthropic.com/en/api/messages) or [Gemini](https://ai.google.dev/gemini-api/docs/text-generation?lang=rest) formats. For example:

```javascript
import { anthropic } from "https://cdn.jsdelivr.net/npm/asyncllm@2/dist/anthropic.js";
import { gemini } from "https://cdn.jsdelivr.net/npm/asyncllm@2/dist/gemini.js";

// Create an OpenAI-style request
const body = {
  messages: [{ role: "user", content: "Hello, world!" }],
  temperature: 0.5,
};

// Fetch request with the Anthropic API
const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "YOUR_API_KEY" },
  // anthropic() converts the OpenAI-style request to Anthropic's format
  body: JSON.stringify(anthropic({ ...body, model: "claude-3-haiku-20240307" })),
}).then((r) => r.json());

// Fetch request with the Gemini API
const geminiResponse = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent",
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer YOUR_API_KEY` },
    // gemini() converts the OpenAI-style request to Gemini's format
    body: JSON.stringify(gemini(body)),
  },
).then((r) => r.json());
```

Here are the parameters supported by each provider.

| OpenAI Parameter                    | Anthropic | Gemini |
| ----------------------------------- | --------- | ------ |
| messages                            | Y         | Y      |
| system message                      | Y         | Y      |
| temperature                         | Y         | Y      |
| max_tokens                          | Y         | Y      |
| top_p                               | Y         | Y      |
| stop sequences                      | Y         | Y      |
| stream                              | Y         | Y      |
| presence_penalty                    |           | Y      |
| frequency_penalty                   |           | Y      |
| logprobs                            |           | Y      |
| top_logprobs                        |           | Y      |
| n (multiple candidates)             |           | Y      |
| metadata.user_id                    | Y         |        |
| tools/functions                     | Y         | Y      |
| tool_choice                         | Y         | Y      |
| parallel_tool_calls                 | Y         |        |
| response_format.type: "json_object" |           | Y      |
| response_format.type: "json_schema" |           | Y      |

Content types:

| OpenAI | Anthropic | Gemini |
| ------ | --------- | ------ |
| Text   | Y         | Y      |
| Images | Y         | Y      |
| Audio  |           | Y      |

Image Sources

| OpenAI Parameter | Anthropic | Gemini |
| ---------------- | --------- | ------ |
| Data URI         | Y         | Y      |
| External URLs    |           | Y      |

## Streaming

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
    import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";

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

## Examples

### OpenAI streaming

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";

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

### Anthropic streaming

The package includes an Anthropic adapter that converts OpenAI-style requests to Anthropic's format,
allowing you to use the same code structure across providers.

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { anthropic } from "https://cdn.jsdelivr.net/npm/asyncllm@2/dist/anthropic.js";

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

### Gemini streaming

The package includes a Gemini adapter that converts OpenAI-style requests to Gemini's format,
allowing you to use the same code structure across providers.

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
import { gemini } from "https://cdn.jsdelivr.net/npm/asyncllm@2/dist/gemini.js";

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

### Function Calling

asyncLLM supports function calling (aka tools). Here's an example with OpenAI:

```javascript
for await (const { tools } of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      { role: "system", content: "Get delivery date for order" },
      { role: "user", content: "Order ID: 123456" },
    ],
    tool_choice: "required",
    tools: [
      {
        type: "function",
        function: {
          name: "get_delivery_date",
          parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
        },
      },
    ],
  }),
})) {
  console.log(JSON.stringify(tools));
}
```

`tools` is an array of objects with `name`, `id` (for Anthropic and OpenAI, not Gemini), and `args` properties. It streams like this:

```json
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":""}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\""}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order"}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order_id"}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order_id\":\""}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order_id\":\"123"}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order_id\":\"123456"}]
[{"name":"get_delivery_date","id":"call_F8YHCjnzrrTjfE4YSSpVW2Bc","args":"{\"order_id\":\"123456\"}"}]
```

Use a library like [partial-json](https://www.npmjs.com/package/partial-json) to parse the `args` incrementally.

### Streaming Config

asyncLLM accepts a `config` object with the following properties:

- `fetch`: Custom fetch implementation (defaults to global `fetch`).
- `onResponse`: Async callback function that receives the Response object before streaming begins. If the callback returns a promise, it will be awaited before continuing the stream.

Here's how you can use a custom fetch implementation:

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";

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
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@2";
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
- `tools`: Array of tool call objects with:
  - `name`: The name of the tool being called
  - `args`: The arguments for the tool call as a JSON-encoded string, e.g. `{"order_id":"123456"}`
  - `id`: Optional unique identifier for the tool call (e.g. OpenAI's `call_F8YHCjnzrrTjfE4YSSpVW2Bc` or Anthropic's `toolu_01T1x1fJ34qAmk2tNTrN7Up6`. Gemini does not return an id.)
- `message`: The raw message object from the LLM provider (may include id, model, usage stats, etc.)
- `error`: Error message if the request fails

## Changelog

- 2.1.2: Update repo links
- 2.1.1: Document standalone adapter usage
- 2.1.0: Added `id` to tools to support unique tool call identifiers from providers
- 2.0.1: Multiple tools support.
  - Breaking change: `tool` and `args` are not part of the response. Instead, it has `tools`, an array of `{ name, args }`
  - Fixed Gemini adapter to return `toolConfig` instead of `toolsConfig`
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
