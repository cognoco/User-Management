# Product Requirements Document: Pluggable User Management System

**Version:** 1.0
**Status:** Approved
**Author:** Ridcully, Product Manager

## 1. Introduction

### 1.1 Purpose
This document provides the detailed technical and functional requirements for the **Pluggable User Management System**. It represents the single source of truth for the project, merging previous drafts and analyses to guide development, architecture, and testing.

### 1.2 Product Vision & Business Goals
The core vision is to create a single, modular, and marketable asset that solves user management comprehensively, eliminating the need to rebuild it for future products. This strategy is divided into two distinct horizons:

- **Horizon 1 (Foundational Core Module):** The immediate goal is to develop a robust, secure, and reusable user management module to serve as a core component in the **customer-facing products we build.** This allows us to create a battle-tested solution that meets our own high standards for security and developer experience. This horizon is itself staged, starting with a core MVP and iterating towards a complete foundational module.
- **Horizon 2 (External Product):** The long-term vision is to evolve this proven foundational module into a fully-featured, enterprise-grade, marketable product.

This approach will drastically reduce time-to-market for new applications and establish a secure, trusted standard for user identity.

### 1.3 Scope Definition
To manage development and clearly communicate priorities, all features are explicitly tagged to delineate scope according to the two-horizon strategy.

- **`[Scope: H1-MVP]`**: Features required for the **Minimum Viable Product**. This initial version focuses on delivering a standalone solution for personal user identity, authentication, and subscription management for a host application.
- **`[Scope: H1-Core]`**: Features required for the **Completed Foundational Module**. These build upon the MVP to support our more complex products, including team structures and core compliance capabilities.
- **`[Scope: H2-Enterprise]`**: Features required for the **External Enterprise Product**. These are the advanced, extensible, and customizable features needed to package and sell the solution to third-party customers.

---

## 2. Core Architectural Principles

These principles are **NON-NEGOTIABLE** and foundational to the project's success as a "pluggable" and maintainable module. They must be adhered to throughout the development lifecycle and override any conflicting, less-specific architectural statements.

- **Strict Separation of Concerns:** Business logic, data access, and UI MUST be rigidly separated into distinct layers. UI components MUST NOT contain business logic.
- **Interface-First & Pluggable Service Architecture:** The architecture's success hinges on true service interchangeability. This principle is an unbreakable law.
  - **Service Contracts:** Before implementing any provider-specific code, the team MUST define provider-agnostic service contracts (e.g., `IAuthService`, `IPaymentService`) in pure TypeScript. These interfaces MUST use internally-defined data structures (e.g., a `UserSession` object), not vendor-specific pass-through objects.
  - **Mock-Based Verification:** To prove the abstraction is genuine, a mock implementation of each interface (e.g., an in-memory `MockAuthService`) MUST be created and used in tests alongside the primary adapter (e.g., `SupabaseAuthAdapter`). The ability to swap these implementations interchangeably is the primary measure of success for this principle. The definition of "done" for any feature is that its tests pass with *both* the primary service adapter and the mock adapter. A feature that fails with the mock is considered broken, as this indicates a leaky abstraction. This is the project's primary quality gate against vendor lock-in.
- **Pragmatic UI: Headless Core & Wrapped Vendor Elements:**
  - **Tier 1 (Core UI):** The headless pattern MUST be used for all standard, non-critical UI components (forms, buttons, modals, layouts) to ensure design consistency and customizability by the host application.
  - **Tier 2 (Sensitive Inputs):** For high-risk, security-critical elements, specifically payment card collection, the system MUST delegate to the vendor's battle-tested components (e.g., Stripe Elements). These vendor components should be wrapped in our own styled containers to control their appearance, but their core functionality MUST NOT be rebuilt. This gives us aesthetic control without inheriting unnecessary risk.
- **Configuration-Driven Services:** The keystone of the pluggable architecture is configuration. The runtime selection of a service provider MUST be handled via environment variables. For example, `AUTH_PROVIDER="supabase"` will instruct the system's service container to instantiate the `SupabaseAuthAdapter` for the `IAuthService` interface. This makes the "how" of pluggability explicit and testable.
- **Absolute Import Paths:** All internal imports MUST use absolute paths (`@/components`, `@/lib`, etc.) to prevent fragile relative pathing (`../..`).

---

## 3. User Personas

