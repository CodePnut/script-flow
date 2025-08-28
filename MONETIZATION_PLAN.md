# Monetization Plan: Auth and Billing Integration

This document outlines the strategy and implementation steps for adding user authentication and Stripe billing to the Script Flow application.

**Libraries to be Used:**
- **Authentication:** **Auth.js (NextAuth.v5)** (`/nextauthjs/next-auth`)
- **Billing:** **Stripe** (`/stripe/stripe-node` and `@stripe/react-stripe-js`)

---

## Phase 1: Passwordless Authentication (Magic Link)

We will use Auth.js with the Email Provider for passwordless authentication. This allows users to sign in via a magic link sent to their email, which is secure and user-friendly.

### 1.1. Database Schema Changes (`prisma/schema.prisma`) - **REVISED**

Here is the revised schema. It merges the necessary Auth.js and Stripe fields into your existing `User` and `Transcript` models and adds the required new models. This is fully compatible with your current setup.

```prisma
// 1. Add an enum for user roles
enum UserRole {
  USER
  ADMIN
}

// 2. MERGE new fields into the existing User model
model User {
  id            String       @id @default(cuid())
  name          String?      // Field for Auth.js
  email         String?      @unique
  emailVerified DateTime?    // Field for Auth.js
  image         String?      // Field for Auth.js
  role          UserRole     @default(USER)
  
  // Relationships for Auth.js
  accounts      Account[]
  sessions      Session[]

  // Stripe fields for Phase 2
  stripeCustomerId       String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId   String?   @unique @map("stripe_subscription_id")
  stripePriceId          String?   @map("stripe_price_id")
  stripeCurrentPeriodEnd DateTime? @map("stripe_current_period_end")

  // Keep existing fields and relations
  transcripts Transcript[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("users")
}

// 3. Add new models required by Auth.js
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// 4. CONFIRM relation in existing Transcript model (no changes needed)
// The plan requires a relation between User and Transcript.
// Your schema already has this, so no changes are needed here.
// model Transcript { ... }
```

### 1.2. Implementation Steps

1.  **Install Dependencies:**
    ```bash
    npm install next-auth @auth/prisma-adapter
    ```
2.  **Create Auth Configuration (`src/lib/auth.ts`):**
    - Set up Auth.js with the Prisma adapter and the Email (passwordless) provider.
3.  **Create API Route (`src/app/api/auth/[...nextauth]/route.ts`):**
    - Export the `GET` and `POST` handlers from the auth configuration.
4.  **Update Environment Variables (`.env.local`):**
    - Add `AUTH_SECRET` for signing tokens.
    - Add `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, etc., for the email provider.
5.  **Update UI (`src/components/Navbar.tsx`):**
    - Add "Sign In" and "Sign Out" buttons.
    - Display user information when logged in.
6.  **Protect Routes:**
    - Use the `auth()` middleware to protect pages and API routes that require authentication (e.g., `/dashboard`, `/transcribe`).

---

## Phase 2: Stripe Integration for Usage-Based Billing

We will integrate Stripe to manage subscriptions and bill users based on their transcription usage.

### 2.1. Pricing Model

-   **Free Tier:** 3 free transcriptions per month.
-   **Pro Tier:** $10/month for unlimited transcriptions.

### 2.2. Database Schema Changes (`prisma/schema.prisma`)

-   Add Stripe-related fields to the `User` model (as shown in section 1.1). These fields will track the user's subscription status.

### 2.3. Implementation Steps

1.  **Install Dependencies:**
    ```bash
    npm install stripe @stripe/react-stripe-js @stripe/stripe-js
    ```
2.  **Create Pricing Page (`src/app/pricing/page.tsx`):**
    - Display the Free and Pro tiers.
    - Include a "Subscribe" button that initiates the Stripe Checkout session.
3.  **Create API Route for Stripe Checkout (`src/app/api/billing/checkout/route.ts`):**
    - Create a Stripe Checkout Session for the selected plan.
    - Redirect the user to the Stripe-hosted checkout page.
4.  **Create API Route for Stripe Webhooks (`src/app/api/stripe/webhooks/route.ts`):**
    - Listen for events from Stripe (e.g., `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`).
    - Update the user's subscription status in the database based on these events.
5.  **Create API Route for Billing Management (`src/app/api/billing/manage/route.ts`):**
    - Create a Stripe Customer Portal session to allow users to manage their subscription (e.g., update payment method, cancel plan).
6.  **Update Settings Page (`src/app/settings/page.tsx`):**
    - Add a "Manage Billing" button that calls the billing management API route.

---

## Phase 3: Usage Tracking and Feature Gating

This phase connects authentication and billing to the core application logic.

### 3.1. Implementation Steps

1.  **Associate Transcriptions with Users:**
    - When a user creates a transcription, associate it with their `userId` in the database.
2.  **Implement Usage Check (`src/app/api/transcribe/route.ts`):**
    - Before processing a transcription request, check the user's authentication status.
    - If the user is on the Free Tier, count their transcriptions for the current month.
    - If the quota is exceeded, return a `429 Too Many Requests` error and prompt them to upgrade.
3.  **Update UI:**
    - On the dashboard and transcribe page, display the user's current usage and remaining quota.
    - Show prompts to upgrade to the Pro Tier where appropriate.

---

## File Breakdown

### New Files

| Path                                                 | Description                                      |
| ---------------------------------------------------- | ------------------------------------------------ |
| `MONETIZATION_PLAN.md`                               | This plan.                                       |
| `src/lib/auth.ts`                                    | Auth.js configuration.                           |
| `src/app/api/auth/[...nextauth]/route.ts`            | Auth.js API route handlers.                      |
| `src/app/pricing/page.tsx`                           | Displays pricing tiers and checkout buttons.     |
| `src/app/api/billing/checkout/route.ts`              | Creates Stripe Checkout sessions.                |
| `src/app/api/stripe/webhooks/route.ts`               | Handles incoming webhooks from Stripe.           |
| `src/app/api/billing/manage/route.ts`                | Creates Stripe Customer Portal sessions.         |

### Modified Files

| Path                               | Description                                                              |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `prisma/schema.prisma`             | Add new models and fields for auth and billing.                          |
| `.env.local`                       | Add `AUTH_SECRET`, `EMAIL_*`, and `STRIPE_*` environment variables.      |
| `src/app/layout.tsx`               | Wrap in `SessionProvider` from NextAuth.js.                              |
| `src/components/Navbar.tsx`        | Add Sign In/Out buttons and user profile display.                        |
| `src/app/settings/page.tsx`        | Add "Manage Billing" button.                                             |
| `src/app/api/transcribe/route.ts`  | Add usage tracking and feature gating logic.                             |

---

## Next Steps

1.  **Approve Plan:** Review and approve this plan.
2.  **Implementation:** Begin with Phase 1: Authentication.
3.  **Testing:** Thoroughly test each phase before moving to the next.
