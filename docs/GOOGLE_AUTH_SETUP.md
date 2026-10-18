# Production Google sign-in setup

Prepared 16 October 2026 for Supabase project `siheziegpnrfjgzubjrk` (Biz). This document contains configuration URLs only; no credentials belong in the repository or frontend environment.

## Confirmed state before setup

The Supabase dashboard showed Google disabled, with both Client IDs and Client Secret empty. Its Site URL was `https://biz-sable.vercel.app`; the four existing redirect entries covered the old Vercel root/tracker and localhost development origins. Production `https://www.unidex.co.in` callbacks were missing. The Google Cloud console was unavailable in this managed browser, so no OAuth client was created and Google sign-in has not been verified end to end.

The frontend now checks public provider availability before redirecting. While unavailable, it displays “Google sign-in is temporarily unavailable. Continue with email.” UI changes do not enable the provider.

## Google Cloud owner setup

In the [Google Auth Platform](https://console.cloud.google.com/auth/overview), select an owner-controlled project and configure Branding, Audience and Data Access. Use the application home `https://www.unidex.co.in`, privacy page `https://www.unidex.co.in/privacy` and terms page `https://www.unidex.co.in/terms` where requested. Authorize the owned domain `unidex.co.in` and complete any domain/brand verification Google requests. Configure the audience for the intended users; a Testing app may restrict access to listed test users.

Request only `openid`, `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile` for basic sign-in. No Gmail, Drive or offline-access permissions are needed.

Create an OAuth client of type **Web application** with these settings:

| Google client field | Exact production value |
| --- | --- |
| Authorized JavaScript origins | `https://www.unidex.co.in` |
| Authorized redirect URIs | `https://siheziegpnrfjgzubjrk.supabase.co/auth/v1/callback` |

The Google redirect URI is the Supabase callback, not a website login or profile path. Keep the client secret private and enter it directly in Supabase. Do not add it to `VITE_*`, source control, a message, or this document.

## Supabase configuration

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/siheziegpnrfjgzubjrk/auth/url-configuration), set **Site URL** to:

```text
https://www.unidex.co.in
```

Add these complete **Redirect URLs** for the current frontend:

```text
https://www.unidex.co.in/login?oauth=google&next=%2Fprofile
https://www.unidex.co.in/login?oauth=google&next=%2Fonboarding
https://www.unidex.co.in/onboarding
https://www.unidex.co.in/reset-password
```

The first two are the exact Google callbacks used by Login and Signup respectively. Both stay on the current origin, and the code only accepts `/profile` or `/onboarding` as the next page. Keeping these two exact entries requires no additional broad wildcard and preserves the intended signup destination. The other two support email confirmation and password reset. Preserve existing entries needed by active deployments; remove obsolete development/preview entries only after confirming their owners no longer need them.

In [Authentication → Sign In / Providers → Google](https://supabase.com/dashboard/project/siheziegpnrfjgzubjrk/auth/providers), enter the Google Web client ID and client secret, enable Google, and save. Leave nonce checking enabled. This frontend uses the Supabase browser OAuth flow and does not need a Google client secret in Vercel.

The canonical production origin is `https://www.unidex.co.in`. If the apex domain, a Vercel deployment or a private preview must independently support authentication, first confirm that origin is owner-controlled, then add its exact origin to Google and its exact callback URLs to Supabase. Prefer redirecting alternate public origins to the canonical `www` origin before sign-in. Do not authorize every Vercel or preview subdomain.

## Verification after configuration

1. Confirm public `GET /auth/v1/settings` reports `external.google: true` without reading any private account data.
2. From production Login, authorize a designated test Google account and confirm return to the same-origin login callback, then `/profile`, with a persistent Supabase session after refresh.
3. From production Signup, confirm the callback continues to `/onboarding` and the Google name/email populate the profile defaults.
4. Cancel Google's consent screen and confirm a brief cancellation message appears on Login. Exercise provider/network failure and confirm email sign-in remains usable.
5. Verify the production email-confirmation and password-reset callbacks separately using an authorized test account. Do not consider a provider-enabled flag proof of a successful login round trip.

## Official references

- [Supabase: Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

Configuration follows the current official guides checked on 16 October 2026. Hosted configuration and a real authorized login remain owner setup steps until verified.

## Current check — 18 October 2026

The production project’s public `/auth/v1/settings` endpoint still reports `external.google: false` and email enabled. The frontend callback, user consent redirect and safe destination handling are implemented; a new login screen alone cannot enable the disabled server provider. The Google Cloud Clients console returned “Site Unavailable” in this browser on a direct visit and one reload. Plugin discovery found no connected capability for creating an OAuth web client. No Google credentials or provider settings were changed.

An owner of the Google Cloud project must complete the one-time OAuth Web application creation and enter its client ID/secret directly into Supabase using the exact origin/callback values above. Keep the secret out of chat, source control and frontend variables. The connected Supabase tools cannot update Auth provider credentials. Once configured, the current Sign in with Google action sends the user to Google’s account/consent screen and returns through Supabase; verify an authorized live login before declaring it operational. No paid OCR plan or credit purchase is needed for the browser-local extraction release.
