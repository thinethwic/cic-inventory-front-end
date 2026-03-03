import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register to access CIC IT Asset System
          </p>
        </div>

        <div className="bg-white border rounded-2xl shadow-sm p-4">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            afterSignUpUrl="/"
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
