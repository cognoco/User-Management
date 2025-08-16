# End-User Functionality & Expected Experience - Phase 3: Business User Registration & Core Profile

This document details the expected end-user experience for features related to Business User registration and basic profile management (Phase 3), following the structure established in `docs/functionality-features.md`.

---

## Phase 3: Business User Registration & Core Profile

This phase introduces the distinct flow for business/corporate users, allowing them to register with company details and manage their basic business profile.

### 3.1 Business Registration (`/api/auth/register` - Extended)

**Goal:** A new user wants to create a business/corporate account, potentially associating themselves with a company.

**User Journey & Expectations:**

1.  **Access & Selection:**
    *   User navigates to the Sign Up/Register page.
    *   Clear options/tabs are presented to distinguish between "Personal Account" and "Business Account" registration. User selects "Business Account".
2.  **Form Display:** A registration form tailored for business users appears.
    *   **User Fields:** First Name, Last Name, Email Address, Password, Confirm Password (same requirements and dynamic helper behavior as personal registration - see Phase 1, Section 1.1).
    *   **Company Fields:** Company Name, Company Size (e.g., dropdown: 1-10 employees, 11-50, 51-200, 201+), Industry (e.g., dropdown or searchable list), Company Website (optional, validated for URL format).
    *   **User Role within Company:** Position/Job Title, Department (optional).
    *   **Contact Fields:** State/Province, City, Contact Email, Contact Phone (all required).
    *   **VAT ID:** Optional field, not validated or required for registration.
    *   **Terms & Conditions:** The same mandatory T&C checkbox and **clickable links** as in personal registration are required.
3.  **Submission:** User fills in all required fields, ensuring password requirements are met and T&C are accepted. User clicks "Register Business Account" or similar.
4.  **Feedback:**
    *   **Success:** "Registration successful! Please check your email inbox ([user's email]) for a verification link to activate your account and access your business profile." Similar to personal registration, the user is *not* logged in automatically. They might be redirected to the login page or a "Check Your Email" page.
    *   **Validation Errors (Client-side/Real-time):** Specific errors appear under relevant fields for invalid email, password mismatch/weakness, missing required fields (including company name, size, industry), invalid URL format for the website.
    *   **Server Errors (Post-Submit):**
        *   *Email Already Exists:* "An account with this email address already exists. Please [Login Link] or use a different email."
        *   *Company Already Claimed/Exists (Potential):* Depending on the business logic (e.g., if company domains need to be unique or verified), an error like "A business profile for this company domain/name might already exist. Please contact support if you believe this is an error." could occur.
        *   *General Server Error:* "Registration failed due to a server error. Please try again later."
        *   *Rate Limiting:* "Too many registration attempts. Please try again later."

**Edge Cases (User Perspective):**

*   **Existing Personal User Email:** If a user tries to register a business account with an email already used for a personal account, the system should ideally prompt: "This email is already registered for a personal account. Would you like to [Upgrade to Business Account Link] or use a different email?" (Requires an account conversion flow).
*   **Uncertain Company Size/Industry:** Dropdowns should include an "Other" or "Not Specified" option if applicable.
*   **Company Website Validation:** Handles various URL formats (http, https, www, no protocol) gracefully or enforces a specific format with clear instructions.
*   **Multiple Users from Same Company:** The initial registration creates *a* user associated with the company. How subsequent users join (invites vs. registration and matching domain) is covered in Team Management (Phase 6), but this initial registration should succeed even if others from the same company exist.
*   **Typo in Company Name:** User registers with "Acem Corp" instead of "Acme Corp". They should be able to correct this later via profile editing (Section 3.3).

### 3.2 Get Business Profile (`/api/profile/business`)

**Goal:** A logged-in business user wants to view their combined personal and company profile information.

**User Journey & Expectations:**

1.  **Access:** User logs in (potentially via business SSO later) and navigates to their "Profile" or "Company Settings" page.
2.  **Display:** The page displays information related to both the user and their associated company.
    *   **User Info Section:** Name, Job Title, Department, Email Address (read-only), User Avatar (if set - see 2.3).
    *   **Company Info Section:** Company Name, Company Logo (if set - see 3.4), Company Size, Industry, Website, Business Contact Number (required), State/Province (required), City (required), Contact Email (required), VAT ID (optional, not validated), Business Address (optional, for display only).
    *   **Verification Status:** Any company or domain verification status (see 3.6, 3.7) should be clearly displayed (e.g., "Verified", "Pending Verification", "Verification Required").
    *   **Layout:** Information is clearly separated and labeled (e.g., "Your Details", "Company Details").
    *   **Edit Button(s):** Clear "Edit Profile" / "Edit Company Details" button(s) are visible, likely requiring specific permissions (e.g., only company admin can edit company details).

