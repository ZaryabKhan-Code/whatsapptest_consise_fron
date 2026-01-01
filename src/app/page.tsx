"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-whatsapp-teal to-whatsapp-dark">
      <div className="text-center text-white">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-6">
          <MessageCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2">WhatsApp Business Platform</h1>
        <p className="text-white/70 mb-8">Loading...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  );
}
