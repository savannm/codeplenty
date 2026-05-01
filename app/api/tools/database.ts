/*
 * database.ts — Tool Implementations & Executor
 *
 * This file serves two purposes:
 *
 *  1. MOCK DATABASE
 *     Holds an in-memory `users` object that simulates a real database.
 *     In production, these functions would query an actual DB (e.g. PostgreSQL, Firebase).
 *
 *  2. TOOL HANDLERS
 *     Each function below handles a specific tool that the AI model can call:
 *
 *     • handleGetUserInfo(userId)
 *         Looks up a user by ID and returns their data as a JSON string.
 *
 *     • handleUpdateUserInfo(userId, field, value)
 *         Updates a single field (name, email, or age) on an existing user.
 *         Validates the field name before applying the change.
 *
 *     • handleCreateTicket(title, description, priority)
 *         Creates a new support ticket with a unique ID and timestamp.
 *         Priority defaults to "medium" if not provided.
 *
 *  3. TOOL ROUTER — executeTool(toolName, toolInput)
 *     Acts as the central dispatcher. When the AI model returns a tool_use
 *     block, this function receives the tool name and its input, then routes
 *     the call to the correct handler above. Returns the result as a JSON string
 *     which is sent back to the model as a tool_result.
 */

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