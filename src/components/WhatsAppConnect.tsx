"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { configApi, embeddedSignupApi, organizationsApi } from "@/lib/api";

// Declare Facebook SDK types
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        params: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            setup: Record<string, unknown>;
            featureType: string;
            sessionInfoVersion: string;
          };
        }
      ) => void;
    };
  }
}

interface FacebookLoginResponse {
  authResponse?: {
    accessToken: string;
    code?: string;
  };
  status: string;
}

interface WhatsAppConnectProps {
  orgId: number;
  onSuccess: (data: {
    business_name?: string;
    business_phone?: string;
    webhook_url?: string;
    webhook_verify_token?: string;
  }) => void;
  onError: (error: string) => void;
}

export default function WhatsAppConnect({
  orgId,
  onSuccess,
  onError,
}: WhatsAppConnectProps) {
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFBLoaded, setIsFBLoaded] = useState(false);
  const [fbAppId, setFbAppId] = useState("");
  const [fbConfigId, setFbConfigId] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "connecting" | "syncing" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Manual entry form fields
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");

  // Load Facebook SDK config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configApi.getPublicConfig();
        setFbAppId(config.facebook_app_id);
        setFbConfigId(config.facebook_config_id);

        if (config.facebook_app_id && config.facebook_config_id) {
          loadFacebookSDK(config.facebook_app_id);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  const loadFacebookSDK = (appId: string) => {
    if (window.FB) {
      setIsFBLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      setIsFBLoaded(true);
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  };

  const sessionInfoListener = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.type === "WA_EMBEDDED_SIGNUP") {
          // Handle WhatsApp Business App coexistence onboarding
          if (data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
            const { waba_id } = data.data;
            if (waba_id) {
              setStatusMessage("WhatsApp Business App connected! Syncing data...");
              setStatus("syncing");
            }
          }
          // Handle regular embedded signup finish
          else if (data.event === "FINISH") {
            const { phone_number_id, waba_id } = data.data;
            if (phone_number_id && waba_id) {
              setStatusMessage("Completing setup...");
            }
          } else if (data.event === "CANCEL") {
            setStatus("idle");
            setIsLoading(false);
            onError("Setup was cancelled");
          } else if (data.event === "ERROR") {
            setStatus("error");
            setStatusMessage(data.data?.error_message || "An error occurred");
            setIsLoading(false);
            onError(data.data?.error_message || "An error occurred");
          }
        }
      } catch {
        // Not a JSON message, ignore
      }
    },
    [onError]
  );

  useEffect(() => {
    window.addEventListener("message", sessionInfoListener);
    return () => {
      window.removeEventListener("message", sessionInfoListener);
    };
  }, [sessionInfoListener]);

  const handleEmbeddedConnect = () => {
    if (!window.FB) {
      onError("Facebook SDK not loaded. Please refresh the page.");
      return;
    }

    if (!fbConfigId) {
      onError("WhatsApp Embedded Signup not configured.");
      return;
    }

    setIsLoading(true);
    setStatus("connecting");
    setStatusMessage("Opening WhatsApp Business connection...");

    // Use WhatsApp Business App Coexistence feature
    window.FB.login(
      async (response: FacebookLoginResponse) => {
        if (response.authResponse) {
          const fbAccessToken = response.authResponse.accessToken;
          setStatusMessage("Connecting your WhatsApp Business App...");

          try {
            const result = await embeddedSignupApi.exchangeToken(orgId, fbAccessToken);

            if (result.success) {
              setStatus("success");
              setStatusMessage("Connected successfully!");
              onSuccess({
                business_name: result.business_name,
                business_phone: result.business_phone,
                webhook_url: result.webhook_url,
                webhook_verify_token: result.webhook_verify_token,
              });
            } else {
              throw new Error(result.message || "Failed to connect");
            }
          } catch (err: any) {
            setStatus("error");
            const errorMsg = err.response?.data?.detail || err.message || "Connection failed";
            setStatusMessage(errorMsg);
            onError(errorMsg);
          }
        } else {
          setStatus("idle");
          setStatusMessage("");
          onError("Facebook login was cancelled or failed");
        }
        setIsLoading(false);
      },
      {
        config_id: fbConfigId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          // Enable WhatsApp Business App Coexistence
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumberId || !accessToken) {
      onError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setStatus("connecting");
    setStatusMessage("Connecting WhatsApp Business...");

    try {
      const result = await organizationsApi.connectWhatsApp(orgId, {
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        business_account_id: wabaId || undefined,
      });

      setStatus("success");
      setStatusMessage("Connected successfully!");
      onSuccess({
        webhook_url: result.webhook_url,
        webhook_verify_token: result.webhook_verify_token,
      });
    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.response?.data?.detail || err.message || "Connection failed";
      setStatusMessage(errorMsg);
      onError(errorMsg);
    }

    setIsLoading(false);
  };

  const hasEmbeddedSignup = fbAppId && fbConfigId;

  // Loading state
  if (configLoading) {
    return (
      <div className="text-center p-8">
        <Loader2 className="w-12 h-12 mx-auto text-whatsapp-green animate-spin mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="text-center p-8">
        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">WhatsApp Connected!</h3>
        <p className="text-gray-600">{statusMessage}</p>
      </div>
    );
  }

  // Syncing state (for coexistence)
  if (status === "syncing") {
    return (
      <div className="text-center p-8">
        <Loader2 className="w-16 h-16 mx-auto text-whatsapp-green animate-spin mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Syncing Your Data</h3>
        <p className="text-gray-600 mb-4">{statusMessage}</p>
        <p className="text-sm text-gray-500">
          Please keep your WhatsApp Business App open during this process.
        </p>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Connection Failed</h3>
        <p className="text-gray-600 mb-4">{statusMessage}</p>
        <button
          onClick={() => {
            setStatus("idle");
            setStatusMessage("");
            setShowManualFallback(false);
          }}
          className="px-6 py-2 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Manual fallback form
  if (showManualFallback || !hasEmbeddedSignup) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <h3 className="text-xl font-medium text-gray-900 mb-2 text-center">
          {hasEmbeddedSignup ? "Manual Configuration" : "Connect WhatsApp Business"}
        </h3>

        {!hasEmbeddedSignup && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Embedded Signup is not configured. Please enter your credentials manually, or contact your administrator to set up <code>FACEBOOK_APP_ID</code> and <code>FACEBOOK_CONFIG_ID</code>.
            </p>
          </div>
        )}

        <p className="text-gray-600 mb-6 text-center">
          Enter your WhatsApp Business API credentials from the{" "}
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-whatsapp-green hover:underline"
          >
            Meta Developer Portal
          </a>
          .
        </p>

        <form onSubmit={handleManualConnect} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g., 123456789012345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Found in WhatsApp → API Setup → Phone Number ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permanent Access Token <span className="text-red-500">*</span>
            </label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste your access token here..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent font-mono text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Generate a permanent token in Business Settings → System Users
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Business Account ID (optional)
            </label>
            <input
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="e.g., 123456789012345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-whatsapp-green" />
              <p className="text-gray-600">{statusMessage}</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3 bg-whatsapp-green text-white rounded-lg font-medium hover:bg-whatsapp-dark transition-colors"
            >
              Connect WhatsApp
            </button>
          )}
        </form>

        {hasEmbeddedSignup && (
          <button
            onClick={() => setShowManualFallback(false)}
            className="mt-6 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to quick connect
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">How to get these credentials:</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-whatsapp-green hover:underline">developers.facebook.com/apps</a></li>
            <li>Select your app → WhatsApp → API Setup</li>
            <li>Copy the <strong>Phone Number ID</strong></li>
            <li>For permanent token: Go to Business Settings → System Users → Generate Token</li>
          </ol>
        </div>
      </div>
    );
  }

  // Main view - Connect WhatsApp button (Embedded Signup)
  return (
    <div className="text-center p-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-whatsapp-green/10 flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-whatsapp-green" />
      </div>

      <h3 className="text-xl font-medium text-gray-900 mb-2">
        Connect WhatsApp Business
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Click the button below to connect your WhatsApp Business App.
        You&apos;ll be redirected to Facebook to complete the setup.
      </p>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-whatsapp-green" />
          <p className="text-gray-600">{statusMessage}</p>
        </div>
      ) : (
        <button
          onClick={handleEmbeddedConnect}
          disabled={!isFBLoaded}
          className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-medium transition-all ${
            isFBLoaded
              ? "bg-whatsapp-green text-white hover:bg-whatsapp-dark hover:shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Connect to WhatsApp
        </button>
      )}

      {!isFBLoaded && (
        <p className="mt-4 text-sm text-gray-500">Loading Facebook SDK...</p>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
        <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Click the button above and sign in with Facebook</li>
          <li>Select or create your WhatsApp Business Account</li>
          <li>Complete the verification process</li>
          <li>Your WhatsApp Business will be connected to this platform</li>
        </ol>
      </div>

      <button
        onClick={() => setShowManualFallback(true)}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        Having trouble? Enter credentials manually →
      </button>
    </div>
  );
}
