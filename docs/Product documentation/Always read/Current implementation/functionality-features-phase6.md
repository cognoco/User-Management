# End-User Functionality & Expected Experience - Phase 6: Team Management & Business Admin

This document details the expected end-user experience for features related to managing teams within a business account and administrative controls (Phase 6). It follows the structure established in previous feature documents.

---

## Phase 6: Team Management & Business Admin

This phase empowers administrators of business accounts to manage their team members, roles, and permissions.

### 6.1 Invite Team Member (`/api/team/invites`)

**Goal:** A business administrator wants to invite a new person to join their company's team on the platform.

**User Journey & Expectations:**

1.  **Access:** Admin navigates to the "Team Management", "Users", or "Members" section within their company settings/admin console.
2.  **Initiation:** Admin clicks an "Invite Member" or "Add User" button.
3.  **Form Display:** A modal or form appears prompting for invitee details.
    *   **Expected Fields:**
        *   Email Address (of the person being invited).
        *   Role (Dropdown list of available roles defined in 6.6 - e.g., "Admin", "Member", "Viewer").
    *   **Information:** May display remaining available seats based on subscription plan (linking to 5.8). If seats are full, the invite button might be disabled with a prompt to upgrade.
4.  **Submission:** Admin enters the email address, selects a role, and clicks "Send Invite".
5.  **Feedback:**
    *   **Success:** "Invitation sent successfully to [invitee_email]. They will appear as 'Pending' until they accept." The invited user might immediately appear in the team list (6.3) with a "Pending" status.
    *   **Validation Error:** "Please enter a valid email address." or "Please select a role."
    *   **Seat Limit Reached:** "Cannot send invite. You have reached your plan limit of [N] seats. Please [Upgrade Plan/Add Seats Link]."
    *   **Already Invited:** "An invitation has already been sent to [invitee_email] and is pending."
    *   **Already a Member:** "[invitee_email] is already a member of this team."
    *   **Server/Email Error:** "Failed to send invitation due to a server error. Please try again." or "Failed to send invitation email. Please check configuration or try again."
    *   **Rate Limiting:** "Too many invitations sent recently. Please try again later."

**Edge Cases (User Perspective):**

*   **Inviting Existing Platform User:** If the invited email *already* has a personal (or another business) account on the platform, the invite flow should still work. Accepting the invite (6.2) will link their existing user identity to the new company team.
*   **Typo in Email:** Invite goes to the wrong address or bounces. Admin might need to revoke/resend.
*   **Role Selection:** Admin must understand the permissions associated with each role they assign (defined in 6.6).
*   **Invite Expiry:** Invitations should expire after a reasonable period (e.g., 7 days). The UI might indicate expiry dates for pending invites.

### 6.2 Accept Team Invite (`/api/team/invites/accept`)

**Goal:** A person who received an email invitation wants to accept it and join the team.

**User Journey & Expectations:**

1.  **Access:** Invitee receives an email with a clear subject like "You're invited to join [Company Name] on [Application Name]".
    *   **Email Content:** Contains a brief explanation, the inviting company's name, and a prominent "Accept Invitation" button/link.
2.  **Action:** Invitee clicks the "Accept Invitation" link.
3.  **Redirection & Handling:** The link directs the user to the application.
    *   **Scenario A (User Not Logged In / New User):**
        *   User is taken to a Sign Up page, possibly pre-filled with their invited email address.
        *   They complete the standard registration process (Name, Password - see Phase 1, Section 1.1 or 3.1 depending on if business details are needed immediately).
        *   Upon successful registration & email verification (if required by policy), they are automatically added to the inviting company's team with the assigned role and logged in.
    *   **Scenario B (User Logged In with Matching Email):**
        *   If the user is already logged into the application with the *same email address* the invite was sent to, they are presented with a confirmation screen: "Accept invitation to join [Company Name] as a [Role Name]?"
        *   User clicks "Accept". They are now part of the team. Their user context/UI might update to reflect team membership.
    *   **Scenario C (User Logged In with Different Email):**
        *   User is prompted to log out and log back in using the email address the invitation was sent to.
4.  **Feedback:**
    *   **Success:** "Invitation accepted! You are now a member of the [Company Name] team." User is redirected to the team dashboard or relevant starting page.
    *   **Invalid/Expired Token:** "This invitation link is invalid or has expired. Please ask the administrator of [Company Name] to send a new invitation."
    *   **Invite Revoked:** "This invitation has been revoked by the administrator."
    *   **Already Accepted/Member:** "You are already a member of this team." or "This invitation has already been accepted."
    *   **Team Full:** If the team hit its seat limit *after* the invite was sent but *before* acceptance: "Cannot accept invitation. The [Company Name] team has reached its member limit. Please contact their administrator."
    *   **Server Error:** "Failed to accept invitation due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Accepting Multiple Invites:** If invited to multiple teams, the process should work independently for each invite.
