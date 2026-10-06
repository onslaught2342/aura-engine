import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Preview from "./pages/Preview";
import Builder from "./pages/Builder";
import Remote from "./pages/Remote";
import NotFound from "./pages/NotFound";
import { CONFIG } from "@/engine/config";
import { builderStore } from "@/lib/builderStore";

const queryClient = new QueryClient();

type RouteFlag = "builderEnabled" | "previewPageEnabled" | "remoteEnabled";

const isRouteEnabled = (key: RouteFlag): boolean => {
  const live = builderStore.peek()?.controls as Record<string, unknown> | undefined;
  if (live && typeof live[key] === "boolean") return live[key] as boolean;
  return (CONFIG.controls as Record<string, unknown>)[key] !== false;
};

const Gated = ({ flag, children }: { flag: RouteFlag; children: React.ReactNode }) =>
  isRouteEnabled(flag) ? <>{children}</> : <NotFound />;


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/preview" element={<Gated flag="previewPageEnabled"><Preview /></Gated>} />
          <Route path="/builder" element={<Gated flag="builderEnabled"><Builder /></Gated>} />
          <Route path="/remote" element={<Gated flag="remoteEnabled"><Remote /></Gated>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
