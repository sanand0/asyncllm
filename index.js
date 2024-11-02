import { asyncSSE } from "asyncsse";

/**
 * asyncLLM yields events when streaming from a streaming LLM endpoint.
 *
 * @param {Request} request
 * @param {RequestInit} options
 * @returns {AsyncGenerator<Record<string, string>, void, unknown>}
 *
 * @example
 * for await (const event of asyncLLM("https://api.openai.com/v1/chat/completions", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": "Bearer YOUR_API_KEY",
 *   },
 *   body: JSON.stringify({
 *     model: "gpt-3.5-turbo",
 *     messages: [{ role: "user", content: "Hello, world!" }],
 *   }),
 * })) {
 *   console.log(event);
 * }
 */
export async function* asyncLLM(request, options = {}) {
  let content, tool, args;

  for await (const event of asyncSSE(request, options)) {
    // OpenAI and Cloudflare AI Workers use "[DONE]" to indicate the end of the stream
    if (event.data === "[DONE]") break;

    if (!event.data) {
      yield { error: "No data" };
      continue;
    }

    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      yield { error: error.message };
      continue;
    }

    // Handle errors. asyncSSE yields { error: ... } if the fetch fails.
    // OpenAI, Anthropic, and Gemini return {"error": ...}.
    // OpenRouter returns {"message":{"error": ...}}.
    const error = message.message?.error ?? message.error?.message ?? message.error ?? event.error;
    if (error) {
      yield { error };
      continue;
    }

    // Attempt to parse with each provider's format
    let hasNewData = false;
    for (const parser of Object.values(providers)) {
      const extract = parser(message);
      hasNewData = !isEmpty(extract.content) || !isEmpty(extract.tool) || !isEmpty(extract.args);
      if (!isEmpty(extract.content)) content = (content ?? "") + extract.content;
      if (!isEmpty(extract.tool)) tool = extract.tool;
      if (!isEmpty(extract.args)) args = (args ?? "") + extract.args;
      if (hasNewData) break;
    }

    if (hasNewData) yield { content, tool, args, message };
  }
}

const providers = {
  // Azure, OpenRouter, Groq, and a few others follow OpenAI's format
  openai: (m) => ({
    content: m.choices?.[0]?.delta?.content,
    tool: m.choices?.[0]?.delta?.tool_calls?.[0]?.function?.name,
    args: m.choices?.[0]?.delta?.tool_calls?.[0]?.function?.arguments,
  }),
  anthropic: (m) => ({
    content: m.delta?.text,
    tool: m.content_block?.name,
    args: m.delta?.partial_json,
  }),
  gemini: (m) => ({
    content: m.candidates?.[0]?.content?.parts?.[0]?.text,
    tool: m.candidates?.[0]?.content?.parts?.[0]?.functionCall?.name,
    args: JSON.stringify(m.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args),
  }),
  cloudflare: (m) => ({
    content: m.response,
  }),
};

const isEmpty = (value) => value === undefined || value === null;
