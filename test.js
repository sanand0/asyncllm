import { asyncLLM } from "./asyncllm.js";

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new Error(
    message || `Expected:\n${JSON.stringify(expected, null, 2)}. Actual:\n${JSON.stringify(actual, null, 2)}`,
  );
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const file = await Deno.readFile(`samples${url.pathname}`);
  return new Response(file, {
    headers: { "Content-Type": "text/event-stream" },
  });
});

/*
curl -X POST https://llmfoundry.straive.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "stream": true, "messages": [{"role": "user", "content": "Hello world"}]}'
*/
Deno.test("asyncLLM - OpenAI basic", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/openai.txt`));

  assertEquals(results.length, 10);
  assertEquals(results[0].content, "");
  assertEquals(results[1].content, "Hello");
  assertEquals(results[9].content, "Hello! How can I assist you today?");
  assertEquals(results.at(-1).tools, undefined);
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
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/openai-tools.txt`)) {
    if (index == 0) {
      assertEquals(data.tools[0].name, "get_delivery_date");
      assertEquals(data.tools[0].id, "call_F8YHCjnzrrTjfE4YSSpVW2Bc");
      assertEquals(data.tools[0].args, "");
    }
    if (index == 1) assertEquals(data.tools[0].args, '{"');
    if (index == 7) assertEquals(data.tools[0].args, '{"order_id":"123456"}');
    if (index == 7) assertEquals(data.content, undefined);
    index++;
  }
  assertEquals(JSON.parse(data.tools[0].args), { order_id: "123456" });
  assertEquals(index, 8);
});

/*
curl -X POST https://llmfoundry.straive.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "stream": true,
    "messages": [
      { "role": "system", "content": "Call get_order({order_id}) AND get_customer({customer_id}) in parallel" },
      { "role": "user", "content": "Order ID: 123456, Customer ID: 7890" }
    ],
    "tool_choice": "required",
    "tools": [
      {
        "type": "function",
        "function": { "name": "get_order", "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] } }
      },
      {
        "type": "function",
        "function": { "name": "get_customer", "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] } }
      }
    ]
  }
}
*/
Deno.test("asyncLLM - OpenAI with multiple tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/openai-tools2.txt`)) {
    if (index === 0) {
      assertEquals(data.tools[0], {
        name: "get_order",
        id: "call_wnH2cswb4JAnm69pUAP4MNEN",
        args: "",
      });
    }
    if (index === 5) assertEquals(data.tools[0].args, '{"id": "123456"}');
    if (index === 6) {
      assertEquals(data.tools[1], {
        name: "get_customer",
        id: "call_f4GVABhbwSOLoaisOBOajnsm",
        args: '{"id',
      });
    }
    if (index === 9) assertEquals(data.tools[1].args, '{"id": "7890"}');
    index++;
  }
  assertEquals(index, 9);
  assertEquals(data.tools[0], { name: "get_order", id: "call_wnH2cswb4JAnm69pUAP4MNEN", args: '{"id": "123456"}' });
  assertEquals(data.tools[1], { name: "get_customer", id: "call_f4GVABhbwSOLoaisOBOajnsm", args: '{"id": "7890"}' });
});

/*
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4.1-nano", "stream": true, "input": "Hello world"}'
*/
Deno.test("asyncLLM - OpenAI Responses basic", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/openai-responses.txt`));

  assertEquals(results.length, 9);
  assertEquals(results[0].content, "Hello");
  assertEquals(results[1].content, "Hello!");
  assertEquals(results[2].content, "Hello! How");
  assertEquals(results[8].content, "Hello! How can I assist you today?");
  assertEquals(results.at(-1).tools, undefined);
});

/*
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-nano",
    "stream": true,
    "input": [
      { "role": "system", "content": "Call get_order({order_id}) AND get_customer({customer_id}) in parallel" },
      { "role": "user", "content": "Order ID: 123456, Customer ID: 7890" }
    ],
    "tool_choice": "required",
    "tools": [
      {
        "type": "function",
        "name": "get_delivery_date",
        "description": "Get the delivery date for a customer order.",
        "parameters": {
          "type": "object",
          "properties": { "order_id": { "type": "string", "description": "The customer order ID." } },
          "required": ["order_id"],
          "additionalProperties": false
        }
      }
    ]
  }'
*/
Deno.test("asyncLLM - OpenAI Responses with tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/openai-responses-tools.txt`)) {
    if (index == 0) {
      assertEquals(data.tools[0].name, "get_delivery_date");
      assertEquals(data.tools[0].id, "fc_6808d3a08e708192a65b2c19dbc8b9140a601c2646a05cfd");
      assertEquals(data.tools[0].args, "");
    }
    if (index == 1) assertEquals(data.tools[0].args, '{"');
    if (index == 7) assertEquals(data.tools[0].args, '{"order_id":"123456"}');
    if (index == 7) assertEquals(data.content, undefined);
    index++;
  }
  assertEquals(JSON.parse(data.tools[0].args), { order_id: "123456" });
  assertEquals(index, 8);
});