- **End-User (Personal):** An individual using a host application for personal reasons. They are motivated by a simple, fast, and secure way to manage their own identity and profile. They expect intuitive interfaces and clear communication.
- **End-User (Business):** An individual using a host application as part of their job. They belong to a team or organization within the system. Their priority is efficiency and clear role-based access.
- **Team Admin:** A business user responsible for managing their team's members, settings, and potentially billing within the host application. They need clear dashboards and powerful, unambiguous controls.
- **Application Developer:** A developer at a company that is integrating this User Management module into their own product. They require clear APIs, hooks, excellent documentation, and the ability to customize the UI to match their brand.
- **System Owner:** The business or product owner of the host application. They are concerned with security, compliance, user retention, and overall system administration.

---

## 4. Functional Requirements & User Journeys

This section details the specific features, user journeys, and technical requirements.

### 4.1 Foundational Authentication & Profile (`[Scope: H1-MVP]`)

#### 4.1.1 Personal User Registration
- **User Story:** As a new user, I want to create a personal account quickly and securely so that I can access the application.

- **User Journey & UI Requirements:**
  1. User accesses the "Sign Up" page.
  2. The UI presents a form with fields: `First Name`, `Last Name`, `Email Address`, `Password`, `Confirm Password`.
  3. While typing in the `Password` field, the UI must provide clear, real-time feedback indicating which of the password strength requirements have been met.
  4. **Implementation Note:** The mechanism for providing this real-time feedback must adhere strictly to the Core Architectural Principles (Section 2), particularly 'Separation of Concerns' and 'Headless UI'. The final pattern will be defined during the architectural design phase to ensure business logic is not duplicated on the front end.
  5. A mandatory checkbox for "I agree to the Terms and Conditions and Privacy Policy" is present. The text "Terms and Conditions" and "Privacy Policy" **MUST** be clickable links opening in a new tab.
  6. The "Register" button should be disabled until the T&C checkbox is checked.

- **API Specification (`POST /api/auth/register`):**
  - **On Success (200 OK):**
    - The handler for this endpoint will invoke the `IAuthService.register()` method.
    - A new user record is created in the database.
    - An email with a secure, time-limited verification link is sent to the user's email address.
    - The user is **NOT** logged in.
  - **On Error:**
    - `400 Bad Request` (Error Code: `validation/invalid_input`): For client-side validation failures (e.g., invalid email format, password mismatch, empty fields, password policy violation). The UI **MUST** display specific error messages directly below the relevant fields.
    - `409 Conflict` (Error Code: `auth/email_exists`): If the email address already exists. The UI **MUST** display: "An account with this email address already exists. Please [Login Link] or use a different email."
    - `429 Too Many Requests`: For rate-limiting violations.

- **Acceptance Criteria:**
  - GIVEN a user fills the form correctly and checks the T&C, WHEN they submit, THEN the system creates a new user record, sends a verification email, and displays the success message.
  - GIVEN a user submits a form with an email that already exists, THEN the API returns a `409 Conflict` and the UI shows the corresponding error.
  - GIVEN a user submits a form with a password that does not meet policy, THEN the API returns a `400 Bad Request` and the UI shows the corresponding error.
  - GIVEN a user attempts to register, any leading/trailing whitespace in inputs MUST be trimmed before validation.

#### 4.1.2 User Login
- **User Story:** As a returning user, I want to log in securely with my email and password so that I can access my account.

- **User Journey & UI Requirements:**
  1. User accesses the "Login" page.
  2. The UI presents a form with fields: `Email Address`, `Password`.
  3. Helper links for "Forgot Password?" and "Don't have an account? Sign Up" are present.

- **API Specification (`POST /api/auth/login`):**
  - **On Success (200 OK):**
    - The handler will invoke the `IAuthService.login()` method, which validates credentials and returns session tokens (e.g., JWT in an httpOnly cookie).
    - The user is redirected to their personal dashboard (`/dashboard`).
  - **On Error:**
    - `401 Unauthorized` (Error Code: `auth/invalid_credentials`): For invalid email/password combination. UI **MUST** show a generic message: "Invalid email address or password. Please try again."
    - `403 Forbidden` (Error Code: `auth/unverified`): If the user's account is not yet verified. UI **MUST** show: "Your account is not verified. Please check your email for the verification link. [Resend Verification Link]".
    - `403 Forbidden` (Error Code: `auth/account_locked`): After 5 failed login attempts. UI **MUST** show: "Your account has been temporarily locked due to too many failed login attempts. Please try again later or reset your password."

