"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Bot, User, Loader2, Trash2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function CoachWidget() {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/coach");
      if (res.ok) setMessages(await res.json());
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Load messages when opened for the first time
  useEffect(() => {
    if (open && !loaded) fetchMessages();
  }, [open, loaded, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userMsg, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (res.ok) {
        const { reply } = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: `reply-${Date.now()}`, role: "assistant", content: reply, createdAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: t("Failed to reach coach.", "לא ניתן להתחבר למאמן."), createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch("/api/coach", { method: "DELETE" });
      setMessages([]);
    } catch (e) {
      console.error("Failed to clear:", e);
    }
  };

  const suggestions = [
    { en: "I don't feel like working", he: "אין לי חשק לעבוד" },
    { en: "What should I do next?", he: "מה עלי לעשות עכשיו?" },
    { en: "How's my day going?", he: "איך עובר עלי היום?" },
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t("AI Coach", "מאמן AI")}</p>
                <p className="text-[10px] text-muted-foreground">{t("Your accountability partner", "השותף שלך לאחריות")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearChat}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!loaded && (
              <div className="text-center text-muted-foreground text-sm py-8">{t("Loading...", "טוען...")}</div>
            )}

            {loaded && messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-10 w-10 mx-auto mb-3 text-primary/50" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t("How can I help you stay on track?", "איך אני יכול לעזור לך להישאר במסלול?")}
                </p>
                <div className="flex flex-col gap-2 items-center">
                  {suggestions.map((s) => (
                    <button
                      key={s.en}
                      className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      onClick={() => setInput(t(s.en, s.he))}
                    >
                      {t(s.en, s.he)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/50 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center mt-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-3.5 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={t("Talk to your coach...", "דבר עם המאמן שלך...")}
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!input.trim() || sending} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
