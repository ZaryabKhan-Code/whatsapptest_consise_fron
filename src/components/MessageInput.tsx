"use client";

import { useState } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { useChatStore } from "@/store/chat";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { currentConversation, sendMessage } = useChatStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    const success = await sendMessage(currentConversation, message.trim());
    if (success) {
      setMessage("");
    }
    setIsSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-100 border-t">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Smile className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Paperclip className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full bg-white border border-gray-200 focus:outline-none focus:border-whatsapp-green"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!message.trim() || isSending}
          className={`p-3 rounded-full transition-colors ${
            message.trim() && !isSending
              ? "bg-whatsapp-green text-white hover:bg-whatsapp-dark"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