- **Acceptance Criteria:**
  - GIVEN a verified user with valid credentials, WHEN they log in, THEN the system successfully integrates with the configured IAuthService implementation to validate the user and returns a 200 OK with session tokens, redirecting the user to their dashboard.
  - GIVEN a user with invalid credentials, WHEN they attempt to log in, THEN the API returns a `401 Unauthorized` and the UI shows the correct error.
  - GIVEN an unverified user, WHEN they attempt to log in, THEN the API returns a `403 Forbidden` and the UI prompts them to verify their email.
  - GIVEN a user provides their email, it MUST be treated as case-insensitive, while the password MUST be case-sensitive.
  - AFTER 5 failed login attempts for a single account, that account MUST be temporarily locked for 15 minutes.
  - **Implementation Note:** This account-specific lockout mechanism serves as an inner layer of defense against brute-force attacks. It is distinct from and operates in addition to the general, IP-based rate limiting on the endpoint (as defined in NFR 6.1). The general rate limiter acts as the outer defense layer to prevent volumetric attacks.

#### 4.1.3 User Logout
- **User Story:** As a logged-in user, I want to securely log out to protect my account.
- **User Journey & UI Requirements:**
  1. A "Logout" option must be clearly accessible within a user profile menu or similar persistent UI element for authenticated users.
- **API Specification (`POST /api/auth/logout`):**
  - The API endpoint handler invalidates the user's session token on the server-side by invoking the `IAuthService.logout()` method.
  - On Success (200 OK), the client-side session is cleared, and the user is immediately redirected to the public home page or login page.
- **Acceptance Criteria:**
  - GIVEN a logged-in user, WHEN they click "Logout", THEN their server session is terminated, and they are redirected to the login page.

#### 4.1.4 Token Handling & Middleware
- **User Story:** As a developer, I want all protected routes to be secured by default, redirecting any unauthenticated access to the login page to ensure application security.
- **Logic & Requirements:**
  1. Middleware **MUST** protect all authenticated routes/endpoints by calling an `IAuthService.validateSession()` method.
  2. If an unauthenticated user attempts to access a protected route, they **MUST** be redirected to the login page.
  3. If a logged-in user's session token expires, their next API request to a protected endpoint **MUST** result in a `401 Unauthorized` response (Error Code: `auth/session_expired`).
  4. The client-side application **MUST** handle the `401 Unauthorized` response by clearing any local session data and redirecting the user to the login page with a message: "Your session has expired. Please log in again."
- **Acceptance Criteria:**
  - GIVEN an unauthenticated user, WHEN they attempt to navigate directly to `/dashboard`, THEN they are redirected to `/login`.
  - GIVEN a user with an expired session token, WHEN they take an action that calls a protected API, THEN the API returns `401 Unauthorized` and the UI redirects them to `/login`.

#### 4.1.5 Password Reset
- **User Story:** As a user who forgot their password, I want to securely reset it via email so I can regain access to my account.
- **User Journey & API Flow:**
  1. User clicks "Forgot Password?" on the login page and is taken to a form with a single `Email Address` field.
  2. User submits their email to `POST /api/auth/reset-password`. The endpoint handler will invoke the `IAuthService.requestPasswordReset()` method. This endpoint **MUST** be rate-limited.
  3. The API **ALWAYS** returns a generic `200 OK` message ("If an account exists for [email], you will receive a password reset link.") to prevent user enumeration.
  4. A secure, single-use, time-limited token is generated and emailed to the user.
  5. User clicks the link, which directs them to a "Set New Password" page containing the token in the URL.
  6. The page presents `New Password` and `Confirm New Password` fields. The dynamic password strength helper **MUST** be present and function as defined in the registration feature.
  7. User submits the new password and the token to `POST /api/auth/update-password`. The endpoint handler will invoke the `IAuthService.updatePasswordWithResetToken()` method.
- **API & Feedback:**
  - **On Success (200 OK):** The user's password is updated. The UI shows "Password updated successfully!" and redirects to the Login page.
  - **On Error (`POST /api/auth/update-password`):**
    - `400 Bad Request` (Error Code: `auth/invalid_reset_token`): For invalid, expired, or already-used tokens. UI shows: "This password reset link is invalid or has expired."
    - `400 Bad Request` (Error Code: `validation/password_mismatch`): If passwords don't match.