/*
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-nano",
    "stream": true,
    "input": [
      { "role": "system", "content": "Call get_order({order_id}) AND get_customer({customer_id}) in parallel" },
      { "role": "user", "content": "Order ID: 123456, Customer ID: 7890" }
    ],
    "tool_choice": "required",
    "tools": [
      {
        "type": "function",
        "name": "get_order",
        "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
      },
      {
        "type": "function",
        "name": "get_customer",
        "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
      }
    ]
  }'
*/
Deno.test("asyncLLM - OpenAI Responses with multiple tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/openai-responses-tools2.txt`)) {
    if (index === 0) {
      assertEquals(data.tools[0], {
        name: "get_order",
        id: "fc_6808d34ab2748192957f518947f0e14d01c57d45ab76fecc",
        args: "",
      });
    }
    if (index === 7) assertEquals(data.tools[0].args, '{"id":"123456"}');
    if (index === 10) {
      assertEquals(data.tools[1], {
        name: "get_customer",
        id: "fc_6808d34ac3548192916cd16fdad20dc101c57d45ab76fecc",
        args: '{"id":',
      });
    }
    if (index === 13) assertEquals(data.tools[1].args, '{"id":"7890"}');
    index++;
  }
  assertEquals(index, 14);
  assertEquals(data.tools[0], {
    name: "get_order",
    id: "fc_6808d34ab2748192957f518947f0e14d01c57d45ab76fecc",
    args: '{"id":"123456"}',
  });
  assertEquals(data.tools[1], {
    name: "get_customer",
    id: "fc_6808d34ac3548192916cd16fdad20dc101c57d45ab76fecc",
    args: '{"id":"7890"}',
  });
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
  assertEquals(results.at(-1).tools, undefined);
});

Deno.test("asyncLLM - Anthropic with tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/anthropic-tools.txt`)) {
    if (index === 0) assertEquals(data.content, "Okay");
    if (index === 12) assertEquals(data.content, "Okay, let's check the weather for San Francisco, CA:");
    if (index === 13) assertEquals(data.tools[0], { name: "get_weather", id: "toolu_01T1x1fJ34qAmk2tNTrN7Up6" });
    if (index === 14) assertEquals(data.tools[0].args, "");
    index++;
  }
  assertEquals(data.tools[0].name, "get_weather");
  assertEquals(data.tools[0].id, "toolu_01T1x1fJ34qAmk2tNTrN7Up6");
  assertEquals(JSON.parse(data.tools[0].args), {
    location: "San Francisco, CA",
    unit: "fahrenheit",
  });
  assertEquals(index, 23);
});

