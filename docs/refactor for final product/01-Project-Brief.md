# Project Brief: Pluggable User Management System

## 1. Project Summary

This document outlines a project with two distinct horizons of development for a sophisticated, pluggable User Management System.

**Horizon 1: Foundational Core Module.** The immediate goal is to develop a robust, secure, and reusable user management module to serve as a core component in the **customer-facing products we build.** This "build-it-for-our-products-first" approach will allow us to create a battle-tested solution that meets our own high standards for security, developer experience, and the demands of a live, commercial environment. This horizon is itself staged, starting with a core MVP and iterating towards a complete foundational module.

**Horizon 2: External Enterprise Product.** The long-term vision is to evolve this proven internal tool into a fully-featured, enterprise-grade, and marketable product. The ambition is to offer this as a standalone, third-party solution that is scalable, highly configurable, and reliable enough for external customers.

The critical principle guiding this project is **architectural foresight**. Every design and implementation decision made during Horizon 1 must be weighed against the requirements of Horizon 2. The system will be built from the ground up on a foundation of modularity and strict separation of concerns, ensuring the transition from a powerful internal tool to a commercial product can be achieved through extension and enhancement, not fundamental rework.

## 2. Business Goals & Objectives

*   **Primary Goal (MVP):** Deliver a secure, reusable personal identity module with billing capabilities. The MVP will be leveraging a parallel project building an internal solution called "CrowdPilot" as the reference implementation.
*   **Primary Goal (Full Vision):** Create a single, marketable asset that solves user management once, eliminating the need to rebuild it for future products.
*   **Reduce Time-to-Market:** Provide a robust, pre-built solution that can be "plugged into" new applications, drastically shortening development timelines.
*   **Establish a Secure Standard:** Build a system based on security best practices that serves as a trusted, reliable core for all applications that use it.
*   **Enable Flexible Business Models:** Support a variety of monetization strategies, including tiered subscriptions and metered (credit-based) billing.
*   **Developer-Friendly:** Design for ease of integration and customization, 
making it the preferred choice for internal and potentially external 
development teams.

## 3. Target Audience

1.  **Integrating Developers (Primary):** Developers of a host application who will integrate this module. For the MVP, this is the **CrowdPilot development team**. They need clear documentation, flexible configuration, and well-defined APIs.
2.  **Personal End-Users (Secondary):** Individuals signing up for an account on an application that uses this module. They expect a seamless, secure, and modern sign-up, login, and profile management experience.
3.  **Business End-Users (Post-MVP):** Employees or members of an organization using an application built with this module.
4.  **Business Administrators (Post-MVP):** Users responsible for managing their organization's team, billing, and security settings.

## 4. Functional Scope by Horizon

The project will be delivered across two distinct horizons, each building upon the last.

### 4.1. Horizon 1: Internal Foundational Tool

The primary focus of Horizon 1 is to build a complete, secure, and developer-friendly user management solution for our internal projects. It will be delivered in two stages.

#### 4.1.1. Stage 1: Minimum Viable Product (MVP)

The MVP will deliver a standalone solution for personal user identity, authentication, and subscription management for a host application.

*   **Responsive & Mobile-Optimized Design:** The entire UI is designed to be fully functional and user-friendly across desktop, tablet, and mobile devices.
*   **Core Personal User Journey:**
    *   **Registration:** Secure sign-up for personal accounts with password strength helpers.
    *   **Authentication:** Robust login/logout, "remember me" functionality, and session management.
    *   **Credential Management:** Secure flows for password reset and email verification.
    *   **Profile Management:** Users can manage a basic personal profile, including avatar upload.
*   **Account Linking:** Users can link multiple authentication methods (e.g., password, Google, GitHub) to their single master account, and manage these connections.
*   **Host Application Billing Engine:**
    *   **Stripe Integration:** All backend functionality required to use Stripe for subscription management.
    *   **Checkout Sessions:** An API endpoint for the host app to create a Stripe Checkout session.
    *   **Customer Portal:** An API endpoint for the host app to generate a link to the Stripe Customer Portal for subscription management and invoice access.
    *   **Webhook Handling:** A robust webhook listener to receive and process updates from Stripe (e.g., payment success, cancellation), ensuring the user's subscription status is always up-to-date in the module's database.

