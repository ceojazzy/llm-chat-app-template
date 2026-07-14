import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const models = [
  ["LLM", "@cf/meta/llama-4-scout-17b-16e-instruct", "24,545 input · 77,273 output neurons / Million"],
  ["LLM", "@cf/qwen/qwen3-30b-a3b-fp8", "4,625 input · 30,475 output neurons / Million"],
  ["LLM", "@cf/openai/gpt-oss-120b", "31,818 input · 68,182 output neurons / Million"],
  ["LLM", "@cf/openai/gpt-oss-20b", "18,182 input · 27,273 output neurons / Million"],
  ["LLM", "@cf/ibm-granite/granite-4.0-h-micro", "1,542 input · 10,158 output neurons / Million"],
  ["LLM", "@cf/zai-org/glm-5.2", "127,273 input · 236,364 cached · 400,000 output neurons / Million"],
  ["LLM", "@cf/moonshotai/kimi-k2.5", "54,545 input · 9,091 cached · 272,727 output neurons / Million"],
  ["LLM", "@cf/moonshotai/kimi-k2.6", "86,364 input · 14,545 cached · 363,636 output neurons / Million"],
  ["LLM", "@cf/moonshotai/kimi-k2.7-code", "86,364 input · 17,273 cached · 363,636 output neurons / Million"],
  ["LLM", "@cf/google/gemma-4-26b-a4b-it", "9,091 input · 27,273 output neurons / Million"],
  ["Embeddings", "@cf/qwen/qwen3-embedding-0.6b", "1,075 input neurons / Million"],
  ["Image", "@cf/black-forest-labs/flux-2-dev", "18.75 input · 37.50 output neurons / tile / step"],
  ["Image", "@cf/black-forest-labs/flux-2-klein-4b", "5.37 input · 26.05 output neurons / tile"],
  ["Image", "@cf/black-forest-labs/flux-2-klein-9b", "1,363.64 first MP · 181.82 subsequent MP neurons"],
  ["Audio", "@cf/deepgram/nova-3", "472.73 neurons / audio minute"],
  ["Audio", "@cf/deepgram/flux (WebSocket)", "700 neurons / audio minute"],
  ["Other", "@cf/moondream/moondream3.1-9B-A2B", "27,273 input · 90,909 output neurons / Million"],
];

const defaultModel = "@cf/google/gemma-4-26b-a4b-it";
const findModel = (id) => models.find((model) => model[1] === id) || models[0];

