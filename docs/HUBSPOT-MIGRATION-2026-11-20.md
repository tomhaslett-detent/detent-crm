# Detent HubSpot CRM migration

The supplied 20 November 2026 CSVs were loaded into Detent CRM through Base44's authenticated bulk entity API after the app was switched to private with login. The files came from Detent HubSpot portal 149444037. The import retained the source identity on each record and retained populated source properties for administrator review.

| Measure | Verified from Base44 |
| --- | ---: |
| Unique company source IDs | 13,477 |
| Unique contact source IDs | 10,494 |
| Company links across contact records | 10,907 |

The Settings import count check matched both export counts. This load skips known source IDs and verifies persisted IDs and associations. The imported records are initially unassigned. Retained source owner labels still need to be mapped to active CRM members and teams.

The record CSVs reference 793 emails, 535 notes, 13 meetings, 10 tasks, 2 calls and 1 deal. The deal was recovered from HubSpot and imported under source ID 527474016496. Verification confirmed one stored deal, three company links including the primary company, and one contact link. Appointment Scheduled maps to Prospect, and the original pipeline and stage are retained. The source amount was blank. Activity content, property history and attachments are outside these two exports. Every contact's global email unsubscribe cell was blank and maps to unknown. The contact source file contained 3,599 populated legal-basis values. A sample in Detent was verified. Global and per-email opt-out flags and linked consent/subscription IDs were blank in the export. Subscription preferences and consent evidence need separate extraction and verification.

## Reconciliation and cutover

A full destination scan found 13,477 distinct company source IDs and 10,494 distinct contact source IDs. Counts and checksums matched the source files after resolving destination company IDs back to source IDs. The contact comparison included the primary company and all 10,907 company links. Every destination link resolved. This check covered identity and company associations.

The two supplied exports identify 1,353 unique activity records. Their content requires a separate extraction. Use the activity ID inventory with **Settings → Import activity** to compare the extracted file with the known source IDs. Each file can be validated separately. Use the full source inventory and stored totals to assess cutover coverage.

Use **Command Centre → Run migration preview** after authorizing the HubSpot connection. Verify the Detent portal and review access to each activity type. The preview reads samples and does not write CRM records. Attachments, property history, and subscription or consent evidence still require separate extraction and reconciliation.

The activity association inventory contains 2,891 links to 1,618 distinct destination companies or contacts. All referenced source IDs resolved against the full Base44 company and contact scan. A synthetic import-file validation restored exactly those 2,891 links across 1,353 activities. These checks establish link coverage. The source activity bodies, timestamps, attachment contents and consent history remain unverified, and no synthetic records were written to CRM.
