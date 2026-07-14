/**
 * LLM Chat App Frontend
 *
 * Handles chat UI interactions and communication with the backend API.
 */

const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const modelInput = document.getElementById("model-select");
const copyModelButton = document.getElementById("copy-model-button");
const systemPromptInput = document.getElementById("system-prompt");
const modelPricing = document.getElementById("model-pricing");
const headerPricing = document.getElementById("header-pricing");

const modelCatalog = [
	["LLM", "@cf/meta/llama-3.2-1b-instruct", "2,457 input / 18,252 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.2-3b-instruct", "4,625 input / 30,475 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.1-8b-instruct-fp8-fast", "4,119 input / 34,868 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.2-11b-vision-instruct", "4,410 input / 61,493 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.1-70b-instruct-fp8-fast", "26,668 input / 204,805 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-4-scout-17b-16e-instruct", "24,545 input / 77,273 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "26,668 input / 204,805 output neurons per M tokens"],
	["LLM", "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", "45,170 input / 443,756 output neurons per M tokens"],
	["LLM", "@cf/mistral/mistral-7b-instruct-v0.1", "10,000 input / 17,300 output neurons per M tokens"],
	["LLM", "@cf/mistralai/mistral-small-3.1-24b-instruct", "31,876 input / 50,488 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.1-8b-instruct", "25,608 input / 75,147 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.1-8b-instruct-fp8", "13,778 input / 26,128 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3.1-8b-instruct-awq", "11,161 input / 24,215 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3-8b-instruct", "25,608 input / 75,147 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-3-8b-instruct-awq", "11,161 input / 24,215 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-2-7b-chat-fp16", "50,505 input / 606,061 output neurons per M tokens"],
	["LLM", "@cf/meta/llama-guard-3-8b", "44,003 input / 2,730 output neurons per M tokens"],
	["LLM", "@cf/google/gemma-3-12b-it", "31,371 input / 50,560 output neurons per M tokens"],
	["LLM", "@cf/google/gemma-4-26b-a4b-it", "9,091 input / 27,273 output neurons per M tokens"],
	["LLM", "@cf/qwen/qwq-32b", "60,000 input / 90,909 output neurons per M tokens"],
	["LLM", "@cf/qwen/qwen3-30b-a3b-fp8", "4,625 input / 30,475 output neurons per M tokens"],
	["LLM", "@cf/qwen/qwen2.5-coder-32b-instruct", "60,000 input / 90,909 output neurons per M tokens"],
	["LLM", "@cf/openai/gpt-oss-20b", "18,182 input / 27,273 output neurons per M tokens"],
	["LLM", "@cf/openai/gpt-oss-120b", "31,818 input / 68,182 output neurons per M tokens"],
	["LLM", "@cf/aisingapore/gemma-sea-lion-v4-27b-it", "31,876 input / 50,488 output neurons per M tokens"],
	["LLM", "@cf/ibm-granite/granite-4.0-h-micro", "1,542 input / 10,158 output neurons per M tokens"],
	["LLM", "@cf/zai-org/glm-4.7-flash", "5,500 input / 36,400 output neurons per M tokens"],
	["LLM", "@cf/zai-org/glm-5.2", "127,273 input / 236,364 cached / 400,000 output neurons per M tokens"],
	["LLM", "@cf/nvidia/nemotron-3-120b-a12b", "45,455 input / 136,364 output neurons per M tokens"],
	["LLM", "@cf/moonshotai/kimi-k2.5", "54,545 input / 9,091 cached / 272,727 output neurons per M tokens"],
	["LLM", "@cf/moonshotai/kimi-k2.6", "86,364 input / 14,545 cached / 363,636 output neurons per M tokens"],
	["LLM", "@cf/moonshotai/kimi-k2.7-code", "86,364 input / 17,273 cached / 363,636 output neurons per M tokens"],
	["Embeddings", "@cf/baai/bge-small-en-v1.5", "1,841 input neurons per M tokens"],
	["Embeddings", "@cf/baai/bge-base-en-v1.5", "6,058 input neurons per M tokens"],
	["Embeddings", "@cf/baai/bge-large-en-v1.5", "18,582 input neurons per M tokens"],
	["Embeddings", "@cf/baai/bge-m3", "1,075 input neurons per M tokens"],
	["Embeddings", "@cf/pfnet/plamo-embedding-1b", "1,689 input neurons per M tokens"],
	["Embeddings", "@cf/qwen/qwen3-embedding-0.6b", "1,075 input neurons per M tokens"],
	["Image", "@cf/black-forest-labs/flux-1-schnell", "4.80 neurons per 512x512 tile / 9.60 per step"],
	["Image", "@cf/leonardo/lucid-origin", "636 neurons per 512x512 tile / 12 per step"],
	["Image", "@cf/leonardo/phoenix-1.0", "530 neurons per 512x512 tile / 10 per step"],
	["Image", "@cf/black-forest-labs/flux-2-dev", "18.75 input / 37.50 output neurons per tile per step"],
	["Image", "@cf/black-forest-labs/flux-2-klein-4b", "5.37 input / 26.05 output neurons per tile"],
	["Image", "@cf/black-forest-labs/flux-2-klein-9b", "1,363.64 first MP / 181.82 subsequent or input MP neurons"],
	["Audio", "@cf/openai/whisper", "41.14 neurons per audio minute"],
	["Audio", "@cf/openai/whisper-large-v3-turbo", "46.63 neurons per audio minute"],
	["Audio", "@cf/myshell-ai/melotts", "18.63 neurons per audio minute"],
	["Audio", "@cf/deepgram/aura-1", "1,363.64 neurons per 1k input characters"],
	["Audio", "@cf/deepgram/nova-3", "472.73 neurons per input audio minute"],
	["Audio", "@cf/deepgram/nova-3 (WebSocket)", "836.36 neurons per input audio minute"],
	["Audio", "@cf/pipecat-ai/smart-turn-v2", "0.51 neurons per input audio minute"],
	["Audio", "@cf/deepgram/aura-2-en", "2,727.27 neurons per 1k input characters"],
	["Audio", "@cf/deepgram/aura-2-es", "2,727.27 neurons per 1k input characters"],
	["Audio", "@cf/deepgram/flux (WebSocket)", "700 neurons per audio minute"],
	["Other", "@cf/baai/bge-reranker-base", "283 input neurons per M tokens"],
	["Other", "@cf/microsoft/resnet-50", "228,055 neurons per M images"],
	["Other", "@cf/moondream/moondream3.1-9B-A2B", "27,273 input / 90,909 output neurons per M tokens"],
	["Other", "@cf/huggingface/distilbert-sst-2-int8", "2,394 input neurons per M tokens"],
	["Other", "@cf/meta/m2m100-1.2b", "31,050 input / 31,050 output neurons per M tokens"],
	["Other", "@cf/ai4bharat/indictrans2-en-indic-1B", "31,050 input / 31,050 output neurons per M tokens"],
];

let currentCategory = "";
for (const [category, id] of modelCatalog) {
	if (category !== currentCategory) {
		const group = document.createElement("optgroup");
		group.label = category;
		modelInput.appendChild(group);
		currentCategory = category;
	}
	const option = document.createElement("option");
	option.value = id;
	option.textContent = id;
	modelInput.lastElementChild.appendChild(option);
}

function updateModelPricing() {
	const model = modelCatalog.find((entry) => entry[1] === modelInput.value);
	modelPricing.replaceChildren();
	if (!model) {
		headerPricing.textContent = "Powered by Cloudflare Workers AI";
		return;
	}

	headerPricing.textContent = `${model[0]} pricing · $0.011 per 1,000 neurons`;

	for (const price of model[2].split(" / ")) {
		const row = document.createElement("div");
		row.className = "pricing-row";
		const label = document.createElement("span");
		label.className = "pricing-label";
		const value = document.createElement("span");
		const lowerPrice = price.toLowerCase();
		label.textContent = lowerPrice.includes("cached")
			? "Cached input"
			: lowerPrice.includes("output")
				? "Output"
				: lowerPrice.includes("input")
					? "Input"
					: "Rate";
		value.textContent = price;
		row.append(label, value);
		modelPricing.appendChild(row);
	}
}

modelInput.addEventListener("change", updateModelPricing);
updateModelPricing();

copyModelButton.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(modelInput.value);
		copyModelButton.textContent = "Copied";
		setTimeout(() => {
			copyModelButton.textContent = "Copy";
		}, 1200);
	} catch (error) {
		console.error("Could not copy model ID:", error);
		copyModelButton.textContent = "Copy failed";
		setTimeout(() => {
			copyModelButton.textContent = "Copy";
		}, 1200);
	}
});