function Pricing({ category, text }) {
  const parts = text.split(" · ");
  const rows = parts.map((part) => {
    const lower = part.toLowerCase();
    const label = lower.includes("cached") ? "Cached input" : lower.includes("output") ? "Output" : lower.includes("input") ? "Input" : "Rate";
    const value = category === "LLM" || category === "Embeddings"
      ? `${part.match(/[\d,.]+/)?.[0] || part} / Million`
      : part.replace(/\s+(input|output)/i, "");
    return [label, value];
  });
  return <div className="pricing-card">{rows.map(([label, value]) => <div className="pricing-line" key={`${label}-${value}`}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function App() {
  const [model, setModel] = useState(localStorage.getItem("model") || defaultModel);
  const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem("systemPrompt") || "You are a helpful, friendly assistant. Provide concise and accurate responses.");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: "Welcome to Cloudflare AI Studio. Choose a model and start creating." }]);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [imageSize, setImageSize] = useState({ width: 720, height: 1280 });
  const [audioFile, setAudioFile] = useState(null);
  const [audioOptions, setAudioOptions] = useState({ language: "en-US", detect_language: true, diarize: false, punctuate: true, smart_format: true });
  const inputRef = useRef(null);
  const selected = findModel(model);
  const category = selected[0];
  const isImage = category === "Image";
  const isAudio = category === "Audio" && model === "@cf/deepgram/nova-3";
  const isEmbedding = category === "Embeddings";
  const isSpecial = isImage || isAudio || isEmbedding;

  useEffect(() => { localStorage.setItem("model", model); }, [model]);
  useEffect(() => { localStorage.setItem("systemPrompt", systemPrompt); }, [systemPrompt]);
  useEffect(() => { localStorage.setItem("theme", theme); }, [theme]);

  const groupedModels = useMemo(() => models.reduce((groups, item) => {
    (groups[item[0]] ||= []).push(item);
    return groups;
  }, {}), []);
  const filteredModels = useMemo(() => models.filter((item) => item[1].toLowerCase().includes(modelSearch.toLowerCase())), [modelSearch]);

  async function send() {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessage("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    try {
      let body = { model, messages: [...messages, { role: "user", content: text }], systemPrompt };
      if (isImage) body = { model, prompt: text, width: imageSize.width, height: imageSize.height };
      if (isEmbedding) body = { model, text: [text] };
      if (isAudio) {
        if (!audioFile) throw new Error("Choose an audio file first");
        const buffer = await audioFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        body = { model, audio: btoa(binary), audioContentType: audioFile.type || "audio/mpeg", ...audioOptions };
      }
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error((await response.json()).error || "Request failed");
      const type = response.headers.get("content-type") || "";
      if (!type.includes("text/event-stream")) {
        const data = await response.json();
        if (data.image) setMessages((current) => [...current, { role: "assistant", image: `data:image/png;base64,${data.image}` }]);
        else setMessages((current) => [...current, { role: "assistant", content: data.text || JSON.stringify(data, null, 2) }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const data = chunk.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try { const json = JSON.parse(data); answer += json.response || json.text || json.choices?.[0]?.delta?.content || ""; } catch {}
        }
      }
      setMessages((current) => [...current, { role: "assistant", content: answer || "The model returned an empty response." }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally { setBusy(false); }
  }

  return <main className={`${theme === "light" ? "light" : ""} min-h-screen px-4 py-6 text-slate-100 sm:px-8`}>
    <header className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-400">Workers AI</p><h1 className="text-3xl font-semibold tracking-tight">AI Studio</h1><p className="mt-1 text-sm text-slate-400">Cloudflare Workers AI · $0.011 per 1,000 neurons</p></div>
      <div className="flex items-center gap-2"><button className="theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀ Light" : "☾ Dark"}</button><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 sm:block">Connected</span></div>
    </header>
    <section className="mx-auto grid max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/30 lg:grid-cols-[360px_1fr]">
      <aside className="border-b border-white/10 bg-slate-900/70 p-5 lg:border-b-0 lg:border-r">
        <div className="mb-6"><h2 className="font-semibold">Settings</h2><p className="mt-1 text-sm text-slate-400">Configure the model for this conversation.</p></div>
        <div className="mb-2 flex items-center justify-between"><label className="label mb-0">Model</label><button className="copy-button" onClick={() => navigator.clipboard.writeText(model)}>Copy model ID</button></div>
        <div className="relative"><button className="model-button" onClick={() => setModelOpen(!modelOpen)}><span className="truncate">{model}</span><span>⌄</span></button>{modelOpen && <div className="model-menu"><input autoFocus className="model-search" placeholder="Search models…" value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} />{Object.entries(groupedModels).map(([group, entries]) => { const visible = entries.filter((entry) => filteredModels.includes(entry)); return visible.length ? <div key={group}><div className="model-group">{group}</div>{visible.map((entry) => <button className={`model-option ${entry[1] === model ? "selected" : ""}`} key={entry[1]} onClick={() => { setModel(entry[1]); setModelOpen(false); setModelSearch(""); }}>{entry[1]}</button>)}</div> : null; })}</div>}</div>
        <div className="mt-3 rounded-xl border border-orange-400/20 bg-orange-400/5 p-3 text-xs text-orange-100"><div className="mb-2 font-semibold">{category} pricing</div><Pricing category={category} text={selected[2]} /></div>
        {isImage && <div className="mt-5 space-y-2"><label className="label">Image size · 9:16 default</label><div className="grid grid-cols-2 gap-2"><input className="control" type="number" value={imageSize.width} onChange={(e) => setImageSize({ ...imageSize, width: Number(e.target.value) })} /><input className="control" type="number" value={imageSize.height} onChange={(e) => setImageSize({ ...imageSize, height: Number(e.target.value) })} /></div></div>}
        {isAudio && <div className="mt-5 space-y-3"><label className="label">Nova 3 options</label><input className="control" type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0])} /><select className="control" value={audioOptions.language} onChange={(e) => setAudioOptions({ ...audioOptions, language: e.target.value })}><option value="en-US">English (US)</option><option value="multi">Automatic multilingual</option><option value="es">Spanish</option><option value="fr">French</option></select>{[["detect_language", "Detect language"], ["diarize", "Identify speakers"], ["punctuate", "Punctuation"], ["smart_format", "Smart formatting"]].map(([key, label]) => <label className="flex items-center gap-2 text-sm text-slate-300" key={key}><input type="checkbox" checked={audioOptions[key]} onChange={(e) => setAudioOptions({ ...audioOptions, [key]: e.target.checked })} />{label}</label>)}</div>}
        {!isSpecial && <div className="mt-5"><label className="label">System prompt</label><textarea className="control min-h-40 resize-y" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} /></div>}
        <button className="mt-5 text-xs text-slate-500 hover:text-orange-300" onClick={() => navigator.clipboard.writeText(model)}>Copy model ID</button>
      </aside>
      <div className="flex min-h-[680px] flex-col bg-slate-950/50"><div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.map((item, index) => <div key={index} className={`max-w-[85%] rounded-2xl border p-4 text-sm leading-6 ${item.role === "user" ? "ml-auto border-orange-400/20 bg-orange-400/10" : "border-white/10 bg-white/[0.04]"}`}>{item.image ? <img className="max-w-full rounded-xl" src={item.image} alt="Generated result" /> : <pre className="whitespace-pre-wrap font-sans">{item.content}</pre>}</div>)}{busy && <div className="text-sm text-slate-500">Working…</div>}</div><div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-orange-400/50"><textarea ref={inputRef} className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-600" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={isImage ? "Describe the image you want…" : isAudio ? "Add an audio file and describe it…" : "Message the model…"} /><button className="self-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={send}>Send</button></div></div></div>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