**Edge Cases (User Perspective):**

*   **Error Fetching Data:** "Could not load business profile information. Please refresh the page or try again later."
*   **Incomplete Company Profile:** Fields not set during registration or later editing (e.g., Website, Address, Logo) show placeholders or are clearly marked as not set.
*   **User Not Associated with Company:** If somehow a user marked as 'business' isn't linked to company data, an error state or prompt to complete company setup should appear.
*   **Multiple Roles/Permissions:** If the user has different roles (e.g., regular team member vs. admin), the view might slightly differ, especially regarding edit controls.

### 3.3 Update Business Profile (`/api/profile/business`)

**Goal:** An authorized business user (e.g., company admin) wants to modify the company's details.

**User Journey & Expectations:**

1.  **Access:** From the business profile view (3.2), the user (assuming they have permissions) clicks "Edit Company Details".
2.  **Form Display:** The company-specific fields become editable inputs, pre-filled with current data.
    *   **Editable Fields:** Company Name, Company Size, Industry, Website, Business Contact Number (required), State/Province (required), City (required), Contact Email (required), VAT ID (optional, not validated), Business Address (optional).
    *   **Controls:** Text inputs, dropdowns, potentially address lookup/validation integrations.
    *   **Save/Cancel Buttons:** "Save Company Changes" and "Cancel" buttons appear.
3.  **Input:** User modifies the desired company fields. Real-time validation applies (e.g., URL format, VAT ID format if applicable).
4.  **Submission:**
    *   **Save:** User clicks "Save Company Changes".
    *   **Cancel:** User clicks "Cancel". Changes are discarded, view reverts to read-only.
5.  **Feedback (On Save):**
    *   **Success:** "Company profile updated successfully." The page switches back to the read-only view, displaying the new information.
    *   **Permission Error:** If a non-admin user somehow tries to access or save: "You do not have permission to edit company details."
    *   **Validation Error:** Server-side validation catches errors (e.g., missing required contact fields, invalid email/phone format). VAT ID is not validated.
    *   **Network/Server Error:** "Failed to update company profile due to a network/server error. Please try again." Input retains attempted changes.

**Edge Cases (User Perspective):**

*   **Editing Restricted Fields:** Certain fields might become read-only after initial validation (e.g., a validated VAT ID might not be editable without re-validation).
*   **Impact on Verification:** Changing critical details (like Company Name or VAT ID) might trigger a re-verification process or change the company's status back to "Unverified", which should be communicated clearly to the user (e.g., "Saving these changes will require re-validation of your company.").
*   **Concurrent Edits:** If two admins try to edit simultaneously, the system should handle this gracefully (e.g., last write wins, with potential notification, or optimistic locking preventing the second save).

### 3.4 Company Logo Upload (`/api/profile/logo`)

**Goal:** An authorized business user wants to upload or change the company's logo.

**User Journey & Expectations:**

1.  **Access:** In the business profile view (3.2) or edit mode (3.3), the user clicks on the current company logo, a placeholder logo, or a dedicated "Change Logo" / "Upload Logo" button.
2.  **File Selection:** OS file browser opens. Instructions on allowed file types (JPG, PNG, GIF - possibly SVG) and max file size are visible.
3.  **Cropping/Preview (Recommended):** Similar to the personal avatar (2.3), a cropping tool appears, likely enforcing a square or specific aspect ratio suitable for logos. A preview is shown.
4.  **Submission:** User adjusts crop (if applicable) and clicks "Save Logo" or "Apply".
5.  **Feedback:**
    *   **Success:** New logo appears immediately in the profile. "Company logo updated successfully."
    *   **Permission Error:** "You do not have permission to change the company logo."
    *   **Invalid File Type/Size:** Immediate client-side error.
    *   **Upload/Processing Error:** "Failed to upload logo. Please try again."
    *   **Network Error:** "Network error during upload. Please try again."

**Edge Cases (User Perspective):**

*   **Transparency:** If PNGs with transparency are allowed, ensure they render correctly against different backgrounds where the logo might be used.
*   **SVG Support:** If SVGs are allowed, ensure proper sanitization and rendering.
*   **No Crop Tool:** If omitted, automatic resizing rules should be clear (e.g., "Logo will be resized to fit 200x200px"). Cropping is preferred for user control.

### 3.5 Business Address Management (`/api/profile/business` - Part of Update)

**Goal:** User wants to add or edit the company's contact and address information.

**User Journey & Expectations:**

1.  **Access:** This is handled within the "Update Business Profile" flow (Section 3.3).
2.  **Form Display:** Dedicated fields for contact and address are presented in the edit mode.
    *   **Expected Fields:** State/Province (required), City (required), Contact Email (required), Contact Phone (required), VAT ID (optional), Business Address (optional, e.g., Street Address Line 1/2, Postal Code, Country).
    *   **No address or business existence validation is performed.**