- **Acceptance Criteria:**
  - GIVEN a user requests a password reset, WHEN they submit their email, THEN the API always returns a `200 OK` and sends an email if the user exists.
  - GIVEN a user with a valid reset token, WHEN they submit a valid new password, THEN the password is changed and they are redirected to login.
  - GIVEN a user with an invalid or expired token, WHEN they attempt to reset their password, THEN the API returns a `400 Bad Request` and the UI shows the correct error.

#### 4.1.6 Email Verification
- **User Story:** As a new user, I want to verify my email address by clicking a link so that I can activate my account and log in.
- **User Journey & API Flow:**
  1. An unverified user is prompted to verify their email, with an option to trigger `POST /api/auth/send-verification-email`, which invokes `IAuthService.resendVerificationEmail()`, to resend the link. This endpoint **MUST** be rate-limited.
  2. User clicks the unique, time-limited verification link in the email, which points to the verification page with the token: `/verify-email?token=[token]`.
  3. The page automatically calls `GET /api/auth/verify-email?token=[token]`, which invokes the `IAuthService.verifyEmail()` method, on load.
- **API & Feedback:**
  - **On Success (200 OK):** The token is validated, and the user's account is marked as `verified` in the database. The UI shows "Email verified successfully! You can now log in." and provides a prominent "Login" button.
  - **On Error (`GET /api/auth/verify-email`):**
    - `400 Bad Request` (Error Code: `auth/invalid_verification_token`): For invalid or expired links. The UI shows: "This verification link is invalid or has expired. Please request a new one."
- **Acceptance Criteria:**
  - GIVEN a new user, WHEN they click the verification link in their email, THEN their account is marked as verified, and the UI displays a success message.
  - GIVEN a user clicks an expired or invalid link, THEN the UI displays the correct error message.

#### 4.1.7 Profile Management
- **User Story:** As a logged-in user, I want to view and update my personal information and avatar so that my profile is accurate and personalized.
- **User Journey & API Flow:**
  1. User navigates to their "Profile" or "Account Settings" page. The page calls `GET /api/profile`, which invokes `IProfileService.getProfile()`, to load their current data.
  2. The UI displays their `First Name`, `Last Name`, and `Bio` in a read-only view.
  3. User enters an "edit" mode to update these text fields.
  4. User can trigger a file upload flow for their `Avatar`.
  5. On save, the updated data is sent via `PATCH /api/profile`, which invokes `IProfileService.updateProfile()`.
- **API Specification:**
  - `GET /api/profile`: Its handler invokes `IProfileService.getProfile()` and returns the current user's profile data (`firstName`, `lastName`, `bio`, `avatarUrl`).
  - `PATCH /api/profile`: Its handler invokes `IProfileService.updateProfile()` and accepts `firstName`, `lastName`, and `bio`.
  - `POST /api/profile/avatar`: Handles avatar image upload. Its handler invokes `IProfileService.updateAvatar()`. Client-side validation for file type (JPEG, PNG) and size (< 2MB) **MUST** be performed before upload to improve user experience. The server **MUST** independently re-validate these constraints and perform content sniffing to ensure the file is a valid image, rejecting any non-compliant uploads.
- **Acceptance Criteria:**
  - GIVEN a logged-in user, WHEN they navigate to the profile page, THEN their current information is displayed.
  - GIVEN the user updates their name or bio and clicks save, THEN the new information is persisted and reflected in the UI.
  - GIVEN the user uploads a valid avatar image, THEN the new avatar is displayed and associated with their profile.

#### 4.1.8 Account Deletion
- **User Story:** As a user, I want to permanently delete my account and all associated data so that I have control over my personal information.
- **User Journey & UI Requirements:**
  1. The option to "Delete Account" is available within the "Account Settings" or "Security" section.
  2. Clicking "Delete Account" **MUST** open a confirmation modal or navigate to a dedicated confirmation page.
  3. The confirmation dialog must clearly state that this action is permanent and irreversible.
  4. To confirm, the user **MUST** type their password or a specific phrase (e.g., "DELETE MY ACCOUNT") into a text field. The confirmation button remains disabled until this is done.
- **API Specification (`DELETE /api/account`):**
  - Requires the user's current password in the request body for verification.
  - On success, the API handler invokes the `IUserService.deleteAccount()` method, which begins the data erasure process as defined by the data retention policy (anonymization or hard delete).
