import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./routes/index.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // Prevents refetching every time user switches or focuses windows!
      refetchOnReconnect: false,   // Prevents lag spikes on minor network reconnects
      staleTime: 10 * 60 * 1000,   // 10 minutes cache freshness: instant module toggling (0ms)!
      gcTime: 60 * 60 * 1000,      // 1 hour garbage collection: persists data across views
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;