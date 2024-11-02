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
        model: "gpt-4",
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
  - `onResponse`: Async callback function that receives the Response object before streaming begins. If the callback returns a promise, it will be awaited before continuing the stream.

Returns an async generator that yields [`LLMEvent` objects](#llmevent).

#### LLMEvent

- `content`: The text content of the response
- `tool`: The name of the tool being called (for function calling)
- `args`: The arguments for the tool call (for function calling) as a JSON-encoded string, e.g. `{"order_id":"123456"}`
- `message`: The raw message object from the LLM provider

## Examples

### OpenAI

```javascript
import { asyncLLM } from "https://cdn.jsdelivr.net/npm/asyncllm@1";

const body = {
  model: "gpt-4o-mini",
  stream: true,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is 2+2?" },
  ],
  temperature: 0.7,
  max_tokens: 10,
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the weather for a location",
        parameters: {
          type: "object",
          properties: { location: { type: "string" } },
          required: ["location"],
        },
      },
    },
  ],
};

const config = {
  onResponse: async (response) => {
    console.log(response.status, response.headers);
  },
};

for await (const { content } of asyncLLM(
  "https://api.openai.com/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  },
  config,
)) {
  console.log(content);
}
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
  stream: true,
  max_tokens: 10,
  messages: [{ role: "user", content: "What is 2 + 2" }],
};

for await (const { content } of asyncLLM("https://api.anthropic.com/v1/messages", {
  headers: { "Content-Type": "application/json", "x-api-key": apiKey },
  body: JSON.stringify(body),
})) {
  console.log(content);
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

// You can use the anthropic() adapter to convert OpenAI-style requests to Anthropic's format.
const body = anthropic({
  // Same as OpenAI example above
});

// Or you can use the asyncLLM() function directly with the Anthropic API endpoint.
const body = {
  contents: [{ role: "user", parts: [{ text: "What is 2+2?" }] }],
};

for await (const { content } of asyncLLM(
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
  console.log(content);
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
for await (const { content, tool, args, error } of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4",
    stream: true,
    messages: [
      {
        role: "system",
        content: "Call get_delivery_date with the order ID.",
      },
      { role: "user", content: "123456" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_delivery_date",
          description: "Get the delivery date for a customer order.",
          parameters: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "The customer order ID.",
              },
            },
            required: ["order_id"],
          },
        },
      },
    ],
  }),
})) {
  console.log(error ?? content, tool, args);
}
```

The `tool` and `args` properties are incrementally streamed until the LLM calls a tool.

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

## Changelog

- 1.2.0: Added `config.onResponse(response)` that receives the Response object before streaming begins
- 1.1.3: Ensure `max_tokens` for Anthropic. Improve error handling
- 1.1.1: Added [Anthropic adapter](#anthropic)
- 1.1.0: Added [Gemini adapter](#gemini)
- 1.0.0: Initial release with [asyncLLM](#asyncllm) and [LLMEvent](#llmevent)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