*   **Ignoring Invite:** Invite remains pending until expiry or revocation.
*   **Forwarding Invite Email:** Invite links are typically unique and tied to the email; forwarding might not work as expected or could be a security risk if not handled carefully.

### 6.3 List Team Members (`/api/team/members`)

**Goal:** A business user (especially admin) wants to see the list of people who are part of their company's team.

**User Journey & Expectations:**

1.  **Access:** User navigates to the "Team Management", "Users", or "Members" section.
2.  **Display:** A table or list of team members is displayed.
    *   **Expected Columns/Info:** Name, Email Address, Role, Status (e.g., "Active", "Pending Invitation"), Last Active Date (optional).
    *   **Sorting/Filtering:** Options to sort by Name, Role, Status, etc. A search bar to filter by name or email.
    *   **Pagination:** If the team is large, pagination is necessary.
    *   **Actions (for Admins):** For each member (except perhaps themselves), admins might see action buttons/menus (e.g., "Edit Role", "Remove"). For pending invites, options like "Resend Invite" or "Revoke Invite".
    *   **Seat Count:** The current seat usage (e.g., "7 / 10 seats used") should be clearly visible on this page.

**Feedback:**

*   List updates dynamically as members accept invites or are removed.
*   Clear indication of user status.

**Edge Cases (User Perspective):**

*   **Large Teams:** Performance of loading, searching, and paginating the list needs to be efficient.
*   **Distinguishing Admins:** Admins should be clearly identifiable in the list (e.g., special badge or role name).
*   **Error Loading:** "Could not load team members list. Please try again later."

### 6.4 Assign/Update Role (`/api/team/members/{userId}/role`)

**Goal:** An admin wants to change the role (and therefore permissions) of an existing team member.

**User Journey & Expectations:**

1.  **Access:** In the team members list (6.3), the admin finds the member whose role they want to change.
2.  **Action:** Admin clicks an "Edit Role" button/icon or directly clicks on the current role shown for that user.
3.  **Control:** A dropdown menu or modal appears, showing the list of available roles (defined in 6.6).
4.  **Selection:** Admin selects the new desired role for the user.
5.  **Confirmation (Optional but Recommended):** A confirmation prompt might appear: "Change [User Name]'s role from [Old Role] to [New Role]?" User clicks "Confirm".
6.  **Feedback:**
    *   **Success:** "[User Name]'s role updated to [New Role] successfully." The list visually updates to show the new role.
    *   **Permission Error:** If a non-admin tries this: "You do not have permission to change user roles."
    *   **Cannot Change Own Role (Policy):** Admins might be prevented from changing their *own* role, especially if they are the last admin: "You cannot change your own role." or "Cannot remove the last administrator."
    *   **Invalid Role:** If somehow an invalid role is selected: "Invalid role selected."
    *   **Server Error:** "Failed to update role due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Changing Last Admin:** Preventing the team from being left without any administrator is crucial.
