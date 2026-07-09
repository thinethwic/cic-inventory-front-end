import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const STORAGE_KEY = "cic-inventory";

type BackendUser = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  location: string;
  department: string;
  role: string;
  roles: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: BackendUser;
};

type StoredSession = AuthPayload;

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: {
    role: string;
    roles: string[];
    location: string;
    departmentName: string;
  };
};

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: (_opts?: { template?: string }) => Promise<string | null>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function mapUser(user: BackendUser): AuthUser {
  return {
    id: String(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    primaryEmailAddress: { emailAddress: user.email },
    publicMetadata: {
      role: user.role,
      roles: user.roles ?? [user.role],
      location: user.location,
      departmentName: user.department,
    },
  };
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPersistedAuthSession() {
  writeStoredSession(null);
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now() + 5_000;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `Request failed with status ${response.status}`;
    if (text) {
      try {
        const json = JSON.parse(text) as { message?: string; error?: string };
        message = json.message || json.error || text;
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function AuthProvider({
  children,
}: React.PropsWithChildren<{
  publishableKey?: string;
  afterSignOutUrl?: string;
  signInForceRedirectUrl?: string;
  signUpForceRedirectUrl?: string;
  appearance?: unknown;
}>) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [session, setSession] = React.useState<StoredSession | null>(null);
  const refreshPromiseRef = React.useRef<Promise<string | null> | null>(null);

  const clearSession = React.useCallback(() => {
    setSession(null);
    writeStoredSession(null);
  }, []);

  const persistSession = React.useCallback((payload: AuthPayload) => {
    setSession(payload);
    writeStoredSession(payload);
  }, []);

  const refreshAccessToken = React.useCallback(async (): Promise<
    string | null
  > => {
    const current = readStoredSession();
    if (!current?.refreshToken) {
      clearSession();
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });

    const payload = await parseResponse<AuthPayload>(response);
    persistSession(payload);
    return payload.accessToken;
  }, [clearSession, persistSession]);

  const getValidAccessToken = React.useCallback(async (): Promise<
    string | null
  > => {
    const current = readStoredSession();
    if (!current) return null;

    if (!isExpired(current.accessTokenExpiresAt)) {
      return current.accessToken;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refreshAccessToken()
        .catch(() => {
          clearSession();
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, [clearSession, refreshAccessToken]);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const current = readStoredSession();
      if (!current) {
        if (!cancelled) setIsLoaded(true);
        return;
      }

      try {
        const token = await getValidAccessToken();
        if (!token) {
          throw new Error("Session expired");
        }

        const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const user = await parseResponse<BackendUser>(meResponse);
        if (!cancelled) {
          const nextSession = {
            ...(readStoredSession() ?? current),
            user,
          };
          setSession(nextSession);
          writeStoredSession(nextSession);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, getValidAccessToken, persistSession]);

  const signInWithPassword = React.useCallback(
    async (email: string, password: string) => {
      clearSession();

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const payload = await parseResponse<AuthPayload>(response);
        persistSession(payload);
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession, persistSession],
  );

  const signOut = React.useCallback(async () => {
    const current = readStoredSession();
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(current?.accessToken
            ? { Authorization: `Bearer ${current.accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          refreshToken: current?.refreshToken ?? null,
        }),
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const user = session?.user ? mapUser(session.user) : null;

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isLoaded,
      isSignedIn: !!user,
      user,
      signInWithPassword,
      signOut,
      getToken: async () => getValidAccessToken(),
    }),
    [getValidAccessToken, isLoaded, signInWithPassword, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext() {
  const value = React.useContext(AuthContext);
  if (!value) {
    throw new Error("Auth context is not available");
  }
  return value;
}

export function useAuth() {
  const context = useAuthContext();
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    getToken: context.getToken,
    signOut: context.signOut,
  };
}

export function useUser() {
  const context = useAuthContext();
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user,
  };
}

export function SignIn({
  afterSignInUrl = "/",
}: {
  routing?: string;
  afterSignInUrl?: string;
  appearance?: unknown;
}) {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuthContext();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
      navigate(afterSignInUrl, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-10 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={submitting}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <Button type="submit" className="h-10 w-full" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

import { Eye, EyeOff, LogOut } from "lucide-react";

export function UserButton({
  afterSignOutUrl = "/login",
  appearance,
}: {
  afterSignOutUrl?: string;
  appearance?: { elements?: { avatarBox?: string } };
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "U";

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className={appearance?.elements?.avatarBox}>
            <AvatarFallback className="select-none">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User identity header */}
        {user && (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs select-none">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                {fullName && (
                  <span className="truncate text-sm font-medium leading-none">
                    {fullName}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Sign out */}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive gap-2 cursor-pointer"
          onClick={() => {
            void signOut().finally(() =>
              navigate(afterSignOutUrl, { replace: true }),
            );
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
