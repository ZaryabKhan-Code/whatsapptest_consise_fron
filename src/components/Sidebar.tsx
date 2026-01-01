"use client";

import { useEffect } from "react";
import { MessageCircle, User, Settings, RefreshCw } from "lucide-react";
import { useChatStore } from "@/store/chat";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  orgId: number;
}

export default function Sidebar({ orgId }: SidebarProps) {
  const {
    conversations,
    currentConversation,
    isLoading,
    fetchConversations,
    setCurrentConversation,
  } = useChatStore();

  useEffect(() => {
    if (orgId) {
      fetchConversations(orgId);
    }
  }, [orgId, fetchConversations]);

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-whatsapp-teal text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          <h1 className="font-semibold text-lg">WhatsApp Business</h1>
        </div>
        <button
          onClick={() => fetchConversations(orgId)}
          className="p-2 hover:bg-whatsapp-dark rounded-full transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 bg-gray-50">
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full px-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:border-whatsapp-green"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start a new conversation</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.phone_number}
              onClick={() => setCurrentConversation(orgId, conversation.phone_number)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                currentConversation === conversation.phone_number
                  ? "bg-gray-100"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.name || conversation.phone_number}
                    </h3>
                    {conversation.last_message && (
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(
                          new Date(conversation.last_message.timestamp),
                          { addSuffix: true }
                        )}
                      </span>
                    )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conversation.last_message.direction === "outbound" && (
                        <span className="text-whatsapp-dark">You: </span>
                      )}
                      {conversation.last_message.content || "[Media]"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
