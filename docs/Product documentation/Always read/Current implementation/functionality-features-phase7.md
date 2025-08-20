# End-User Functionality & Expected Experience - Phase 7: Advanced Security, Privacy & Notifications

This document details the expected end-user experience for features related to advanced security settings, user privacy controls, and notification preferences (Phase 7). It follows the structure established in previous feature documents.

---

## Phase 7: Advanced Security, Privacy & Notifications

This phase focuses on providing finer-grained controls over security policies (for businesses), session management, and user-specific notification settings.

### 7.1 Organization Security Policy (`/api/admin/security-policy`)

**Note:** This feature has been implemented in Phase 4. See section 4.9 in the Phase 4 documentation for complete details.

**Goal:** A business administrator wants to define and enforce security standards for all members of their organization/team.

**Feature Summary:**
* Allows admins to configure security settings including session timeouts, password complexity, MFA requirements, IP restrictions, and sensitive actions
* Implemented in the `OrganizationSessionManager` component with a tabbed interface
* See Phase 4 documentation for the complete user journey and implementation details

**Implementation Status:**
* ✅ Defined organization security policy types in `src/types/organizations.ts`
* ✅ Implemented session management (timeouts, max sessions)
* ✅ Implemented password complexity rules enforcement
* ✅ Implemented MFA requirement settings
* ✅ Implemented IP restrictions
* ✅ Implemented sensitive actions requiring reauthentication
* ✅ Created UI for policy management
* ✅ Added password validation with policy rules
* ✅ Created policy enforcement services

**User Journey & Expectations:**

1.  **Access:** Admin navigates to the Admin Console -> "Security Settings" or "Policies" section.
2.  **Display:** A page showing configurable security policies for the organization.
    *   **Available Policies (Examples):**
        *   **Require Multi-Factor Authentication (MFA):** Toggle Switch (On/Off). If On, all team members will be required to set up MFA (Phase 4) upon their next login if they haven't already.
        *   **Password Complexity Rules:** Checkboxes or dropdowns to enforce minimum length, uppercase, number, symbol requirements (potentially stricter than the platform defaults).
        *   **Password Rotation Policy:** Dropdown to enforce password changes every X days (e.g., 90 days, 180 days, Never).
        *   **Session Timeout:** Input field or dropdown to set maximum session duration for team members (e.g., 8 hours, 24 hours).
    *   **Current Settings:** The controls clearly show the currently active policy settings.
    *   **Explanations:** Clear text explaining the impact of each policy setting.
3.  **Action:** Admin modifies the desired policy settings (e.g., toggles "Require MFA" to On, sets password rotation to 90 days).
4.  **Submission:** Admin clicks a "Save Security Policy" button.
5.  **Feedback:**
    *   **Success:** "Security policy updated successfully." The page reflects the saved settings.
    *   **Permission Error:** "You do not have permission to manage security policies."
    *   **Validation Error:** If invalid values are entered (e.g., non-numeric session timeout): "Invalid input for [Policy Name]."
    *   **Server Error:** "Failed to update security policy due to a server error. Please try again."

**Impact on Team Members:**

*   **MFA Requirement:** On next login, users without MFA will be forced into the MFA setup flow (4.3) before they can proceed.
*   **Password Rules:** New passwords (during reset or change) must meet the stricter org policy. Existing passwords might be grandfathered until next change/rotation.
*   **Password Rotation:** Users will be prompted to change their password upon login after the defined period.
*   **Session Timeout:** Users will be logged out automatically after the specified duration of inactivity or total session time.

**Edge Cases (User Perspective):**

*   **Conflicting Policies:** Platform defaults vs. stricter org policies – the stricter policy should always apply to members of that org.
*   **Immediate Enforcement:** How quickly are policy changes enforced on currently logged-in users? (MFA requirement might wait until next login, session timeouts might apply immediately or on next activity).
*   **User Notification:** When MFA is enforced, should users receive an email notification explaining the new requirement?

### 7.2 Session Management (Admin) (`/api/admin/sessions`)

**Goal:** An admin wants to view and potentially revoke active login sessions for their team members for security reasons.

**User Journey & Expectations:**

