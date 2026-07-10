import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMessages, useCreateMessage, useGetMe,
  getListMessagesQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useListMessages({
    query: { queryKey: getListMessagesQueryKey(), refetchInterval: 5_000 },
  });

  const createMessage = useCreateMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        setContent("");
      },
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    createMessage.mutate({ data: { content: trimmed } });
  }

  const myName = me?.role === "owner" ? "Owner" : me?.employeeName;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="text-primary" size={20} />
        <h1 className="text-lg font-bold text-foreground">Farm Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3 mb-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Say hello to your farm team.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderName === myName;
            return (
              <div
                key={m.id}
                data-testid={`message-${m.id}`}
                className={`flex flex-col max-w-[80%] ${isMine ? "ml-auto items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold text-foreground">{m.senderName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          data-testid="input-chat-message"
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!content.trim() || createMessage.isPending} data-testid="button-send-message">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
