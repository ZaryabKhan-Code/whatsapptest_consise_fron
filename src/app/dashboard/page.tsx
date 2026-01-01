"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  MessageCircle,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    organizations,
    isAuthenticated,
    isLoading,
    logout,
    loadUser,
    createOrganization,
  } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreating(true);
    const org = await createOrganization(newOrgName.trim());
    if (org) {
      setNewOrgName("");
      setShowCreateModal(false);
      router.push(`/dashboard/${org.id}`);
    }
    setIsCreating(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-whatsapp-teal text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8" />
            <h1 className="text-xl font-semibold">WhatsApp Business Platform</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/80">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Organizations</h2>
            <p className="text-gray-600 mt-1">
              Manage your WhatsApp Business accounts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Organization
          </button>
        </div>

        {/* Organizations Grid */}
        {organizations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No organizations yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first organization to start using WhatsApp Business
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Organization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                onClick={() => router.push(`/dashboard/${org.id}`)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-whatsapp-green/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-whatsapp-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-500">{org.slug}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {org.is_connected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">WhatsApp Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Not Connected</span>
                      </>
                    )}
                  </div>

                  {org.business_name && (
                    <p className="text-sm text-gray-600">
                      Business: {org.business_name}
                    </p>
                  )}

                  {org.business_phone && (
                    <p className="text-sm text-gray-600">
                      Phone: {org.business_phone}
                    </p>
                  )}

                  <p className="text-xs text-gray-400">
                    Created {format(new Date(org.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Create Organization</h3>
            <form onSubmit={handleCreateOrg}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Business"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newOrgName.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isCreating || !newOrgName.trim()
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-whatsapp-green hover:bg-whatsapp-dark text-white"
                  }`}
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
