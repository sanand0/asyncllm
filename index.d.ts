import { SSEConfig } from "asyncsse";

export interface LLMTool {
  name?: string;
  args?: string;
}

export interface LLMEvent {
  content?: string;
  tools?: LLMTool[];
  error?: string;
  message?: Record<string, unknown>;
}

export function asyncLLM(
  request: string | Request,
  options?: RequestInit,
  config?: SSEConfig
): AsyncGenerator<LLMEvent, void, unknown>;
