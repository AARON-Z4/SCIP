import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Index from "./pages/Index";
import SubmitComplaint from "./pages/SubmitComplaint";
import AIAnalysis from "./pages/AIAnalysis";
import DuplicateDetected from "./pages/DuplicateDetected";
import ComplaintRegistered from "./pages/ComplaintRegistered";
import TrackComplaint from "./pages/TrackComplaint";
import AdminDashboard from "./pages/AdminDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main layout with NavBar + Footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/submit" element={<SubmitComplaint />} />
            <Route path="/duplicate" element={<DuplicateDetected />} />
            <Route path="/registered" element={<ComplaintRegistered />} />
            <Route path="/track" element={<TrackComplaint />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Full-screen routes (no layout) */}
          <Route path="/analysis" element={<AIAnalysis />} />
          <Route path="/admin" element={<AdminDashboard />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
