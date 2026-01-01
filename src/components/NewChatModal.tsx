"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { useChatStore } from "@/store/chat";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
}

export default function NewChatModal({ isOpen, onClose, orgId }: NewChatModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const { sendMessage, setCurrentConversation, fetchConversations, setCurrentOrgId } = useChatStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    // Remove any non-numeric characters except +
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");

    setIsSending(true);
    setCurrentOrgId(orgId); // Ensure orgId is set before sending
    const success = await sendMessage(cleanedNumber, message.trim());

    if (success) {
      await fetchConversations(orgId);
      setCurrentConversation(orgId, cleanedNumber);
      setPhoneNumber("");
      setMessage("");
      onClose();
    } else {
      setError("Failed to send message. Please try again.");
    }
    setIsSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number (with country code)
            </label>
            <input
              type="text"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-whatsapp-green"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-whatsapp-green resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSending}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors ${
              isSending
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-whatsapp-green hover:bg-whatsapp-dark text-white"
            }`}
          >
            <Send className="w-5 h-5" />
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
