# End-User Functionality & Expected Experience - Phase 4: Advanced Authentication (SSO & MFA)

This document details the expected end-user experience for features related to advanced authentication methods like Single Sign-On (SSO) and Multi-Factor Authentication (MFA) (Phase 4), following the structure established in previous feature documents.

---

## Phase 4: Advanced Authentication (SSO & MFA)

This phase introduces alternative ways for users to log in (SSO) and enhances account security with MFA.

### 4.1 General SSO Login (`/api/auth/sso/{provider}` - e.g., GitHub, Facebook, Twitter, Apple)

**Goal:** A personal user wants to sign up or log in using their existing account from a common social/development platform.

**User Journey & Expectations:**

1.  **Access:** On the Login or Sign Up page, dedicated buttons/icons are displayed for each supported general SSO provider (e.g., "Continue with GitHub", "Login with Facebook").
2.  **Action:** User clicks the button for their desired provider (e.g., GitHub).
3.  **Redirect & Provider Authentication:**
    *   The user is immediately redirected to the provider's authentication page (e.g., GitHub's login/authorization screen).
    *   The user logs into the provider (if not already logged in) and explicitly authorizes the application to access the requested information (typically name, email, profile picture).
4.  **Callback & Account Linking/Creation:**
    *   After successful authorization on the provider's site, the user is redirected back to the application (to a specific `/api/auth/callback` endpoint handled by the backend).
    *   **Scenario A (Existing User):** If the email address returned by the SSO provider matches an *existing verified* user account in the application, the user is logged in directly and redirected to their dashboard. The SSO provider is now linked to their account for future logins.
    *   **Scenario B (New User):** If the email address is new, the application implicitly creates a new personal user account using the information from the SSO provider (Name, Email, potentially Avatar). Email verification might be skipped as the provider usually guarantees email ownership. The user is logged in and redirected to their dashboard or a profile completion step if necessary.
    *   **Scenario C (Email Exists, Unverified/Different Login Method):** If the email exists but was registered via password and is unverified, or if there's ambiguity, the user might be prompted: "An account with [email] already exists. [Log in with password to link accounts Link] or [Use a different email Link]". Linking might require a password login first.
5.  **Feedback:**
    *   **Success:** Seamless redirection to the dashboard after provider authentication.
    *   **Provider Error:** If the user denies authorization on the provider's site, they are redirected back to the application's Login page, possibly with a generic message like "SSO authorization cancelled or failed."
    *   **Email Missing/Permission Denied:** If the user authorizes but doesn't grant permission to share their email address (if the provider allows this), the application shows an error: "We need access to your email address ([Provider Name]) to log you in. Please try again and grant email permission."
    *   **Account Linking Conflict:** See Scenario C above.
    *   **Server Error:** "Failed to process SSO login due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Using SSO for Existing Password Account:** User wants to link their Google SSO to an account they previously created with email/password. The flow (Scenario C) should ideally guide them to log in with their password once to confirm and link the accounts.
*   **Revoking Access on Provider Site:** If the user later revokes the application's access from within the SSO provider's settings (e.g., GitHub Connected Apps), the next SSO login attempt will fail and require re-authorization.
*   **Email Change on Provider Site:** If the user changes their primary email on the SSO provider site, the next login might either link correctly (if the backend handles it) or potentially create a new account if the old email is no longer provided. Clear handling/documentation is needed.
*   **Provider Outage:** If the SSO provider (e.g., Facebook) is down, the user cannot log in via that method. The button might appear disabled or show an error on click.

### 4.2 Business SSO Login (`/api/auth/sso/{provider}` - e.g., Microsoft, Google Workspace, LinkedIn)

**Goal:** A business user wants to sign up or log in using their corporate identity provider.

**User Journey & Expectations:**