let chatHistory = [
	{
		role: "assistant",
		content:
			"Hello! I'm an LLM chat app powered by Cloudflare Workers AI. How can I help you today?",
	},
];

let isProcessing = false;

userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = `${this.scrollHeight}px`;
});

userInput.addEventListener("keydown", function (event) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		sendMessage();
	}
});

sendButton.addEventListener("click", sendMessage);

async function sendMessage() {
	const message = userInput.value.trim();

	if (message === "" || isProcessing) {
		return;
	}

	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;

	addMessageToChat("user", message);
	chatHistory.push({ role: "user", content: message });

	userInput.value = "";
	userInput.style.height = "auto";
	typingIndicator.classList.add("visible");

	const assistantMessageEl = document.createElement("div");
	assistantMessageEl.className = "message assistant-message";
	assistantMessageEl.innerHTML = "<p></p>";
	chatMessages.appendChild(assistantMessageEl);

	const assistantTextEl = assistantMessageEl.querySelector("p");
	chatMessages.scrollTop = chatMessages.scrollHeight;

	try {
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: chatHistory,
				model: modelInput.value,
				systemPrompt: systemPromptInput.value,
			}),
		});

		if (!response.ok) {
			let errorMessage = "Failed to get response";
			try {
				const errorData = await response.json();
				errorMessage = errorData.error || errorMessage;
			} catch {}
			throw new Error(errorMessage);
		}

		if (!response.body) {
			throw new Error("Response body is null");
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("text/event-stream")) {
			const data = await response.json();
			const content = extractResponseText(data);
			if (!content) throw new Error("The model returned an empty response");
			assistantTextEl.textContent = content;
			chatHistory.push({ role: "assistant", content });
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let responseText = "";
		let buffer = "";
		let sawDone = false;

		while (true) {
			const { value, done } = await reader.read();

			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const parsed = consumeSseEvents(buffer);
			buffer = parsed.buffer;

			for (const data of parsed.events) {
				if (data === "[DONE]") {
					sawDone = true;
					buffer = "";
					break;
				}

				try {
					const jsonData = JSON.parse(data);
					const content = extractResponseText(jsonData);

					if (content) {
						responseText += content;
						assistantTextEl.textContent = responseText;
						chatMessages.scrollTop = chatMessages.scrollHeight;
					}
				} catch (error) {
					console.error("Error parsing SSE data as JSON:", error, data);
				}
			}

			if (sawDone) {
				break;
			}
		}

		if (responseText.length > 0) {
			chatHistory.push({ role: "assistant", content: responseText });
		}
	} catch (error) {
		console.error("Error:", error);
		assistantTextEl.textContent =
			`Sorry, there was an error processing your request. ${error.message || ""}`;
	} finally {
		typingIndicator.classList.remove("visible");
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

function addMessageToChat(role, content) {
	const messageEl = document.createElement("div");
	messageEl.className = `message ${role}-message`;
	messageEl.innerHTML = `<p>${content}</p>`;
	chatMessages.appendChild(messageEl);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

function consumeSseEvents(buffer) {
	const normalized = buffer.replace(/\r/g, "");
	const events = [];
	let remaining = normalized;
	let eventEndIndex;

	while ((eventEndIndex = remaining.indexOf("\n\n")) !== -1) {
		const rawEvent = remaining.slice(0, eventEndIndex);
		remaining = remaining.slice(eventEndIndex + 2);

		const dataLines = rawEvent
			.split("\n")
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice("data:".length).trimStart());

		if (dataLines.length > 0) {
			events.push(dataLines.join("\n"));
		}
	}

	return {
		events,
		buffer: remaining,
	};
}

function extractResponseText(jsonData) {
	if (typeof jsonData.response === "string" && jsonData.response.length > 0) {
		return jsonData.response;
	}

	if (typeof jsonData.text === "string" && jsonData.text.length > 0) {
		return jsonData.text;
	}

	if (Array.isArray(jsonData.candidates)) {
		return jsonData.candidates
			.flatMap((candidate) => candidate.content?.parts ?? [])
			.map((part) => part.text ?? "")
			.join("");
	}

	if (jsonData.choices?.[0]?.delta?.content) {
		return jsonData.choices[0].delta.content;
	}

	return "";
}
