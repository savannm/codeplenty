/*
 * useChat — Custom React hook for streaming chat with the Anthropic API
 *
 * LOGIC FLOW:
 *
 *  1. User calls sendMessage(content)
 *       │
 *       ▼
 *  2. Optimistically append the user message to state immediately
 *     (so the UI updates before waiting for the server)

 *  3. POST to /api/chat with the full message history
 *     (includes the new user message so the server has full context)
 *       │
 *       ▼
 *  4. Get a ReadableStream back (Server-Sent Events / SSE)
 *     Open a reader and loop until the stream is closed
 *       │
 *       ▼
 *  5. Each chunk → decode bytes → split into lines → find "data: " lines
 *     Parse the JSON payload and extract the `text` token
 *       │
 *       ▼
 *  6. Accumulate tokens into `assistantMessage` string
 *     On each token: update (or create) the last assistant message in state
 *     so the UI re-renders progressively as text streams in
 *       │
 *       ▼
 *  7. Stream ends (done = true) → setIsLoading(false)
 *
 * STATE EXPOSED:
 *   messages    — full conversation history (user + assistant turns)
 *   isLoading   — true while waiting for / reading the stream
 *   sendMessage — trigger function called by the UI on form submit
 */

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