1.  **Access:** On the Login/Sign Up page, potentially on the "Business Account" tab/section, dedicated buttons for business-oriented SSO providers are displayed (e.g., "Continue with Microsoft", "Login with Google Workspace").
2.  **Action:** User clicks their corporate provider button.
3.  **Redirect & Provider Authentication:** Similar to general SSO, the user is redirected to their corporate login portal (Microsoft Azure AD, Google Workspace login, etc.) to authenticate and authorize.
4.  **Callback & Account Handling:**
    *   User is redirected back to the application.
    *   **Scenario A (Existing Linked User):** User is logged in and redirected to the business dashboard.
    *   **Scenario B (New User - Domain Verified):** If the company's domain (from the user's corporate email) has been previously verified by an admin (see 3.7), the system might automatically create a user account, associate it with the company, assign a default role (e.g., Member), and log them in.
    *   **Scenario C (New User - Domain Not Verified):** If the domain is not verified, the user might be put into a pending state or prompted to complete business registration details (similar to 3.1), potentially requiring admin approval later, or informed that they need an invitation.
    *   **Scenario D (Existing User - Needs Linking):** Similar to general SSO, if the email exists but isn't linked, prompt for password login or other confirmation to link.
5.  **Feedback:**
    *   **Success:** Seamless login to business dashboard.
    *   **Provider Error/Denial:** Redirect back to login page.
    *   **Domain Not Allowed:** If the company admin has configured specific allowed domains or requires invitations: "Login failed. Your organization requires an invitation or uses a different login method."
    *   **Requires Admin Approval:** "Account created and pending administrator approval for [Company Name]."
    *   **Server Error:** "Failed to process SSO login due to a server error."

**Edge Cases (User Perspective):**

*   **Multiple Google/Microsoft Accounts:** The provider's login screen usually allows the user to choose which account (e.g., personal Gmail vs. corporate Google Workspace) they want to authenticate with. The application needs to handle the identity provided correctly.
*   **Corporate Policy Restrictions:** The user's own company might have policies preventing them from authorizing third-party apps, leading to a failure message from the provider.
*   **Invitation Requirement:** If Phase 6 (Team Management) enforces invite-only team joining, SSO login for a new user from that company might fail with a message like "Please use the invitation link sent to your email to join the team."

### 4.3 MFA Setup (TOTP) (`/api/auth/mfa/setup`)

**Goal:** A security-conscious user wants to enable Time-based One-Time Password (TOTP) authentication using an authenticator app (like Google Authenticator, Authy, etc.).

**User Journey & Expectations:**

1.  **Access:** User navigates to their "Account Settings" -> "Security" page.
2.  **Initiation:** User finds an MFA or 2-Factor Authentication section and clicks an "Enable Authenticator App" or "Setup TOTP" button.
3.  **Display & Instructions:** A modal window or dedicated page appears:
    *   **QR Code:** A QR code is displayed.
    *   **Secret Key:** The TOTP secret key is displayed as text (for manual entry into apps) with a "Copy" button.
    *   **Instructions:** Clear steps: "1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy) or manually enter the secret key. 2. Enter the 6-digit code generated by your app below to verify setup."
    *   **Input Field:** A field labeled "Verification Code" or "6-Digit Code" for entering the TOTP code.
    *   **Verify Button:** A "Verify & Enable" button.
    *   **Cancel Button:** A "Cancel" button.
4.  **Action (User):**
    *   User scans the QR code or enters the key into their authenticator app.
    *   The app starts generating 6-digit codes.
    *   User enters the *current* 6-digit code from their app into the input field on the web page.
5.  **Submission:** User clicks "Verify & Enable".
6.  **Feedback:**
    *   **Success:** "Authenticator App enabled successfully! You will be required to enter a code from your app during future logins." The Security page updates to show MFA is active, often prompting the user to save backup codes next (see 4.7).
    *   **Invalid Code:** "The verification code is incorrect. Please try again." The input field is cleared.
    *   **Expired Code:** If the code was valid but expired just before submission: "The verification code has expired. Please enter the current code from your app."
    *   **Setup Timeout:** If the user takes too long on the setup screen, the session/QR code might expire: "Setup timed out. Please try again." Requires restarting the setup.
    *   **Already Enrolled:** If MFA is already set up: "Authenticator app is already enabled."
    *   **Server Error:** "Failed to enable MFA due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **QR Code Scan Failure:** User's camera/app can't scan the QR code -> They use the manual text key entry.
*   **Incorrect Code Entry:** User mistypes the code -> Gets "Invalid code" error.
*   **Clock Sync Issues:** If the user's phone clock is significantly out of sync with server time, TOTP codes may not validate -> Error message might ideally suggest checking phone time settings, or a generic "Invalid code" appears.
*   **Cancelling Setup:** User clicks "Cancel"; MFA remains disabled.
*   **Trying to Setup Multiple Apps:** The flow generates one secret. The user can add this secret to multiple authenticator apps if they wish, but the setup UI validates only one code entry.

