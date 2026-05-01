// MessageList.tsx — Renders the conversation bubbles
// Receives the messages array and a scroll ref from ChatInterface.tsx
// Each message is styled based on role: "user" (blue, right) or "agent" (gray, left)
// Agent messages also show how many tool-call steps were taken e.g. "(3 steps)"

import { RefObject } from "react";
import { Message } from "./ChatInterface";

interface MessageListProps {
    messages: Message[];
    messagesEndRef: RefObject<HTMLDivElement>;
}

export default function MessageList({ messages, messagesEndRef }: MessageListProps) {
    return (
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((msg, idx) => (
                <div
                    key={idx}
                    className={`p-3 rounded-lg ${msg.role === "user"
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
            {/* Invisible div at the bottom — scrolled into view after each new message */}
            <div ref={messagesEndRef} />
        </div>
    );
}
