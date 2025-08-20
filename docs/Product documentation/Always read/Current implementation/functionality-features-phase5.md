# End-User Functionality & Expected Experience - Phase 5: Subscriptions & Licensing

This document details the expected end-user experience for features related to managing user subscriptions and licensing (Phase 5), including interactions with a third-party payment provider (e.g., Stripe). It follows the structure established in previous feature documents.

---

## Phase 5: Subscriptions & Licensing

This phase focuses on allowing users (Personal and Business) to select, pay for, and manage different subscription tiers, unlocking corresponding features.

### 5.1 Define Tiers & Features (Backend/Config - User Facing Aspect)

**Goal:** Users need to understand the available subscription plans, their features, and pricing to make an informed choice.

**User Journey & Expectations:**

1.  **Access:** User navigates to a dedicated "Pricing", "Plans", or "Subscription" page, often accessible from the main navigation or user settings.
2.  **Display:** A clear comparison table or set of cards is presented, outlining each available tier (e.g., Personal Free, Personal Premium, Business Basic, Business Premium, Enterprise).
    *   **For Each Tier:**
        *   Clear Tier Name (e.g., "Personal Premium").
        *   Price (e.g., "$10 / month" or "$96 / year"). Monthly/Annual toggle if available.
        *   Currency indicator.
        *   Prominent list of key features included in that tier (using icons and concise text).
        *   Clear indication of limitations (e.g., "Up to 5 team members", "1GB storage").
        *   A call-to-action button: "Choose Plan", "Upgrade", "Downgrade", "Contact Sales" (for Enterprise).
    *   **Highlighting:** The user's *current* plan (if any) should be clearly highlighted.
    *   **User Type Context:** The page might dynamically show only relevant plans (Personal vs. Business) based on the user's account type, or clearly separate them.

**Feedback:**

*   Static information display, but needs to be kept in sync with backend configuration.
*   Tooltips or info icons on specific features can provide more detailed explanations.

**Edge Cases (User Perspective):**

*   **Currency:** If selling internationally, the currency displayed should ideally be localized or clearly stated. Pricing needs clarity on taxes (included/excluded).
*   **Feature Ambiguity:** Feature descriptions must be clear and unambiguous to avoid confusion about what each tier provides.
*   **Plan Changes:** Pricing/features might change over time; existing subscribers' terms should be handled according to the Terms of Service (grandfathering vs. migration).

### 5.2 Payment Integration (Backend - User Facing Aspect: Trust & Security)

**Goal:** User needs to feel confident that their payment information is handled securely.

**User Journey & Expectations:**

*   **Checkout Redirection (See 5.3):** When initiating payment, the user is typically redirected to a secure page hosted by the payment provider (e.g., Stripe Checkout) or interacts with secure iframe elements provided by the payment provider.
*   **Branding:** The checkout page/elements should ideally be branded with the application's logo and name to maintain context and trust.
*   **Transparency:** The payment provider's involvement should be clear (e.g., "Payments processed by Stripe").
*   **Security Indicators:** Users expect standard web security indicators (HTTPS lock icon) throughout the payment process.
*   **Webhook Impact:** Users don't see webhooks, but they *experience* the result: their subscription status (5.5) updates promptly after successful payment or cancellation.

**Feedback:**

*   Trust signals (provider logos, security badges) are important.
*   Clear indication of what is being purchased and the cost before final confirmation.

**Edge Cases (User Perspective):**

*   **Provider Outage:** If the payment provider is down, checkout will fail. The application should show a user-friendly error: "Payment processing is temporarily unavailable. Please try again later."
*   **Man-in-the-Middle Concerns:** Proper HTTPS implementation is critical.

### 5.3 Create Checkout Session (`/api/payments/checkout`)

**Goal:** User selects a paid plan and initiates the payment process.

**User Journey & Expectations:**

1.  **Access:** On the Pricing page (5.1), the user clicks the "Choose Plan" or "Upgrade" button for their desired paid tier.
2.  **Action & Redirection:**
    *   The application backend communicates with the payment provider (Stripe) to create a checkout session.
    *   The user's browser is *redirected* to the secure Stripe Checkout page.
3.  **Stripe Checkout Page:**
    *   Displays the selected plan name and price.
    *   Prompts for payment details (Credit Card, potentially other methods like Google Pay/Apple Pay if configured).
    *   May prompt for billing address.
    *   Shows order summary and total amount.
    *   Includes branding (application logo/name).
    *   User enters their payment information and confirms the payment.
4.  **Callback/Return:**
    *   **Success:** After successful payment on Stripe, the user is redirected back to a designated success page within the application (e.g., `/subscription-success`).
    *   **Cancel/Failure:** If the user cancels on the Stripe page or payment fails, they are redirected back to a designated cancellation/failure page within the application (e.g., `/subscription-cancelled`) or back to the pricing page.
