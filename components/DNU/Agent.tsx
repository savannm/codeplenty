/**
 * Agent.tsx — Anthropic Claude AI Agent (Demo / Learning File)
 * ─────────────────────────────────────────────────────────────
 * This file is a Next.js Server Component that demonstrates three patterns
 * for working with Claude (Anthropic's AI) via the @anthropic-ai/sdk:
 *
 * ① BASIC CALL (active)
 *    The simplest usage — sends a single user message to Claude and receives
 *    a text response. Good starting point for any AI feature.
 *    → Uses: client.messages.create({ messages: [...] })
 *
 * ② TOOL USAGE (commented out)
 *    Shows how to give Claude "tools" (functions it can decide to call).
 *    Claude reads the prompt, and if it decides a tool is appropriate, it
 *    returns a `tool_use` block instead of plain text. You then execute that
 *    tool on your end and can pass the result back to Claude.
 *    → Uses: client.messages.create({ tools: [...], messages: [...] })
 *
 * ③ AGENTIC LOOP (commented out)
 *    The most powerful pattern. Claude runs in a loop — each iteration it
 *    either calls a tool (you execute it and feed the result back) or decides
 *    it's done (`stop_reason === "end_turn"`) and returns a final answer.
 *    This lets Claude autonomously complete multi-step tasks.
 *    → Uses: while(true) loop + tool_result messages
 *
 * ─────────────────────────────────────────────────────────────
 * SETUP
 *  - Requires ANTHROPIC_API_KEY in your .env.local
 *  - applyUIUpdate() and executeTool() are stubs — replace with real logic
 *  - AVAILABLE_TOOLS defines what functions Claude is allowed to call
 * ─────────────────────────────────────────────────────────────
 */

// Anthropic Claude
import Anthropic from "@anthropic-ai/sdk";
import { Tool, MessageParam } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Grok xai
// import { createXai } from '@ai-sdk/xai';
// const grok = createXai({ apiKey: process.env.GROK_API_KEY });

// ─────────────────────────────────────────────
// Stub: Apply a UI update based on the tool call input
// Replace with your real implementation
// ─────────────────────────────────────────────
function applyUIUpdate(input: Record<string, unknown>) {
    console.log("Applying UI update:", input);
}

// ─────────────────────────────────────────────
// Stub: Execute a named tool with the given input
// Replace with your real tool implementations
// ─────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    console.log(`Executing tool: ${name}`, input);
    return { success: true };
}

// ─────────────────────────────────────────────
// Available tools for the agentic loop
// ─────────────────────────────────────────────
const AVAILABLE_TOOLS: Tool[] = [
    {
        name: "update_ui_component",
        description: "Updates a UI component with new props based on AI decision",
        input_schema: {
            type: "object",
            properties: {
                component: { type: "string", enum: ["hero", "cta", "pricing"] },
                headline: { type: "string" },
                variant: { type: "string", enum: ["default", "urgent", "promo"] },
            },
            required: ["component", "headline"],
        },
    },
];


export default async function Agent() {
    // ─────────────────────────────────────────────
    // BASIC
    // ─────────────────────────────────────────────
    const message = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: "Explain agentic AI in one paragraph."
        }],
    });

    // Narrow the content block type before accessing .text
    // const firstBlock = message.content[0];
    // if (firstBlock.type === "text") {
    //     console.log(firstBlock.text);
    // }

    // ─────────────────────────────────────────────
    // TOOL USAGE
    // ─────────────────────────────────────────────
    // const response = await client.messages.create({
    //     model: "claude-opus-4-5",
    //     max_tokens: 1024,
    //     tools: AVAILABLE_TOOLS,
    //     messages: [{ role: "user", content: "Make the hero section more compelling for Black Friday." }],
    // });

    // // Claude returns a tool_use block — parse and execute it
    // const toolCall = response.content.find((b) => b.type === "tool_use");
    // if (toolCall && toolCall.type === "tool_use") {
    //     applyUIUpdate(toolCall.input as Record<string, unknown>);
    //     console.log("Claude decided:", toolCall.input);
    // }

    // // Run the agentic loop with a sample goal
    // const result = await agentLoop("Make the homepage more engaging for new visitors.");
    // console.log("Agent result:", result);
}

// ─────────────────────────────────────────────
// AGENTIC LOOP
// Continues calling Claude until it stops with "end_turn"
// ─────────────────────────────────────────────
// export async function agentLoop(userGoal: string): Promise<string | undefined> {
//     const messages: MessageParam[] = [{ role: "user", content: userGoal }];

//     while (true) {
//         const response = await client.messages.create({
//             model: "claude-opus-4-5",
//             max_tokens: 2048,
//             tools: AVAILABLE_TOOLS,
//             messages,
//         });

//         // If model is done, return final text
//         if (response.stop_reason === "end_turn") {
//             const textBlock = response.content.find((b) => b.type === "text");
//             return textBlock?.type === "text" ? textBlock.text : undefined;
//         }

//         // Otherwise, find the tool call, execute it, and feed the result back
//         const toolUse = response.content.find((b) => b.type === "tool_use");
//         if (!toolUse || toolUse.type !== "tool_use") break; // no tool call found, exit loop

//         const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);

//         messages.push({ role: "assistant", content: response.content });
//         messages.push({
//             role: "user",
//             content: [{ type: "tool_result", tool_use_id: toolUse.id, content: String(result) }],
//         });
//     }
// }
