/**
 * Convert an OpenAI body to a Gemini body
 * @param {Object} body
 * @returns {Object}
 */
export function gemini(body) {
  // System messages live in a separate object in Gemini
  const systemMessage = body.messages.find((msg) => msg.role === "system");
  const systemInstruction = systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {};

  // Convert messages: Gemini uses "model" instead of "assistant" and has different content structure
  const contents = body.messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role == "assistant" ? "model" : msg.role,
      // Handle both text and binary content (images/audio)
      parts: Array.isArray(msg.content)
        ? msg.content.map(({ type, text, image_url, input_audio }) => {
            if (type === "text") return { text };
            else if (type === "image_url") return geminiPartFromURL(image_url.url);
            else if (type == "input_audio") return geminiPartFromURL(input_audio.data);
          })
        : [{ text: msg.content }],
    }));

  // Map OpenAI parameters to Gemini equivalents, only including if defined
  const generationConfig = {
    ...(typeof body.temperature == "number" ? { temperature: body.temperature } : {}),
    ...(typeof body.max_tokens == "number" ? { maxOutputTokens: body.max_tokens } : {}),
    ...(typeof body.max_completion_tokens == "number" ? { maxOutputTokens: body.max_completion_tokens } : {}),
    ...(typeof body.top_p == "number" ? { topP: body.top_p } : {}),
    ...(typeof body.presence_penalty == "number" ? { presencePenalty: body.presence_penalty } : {}),
    ...(typeof body.frequency_penalty == "number" ? { frequencyPenalty: body.frequency_penalty } : {}),
    ...(typeof body.logprobs == "boolean" ? { responseLogprobs: body.logprobs } : {}),
    ...(typeof body.top_logprobs == "number" ? { logprobs: body.top_logprobs } : {}),
    ...(typeof body.n == "number" ? { candidateCount: body.n } : {}),
    // Convert single string or array of stop sequences
    ...(typeof body.stop == "string"
      ? { stopSequences: [body.stop] }
      : Array.isArray(body.stop)
        ? { stopSequences: body.stop }
        : {}),
    // Handle JSON response formatting and schemas
    ...(body.response_format?.type == "json_object"
      ? { responseMimeType: "application/json" }
      : body.response_format?.type == "json_schema"
        ? {
            responseMimeType: "application/json",
            responseSchema: geminiSchema(structuredClone(body.response_format?.json_schema?.schema)),
          }
        : {}),
  };

  // Convert OpenAI tool_choice to Gemini's function calling modes
  const toolConfig =
    body.tool_choice == "auto"
      ? { function_calling_config: { mode: "AUTO" } }
      : body.tool_choice == "required"
        ? { function_calling_config: { mode: "ANY" } }
        : body.tool_choice == "none"
          ? { function_calling_config: { mode: "NONE" } }
          : typeof body.tool_choice == "object"
            ? {
                function_calling_config: {
                  mode: "ANY",
                  allowed_function_names: [body.tool_choice.function?.name],
                },
              }
            : {};

  // Convert function definitions to Gemini's tool format
  const tools = body.tools
    ? {
        functionDeclarations: body.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: geminiSchema(structuredClone(tool.function.parameters)),
        })),
      }
    : {};

  // Only include optional configs if they exist
  return {
    ...systemInstruction,
    contents,
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
    ...(body.tool_choice ? { toolConfig } : {}),
    ...(body.tools ? { tools } : {}),
  };
}

// Handle both data URIs and external URLs in Gemini's required format
const geminiPartFromURL = (url) => {
  if (url.startsWith("data:")) {
    const [base, base64Data] = url.split(",");
    return {
      inlineData: {
        mimeType: base.replace("data:", "").replace(";base64", ""),
        data: base64Data,
      },
    };
  }
  return { fileData: { fileUri: url } };
};

// Gemini doesn't support additionalProperties in schemas. Recursively remove it.
function geminiSchema(obj) {
  if (Array.isArray(obj)) obj.forEach(geminiSchema);
  else if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (key === "additionalProperties") delete obj[key];
      else geminiSchema(obj[key]);
    }
  }
  return obj;
}
