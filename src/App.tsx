import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewAssignment from "./pages/NewAssignment.tsx";
import AssignmentEditor from "./pages/AssignmentEditor.tsx";
import AdminDashboardPage from "./pages/AdminDashboard.tsx";
import AdminStudents from "./pages/AdminStudents.tsx";
import AssignmentsLibrary from "./pages/AssignmentsLibrary.tsx";
import Settings from "./pages/Settings.tsx";
import Plans from "./pages/Plans.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import AffiliateApply from "./pages/AffiliateApply.tsx";
import AffiliateDashboard from "./pages/AffiliateDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/legal/Privacy.tsx";
import Terms from "./pages/legal/Terms.tsx";
import Refund from "./pages/legal/Refund.tsx";
import Cookies from "./pages/legal/Cookies.tsx";
import AcceptableUse from "./pages/legal/AcceptableUse.tsx";
import Contact from "./pages/legal/Contact.tsx";
import CookieConsent from "@/components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/affiliate" element={<AffiliateApply />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/affiliate/dashboard" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><AssignmentsLibrary /></ProtectedRoute>} />
            <Route path="/new-assignment" element={<ProtectedRoute><NewAssignment /></ProtectedRoute>} />
            <Route path="/assignment/:id" element={<ProtectedRoute><AssignmentEditor /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
