import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Doctors from "./pages/Doctors";
import Hospitals from "./pages/Hospitals";
import Labs from "./pages/Labs";
import Pharmacies from "./pages/Pharmacies";
import PharmacyDetail from "./pages/PharmacyDetail";
import Cart from "./pages/Cart";
import OrderTracking from "./pages/OrderTracking";
import MyOrders from "./pages/MyOrders";
import Appointments from "./pages/Appointments";
import BookAppointment from "./pages/BookAppointment";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Emergency from "./pages/Emergency";
import Wallet from "./pages/Wallet";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminHospitals from "./pages/admin/AdminHospitals";
import AdminLabs from "./pages/admin/AdminLabs";
import AdminPharmacies from "./pages/admin/AdminPharmacies";
import AdminMedicines from "./pages/admin/AdminMedicines";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSlider from "./pages/admin/AdminSlider";
import AdminAds from "./pages/admin/AdminAds";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Patient routes */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/hospitals" element={<Hospitals />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/pharmacies" element={<Pharmacies />} />
          <Route path="/pharmacy/:id" element={<PharmacyDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order/:id" element={<OrderTracking />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/book/:type/:id" element={<BookAppointment />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="hospitals" element={<AdminHospitals />} />
            <Route path="labs" element={<AdminLabs />} />
            <Route path="pharmacies" element={<AdminPharmacies />} />
            <Route path="medicines" element={<AdminMedicines />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="slider" element={<AdminSlider />} />
            <Route path="ads" element={<AdminAds />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
