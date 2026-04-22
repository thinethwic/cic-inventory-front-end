import { SignIn } from "@clerk/clerk-react";
import logo from "@/assets/Logo.png";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border bg-card p-2 shadow-sm">
            <img src={logo} alt="CIC Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            CIC IT Asset System
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage company IT assets
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-xl shadow-slate-950/5">
          <SignIn
            routing="virtual"
            signUpUrl="/signup"
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
  );
}