*   **Impact of Role Change:** The change in permissions should take effect immediately (or upon the user's next session refresh).
*   **Accidental Click:** Confirmation step helps prevent accidental role changes.

### 6.5 Remove Team Member (`/api/team/members/{userId}`)

**Goal:** An admin wants to remove a person from their company's team.

**User Journey & Expectations:**

1.  **Access:** In the team members list (6.3), admin finds the member to remove.
2.  **Action:** Admin clicks a "Remove" or "Delete" button/icon (often a trash can) associated with that user.
3.  **Confirmation:** A modal dialog appears with a strong warning: "Are you sure you want to remove [User Name] ([User Email]) from the [Company Name] team? They will lose access to all team resources. This action cannot be undone easily." An input field requiring typing "REMOVE" or similar could be used for extra safety.
4.  **Submit Confirmation:** Admin confirms the removal.
5.  **Feedback:**
    *   **Success:** "[User Name] has been removed from the team." The user disappears from the team list. The available seat count might update.
    *   **Permission Error:** "You do not have permission to remove team members."
    *   **Cannot Remove Self:** "You cannot remove yourself from the team. Leave the team or transfer ownership instead." (Requires separate 'Leave Team' or 'Transfer Ownership' flows).
    *   **Cannot Remove Last Admin:** "Cannot remove the last administrator. Assign the admin role to another member first."
    *   **Server Error:** "Failed to remove team member due to a server error. Please try again."

**Edge Cases (User Perspective):**

*   **Impact on Removed User:** The removed user immediately loses access to company-specific data/features. Their individual account (personal or linked via SSO) still exists, but is no longer associated with this team.
*   **Data Ownership/Transfer:** What happens to data created by the removed user? Policies might dictate transfer or deletion, which should be considered.
*   **Seat Licensing:** Removing a user should free up a licensed seat (linking to 5.8). Whether this automatically reduces the bill depends on the subscription management policy.
*   **Removing Pending Invite:** The action might be "Revoke Invite" instead of "Remove Member", with different confirmation text.

### 6.6 Role Definition (RBAC) (Backend/Config - User Facing Aspect)

**Goal:** Admins need to understand what permissions are associated with the roles they can assign.

**User Journey & Expectations:**

1.  **Implicit Understanding:** When assigning roles (6.1, 6.4), the role names themselves should be reasonably descriptive (e.g., "Admin", "Member", "Billing Manager", "Viewer").
2.  **Explicit Documentation/UI (Recommended):**
    *   A dedicated "Roles & Permissions" page or section within the Admin Console.
    *   Lists the available roles.
    *   For each role, clearly lists the key permissions/capabilities associated with it (e.g., "Admin: Can manage team members, billing, company settings", "Member: Can access team resources, cannot manage users or billing", "Viewer: Read-only access").
    *   This page might be informational only, or potentially allow defining *custom* roles in very advanced tiers.

**Feedback:**

*   Clarity for admins on the impact of assigning different roles.

**Edge Cases (User Perspective):**

*   **Ambiguous Role Names:** If role names aren't clear, admins might assign incorrect permissions.
*   **Granular Permissions:** If permissions are very granular, the UI needs a clear way to display them without overwhelming the admin.

### 6.7 Permission Checks (Middleware/Backend Logic - User Experience)

**Goal:** Ensure users can only perform actions and access data allowed by their assigned role within the team.

**User Journey & Expectations:**

*   **Attempting Unauthorized Action:** A user tries to access a page or perform an action they don't have permission for (based on their role).
    *   **Scenario A (UI Element Disabled/Hidden):** The button/link for the action is grayed out or not visible in the first place (e.g., a "Member" role doesn't see the "Invite Member" button).
    *   **Scenario B (Access Denied Message):** If the user somehow navigates to a restricted URL or tries to trigger an action via other means, they receive a clear error message: "Access Denied. You do not have the necessary permissions to perform this action." or "You need administrator privileges to access this page."
*   **Data Visibility:** Users should only see data relevant to their team and role (e.g., a member of Team A cannot see Team B's members or data).

**Feedback:**

*   Permissions should feel intuitive and consistently enforced.
*   Clear error messages when access is denied, avoiding generic/confusing errors.

**Edge Cases (User Perspective):**

*   **UI vs. API Mismatch:** Frontend might incorrectly show an option, but the backend correctly denies the action -> Leads to user confusion.
*   **Role Change Delay:** After an admin changes a user's role, the new permissions should ideally take effect very quickly (next request or session refresh).
*   **Combined Permissions:** If a user belongs to multiple teams/contexts, how permissions combine needs careful consideration.

### 6.8 Admin Console Overview (`/api/admin/dashboard`)

**Goal:** Provide business administrators with a high-level summary of their team's status and key metrics.

**User Journey & Expectations:**

1.  **Access:** Admin logs in and navigates to the primary "Admin Console" or "Dashboard" section for their business account.
2.  **Display:** A dashboard layout with widgets/summaries is shown.
    *   **Expected Information:**
        *   Team Size (e.g., "7 Active Members", "2 Pending Invitations").
        *   Seat Usage (e.g., "7 / 10 Seats Used") with link to manage subscription/seats.
        *   Current Subscription Plan Name with link to billing.
        *   Quick links to common admin actions (Invite Member, Manage Roles).
        *   Potentially recent activity feed (e.g., "[User Name] accepted invitation", "[User Name] joined").
        *   Company Verification Status (if applicable).

**Feedback:**

*   Provides a quick snapshot and entry point for common admin tasks.
*   Data should be up-to-date.

**Edge Cases (User Perspective):**

*   **Widget Loading Errors:** If data for a specific widget fails to load: "Could not load [Widget Name] data."
*   **First-Time Admin:** Dashboard might show prompts or guides for setting up the team.

--- 