# Borrow AnyThing — Hackathon MVP Upgrade Plan

**Status**: Approved
**Created**: 2026-11-04
**Mode**: Upgrade existing application

## 1. Project Overview

Upgrade the existing Borrow AnyThing peer-to-peer lending marketplace into a polished, responsive hackathon MVP. Preserve the current React/Vite frontend, Express REST API, live frontend-to-API integration, seeded demo data, and local JSON persistence. Improve the complete listing-to-booking-to-return journey without introducing production payment processing, real identity verification, or claims of legal enforcement.

## 2. Goals & User Experience

- Make it easy for neighbors to find and borrow nearby items, and for owners to list and manage their items.
- Polish the marketplace and dashboard interfaces for desktop and mobile, with clear loading, empty, success, and error states.
- Surface simulated trust signals consistently: verification badges and a transparent demo trust score.
- Keep demo mode legible: checkout is an itemized escrow-style estimate only; no money moves, identity documents are not collected, and legal-review timestamps are demo records.
- Preserve the profile selector as the local demo identity mechanism; do not add sign-in infrastructure.

## 3. Services & Architecture

- **Frontend (`frontend/`)**: React 18, Vite, Tailwind CSS, Lucide React, Framer Motion, and Fluent UI v9 primitives where appropriate. Retain the existing API client seam and component organization; avoid replacing working screens wholesale.
- **Backend (`backend/`)**: Node.js ES modules and Express REST API. Keep route handlers separated by domain, add request validation, consistent error responses, and structured request/application logging.
- **Persistence**: Local JSON database in `backend/db/data.json`, accessed only through `backend/services/dbService.js`. Evolve the service API to `getAll`, `getById`, `create`, `update`, and `delete`; keep storage replaceable and avoid route-level file access.
- **Application services**: Existing Vite frontend and Express API remain separately runnable locally. No new cloud service or external identity/payment provider is required for this demo upgrade.

## 4. Data & API Design

- Preserve existing users, items, rentals, and disputes while adding or normalizing fields for trust score/badges, simulated verification, item availability, rental lifecycle timestamps/countdown data, and incident legal-review timestamps.
- Add backend validation for listing, date-range availability, booking, owner decisions, verification-demo actions, and incident reports. Return predictable client-safe errors and avoid exposing stack traces.
- Extend item search filters to include category, budget, and requested availability dates. Date availability must account for conflicting non-terminal bookings.
- Keep checkout math explicit and server-calculated: `daily rate × rental days`, plus refundable deposit, plus 10% platform fee. Return each line item and final estimate; label as simulated escrow with no charge.
- Keep owner-only actions for booking decisions, return state, and incident reports. A report creates a timestamped review record, marks the associated booking disputed/locked, suspends the renter in demo state, and prevents further bookings by that user.
- Maintain the current REST API contracts where practical; add or version endpoints only where needed for the new interactions.

## 5. Core Features & Workflows

- **Marketplace**: Instant search and filters for category, maximum daily budget, and date availability; polished listing cards and details; loading and no-results states.
- **Trust**: Show verified phone/ID demo badges and a trust score with an understandable, non-authoritative basis. Verification is simulated with no sensitive documents or real SMS/identity-provider calls.
- **Checkout**: An accessible modal with dates, rental-day calculation, itemized subtotal, deposit, 10% fee, total, and clear simulated-escrow/no-payment disclosure.
- **Owner and borrower dashboards**: Keep dual views and owner decisions (approve/decline, picked up, returned), earnings summary, renter checkout summary, booking status, pickup/dropoff guidance, and countdown to the return date.
- **Safety incident flow**: Let the owner report not-returned or stolen incidents; timestamp the report and legal-review notice state, suspend the borrower, lock the booking against normal transitions, and display the case in the review queue. Clearly mark the flow as a demo and not legal advice or an actual legal notice.
- **Listing management**: Preserve item creation and the existing owner profile workflow; add validation and usability improvements without disrupting seeded demo data.

## 6. Design System & UI

- **Component Library**: Fluent UI v9.
- Retain Tailwind CSS for responsive layout, spacing, and the existing Borrow AnyThing visual identity; use Fluent UI v9 for accessible controls and dialogs where it fits naturally.
- Use Lucide React for consistent icons and Framer Motion for restrained, reduced-motion-aware transitions.
- Establish reusable patterns for navigation, cards, badges, status chips, forms, dialogs, tables/summary panels, toasts, skeletons, and responsive dashboard layouts.
- Ensure keyboard access, visible focus, semantic labels, sufficient contrast, reduced-motion support, and mobile-friendly touch targets.
- Build on the existing warm green/neighborhood palette and typography rather than introducing an unrelated visual theme.

## 7. Reliability, Safety & Validation

- Validate and normalize all API inputs; centralize 4xx/5xx mapping and return structured error payloads with request correlation context.
- Add structured logs for requests, validation failures, persistence failures, and important booking/report transitions. Do not log secrets or sensitive identity information.
- Keep simulated verification, trust score, escrow, and legal-review status clearly labeled as demo-only; never collect ID images or represent the app as actually holding funds or issuing legal notices.
- Add or update backend tests for validation, availability conflicts, fee calculation, owner authorization, report effects, suspension, booking locks, and JSON repository operations.
- Run backend tests and the Vite production build; manually verify the marketplace and both dashboard roles at mobile and desktop widths.

## 8. Delivery & Constraints

- Upgrade in place; preserve the current repository layout, working routes, JSON seed dataset, API client seam, and local run instructions unless a change is needed for the agreed features.
- Deliver a coherent hackathon demo that works locally with the existing Node.js/npm workflow.
- Do not add a real payment processor, production authentication, real KYC/SMS verification, cloud database, geocoding/maps dependency, or actual legal-service integration.
- Document demo limitations, environment configuration, run/test commands, and the fact that checkout and verification are simulations.
