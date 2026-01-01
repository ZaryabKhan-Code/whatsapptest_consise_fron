"use client";

import { useEffect, useRef } from "react";
import { User, Check, CheckCheck } from "lucide-react";
import { useChatStore } from "@/store/chat";
import { format } from "date-fns";
import MessageInput from "./MessageInput";

export default function ChatWindow() {
  const { currentConversation, messages, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-700">
            WhatsApp Business
          </h2>
          <p className="text-gray-500 mt-2">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-4 h-4 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 bg-whatsapp-teal text-white flex items-center gap-3 shadow">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-medium">{currentConversation}</h2>
          <p className="text-sm text-white/70">Click to view contact info</p>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5ded8' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          backgroundColor: "#e5ddd5",
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-green"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 bg-white/80 px-4 py-2 rounded-lg inline-block">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.direction === "outbound" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                  message.direction === "outbound"
                    ? "bg-whatsapp-light rounded-tr-none"
                    : "bg-white rounded-tl-none"
                }`}
              >
                <p className="text-gray-800 break-words">
                  {message.content || "[Media message]"}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs text-gray-500">
                    {format(new Date(message.timestamp), "HH:mm")}
                  </span>
                  {message.direction === "outbound" && getStatusIcon(message.status)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput />
    </div>
  );
}
