# SSO Troubleshooting Guide

This guide provides common steps to diagnose Single Sign-On (SSO) issues when integrating the User Management Module.

## Common Configuration Problems

- **Invalid metadata URL** – ensure the identity provider metadata URL is reachable and contains valid XML.
- **Missing client credentials** – for OIDC providers, verify `clientId` and `clientSecret` are configured correctly.
- **SAML certificate errors** – confirm the certificate is in PEM format and matches the IdP configuration.

## Federation Failures

Federation errors often occur when the IdP rejects the authentication request or returns malformed assertions. Check the provider logs and verify that the service provider entity ID and ACS URLs match the values configured in the IdP.

## Diagnostic Logs

The `DefaultSsoService` logs structured errors for every failed operation. Inspect the server logs for entries containing the `SSO_` error codes. These messages include the stage of the authentication process where the failure occurred.

## Further Assistance

If issues persist, enable verbose logging in your identity provider and compare timestamps with the application logs. Most configuration problems can be resolved by ensuring that the metadata and credentials used by both sides match exactly.
