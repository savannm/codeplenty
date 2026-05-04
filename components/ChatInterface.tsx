/*
 * ChatInterface.tsx — Client-Side Chat UI for the Agentic Loop
 *
 * WHERE IT LIVES IN THE APP:
 *   app/service/page.tsx  →  imports <ChatInterface />  →  renders this component
 *
 * WHAT IT DOES:
 *   This is the React UI component for the AI agent chat interface.
 *   It lets the user type a message, send it to the backend, and display
 *   the agent's response — including how many tool-call steps it took.
 *
 * HOW IT CONNECTS TO THE REST OF THE APP:
 *
 *   [User types + submits]
 *          │
 *          ▼
 *   handleSubmit() → fetch POST "/api/agents"   ← app/api/agents/route.ts
 *          │
 *          │  Backend runs the agentic loop:
 *          │    1. Calls Claude with tools available
 *          │    2. If Claude calls a tool → executeTool() in database.ts
 *          │    3. Repeats until Claude reaches end_turn (max 5 iterations)
 *          │    4. Returns { response: string, iterations: number }
 *          │
 *          ▼
 *   setMessages() → React re-render
 *          │
 *          ▼
 *   <MessageList /> renders the updated conversation bubbles
 *   Agent messages show "(N steps)" if Claude used tools to complete the task
 *
 * STATE MANAGED HERE:
 *   messages    — full conversation history passed down to <MessageList />
 *   input       — current value of the text input field
 *   isLoading   — true while waiting for the agent's response (disables input + button)
 *
 * NOTE: Unlike the streaming chat (/api/chat), this endpoint waits for the full
 * agentic loop to complete before returning — so there is no live token streaming.
 * The response arrives all at once when Claude finishes all tool calls.
 */

"use client";
import Image from "next/image";

import { useState, useRef, useEffect } from "react";
import MessageList from "./MessageList";

// Exported so MessageList.tsx can import and use the same Message type
export interface Message {
    role: "user" | "agent";
    content: string;
    iterations?: number; // Number of agentic loop steps taken (agent messages only)
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scrolls to the bottom of the message list after each new message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message to state immediately (optimistic update)
        setMessages((prev) => [...prev, { role: "user", content: input }]);
        setInput("");
        setIsLoading(true);

        try {
            // POST to the agentic loop endpoint with the user's message
            const response = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userMessage: input }),
            });

            const data = await response.json();

            if (response.ok) {
                // Append agent reply — includes iteration count if tools were used
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "agent",
                        content: data.response,
                        iterations: data.iterations,
                    },
                ]);
            } else {
                // Surface API-level errors in the chat UI
                setMessages((prev) => [
                    ...prev,
                    { role: "agent", content: `Error: ${data.error}` },
                ]);
            }
        } catch (error) {
            // Surface network/fetch errors in the chat UI
            setMessages((prev) => [
                ...prev,
                { role: "agent", content: "Failed to get response" },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-2xl mx-auto p-4" style={{ backgroundColor: "#dfdfdf", borderRadius: "20px" }}>
            {/* MessageList handles all message bubble rendering */}
            <MessageList messages={messages} messagesEndRef={messagesEndRef} />
            <div className="flex justify-end pb-2"><Image src="/profile.png" alt="profile" width={70} height={70} loading="eager" /></div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask the agent to do something..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border rounded-lg border-gray-400 text-black"
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
