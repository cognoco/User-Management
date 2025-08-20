# End-User Functionality & Expected Experience

This document details the expected end-user experience for each feature of the User Management System. It adopts the perspective of a typical user (Personal or Business/Admin) interacting with the application, outlining the ideal flow, expected feedback, user interface elements, and potential edge cases for each functionality described in `docs/development-plan.md` and `Cursorrules.md`.

---

## Phase 1: Foundational Setup & Core Personal Authentication

This phase focuses on the absolute basics: getting a personal user registered, logged in, and able to manage their credentials and account verification.

### 1.1 Personal User Registration (`/api/auth/register`)

**Goal:** A new user wants to create a standard personal account.

**User Journey & Expectations:**

1.  **Access:** User navigates to the application's website and clicks a "Sign Up" or "Register" button, typically prominent in the header or on the homepage/login page.
2.  **Form Display:** The user is presented with a registration form specifically for personal accounts (or a clear toggle if business registration is on the same page).
    *   **Expected Fields:** First Name, Last Name (or Full Name), Email Address, Password, Confirm Password.
    *   **Password Input:** As the user types in the "Password" field, a dynamic helper box/tooltip appears *immediately* beside the field, clearly listing the requirements (e.g., "Minimum 8 characters", "Includes uppercase letter", "Includes number", "Includes symbol"). Each requirement should visually indicate satisfaction as the user types (e.g., checkmark appears, text turns green).
    *   **Password Confirmation:** The "Confirm Password" field works similarly; a visual cue (e.g., checkmark) appears when the content matches the "Password" field.
    *   **Password Helper Visibility:** **Crucially, once the user clicks *away* from the password field (loses focus) and the password meets requirements, the requirement helper box should *disappear* cleanly.** It should only reappear if the user clicks back into the field and the password *no longer* meets the requirements (e.g., they delete characters). It should not persist on the screen after successful input.
    *   **Terms & Conditions:** A mandatory checkbox labeled "I agree to the Terms and Conditions and Privacy Policy" is displayed.
    *   **T&C Link:** **Critically, the text "Terms and Conditions" and "Privacy Policy" must be rendered as clear, clickable links that open the respective documents/pages in a new tab or modal window.** The user *must* be able to read these documents *before* agreeing. The checkbox cannot be checked until the user has (theoretically) had the chance to review them.
3.  **Submission:** User fills in all fields correctly and checks the Terms & Conditions box. They click the "Register" or "Sign Up" button.
4.  **Feedback:**
    *   **Success:** Upon successful submission, the form is replaced with a clear success message: "Registration successful! Please check your email inbox ([user's email]) for a verification link to activate your account." The user should *not* be automatically logged in. They might be redirected to the login page or a dedicated "Check Your Email" page.
    *   **Validation Errors (Client-side/Real-time):** If a field is invalid (e.g., invalid email format, password mismatch, password requirements not met, required field empty), a clear, specific error message appears directly below the relevant field *as soon as* the issue is detected (e.g., on losing focus from the field or during typing). The field border might turn red.
    *   **Server Errors (Post-Submit):**
        *   *Email Already Exists:* "An account with this email address already exists. Please [Login Link] or use a different email."
        *   *Terms Not Accepted:* "You must agree to the Terms and Conditions to register." (Should ideally be caught client-side before submission is enabled).
        *   *General Server Error:* "Registration failed due to a server error. Please try again later."
        *   *Rate Limiting:* "Too many registration attempts. Please try again later."

**Edge Cases (User Perspective):**

*   **Invalid Email Format:** User enters "test@", "test.com", etc. -> Real-time error message: "Please enter a valid email address." Submission blocked.
*   **Weak Password:** User enters "12345". -> Real-time error messages based on unmet requirements shown in the helper box. Submission blocked.
*   **Password Mismatch:** Passwords in the two fields don't match. -> Real-time error message: "Passwords do not match." Submission blocked.
*   **Empty Required Fields:** User tries to submit with empty name/email/password. -> Real-time error messages: "[Field Name] is required." Submission blocked.
*   **Tries to Submit Without Accepting Terms:** The "Register" button should be disabled until the checkbox is checked. If somehow bypassed, server returns an error.
*   **Network Error During Submission:** User clicks "Register", but connection drops. -> Error message: "Network error. Please check your connection and try again." Form data should ideally be preserved.
*   **Browser Auto-fill Issues:** Auto-fill might enter incorrect data or bypass certain checks temporarily. Final validation on submit must catch this.
*   **Using Back/Forward Buttons:** State of the form should be handled reasonably (data might be lost or preserved depending on implementation).

