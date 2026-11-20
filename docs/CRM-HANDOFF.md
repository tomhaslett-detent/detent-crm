# Detent CRM handoff

This standalone Base44 app is a development workspace. CRM screens are under `src/routes/_authed/`. Pipeline business rules live in `src/lib/crm.js` and deal and activity writes in `src/lib/dealActions.js`. Base44 entities are Account, Contact, Deal and Activity.

## Export

An admin or RevOps user can select **Download CRM export** in **Settings** to get JSON containing all four CRM record types, their Base44 IDs and links. Pause edits for a consistent handoff and store the file securely. The export is a logical data extract, not a point-in-time database backup.

Load accounts before contacts, then deals, then activities. Build an ID crosswalk per record type. Rewrite the primary account_id, contact_id and deal_id fields and the arrays of related IDs on contacts, deals and activities. Preserve source record IDs and timestamps separately from GTM OS IDs. Association names are display snapshots. Use IDs to resolve links. Reconcile counts, references and deal values per currency. No user credentials or app settings are part of this export.

## Integration work

Mount the CRM screens under the future GTM OS shell and replace Base44 auth and the entity client with the host session and CRM repository. Map the four entities to GTM OS CRM Core and use explicit mappings for users, stages, amounts and activity types. Verify one authoritative deal record across CRM, Pipeline and Forecast. Map the standalone CRM role and team model to the host tenant and membership model and verify enforcement before using customer data.

## HubSpot migration

See [the migration record](HUBSPOT-MIGRATION-2026-11-20.md) for the verified deal, company and contact import. A full cutover also needs source exports for activity content, property history, attachment files and subscription or consent evidence. Review owner assignments and active automations before cutover.

## Users and teams

Open **Team access** as a Base44 admin. Enter a work email,
team and role, then select **Send invite**. The default domain is detentgtm.io.
The invitee must sign in with that email. An app login without an active CRM
membership cannot access CRM records. Use **Update access** to change a role
or team, or **Revoke access** to remove the current CRM grant. Super Admin
access comes from Base44's admin role and is managed in Base44.

| Role | Record visibility | Record changes | Export |
| --- | --- | --- | --- |
| Super Admin | All | Create, edit and delete | Yes |
| RevOps | All | Create and edit | Yes |
| Sales Manager | Team | Create and edit within team | No |
| Sales Rep | Own within team | Create and edit own | No |
| Service | Team | Create and edit activities within team | No |
| Read-only | Team | None | No |

Owner and team scope are assigned on the server. Admin and RevOps can set an
active member's work email in the Owner field when creating a record. Related
team-scoped records must share an owner and team. A membership change does
not transfer existing records. Records without a team remain visible only
to Super Admin and RevOps. Super Admin alone can manage membership.

Run `node --test tests/crm-policy.test.mjs` for the synthetic role matrix.
Before importing, verify email delivery and acceptance with controlled
work-email inboxes, then test the same matrix with separate signed-in users,
including direct entity access, cross-team list and detail, scoped writes
and revocation.

## File import

A Base44 admin can open Settings and download the Excel or CSV template for the record type. Extract ZIP archives before selecting a CSV. Use the same source name and stable external record IDs across related files and on retries. Keep IDs as text in Excel. Use **Add to the existing Detent HubSpot migration** for files from portal 149444037.

1. In **Import CRM records**, use the Companies and Contacts sheets or select either or both CSVs. Linked companies can be in the upload or already stored under the same source. Select **Validate files**, then **Import validated records**.
2. In **Import deals**, preserve the original pipeline and stage and supply the destination stage. Select **Validate deal mappings**, then **Import validated deals**.
3. In **Import activity**, supply the original subject, body, timestamps and linked record IDs. Select **Validate activity links**, then **Import validated activities**.
4. Review the result and compare the stored counts with the source inventory. Keep the page open during each import and retry interrupted jobs with the same files and source name. Investigate destination changes that cause reconciliation to fail.

Imported records start unassigned. Attachment IDs require a separate transfer of the original files. Configurable objects and properties, association labels, ownership, and subscription history need their own mappings and verification.

## Find accounts and contacts

Use **Accounts** or **Contacts** and type in the search field. Search covers
all records visible under your role, with 50 matching records per page.
Use **Previous** and **Next** to browse the matches. Search checks the account
name, domain and owner, or the contact name, email, company and job title.
An account detail page includes accessible contacts linked through primary
and additional imported company associations. The pipeline and form company
selectors still have their separate data limits.

When editing or creating a contact, use **Find account** to search the
accessible company directory. Refine the search when there are more than
50 matches. Saving other contact fields keeps the existing link.

## Detent brand

