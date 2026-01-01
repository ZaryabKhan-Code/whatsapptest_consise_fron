import axios from "axios";
import type {
  User,
  Organization,
  OrganizationDetail,
  OrganizationMember,
  WhatsAppCredentials,
  WebhookInfo,
  Message,
  Contact,
  SendMessageResponse,
  Conversation,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add user ID to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      config.headers["X-User-ID"] = userId;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_id");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============ Config API ============

export const configApi = {
  getPublicConfig: async (): Promise<{
    facebook_app_id: string;
    facebook_config_id: string;
  }> => {
    const response = await api.get("/config");
    return response.data;
  },
};

// ============ Auth Types ============

export interface AuthResponse {
  user: User;
}

// ============ Auth API ============

export const authApi = {
  register: async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/login/json", {
      email,
      password,
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

// ============ Organizations API ============

export const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await api.get("/organizations");
    return response.data;
  },

  create: async (name: string): Promise<Organization> => {
    const response = await api.post("/organizations", { name });
    return response.data;
  },

  get: async (orgId: number): Promise<OrganizationDetail> => {
    const response = await api.get(`/organizations/${orgId}`);
    return response.data;
  },

  update: async (orgId: number, name: string): Promise<Organization> => {
    const response = await api.put(`/organizations/${orgId}`, { name });
    return response.data;
  },

  delete: async (orgId: number): Promise<void> => {
    await api.delete(`/organizations/${orgId}`);
  },

  // WhatsApp Connection (manual method - kept for fallback)
  connectWhatsApp: async (
    orgId: number,
    credentials: WhatsAppCredentials
  ): Promise<OrganizationDetail> => {
    const response = await api.post(`/organizations/${orgId}/connect-whatsapp`, credentials);
    return response.data;
  },

  disconnectWhatsApp: async (orgId: number): Promise<Organization> => {
    const response = await api.post(`/organizations/${orgId}/disconnect-whatsapp`);
    return response.data;
  },

  getWebhookUrl: async (orgId: number): Promise<WebhookInfo> => {
    const response = await api.get(`/organizations/${orgId}/webhook-url`);
    return response.data;
  },

  // WhatsApp Business App Coexistence
  requestContactSync: async (orgId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/organizations/${orgId}/sync/contacts`);
    return response.data;
  },

  requestHistorySync: async (
    orgId: number,
    phoneNumber: string,
    count = 100
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/organizations/${orgId}/sync/history`, null, {
      params: { phone_number: phoneNumber, count },
    });
    return response.data;
  },

  getCoexistenceStatus: async (orgId: number): Promise<{
    is_connected: boolean;
    connection_status: string;
    is_smb_app_registered: boolean;
    display_phone_number?: string;
    verified_name?: string;
  }> => {
    const response = await api.get(`/organizations/${orgId}/coexistence-status`);
    return response.data;
  },

  // Members
  listMembers: async (orgId: number): Promise<OrganizationMember[]> => {
    const response = await api.get(`/organizations/${orgId}/members`);
    return response.data;
  },

  inviteMember: async (
    orgId: number,
    email: string,
    role: string
  ): Promise<OrganizationMember> => {
    const response = await api.post(`/organizations/${orgId}/members`, { email, role });
    return response.data;
  },

  removeMember: async (orgId: number, userId: number): Promise<void> => {
    await api.delete(`/organizations/${orgId}/members/${userId}`);
  },
};

// ============ Embedded Signup API ============

export interface EmbeddedSignupResponse {
  success: boolean;
  message: string;
  business_name?: string;
  business_phone?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
}

export const embeddedSignupApi = {
  // Exchange the access token from Facebook SDK
  exchangeToken: async (
    orgId: number,
    accessToken: string
  ): Promise<EmbeddedSignupResponse> => {
    const response = await api.post(`/embedded-signup/${orgId}/exchange-token`, {
      access_token: accessToken,
    });
    return response.data;
  },

  // Complete signup with full data from Facebook SDK
  completeSignup: async (
    orgId: number,
    data: {
      phone_number_id: string;
      waba_id: string;
      access_token: string;
    }
  ): Promise<EmbeddedSignupResponse> => {
    const response = await api.post(`/embedded-signup/${orgId}/complete-signup`, data);
    return response.data;
  },
};

// ============ Messages API ============

export const messagesApi = {
  getAll: async (
    orgId: number,
    params?: {
      phone_number?: string;
      direction?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Message[]> => {
    const response = await api.get(`/organizations/${orgId}/messages`, { params });
    return response.data;
  },

  getConversations: async (orgId: number, limit = 50): Promise<Conversation[]> => {
    const response = await api.get(`/organizations/${orgId}/messages/conversations`, {
      params: { limit },
    });
    return response.data;
  },

  getConversation: async (
    orgId: number,
    phoneNumber: string,
    params?: { limit?: number; offset?: number }
  ): Promise<Message[]> => {
    const response = await api.get(
      `/organizations/${orgId}/messages/conversation/${phoneNumber}`,
      { params }
    );
    return response.data;
  },

  getById: async (orgId: number, messageId: string): Promise<Message> => {
    const response = await api.get(`/organizations/${orgId}/messages/${messageId}`);
    return response.data;
  },

  sendText: async (
    orgId: number,
    to: string,
    message: string,
    previewUrl = false
  ): Promise<SendMessageResponse> => {
    const response = await api.post(`/organizations/${orgId}/messages/send/text`, {
      to,
      message,
      preview_url: previewUrl,
    });
    return response.data;
  },

  sendTemplate: async (
    orgId: number,
    to: string,
    templateName: string,
    languageCode = "en_US",
    components?: object[]
  ): Promise<SendMessageResponse> => {
    const response = await api.post(`/organizations/${orgId}/messages/send/template`, {
      to,
      template_name: templateName,
      language_code: languageCode,
      components,
    });
    return response.data;
  },

  sendMedia: async (
    orgId: number,
    to: string,
    mediaType: string,
    mediaUrl?: string,
    mediaId?: string,
    caption?: string
  ): Promise<SendMessageResponse> => {
    const response = await api.post(`/organizations/${orgId}/messages/send/media`, {
      to,
      media_type: mediaType,
      media_url: mediaUrl,
      media_id: mediaId,
      caption,
    });
    return response.data;
  },

  getContacts: async (
    orgId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<Contact[]> => {
    const response = await api.get(`/organizations/${orgId}/messages/contacts/list`, {
      params,
    });
    return response.data;
  },
};

export default api;