### 1.2 User Login (Personal) (`/api/auth/login`)

**Goal:** An existing, verified personal user wants to access their account.

**User Journey & Expectations:**

1.  **Access:** User navigates to the application's login page.
2.  **Form Display:** A simple login form is presented.
    *   **Expected Fields:** Email Address, Password.
    *   **Helper Links/Options:**
        *   "Forgot Password?" link prominently displayed.
        *   "Remember Me" checkbox. (Tooltip explaining duration/effect is helpful).
        *   Link to "Sign Up" or "Create Account" for new users.
        *   (Optional: Links/Buttons for SSO providers if implemented).
3.  **Input:** User enters their registered email and password. Optionally checks "Remember Me".
4.  **Submission:** User clicks the "Login" or "Sign In" button.
5.  **Feedback:**
    *   **Success:** Upon successful authentication, the user is redirected to their personal dashboard or the main application interface. A brief "Login successful" message might flash.
    *   **Invalid Credentials:** "Invalid email address or password. Please try again." (Generic message to prevent confirming which part was wrong). The password field should be cleared.
    *   **Account Not Verified:** "Your account is not verified. Please check your email for the verification link. [Resend Verification Link]". Login is blocked.
    *   **Account Locked/Disabled:** "Your account has been temporarily locked due to too many failed login attempts. Please try again later or use 'Forgot Password'." or "Your account has been disabled. Please contact support." Login is blocked.
    *   **MFA Required (Phase 4):** If MFA is enabled, instead of redirecting to the dashboard, the user is presented with the MFA verification step (see Phase 4).
    *   **General Server Error:** "Login failed due to a server error. Please try again later."

**Edge Cases (User Perspective):**

*   **Incorrect Email/Password:** User enters wrong details. -> "Invalid email or password." message. Focus might return to the email field.
*   **Unverified Email:** User tries to log in before clicking verification link. -> "Account not verified." message with resend option.
*   **Case Sensitivity:** Email field should likely be case-insensitive, password field *must* be case-sensitive. This should be transparent to the user.
*   **Leading/Trailing Spaces:** Input fields should automatically trim leading/trailing whitespace before validation/submission.
*   **Using "Forgot Password" link:** Takes user to the Password Reset Request flow (see 1.5).
*   **Checking/Unchecking "Remember Me":** Clearly affects session duration after browser close.
*   **Multiple Failed Attempts:** After N failed attempts (e.g., 5), the account is locked for a period (e.g., 15 minutes), displaying the "Account Locked" message.
*   **Network Error During Login:** "Network error. Please check your connection and try again."

### 1.3 User Logout (`/api/auth/logout`)

**Goal:** A logged-in user wants to securely end their session.

**User Journey & Expectations:**

1.  **Access:** User finds a "Logout" or "Sign Out" option, usually within a user profile dropdown menu in the application header.
2.  **Action:** User clicks the "Logout" button.
3.  **Feedback:**
    *   **Immediate Action:** The user's session is terminated instantly on the server.
    *   **Redirection:** The user is immediately redirected to the Login page or the application's public homepage.
    *   **Confirmation (Optional):** A brief, unobtrusive message might appear on the redirection target page: "You have been logged out successfully."

**Edge Cases (User Perspective):**

*   **Clicking Logout When Already Logged Out:** Should ideally do nothing silently or simply redirect to the login page if accessed directly via URL (if possible).
*   **Network Error During Logout:** Although unlikely to be noticed by the user (as they are leaving anyway), the client-side state should be cleared, and they should be redirected to the login page regardless.
*   **Session Already Expired:** Clicking Logout when the session has already timed out should behave the same as a successful logout (clear client state, redirect to login).

### 1.4 Token Handling/Middleware (User Perspective)

