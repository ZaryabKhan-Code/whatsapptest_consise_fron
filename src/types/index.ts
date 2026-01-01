// ============ Auth Types ============

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
}

// ============ Organization Types ============

export interface Organization {
  id: number;
  name: string;
  slug: string;
  is_connected: boolean;
  connection_status: string;
  business_name: string | null;
  business_phone: string | null;
  connected_at: string | null;
  created_at: string;
}

export interface OrganizationDetail extends Organization {
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
}

export interface OrganizationMember {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
}

export interface WhatsAppCredentials {
  phone_number_id: string;
  business_account_id?: string;
  access_token: string;
  webhook_verify_token?: string;
}

export interface WebhookInfo {
  webhook_url: string;
  verify_token: string;
  instructions: string;
}

// ============ Message Types ============

export interface Message {
  id: string;
  wa_message_id: string | null;
  from_number: string;
  to_number: string;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  direction: "inbound" | "outbound";
  timestamp: string;
}

export interface Contact {
  id: number;
  phone_number: string;
  name: string | null;
  profile_name: string | null;
  is_business: boolean;
  created_at: string;
}

export interface SendMessageResponse {
  success: boolean;
  message_id: string | null;
  wa_message_id: string | null;
  error: string | null;
}

export interface Conversation {
  phone_number: string;
  name: string | null;
  profile_name: string | null;
  last_message: Message | null;
  unread_count: number;
}
