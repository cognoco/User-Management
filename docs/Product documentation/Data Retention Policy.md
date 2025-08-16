# Data Retention Policy

## Overview

This document outlines the data retention policy governing how long user data is stored within the system, under what conditions data may be deleted or anonymized, and the process for notifying users about data actions related to inactive accounts.

## Definitions

- **Active Account**: An account that has been logged into at least once within the retention period.
- **Inactive Account**: An account that has not been logged into for a period exceeding the retention period.
- **Personal Data**: Any information relating to an identified or identifiable natural person.
- **Anonymization**: The process of transforming personal data in such a way that the individual is no longer identifiable.

## Retention Periods

| Data Type | Retention Period | Action on Expiry |
|-----------|------------------|------------------|
| User Accounts (Personal) | 24 months inactivity | Notification, then anonymization |
| User Accounts (Business) | 36 months inactivity | Notification, then anonymization |
| Activity Logs | 12 months | Deletion |
| Session Data | 30 days | Deletion |
| Uploaded Files | 6 months after account becomes inactive | Deletion |
| Export Data | 7 days | Deletion |

## Retention Process

1. **Identification**: A scheduled process runs monthly to identify accounts and data that have reached their retention period.
2. **Notification**: Users with accounts approaching inactivity status will receive notifications:
   - First notification: 30 days before account is marked inactive
   - Second notification: 15 days before account is marked inactive
   - Final notification: When account is marked inactive

3. **Grace Period**: After an account is marked inactive, a 30-day grace period begins during which the user can log in to reactivate their account with all data intact.

4. **Anonymization/Deletion**: If the user does not reactivate their account during the grace period:
   - Personal accounts: Personal identifying information is anonymized
   - Business accounts: Non-essential business data is anonymized
   - Related data (files, activity logs, etc.) is deleted according to the retention schedule

## Exemptions

Certain data may be exempt from the standard retention policy:

1. **Legal Requirements**: Data required to be maintained for legal compliance.
2. **Contractual Obligations**: Data needed to fulfill ongoing contractual obligations.
3. **Legitimate Business Interests**: Data necessary for legitimate business purposes, such as security or fraud prevention.

## User Controls

Users have the ability to:

1. Check their account status in the Privacy Settings section.
2. Manually reactivate an inactive account before anonymization occurs.
3. Request immediate deletion of their account data through the account deletion feature.

## Administrative Controls

System administrators can:

1. View the retention status of all accounts in the Admin Dashboard.
2. Override the automated retention process for specific accounts when legally required.
3. Generate reports on data retention metrics and compliance.

## Review and Updates

This policy will be reviewed annually or whenever there are significant changes to our systems or legal requirements.

Last Updated: [Current Date] 