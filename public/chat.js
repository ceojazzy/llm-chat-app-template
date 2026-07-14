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
const systemPromptInput = document.getElementById("system-prompt");

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
			throw new Error("Failed to get response");
		}

		if (!response.body) {
			throw new Error("Response body is null");
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
			"Sorry, there was an error processing your request.";
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
