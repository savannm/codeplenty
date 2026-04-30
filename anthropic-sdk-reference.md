# Anthropic SDK for React/Next.js – Complete Reference Guide

**Last Updated:** April 2026  
**Target Stack:** React 18+, Next.js 13+ (App Router), TypeScript, Claude API  
**Documentation:** https://docs.claude.com/en/api/overview

---

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Core Concepts](#core-concepts)
3. [Basic Completion](#basic-completion)
4. [Tool Use (Function Calling)](#tool-use-function-calling)
5. [Agentic Loop](#agentic-loop)
6. [Database Integration for Tool Use](#database-integration-for-tool-use)
7. [Streaming & Real-Time](#streaming--real-time)
8. [Advanced Patterns](#advanced-patterns)
9. [Best Practices & Gotchas](#best-practices--gotchas)
10. [API Reference Cheat Sheet](#api-reference-cheat-sheet)

---

## Setup & Installation

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk
npm install -D typescript @types/node
```

### 2. Environment Variables

Create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
NEXT_PUBLIC_API_BASE=https://api.anthropic.com
```

**Important:** Never expose your API key in client-side code. Always use API routes or server components.

### 3. Basic Project Structure (Next.js)

```
app/
├── api/
│   ├── chat/
│   │   └── route.ts          # POST endpoint for completions
│   ├── agents/
│   │   └── route.ts          # POST endpoint for agentic loops
│   └── tools/
│       └── database.ts       # Tool implementations
├── components/
│   ├── ChatInterface.tsx      # React component
│   └── MessageList.tsx
└── lib/
    ├── anthropic.ts          # SDK initialization
    └── types.ts              # TypeScript interfaces
```

### 4. Initialize Anthropic Client (Server-Side)

**`lib/anthropic.ts`:**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional: default timeout (ms)
  timeout: 30000,
  // Optional: max retries
  maxRetries: 3,
});

export default client;
```

---

## Core Concepts

### Message Structure

All Claude API interactions use the `messages` format:

```typescript
interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ContentBlock examples:
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ImageBlock;

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string; // or ContentBlock[] for complex results
}

interface ImageBlock {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data?: string; // base64 for type:"base64"
    url?: string;  // for type:"url"
  };
}
```

### Available Models (as of April 2026)

| Model | Capability | Best For |
|-------|-----------|----------|
| `claude-opus-4-6` | Highest intelligence, slow | Complex reasoning, long-form analysis |
| `claude-sonnet-4-6` | Balanced intelligence/speed | Production APIs, real-time chat |
| `claude-haiku-4-5` | Fast, cost-effective | Simple tasks, high-volume |

---

## Basic Completion

### Simple Synchronous Completion

**`app/api/chat/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You are a helpful assistant.",
      messages: messages,
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === "text");
    const text = textContent ? textContent.text : "";

    return NextResponse.json({
      role: "assistant",
      content: text,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
```

### Streaming Completion

For real-time streaming responses:

```typescript
import { NextRequest } from "next/server";
import client from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You are a helpful assistant.",
      messages: messages,
    });

    // Create ReadableStream for SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        // Stream events
        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        });

        stream.on("message", (message) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, message })}\n\n`)
          );
          controller.close();
        });

        stream.on("error", (error) => {
          controller.error(error);
        });
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response("Error streaming response", { status: 500 });
  }
}
```

### React Hook for Streaming Chat

**`lib/useChat.ts`:**

```typescript
import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsLoading(true);

    let assistantMessage = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content }],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              assistantMessage += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.content = assistantMessage;
                } else {
                  updated.push({
                    role: "assistant",
                    content: assistantMessage,
                  });
                }
                return updated;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, isLoading };
}
```

---

## Tool Use (Function Calling)

Tool use allows Claude to call functions you define, enabling structured interactions with external systems.

### 1. Define Tool Schemas

**`lib/tools.ts`:**

```typescript
export const tools: Anthropic.Tool[] = [
  {
    name: "get_user_info",
    description:
      "Retrieve information about a user from the database by user ID",
    input_schema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "The unique identifier of the user",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "update_user_info",
    description: "Update user information in the database",
    input_schema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "The unique identifier of the user",
        },
        field: {
          type: "string",
          enum: ["name", "email", "age"],
          description: "The field to update",
        },
        value: {
          type: "string",
          description: "The new value",
        },
      },
      required: ["user_id", "field", "value"],
    },
  },
  {
    name: "create_ticket",
    description: "Create a support ticket",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Ticket title",
        },
        description: {
          type: "string",
          description: "Detailed description",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Priority level",
        },
      },
      required: ["title", "description"],
    },
  },
];
```

