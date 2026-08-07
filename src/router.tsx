import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,  // treat data as fresh for 30s globally
        gcTime: 5 * 60_000, // keep unused cache for 5 min
        retry: 1,           // only retry once on failure
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
  });

  return router;
};

