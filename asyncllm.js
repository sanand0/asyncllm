import { asyncSSE } from "asyncsse";

/**
 * asyncLLM yields events when streaming from a streaming LLM endpoint.
 *
 * @param {Request} request
 * @param {RequestInit} options
 * @param {SSEConfig} config
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
 * }, {
 *   onResponse: async (response) => {
 *     console.log(response.status, response.headers);
 *   },
 * })) {
 *   console.log(event);
 * }
 */
export async function* asyncLLM(request, options = {}, config = {}) {
  let content,
    tools = [];

  function latestTool() {
    if (!tools.length) tools.push({});
    return tools.at(-1);
  }

  for await (const event of asyncSSE(request, options, config)) {
    // OpenAI and Cloudflare AI Workers use "[DONE]" to indicate the end of the stream
    if (event.data === "[DONE]") break;

    if (event.error) {
      yield event;
      continue;
    }

    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      yield { error: error.message, data: event.data };
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
      hasNewData = !isEmpty(extract.content) || extract.tools.length > 0;
      // console.log(hasNewData, parser, extract, message);
      if (!isEmpty(extract.content)) content = (content ?? "") + extract.content;
      for (const { name, args, id } of extract.tools) {
        if (!isEmpty(name)) {
          const tool = { name };
          if (!isEmpty(id)) tool.id = id;
          tools.push(tool);
        }
        if (!isEmpty(args)) {
          const tool = latestTool();
          tool.args = (tool.args ?? "") + args;
        }
      }
      if (hasNewData) break;
    }

    if (hasNewData) {
      const data = { content, message };
      if (!isEmpty(content)) data.content = content;
      if (tools.length) data.tools = tools;
      yield data;
    }
  }
}

// Return the delta from each message as { content, tools }
// content delta is string | undefined
// tools delta is [{ name?: string, args?: string }] | []
const providers = {
  // Azure, OpenRouter, Groq, and a few others follow OpenAI's format
  openai: (m) => ({
    content: m.choices?.[0]?.delta?.content,
    tools: (m.choices?.[0]?.delta?.tool_calls ?? []).map((tool) => ({
      id: tool.id,
      name: tool.function.name,
      args: tool.function.arguments,
    })),
  }),
  // OpenAI Responses API (streaming w/ tool support)
  openaiResponses: (m) => ({
    content: m.type == "response.output_text.delta" ? m.delta : undefined,
    tools:
      m.type == "response.output_item.added" && m.item?.type == "function_call"
        ? [{ id: m.item.id, name: m.item.name, args: m.item.arguments }]
        : m.type == "response.function_call_arguments.delta"
          ? [{ args: m.delta }]
          : [],
  }),
  anthropic: (m) => ({
    content: m.delta?.text,
    tools: !isEmpty(m.content_block?.name)
      ? [{ name: m.content_block.name, id: m.content_block.id }]
      : !isEmpty(m.delta?.partial_json)
        ? [{ args: m.delta?.partial_json }]
        : [],
  }),
  gemini: (m) => ({
    content: m.candidates?.[0]?.content?.parts?.[0]?.text,
    tools: (m.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.functionCall)
      .filter((d) => d)
      .map((d) => ({ name: d.name, args: JSON.stringify(d.args) })),
  }),
  // OpenAI's Responses API also has a .response, so we need to disambiguate.
  /*
  cloudflare: (m) => ({
    content: m.response,
    tools: [],
  }),
  */
};

const isEmpty = (value) => value === undefined || value === null;
