import { gemini } from "./gemini.js";

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(
    message || `Expected:\n${JSON.stringify(expected, null, 2)}. Actual:\n${JSON.stringify(actual, null, 2)}`,
  );
}

Deno.test("gemini - basic message conversion", () => {
  const input = {
    messages: [{ role: "user", content: "Hello" }],
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hello" }] }],
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - system message handling", () => {
  const input = {
    messages: [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hi" },
    ],
  };

  const expected = {
    systemInstruction: { parts: [{ text: "You are helpful" }] },
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - assistant message conversion", () => {
  const input = {
    messages: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ],
  };

  const expected = {
    contents: [
      { role: "user", parts: [{ text: "Hi" }] },
      { role: "model", parts: [{ text: "Hello" }] },
    ],
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - multimodal content", () => {
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
          {
            type: "input_audio",
            input_audio: { data: "https://example.com/audio.mp3" },
          },
        ],
      },
    ],
  };

  const expected = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "What's in this image?" },
          { inlineData: { mimeType: "image/jpeg", data: "abc123" } },
          { fileData: { fileUri: "https://example.com/audio.mp3" } },
        ],
      },
    ],
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - generation config parameters", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    temperature: 0.7,
    max_tokens: 100,
    top_p: 0.9,
    presence_penalty: 0.5,
    frequency_penalty: 0.5,
    logprobs: true,
    top_logprobs: 3,
    n: 2,
    stop: ["END"],
    response_format: { type: "json_object" },
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
      topP: 0.9,
      presencePenalty: 0.5,
      frequencyPenalty: 0.5,
      responseLogprobs: true,
      logprobs: 3,
      candidateCount: 2,
      stopSequences: ["END"],
      responseMimeType: "application/json",
    },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - tool calling configurations", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: "auto",
    tools: [
      {
        function: {
          name: "get_weather",
          description: "Get weather info",
          parameters: {
            type: "object",
            properties: { location: { type: "string" } },
            required: ["location"],
            additionalProperties: false,
          },
        },
      },
    ],
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    toolsConfig: { function_calling_config: { mode: "AUTO" } },
    tools: {
      functionDeclarations: [
        {
          name: "get_weather",
          description: "Get weather info",
          parameters: {
            type: "object",
            properties: { location: { type: "string" } },
            required: ["location"],
          },
        },
      ],
    },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - specific tool choice", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: { function: { name: "get_weather" } },
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    toolsConfig: {
      function_calling_config: {
        mode: "ANY",
        allowed_function_names: ["get_weather"],
      },
    },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - json schema response format", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            additionalProperties: false,
          },
        },
      },
    },
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: { name: { type: "string" }, age: { type: "number" } },
      },
    },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - required tool choice", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: "required",
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    toolsConfig: { function_calling_config: { mode: "ANY" } },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - none tool choice", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    tool_choice: "none",
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    toolsConfig: { function_calling_config: { mode: "NONE" } },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - string stop sequence", () => {
  const input = { messages: [{ role: "user", content: "Hi" }], stop: "STOP" };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    generationConfig: { stopSequences: ["STOP"] },
  };

  assertEquals(gemini(input), expected);
});

Deno.test("gemini - max_completion_tokens parameter", () => {
  const input = {
    messages: [{ role: "user", content: "Hi" }],
    max_completion_tokens: 150,
  };

  const expected = {
    contents: [{ role: "user", parts: [{ text: "Hi" }] }],
    generationConfig: { maxOutputTokens: 150 },
  };

  assertEquals(gemini(input), expected);
});
