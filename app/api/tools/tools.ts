//Tool implementations
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