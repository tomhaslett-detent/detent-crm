export const base44 = {
  auth: {
    hasToken: () => typeof window !== "undefined",
    async me() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) throw Object.assign(new Error("Could not load your session"), { status: response.status });
      return response.json();
    },
    async logout(returnTo) {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) window.location.assign(returnTo);
      else window.location.reload();
    },
    redirectToLogin(returnTo) {
      window.location.assign("/login?returnTo=" + encodeURIComponent(returnTo));
    },
  },
};
