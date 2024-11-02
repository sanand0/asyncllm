import { anthropic } from "./anthropic.js";

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(
    message || `Expected:\n${JSON.stringify(expected, null, 2)}. Actual:\n${JSON.stringify(actual, null, 2)}`,
  );
}

// 1. System message handling
Deno.test("anthropic - system message handling", () => {
  const input = {
    messages: [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hi" },
    ],
  };

  const expected = {
    system: "You are helpful",
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 4096,
  };

  assertEquals(anthropic(input), expected);
});

// 2. Basic message conversion
Deno.test("anthropic - basic message conversion", () => {
  const input = {
    messages: [{ role: "user", content: "Hello" }],
  };

  const expected = {
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 4096,
  };

  assertEquals(anthropic(input), expected);
});

// 2b. Multimodal content handling
Deno.test("anthropic - multimodal content", () => {
  const input = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What's in this image?" },
          {
            type: "image_url",
            image_url: { url: "data:image/jpeg;base64,abc123" },
          },
        ],
      },
    ],
  };

  const expected = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What's in this image?" },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: "abc123",
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  };

  assertEquals(anthropic(input), expected);
});

// 3. Parameter conversion
Deno.test("anthropic - parameter conversion", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    model: "claude-3-5-sonnet-20241002",
    max_tokens: 100,
    metadata: { user_id: "123" },
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    stop: ["END"],
  };

  const expected = {
    messages: [{ role: "user", content: "Hi" }],
    model: "claude-3-5-sonnet-20241002",
    max_tokens: 100,
    metadata: { user_id: "123" },
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    stop_sequences: ["END"],
  };

  assertEquals(anthropic(input), expected);
});

// 3b. Array stop sequences
Deno.test("anthropic - array stop sequences", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    stop: ["STOP", "END"],
  };

  const expected = {
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 4096,
    stop_sequences: ["STOP", "END"],
  };

  assertEquals(anthropic(input), expected);
});

// 4. Tool handling
Deno.test("anthropic - tool calling configurations", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: "auto",
    parallel_tool_calls: true,
    tools: [
      {
        function: {
          name: "get_weather",
          description: "Get weather info",
          parameters: {
            type: "object",
            properties: { location: { type: "string" } },
          },
        },
      },
    ],
  };

  const expected = {
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 4096,
    tool_choice: { type: "auto", disable_parallel_tool_use: false },
    tools: [
      {
        name: "get_weather",
        description: "Get weather info",
        input_schema: {
          type: "object",
          properties: { location: { type: "string" } },
        },
      },
    ],
  };

  assertEquals(anthropic(input), expected);
});

// 4b. Specific tool choice
Deno.test("anthropic - specific tool choice", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: { function: { name: "get_weather" } },
  };

  const expected = {
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 4096,
    tool_choice: { type: "tool", name: "get_weather" },
  };

  assertEquals(anthropic(input), expected);
});
