// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 30,       // data stays fresh for 30 s
            gcTime: 1000 * 60 * 5,      // cache kept for 5 min
            retry: 1,                   // one automatic retry on failure
            refetchOnWindowFocus: false, // don't refetch just from alt-tab
        },
        mutations: {
            retry: 0,
        },
    },
});