**Goal:** Ensure users can only access pages they are authorized to view, and handle session timeouts gracefully.

**User Journey & Expectations:**

1.  **Accessing Protected Route (Logged Out):** User tries to directly access a URL that requires login (e.g., `/dashboard`, `/settings`) by typing it in the address bar or using a bookmark while not logged in.
    *   **Expectation:** The user is immediately redirected to the Login page. A message might optionally appear on the login page: "Please log in to access this page."
2.  **Session Expiry (While Active or Inactive):** User is logged in, but their session expires due to inactivity or reaching the maximum session lifetime.
    *   **Expectation (On Next Action):** When the user next tries to perform an action requiring authentication (e.g., navigating to another protected page, submitting a form), they are automatically redirected to the Login page. A message should appear: "Your session has expired. Please log in again." Any unsaved work in the current view will likely be lost (standard web behavior).
    *   **Expectation (Proactive Handling - Ideal):** Ideally, a brief warning ("Your session is about to expire due to inactivity. [Keep me logged in button]") could appear shortly before expiry if the user is active in the tab.

**Edge Cases (User Perspective):**

*   **Invalid/Malformed Token:** If the stored authentication token becomes corrupted, it should be treated as logged out, redirecting to login on the next interaction.
*   **Trying to Use Old/Revoked Tokens:** Should result in redirection to login.

### 1.5 Password Reset Request (`/api/auth/reset-password`)

**Goal:** A user has forgotten their password and needs to initiate the reset process.

**User Journey & Expectations:**

1.  **Access:** User clicks the "Forgot Password?" link on the login page.
2.  **Form Display:** The user is taken to a dedicated "Reset Password" page.
    *   **Expected Field:** A single input field for "Email Address".
    *   **Instructions:** Clear text like "Enter the email address associated with your account, and we'll send you a link to reset your password."
3.  **Input:** User enters their email address.
4.  **Submission:** User clicks the "Send Reset Link" or "Submit" button.
5.  **Feedback:**
    *   **Success (Standard Practice):** Regardless of whether the email exists in the system or not, a generic success message is shown: "If an account exists for [user's email], you will receive an email with instructions on how to reset your password shortly. Please check your inbox (and spam folder)." This prevents attackers from confirming valid emails (user enumeration). Redirect to the login page or show message on the same page.
    *   **Invalid Email Format:** If the entered text isn't a valid email format, show a real-time validation error: "Please enter a valid email address." Block submission.
    *   **Rate Limiting:** If the user tries submitting too many requests in a short period: "Too many password reset attempts. Please try again later."

**Edge Cases (User Perspective):**