- **Acceptance Criteria:**
  - GIVEN a user wishes to delete their account, WHEN they complete the multi-step confirmation process, THEN their account is queued for deletion and they are logged out.

#### 4.1.9 Account Security Management (`[Scope: H1-MVP]`)
- **Goal:** Allow a logged-in user to securely manage their primary credentials.

- **Change Password:**
  - **User Story:** As a logged-in user, I want to change my password so I can maintain account security.
  - **User Journey & UI Requirements:**
    1. A "Change Password" option is available in the "Account Settings" or "Security" section.
    2. The UI presents a form with fields: `Current Password`, `New Password`, `Confirm New Password`.
    3. The dynamic password strength helper **MUST** be present for the `New Password` field.
  - **API Specification:**
    - An endpoint (`PATCH /api/profile/password`) requires the user's current password for verification before updating to the new one.
  - **Acceptance Criteria:**
    - GIVEN a user provides their correct current password and a valid new password, THEN the password is changed successfully.

- **Change Email Address:**
  - **User Story:** As a logged-in user, I want to change my primary email address and verify the new one to ensure my contact information is up to date.
  - **Security Requirement:** The email change process **MUST** involve a verification step for the new email address to prevent account takeover.
  - **User Journey & API Flow:**
    1. User enters a new email address in their profile settings and submits it to a dedicated endpoint (`POST /api/profile/change-email`).
    2. The API sends a time-limited verification link to the *new* email address. The user's primary email address is **NOT** yet changed. The UI informs the user to check their new inbox.
    3. When the user clicks the link, it triggers a verification endpoint (`GET /api/profile/verify-new-email?token=[token]`).
    4. On successful token validation, the user's primary email address is updated in the database.
    5. A confirmation notification **MUST** be sent to the user's *old* email address upon successful completion.
  - **Acceptance Criteria:**
    - GIVEN a user requests to change their email, THEN a verification link is sent to the new address and the old address remains active.
    - GIVEN the user clicks the verification link sent to the new address, THEN their primary email is updated, and a notification is sent to the old address.

#### 4.1.10 Advanced Authentication Onboarding (`[Scope: H1-MVP]`)
- **Goal:** Allow users to log in using modern, convenient, and secure methods by integrating with the default authentication provider's capabilities.
- **Features:**
    - **Multi-Factor Authentication (MFA):** The system will integrate with the auth provider's MFA capabilities. The UI will provide the necessary flows for users to enroll a second factor (e.g., TOTP authenticator app), verify it during login, and manage recovery codes.
    - **SSO Login/Registration (Google, GitHub):** The system will integrate with the auth provider's support for third-party identity providers. The UI will include "Sign in with Google" and "Sign in with GitHub" buttons, and the backend will handle the OAuth callback flow to register or log in the user.

### 4.2 Monetization & Billing (`[Scope: H1-MVP]`)

#### 4.2.1 Subscription & Billing Engine
- **Goal:** Provide a flexible and secure backend engine for a host application to manage user subscriptions. The long-term goal is to support multiple payment providers.
- **H1 Implementation Strategy:** For Horizon 1, this will be realized by integrating with Stripe as the default payment provider via a dedicated service module. The specific integration pattern (e.g., redirect-to-checkout vs. embedded elements) will be an architectural decision.

