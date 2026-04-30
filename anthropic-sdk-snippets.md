# Anthropic SDK – Code Snippets & Templates

Quick copy-paste solutions for common patterns.

---

## Table of Contents

1. [Quick Start Templates](#quick-start-templates)
2. [Common Patterns](#common-patterns)
3. [Error Handling Utilities](#error-handling-utilities)
4. [Testing Snippets](#testing-snippets)
5. [Production Configs](#production-configs)

---

## Quick Start Templates

### Minimal Chat API (Copy-Paste Ready)

**`app/api/chat/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages,
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    return NextResponse.json({
      role: "assistant",
      content: text,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**`components/Chat.tsx`:**

```typescript
"use client";

import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, data]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4 h-96 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded ${
              msg.role === "user"
                ? "bg-blue-500 text-white ml-8"
                : "bg-gray-300 mr-8"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Minimal Agent (Copy-Paste Ready)

**`app/api/agent/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools = [
  {
    name: "get_current_time",
    description: "Get the current time",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_web",
    description: "Search the web for information",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_current_time":
      return new Date().toISOString();
    case "search_web":
      return `Search results for "${input.query}": [mock results]`;
    default:
      return "Unknown tool";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userMessage } = await request.json();
    const conversationHistory: any[] = [
      { role: "user", content: userMessage },
    ];

    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        tools,
        messages: conversationHistory,
      });

      conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      if (response.stop_reason === "end_turn") {
        const finalText = response.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("");
        return NextResponse.json({ response: finalText });
      }

      const toolCalls = response.content.filter(
        (c: any) => c.type === "tool_use"
      );
      if (toolCalls.length === 0) break;

      const results: any[] = [];
      for (const call of toolCalls) {
        const result = await executeTool(call.name, call.input);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: result,
        });
      }

      conversationHistory.push({
        role: "user",
        content: results,
      });
    }

    return NextResponse.json(
      { error: "Max iterations reached" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Common Patterns

### Pattern: Streaming with Abort

```typescript
export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const abortController = new AbortController();

  // Auto-abort after 30 seconds
  const timeout = setTimeout(() => abortController.abort(), 30000);

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            const text = event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

### Pattern: Retry with Exponential Backoff

```typescript
async function callClaudeWithRetry(
  messages: any[],
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages,
      });
    } catch (error: any) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (attempt === maxRetries - 1) throw error;
    }
  }
}
```

### Pattern: Context Window Management

```typescript
function manageContextWindow(
  messages: any[],
  maxTokens: number = 6000
): any[] {
  const encoder = (str: string) => str.split(/\s+/).length; // Rough token count

  let tokenCount = 0;
  const recentMessages = [];

  // Keep messages from the end, drop older ones
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = encoder(messages[i].content);
    if (tokenCount + msgTokens > maxTokens) break;
    recentMessages.unshift(messages[i]);
    tokenCount += msgTokens;
  }

  return recentMessages.length > 0 ? recentMessages : [messages[messages.length - 1]];
}
```

### Pattern: Multi-File Input

```typescript
async function processMultipleFiles(files: string[]): Promise<string> {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const content = await fetch(file).then((r) => r.text());
      return `File: ${file}\n${content}`;
    })
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyze these files:\n\n${fileContents.join("\n---\n")}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

### Pattern: Structured Output (JSON)

```typescript
async function getStructuredResponse(prompt: string): Promise<any> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nRespond ONLY with valid JSON, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Clean up markdown code blocks if present
  const json = text
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  return JSON.parse(json);
}
```

### Pattern: Batch Inference with Rate Limiting

```typescript
async function batchProcess(
  items: string[],
  batchSize: number = 5,
  delayMs: number = 1000
): Promise<any[]> {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((item) =>
        client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 256,
          messages: [{ role: "user", content: item }],
        })
      )
    );

    results.push(...batchResults);

    // Delay between batches to avoid rate limits
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
```

---

## Error Handling Utilities

### Safe API Caller

```typescript
interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  retryable: boolean;
}

async function safeCallClaude(
  messages: any[]
): Promise<{ success: boolean; data?: any; error?: ApiError }> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages,
    });

    return { success: true, data: response };
  } catch (error: any) {
    // Handle specific error types
    if (error.status === 429) {
      return {
        success: false,
        error: {
          code: "RATE_LIMIT",
          message: "Rate limited. Please try again later.",
          statusCode: 429,
          retryable: true,
        },
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Invalid API key",
          statusCode: 401,
          retryable: false,
        },
      };
    }

    if (error.status === 400) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          statusCode: 400,
          retryable: false,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: error.message || "Unknown error",
        statusCode: error.status || 500,
        retryable: true,
      },
    };
  }
}
```

### Tool Executor with Validation

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function executeToolSafely(
  toolName: string,
  input: Record<string, unknown>,
  validators?: Record<string, (val: any) => boolean>
): Promise<ToolResult> {
  // Validate input if validators provided
  if (validators) {
    for (const [key, validator] of Object.entries(validators)) {
      if (!(key in input) || !validator(input[key])) {
        return {
          success: false,
          error: `Validation failed for ${key}`,
        };
      }
    }
  }

  try {
    // Call your tool implementation
    const result = await executeTool(toolName, input);
    return { success: true, data: JSON.parse(result) };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Tool execution failed",
    };
  }
}
```