5.  **Feedback (On Application Return Pages):**
    *   **Success Page:** "Payment successful! Your [Plan Name] subscription is now active." Links to the dashboard or subscription management page.
    *   **Cancellation/Failure Page:** "Your subscription purchase was cancelled or failed. You have not been charged. [Return to Pricing Page Link]" or "Payment failed. Please check your payment details or try a different method. [Return to Pricing Page Link]".

**Edge Cases (User Perspective):**

*   **Accidental Double Click:** Backend should ensure only one checkout session is processed.
*   **Redirect Failure:** If the redirect to Stripe fails -> Application error message: "Could not initiate checkout. Please try again."
*   **Return URL Failure:** If the redirect back from Stripe fails, the payment might succeed, but the user doesn't see the success page. The backend webhook (5.2) should still update the subscription status, and the user should see their active plan when they next visit their account (5.5).
*   **Browser Issues:** Pop-up blockers or browser extensions could potentially interfere with the redirect process.

### 5.4 Manage Subscription (`/api/payments/portal`)

**Goal:** User wants to manage their active subscription (e.g., change plan, update payment method, cancel subscription, view invoices).

**User Journey & Expectations:**

1.  **Access:** User navigates to their "Account Settings" -> "Subscription" or "Billing" page.
2.  **Action:** User clicks a button labeled "Manage Subscription", "Billing Portal", or similar.
3.  **Action & Redirection:**
    *   The application backend communicates with the payment provider (Stripe) to create a secure Customer Portal session.
    *   The user's browser is *redirected* to the Stripe Customer Portal page.
4.  **Stripe Customer Portal:** This is a page hosted by Stripe, customized for the application.
    *   **Displays:** Current plan, renewal date, cost.
    *   **Allows User To:**
        *   Update payment methods (add/remove cards).
        *   Change subscription plan (upgrade/downgrade options as configured).
        *   Cancel subscription.
        *   View billing history and download invoices (see 5.7).
        *   Update billing information (address).
    *   User performs desired actions within the portal (e.g., clicks "Cancel Subscription", confirms).
5.  **Return:** User clicks a "Return to [Application Name]" link within the portal, redirecting them back to the application's subscription settings page.
6.  **Feedback:**
    *   Changes made in the portal (like cancellation) might take a moment to reflect in the application's UI, updated via webhooks.
    *   The application's subscription page (5.5) should reflect the current status accurately after returning.

**Edge Cases (User Perspective):**

*   **Portal Session Expiry:** Stripe portal links are usually short-lived for security. If the user waits too long before clicking, the link might expire -> Application error: "Could not open billing portal. Please try again."
*   **Changes Not Immediately Reflected:** Due to webhook delays, the application UI might briefly show the old status after returning. A page refresh or a short wait usually resolves this.
*   **Cancelling vs. Deleting Account:** Cancelling subscription via the portal stops future payments but doesn't delete the user account. This distinction should be clear.

### 5.5 Get Subscription Status (`/api/subscription`)

**Goal:** User wants to see their current subscription plan and its status within the application.

**User Journey & Expectations:**

1.  **Access:** User navigates to "Account Settings" -> "Subscription" or "Billing". This information might also be summarized elsewhere (e.g., dashboard header).
2.  **Display:** The page clearly displays the user's current subscription details, fetched from the application's database (which is kept up-to-date by payment provider webhooks).
    *   **Expected Info:**
        *   Current Plan Name (e.g., "Personal Premium", "Business Basic", "Free Tier").
        *   Status (e.g., "Active", "Canceled - Access until [Date]", "Past Due", "Trialing - Ends [Date]").
        *   Renewal/Expiry Date (e.g., "Renews on [Date]", "Ends on [Date]").
        *   Cost (e.g., "$10 / month").
        *   (For Business) Seat Count if applicable (e.g., "5 out of 10 seats used").
    *   **Actions:** Links/buttons to "Manage Subscription" (leads to 5.4 Portal) or "Change Plan" (could lead to Pricing Page 5.1 or Portal 5.4).

**Feedback:**

*   Data should accurately reflect the source of truth (synced from payment provider).
*   Clarity on what happens upon cancellation (e.g., access remains until the end of the current paid period).

**Edge Cases (User Perspective):**

*   **Data Sync Delay:** Minor temporary discrepancies between Stripe and the application DB due to webhook delays. Usually self-correcting.
*   **Failed Payment Status ("Past Due"):** The UI should clearly indicate the payment issue and prompt the user to update their payment method via the Billing Portal (5.4). Access to features might be restricted.
*   **Trial Period:** If trials are offered, the status should clearly show "Trial" and the end date.

### 5.6 Feature Gating (Backend Logic - User Experience)

**Goal:** Ensure users can only access features appropriate for their current subscription tier.

**User Journey & Expectations:**

*   **Accessing Premium Feature on Free Plan:**
    *   **Scenario A (Disabled Element):** A button or UI element corresponding to a premium feature appears grayed out or disabled. A tooltip or adjacent text indicates: "Available on [Premium Plan Name] and higher." Clicking it does nothing or shows the prompt.
    *   **Scenario B (Upgrade Prompt):** Clicking a premium feature button/link triggers a modal or redirects to the Pricing page (5.1) with a message: "Upgrade to [Premium Plan Name] to use this feature." Example: Trying to use advanced reporting on a basic plan.
    *   **Scenario C (Hidden Element):** The UI element for the premium feature is simply not rendered/visible to users on lower tiers.
