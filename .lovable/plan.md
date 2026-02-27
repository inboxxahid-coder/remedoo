

# Remedoo – Patient Web App Implementation Plan

A comprehensive patient health and emergency web application built as a responsive React PWA with Supabase backend.

---

## Phase 1: Foundation, Branding & Auth

### Splash & Onboarding
- Animated splash screen with Remedoo logo and health-themed branding
- 3-4 swipeable onboarding slides: Book Appointments, Emergency SOS, Track Ambulances, Wallet & Payments
- "Get Started" button leading to authentication

### Authentication (Supabase Auth)
- Email/password signup and login
- Google OAuth sign-in
- Auto-created patient profile on signup
- Password reset flow with dedicated reset page
- JWT session management via Supabase

### Profiles Table & Setup
- User profiles: name, email, phone, profile picture, language preference, dark/light mode preference
- Profile picture upload via Supabase Storage
- Row-level security so users can only access their own data

---

## Phase 2: Home Dashboard

### Media Slider
- Image/video carousel fetched from `slider_media` table
- Each slide is clickable → opens external URL or navigates to internal page (Doctors, Hospitals, Labs, Pharmacies)

### Quick Action Buttons
- Book Appointment, Emergency SOS, Order Medicines, View Favorites
- Large, prominent buttons for easy mobile tapping

### Search Bar
- Unified search across doctors, hospitals, labs, pharmacies
- Filters: rating, specialization, distance
- Real-time results from Supabase queries

### Favorites Section
- Add/remove doctors, hospitals, labs, pharmacies to favorites
- Favorites displayed as a section on the dashboard

### Ad Banners
- Banner ads displayed on dashboard (fetched from `ads` table)
- Non-intrusive placement between content sections

---

## Phase 3: Provider Listings

### Doctors Page
- List of doctors with name, specialization, rating, hospital affiliation
- Filter by specialization, rating, availability
- Detail page with working hours, vacation dates, book button

### Hospitals Page
- List with name, location, bed count, ICU availability
- Working hours and holiday schedules
- Detail page with full info

### Labs Page
- List of labs with services offered
- Working hours display

### Pharmacies Page
- Pharmacy listings with inventory info
- Working hours display

---

## Phase 4: Appointments Module

### Booking Flow
- Select service type (Doctor / Hospital / Lab / Pharmacy)
- Browse and select provider
- Pick date and time with availability checking
- Confirm booking → saved to database

### Appointment Management
- Timeline view showing upcoming and past appointments
- Cancel or reschedule functionality
- Status tracking: pending, confirmed, completed, cancelled

### Notifications
- Toast notifications for booking confirmations
- Edge function for email notifications on booking/cancellation

---

## Phase 5: Emergency / SOS Module

### SOS Button
- Prominent red emergency button on home screen
- On press: captures GPS location via browser geolocation API
- Sends emergency request to backend with patient location
- Auto-assigns nearest available ambulance

### Ambulance Tracking
- Map view (embedded map) showing ambulance real-time location
- ETA and status updates: dispatched, en route, arrived
- Supabase Realtime subscriptions for live position updates

### Emergency Analytics
- Response time tracking for each emergency request

---

## Phase 6: Wallet & Payments

### Payment System
- Payment options: COD and Bank Transfer selection
- Wallet balance display
- Transaction history with date filtering

### Receipts
- Generate downloadable PDF receipts for completed payments
- Full payment history view

### Spending Analytics
- Charts showing spending by category and over time

---

## Phase 7: Profile & Settings

### Profile Management
- Edit name, email, phone, profile picture
- Profile picture upload to Supabase Storage

### Settings
- Dark/Light mode toggle (persisted to profile)
- Multi-language support (English + Arabic or other language)
- Notification preferences toggles
- Privacy & security settings

---

## Phase 8: Analytics Dashboard

### Usage Stats
- Appointment statistics (total, upcoming, completed)
- Spending overview with charts
- Emergency response time history
- Favorite providers summary

---

## Database Tables (Supabase/PostgreSQL)

- **profiles** – user details, preferences, language, theme
- **doctors** – name, specialization, rating, hospital_id, working_hours
- **hospitals** – name, location, beds, ICU, working_hours, holidays
- **labs** – name, services, working_hours
- **pharmacies** – name, inventory, working_hours
- **appointments** – patient_id, doctor_id, hospital_id, date, time, status
- **emergency_requests** – patient_id, location, status, assigned_ambulance
- **ambulances** – current_location, status, assigned_patient_id
- **payments** – user_id, type, amount, status, timestamp
- **favorites** – user_id, provider_type, provider_id
- **slider_media** – type, url, target_link
- **ads** – type (banner/interstitial), content_url, placement
- **analytics** – module, data, timestamp

All tables with Row Level Security policies.

---

## Key Technical Details
- **Supabase Cloud** for database, auth, storage, edge functions, and realtime
- **Dark/Light mode** via next-themes
- **Responsive design** optimized for mobile-first usage
- **Recharts** for analytics and spending charts
- **React Router** for all page navigation
- **PWA-ready** – installable on phones from browser

