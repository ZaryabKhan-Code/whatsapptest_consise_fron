"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  Settings,
  Unlink,
  Copy,
  Check,
  AlertCircle,
  Plus,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { organizationsApi } from "@/lib/api";
import WhatsAppConnect from "@/components/WhatsAppConnect";
import type { OrganizationDetail, WebhookInfo } from "@/types";
import { format } from "date-fns";

export default function OrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = parseInt(params.orgId as string);

  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading: chatLoading,
    fetchConversations,
    setCurrentConversation,
    setCurrentOrgId,
    sendMessage,
    reset: resetChat,
  } = useChatStore();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // New message
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && orgId) {
      fetchOrganization();
    }
  }, [isAuthenticated, orgId]);

  useEffect(() => {
    if (org?.is_connected) {
      setCurrentOrgId(orgId);
      fetchConversations(orgId);
    }
  }, [org?.is_connected, orgId, fetchConversations, setCurrentOrgId]);

  const fetchOrganization = async () => {
    try {
      const data = await organizationsApi.get(orgId);
      setOrg(data);

      if (data.is_connected) {
        const webhook = await organizationsApi.getWebhookUrl(orgId);
        setWebhookInfo(webhook);
      }
    } catch (err) {
      setError("Failed to load organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSuccess = async (data: {
    business_name?: string;
    business_phone?: string;
    webhook_url?: string;
    webhook_verify_token?: string;
  }) => {
    // Refresh organization data
    await fetchOrganization();
    setShowConnectModal(false);
  };

  const handleConnectError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;

    try {
      const updated = await organizationsApi.disconnectWhatsApp(orgId);
      setOrg({ ...org!, ...updated, is_connected: false });
      setWebhookInfo(null);
      resetChat();
    } catch (err) {
      setError("Failed to disconnect");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    await sendMessage(currentConversation, messageInput.trim());
    setMessageInput("");
    setIsSending(false);
  };

  const handleNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim() || !newChatMessage.trim()) return;

    setIsSending(true);
    setCurrentOrgId(orgId); // Ensure orgId is set before sending
    const success = await sendMessage(newChatPhone.trim(), newChatMessage.trim());
    if (success) {
      setShowNewChat(false);
      setNewChatPhone("");
      setNewChatMessage("");
      fetchConversations(orgId);
      setCurrentConversation(orgId, newChatPhone.trim());
    }
    setIsSending(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-green"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">{error || "Organization not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-whatsapp-green hover:underline"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-whatsapp-teal text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">{org.name}</h1>
            <p className="text-sm text-white/70">
              {org.is_connected ? `Connected: ${org.business_phone}` : "Not connected"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b p-4">
          <h3 className="font-medium mb-4">WhatsApp Connection</h3>

          {org.is_connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Connected</span>
                </div>
                <p className="text-sm text-green-600">
                  Phone: {org.business_phone} | Business: {org.business_name}
                </p>
              </div>

              {webhookInfo && (
                <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Webhook URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded flex-1 overflow-hidden">
                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/api${webhookInfo.webhook_url}`}
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/api${webhookInfo.webhook_url}`)}
                        className="p-2 hover:bg-gray-200 rounded"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Verify Token:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded flex-1 overflow-hidden">
                        {webhookInfo.verify_token}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookInfo.verify_token)}
                        className="p-2 hover:bg-gray-200 rounded"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Configure these in your Meta Developer Portal webhook settings
                  </p>
                </div>
              )}

              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Unlink className="w-4 h-4" />
                Disconnect WhatsApp
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark"
            >
              <MessageCircle className="w-4 h-4" />
              Connect WhatsApp
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {org.is_connected ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 bg-white border-r flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-medium">Conversations</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchConversations(orgId)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <RefreshCw className={`w-4 h-4 ${chatLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="p-2 hover:bg-gray-100 rounded text-whatsapp-green"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.phone_number}
                    onClick={() => setCurrentConversation(orgId, conv.phone_number)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      currentConversation === conv.phone_number ? "bg-gray-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.profile_name || conv.phone_number}
                        </p>
                        {conv.last_message && (
                          <p className="text-sm text-gray-500 truncate">
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-whatsapp-teal text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{currentConversation}</span>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  style={{ backgroundColor: "#e5ddd5" }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                          msg.direction === "outbound"
                            ? "bg-[#dcf8c6]"
                            : "bg-white"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs text-gray-500 text-right mt-1">
                          {format(new Date(msg.timestamp), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 bg-gray-100 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 rounded-full border focus:outline-none focus:border-whatsapp-green"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSending}
                      className="px-4 py-2 bg-whatsapp-green text-white rounded-full disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <WhatsAppConnect
            orgId={orgId}
            onSuccess={handleConnectSuccess}
            onError={handleConnectError}
          />
        </div>
      )}

      {/* Connect Modal (for when clicking from settings) */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Connect WhatsApp Business</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <WhatsAppConnect
              orgId={orgId}
              onSuccess={handleConnectSuccess}
              onError={handleConnectError}
            />
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">New Conversation</h3>

            <form onSubmit={handleNewChat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (with country code)
                </label>
                <input
                  type="text"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-whatsapp-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-whatsapp-green resize-none"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 px-4 py-2 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
