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
<!DOCTYPE html>
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

### `asyncLLM(request: string | Request, options?: RequestInit): AsyncGenerator<LLMEvent, void, unknown>`

Fetches streaming responses from LLM providers and yields events.

- `request`: The URL or Request object for the LLM API endpoint
- `options`: Optional [fetch options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters)

Returns an async generator that yields [`LLMEvent` objects](#llmevent).

#### LLMEvent

- `content`: The text content of the response
- `tool`: The name of the tool being called (for function calling)
- `args`: The arguments for the tool call (for function calling) as a JSON-encoded string, e.g. `{"order_id":"123456"}`
- `message`: The raw message object from the LLM provider

## Examples

### OpenAI

```javascript
for await (const { content } of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4",
    stream: true,
    messages: [{ role: "user", content: "Hello world" }],
  }),
})) {
  console.log(content);
}
```

### Anthropic

```javascript
for await (const { content } of asyncLLM("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify({
    model: "claude-3-haiku-20240307",
    stream: true,
    max_tokens: 10,
    messages: [{ role: "user", content: "What is 2 + 2" }],
  }),
})) {
  console.log(content);
}
```

### Gemini

```javascript
for await (const { content } of asyncLLM(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:streamGenerateContent?alt=sse",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "What is 2+2?" }] }],
    }),
  }
)) {
  console.log(content);
}
```

### Function Calling

asyncLLM supports function calling for compatible LLM providers. Here's an example with OpenAI:

```javascript
for await (const { content, tool, args } of asyncLLM("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4",
    stream: true,
    messages: [
      { role: "system", content: "Call get_delivery_date with the order ID." },
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
            properties: { order_id: { type: "string", description: "The customer order ID." } },
            required: ["order_id"],
          },
        },
      },
    ],
  }),
})) {
  console.log(content, tool, args);
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