3.  **Input:** User enters or modifies the contact and address components.
4.  **Submission:** Saved along with other company details via "Save Company Changes".
5.  **Feedback:** Success/error messages are part of the main profile update feedback.
    *   **Validation:** Specific errors if required contact fields are missing or formats are incorrect (e.g., email/phone format). VAT ID is not validated.

**Edge Cases (User Perspective):**

*   **International Addresses:** Form must accommodate various global address formats. Country selection might dynamically change required fields or labels (e.g., State vs. Province vs. County, Postal Code vs. ZIP Code).
*   **PO Boxes:** Ensure the fields allow for PO Box information if applicable.

### 3.6 Company Validation (`/api/company/validate` - Trigger/Status Check)

**No company existence or VAT ID validation is performed at this stage. VAT ID is optional and not validated.**

**Possible User Journey & Expectations (Example: VAT ID Check):**

1.  **Access:** May happen automatically after entering/updating a VAT ID in the Business Profile (3.3), or there might be a dedicated "Validation" section in Company Settings.
2.  **Status Display:** A clear status indicator is shown:
    *   "Status: Not Validated" (if no VAT ID entered or check not run).
    *   "Status: Pending Validation" (if check is in progress).
    *   "Status: Verified" (if check passed).
    *   "Status: Validation Failed - [Reason, e.g., Invalid VAT ID]" (if check failed).
3.  **Action (If Manual Trigger):** A button like "Validate Company" or "Verify VAT ID" might be present.
4.  **Feedback:**
    *   **On Trigger:** "Company validation initiated. Status will be updated shortly."
    *   **On Status Change:** The status indicator updates. A notification might also be sent (e.g., email: "Your company has been successfully verified" or "Action required: Company validation failed").

**Edge Cases (User Perspective):**

*   **Validation Service Downtime:** Status shows "Pending" or an error like "Validation service unavailable. Please try again later."
*   **Ambiguous Failures:** If a VAT ID is technically valid but doesn't match the company name/address in the registry, the error message needs to be clear about the mismatch.
*   **Changing Details Post-Validation:** As mentioned in 3.3, changing critical validated details (VAT ID, Company Name) should reset the status to "Not Validated" and potentially require re-triggering.

### 3.7 Business Domain Verification (`/api/company/verify-domain`)

**Goal:** Allow a company admin to prove ownership of their company's website domain, often used to automatically approve team members joining with matching email domains.

*Note: Requires a defined method, e.g., DNS record check or email verification to webmaster@domain.*

**Possible User Journey & Expectations (Example: DNS Record Check):**

1.  **Access:** User navigates to a "Domain Verification" section in Company Settings.
2.  **Instructions:** Clear instructions are provided:
    *   The company domain detected (from the website field in the profile) is displayed: `yourcompany.com`.
    *   Instructions: "To verify ownership of `yourcompany.com`, please add the following TXT record to your domain's DNS settings:"
    *   A unique verification code/string is displayed (e.g., `your-unique-verification-code`).
    *   Guidance: "This record usually takes a few hours to propagate. Once added, click the 'Verify Domain' button below."
    *   Link to generic help/FAQ about adding DNS TXT records.
3.  **Status Display:** Shows current status: "Domain: `yourcompany.com` - Not Verified" or "Verified".
4.  **Action:** After adding the DNS record, the user returns and clicks the "Verify Domain" button.
5.  **Feedback:**
    *   **Verification Check Initiated:** "Checking DNS records for `yourcompany.com`. This may take a moment..."
    *   **Success:** Status updates to "Verified". "Domain `yourcompany.com` successfully verified!"
    *   **Failure (Record Not Found):** "Verification failed. We could not find the required TXT record. Please ensure the record was added correctly and allow time for DNS propagation (up to 48 hours)."
    *   **Failure (Incorrect Record):** "Verification failed. Found a TXT record, but the code does not match."
    *   **Error:** "Could not check domain verification status due to a server error. Please try again later."

**Edge Cases (User Perspective):**

*   **DNS Propagation Delay:** User clicks "Verify" too soon. They get the "Not Found" error and should understand they need to wait longer.
*   **Multiple Domains:** If companies can associate multiple domains, the UI needs to manage verification for each one.
*   **Changing Company Website:** If the website URL in the profile (3.3) is changed, the domain verification status should reset, and the user prompted to verify the new domain.
*   **Alternative Methods (e.g., Email):** If email verification is used, the flow would involve sending an email to `admin@yourcompany.com` or `webmaster@yourcompany.com` with a verification link.

--- 