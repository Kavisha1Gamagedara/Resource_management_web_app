# 🌊 PrimeWave Lab — Resource Reservation Management System

[![Tests: Passing](https://img.shields.io/badge/Tests-7%20Passed-emerald.svg)](./tests/conflict-detection.ts)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/PostgreSQL-16%2F18-blue.svg)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/Prisma-6.19-indigo.svg)](https://www.prisma.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS%204-cyan.svg)](https://tailwindcss.com/)

A full-stack, enterprise-grade resource reservation management system developed for **PrimeWave Lab (Pvt) Ltd Technical Assessment**. Engineered with **atomic ACID conflict prevention**, **database-level exclusion constraints**, **interactive visual availability timelines**, and **role-based access control (RBAC)**.

---

## 📌 Executive Summary & Business Problem

Shared corporate facilities (boardrooms, audio/visual kits, hardware labs, and company vehicles) often suffer from informal communication, manual scheduling spreadsheets, and double bookings.

This project delivers a centralized digital solution addressing the core challenges:
1. **Uncertainty in Availability:** Eliminated via interactive visual availability timelines showing free vs. booked slots.
2. **Double Bookings & Race Conditions:** Prevented via a two-tier defense: application-layer transactional overlap validation and PostgreSQL exclusion constraints (`EXCLUDE USING gist`).
3. **Operational Clarity:** Addressed through flexible cross-filtering by specific resource or team member.
4. **Governance & Auditability:** Managed through RBAC, permitting administrators to create, modify, and deactivate resources while preserving historical records.

---

## 🚀 Key Technical Highlights & Architecture

### 1. Two-Tier Overlap & Race Condition Prevention
* **Tier 1 (Application / Transaction Layer):** Reservations are validated inside isolated `prisma.$transaction` calls. The condition:
  $$\text{Existing.start} < \text{New.end} \quad \text{AND} \quad \text{Existing.end} > \text{New.start}$$
  runs alongside self-exclusion checks for reservation edits (`id: { not: currentId }`).
* **Tier 2 (PostgreSQL Engine Level):** A PostgreSQL exclusion constraint using the `btree_gist` extension ensures that even under simultaneous concurrent threads, overlapping reservations are impossible:
  ```sql
  ALTER TABLE "Reservation" 
  ADD CONSTRAINT no_overlapping_reservations 
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startTime", "endTime") WITH &&
  ) WHERE (status = 'CONFIRMED');
  ```

### 2. Live Client-Side Conflict Feedback (Story 3)
* As users pick dates and start/end times in the booking modal, debounced background requests query slot availability in real-time, providing immediate inline warnings (*"⚠️ Overlaps with 'Client Demo' by Alex Fernando (1:30 PM – 3:00 PM)"*) before submission.

### 3. Evaluator Delight: 1-Click Persona Quick Switcher
* The top navigation bar includes an instant persona switcher:
  * **⚡ Admin (Full Control):** `admin@primewave.com` / `admin123`
  * **⚡ Sarah (Engineering):** `sarah@primewave.com` / `user123`
  * **⚡ Alex (Product):** `alex@primewave.com` / `user123`
* Switch personas in 1 click to test RBAC and cross-person booking views in under 30 seconds.

---

## 🗄️ Database Design & Entity Relationship (ER) Diagram

```mermaid
erDiagram
    Category ||--o{ Resource : "categorizes"
    Resource ||--o{ Reservation : "booked in"
    User ||--o{ Reservation : "reserves"

    User {
        String id PK "UUID"
        String email UK
        String name
        String passwordHash
        Role role "USER | ADMIN"
        String department "Engineering, Product, Design, Operations"
        String avatarUrl
        DateTime createdAt
        DateTime updatedAt
    }

    Category {
        String id PK "UUID"
        String name UK
        String slug UK
        String description
    }

    Resource {
        String id PK "UUID"
        String name
        String description
        String categoryId FK
        String location
        Int capacity "nullable"
        ResourceStatus status "ACTIVE | INACTIVE | MAINTENANCE"
        Json attributes "Specs, equipment, amenities"
        DateTime createdAt
        DateTime updatedAt
    }

    Reservation {
        String id PK "UUID"
        String title
        String notes "nullable"
        DateTime startTime
        DateTime endTime
        ReservationStatus status "CONFIRMED | CANCELLED | COMPLETED"
        String userId FK
        String resourceId FK
        DateTime createdAt
        DateTime updatedAt
    }
```

> **dbdiagram.io Public Code:** The complete schema code is also provided in [`prisma/dbdiagram.dbml`](./prisma/dbdiagram.dbml) for rendering in [dbdiagram.io](https://dbdiagram.io).

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions)
* **Language:** TypeScript 5
* **Database:** PostgreSQL 16/18 with `btree_gist` extension
* **ORM:** [Prisma ORM 6.19](https://www.prisma.io/)
* **Styling & UI:** Tailwind CSS 4, custom dark design system, glassmorphism, Lucide Icons
* **Authentication:** NextAuth.js (Credentials Provider with bcrypt password hashing)
* **Validation:** Zod schemas
* **Testing:** TypeScript integration test runner (`tests/conflict-detection.ts`)
* **Containerization:** Docker Compose (`docker-compose.yml`)

---

## 🏁 Quick Start Guide

### Prerequisites
* Node.js 18+ (tested on Node v24)
* PostgreSQL 16+ running locally OR Docker Desktop

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd primewave-resource-hub
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/primewave_db?schema=public"
NEXTAUTH_SECRET="primewave-development-secret-key-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Start PostgreSQL (Option A: Docker / Option B: Native)
**Option A — Using Docker:**
```bash
docker compose up -d
```
**Option B — Native PostgreSQL:**
Ensure PostgreSQL is running on port 5432 with database `primewave_db`.

### 4. Push Schema & Seed Rich Demo Data
```bash
# Push Prisma schema to PostgreSQL
npx prisma db push

# Apply database exclusion constraint
psql -U postgres -d primewave_db -f prisma/add_exclusion_constraint.sql

# Seed pre-populated users, resources, and live reservations
npm run seed
```

### 5. Run the Automated Conflict Test Suite
```bash
npm test
```
*Expected Output:* **`7 PASSED, 0 FAILED`** verifying overlap detection, adjacent slot validity, and inactive resource locks.

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Automated Conflict Test Coverage

Run `npm test` to execute the integration test suite:

| Test Case | Scenario Tested | Result |
| :--- | :--- | :---: |
| **Test 1** | Base booking (10:00 – 12:00) | ✅ PASS |
| **Test 2** | Overlapping start time (11:00 – 13:00) | ✅ REJECTED |
| **Test 3** | Overlapping end time (09:00 – 11:00) | ✅ REJECTED |
| **Test 4** | Completely enclosed slot (10:30 – 11:30) | ✅ REJECTED |
| **Test 5** | Completely enclosing slot (09:00 – 13:00) | ✅ REJECTED |
| **Test 6** | Valid adjacent back-to-back slots (09:00–10:00 & 12:00–13:00) | ✅ ACCEPTED |
| **Test 7** | Booking on an `INACTIVE` / decommissioned resource | ✅ REJECTED |

---

## 🎯 Verification of All User Stories

- **Story 1 (Admin Management):** Authenticate as Admin $\rightarrow$ visit `/admin` $\rightarrow$ Add new resource, update details, or click "Deactivate" to immediately pause bookings.
- **Story 2 (Visual Availability):** Open any resource $\rightarrow$ view the 24-hour visual schedule timeline showing booked slots vs. available slots.
- **Story 3 (Immediate Conflict Prevention):** Open the reservation modal and pick a time slot overlapping with an existing booking $\rightarrow$ observe the live conflict warning before submitting.
- **Story 4 (Edit / Cancel Lifecycle):** Visit `/my-reservations` $\rightarrow$ edit your booking (self-exclusion handles non-conflicting extensions) or cancel to instantly release the slot.
- **Story 5 (Cross-Views):** Visit `/reservations` $\rightarrow$ filter by **Resource** to see a room's daily agenda, or filter by **Person** to see all bookings made by a specific colleague.

---

## 📽️ Video Walkthrough Structure (3–5 Minutes)

1. **0:00 – 0:45 | Context & Problem:** Informal booking friction, double bookings, and architectural goals.
2. **0:45 – 1:30 | Resource Catalog & Live Availability (Stories 2 & 3):** Timeline inspection, live conflict detection demo.
3. **1:30 – 2:30 | Lifecycle Management (Story 4):** Rescheduling with self-exclusion and cancellation.
4. **2:30 – 3:30 | Cross-Schedule & RBAC (Stories 1 & 5):** Filter by Person/Resource, Admin deactivation demo.
5. **3:30 – 4:30 | Engineering Highlights:** ACID transactions, exclusion constraint, automated test suite (`npm test`).

---

## 📄 License
Created for PrimeWave Lab Technical Assessment.