The standalone product is named Detent CRM. Its wordmarks, favicon and
self-hosted Inter fonts come from Detent Brand Pack v3.0. Use the reversed
wordmark on Ink and the colour wordmark on light surfaces. CRM is the
product label beside the approved wordmark.

The contacts import records the global email unsubscribe flag from the
source file. Blank or unrecognised values are shown as **Email status
unknown** on the Contacts list. A negative global unsubscribe flag does
not establish consent. Subscription-type history and consent events need
separate extraction. A retry rechecks company links and the imported email
flag for existing contacts and stops if they differ from the file.

**Check Detent HubSpot totals** reports the current numbers of companies, contacts, deals and activities by type carrying the Detent portal's source IDs. It excludes demo rows
and workbooks imported under other source names. Compare totals with the
HubSpot export audit. Counts alone do not prove that links reconcile.

The Accounts and Contacts directories move between pages using a record ID
cursor, including beyond 10,000 rows. The displayed total still counts all
accessible directory matches. Changing a search returns to the first page.

For imported records, Base44 admins can open **Source properties** from a
contact row or account detail. This shows the original populated CSV values
and source key. The live CRM form shows the mapped fields. Other roles
cannot read the source properties.

## HubSpot activity migration

Open **Settings → Import activity** as a Base44 admin. Download the
Excel or CSV template to see the expected schema. Use the HubSpot activity's original
ID, type, body and timestamp with a timezone. Separate associated record IDs
and attachment IDs with semicolons. **Validate activity links** checks each
related source ID against records already loaded, without saving. **Import
validated activities** writes activity records and reconciles their stored
subject, body, timestamp, links and attachment references. A retry skips
previously imported source IDs whose stored values match. Imported activities start unassigned. Attachment IDs are
retained for later file transfer. Activity content must come from an
engagement export or API extraction, rather than the company/contact CSVs.

## HubSpot deal migration

Open **Settings → Import deals** as a Base44 admin. Download the Excel or CSV
template or add its required headers to the export. Preserve the original
Pipeline and Deal Stage and supply the mapped CRM Stage explicitly. Use
an unformatted decimal amount, a supported ISO currency code and a
YYYY-MM-DD close date. List associated company and contact source IDs with
semicolons. Validate before importing. The importer resolves the existing
records, retains all associations and reconciles destination values. Deal
owners and teams are unassigned at import.

The Deals and Activities screens under Settings accept files from any source
mapped to the downloadable templates. The company/contact CSV and Excel
flows use the same source naming rule. Use one source name for linked
files and reuse it on retry. For a named source, IDs can contain letters,
digits, periods, underscores and hyphens. Select **Add to the existing
Detent HubSpot migration** only for files from the Detent HubSpot account.

## Command Centre and Ask Detent

**Command Centre** is available to the verified Detent CRM app owner and
Base44 admins signed in with a Detent work account. Its overview reports
record, membership, migration and published-guide counts. Use the links
to open the team, roles or import settings. In **Ask Detent knowledgebase**,
select a guide or choose **New guide**, then **Save draft**, **Publish** or
**Unpublish**. Saving a draft preserves the previously published version.

CRM users with approved access can use **Ask Detent** to search the
published guides. Drafts remain private to Detent staff. The search
uses approved guide text and does not retrieve CRM records or call an
external language model. Keep shared guides free of credentials and
customer information.

## Personal regional settings

Open **Settings → Regional settings** to set locale, time zone and default
deal currency, then save. Preferences are private to the signed-in account.
Locale controls date and money formatting. The time zone controls display
of activity timestamps; date-only close dates retain their calendar day.
The default currency applies to new deals. Existing deal amounts and
currencies are stored independently and totals are grouped by currency.

## Assign imported ownership

Open **Command Centre → Assign imported ownership** as Detent staff.
Choose Companies, Contacts or Deals and enter the exact source owner label.
**Preview matches** counts Detent HubSpot records that have neither a CRM
owner nor a team. Choose an active member with a team and apply one verified
batch at a time. The source label remains in Source properties. Pre-existing
CRM assignments stay as saved. Keep access boundaries in mind when assigning
different teams to related companies and contacts. Scoped users only receive
structured links to records they can independently read.

### Save a directory search

On Accounts or Contacts, enter search text and a view name. Use **Save
current search** to store the view, then choose it from **Saved view** later.
Use **Update saved view** to save a change. **Remove saved view** removes the
saved search. The directory always reapplies your current CRM permissions.

### Activity file attachments

Select **Attachments** on a timeline entry. A user who can edit that activity
can upload a supported private file up to 8 MB. Readers with access to the
activity can select **Get file link** and open the two-minute link. A CRM
admin can match the uploaded file to an outstanding source attachment ID.
These files are stored separately from CRM fields. The original binaries
must be obtained from the source system.
