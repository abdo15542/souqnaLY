import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { getSupportMessage, isSupportButtonVisible, LOCAL_SUPPORT_VISIBILITY_KEY, SUPPORT_VISIBILITY_EVENT } from "./lib/customerSupport";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_BASE_URL?.trim()
        ? `${import.meta.env.VITE_API_BASE_URL.trim().replace(/\\/$/, "")}/api/trpc`
        : "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

function CustomerSupportLink() {
  const [visible, setVisible] = useState(() => isSupportButtonVisible(localStorage.getItem(LOCAL_SUPPORT_VISIBILITY_KEY)));
  const [role, setRole] = useState<"owner" | "user" | null>(() => {
    try { const raw = JSON.parse(localStorage.getItem("souqna-local-access-profile-v1") || "null"); return raw?.role === "owner" || raw?.role === "user" ? raw.role : null; } catch { return null; }
  });

  useEffect(() => {
    const refresh = () => {
      setVisible(isSupportButtonVisible(localStorage.getItem(LOCAL_SUPPORT_VISIBILITY_KEY)));
      try { const raw = JSON.parse(localStorage.getItem("souqna-local-access-profile-v1") || "null"); setRole(raw?.role === "owner" || raw?.role === "user" ? raw.role : null); } catch { setRole(null); }
    };
    window.addEventListener(SUPPORT_VISIBILITY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(SUPPORT_VISIBILITY_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, []);

  if (!visible) return null;
  const href = `https://wa.me/218917514589?text=${encodeURIComponent(getSupportMessage(role))}`;
  return <a className="official-support-fab" href={href} target="_blank" rel="noreferrer" aria-label="التواصل مع خدمة عملاء سوقنا عبر واتساب"><span className="official-support-fab__mark" aria-hidden="true">W</span><strong>{role === "owner" ? "دعم المالك" : "تواصل معنا"}</strong></a>;
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <CustomerSupportLink />
    </QueryClientProvider>
  </trpc.Provider>
);