### 2. Implement Tool Handlers

**`app/api/tools/database.ts`:**

```typescript
// Mock database
const users: Record<string, any> = {
  user_123: { id: "user_123", name: "John Doe", email: "john@example.com" },
};

export async function handleGetUserInfo(userId: string): Promise<string> {
  const user = users[userId];
  if (!user) {
    return JSON.stringify({ error: `User ${userId} not found` });
  }
  return JSON.stringify(user);
}

export async function handleUpdateUserInfo(
  userId: string,
  field: string,
  value: string
): Promise<string> {
  if (!users[userId]) {
    return JSON.stringify({ error: `User ${userId} not found` });
  }

  // Validate field
  if (!["name", "email", "age"].includes(field)) {
    return JSON.stringify({ error: `Invalid field: ${field}` });
  }

  users[userId][field] = value;
  return JSON.stringify({ success: true, user: users[userId] });
}

export async function handleCreateTicket(
  title: string,
  description: string,
  priority: string = "medium"
): Promise<string> {
  const ticketId = `ticket_${Date.now()}`;
  const ticket = {
    id: ticketId,
    title,
    description,
    priority,
    createdAt: new Date().toISOString(),
    status: "open",
  };

  // In production: save to database
  console.log("Created ticket:", ticket);

  return JSON.stringify({ success: true, ticket });
}

// Router for all tool calls
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_user_info":
      return handleGetUserInfo(toolInput.user_id as string);

    case "update_user_info":
      return handleUpdateUserInfo(
        toolInput.user_id as string,
        toolInput.field as string,
        toolInput.value as string
      );

    case "create_ticket":
      return handleCreateTicket(
        toolInput.title as string,
        toolInput.description as string,
        toolInput.priority as string
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
```

### 3. Basic Tool Use Endpoint

**`app/api/tools/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/anthropic";
import { tools } from "@/lib/tools";
import { executeTool } from "./database";
import type Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });

    // Single tool call (not agentic)
    const toolUseBlock = response.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );

    if (!toolUseBlock) {
      const textBlock = response.content.find(
        (c): c is Anthropic.TextBlock => c.type === "text"
      );
      return NextResponse.json({
        role: "assistant",
        content: textBlock?.text || "No response",
      });
    }

    // Execute the tool
    const toolResult = await executeTool(
      toolUseBlock.name,
      toolUseBlock.input as Record<string, unknown>
    );

    return NextResponse.json({
      toolUsed: toolUseBlock.name,
      toolInput: toolUseBlock.input,
      toolResult: JSON.parse(toolResult),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Agentic Loop

An agentic loop allows Claude to iteratively call tools, process results, and decide when to stop.

### Core Loop Pattern

```
1. Send user message + system prompt + tools to Claude
2. Claude responds with text OR tool_use blocks
3. If tool_use: execute tool, add result to conversation
4. If stop_reason = "end_turn": return response
5. Loop until stop_reason = "end_turn"
```

### Full Agentic Implementation

**`app/api/agents/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/anthropic";
import { tools } from "@/lib/tools";
import { executeTool } from "@/app/api/tools/database";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_ITERATIONS = 10; // Safety limit

interface ConversationMessage {
  role: "user" | "assistant";
  content: string | Anthropic.ContentBlock[];
}