### 4.4 MFA Verify (Login) (`/api/auth/mfa/verify`)

**Goal:** A user with MFA enabled logs in and needs to provide their TOTP code.

**User Journey & Expectations:**

1.  **Login Step 1:** User successfully enters their correct email and password on the login page (Phase 1, Section 1.2).
2.  **MFA Prompt:** Instead of being redirected to the dashboard, the user is presented with a new screen or modal:
    *   **Instructions:** "Enter the 6-digit code from your authenticator app."
    *   **Input Field:** A single input field for the 6-digit code.
    *   **Submit Button:** "Verify Code" or "Login".
    *   **Help Link:** Optional link like "Having trouble?" or "Use a backup code".
3.  **Action:** User opens their authenticator app, gets the current code, and enters it into the field.
4.  **Submission:** User clicks "Verify Code".
5.  **Feedback:**
    *   **Success:** Code is validated. User is logged in and redirected to their dashboard.
    *   **Invalid Code:** "The verification code is incorrect. Please try again." Input field cleared. Multiple attempts might lead to account lockout similar to password failures.
    *   **Expired Code:** "The verification code has expired. Please enter the current code from your app."
    *   **MFA Not Enabled:** Should not happen in this flow, but if it did, log the user in directly (indicates a logic error).
    *   **Server Error:** "Failed to verify MFA code due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Lost/Inaccessible Authenticator Device:** User cannot generate a code -> They need to use the "Use a backup code" option (see 4.7) or contact support for account recovery.
*   **Incorrect Code Entry:** Gets error, potentially leading to temporary lockout after too many attempts.
*   **Using Backup Code:** Clicking the link presents a field to enter one of the 8-digit backup codes.

### 4.5 MFA Management (`/api/auth/mfa/manage`)

**Goal:** User wants to view their MFA status, potentially disable MFA, or manage MFA methods/factors.

**User Journey & Expectations:**

1.  **Access:** User navigates to "Account Settings" -> "Security".
2.  **Display:** The MFA section shows the current status.
    *   **If Enabled:** "Multi-Factor Authentication: Enabled". Lists the enrolled method(s) (e.g., "Authenticator App"). A "Disable MFA" button is present. Options to "View Backup Codes" (see 4.7) might be here.
    *   **If Disabled:** "Multi-Factor Authentication: Disabled". Buttons to "Enable Authenticator App" (see 4.3) or potentially other methods (SMS/Email - see 4.6) are shown.
3.  **Action (Disable):** User clicks "Disable MFA".
4.  **Confirmation:** A warning modal appears: "Disabling MFA will reduce your account security. Are you sure?" It might require entering the current password or a valid MFA code to confirm.
5.  **Submit Confirmation:** User confirms the disable action (e.g., enters password and clicks "Confirm Disable").
6.  **Feedback:**
    *   **Success (Disable):** "Multi-Factor Authentication has been disabled." The security page updates to reflect the disabled state.
    *   **Confirmation Failed:** "Incorrect password/MFA code. MFA remains enabled."
    *   **Error:** "Failed to disable MFA due to a server error."

**Edge Cases (User Perspective):**

*   **Accidental Disable Click:** Confirmation step prevents accidental disabling.
*   **Cannot Provide Confirmation Code:** If user lost authenticator and backup codes, they cannot disable MFA themselves and need account recovery support.
*   **Listing Multiple Factors (Future):** If SMS/Email MFA are added, this section would list all enrolled factors with options to remove individual ones (perhaps keeping at least one enabled if MFA is mandatory).

### 4.6 MFA Methods (SMS/Email) (`/api/auth/mfa/...`)

**Goal (Future):** User wants to use SMS or Email codes as an MFA factor (in addition to or instead of TOTP).

**User Journey & Expectations (Conceptual - requires specific implementation):**

1.  **Access:** In Security settings, alongside "Enable Authenticator App", options like "Enable SMS Verification" or "Enable Email Verification" would appear.
2.  **Setup (SMS):**
    *   User clicks "Enable SMS".
    *   Prompted to enter/confirm their phone number.
    *   A verification code is sent via SMS.
    *   User enters the code on the site to verify phone ownership and enable SMS as a factor.
3.  **Setup (Email):**
    *   User clicks "Enable Email".
    *   A verification code is sent to their registered (and verified) email address.
    *   User enters the code on the site to enable Email as a factor.
