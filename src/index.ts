/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const DEFAULT_MODEL_ID = "openai/gpt-5-chat";
const ALLOWED_MODEL_IDS = new Set([
	"openai/gpt-5-chat",
	"google/gemini-3.1-pro",
	"google/gemini-3.1-flash-lite",
	"openai/gpt-5",
]);

// Default system prompt
const SYSTEM_PROMPT =
	"You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			// Handle POST requests for chat
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}

			// Method not allowed for other request types
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Parse JSON request body
		const { messages = [], systemPrompt, model } = (await request.json()) as {
			messages: ChatMessage[];
			systemPrompt?: string;
			model?: string;
		};

		const resolvedSystemPrompt = systemPrompt?.trim() || SYSTEM_PROMPT;
		const requestedModel = model?.trim() || DEFAULT_MODEL_ID;
		const resolvedModel = ALLOWED_MODEL_IDS.has(requestedModel)
			? requestedModel
			: DEFAULT_MODEL_ID;

		const contents = messages
			.filter((msg) => msg.role !== "system")
			.map((msg) => ({
				role: msg.role === "assistant" ? "model" : "user",
				parts: [{ text: msg.content }],
			}));

		if (contents.length === 0) {
			return new Response(JSON.stringify({ error: "At least one user message is required" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}

		const inputs = {
			contents,
			generationConfig: {
				temperature: 0.3,
			},
			systemInstruction: {
				parts: [{ text: resolvedSystemPrompt }],
			},
			stream: true,
		};

		const stream = await env.AI.run(resolvedModel, inputs, {
			// Uncomment to use AI Gateway
			// gateway: {
			//   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
			//   skipCache: false,      // Set to true to bypass cache
			//   cacheTtl: 3600,        // Cache time-to-live in seconds
			// },
		});

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);
		const message = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: message || "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}
