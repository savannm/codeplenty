import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/anthropic";
import { tools } from "@/lib/tools";
import { executeTool } from "@/app/api/tools/database";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_ITERATIONS = 5; // Safety limit

interface ConversationMessage {
    role: "user" | "assistant";
    content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[];
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
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

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