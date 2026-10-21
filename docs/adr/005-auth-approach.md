# ADR-005: Authentication approach

Status: Proposed · Date: 2026-10-20

## Context
Unusual requirements: **phone-number-first passwordless OTP** for guardians (incl. WhatsApp/SMS delivery with our own routing), **MSISDN + PIN** over USSD, email/password + MFA for staff, tokens scoped per school, user in many schools.

## Options
1. **Managed IdP** (Clerk/Auth0/Cognito/Keycloak): faster for staff login, MFA, sessions; but SMS OTP cost/routing, MSISDN+PIN for USSD, and multi-tenant membership model still need custom logic; vendor cost scales with MAU (parents are many).
2. **Self-built on proven libraries** (e.g. Lucia-style sessions/JWT, `otplib`, Argon2): full control of OTP via our alert service and USSD PIN; more security responsibility.
3. **Hybrid**: managed IdP for staff/platform users (MFA, SSO later) + custom phone-OTP/PIN service for guardians and students.

## Decision (proposed)
**Hybrid (3)** — or self-built (2) if MAU-based pricing for parents proves prohibitive. Regardless, authorization (memberships, roles, guardian-student links) is **our own** policy layer, not delegated to the IdP.

## Consequences
+ Staff get hardened MFA quickly; guardians get cost-controlled, channel-routed OTP and USSD PIN.
− Two auth paths to secure/test; unify at the token layer (same JWT claims and middleware).
