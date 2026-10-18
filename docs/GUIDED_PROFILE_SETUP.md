# Guided profile setup

Signed-in students opening `/profile` or `/profile/edit` enter a dedicated setup flow when their profile is incomplete. Existing established profiles keep access to their overview. Routing waits for a successful, current-account profile load; a failed request offers a retry instead of treating the account as new.

## Student flow

1. **Welcome** — “Let’s get you started” explains the three parts of setup.
2. **Documents** — recommend mark sheets first, then available exam results, résumé and photo. Uploads and ID proofs are optional. Students can enter details manually instead.
3. **Extract and check** — `/documents?setup=1` keeps the guided layout after refresh. Students can select uploaded files together, approve supported empty-field autofill, and review conflicts. Existing free local extraction limits and approval controls remain in place.
4. **Your details** — personal information, education, exams, experience and preferences appear one section at a time. Save and continue (or save and go back) confirms the save before changing steps. Pending exam results, experience, salary and academic records can be added later.
5. **Review** — a summary shows saved values and records still to add. The student must confirm they have cross-checked their details. Setup is marked complete only after the server confirms the save.
6. **Overview** — `/profile` shows saved profile summaries and actions for colleges, documents and applications. `/profile/edit` retains the full section editor. `/account` keeps account management available during setup.

## Persistence and concurrency

The existing private profile JSON stores bounded `onboarding` metadata: version, current step, document choice and completion timestamp. No schema migration or new storage policy is needed. Auth-provided name/email alone never count as completed setup.

Each step uses the existing owner-scoped API and revision checks. Metadata transitions read the latest profile; stale views are refreshed rather than overwriting another window's changes. Document continuation preserves any later saved setup step. Profile edits retain AI-source correction warnings, frozen review snapshots and revision checks.

Progress is saved at step boundaries. The form identifies unsaved changes; students should use its save controls before leaving. Uploading a document does not automatically verify extracted information or submit a college application.

## Verification

Vitest covers metadata validation, new and legacy accounts, profile-load retries and response races, profile entry routing, guided section rendering, document continuation and saved-step protection. Existing extraction, profile review, applications and authentication regression suites remain part of `npm test`. Run `npm run lint` and `npm run build` before publication.