#### 4.1.2. Stage 2: Completed Internal Tool (Post-MVP)

Following the MVP, the tool will be expanded with features required to support more complex internal applications, including team structures and core compliance capabilities.

*   **Business & Team Management:**
    *   Business account registration.
    *   Team member invitation and management.
    *   Role-Based Access Control (RBAC) within teams.
    *   A dedicated Admin Console for team and company management.
*   **Compliance & Data Governance:**
    *   Geography-aware consent management (e.g., GDPR banners).
    *   Functionality to support Data Subject Rights requests (e.g., Right to Erasure).
*   **Platform & Integration Features:**
    *   Configurable notification system (Email, Push).
    *   Data export capabilities for users and businesses.

### 4.2. Horizon 2: External Enterprise Product

Once the internal tool is mature and battle-tested, Horizon 2 will focus on adding the features necessary to package, market, and sell it as a robust, third-party enterprise solution. The architectural foresight in Horizon 1 will ensure these features can be added as extensions rather than requiring a rewrite.

*   **Advanced Security & Enterprise Features:**
    *   Organization-wide security policies (enforced MFA, password rotation).
    *   Admin-level session management and revocation.
    *   Advanced, tiered rate-limiting capabilities.
*   **Expanded Monetization Models:**
    *   A credit-based system for metered billing of specific actions (e.g., API calls).
    *   Seat-based licensing for business tiers.
*   **Platform Extensibility & Customization:**
    *   **Custom Data Schemas:** Provide a mechanism for customers to extend core data models (like Users and Organizations) with their own custom fields and attributes.
    *   **Pluggable Business Logic:** Enable customers to inject their own logic into core workflows (e.g., via webhooks triggered on events like user registration or payment failure).
    *   **Developer SDKs:** Offer comprehensive SDKs for various languages and frameworks to facilitate seamless integration and interaction with the platform's APIs.
    *   **UI Theming & White-Labeling:** Allow for deep customization of the user interface components to match the customer's brand identity.

## 5. Core Non-Functional Scope & Architectural Principles

These are the fundamental rules that define the product's identity and cannot be compromised.

*   **Modularity & Pluggability:** The system MUST be designed as a modular component that can be integrated into any host application with minimal friction.
*   **Strict Separation of Concerns:** Business logic, data access, and UI are rigidly separated into distinct layers. UI components MUST NOT contain business logic.
*   **Interface-First Design:** All services and data providers are defined by TypeScript interfaces first, ensuring implementations are swappable.
*   **Database Agnosticism:** The architecture MUST NOT be tied to a specific database. An adapter pattern is used, with Supabase being the default, initial implementation.
*   **Headless UI:** UI components are built using a headless pattern, separating behavior (logic) from appearance (styling), allowing a host application to provide its own look-and-feel.
*   **Configuration & Feature Flags:** The module must be highly configurable, allowing services to be overridden and features to be toggled via feature flags.
*   **Security:** Adherence to best practices including HTTPS everywhere, secure password hashing, protection against common vulnerabilities (XSS, CSRF), and rate limiting.
*   **Testability:** The architecture must support isolated testing of each layer, using mock implementations for dependencies.
*   **Regulatory Compliance:** The system must be designed to be geography-aware, enabling compliance with local data privacy and protection regulations, such as GDPR for European users. This serves as the overarching principle that drives the functional requirements for compliance.

---

## 6. Assumptions Log (Initial)

*   The existing documentation in `/Product documentation` is the sole source of truth for the *intended* full product vision, even if the implementation does not match.
*   The goal is to first build the defined MVP, and then iterate towards the full vision.
*   The specified technology stack (Next.js, Supabase, etc.) is the accepted choice for the default implementation. 