/*
curl -X POST https://llmfoundry.straive.com/anthropic/v1/messages \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
    "system": "Call get_order({order_id}) AND get_customer({customer_id}) in parallel",
    "messages": [{ "role": "user", "content": "Order ID: 123456, Customer ID: 7890" }],
    "model": "claude-3-haiku-20240307",
    "max_tokens": 4096,
    "stream": true,
    "tool_choice": { "type": "any", "disable_parallel_tool_use": false },
    "tools": [
      { "name": "get_order", "input_schema": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] } },
      { "name": "get_customer", "input_schema": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] } }
    ]
  }
}`
*/
Deno.test("asyncLLM - Anthropic with multiple tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/anthropic-tools2.txt`)) {
    if (index === 0) assertEquals(data.tools[0], { name: "get_order", id: "toolu_015yB3TjTS1RBaM7VScM2MQY" });
    if (index === 2) assertEquals(data.tools[0].args, '{"id": "1');
    if (index === 7)
      assertEquals(data.tools[1], { name: "get_customer", id: "toolu_013VAZTYqMJm2JuRCqEA4kam", args: '{"id": "789' });
    index++;
  }
  assertEquals(index, 9);
  assertEquals(data.tools[0], { name: "get_order", id: "toolu_015yB3TjTS1RBaM7VScM2MQY", args: '{"id": "123456"}' });
  assertEquals(data.tools[1], { name: "get_customer", id: "toolu_013VAZTYqMJm2JuRCqEA4kam", args: '{"id": "7890"}' });
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
  assertEquals(results.at(-1).tools, undefined);
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
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/gemini-tools.txt`)) {
    if (index === 0) assertEquals(data.tools[0].name, "take_notes");
    if (index === 0) assertEquals(data.tools[0].args.startsWith('{"note":"Capitalism'), true);
    index++;
  }
  assertEquals(data.content, undefined);
  assertEquals(JSON.parse(data.tools[0].args).note.startsWith("Capitalism and socialism"), true);
  assertEquals(JSON.parse(data.tools[0].args).note.endsWith("specific circumstances and values."), true);
  assertEquals(index, 1);
});

/*
curl -X POST https://llmfoundry.straive.com/gemini/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?alt=sse \
  -H "Authorization: Bearer $LLMFOUNDRY_TOKEN:asyncllm" \
  -H "Content-Type: application/json" \
  -d '{
    "systemInstruction": {"parts": [{"text": "Call get_order({order_id}) AND get_customer({customer_id}) in parallel"}]},
    "contents": [{"role": "user", "parts": [{ "text": "Order ID: 123456, Customer ID: 7890" }] }],
    "toolConfig": { "function_calling_config": { "mode": "ANY" } },
    "tools": {
      "functionDeclarations": [
        {
          "name": "get_order",
          "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
        },
        {
          "name": "get_customer",
          "parameters": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
        }
      ]
    }
  }
}`
*/
Deno.test("asyncLLM - Gemini with multiple tool calls", async () => {
  let index = 0;
  let data = {};
  for await (data of asyncLLM(`${BASE_URL}/gemini-tools2.txt`)) {
    if (index === 0) {
      assertEquals(data.tools[0], { name: "get_order", args: '{"id":"123456"}' });
      assertEquals(data.tools[1], { name: "get_customer", args: '{"id":"7890"}' });
    }
    index++;
  }
  assertEquals(index, 3);
  assertEquals(data.tools[0].name, "get_order");
  assertEquals(JSON.parse(data.tools[0].args), { id: "123456" });
  assertEquals(data.tools[1].name, "get_customer");
  assertEquals(JSON.parse(data.tools[1].args), { id: "7890" });
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
    " The sum of 2 and 2 is 4. This is a basic arithmetic operation where you add the two numbers together to get the total. \n\nHere's the calculation:\n\n2 + 2 = 4\n\nSo, the answer to your question is 4.",
  );
  assertEquals(results.at(-1).tools, undefined);
});

Deno.test("asyncLLM - Error handling", async () => {
  const results = await Array.fromAsync(asyncLLM(`${BASE_URL}/errors.txt`));

  assertEquals(results.length, 6);

  // Malformed JSON
  assertEquals(results[0].error, "Unexpected token 'i', \"invalid json\" is not valid JSON");

  // OpenAI-style error
  assertEquals(results[1].error, "OpenAI API error");

  // Anthropic-style error
  assertEquals(results[2].error, "Anthropic API error");

  // Gemini-style error
  assertEquals(results[3].error, "Gemini API error");

  // OpenRouter-style error
  assertEquals(results[4].error, "OpenRouter API error");

  // No data
  assertEquals(results[5].error, "Unexpected end of JSON input");
});

Deno.test("asyncLLM - Config callback", async () => {
  let responseStatus = 0;
  let contentType = "";

  const results = await Array.fromAsync(
    asyncLLM(
      `${BASE_URL}/openai.txt`,
      {},
      {
        onResponse: async (response) => {
          responseStatus = response.status;
          contentType = response.headers.get("Content-Type");
        },
      },
    ),
  );

  assertEquals(responseStatus, 200);
  assertEquals(contentType, "text/event-stream");
  assertEquals(results.length, 10); // Verify normal operation still works
});

Deno.test("asyncLLM - Config callback error handling", async () => {
  let responseStatus = 0;

  const results = await Array.fromAsync(
    asyncLLM(
      `${BASE_URL}/errors.txt`,
      {},
      {
        onResponse: async (response) => {
          responseStatus = response.status;
        },
      },
    ),
  );

  assertEquals(responseStatus, 200);
  assertEquals(results[0].error, "Unexpected token 'i', \"invalid json\" is not valid JSON");
});

Deno.test("asyncLLM - Request object input", async () => {
  const request = new Request(`${BASE_URL}/openai.txt`);
  const results = await Array.fromAsync(asyncLLM(request));

  assertEquals(results.length, 10);
});
