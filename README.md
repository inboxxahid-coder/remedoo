# Remedoo Patient Care

Create a fully functional **Patient App** for the health and emergency system named **Remedoo** with a **traditional backend** (server + relational database + REST APIs). The app must be ready-to-run Flutter code for **Android and iOS**, integrated with a **MySQL/PostgreSQL database**, and include **all screens, features, backend logic, and enhancements** exactly as described below. **All previously optional features are now required**.



---



## **Project Overview**

- App Name: Remedoo – Patient App

- Platform: Flutter (cross-platform)

- Backend: Traditional server (Node.js / Python Django / PHP Laravel) with REST APIs

- Database: Relational (MySQL or PostgreSQL)

- Storage: Server filesystem or cloud storage (AWS S3 / Google Cloud Storage)

- Purpose: Patient app for booking appointments, emergency SOS, live ambulance tracking, payments, notifications, favorites, analytics, ads, dashboard, and full feature set.

- Multi-language support and Dark/Light mode included

- All features are essential; nothing is optional



---



## **Screens and Features**



### **1. Splash & Onboarding**

- Splash screen with Remedoo logo

- Onboarding slides (3–4) highlighting features: Book appointments, Emergency SOS, Track ambulances, Favorites, Wallet, Slider media

- Navigation: Next → Get Started → Login/Signup



### **2. Login / Signup**

- Options: Email/Password, Phone, Google, Apple

- Role fixed as Patient

- Backend authentication with hashed passwords and JWT tokens

- Navigation post-login: Home Dashboard



### **3. Home Dashboard**

- **Image & Video Slider**

  - Fetch from backend server

  - Clickable → external URLs or internal links (Doctors, Hospitals, Labs, Pharmacies, Products)

- Quick Action Buttons:

  - Book Appointment

  - Emergency SOS

  - Order Medicines

  - View Favorites

- Search Bar:

  - Search doctors, hospitals, labs, pharmacies

  - Filter & sort by rating, distance, specialization

  - Dynamic queries via REST API

- Favorites Section:

  - Add/remove doctors, hospitals, labs, pharmacies

- Include banner and interstitial ads (non-intrusive)



### **4. Appointments Module**

- Timeline view for Upcoming / Past appointments

- Appointment Booking:

  - Select service (Doctor/Hospital/Lab/Pharmacy)

  - Choose date & time, check availability from backend

  - Confirm booking → save in database

- Cancel / Reschedule appointments

- Notifications via email/push through server API



### **5. Emergency / SOS Module**

- Emergency Button on Home

  - Sends location to nearest hospital

  - Auto-dispatch ambulance

- Live Ambulance Tracking

  - Map view with real-time location updates via API

  - ETA and status updates

- Analytics: Track response time for ambulances



### **6. Wallet & Payments**

- Payment Screen

  - Options: COD / Bank Transfer

  - Wallet integration included

  - Payment history saved in database

- PDF receipts for payments

- Analytics: Spending history



### **7. Profile & Settings**

- Profile Screen:

  - Name, email, phone, profile picture

  - Update profile → backend database

- Settings Screen:

  - Dark/Light Mode toggle

  - Multi-language option

  - Notification preferences

  - Privacy & Security settings



---



## **Backend / API Structure (Traditional)**



### **Database Tables**

1. **Users**: user_id, name, email, phone, password_hash, role, profile_pic, language, dark_mode

2. **Appointments**: appointment_id, patient_id, doctor_id, hospital_id, date, time, status, notes

3. **Doctors**: doctor_id, name, specialization, rating, hospital_id, working_hours, vacation_dates

4. **Hospitals**: hospital_id, name, location, beds, ICU, working_hours, holidays

5. **Labs**: lab_id, name, services, working_hours, holidays

6. **Pharmacies**: pharmacy_id, name, inventory, working_hours

7. **Emergency_Ambulance**: ambulance_id, current_location, status, assigned_patient_id

8. **Payments**: payment_id, user_id, type, amount, status, timestamp

9. **Slider_Media**: media_id, type, url, target_link

10. **Analytics**: module, data, timestamp

11. **Ads**: ad_id, type (banner/interstitial), content_url, placement



### **API Endpoints**

- **Authentication**

  - POST /login → return JWT token

  - POST /signup → create user

- **Appointments**

  - GET /appointments?patient_id= → list appointments

  - POST /appointments → book new appointment

  - PUT /appointments/{id} → update/cancel

- **Doctors/Hospitals/Labs/Pharmacies**

  - GET /doctors → list with filters

  - GET /hospitals → list with filters

- **Emergency**

  - POST /emergency → send patient location

  - GET /ambulance/{id}/status → track live ambulance

- **Slider / Media**

  - GET /slider → fetch slider images/videos and target links

- **Payments**

  - POST /payment → create payment

  - GET /payments?user_id= → list payment history

- **Profile**

  - GET /user/{id} → fetch profile

  - PUT /user/{id} → update profile/settings

- **Analytics**

  - GET /analytics?module= → fetch stats

- **Ads**

  - GET /ads → fetch banner/interstitial ads for display



---



## **Logic & Actions**

- Navigation: Splash → Onboarding → Login → Home

- Home → Appointments / Favorites / Emergency / Profile

- SOS button → Assign nearest ambulance → Live tracking → Status updates

- Clickable slider → Open external/internal link in browser

- Search & Filter → API call with rating, distance, specialization

- Appointment booking → Save in database, timeline view

- Notifications → Send via server (email / push)

- Profile updates → update backend database

- Settings toggles (Dark/Light, Multi-language, Notification preferences)

- Analytics: Track usage, spending, ambulance response, appointment stats

- Ads: Display banners and interstitials in app



---



## **UI / UX Notes**

- Clean, modern, and user-friendly design

- Responsive layout for all screen sizes

- Smooth transitions between screens

- Clickable sliders with clear CTA

- Quick action buttons on Home for frequent tasks

- Timeline view for appointments

- Map view for Emergency SOS

- Integrate analytics and ads seamlessly without user disruption



---



## **Deployment & Testing**

- Test all screens in FlutterFlow / iOS & Android simulators

- Test API connectivity for authentication, appointments, emergency, payments, analytics

- Test SOS & live ambulance tracking

- Build APK / iOS bundle for deployment



---



**Goal:** Deliver a **fully functional, production-ready Patient App** for Remedoo with **all screens, traditional backend integration, analytics, wallet, ads, emergency tracking, and essential features**, ready for **future modular expansion**.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://remedoo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e370e3d2-8205-4e4f-a321-cbfdae013387).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
