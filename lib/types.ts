//TypeScript interfaces

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