*   **Hitting Usage Limits:** If a plan has limits (e.g., max team members, max projects), attempting to exceed the limit is blocked.
    *   **Example:** Trying to invite an 11th member on a 10-seat plan -> Error message: "You have reached the maximum number of team members for your current plan. Please upgrade your plan or remove an existing member." An "Upgrade Plan" link is provided.
*   **Consistency:** Feature gating should be applied consistently across the application (API endpoints and frontend UI).

**Feedback:**

*   Clear communication about *why* a feature is unavailable (requires upgrade).
*   Easy path to upgrade if desired.

**Edge Cases (User Perspective):**

*   **UI vs. API Mismatch:** Frontend UI might incorrectly show a feature as available, but the backend API call is correctly blocked based on subscription -> User clicks button, gets unexpected permission error. Needs consistent implementation.
*   **Plan Change Propagation Delay:** After upgrading, there might be a slight delay before *all* features become instantly available if caching or asynchronous updates are involved.

### 5.7 Invoice Management (Stripe Portal / API?)

**Goal:** User wants to view their past billing history and download invoices for accounting.

**User Journey & Expectations:**

1.  **Access (via Stripe Portal - Recommended):**
    *   User goes to the Stripe Customer Portal (via "Manage Subscription" link - see 5.4).
    *   Portal has a dedicated "Billing History" or "Invoices" section.
    *   Lists past invoices with date, amount, status (Paid/Failed).
    *   Each invoice has a "Download Invoice" (PDF) and potentially "Download Receipt" link.
2.  **Access (via Application API - Optional):**
    *   If implemented, the application's "Billing" page (5.5) might also list past invoices fetched via API from Stripe.
    *   Provides similar information (Date, Amount, Status) and a button/link to download the PDF (which would still likely be generated/served by Stripe via API).
3.  **Action:** User clicks to download the desired invoice PDF.

**Feedback:**

*   Invoices should contain all legally required information (Company Name/Address, Customer Name/Address, VAT ID, Line Items, Tax, Amount Paid, Dates).
*   Easy access to historical data.

**Edge Cases (User Perspective):**

*   **Refunds/Credit Notes:** Portal/List should clearly indicate any refunds or credit notes applied.
*   **API Fetch Failure:** If using the application API method, errors fetching invoice list from Stripe should be handled gracefully ("Could not load billing history. Please try again later or access via the Billing Portal.").

### 5.8 Team/Seat Licensing (Business Tiers)

**Goal:** Business admin needs to understand and manage the number of licensed seats/users allowed by their subscription plan.

**User Journey & Expectations:**

1.  **Viewing Seat Usage:**
    *   Admin navigates to the "Subscription" or "Billing" page (5.5) or potentially a "Team Management" page (Phase 6).
    *   Clear display of current usage vs. limit (e.g., "Team Members: 7 / 10 seats used"). A visual progress bar can be helpful.
2.  **Managing Seats (via Stripe Portal):**
    *   Admin accesses the Stripe Customer Portal (5.4).
    *   Portal allows adjusting the *quantity* of the subscription (number of seats).
    *   Stripe handles the pro-rata billing adjustments for adding/removing seats mid-cycle.
3.  **Managing Seats (via Application UI - Advanced):**
    *   Alternatively, the application's Billing/Team page might have controls (+/- buttons or input field) to change the seat count directly.
    *   Clicking these would trigger backend calls to update the subscription quantity in Stripe.
    *   Clear indication of the cost change before confirmation (e.g., "Adding 1 seat will add $X to your next invoice (pro-rata).")
4.  **Enforcement (Feature Gating - Linking to 5.6 & Phase 6):**
    *   When an admin tries to invite a new team member (Phase 6), the system checks current seat usage against the plan limit.
    *   If at the limit, the invite action is blocked with a message: "Cannot invite member. You have reached your plan limit of [N] seats. Please [Upgrade Plan/Add Seats Link] or remove an inactive member."

**Feedback:**

*   Clear visibility of seat usage and limits.
*   Predictable cost implications when changing seat count.
*   Seamless blocking/prompting when hitting limits during team management actions.

**Edge Cases (User Perspective):**

*   **Removing Users:** When an admin removes a team member (Phase 6), the seat becomes free. Does the subscription quantity automatically decrease (potentially reducing cost), or does the admin need to manually reduce it in the portal/UI? This behavior needs to be defined and communicated.
*   **Annual vs. Monthly Billing:** Pro-rata calculations for adding/removing seats can be complex, especially with annual plans. Stripe Portal handles this well, but if building custom controls, care is needed.
*   **Invite Pending:** Do pending invites count towards the seat limit? This policy needs to be clear.

--- 