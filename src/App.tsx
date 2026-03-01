import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProviderRegister from "./pages/ProviderRegister";
import PendingApproval from "./pages/PendingApproval";
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
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminEmergencies from "./pages/admin/AdminEmergencies";
import AdminEditRequests from "./pages/admin/AdminEditRequests";
// Doctor Panel
import DoctorLayout from "./pages/doctor/DoctorLayout";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorSchedule from "./pages/doctor/DoctorSchedule";
import DoctorEarnings from "./pages/doctor/DoctorEarnings";
import DoctorEmergencies from "./pages/doctor/DoctorEmergencies";
import DoctorNotifications from "./pages/doctor/DoctorNotifications";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import DoctorAuditLogs from "./pages/doctor/DoctorAuditLogs";
import DoctorSettings from "./pages/doctor/DoctorSettings";
import DoctorAppointmentDetail from "./pages/doctor/DoctorAppointmentDetail";

// Hospital Panel
import HospitalLayout from "./pages/hospital/HospitalLayout";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import HospitalAppointments from "./pages/hospital/HospitalAppointments";
import HospitalBeds from "./pages/hospital/HospitalBeds";
import HospitalEmergencies from "./pages/hospital/HospitalEmergencies";
import HospitalDoctorManagement from "./pages/hospital/HospitalDoctorManagement";
import HospitalDepartments from "./pages/hospital/HospitalDepartments";
import HospitalOTs from "./pages/hospital/HospitalOTs";
import HospitalEquipment from "./pages/hospital/HospitalEquipment";
import HospitalEarnings from "./pages/hospital/HospitalEarnings";
import HospitalAnalytics from "./pages/hospital/HospitalAnalytics";
import HospitalAuditLogs from "./pages/hospital/HospitalAuditLogs";
import HospitalProfile from "./pages/hospital/HospitalProfile";
import HospitalSettings from "./pages/hospital/HospitalSettings";
import HospitalAmbulanceConfig from "./pages/hospital/HospitalAmbulanceConfig";
import HospitalAmbulanceFleet from "./pages/hospital/HospitalAmbulanceFleet";
import HospitalAmbulanceTrips from "./pages/hospital/HospitalAmbulanceTrips";

// Pharmacy Panel
import PharmacyLayout from "./pages/pharmacy/PharmacyLayout";
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import PharmacyOrders from "./pages/pharmacy/PharmacyOrders";
import PharmacyMedicines from "./pages/pharmacy/PharmacyMedicines";
import PharmacyProfile from "./pages/pharmacy/PharmacyProfile";
import PharmacySettings from "./pages/pharmacy/PharmacySettings";

// Lab Panel
import LabLayout from "./pages/lab/LabLayout";
import LabDashboard from "./pages/lab/LabDashboard";
import LabAppointments from "./pages/lab/LabAppointments";
import LabProfile from "./pages/lab/LabProfile";
import LabSettings from "./pages/lab/LabSettings";

const queryClient = new QueryClient();

const App = () => {
  // Apply dark mode from profile on auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        // Non-blocking: don't await, use .then() so it doesn't block auth flow
        supabase
          .from("profiles")
          .select("dark_mode")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.dark_mode) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
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
          <Route path="/provider-register" element={<ProviderRegister />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
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
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="emergencies" element={<AdminEmergencies />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="slider" element={<AdminSlider />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="edit-requests" element={<AdminEditRequests />} />
          </Route>

          {/* Doctor routes */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="appointments/:appointmentId" element={<DoctorAppointmentDetail />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="earnings" element={<DoctorEarnings />} />
            <Route path="emergencies" element={<DoctorEmergencies />} />
            <Route path="notifications" element={<DoctorNotifications />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="audit-logs" element={<DoctorAuditLogs />} />
            <Route path="settings" element={<DoctorSettings />} />
          </Route>

          {/* Hospital routes */}
          <Route path="/hospital" element={<HospitalLayout />}>
            <Route index element={<HospitalDashboard />} />
            <Route path="appointments" element={<HospitalAppointments />} />
            <Route path="beds" element={<HospitalBeds />} />
            <Route path="emergencies" element={<HospitalEmergencies />} />
            <Route path="doctors" element={<HospitalDoctorManagement />} />
            <Route path="departments" element={<HospitalDepartments />} />
            <Route path="ots" element={<HospitalOTs />} />
            <Route path="equipment" element={<HospitalEquipment />} />
            <Route path="earnings" element={<HospitalEarnings />} />
            <Route path="analytics" element={<HospitalAnalytics />} />
            <Route path="ambulance-config" element={<HospitalAmbulanceConfig />} />
            <Route path="ambulance-fleet" element={<HospitalAmbulanceFleet />} />
            <Route path="ambulance-trips" element={<HospitalAmbulanceTrips />} />
            <Route path="audit-logs" element={<HospitalAuditLogs />} />
            <Route path="profile" element={<HospitalProfile />} />
            <Route path="settings" element={<HospitalSettings />} />
          </Route>

          {/* Pharmacy routes */}
          <Route path="/pharmacy-panel" element={<PharmacyLayout />}>
            <Route index element={<PharmacyDashboard />} />
            <Route path="orders" element={<PharmacyOrders />} />
            <Route path="medicines" element={<PharmacyMedicines />} />
            <Route path="profile" element={<PharmacyProfile />} />
            <Route path="settings" element={<PharmacySettings />} />
          </Route>

          {/* Lab routes */}
          <Route path="/lab" element={<LabLayout />}>
            <Route index element={<LabDashboard />} />
            <Route path="appointments" element={<LabAppointments />} />
            <Route path="profile" element={<LabProfile />} />
            <Route path="settings" element={<LabSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
