import { SSEConfig } from "asyncsse";

/**
 * asyncLLM yields events when streaming from a streaming LLM endpoint.
 *
 * @param request - The request URL or Request object
 * @param options - Optional request options
 * @param config - Optional configuration object
 * @returns An AsyncGenerator that yields events
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
export interface LLMEvent {
  content?: string;
  tool?: string;
  args?: string;
  error?: string;
  message?: Record<string, unknown>;
}

export function asyncLLM(
  request: string | Request,
  options?: RequestInit,
  config?: SSEConfig
): AsyncGenerator<LLMEvent, void, unknown>;