4.  **Login:** If multiple factors are enabled, the MFA prompt (4.4) might allow the user to choose which method to use (e.g., "Enter code from authenticator app" or buttons like "Send code via SMS" / "Send code via Email").
5.  **Management:** MFA Management (4.5) would list SMS/Email factors with options to disable/remove them individually.

**Edge Cases (User Perspective):**

*   **SMS Delivery Issues:** Codes might be delayed or blocked.
*   **Email Delivery Issues:** Codes might go to spam or be delayed.
*   **Phone Number Change:** User needs to update their verified phone number in profile settings *before* relying on it for MFA or potentially getting locked out.
*   **Security Concerns:** SMS is generally considered less secure than TOTP; this should ideally be communicated to the user.

### 4.7 Backup Codes (`/api/auth/mfa/backup-codes`)

**Goal:** User needs to view, regenerate, or use backup codes for MFA recovery when their primary method (authenticator app) is unavailable.

**User Journey & Expectations:**

1.  **Access & Generation (Post-MFA Setup):**
    *   Immediately after successfully enabling TOTP MFA (4.3), the user is strongly prompted: "MFA Enabled! Please save your backup codes securely. These codes will allow you to access your account if you lose your device."
    *   A list of typically 8-10 unique, 8-digit codes is displayed.
    *   Options provided: "Copy Codes", "Download Codes (.txt file)", "Print Codes".
    *   A checkbox: "I have saved these codes securely."
    *   A "Done" or "Continue" button, possibly disabled until the checkbox is checked.
2.  **Access (Viewing Later):**
    *   User navigates to "Account Settings" -> "Security" -> MFA section.
    *   Clicks a "View Backup Codes" or "Manage Backup Codes" button.
    *   Might require password or current MFA code re-authentication for security.
    *   The currently active set of backup codes is displayed with Copy/Download/Print options.
    *   A "Generate New Codes" button is present.
3.  **Action (Regenerate):**
    *   User clicks "Generate New Codes".
    *   Confirmation: "Generating new codes will invalidate all previous backup codes. Are you sure?"
    *   Upon confirmation, a new list of codes is displayed, replacing the old ones. The user is prompted to save them securely again.
4.  **Action (Using a Code - during Login):**
    *   At the MFA prompt during login (4.4), the user clicks "Use a backup code".
    *   The input field changes to accept an 8-digit code.
    *   User enters one of their unused backup codes.
    *   Clicks "Verify Code" or "Login".
5.  **Feedback:**
    *   **Generation/View Success:** Codes displayed clearly with save options.
    *   **Regeneration Success:** New codes displayed, confirmation message: "New backup codes generated. Previous codes are now invalid."
    *   **Using Code (Success):** Code is accepted, marked as used (single-use), user is logged in.
    *   **Using Code (Invalid/Already Used):** "This backup code is invalid or has already been used. Please try another code."
    *   **Error:** "Failed to retrieve/generate/verify backup codes due to a server error."

**Edge Cases (User Perspective):**

*   **Losing Codes:** If the user loses both their authenticator device AND their backup codes, they must contact support for account recovery. This should be clearly stated.
*   **Saving Insecurely:** User saves codes in an easily accessible/discoverable place, compromising their MFA security.
*   **Running Out of Codes:** After using the last code, the user should be strongly encouraged to regenerate a new set or risk lockout if they lose their primary MFA method.

### 4.8 "Remember Me" (`/api/auth/login` - Interaction with MFA/Sessions)

**Goal:** User wants to reduce login friction on trusted devices while potentially interacting with MFA.

**User Journey & Expectations:**

1.  **Login:** On the login page, the user checks the "Remember Me" box before entering credentials.
2.  **MFA Interaction:**
    *   User successfully authenticates with email/password.
    *   User is prompted for their MFA code (TOTP/SMS/etc.) as usual (see 4.4).
3.  **Session Extension:** Upon successful MFA verification, the server issues a session token with a much longer expiry time compared to a standard login session (e.g., 30 days vs. 1 hour).
4.  **Subsequent Visits (Within Expiry):** When the user closes their browser and revisits the site later (within the extended session lifetime), they are automatically logged in *without* needing to re-enter their password OR their MFA code.
5.  **Subsequent Visits (After Expiry):** After the extended "Remember Me" session expires, the user must log in again with both password and MFA.

