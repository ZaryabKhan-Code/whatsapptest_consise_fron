import { create } from "zustand";
import type { User, Organization } from "@/types";
import { authApi, organizationsApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName?: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  createOrganization: (name: string) => Promise<Organization | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organizations: [],
  currentOrganization: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(email, password);

      // Store user ID for subsequent requests
      localStorage.setItem("user_id", String(response.user.id));
      localStorage.setItem("user", JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch organizations after login
      await get().fetchOrganizations();
      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || "Login failed",
        isLoading: false,
      });
      return false;
    }
  },

  register: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(email, password, fullName);

      // Store user ID for subsequent requests
      localStorage.setItem("user_id", String(response.user.id));
      localStorage.setItem("user", JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        organizations: [], // New user has no organizations
      });

      return true;
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || "Registration failed",
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("user");
    set({
      user: null,
      organizations: [],
      currentOrganization: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadUser: async () => {
    // If already authenticated, just ensure organizations are loaded
    if (get().isAuthenticated && get().user) {
      set({ isLoading: false });
      if (get().organizations.length === 0) {
        await get().fetchOrganizations();
      }
      return;
    }

    const userId = localStorage.getItem("user_id");
    const userStr = localStorage.getItem("user");

    if (!userId) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      // Try to load user from localStorage first
      if (userStr) {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true });
      }

      // Verify user still exists
      const user = await authApi.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });

      // Fetch organizations
      await get().fetchOrganizations();
    } catch (error) {
      localStorage.removeItem("user_id");
      localStorage.removeItem("user");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  fetchOrganizations: async () => {
    try {
      const organizations = await organizationsApi.list();
      set({ organizations });

      // Auto-select first organization if none selected
      if (organizations.length > 0 && !get().currentOrganization) {
        set({ currentOrganization: organizations[0] });
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  },

  setCurrentOrganization: (org: Organization | null) => {
    set({ currentOrganization: org });
  },

  createOrganization: async (name: string) => {
    try {
      const org = await organizationsApi.create(name);
      set((state) => ({
        organizations: [...state.organizations, org],
        currentOrganization: org,
      }));
      return org;
    } catch (error) {
      console.error("Failed to create organization:", error);
      return null;
    }
  },
}));
