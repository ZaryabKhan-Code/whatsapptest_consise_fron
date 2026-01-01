import { create } from "zustand";
import type { Message, Contact, Conversation } from "@/types";
import { messagesApi } from "@/lib/api";

interface ChatState {
  conversations: Conversation[];
  currentConversation: string | null;
  currentOrgId: number | null;
  messages: Message[];
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConversations: (orgId: number) => Promise<void>;
  fetchMessages: (orgId: number, phoneNumber: string) => Promise<void>;
  fetchContacts: (orgId: number) => Promise<void>;
  setCurrentConversation: (orgId: number, phoneNumber: string | null) => void;
  setCurrentOrgId: (orgId: number) => void;
  sendMessage: (to: string, message: string) => Promise<boolean>;
  addMessage: (message: Message) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  currentOrgId: null,
  messages: [],
  contacts: [],
  isLoading: false,
  error: null,

  fetchConversations: async (orgId: number) => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await messagesApi.getConversations(orgId);
      set({
        conversations,
        isLoading: false,
      });
    } catch (error) {
      set({ error: "Failed to fetch conversations", isLoading: false });
    }
  },

  fetchMessages: async (orgId: number, phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await messagesApi.getConversation(orgId, phoneNumber);
      set({ messages: messages.reverse(), isLoading: false });
    } catch (error) {
      set({ error: "Failed to fetch messages", isLoading: false });
    }
  },

  fetchContacts: async (orgId: number) => {
    try {
      const contacts = await messagesApi.getContacts(orgId);
      set({ contacts });
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  },

  setCurrentConversation: (orgId: number, phoneNumber: string | null) => {
    set({ currentConversation: phoneNumber, currentOrgId: orgId });
    if (phoneNumber) {
      get().fetchMessages(orgId, phoneNumber);
    }
  },

  setCurrentOrgId: (orgId: number) => {
    set({ currentOrgId: orgId });
  },

  sendMessage: async (to: string, message: string) => {
    const orgId = get().currentOrgId;
    if (!orgId) {
      console.error("No organization selected");
      return false;
    }
    try {
      const response = await messagesApi.sendText(orgId, to, message);
      if (response.success) {
        const newMessage: Message = {
          id: response.message_id || "",
          wa_message_id: response.wa_message_id,
          from_number: "business",
          to_number: to,
          message_type: "text",
          content: message,
          media_url: null,
          status: "sent",
          direction: "outbound",
          timestamp: new Date().toISOString(),
        };
        get().addMessage(newMessage);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to send message:", error);
      return false;
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  reset: () => {
    set({
      conversations: [],
      currentConversation: null,
      currentOrgId: null,
      messages: [],
      contacts: [],
      isLoading: false,
      error: null,
    });
  },
}));
