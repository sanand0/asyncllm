import { describe, it, expect } from "vitest";
import { gemini } from "./gemini.js";

const cases = [
  {
    name: "basic message conversion",
    input: { messages: [{ role: "user", content: "Hello" }] },
    expected: { contents: [{ role: "user", parts: [{ text: "Hello" }] }] },
  },
  {
    name: "system message handling",
    input: { messages: [{ role: "system", content: "You are helpful" }, { role: "user", content: "Hi" }] },
    expected: { systemInstruction: { parts: [{ text: "You are helpful" }] }, contents: [{ role: "user", parts: [{ text: "Hi" }] }] },
  },
  {
    name: "assistant message conversion",
    input: { messages: [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }] },
    expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }, { role: "model", parts: [{ text: "Hello" }] }] },
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
            { type: "input_audio", input_audio: { data: "https://example.com/audio.mp3" } },
          ],
        },
      ],
    },
    expected: {
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
    },
  },
  {
    name: "generation config parameters",
    input: {
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
    },
    expected: {
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
    },
  },
  {
    name: "tool calling configuration",
    input: {
      messages: [{ role: "user", content: "Hi" }],
      tool_choice: "auto",
      tools: [
        {
          function: {
            name: "get_weather",
            description: "Get weather info",
            parameters: { type: "object", properties: { location: { type: "string" } }, required: ["location"], additionalProperties: false },
          },
        },
      ],
    },
    expected: {
      contents: [{ role: "user", parts: [{ text: "Hi" }] }],
      toolConfig: { function_calling_config: { mode: "AUTO" } },
      tools: {
        functionDeclarations: [
          { name: "get_weather", description: "Get weather info", parameters: { type: "object", properties: { location: { type: "string" } }, required: ["location"] } },
        ],
      },
    },
  },
  {
    name: "specific tool choice",
    input: { messages: [{ role: "user", content: "Hi" }], tool_choice: { function: { name: "get_weather" } } },
    expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }], toolConfig: { function_calling_config: { mode: "ANY", allowed_function_names: ["get_weather"] } } },
  },
  {
    name: "json schema response format",
    input: {
      messages: [{ role: "user", content: "Hi" }],
      response_format: {
        type: "json_schema",
        json_schema: { schema: { type: "object", properties: { name: { type: "string" }, age: { type: "number" } } } },
      },
    },
    expected: {
      contents: [{ role: "user", parts: [{ text: "Hi" }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "object", properties: { name: { type: "string" }, age: { type: "number" } } },
      },
    },
  },
  { name: "required tool choice", input: { messages: [{ role: "user", content: "Hi" }], tool_choice: "required" }, expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }], toolConfig: { function_calling_config: { mode: "ANY" } } } },
  { name: "none tool choice", input: { messages: [{ role: "user", content: "Hi" }], tool_choice: "none" }, expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }], toolConfig: { function_calling_config: { mode: "NONE" } } } },
  { name: "string stop sequence", input: { messages: [{ role: "user", content: "Hi" }], stop: "STOP" }, expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }], generationConfig: { stopSequences: ["STOP"] } } },
  { name: "max completion tokens", input: { messages: [{ role: "user", content: "Hi" }], max_completion_tokens: 150 }, expected: { contents: [{ role: "user", parts: [{ text: "Hi" }] }], generationConfig: { maxOutputTokens: 150 } } },
];

describe("gemini conversion", () => {
  for (const { name, input, expected } of cases) {
    it(name, () => expect(gemini(input)).toEqual(expected));
  }
});
