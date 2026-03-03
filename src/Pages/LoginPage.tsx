import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            CIC IT Asset System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to manage company IT assets
          </p>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm p-4">
          <SignIn
            routing="path"
            path="/login"
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
