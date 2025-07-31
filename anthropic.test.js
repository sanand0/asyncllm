import { describe, it, expect } from "vitest";
import { anthropic } from "./anthropic.js";

const cases = [
  {
    name: "system message handling",
    input: {
      messages: [
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hi" },
      ],
    },
    expected: { system: "You are helpful", messages: [{ role: "user", content: "Hi" }], max_tokens: 4096 },
  },
  {
    name: "basic message conversion",
    input: { messages: [{ role: "user", content: "Hello" }] },
    expected: { messages: [{ role: "user", content: "Hello" }], max_tokens: 4096 },
  },
  {
    name: "multimodal content",
    input: {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image_url", image_url: { url: "data:image/jpeg;base64,abc123" } },
          ],
        },
      ],
    },
    expected: {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "abc123" } },
          ],
        },
      ],
      max_tokens: 4096,
    },
  },
  {
    name: "array stop sequences",
    input: { messages: [{ role: "user", content: "Hi" }], stop: ["STOP", "END"] },
    expected: { messages: [{ role: "user", content: "Hi" }], max_tokens: 4096, stop_sequences: ["STOP", "END"] },
  },
  {
    name: "tool calling configuration",
    input: {
      messages: [{ role: "user", content: "Hi" }],
      tool_choice: "auto",
      parallel_tool_calls: true,
      tools: [
        {
          function: {
            name: "get_weather",
            description: "Get weather info",
            parameters: { type: "object", properties: { location: { type: "string" } } },
          },
        },
      ],
    },
    expected: {
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 4096,
      tool_choice: { type: "auto", disable_parallel_tool_use: false },
      tools: [
        {
          name: "get_weather",
          description: "Get weather info",
          input_schema: { type: "object", properties: { location: { type: "string" } } },
        },
      ],
    },
  },
  {
    name: "specific tool choice",
    input: { messages: [{ role: "user", content: "Hi" }], tool_choice: { function: { name: "get_weather" } } },
    expected: {
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 4096,
      tool_choice: { type: "tool", name: "get_weather" },
    },
  },
];

describe("anthropic conversion", () => {
  for (const { name, input, expected } of cases) {
    it(name, () => expect(anthropic(input)).toEqual(expected));
  }
});
