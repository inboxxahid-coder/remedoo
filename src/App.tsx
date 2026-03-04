import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Lazy-loaded pages — each becomes a separate chunk
const Splash = lazy(() => import("./pages/Splash"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ProviderRegister = lazy(() => import("./pages/ProviderRegister"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Doctors = lazy(() => import("./pages/Doctors"));
const DoctorDetail = lazy(() => import("./pages/DoctorDetail"));
const Hospitals = lazy(() => import("./pages/Hospitals"));
const HospitalDetail = lazy(() => import("./pages/HospitalDetail"));
const Labs = lazy(() => import("./pages/Labs"));
const LabDetail = lazy(() => import("./pages/LabDetail"));
const Pharmacies = lazy(() => import("./pages/Pharmacies"));
const PharmacyDetail = lazy(() => import("./pages/PharmacyDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Appointments = lazy(() => import("./pages/Appointments"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Emergency = lazy(() => import("./pages/Emergency"));

const Analytics = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MedicalHistory = lazy(() => import("./pages/MedicalHistory"));
const LabReports = lazy(() => import("./pages/LabReports"));
const AppointmentDetail = lazy(() => import("./pages/AppointmentDetail"));
const LabReportDetail = lazy(() => import("./pages/LabReportDetail"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const RefundTracking = lazy(() => import("./pages/RefundTracking"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDoctors = lazy(() => import("./pages/admin/AdminDoctors"));
const AdminHospitals = lazy(() => import("./pages/admin/AdminHospitals"));
const AdminLabs = lazy(() => import("./pages/admin/AdminLabs"));
const AdminPharmacies = lazy(() => import("./pages/admin/AdminPharmacies"));
const AdminMedicines = lazy(() => import("./pages/admin/AdminMedicines"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSlider = lazy(() => import("./pages/admin/AdminSlider"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminEmergencies = lazy(() => import("./pages/admin/AdminEmergencies"));
const AdminEditRequests = lazy(() => import("./pages/admin/AdminEditRequests"));
const AdminOtpSettings = lazy(() => import("./pages/admin/AdminOtpSettings"));
const AdminCommissionConfig = lazy(() => import("./pages/admin/AdminCommissionConfig"));
const AdminRevenueDashboard = lazy(() => import("./pages/admin/AdminRevenueDashboard"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminSupportTickets = lazy(() => import("./pages/admin/AdminSupportTickets"));
const AdminSuspiciousActivity = lazy(() => import("./pages/admin/AdminSuspiciousActivity"));
const AdminQuickActions = lazy(() => import("./pages/admin/AdminQuickActions"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminHealthTips = lazy(() => import("./pages/admin/AdminHealthTips"));
const AdminFeaturedDoctors = lazy(() => import("./pages/admin/AdminFeaturedDoctors"));
const AdminFeaturedMedicines = lazy(() => import("./pages/admin/AdminFeaturedMedicines"));

// Doctor Panel
const DoctorLayout = lazy(() => import("./pages/doctor/DoctorLayout"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorAppointments = lazy(() => import("./pages/doctor/DoctorAppointments"));
const DoctorSchedule = lazy(() => import("./pages/doctor/DoctorSchedule"));
const DoctorEarnings = lazy(() => import("./pages/doctor/DoctorEarnings"));
const DoctorEmergencies = lazy(() => import("./pages/doctor/DoctorEmergencies"));
const DoctorNotifications = lazy(() => import("./pages/doctor/DoctorNotifications"));
const DoctorProfile = lazy(() => import("./pages/doctor/DoctorProfile"));
const DoctorAuditLogs = lazy(() => import("./pages/doctor/DoctorAuditLogs"));
const DoctorSettings = lazy(() => import("./pages/doctor/DoctorSettings"));
const DoctorReviews = lazy(() => import("./pages/doctor/DoctorReviews"));
const DoctorAppointmentDetail = lazy(() => import("./pages/doctor/DoctorAppointmentDetail"));

// Hospital Panel
const HospitalLayout = lazy(() => import("./pages/hospital/HospitalLayout"));
const HospitalDashboard = lazy(() => import("./pages/hospital/HospitalDashboard"));
const HospitalAppointments = lazy(() => import("./pages/hospital/HospitalAppointments"));
const HospitalBeds = lazy(() => import("./pages/hospital/HospitalBeds"));
const HospitalEmergencies = lazy(() => import("./pages/hospital/HospitalEmergencies"));
const HospitalDoctorManagement = lazy(() => import("./pages/hospital/HospitalDoctorManagement"));
const HospitalDepartments = lazy(() => import("./pages/hospital/HospitalDepartments"));
const HospitalOTs = lazy(() => import("./pages/hospital/HospitalOTs"));
const HospitalEquipment = lazy(() => import("./pages/hospital/HospitalEquipment"));
const HospitalEarnings = lazy(() => import("./pages/hospital/HospitalEarnings"));
const HospitalAnalytics = lazy(() => import("./pages/hospital/HospitalAnalytics"));
const HospitalAuditLogs = lazy(() => import("./pages/hospital/HospitalAuditLogs"));
const HospitalProfile = lazy(() => import("./pages/hospital/HospitalProfile"));
const HospitalSettings = lazy(() => import("./pages/hospital/HospitalSettings"));
const HospitalAmbulanceConfig = lazy(() => import("./pages/hospital/HospitalAmbulanceConfig"));
const HospitalAmbulanceFleet = lazy(() => import("./pages/hospital/HospitalAmbulanceFleet"));
const HospitalAmbulanceTrips = lazy(() => import("./pages/hospital/HospitalAmbulanceTrips"));

// Pharmacy Panel
const PharmacyLayout = lazy(() => import("./pages/pharmacy/PharmacyLayout"));
const PharmacyDashboard = lazy(() => import("./pages/pharmacy/PharmacyDashboard"));
const PharmacyOrders = lazy(() => import("./pages/pharmacy/PharmacyOrders"));
const PharmacyMedicines = lazy(() => import("./pages/pharmacy/PharmacyMedicinesEnhanced"));
const PharmacyProfile = lazy(() => import("./pages/pharmacy/PharmacyProfile"));
const PharmacySettings = lazy(() => import("./pages/pharmacy/PharmacySettings"));
const PharmacyEarnings = lazy(() => import("./pages/pharmacy/PharmacyEarnings"));

// Lab Panel
const LabLayout = lazy(() => import("./pages/lab/LabLayout"));
const LabDashboard = lazy(() => import("./pages/lab/LabDashboard"));
const LabAppointments = lazy(() => import("./pages/lab/LabAppointments"));
const LabProfile = lazy(() => import("./pages/lab/LabProfile"));
const LabSettings = lazy(() => import("./pages/lab/LabSettings"));
const LabTests = lazy(() => import("./pages/lab/LabTests"));
const LabEarnings = lazy(() => import("./pages/lab/LabEarnings"));
const LabSampleCollections = lazy(() => import("./pages/lab/LabSampleCollections"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
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
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/doctor/:id" element={<DoctorDetail />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/hospital/:id" element={<HospitalDetail />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/lab/:id" element={<LabDetail />} />
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
            
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/medical-history" element={<MedicalHistory />} />
            <Route path="/lab-reports" element={<LabReports />} />
            <Route path="/appointment/:id" element={<AppointmentDetail />} />
            <Route path="/lab-report/:id" element={<LabReportDetail />} />
            <Route path="/payment-failure" element={<PaymentFailure />} />
            <Route path="/refunds" element={<RefundTracking />} />
            <Route path="/support-tickets" element={<SupportTickets />} />

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
              <Route path="otp-settings" element={<AdminOtpSettings />} />
              <Route path="commission" element={<AdminCommissionConfig />} />
              <Route path="revenue" element={<AdminRevenueDashboard />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="support-tickets" element={<AdminSupportTickets />} />
              <Route path="suspicious-activity" element={<AdminSuspiciousActivity />} />
              <Route path="quick-actions" element={<AdminQuickActions />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="health-tips" element={<AdminHealthTips />} />
              <Route path="featured-doctors" element={<AdminFeaturedDoctors />} />
              <Route path="featured-medicines" element={<AdminFeaturedMedicines />} />
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
              <Route path="reviews" element={<DoctorReviews />} />
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
              <Route path="earnings" element={<PharmacyEarnings />} />
              <Route path="profile" element={<PharmacyProfile />} />
              <Route path="settings" element={<PharmacySettings />} />
            </Route>

            {/* Lab routes */}
            <Route path="/lab" element={<LabLayout />}>
              <Route index element={<LabDashboard />} />
              <Route path="appointments" element={<LabAppointments />} />
              <Route path="tests" element={<LabTests />} />
              <Route path="samples" element={<LabSampleCollections />} />
              <Route path="earnings" element={<LabEarnings />} />
              <Route path="profile" element={<LabProfile />} />
              <Route path="settings" element={<LabSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
