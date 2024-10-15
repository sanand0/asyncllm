import { AsyncGenerator } from "asyncsse";

/**
 * asyncLLM yields events when streaming from a streaming LLM endpoint.
 *
 * @param request - The request URL or Request object
 * @param options - Optional request options
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
 * })) {
 *   console.log(event);
 * }
 */
export function asyncLLM(
  request: string | Request,
  options?: RequestInit
): AsyncGenerator<
  {
    content?: string;
    tool?: string;
    args?: string;
    message?: Record<string, any>;
    error?: string;
  },
  void,
  unknown
>;
