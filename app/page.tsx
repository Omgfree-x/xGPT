"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () =>
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);

  async function send() {
    if (!input.trim() || loading) return;

    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    scrollBottom();

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: newMsgs }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value);
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last.role === "assistant") last.content = assistantText;
        return [...m];
      });
      scrollBottom();
    }

    setLoading(false);
  }

  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-3 hidden md:flex flex-col">
        <button
          onClick={() => setMessages([])}
          className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-2 text-sm"
        >
          + New chat
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`msg-animate flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-zinc-200 text-black"
                    : "bg-zinc-900 border border-zinc-800"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">
                  {m.content}
                </pre>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message xGPT..."
              className="flex-1 bg-transparent outline-none resize-none text-sm"
            />
            <button
              onClick={send}
              disabled={loading}
              className="bg-zinc-200 text-black px-4 rounded-xl"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
