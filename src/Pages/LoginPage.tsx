import { SignIn } from "@/lib/auth";
import logo from "@/assets/Logo.png";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,214,186,0.32),_transparent_34%),linear-gradient(135deg,_#f7faf7_0%,_#edf5ee_45%,_#e5efe7_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-emerald-100 bg-white/90 shadow-[0_24px_80px_rgba(34,84,61,0.12)] backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,_#0d3b2e_0%,_#135642_55%,_#1d6e56_100%)] p-10 text-white md:flex md:flex-col md:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,214,102,0.18),_transparent_28%)]" />
            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium tracking-[0.18em] uppercase text-white/90">
                Asset Inventory
              </div>
              <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.03em]">
                Secure access for the CIC IT asset operations team.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
                Monitor assets, maintenance, transfers, and user activity from one internal platform built for your daily workflow.
              </p>
            </div>

            <div className="relative grid gap-4 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                Centralized inventory and lifecycle visibility
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                Role-based access for admin and operational teams
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                  <img
                    src={logo}
                    alt="CIC Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
                  Welcome Back
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                  Sign in to CIC IT Asset System
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Use your assigned email and password to continue. User accounts are created and managed by the system administrator.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-7">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