export async function POST(request: NextRequest) {
  const { userMessage } = await request.json();

  const systemPrompt = `You are a helpful assistant with access to tools for managing users and creating tickets.
You can:
- Look up user information
- Update user details
- Create support tickets

Always use tools to help accomplish the user's request. Be friendly and clear.
If a user asks to do something, use the appropriate tools to complete the task.
After using tools, provide a summary of what was done.`;

  const conversationHistory: ConversationMessage[] = [
    { role: "user", content: userMessage },
  ];

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Call Claude with current conversation
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools: tools,
        messages: conversationHistory,
      });

      // Add assistant response to history
      conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // Check if Claude is done (no more tool calls)
      if (response.stop_reason === "end_turn") {
        // Extract final text response
        const finalText = response.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        return NextResponse.json({
          response: finalText || "Task completed.",
          iterations: iteration + 1,
        });
      }

      // Process tool calls
      const toolUseBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls and not end_turn, something unexpected
        const textContent = response.content.find(
          (c): c is Anthropic.TextBlock => c.type === "text"
        );
        return NextResponse.json({
          response: textContent?.text || "Unexpected state",
          iterations: iteration + 1,
        });
      }

      // Execute all tools and collect results
      const toolResults: Anthropic.ToolResultBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add tool results to history
      conversationHistory.push({
        role: "user",
        content: toolResults,
      });
    }

    return NextResponse.json(
      { error: "Max iterations exceeded" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Agent loop error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
```

### React Component for Agent Chat

**`components/AgentChat.tsx`:**

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "agent";
  content: string;
  iterations?: number;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: input }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: data.response,
            iterations: data.iterations,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: `Error: ${data.error}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Failed to get response" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 text-blue-900 ml-8"
                : "bg-gray-100 text-gray-900 mr-8"
            }`}
          >
            <p className="text-sm font-semibold">
              {msg.role === "user" ? "You" : "Agent"}
              {msg.iterations && ` (${msg.iterations} steps)`}
            </p>
            <p className="text-sm mt-1">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent to do something..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

---

## Database Integration for Tool Use

### Pattern 1: Direct Database Queries

**`app/api/tools/database.ts`** (using Prisma):

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handleGetUserInfo(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        tickets: { take: 5 }, // Related records
      },
    });

    if (!user) {
      return JSON.stringify({ error: `User ${userId} not found` });
    }

    return JSON.stringify(user);
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}

export async function handleUpdateUserInfo(
  userId: string,
  updates: Record<string, unknown>
): Promise<string> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return JSON.stringify({ success: true, user });
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}

export async function handleCreateTicket(
  userId: string,
  title: string,
  description: string
): Promise<string> {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        userId,
        status: "open",
      },
    });

    return JSON.stringify({ success: true, ticket });
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}

// Cleanup
process.on("exit", () => {
  prisma.$disconnect();
});
```

### Pattern 2: REST API Calls from Tools

```typescript
export async function handleFetchOrder(orderId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.your-service.com/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SERVICE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return JSON.stringify({ error: `Order ${orderId} not found` });
    }

    const order = await response.json();
    return JSON.stringify(order);
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}
```

### Pattern 3: Error Handling & Validation

```typescript
// Input validation middleware
function validateUserInput(input: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: Record<string, unknown>;
} {
  const { user_id, field, value } = input;

  if (!user_id || typeof user_id !== "string") {
    return { valid: false, error: "user_id is required and must be a string" };
  }

  if (typeof field !== "string" || !["name", "email", "age"].includes(field)) {
    return { valid: false, error: "Invalid field" };
  }

  if (!value) {
    return { valid: false, error: "value is required" };
  }

  return { valid: true, data: { user_id, field, value } };
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  // Validate input
  const validation = validateUserInput(toolInput);
  if (!validation.valid) {
    return JSON.stringify({ error: validation.error });
  }

  try {
    // Execute with validated data
    return await handleUpdateUserInfo(
      validation.data!.user_id as string,
      validation.data!.field as string,
      validation.data!.value as string
    );
  } catch (error: any) {
    return JSON.stringify({
      error: "Internal error",
      details: error.message,
    });
  }
}
```

---

## Streaming & Real-Time

### Streaming with Tokens

```typescript
export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const response = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: messages,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                const data = {
                  type: "text",
                  text: delta.text,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }
            } else if (event.type === "message_stop") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              );
              controller.close();
            }
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      `data: ${JSON.stringify({ error: error.message })}\n\n`,
      { status: 500 }
    );
  }
}
```

### Stream to React Component

```typescript
"use client";

import { useEffect, useState } from "react";

export function StreamingChat() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = async () => {
    setIsStreaming(true);
    setText("");

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setIsStreaming(false);
            } else if (data.text) {
              setText((prev) => prev + data.text);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <button onClick={startStream} disabled={isStreaming}>
        Start Streaming
      </button>
      <div className="mt-4 p-4 bg-gray-100 rounded min-h-24">
        {text}
        {isStreaming && <span className="animate-pulse">▌</span>}
      </div>
    </div>
  );
}
```

---

## Advanced Patterns

### Vision (Image Input)

```typescript
export async function POST(request: NextRequest) {
  const { imageUrl, question } = await request.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: question,
          },
        ],
      },
    ],
  });

  return NextResponse.json({
    response: response.content[0],
  });
}
```

### Document Processing (PDF, Text Files)

```typescript
export async function processDocument(
  documentContent: string,
  query: string
) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Here is a document:\n\n${documentContent}\n\nQuestion: ${query}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

### Multi-Turn Tool Use with Context

```typescript
interface AgentState {
  conversationHistory: Anthropic.MessageParam[];
  context: Record<string, unknown>;
  iterations: number;
}

export async function continueAgentLoop(
  state: AgentState,
  userMessage: string
): Promise<AgentState> {
  state.conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  state.iterations++;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: tools,
    messages: state.conversationHistory,
    system: `You are an agent with context: ${JSON.stringify(state.context)}`,
  });

  state.conversationHistory.push({
    role: "assistant",
    content: response.content,
  });

  return state;
}
```

### Batch Processing

```typescript
export async function batchProcess(
  items: string[],
  processor: (item: string) => Promise<string>
): Promise<{ item: string; result: string }[]> {
  const results = [];

  for (const item of items) {
    const result = await processor(item);
    results.push({ item, result });

    // Rate limiting (avoid hitting limits)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
```

---

## Best Practices & Gotchas

### 1. **Always Store API Key in Environment Variables**

❌ **BAD:**

```typescript
const client = new Anthropic({ apiKey: "sk-ant-xxx" });
```

✅ **GOOD:**

```typescript
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### 2. **Use Server-Side Calls Only**

❌ **BAD:** Client-side API key exposure

```typescript
// In a React component
const client = new Anthropic({ apiKey: "..." });
```

✅ **GOOD:** Via API route

```typescript
// app/api/chat/route.ts
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### 3. **Handle Token Limits**

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024, // Set appropriate limit
  messages: messages,
});

// Check token usage
console.log(`Input tokens: ${response.usage.input_tokens}`);
console.log(`Output tokens: ${response.usage.output_tokens}`);
```

### 4. **Implement Timeouts**

```typescript
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2,
});
```

### 5. **Validate Tool Input**

Always validate tool input before database operations:

```typescript
function validateInput(input: unknown): input is ToolInput {
  if (typeof input !== "object" || input === null) return false;
  return "user_id" in input && typeof input.user_id === "string";
}
```

### 6. **Handle Streaming Errors Gracefully**

```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: messages,
});

stream.on("error", (error) => {
  console.error("Stream error:", error);
  // Notify user of error
});
```

### 7. **Limit Agentic Loop Iterations**

```typescript
const MAX_ITERATIONS = 10; // Prevent infinite loops

for (let i = 0; i < MAX_ITERATIONS; i++) {
  // ... loop logic
}
```

### 8. **Cost Management**

Track spending with token counts:

```typescript
let totalInputTokens = 0;
let totalOutputTokens = 0;

const response = await client.messages.create({...});
totalInputTokens += response.usage.input_tokens;
totalOutputTokens += response.usage.output_tokens;

const costEstimate = (totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 1000000;
console.log(`Estimated cost: $${costEstimate}`);
```

---

## API Reference Cheat Sheet

### Messages.Create

```typescript
client.messages.create({
  model: "claude-sonnet-4-6",           // Required
  max_tokens: 1024,                      // Required
  system?: string | SystemBlock[],       // Optional system prompt
  messages: Message[],                   // Required
  tools?: Tool[],                        // Optional
  temperature?: 0.0 - 1.0,              // Optional
  top_p?: 0.0 - 1.0,                    // Optional
  top_k?: number,                        // Optional
  stop_sequences?: string[],             // Optional
})
```

**Response:**

```typescript
{
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### Tool Definition

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, PropertyDef>;
    required: string[];
  };
}

interface PropertyDef {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  description?: string;
  enum?: (string | number)[];
  items?: PropertyDef;
}
```

### Content Blocks

| Type | Usage |
|------|-------|
| `TextBlock` | Text output from Claude |
| `ToolUseBlock` | Claude wants to call a tool |
| `ToolResultBlock` | Result from tool execution |
| `ImageBlock` | Image input (user message) |

### Stop Reasons

| Reason | Meaning |
|--------|---------|
| `end_turn` | Claude finished responding naturally |
| `tool_use` | Claude wants to call a tool |
| `max_tokens` | Response hit token limit |
| `stop_sequence` | Hit a custom stop sequence |

---

## Deployment Checklist

- [ ] API key stored in `.env.local` (never in code)
- [ ] Timeout configured (30s recommended)
- [ ] Max retries set (2-3 recommended)
- [ ] Tool input validation implemented
- [ ] Error handling for all API calls
- [ ] Streaming error handling
- [ ] Rate limiting / backoff strategy
- [ ] Token usage monitoring
- [ ] Database connection pooling configured
- [ ] Tool execution timeouts
- [ ] Agentic loop iteration limit set
- [ ] Logging for debugging
- [ ] CORS configured properly (if needed)

---

## Resources

- **Official Docs:** https://docs.claude.com/en/api/overview
- **SDK GitHub:** https://github.com/anthropics/anthropic-sdk-python (TypeScript: `@anthropic-ai/sdk`)
- **Tool Use Guide:** https://docs.claude.com/en/docs/build-with-claude/tool-use
- **Prompt Engineering:** https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview

---

**Generated:** April 2026  
**SDK Version:** Latest (@anthropic-ai/sdk)  
**TypeScript Version:** 5.0+
