# PrimeWave Lab — Resource Reservation Management System

[![Tests: 102 Passed](https://img.shields.io/badge/Tests-102%20Passed%20(100%25)-emerald.svg)](./tests)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/PostgreSQL-16%2F18-blue.svg)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/Prisma-6.19-indigo.svg)](https://www.prisma.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS%204-cyan.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)

A full-stack, enterprise-grade resource reservation management system engineered for **PrimeWave Lab (Pvt) Ltd Technical Assessment**. 

Engineered with **atomic ACID conflict prevention**, **PostgreSQL database-level exclusion constraints (`btree_gist`)**, **interactive visual availability timelines**, **ghost booking auto-release engines**, **turnaround buffer intervals**, **group bookings with teammate invites**, **role-based access control (RBAC)**, and **custom 3-second animated toast notifications**.

---

## Table of Contents
1. [Executive Summary & Problem Statement](#executive-summary--problem-statement)
2. [Key Features & System Capabilities](#key-features--system-capabilities)
3. [Architecture & Technical Highlights](#architecture--technical-highlights)
4. [Entity Relationship (ER) Diagram](#entity-relationship-er-diagram)
5. [Tech Stack](#tech-stack)
6. [Pre-Configured Demo Accounts](#pre-configured-demo-accounts)
7. [Getting Started & Step-by-Step Setup](#getting-started--step-by-step-setup)
8. [Automated Test Suite (102 Tests)](#automated-test-suite-102-tests)
9. [Project Directory Structure](#project-directory-structure)
10. [Troubleshooting & Common Questions](#troubleshooting--common-questions)

---

## Executive Summary & Problem Statement

In modern organizations, shared physical assets (boardrooms, audio/visual media gear, hardware testing benches, lab oscilloscopes, and company vehicles) frequently face scheduling friction:
- **Informal Communication & Double Bookings:** Booking via chat or spreadsheets leads to overlapping meetings and wasted working hours.
- **Ghost Bookings (Unattended Slots):** Employees book rooms for hours but never show up, preventing others from utilizing valuable facilities.
- **Turnaround Clashes:** Back-to-back bookings leave no time for room reset, disinfection, hardware battery recharge, or equipment inspection.
- **Lack of Group Coordination:** Organizers cannot easily invite teammates, leaving participants unaware of meeting locations and schedules.
- **Administrative Blindspots:** Management lacks visibility into utilization patterns, cancellation reasons, and cross-team resource allocation.

**PrimeWave Lab Resource Hub** solves these pain points by combining high-speed web technologies with database-level concurrency guarantees and automated lifecycle sweeper engines.

---

## Key Features & System Capabilities

### 1. Two-Tier Overlap & Race Condition Prevention
- **Application Layer (Tier 1):** Every booking and update executes in an atomic `prisma.$transaction` query. Validates:
  $$\text{Existing.start} < \text{New.end} \quad \text{AND} \quad \text{Existing.end} > \text{New.start}$$
  Includes intelligent **self-exclusion** (`id: { not: currentId }`) allowing users to reschedule their own bookings without false-positive collisions.
- **Database Engine Layer (Tier 2):** Native PostgreSQL exclusion constraint using the `btree_gist` extension prevents race conditions at the kernel storage level, guaranteeing zero double bookings even under heavy concurrent traffic.

### 2. Real-Time Client-Side Conflict Pre-Detection
- As users select dates and adjust time dropdowns in the booking modal, debounced background requests query availability.
- Inline warnings highlight exact conflicting sessions (e.g. *"Overlaps with 'Client Demo' by Alex Fernando (1:30 PM – 3:00 PM)"*) before submission.

### 3. Ghost Booking Engine & 15-Minute No-Show Auto-Release
- **Check-In Window:** Bookings activate a 1-click check-in action starting 15 minutes prior to the scheduled start time.
- **Evaluator Simulation:** 1-Click test simulation allows evaluators to simulate an unattended no-show and watch the slot free up immediately.
- **Background Sweeper:** Automated sweeper identifies expired unconfirmed reservations, marks them `CANCELLED`, and logs auto-release metadata for team visibility.

### 4. Turnaround Buffer Intervals (Cleaning & Reset)
- Resources can enforce mandatory maintenance and room reset buffers (**10, 15, 30, 45, or 60 minutes**).
- Subsequent bookings are automatically held back until the turnaround window completes, ensuring sanitized rooms and recharged equipment.

### 5. Group Bookings & Teammate Invites
- **Colleague Search Bar:** Real-time dropdown to search colleagues by name, email, or department (admin accounts are strictly filtered out).
- **Capacity Guard:** Enforces maximum group capacity thresholds per resource.
- **Cross-Dashboard Visibility:** Invited teammates automatically see the reservation in their personal upcoming schedule with full organizer host details.

### 6. Administrative Operations & Governance
- **Book on Behalf of Employee:** Admins can reserve any facility or gear on behalf of specific employees, tagging records with audit metadata (`[BOOKED_BY_ADMIN:...]`).
- **Mandatory Cancellation Reason:** Admins cancelling employee reservations must provide a justification note, which is displayed directly on the affected employee's dashboard.
- **Personnel Account Provisioning:** Provision new company accounts with bcrypt-hashed credentials, roles (`ADMIN` or `USER`), and department assignments.
- **Resource Lifecycle Controls:** Toggle status between `ACTIVE`, `MAINTENANCE`, and `INACTIVE` (decommissioned assets immediately block new bookings).

### 7. Global Toast Notification Engine
- **Strict 3-Second Lifetime:** Every toast notification auto-dismisses after exactly 3000ms.
- **Animated Countdown Bar:** Visual CSS keyframe progress bar (`toastCountdown 3000ms linear forwards`) indicates remaining time.
- **Universal Mutation Coverage:** Fires on all **Create**, **Update**, and **Delete** actions across Reservations, Resources, and Users.
- **Redirect Resilient:** Features a `sessionStorage` fallback queue (`toast.queueSuccess`) that persists across Next.js router transitions.

### 8. 1-Click External Calendar Sync
- Export bookings directly to **Google Calendar**, **Microsoft Outlook**, **Office 365**, or download universal **Apple / iCal (`.ics`)** files.

### 9. Seamless Theme Switcher & Visual Design
- Full **Dark Mode** and **Light Mode** support with smooth color transitions, modern typography, glassmorphism, and responsive data cards.

---

## Entity Relationship (ER) Diagram

```mermaid
erDiagram
    Category ||--o{ Resource : "categorizes"
    Resource ||--o{ Reservation : "booked in"
    User ||--o{ Reservation : "reserves"

    User {
        String id PK "UUID"
        String email UK "Unique corporate email"
        String name "Full display name"
        String passwordHash "Bcrypt hashed password (10 rounds)"
        Role role "USER | ADMIN"
        String department "Engineering, Design, Product, etc."
        String avatarUrl "Nullable profile image URL"
        DateTime createdAt "Timestamp"
        DateTime updatedAt "Timestamp"
    }

    Category {
        String id PK "UUID"
        String name UK "Meeting Rooms, A/V Media, Lab Benches, Vehicles"
        String slug UK "URL-friendly slug"
        String description "Category overview"
    }

    Resource {
        String id PK "UUID"
        String name "e.g. Conference Room Alpha"
        String description "Specifications and amenities"
        String categoryId FK "References Category(id)"
        String location "Building, floor, or locker location"
        Int capacity "Nullable seating / capacity limit"
        ResourceStatus status "ACTIVE | INACTIVE | MAINTENANCE"
        Json attributes "bufferMinutes, allowGroupBooking, maxGroupCapacity"
        DateTime createdAt "Timestamp"
        DateTime updatedAt "Timestamp"
    }

    Reservation {
        String id PK "UUID"
        String title "Booking purpose / meeting title"
        String notes "Nullable tags: [CHECKED_IN], [GROUP_BOOKING], [ADMIN_REASON]"
        DateTime startTime "Reservation start timestamp"
        DateTime endTime "Reservation end timestamp"
        ReservationStatus status "CONFIRMED | CANCELLED | COMPLETED"
        String userId FK "References User(id) - Host / Organizer"
        String resourceId FK "References Resource(id)"
        DateTime createdAt "Timestamp"
        DateTime updatedAt "Timestamp"
    }
```

---

## Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16.4](https://nextjs.org/) | App Router, React Server Components, Server Actions, Turbopack |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type checking across full stack |
| **UI & Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Custom design system, responsive glassmorphism, dark/light themes |
| **Icons** | [Lucide React](https://lucide.dev/) | Consistent iconography across actions and navigation |
| **Database** | [PostgreSQL 16/18](https://www.postgresql.org/) | Relational store with `btree_gist` exclusion constraints |
| **ORM** | [Prisma 6.19](https://www.prisma.io/) | Schema modeling, type-safe queries, transaction isolation |
| **Authentication** | [NextAuth.js 4](https://next-auth.js.org/) | JWT session strategy, credentials provider, bcrypt hashing |
| **Validation** | [Zod](https://zod.dev/) | Runtime schema validation for server actions and forms |
| **Date Utilities** | [date-fns 4](https://date-fns.org/) | Timezone calculations, formatting, calendar generation |
| **Testing** | [TSX](https://github.com/privatenumber/tsx) | Fast TypeScript native integration test runner |

---

## Pre-Configured Demo Accounts

The database comes pre-seeded with 5 accounts across different roles and departments:

| Persona | Name | Email | Password | Role | Department |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin User | `admin@primewave.com` | `admin123` | `ADMIN` | Operations |
| **Engineer** | Sarah Perera | `sarah@primewave.com` | `user123` | `USER` | Engineering |
| **Product** | Alex Fernando | `alex@primewave.com` | `user123` | `USER` | Product |
| **Design** | Emily Chen | `emily@primewave.com` | `user123` | `USER` | Design |
| **Hardware** | David Silva | `david@primewave.com` | `user123` | `USER` | Hardware |

> **Note for Evaluators:** The login page features **1-Click Persona Quick Fill Buttons** to test different user journeys in seconds without manual typing.

---

## Getting Started & Step-by-Step Setup

### Prerequisites
- **Node.js**: v18.17+ or v20+ (tested on Node v20 & v24)
- **Package Manager**: `npm` (v9+)
- **PostgreSQL**: v14, v15, or v16 running locally OR **Docker Desktop**

---

### Step 1: Clone the Repository & Install Dependencies
```bash
git clone <repository-url>
cd primewave-resource-hub
npm install
```

---

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory (you can copy `.env.example` if available):
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
# PostgreSQL Database Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/primewave_db?schema=public"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="primewave-secure-development-secret-key-32-chars-min"
```

---

### Step 3: Start PostgreSQL Database

#### Option A: Using Docker (Recommended)
If you have Docker installed, simply start the included container:
```bash
docker compose up -d
```

#### Option B: Using Native Local PostgreSQL
Ensure your PostgreSQL service is running and create the database:
```sql
CREATE DATABASE primewave_db;
```

---

### Step 4: Push Prisma Schema & Apply Exclusion Constraint

Push the schema tables to PostgreSQL:
```bash
npx prisma db push
```

*(Optional but Recommended)* Apply the PostgreSQL kernel-level exclusion constraint:
```bash
psql -U postgres -d primewave_db -f prisma/add_exclusion_constraint.sql
```
*(Or execute via pgAdmin / DBeaver: `CREATE EXTENSION IF NOT EXISTS btree_gist;`)*

---

### Step 5: Seed Demo Data
Populate the database with demo categories, resources, users, and live reservations:
```bash
npm run seed
```
*Alternative command:* `npx tsx prisma/seed.ts`

---

### Step 6: Run the Comprehensive Automated Test Suite
Run the 8 automated integration test suites to verify system integrity:
```bash
npm test
```
**Expected Result:** **102 PASSED, 0 FAILED** (100% pass rate).

---

### Step 7: Start the Development Server
```bash
npm run dev
```

Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## Automated Test Suite (102 Tests)

The test harness verifies every business rule, security boundary, and concurrency guard against PostgreSQL:

```bash
npm test
```

### Breakdown of Test Suites:

| # | Test Suite File | Tests | Focus Area |
| :-: | :--- | :-: | :--- |
| **1** | [`tests/conflict-detection.ts`](./tests/conflict-detection.ts) | **7** | Atomic ACID transactions, overlapping slots, adjacent valid bookings, inactive resource block. |
| **2** | [`tests/ghost-booking.ts`](./tests/ghost-booking.ts) | **7** | 15-minute check-in eligibility window, check-in persistence, unattended auto-release. |
| **3** | [`tests/turnaround-buffer.ts`](./tests/turnaround-buffer.ts) | **7** | Cleaning/reset intervals (15m, 30m, 60m), rejection of bookings inside buffer period. |
| **4** | [`tests/admin-user-creation.ts`](./tests/admin-user-creation.ts) | **11** | Admin-only authorization, email validation, bcrypt hashing, department persistence. |
| **5** | [`tests/admin-book-on-behalf.ts`](./tests/admin-book-on-behalf.ts) | **4** | Admin booking on behalf of employee, audit metadata tagging, schedule cross-appearance. |
| **6** | [`tests/admin-cancellation-reason.ts`](./tests/admin-cancellation-reason.ts) | **5** | Mandatory cancellation reason parsing, note cleaning, employee dashboard notification. |
| **7** | [`tests/group-booking.ts`](./tests/group-booking.ts) | **22** | Colleague discovery, admin exclusion, invitee dashboard visibility, max capacity checks. |
| **8** | [`tests/verify-db-crud.ts`](./tests/verify-db-crud.ts) | **27** | PostgreSQL direct CRUD verification for Users & Reservations, foreign keys, unique email guard. |
| **Total** | **8 Test Suites** | **102** | **100% Passing (0 Failures)** |

---

## Project Directory Structure

```text
├── prisma/
│   ├── schema.prisma               # Prisma models, enums & relational schema
│   ├── seed.ts                     # Database seeder with realistic resources & bookings
│   ├── add_exclusion_constraint.sql# PostgreSQL btree_gist exclusion constraint
│   └── dbdiagram.dbml              # DBML schema for dbdiagram.io visualization
├── src/
│   ├── app/
│   │   ├── admin/                  # Admin Operations Hub (Story 1 & Admin Management)
│   │   ├── api/auth/               # NextAuth session routes
│   │   ├── login/                  # Authentication page with 1-click persona quick-fill
│   │   ├── my-reservations/        # User's bookings, check-in, edit, cancel & date filter
│   │   ├── reservations/           # Team Schedule cross-filter view (Story 5)
│   │   ├── resources/              # Visual Resource Catalog & detail pages
│   │   ├── layout.tsx              # Root layout with ToastContainer & ThemeProvider
│   │   └── page.tsx                # Operations insights dashboard & home page
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboardClient.tsx      # Admin management UI & user provisioning
│   │   │   ├── AdminCreateReservationModal.tsx # Book on behalf of user modal
│   │   │   └── CreateResourceForm.tsx        # Resource creation form
│   │   ├── dashboard/
│   │   │   └── OperationsInsightsWidget.tsx  # Analytics, utilization & turnaround metrics
│   │   ├── layout/
│   │   │   └── Navbar.tsx                    # Header with responsive navigation
│   │   ├── providers/
│   │   │   ├── AuthProvider.tsx              # NextAuth session provider
│   │   │   └── ThemeProvider.tsx             # Dark / Light theme provider
│   │   ├── reservations/
│   │   │   ├── AddToCalendarButton.tsx       # 1-Click Google/Outlook/.ics exports
│   │   │   ├── AvailabilityTimeline.tsx      # 24-Hour visual time slot grid
│   │   │   ├── BookingModal.tsx              # Conflict detection & group booking modal
│   │   │   ├── CancelReservationModal.tsx    # Cancellation modal with justification reasons
│   │   │   ├── EditReservationModal.tsx      # Rescheduling modal with self-exclusion
│   │   │   └── MyReservationsClient.tsx      # Personal reservation list & sweeper UI
│   │   ├── resources/
│   │   │   ├── ResourceCard.tsx              # Resource catalog card
│   │   │   ├── ResourceCatalogClient.tsx     # Filterable catalog with search & tags
│   │   │   └── ResourceDetailClient.tsx      # Resource specification & timeline view
│   │   └── ui/
│   │       ├── toast.tsx                     # 3-Second animated toast notification engine
│   │       ├── ThemeToggle.tsx               # Dark/Light theme switch button
│   │       ├── badge.tsx, button.tsx, card.tsx, input.tsx, modal.tsx # Reusable UI components
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── reservations.ts               # Server actions for reservation lifecycle
│   │   │   ├── resources.ts                  # Server actions for resource management
│   │   │   └── users.ts                      # Server actions for user provisioning & teammate lookup
│   │   ├── auth.ts                           # NextAuth configuration & RBAC guards
│   │   ├── calendar.ts                       # Calendar link & .ics generator
│   │   ├── db.ts                             # Global Prisma client singleton
│   │   ├── ghost-booking.ts                  # Ghost booking logic & check-in parser
│   │   ├── group-booking.ts                  # Group booking tag serializer & parser
│   │   └── utils.ts                          # Date/time formatters & class merger
├── tests/
│   ├── conflict-detection.ts                 # Overlap & concurrency tests
│   ├── ghost-booking.ts                      # Check-in & auto-release tests
│   ├── turnaround-buffer.ts                  # Reset buffer interval tests
│   ├── admin-user-creation.ts                # User provisioning tests
│   ├── admin-book-on-behalf.ts               # Book on behalf of employee tests
│   ├── admin-cancellation-reason.ts          # Cancellation justification tests
│   ├── group-booking.ts                      # Teammate invitation tests
│   └── verify-db-crud.ts                     # PostgreSQL direct CRUD verification
└── docker-compose.yml                        # PostgreSQL container definition
```

---

## Troubleshooting & Common Questions

#### 1. `PrismaClientInitializationError: Can't reach database server`
- Ensure your PostgreSQL service is running (`docker compose up -d` or check your local service on port 5432).
- Verify the credentials in your `.env` file match your database settings.

#### 2. `ERROR: extension "btree_gist" is not available`
- In PostgreSQL, the `btree_gist` extension comes standard with the `contrib` package.
- If using Ubuntu/Debian: `sudo apt-get install postgresql-contrib`
- If using Docker: the standard `postgres:16-alpine` image includes `btree_gist` out of the box.

#### 3. How do I test the Ghost Booking auto-release?
1. Log in as any user (e.g. `sarah@primewave.com` / `user123`).
2. Go to **My Bookings** (`/my-reservations`).
3. Click **"Simulate 15-Min Auto-Release"** on any upcoming booking to see the ghost booking engine free the room in real time.
4. Or click **"Run Auto-Release Sweeper"** to sweep all unattended bookings across the entire company.

#### 4. How do I switch between Dark and Light mode?
- Click the sun/moon icon located on the top right navigation bar at any time. Your preference is automatically stored in `localStorage` and persists across page reloads.

---

## License
Developed for PrimeWave Lab Technical Assessment. MIT License.
