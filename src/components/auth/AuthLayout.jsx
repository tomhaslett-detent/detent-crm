// Full-screen card shared by the auth pages; it sets its own color tokens so it stays readable under any theme.
export function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-[#0E1B2A]">
            <img src="/brand/wordmark-colour.svg" alt="Detent" className="h-8 w-auto" />
            <span className="text-base font-semibold">CRM</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