- **API Specification:**
  - **Create Checkout Session (`POST /api/billing/checkout`)**
    - **Description:** An authenticated endpoint for the host application to create a Stripe Checkout session for a specific price ID. Its handler invokes the `IPaymentService.createCheckoutSession()` method.
    - **Request Body:** `{ priceId: string }`
    - **On Success (200 OK):** Returns `{ "url": "https://checkout.stripe.com/..." }`. The host application is responsible for redirecting the user to this URL.
    - **Use Case:** A user in the host application clicks "Subscribe" or "Upgrade". The host app calls this endpoint and redirects the user to Stripe to complete the payment.

  - **Create Customer Portal Session (`POST /api/billing/portal`)**
    - **Description:** An authenticated endpoint for the host app to generate a link to the Stripe Customer Portal, allowing users to manage their existing subscriptions. Its handler invokes the `IPaymentService.createCustomerPortalSession()` method.
    - **On Success (200 OK):** Returns `{ "url": "https://billing.stripe.com/p/..." }`. The host application is responsible for redirecting the user to this URL.
    - **Use Case:** A user clicks a "Manage Billing" or "Manage Subscription" button in the host application.

  - **Webhook Handler (`POST /api/webhooks/stripe`)**
    - **Description:** A public endpoint to receive and process webhook events from Stripe. The handler for this endpoint will invoke methods on the `IPaymentService` such as `handleSubscriptionChange()` after validating the webhook. This is critical for keeping the local database in sync with Stripe's data.
    - **Security:** The endpoint **MUST** validate the `Stripe-Signature` header to verify the event originated from Stripe.
    - **Idempotency:** The endpoint **MUST** be designed to handle duplicate events gracefully.
    - **Events to Handle:**
      - `checkout.session.completed`: When a user successfully subscribes. The handler must create or update the user's subscription record in the local database, storing the Stripe customer ID and subscription status.
      - `customer.subscription.updated`: When a subscription changes (e.g., upgrade, downgrade, cancellation). The handler must update the local subscription record accordingly.
      - `customer.subscription.deleted`: When a subscription ends. The handler must update the local subscription record.

  - **Get Subscription Status (`GET /api/subscription/status`)**
    - **Description:** An authenticated endpoint for the host app to fetch the current user's subscription status from the local database (not by calling Stripe directly). Its handler invokes `IPaymentService.getSubscriptionStatus()`.
    - **On Success (200 OK):** Returns the user's current subscription details, including `planId`, `status` (e.g., 'active', 'canceled', 'past_due'), `currentPeriodEndDate`, etc.
    - **Use Case:** The host application calls this endpoint to determine if a user should have access to premium features.

- **Acceptance Criteria:**
  - GIVEN a host application, it can successfully initiate and manage subscription sessions for its authenticated users via the provided API endpoints.
  - GIVEN a payment provider webhook event is sent, the webhook handler correctly validates it, processes it, and updates the local user subscription data.
  - GIVEN a user has an active subscription, the host application can retrieve that user's subscription status via the API.

---

## 5. Future Horizon Scope

This section outlines features that are part of the full product vision but are not required for the initial MVP. They are prioritized to guide future development phases.

### 5.1 Horizon 1: Completed Foundational Module (`[Scope: H1-Core]`)
These features represent the primary evolutionary path for the product beyond the MVP, completing the vision for a comprehensive foundational module for our products.

#### 5.1.1 Business & Team Management
- **Goal:** Allow users to create and manage a business entity (organization/team) within the host application.
- **Features:**
    - **Business Account Registration:** A flow for a user to register a new Business account/organization, defining an organization name and creating the initial administrator.
    - **Team Member Invitations:** An organization administrator can invite new users to their team via email. This includes flows for sending, revoking, and accepting invitations.
    - **Team Member Management:** Admins can view a list of all team members, see their role and status, and remove members from the team.
    - **"Last Admin" Logic:** The system **MUST** prevent the removal or role demotion of a team's last remaining administrator to avoid orphaning the organization.

#### 5.1.2 User-Facing Activity Log
- **Goal:** Provide users with transparency and control over their account security.
- **Feature:** A "My Activity" or "Session History" page in the user's account settings that displays a log of security-sensitive events, such as:
    - Successful logins (including date, approximate location, and device/browser).
    - Failed login attempts.
    - Password changes.
    - New device/browser authentications.

#### 5.1.3 Advanced Authentication
- **Goal:** Enhance security and provide more flexible login options for users.
- **Features:**
    - **Account Linking:** Allow a user who has registered with a password to link an SSO provider to their account, and vice-versa, so they can log in with either method.
    - **Passkey/Biometric Login (WebAuthn):** Allow users to log in faster and more securely using their device's built-in authenticators (e.g., fingerprint, face recognition) via the WebAuthn standard, commonly known as "Passkeys". This provides a convenient, passwordless login experience.
    - A user **MUST NOT** be able to disconnect the last remaining authentication method (e.g., if they only have Google SSO login and no password). The UI must prompt them to set a password before they can disconnect the final login provider.

#### 5.1.4 Comprehensive Account Recovery
- **Goal:** Provide a secure way for users to regain access to their account if they lose their primary credentials and MFA device.
- **Feature:** A defined, secure account recovery flow that goes beyond a simple password reset. This may involve identity verification through secondary email, answering pre-set security questions, or a manual support intervention process.

### 5.2 Horizon 2: External Enterprise Product (`[Scope: H2-Enterprise]`)
These are high-value, enterprise-grade features that will be prioritized for the marketable, third-party version of the product.

