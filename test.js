import { asyncLLM } from "./index.js";

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(
    message || `Expected:\n${JSON.stringify(expected, null, 2)}. Actual:\n${JSON.stringify(actual, null, 2)}`
  );
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const file = await Deno.readFile(`samples${url.pathname}`);
  return new Response(file, { headers: { "Content-Type": "text/event-stream" } });
});

/*
curl -X POST https://llmfoundry.straive.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "stream": true, "messages": [{"role": "user", "content": "Hello world"}]}'
*/
Deno.test("asyncLLM - OpenAI", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/openai.txt`));

  assertEquals(results.length, 10);
  assertEquals(results[0].content, "");
  assertEquals(results[1].content, "Hello");
  assertEquals(results[9].content, "Hello! How can I assist you today?");
  assertEquals(results.at(-1).tool, undefined);
  assertEquals(results.at(-1).args, undefined);
});

/*
curl -X POST https://llmfoundry.straive.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
  "model": "gpt-4o-mini",
  "stream": true,
  "messages": [
    {"role": "system", "content": "Call get_delivery_date with the order ID."},
    {"role": "user", "content": "123456"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_delivery_date",
        "description": "Get the delivery date for a customer order.",
        "parameters": {
          "type": "object",
          "properties": { "order_id": { "type": "string", "description": "The customer order ID." } },
          "required": ["order_id"],
          "additionalProperties": false
        }
      }
    }
  ]
}'
*/
Deno.test("asyncLLM - OpenAI with tool calls", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/openai-tools.txt`));

  assertEquals(results.length, 8);
  assertEquals(results[0].tool, "get_delivery_date");
  assertEquals(results[0].args, "");
  assertEquals(results[1].args, '{"');
  assertEquals(results[7].args, '{"order_id":"123456"}');
  assertEquals(results[7].content, undefined);

  assertEquals(JSON.parse(results.at(-1).args), { order_id: "123456" });
});

/*
curl -X POST https://llmfoundry.straive.com/anthropic/v1/messages \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-haiku-20240307", "stream": true, "max_tokens": 10, "messages": [{"role": "user", "content": "What is 2 + 2"}]}'
*/
Deno.test("asyncLLM - Anthropic", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/anthropic.txt`));

  assertEquals(results.length, 3);
  assertEquals(results[0].content, "2 ");
  assertEquals(results[1].content, "2 + 2 ");
  assertEquals(results[2].content, "2 + 2 = 4.");
  assertEquals(results.at(-1).tool, undefined);
  assertEquals(results.at(-1).args, undefined);
});

Deno.test("asyncLLM - Anthropic with tool calls", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/anthropic-tools.txt`));

  assertEquals(results.length, 23);
  assertEquals(results[0].content, "Okay");
  assertEquals(results[12].content, "Okay, let's check the weather for San Francisco, CA:");
  assertEquals(results[13].tool, "get_weather");
  assertEquals(results[14].args, "");
  assertEquals(results.at(-1).tool, "get_weather");
  assertEquals(JSON.parse(results.at(-1).args), { location: "San Francisco, CA", unit: "fahrenheit" });
});

/*
curl -X POST https://llmfoundry.straive.com/gemini/v1beta/models/gemini-1.5-flash-8b:streamGenerateContent?alt=sse \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
  "system_instruction": { "parts": [{ "text": "You are a helpful assistant" }] },
  "contents": [{ "role": "user", "parts": [{ "text": "What is 2+2?" }] }]
}'
*/
Deno.test("asyncLLM - Gemini", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/gemini.txt`));

  assertEquals(results.length, 3);
  assertEquals(results[0].content, "2");
  assertEquals(results[1].content, "2 + 2 = 4\n");
  assertEquals(results[2].content, "2 + 2 = 4\n");
  assertEquals(results.at(-1).tool, undefined);
  assertEquals(results.at(-1).args, undefined);
});

/*
curl -X POST https://llmfoundry.straive.com/gemini/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?alt=sse \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
  "contents": { "role": "user", "parts": { "text": "Call take_notes passing it an essay about capitalism vs socialism" } },
  "tools": [
    {
      "function_declarations": [
        {
          "name": "take_notes",
          "description": "Take notes about a topic",
          "parameters": {
            "type": "object",
            "properties": { "note": { "type": "string" } },
            "required": ["note"]
          }
        }
      ]
    }
  ]
}'
*/
Deno.test("asyncLLM - Gemini with tool calls", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/gemini-tools.txt`));

  assertEquals(results.length, 1);
  assertEquals(results[0].tool, "take_notes");
  const args = JSON.parse(results[0].args);
  assertEquals(typeof args, "object");
  assertEquals(args.note.startsWith("Capitalism and socialism"), true);
  assertEquals(args.note.endsWith("specific circumstances and values."), true);
  assertEquals(results[0].content, undefined);
});

/*
curl -X POST https://llmfoundry.straive.com/openrouter/v1/chat/completions \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{"model": "meta-llama/llama-3.2-11b-vision-instruct", "stream": true, "messages": [{"role": "user", "content": "What is 2 + 2"}]}'
*/
Deno.test("asyncLLM - OpenRouter", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/openrouter.txt`));

  assertEquals(results.length, 64);
  assertEquals(results[0].content, "");
  assertEquals(results[1].content, " The");
  assertEquals(results[2].content, " The sum");
  assertEquals(
    results.at(-1).content,
    " The sum of 2 and 2 is 4. This is a basic arithmetic operation where you add the two numbers together to get the total. \n\nHere's the calculation:\n\n2 + 2 = 4\n\nSo, the answer to your question is 4."
  );
  assertEquals(results.at(-1).tool, undefined);
  assertEquals(results.at(-1).args, undefined);
});

Deno.test("asyncLLM - Error handling", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/errors.txt`));

  assertEquals(results.length, 5);

  // Malformed JSON
  assertEquals(results[0].error.startsWith("Unexpected token"), true);

  // OpenAI-style error
  assertEquals(results[1].error, "OpenAI API error");

  // Anthropic-style error
  assertEquals(results[2].error, "Anthropic API error");

  // Gemini-style error
  assertEquals(results[3].error, "Gemini API error");

  // OpenRouter-style error
  assertEquals(results[4].error, "OpenRouter API error");
});