*   **Entering Unregistered Email:** User receives the same generic success message as if the email *was* registered. No email is actually sent.
*   **Entering Email with Typos:** User receives the success message but no email arrives (as the typo'd email doesn't exist or isn't theirs).
*   **Delay in Email Arrival:** Email might take a few minutes to arrive or go to spam. The message should implicitly suggest checking spam.
*   **Network Error:** "Network error. Please check your connection and try again."

### 1.6 Password Update (Post-Reset) (`/api/auth/update-password`)

**Goal:** A user has received the password reset email and is clicking the link to set a new password.

**User Journey & Expectations:**

1.  **Access:** User clicks the unique password reset link in the email they received.
2.  **Form Display:** The user is taken to a secure "Set New Password" page.
    *   **Expected Fields:** "New Password", "Confirm New Password". The email address might be displayed for context but not editable.
    *   **Password Requirements:** The same dynamic password requirement helper box used during registration appears as the user types in the "New Password" field and hides when focus is lost (as described in 1.1).
3.  **Input:** User enters their desired new password and confirms it.
4.  **Submission:** User clicks the "Update Password" or "Set New Password" button.
5.  **Feedback:**
    *   **Success:** "Password updated successfully! You can now log in with your new password." User is redirected to the Login page.
    *   **Invalid/Expired Token:** "This password reset link is invalid or has expired. Please request a new one." User might be redirected to the "Forgot Password" page.
    *   **Password Mismatch:** Real-time error: "Passwords do not match." Submission blocked.
    *   **Password Requirements Not Met:** Real-time error messages based on unmet requirements. Submission blocked.
    *   **General Server Error:** "Failed to update password due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Clicking an Old/Expired Link:** User gets the "Invalid or expired token" error. Reset links must have a reasonably short expiry time (e.g., 1 hour).
*   **Clicking a Link After Already Resetting:** Should show the "Invalid or expired token" error (token should be single-use).
*   **Weak New Password:** Validation prevents submission.
*   **Network Error:** "Network error. Please check your connection and try again."

### 1.7 Send Verification Email (`/api/auth/send-verification-email`)

**Goal:** A registered but unverified user needs to trigger the verification email again.

**User Journey & Expectations:**

1.  **Access:**
    *   **Scenario A (Login Attempt):** User tries to log in (see 1.2) and gets the "Account not verified" error, which includes a "[Resend Verification Link]" link/button. User clicks it.
    *   **Scenario B (In-App Prompt):** A newly registered user might see a persistent banner/notification after their first (failed) login attempt or on pages accessible before verification: "Your account is not verified. [Resend Verification Email]". User clicks the button/link.
2.  **Action:** User clicks the "Resend Verification Email" link/button.
3.  **Feedback:**
    *   **Success:** A confirmation message appears: "Verification email sent to [user's email]. Please check your inbox."
    *   **Already Verified:** "Your account is already verified. You can [Login Link]."
    *   **Rate Limiting:** "You can request a new verification email in [X] minutes." (Prevents spamming).
    *   **Server/Email Error:** "Failed to send verification email. Please try again later or contact support."

**Edge Cases (User Perspective):**

*   **User Already Verified:** System correctly identifies this and informs the user.
*   **Trying to Resend Too Quickly:** User is rate-limited.
*   **Network Error:** "Network error. Please check your connection and try again."

### 1.8 Verify Email Address (`/api/auth/verify-email`)

**Goal:** User clicks the link in the verification email to activate their account.

**User Journey & Expectations:**

1.  **Access:** User finds the verification email in their inbox and clicks the "Verify Email Address" button/link.
2.  **Action & Feedback:** The link opens in a new browser tab/window.
    *   **Success:** The page displays a clear success message: "Email verified successfully! You can now log in to your account." A prominent "Login" button is displayed, or the user is automatically redirected to the login page after a few seconds. (Auto-login after verification is convenient but consider security implications).
    *   **Invalid/Expired Link:** "This verification link is invalid or has expired. Please request a new one or log in to resend." A link to the login page (where they can trigger a resend) should be provided.
    *   **Already Verified:** "This email address has already been verified. You can [Login Link]."

**Edge Cases (User Perspective):**

*   **Clicking an Old/Expired Link:** Gets the "Invalid or expired" message. Verification links should have a reasonable expiry (e.g., 24 hours).
*   **Clicking Link Multiple Times:** Subsequent clicks after the first successful verification should show the "Already verified" message.
*   **Link Tampering:** Modified links should result in the "Invalid" error.

### 1.9 Update Password (Logged In) (`/api/auth/update-password-logged-in`)

**Goal:** A logged-in user wants to change their current password.

**User Journey & Expectations:**

1.  **Access:** User navigates to their "Account Settings" or "Security" page within the application.
2.  **Form Display:** User finds a "Change Password" section.
    *   **Expected Fields:** "Current Password", "New Password", "Confirm New Password".
    *   **Password Requirements Helper:** The dynamic helper appears for the "New Password" field as they type (see 1.1).
3.  **Input:** User enters their current password, the desired new password, and confirms the new password.
4.  **Submission:** User clicks "Update Password" or "Save Changes".
5.  **Feedback:**
    *   **Success:** "Password updated successfully." The form might clear or simply show the success message. User remains logged in. A notification email "Your password was changed" should be sent as a security measure.
    *   **Incorrect Current Password:** "The current password you entered is incorrect." The "Current Password" field should be cleared.
    *   **Password Mismatch:** Real-time error: "New passwords do not match." Submission blocked.
    *   **Password Requirements Not Met:** Real-time error on "New Password" field. Submission blocked.
    *   **New Password Same as Old:** "Your new password cannot be the same as your current password."
    *   **General Server Error:** "Failed to update password due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Forgetting Current Password:** User cannot use this form; they must log out and use the "Forgot Password" flow (1.5).
*   **Entering Weak New Password:** Validation prevents submission.
*   **Network Error:** "Network error. Please check your connection and try again." Input might be preserved.
*   **Concurrent Session Update:** If the password is changed in one session, other active sessions for the same user should ideally be invalidated and forced to re-login for security.

### 1.10 Basic Error Handling (User Perspective)

**Goal:** Ensure that when things go wrong, the user understands the problem without being overwhelmed by technical details.

**Expectations:**

*   **Clarity:** Error messages should be written in plain language, avoiding jargon or error codes unless absolutely necessary (and if so, provide context or a link to help). Example: Instead of "Error 500", use "A server error occurred. Please try again later."
*   **Location:** Errors related to specific input fields should appear close to that field (e.g., directly below it). General form errors or server errors can appear at the top of the form or as a notification banner.
*   **Specificity:** When possible, tell the user *what* is wrong. "Invalid email format" is better than "Invalid input." "Password requires an uppercase letter" is better than "Password does not meet requirements."
*   **Guidance:** If possible, suggest a solution. "Please check your internet connection." "Consider using a stronger password."
*   **Consistency:** Error message style, location, and tone should be consistent throughout the application.
*   **Non-Blocking UI:** Errors should not freeze the UI. The user should be able to correct the input or try again.

### 1.11 Input Validation (Zod) (User Perspective)

**Goal:** Provide immediate feedback on incorrect form inputs before submission.

**Expectations:**

*   **Real-time Feedback:** As the user types or moves focus away from a field (on blur), validation rules are checked.
*   **Visual Cues:** Invalid fields should be clearly marked (e.g., red border).
*   **Specific Messages:** A clear message appears near the invalid field explaining the specific rule violated (e.g., "Must be at least 8 characters", "Email format is invalid", "Required field").
*   **Disabling Submit:** The form's submit button ("Register", "Login", "Save") should ideally be disabled until all required fields are filled correctly, providing a clear visual cue that the form isn't ready.
*   **Server Re-validation:** Client-side validation is crucial for good UX, but all validation *must* be repeated on the server to ensure security and data integrity, as client-side checks can be bypassed. Server errors should still be handled gracefully (see 1.10).

---

## Phase 2: Personal User Profile & Account Management

This phase allows logged-in personal users to view, manage, and customize their own information.

### 2.1 Get Personal Profile (`/api/profile/personal`)

**Goal:** User wants to view their own profile information.

**User Journey & Expectations:**

1.  **Access:** User logs in and navigates to a "Profile", "My Account", or "Settings" page, often via a dropdown menu under their name/avatar.
2.  **Display:** The page displays the user's current profile information.
    *   **Expected Fields (Read-only view):** Name (First/Last or Full), Email Address (usually read-only), Bio/About Me (if set), Contact Information (Phone, Location - if set), Current Avatar image.
    *   **Layout:** Information is presented clearly, possibly grouped into sections (e.g., Basic Info, Contact, Security).
    *   **Prompt for Completion:** If certain optional fields (like Bio, Avatar) haven't been filled out yet, there might be subtle prompts or placeholders encouraging completion (e.g., "Add a bio", default avatar image with an "Upload" hint).
    *   **Edit Button:** A clear "Edit Profile" button or similar is visible, allowing the user to enter the editing mode (see 2.2).

**Edge Cases (User Perspective):**

*   **Error Fetching Data:** If the profile data fails to load from the server: "Could not load profile information. Please refresh the page or try again later."
*   **Incomplete Profile:** Displays placeholders or empty states for unset fields, making it clear what can be added.

### 2.2 Update Personal Profile (`/api/profile/personal`)

**Goal:** User wants to modify their editable profile information.

**User Journey & Expectations:**

1.  **Access:** From the profile view page (2.1), the user clicks the "Edit Profile" button.
2.  **Form Display:** The profile fields that are editable become input fields, populated with the current data.
    *   **Editable Fields:** Name, Bio/About Me, Contact Information (Phone, Location, Website etc.). Email is typically *not* editable here (often requires a separate verification process if allowed at all).
    *   **Controls:** Standard text inputs, text areas, potentially dropdowns (e.g., for Country). Input validation rules (e.g., phone number format, URL format) should be indicated or enforced.
    *   **Save/Cancel Buttons:** "Save Changes" and "Cancel" buttons appear.
3.  **Input:** User modifies the desired fields. Validation messages appear in real-time if input is invalid (e.g., improperly formatted phone number).
4.  **Submission:**
    *   **Save:** User clicks "Save Changes".
    *   **Cancel:** User clicks "Cancel". Changes are discarded, and the view reverts to the read-only display (2.1). A confirmation ("Discard unsaved changes?") might appear if changes were made.
5.  **Feedback (On Save):**
    *   **Success:** "Profile updated successfully." The page switches back to the read-only view, displaying the newly saved information.
    *   **Validation Error:** If server-side validation fails (should ideally be caught client-side), specific error messages are shown near the problematic fields.
    *   **Network/Server Error:** "Failed to update profile due to a network/server error. Please try again." Input fields should retain the attempted changes.

**Edge Cases (User Perspective):**

*   **Entering Invalid Data:** Real-time validation should catch most issues. Server re-validates.
*   **Trying to Edit Non-Editable Fields:** These fields should not be presented as editable inputs (e.g., email, user ID).
*   **Accidental Navigation Away:** If the user navigates away with unsaved changes, the browser might prompt "Leave site? Changes you made may not be saved."
*   **Clearing Required Fields:** If 'Name' is required, trying to save with an empty name field results in a validation error.

### 2.3 Profile Picture Management (`/api/profile/avatar`)**Goal:** User wants to set or change their profile picture, either by uploading a custom photo or selecting from predefined avatars.**User Journey & Expectations:**1.  **Access:** In the profile view (2.1) or edit mode (2.2), the user clicks on their current profile picture, a placeholder image, or a dedicated "Change Profile Picture" button/link.2.  **Selection Options:** A modal dialog opens with two tabs or sections:    *   **Predefined Avatars:** A grid of predefined avatars/images that the user can select from.    *   **Custom Upload:** Option to upload their own photo from their device.3.  **Option A - Select Predefined Avatar:**    *   User browses the available avatar options and clicks on their preferred choice.    *   A visual indication (highlight, border, etc.) shows which avatar is selected.    *   User clicks "Apply Selected Avatar" to confirm their choice.4.  **Option B - Upload Custom Photo:**    *   User clicks on "Upload" or similar button to open the device's file browser.    *   **Guidance:** Clear instructions regarding allowed file types (e.g., JPG, PNG, GIF) and maximum file size (e.g., "Max 5MB").    *   After selecting a valid file, the image appears with a cropping tool.    *   **Cropping:** An interactive tool allows the user to select the portion of the image to use, with a preview of the final circular/square result.    *   **Controls:** Options to zoom, adjust, confirm ("Save", "Apply Crop"), or cancel/re-select.    *   User clicks "Upload & Save" to confirm their custom photo.5.  **Feedback (Both Options):**    *   **Success:** The new profile picture appears immediately in the profile section and persists after page refresh. A brief success message might appear.    *   **Invalid File (For Custom Upload):** For invalid files, an error appears: "Invalid file type. Please upload a JPG, PNG, or GIF." or "File size exceeds the maximum limit of 5MB."    *   **Processing Error:** "Failed to update profile picture. Please try again." or "Could not process image."    *   **Network Error:** "Network error. Please try again."6.  **Remove Option:** If a profile picture is already set, a "Remove" button allows the user to clear it, returning to a default avatar/placeholder.**Edge Cases (User Perspective):***   **No Predefined Avatars Available:** If the predefined avatars fail to load, an error message appears with the option to try again or proceed to custom upload.*   **Selecting Non-Image File:** Client-side validation prevents selection or shows an immediate error.*   **File Too Large:** Client-side validation prevents selection/upload or shows immediate error.*   **Switching Between Tabs:** User can freely switch between predefined avatars and custom upload options before making a final choice.*   **Cancellation:** User closes the modal or clicks cancel; no changes are made to their current profile picture.

### 2.4 Profile Visibility (`/api/profile/privacy`)

**Goal:** User wants to control who can see their profile (if public profiles are a feature).

**User Journey & Expectations:**

1.  **Access:** User navigates to "Settings" -> "Privacy" or a "Privacy" section within their profile settings.
2.  **Control Display:** A clear control is presented for profile visibility.
    *   **Expected Control:** Radio buttons or a toggle switch labeled clearly, e.g., "Profile Visibility: ● Public (Visible to everyone) ○ Private (Visible only to you/connections)".
    *   **Explanation:** A brief text explanation clarifies what each setting means.
    *   **Current Setting:** The user's current choice is clearly indicated.
3.  **Action:** User selects the desired option (e.g., clicks the "Private" radio button).
4.  **Feedback:**
    *   **Saving:** The change might save automatically on selection, or require clicking a "Save Privacy Settings" button. Auto-save is common for simple toggles.
    *   **Success:** A confirmation message appears: "Visibility settings updated." The control reflects the new state.
    *   **Error:** "Failed to update privacy settings. Please try again."

**Edge Cases (User Perspective):**

*   **Unclear Options:** If the labels "Public"/"Private" are ambiguous in the context of the application, more descriptive text is needed.
*   **Network Error:** Saving fails, control reverts to the previous state with an error message.

### 2.5 Account Deletion (`/api/auth/account`)

**Goal:** User wants to permanently delete their account and associated data.

**User Journey & Expectations:**

1.  **Access:** User navigates to a clearly marked "Danger Zone" or "Account Deletion" area within their Account Settings. This option should not be too prominent to avoid accidental clicks but must be findable.
2.  **Warning & Initiation:** User sees strong warnings about the consequences.
    *   **Expected Text:** "Warning: Deleting your account is permanent and cannot be undone. All your profile information, settings, and associated data will be permanently removed."
    *   **Button:** A button labeled "Delete My Account" or similar, possibly colored red.
3.  **Confirmation Step:** Clicking the "Delete My Account" button does *not* immediately delete. Instead, it opens a confirmation modal dialog.
    *   **Modal Content:** Reiterates the warning. Requires explicit confirmation, such as:
        *   Typing the word "DELETE" or their current password into an input field.
        *   Checking a box like "I understand this action is irreversible."
    *   **Confirmation Button:** A final "Confirm Deletion" button (red).
    *   **Cancel Button:** A clear "Cancel" button to abort the process.
4.  **Final Action:** User provides the required confirmation and clicks "Confirm Deletion".
5.  **Feedback:**
    *   **Success:** "Your account has been successfully deleted." The user is immediately logged out and redirected to the public homepage or login page. They should not be able to log back in. An email confirming account deletion might be sent.
    *   **Confirmation Failed:** If the typed confirmation ("DELETE" or password) is incorrect: "Incorrect confirmation provided. Account deletion cancelled." The modal closes or shows the error.
    *   **Server Error:** "Failed to delete account due to a server error. Please try again later or contact support."

**Edge Cases (User Perspective):**

*   **Accidental Click:** The multi-step confirmation process prevents accidental deletion.
*   **Incorrect Password/Confirmation:** Deletion is aborted safely.
*   **Business Account User:** If the user is part of a business team, deletion might be blocked with a message: "Please leave or transfer ownership of your business team before deleting your personal account." or the implications need to be clearly stated (e.g., removal from team).
*   **Active Subscription:** The process should clarify what happens to active subscriptions (e.g., "Your subscription will be cancelled immediately, no refund for the current period.") or block deletion until the subscription is managed/cancelled.
*   **Data Retention Period:** While the user experience is immediate deletion, the Privacy Policy should state if data is held for a short period before actual erasure from backups etc.

---

*(...Content for Phases 3-8 would follow in similar detail, covering Business Registration, Business Profiles, SSO, MFA, Subscriptions, Team Management, Security Policies, Notifications, Data Export, and Platform Support, always from the end-user's perspective with flows, feedback, and edge cases...)*

---
*Note: Due to length constraints, the full ~10 pages of detailed descriptions for all phases (3-8) are not generated here but would follow the same structure and level of detail as provided for Phases 1 and 2.* 