#### 5.2.1 Advanced Access Control (ABAC)
- **Goal:** Implement a more powerful and flexible permission system for business accounts.
- **Feature:** An Attribute-Based Access Control (ABAC) system where permissions are not just tied to static roles (RBAC) but can be defined by rules and policies based on user attributes, resource attributes, and context. This will be critical for complex enterprise scenarios.

#### 5.2.2 Platform Extensibility & Customization
- **Goal:** Provide the tools for customers to deeply integrate and customize the platform to fit their specific needs.
- **Features:**
    - **Custom Data Schemas:** Provide a mechanism for customers to extend core data models (like Users and Organizations) with their own custom fields and attributes.
    - **Pluggable Business Logic:** Enable customers to inject their own logic into core workflows (e.g., via webhooks triggered on events like user registration or payment failure).
    - **Developer SDKs:** Offer comprehensive SDKs for various languages and frameworks to facilitate seamless integration and interaction with the platform's APIs.
    - **UI Theming & White-Labeling:** Allow for deep customization of the user interface components to match the customer's brand identity.

---

## 6. Non-Functional Requirements (NFRs)

- **Security:**
    - **Password Policy (`[Scope: H1-MVP]`):** Passwords must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character.
    - **Data Encryption (`[Scope: H1-MVP]`):** All data in transit must be encrypted (eg.via HTTPS/TLS 1.2+). All sensitive data at rest (e.g., passwords, API keys) must be securely hashed using a modern, salted hashing algorithm (e.g., Argon2, bcrypt).
    - **Session Management (`[Scope: H1-MVP]`):** Session tokens must be securely stored (e.g., httpOnly cookies) and must have a defined, reasonable expiration time.
    - **Rate Limiting (`[Scope: H1-MVP]`):** Sensitive endpoints (login, password reset, registration, email verification resend) must be rate-limited to prevent abuse.
    - **PII Redaction (`[Scope: H1-Core]`):** All error details and audit logs accessible to admins or developers must have Personally Identifiable Information (PII) automatically redacted.
    - **Backend Audit Log (`[Scope: H1-MVP]`):** A secure, non-user-facing audit log must record critical security events (e.g., successful logins, failed logins, password changes, account deletions). This log is for internal security analysis.

- **Performance (`[Scope: H1-MVP]`):**
    - API response time for interactive user operations must be < 500ms at the 95th percentile.
    - Page load time (LCP) for all primary pages must be < 2 seconds.
    - **Note:** Performance targets will be re-evaluated and likely made more stringent for `[Scope: H2-Enterprise]`.

- **Reliability (`[Scope: H1-MVP]`):**
    - The system will have a target uptime of 99.9% for the **Foundational Core Module** (`[Scope: H1-Core]`). This will be increased to 99.99% for `[Scope: H2-Enterprise]`.

- **Testability (`[Scope: H1-MVP]`):**
    - The architecture must support isolated testing of each layer, using mock implementations for dependencies (e.g., database adapters, email services).

- **Documentation (`[Scope: H1-MVP]`):**
    - A clear "Getting Started" guide and API reference for the host application developer is a required deliverable for the MVP.

- **Accessibility (`[Scope: H1-MVP]`):**
    - All UI components must comply with WCAG 2.1 Level AA standards.

- **Regulatory Compliance (`[Scope: H1-MVP]`):**
    - The system must be designed to be geography-aware, enabling compliance with local data privacy and protection regulations, such as GDPR for European users. This serves as the overarching principle that drives the functional requirements for compliance.

---

## 7. Technology Stack
Current assumptions - to be finalized during architecture definition
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Component Primitives:** Shadcn UI
  - *Architectural Note: Shadcn UI is used to provide accessible, unstyled component primitives. Its "copy-paste" model allows us to have full control over the final implementation and styling, directly supporting our "Headless UI" and "custom-built" architectural principles.*
- **State Management:** Zustand
- **Backend/Database:** Supabase (as the default, initial implementation behind the database adapter interface)
- **Payment Provider:** Stripe
- **Testing:** Vitest, React Testing Library, Playwright (E2E)

---

## 8. Glossary

- **ABAC:** Attribute-Based Access Control
- **MFA:** Multi-Factor Authentication
- **MVP:** Minimum Viable Product
- **NFR:** Non-Functional Requirement
- **PII:** Personally Identifiable Information
- **PRD:** Product Requirements Document
- **RBAC:** Role-Based Access Control
- **SSO:** Single Sign-On 