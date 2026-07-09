import { SignIn } from "@/lib/auth";
import logo from "@/assets/Logo.png";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(168,214,186,0.35),transparent_38%),linear-gradient(160deg,#f7faf7_0%,#edf5ee_50%,#e2ede4_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-white p-3 shadow-[0_8px_24px_rgba(34,84,61,0.10)]">
            <img src={logo} alt="CIC Logo" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
            CIC IT Asset System
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
            Sign in with your assigned email and password to continue.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
          <SignIn
            routing="virtual"
            afterSignInUrl="/"
            appearance={{
              elements: {
                card: "shadow-none border-0",
              },
            }}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are created and managed by your system administrator.
        </p>
      </div>
    </div>
  );
}
