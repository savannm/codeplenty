/*
 * routes.ts — Single Tool Call Endpoint (Non-Agentic)
 *
 * This file handles ONE round of tool use — unlike the agentic loop in /api/agents,
 * it calls Claude once and either returns a text response or executes a single tool.
 *
 * LOGIC FLOW:
 *
 *  1. Client sends POST with a `messages` array
 *       │
 *       ▼
 *  2. Call Claude API with the messages + available tools (from lib/tools.ts)
 *       │
 *       ▼
 *  3. Check if Claude's response contains a tool_use block
 *       │
 *       ├── NO tool call → extract text and return a plain assistant response
 *       │
 *       └── YES tool call → pass the tool name + input to executeTool()
 *                               (which routes to the correct handler in database.ts)
 *       │
 *       ▼
 *  4. Return the tool result as JSON:
 *       { toolUsed, toolInput, toolResult }
 *
 * NOTE: This does NOT loop. If the tool result needs further processing by Claude,
 * use the agentic route at /api/agents instead.
 */

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