---

## Testing Snippets

### Unit Test with Jest

```typescript
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

describe("/api/chat", () => {
  it("should return assistant response", async () => {
    const request = new NextRequest(new URL("http://localhost/api/chat"), {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("assistant");
    expect(data.content).toBeTruthy();
  });

  it("should handle errors gracefully", async () => {
    const request = new NextRequest(new URL("http://localhost/api/chat"), {
      method: "POST",
      body: JSON.stringify({ messages: [] }), // Invalid
    });

    const response = await POST(request);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
```

### Integration Test

```typescript
describe("Agent Loop", () => {
  it("should complete multi-turn interaction", async () => {
    const userMessage = "Get the current time";
    const response = await fetch("http://localhost:3000/api/agent", {
      method: "POST",
      body: JSON.stringify({ userMessage }),
    });

    const data = await response.json();
    expect(data.response).toBeTruthy();
    expect(data.response.length).toBeGreaterThan(0);
  });
});
```

---

## Production Configs

### Environment Setup

**`.env.local`:**

```env
# API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Redis (for caching/sessions)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Features
ENABLE_STREAMING=true
ENABLE_TOOL_USE=true
MAX_AGENT_ITERATIONS=10
```

### Monitoring & Logging

```typescript
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { messages } = await request.json();

    console.log(`[CHAT] Processing ${messages.length} messages`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[CHAT] Completed in ${duration}ms. ` +
      `Tokens: ${response.usage.input_tokens}/${response.usage.output_tokens}`
    );

    return NextResponse.json({ role: "assistant", content: response });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`[CHAT] Error after ${duration}ms:`, error.message);
    Sentry.captureException(error, {
      tags: { endpoint: "chat" },
    });

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Rate Limiting Middleware

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    `${process.env.RATE_LIMIT_WINDOW_MS || "60"}ms`
  ),
});

export async function POST(request: NextRequest) {
  if (!process.env.RATE_LIMIT_ENABLED) {
    // ... normal flow
  }

  const identifier = request.headers.get("x-forwarded-for") || "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(
    identifier
  );

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  // ... normal flow
}
```

### Docker Deployment

**`Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**`.dockerignore`:**

```
node_modules
.env.local
.git
.next
.vercel
```

---

## Quick Reference Cards

### Response Handling

```typescript
// Text only
const text = response.content[0].type === "text" ? response.content[0].text : "";

// All text blocks
const allText = response.content
  .filter((c): c is Anthropic.TextBlock => c.type === "text")
  .map((c) => c.text)
  .join("");

// Tool calls
const toolCalls = response.content.filter(
  (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
);

// Token usage
console.log(response.usage.input_tokens, response.usage.output_tokens);
```

### Common Parameters

```typescript
// Conservative (cheaper, faster)
{ temperature: 0, top_p: 0.9, max_tokens: 256 }

// Balanced (default)
{ temperature: 0.7, top_p: 0.9, max_tokens: 1024 }

// Creative (slower, more tokens)
{ temperature: 1.0, top_p: 0.95, max_tokens: 2048 }
```

---

**Last Updated:** April 2026