**Feedback:**

*   The functionality is mostly transparent, evidenced by not needing to log in again on subsequent visits from the same browser/device.
*   A tooltip on the "Remember Me" checkbox could clarify: "Keep me logged in on this browser for up to 30 days. Requires MFA on initial login."

**Edge Cases (User Perspective):**

*   **Untrusted Device:** User should be discouraged (via UI text) from checking "Remember Me" on shared or public computers.
*   **Clearing Browser Cookies/Data:** This will clear the "Remember Me" token, requiring a full login next time.
*   **Password Change/MFA Disabled:** Changing password or disabling/resetting MFA should ideally invalidate "Remember Me" sessions on all devices for security, forcing re-authentication everywhere.
*   **Session Revocation (Admin Action):** If an admin revokes user sessions (Phase 7), "Remember Me" sessions should also be terminated.

### 4.9 Organization Security Policy (`/api/admin/security-policy`)

**Goal:** A business administrator wants to define and enforce security standards for all members of their organization/team.

**User Journey & Expectations:**

1.  **Access:** Admin navigates to the Admin Console -> "Security Settings" or "Policies" section.
2.  **Display:** A page showing configurable security policies for the organization, organized into tabs:
    *   **Session Policies Tab:**
        *   **Session Timeout:** Input field to set maximum session duration for team members (in minutes).
        *   **Max Sessions Per User:** Input field to limit concurrent sessions a user can have.
    *   **Password Policies Tab:**
        *   **Minimum Password Length:** Input field for minimum character count.
        *   **Password Complexity Rules:** Checkboxes for requiring uppercase letters, lowercase letters, numbers, and special characters.
        *   **Password Expiry Days:** Input to enforce password changes every X days (0 means never).
        *   **Password History Count:** Input for the number of previous passwords that cannot be reused.
    *   **MFA Requirements Tab:**
        *   **Require Multi-Factor Authentication (MFA):** Toggle Switch (On/Off). If On, all team members will be required to set up MFA upon their next login.
        *   **Allowed MFA Methods:** Checkboxes for authenticator app (TOTP), SMS, and email verification.
    *   **IP Restrictions Tab:**
        *   **Enable IP Restrictions:** Toggle to turn on IP-based access control.
        *   **Allowed IP Addresses:** Textarea for whitelisting IP addresses/ranges.
        *   **Denied IP Addresses:** Textarea for blacklisting IP addresses/ranges.
    *   **Sensitive Actions Tab:**
        *   **Require Reauthentication:** Toggle to require password re-entry for sensitive operations.
        *   **Reauthentication Timeout:** How long a reauthentication is valid (in minutes).
        *   **Sensitive Actions List:** List of actions requiring reauthentication, with ability to add/remove.
3.  **Action:** Admin modifies the desired policy settings (e.g., toggles "Require MFA" to On, sets password rotation to 90 days).
4.  **Submission:** Admin clicks the "Save" button in each tab to update those specific settings.
5.  **Feedback:**
    *   **Success:** "Settings updated" message appears. The page reflects the saved settings.
    *   **Validation Error:** If invalid values are entered (e.g., non-numeric session timeout): Specific error messages appear.
    *   **Server Error:** "Failed to update settings due to a server error. Please try again."

**Impact on Team Members:**

*   **MFA Requirement:** On next login, users without MFA will be forced into the MFA setup flow before they can proceed.
*   **Password Rules:** New passwords (during reset or change) must meet the org policy. Existing passwords might be grandfathered until next change/rotation.
*   **Password Rotation:** Users will be prompted to change their password upon login after the defined period.
*   **Session Timeout:** Users will be logged out automatically after the specified duration of inactivity or total session time.
*   **IP Restrictions:** Users connecting from non-allowed IPs will be denied access.

**User Session Management:**

*   The page also displays a table of all users with active sessions and allows admins to terminate sessions for specific users.
*   A confirmation dialog appears before terminating sessions, warning that users will be forced to log in again.

**Edge Cases (User Perspective):**

*   **Conflicting Policies:** Platform defaults vs. stricter org policies – the stricter policy should always apply to members of that org.
*   **Immediate Enforcement:** Policy changes like session timeouts might apply immediately, while MFA requirements take effect at next login.
*   **Admin Self-Impact:** Admins are warned when settings may affect their own access (e.g., enabling IP restrictions).

--- 