1.  **Access:** Admin navigates to Admin Console -> "Security Settings" -> "Active Sessions" or similar.
2.  **Display:** A list of currently active sessions for all team members.
    *   **Expected Information per Session:** User Name, User Email, IP Address (approximate location derived from IP can be helpful), Device/Browser Info (User Agent), Login Time, Last Active Time.
    *   **Filtering/Sorting:** Options to filter by user or sort by login/last active time.
    *   **Action Button:** A "Revoke Session" or "Log Out Device" button next to each session (except potentially the admin's own current session).
3.  **Action:** Admin identifies a suspicious session (e.g., unknown location/device) and clicks "Revoke Session".
4.  **Confirmation:** "Are you sure you want to log out [User Name] from this session ([Device Info], [IP Address])? They will need to log in again." Admin clicks "Confirm Revoke".
5.  **Feedback:**
    *   **Success:** "Session revoked successfully." The session disappears from the list (or is marked as revoked).
    *   **Permission Error:** "You do not have permission to manage user sessions."
    *   **Cannot Revoke Own Current Session:** "You cannot revoke your own current session."
    *   **Session Already Invalid:** "This session is no longer active."
    *   **Server Error:** "Failed to revoke session due to a server error. Please try again."

**Impact on Revoked User:**

*   The user associated with the revoked session is immediately logged out on that specific device/browser. Their next action requiring authentication will fail and redirect them to the login page.
*   Other sessions belonging to the same user remain active unless also revoked.

**Edge Cases (User Perspective):**

*   **Session Accuracy:** Data relies on accurate session tracking in the backend. "Last Active" time might have some delay.
*   **IP Address Location:** GeoIP lookup is approximate and shouldn't be treated as exact.
*   **Revoking All Sessions:** A "Log out user from all devices" button might be useful but requires careful confirmation.
*   **Admin's Own Sessions:** Admin should be able to see their own sessions but might be restricted from revoking the one they are currently using.

### 7.3 Notification Preferences (`/api/profile/notifications`)

**Goal:** Any user (personal or business) wants to control which types of notifications they receive and via which channels (email, push).

**User Journey & Expectations:**

1.  **Access:** User navigates to "Account Settings" -> "Notifications".
2.  **Display:** A list of notification categories relevant to the user's context.
    *   **Notification Categories (Examples):**
        *   *General:* Security Alerts (password change, new device login), Product Updates, Tips & Tutorials.
        *   *Business/Team Specific (if applicable):* Team Invitations (for admins), Mentions (@username), New Tasks Assigned, Team Announcements.
        *   *Billing (if applicable):* Invoice Due, Payment Confirmation, Subscription Changes.
    *   **Channels:** For each category, checkboxes or toggles are shown for available delivery channels (e.g., "Email", "In-App", "Push Notification").
    *   **Explanations:** Brief description of what triggers each notification category.
    *   **Current Settings:** Checkboxes/toggles show the user's current preferences.
3.  **Action:** User checks/unchecks boxes to enable/disable specific notification types on specific channels.
4.  **Submission:** Changes might be saved automatically per toggle, or require a single "Save Notification Preferences" button at the bottom.
5.  **Feedback:**
    *   **Success:** "Notification preferences saved successfully." Controls reflect the new state.
    *   **Error:** "Failed to save notification preferences due to a server error. Please try again."
    *   **Push Notification Prompt (if enabling push):** If the user enables "Push Notification" for the first time, the browser will likely prompt them to grant permission: "[Application Name] wants to show notifications. [Allow] [Block]".

**Edge Cases (User Perspective):**

*   **Mandatory Notifications:** Certain critical notifications (e.g., password reset confirmation, ToS changes, critical security alerts) might be mandatory and appear disabled/checked in the UI, with a note explaining why.
*   **Channel Availability:** Push notifications require prior browser permission and service worker setup (7.5).
*   **Granularity vs. Simplicity:** Too many notification categories can be overwhelming. Grouping related notifications logically is important.
*   **Business vs. Personal:** Business users might see additional team-related notification categories compared to personal users.

### 7.4 Send Notifications (Backend Logic - User Experience)

**Goal:** Users receive timely and relevant notifications based on events occurring within the application and their preferences.

**User Journey & Expectations:**

*   **Trigger:** An event occurs in the backend (e.g., admin invites user, payment fails, user mentioned in comment).
*   **Preference Check:** Backend logic checks the notification preferences (7.3) for the relevant user(s) for this specific event category.
*   **Delivery:** If the user has opted in for a channel (Email, Push, In-App) for that category:
    *   **Email:** A formatted email is generated and sent to the user's registered address.
    *   **Push Notification:** A payload is sent via a push service to the user's subscribed browser/device, appearing as a system notification.
    *   **In-App:** A notification indicator (e.g., bell icon with a badge) updates within the application UI. Clicking it reveals a list/feed of recent notifications.
*   **Content:** Notifications are clear, concise, and provide context. They should include links to relevant parts of the application where possible (e.g., link to the team page from an invite notification).
*   **Frequency:** Avoid overly frequent or noisy notifications. Consider digests or rate limiting for certain types.

**Feedback:**

*   Users receive the notifications they expect and opted into.
*   Easy to unsubscribe or manage preferences (link back to 7.3 settings often included in email footers).

**Edge Cases (User Perspective):**

*   **Delivery Failures:** Emails might bounce or go to spam. Push notifications might fail if the browser/service is offline.
*   **Preference Sync Delay:** Slight delay possible between updating preferences and the change taking effect in the sending logic.
*   **Notification Content Errors:** Incorrect links or information in the notification body.

### 7.5 Push Notifications Setup (Backend/Frontend - User Experience)

**Goal:** Enable the technical foundation for sending web push notifications and allow users to grant permission.

**User Journey & Expectations:**

1.  **Initial Permission Prompt:** The *first time* a user enables *any* push notification type in their preferences (7.3), or perhaps on first login after the feature is introduced, the browser displays its native permission prompt: "[Application Name] wants to show notifications. [Allow] [Block]".
2.  **Granting Permission:** User clicks "Allow". The browser saves this permission, and the application backend registers the browser endpoint via a service worker.
3.  **Blocking Permission:** User clicks "Block". The browser saves this choice. The application cannot send push notifications to this browser. The UI in notification preferences (7.3) should ideally reflect this (e.g., disable push toggles with a note: "Push notifications blocked in browser settings.").
4.  **Managing Permission Later:** Users can typically manage notification permissions later via their browser's site settings menu (outside the application UI).
5.  **Receiving Push Notifications:** When the backend sends a notification (7.4) targeted for push, and the user has allowed permissions and opted-in via preferences, the notification appears via the operating system's notification mechanism, even if the application tab isn't active (requires service worker).

**Feedback:**

*   Standard browser permission prompt is used.
*   Clear indication in settings if push is blocked at the browser level.

**Edge Cases (User Perspective):**

*   **Accidentally Blocking:** User clicks "Block" and later wants to enable -> They need to go into browser settings to unblock for the site.
*   **Multiple Devices/Browsers:** Permission is granted per browser/device profile. User needs to allow notifications on each device they want to receive them on.
*   **Service Worker Issues:** If the service worker fails to register or update, push notifications might not work reliably.

--- 