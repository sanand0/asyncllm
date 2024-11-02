/**
 * Convert an OpenAI body to an Anthropic body
 * @param {Object} body
 * @returns {Object}
 */
export function anthropic(body) {
  // System messages are specified at the top level in Anthropic
  const system = body.messages.find((msg) => msg.role === "system");

  // Convert messages
  const messages = body.messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role,
      // Handle both text and binary content (images)
      content: Array.isArray(msg.content)
        ? msg.content.map(({ type, text, image_url }) => {
            if (type === "text") return { type: "text", text };
            else if (type === "image_url")
              return {
                type: "image",
                source: anthropicSourceFromURL(image_url.url),
              };
            // Anthropic doesn't support audio
          })
        : msg.content,
    }));

  const parallel_tool_calls =
    typeof body.parallel_tool_calls == "boolean" ? { disable_parallel_tool_use: !body.parallel_tool_calls } : {};
  // Map OpenAI parameters to Anthropic equivalents, only including if defined
  const params = {
    model: body.model,
    max_tokens: body.max_tokens ?? 4096,
    ...(body.metadata?.user_id ? { metadata: { user_id: body.metadata?.user_id } } : {}),
    ...(typeof body.stream == "boolean" ? { stream: body.stream } : {}),
    ...(typeof body.temperature == "number" ? { temperature: body.temperature } : {}),
    ...(typeof body.top_p == "number" ? { top_p: body.top_p } : {}),
    // Convert single string or array of stop sequences
    ...(typeof body.stop == "string"
      ? { stop_sequences: [body.stop] }
      : Array.isArray(body.stop)
        ? { stop_sequences: body.stop }
        : {}),
    // Anthropic does not support JSON mode
    // Convert OpenAI tool_choice to Anthropic's tools_choice
    ...(body.tool_choice == "auto"
      ? { tool_choice: { type: "auto", ...parallel_tool_calls } }
      : body.tool_choice == "required"
        ? { tool_choice: { type: "any", ...parallel_tool_calls } }
        : body.tool_choice == "none"
          ? {}
          : typeof body.tool_choice == "object"
            ? {
                tool_choice: {
                  type: "tool",
                  name: body.tool_choice.function?.name,
                  ...parallel_tool_calls,
                },
              }
            : {}),
  };

  // Convert function definitions to Anthropic's tool format
  const tools = body.tools?.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));

  // Only include optional configs if they exist
  return {
    ...(system ? { system: system.content } : {}),
    messages,
    ...params,
    ...(body.tools ? { tools } : {}),
  };
}

// Handle data URIs in Anthropic's format. External URLs are not supported.
const anthropicSourceFromURL = (url) => {
  if (url.startsWith("data:")) {
    const [base, base64Data] = url.split(",");
    return {
      type: "base64",
      media_type: base.replace("data:", "").replace(";base64", ""),
      data: base64Data,
    };
  }
};
