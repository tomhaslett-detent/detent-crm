export const suppliedGuides = [
  {
    key: "activity-attachments", title: "Attach and open activity files", category: "Records",
    body: `Open Attachments on a timeline entry. If you can edit the activity, choose a supported file up to 8 MB and select Upload private file. To read an attached file, select Get file link, then Open. The link lasts two minutes. Access follows the activity’s record permissions.

For a migrated activity, a CRM admin can select a matching Source attachment reference before uploading its original file. An ID in an import file identifies the attachment, but it does not transfer the file contents.`,
  },
  {
    key: "saved-views", title: "Save a company or contact search", category: "Records",
    body: `In Accounts or Contacts, enter a search. Give it a View name and select Save current search. Select the name from Saved view to run that search again across the records you can currently access.

To change a saved search, select the view, edit the search or name and select Update saved view. To remove it, select Remove saved view. Removing a view leaves CRM records in place. Saved views are private to your account and separate for Accounts and Contacts.`,
  },
  {
    key: "hubspot-migration-preview", title: "Check HubSpot migration access", category: "Staff",
    body: `In Command Centre, select Run migration preview. The preview verifies the connected HubSpot account and reports sample counts and access status for core records, emails, notes, calls, meetings and tasks. It also checks file search and subscription definition access. The preview makes no CRM writes. Private attachments and contact-level consent history require separate extraction and verification.`,
  },
  {
    key: "assign-owners", title: "Assign owners to imported companies, contacts and deals", category: "Staff",
    body: `Open Command Centre and find Assign imported ownership. Choose Companies, Contacts or Deals, then type the exact owner label preserved in Source properties. Select Preview matches. The preview counts imported records from that source owner with no CRM owner or team.

Choose an active CRM member. Select Assign next records to set their CRM owner and team for the next batch. Review the verified and remaining counts before continuing. Previously assigned records stay as they are. Related records appear only when your access also covers those records.`,
  },
  {
    key: "regional-settings", title: "Set your locale, time zone and default deal currency", category: "Preferences",
    body: `1. Select Settings in the CRM navigation. Regional settings is the first section.
2. Choose a Locale for number and date formatting and a Time zone for activity timestamps.
3. Choose a Default deal currency. Check the date and amount in the preview, then select Save regional settings.

Settings follow your account. New deals suggest your default currency, which you can change on the deal. Existing deal currencies stay as saved. Pipeline totals appear separately by currency. Changing locale formats dates and figures; screen labels remain in English.`,
  },
  {
    key: "getting-started", title: "Get started with Detent CRM", category: "Start here",
    body: `1. Sign in with the email address that received your invitation.
2. Use Accounts for companies, Contacts for people and Deals for opportunities.
3. Open Pipeline to review deal stages and Activity to review sales interactions.
4. Use Ask Detent when you need product guidance.

If you see CRM access is pending, ask the CRM administrator to check your email, team and role. Signing in and having permission to see CRM records are separate steps.`,
  },
  {
    key: "record-access", title: "Roles and access to records", category: "Access",
    body: `Detent CRM requires sign-in and granted access. RevOps and CRM admins can see all CRM records. Sales managers can see their team’s records. Sales reps can see their own records within their team. Service users can work with team activities. Read-only users can view their team’s records.

Imported records start unassigned. If you cannot see a record that a colleague can see, check that you signed in with the invited email, then ask an administrator to review its owner and team. RevOps can export CRM data. CRM admins manage invitations and team assignments.`,
  },
  {
    key: "invite-team", title: "Invite, update or revoke team access", category: "Access",
    body: `A CRM admin can open Team access from Settings or the navigation.
1. In Users and teams, enter the person’s work email and team, then choose their role.
2. Select Send invite. The person needs to sign in with that address.
3. Select a listed member to load their details. Set the intended role or team and select Update access.
4. Select Revoke access when the person no longer needs CRM membership.

Updating a team membership does not move the records that were previously assigned to that person. If the invitee still cannot sign in, check the invitation address and current access status.`,
  },
  {
    key: "find-records", title: "Find companies and contacts", category: "Records",
    body: `Open Accounts or Contacts and type in the search field. Account search checks name, domain and owner. Contact search checks name, email, company and job title. Search applies to records your role can see. Super Admins can enter id: followed by the original company or contact record ID. Use Previous and Next to move through the matches. Clear the search box to return to the full directory visible to you.

Open an account to see its record and linked contacts, deals and activities that you can access. If a search returns nothing, try part of a name or the email domain, then check the record’s owner and team with your administrator.`,
  },
  {
    key: "edit-contacts", title: "Create a contact and link a company", category: "Records",
    body: `From Contacts, select New contact if your role allows it. Enter the person’s details. In Find account, search for the company, then choose the matching account. Refine your search when more than 50 matches appear. Save the contact.

To update a contact, open their row and edit the relevant fields. Saving unrelated fields keeps the current company link. Use the account selector only when you intend to change that link. Imported additional company links are retained with the source record and can also appear on the relevant account pages.`,
  },
  {
    key: "deal-pipeline", title: "Work with deals and the pipeline", category: "Records",
    body: `Open Deals to review your accessible opportunities. Super Admins can type id: followed by an original deal ID to look it up across the CRM. Open Pipeline to see their current stages. Create or edit a deal if your role permits it. Use Find account to search companies by name or domain. Use Find primary contact to search by name or email. With an account selected, contact search includes people linked to it through primary or additional associations. Refine your search when there are more than 50 matches. Open a deal to see its linked companies, contacts and activity within your record access. Select Load older activity on a deal or company to read earlier entries. Update its stage when the opportunity progresses, and keep the value, currency and expected close date current.

Moving a deal to At Risk / Recovery records a stage activity. Preserve the original stage when migrating a deal, and map it separately to a Detent CRM stage. Use the Currency selector on a deal to see supported currencies.`,
  },
  {
    key: "activity", title: "Log and review activity", category: "Records",
    body: `Open Activity, choose an activity type and enter the details. Link the activity to the relevant deal when available. You can also log an activity from a record page that offers that action. Use Filter by type to narrow the full activity list. Select Next or Previous to browse more entries. The timeline is ordered by the activity’s original timestamp.

In Contacts, select View activity below a contact’s name to see its linked timeline. Select Load older activity to see earlier entries. The actions and records you see depend on your role. Imported activities can retain their original date, body and links to several records. Open Attachments to see its private files. An imported attachment ID needs the original file before users can open it.`,
  },
  {
    key: "import", title: "Import companies, contacts, deals and activities", category: "Data",
    body: `An administrator opens Settings and chooses the import for the record type. Download an Excel or CSV template and map the source columns to its headers. Import companies and contacts first, followed by deals and activities. Use the same source name and external record IDs across linked files.

Validate each batch before importing, then check the resulting counts. Imported records start unassigned. The import retains source identifiers and populated original fields. Attachment IDs remain references until the files are transferred separately.`,
  },
  {
    key: "import-companies-contacts", title: "Prepare company and contact import files", category: "Data",
    body: `1. In Settings, open Import CRM records and select Download Excel template.
2. Fill either or both Excel sheets, or select a companies CSV, a contacts CSV, or both. Keep the template headers. Extract a ZIP before selecting a CSV.
3. Give each row a stable Record ID. Put the company Record ID in Associated Company IDs (Primary) when you know the primary company. Separate additional company IDs with semicolons.
4. Enter a source name and select Validate files. Resolve any missing company references or duplicate IDs. Linked companies can be in the same upload or already in the CRM under the same source name.
5. Select Import validated records and keep the page open while it reconciles the batches.

Keep IDs as text in Excel to avoid rounding long numeric identifiers. Fill Company owner or Contact owner with the original label if staff will assign ownership after import. Use Add to the existing Detent HubSpot migration only for files from the Detent HubSpot account.`,
  },
  {
    key: "import-deals", title: "Map and validate a deal import", category: "Data",
    body: `In Settings, open Import deals and download the deal Excel or CSV template. Keep the original Pipeline, Deal Stage and Deal owner values when the source provides them. Set CRM Stage to prospect, engaged, proposal, at_risk, closed_won or closed_lost. Use an unformatted decimal amount, a supported ISO currency and a YYYY-MM-DD close date. Use the source IDs of linked companies and contacts.

Select Validate deal mappings before Import validated deals. If a linked company or contact is missing, load those records first using the same source name. A retry can flag a deal if the stored fields or relationships differ from the file. Review the destination before trying again.`,
  },
  {
    key: "import-activity", title: "Import historical activity and associations", category: "Data",
    body: `In Settings, open Import activity and download its Excel or CSV template. Supply the original Record ID, Activity Type and Occurred At. Use email, note, meeting, task or call as the type. Use a timestamp with a timezone, such as 2026-11-20T09:00:00Z. Enter the original subject and body. Separate linked company, contact, deal and attachment IDs with semicolons.

Use the same source name as the linked records. Select Validate activity links, use the source ID shown in the validation message to resolve a missing link, then select Import validated activities. Activity ID references in a company or contact export do not contain the activity body or attachment files. Obtain those from the source system separately. Optionally upload an activity inventory CSV with Type and SourceRecordId columns to see how many expected activities the file covers. If it also includes LinkedObject and LinkedSourceRecordId, validation reports links missing from matched activities. For a verified inventory from the same source, select Restore missing links from the association inventory and validate again. The importer adds those links to activities present in the upload and checks their destination records. Select Download missing activity IDs to request the records absent from the selected file. Compare totals before cutover. Partial files can still be imported in batches.`,
  },
  {
    key: "import-retry", title: "Recover an interrupted import", category: "Data",
    body: `Keep the original files. Note the row or batch that stopped and resolve the reported issue. Retry using the same source name and Record IDs. For Detent’s existing HubSpot migration, select its dedicated option again.

Previously imported IDs are checked rather than created again. Contacts are checked for matching company links and imported email status. Activity retries verify the subject, body, timestamp, record links and attachment references. Deal retries verify deal fields, associations and any supplied original pipeline, stage and owner values. If the destination has already been edited, review the difference before retrying. For the Detent HubSpot migration, Check Detent HubSpot totals reports stored companies, contacts, deals and activities by type. Compare the stored counts with your source exports. File attachments and subscription history require separate verification.`,
  },
  {
    key: "consent", title: "Understand imported email status and consent", category: "Data",
    body: `In Contacts, look below the email address for the imported global unsubscribe status. A blank or unrecognised source value appears as Email status unknown. An explicit global unsubscribe appears as Globally unsubscribed. An explicit negative flag appears as No global opt-out recorded. Treat both unknown and negative values as unverified for outreach. Administrators can open Source properties to see the original legal basis for processing when the source supplied it.

Subscription preferences, timestamps and consent evidence can live in a separate source export. Check your authorised subscription or suppression records before using imported contacts for outreach.`,
  },
  {
    key: "record-export", title: "Export CRM records and inspect source values", category: "Data",
    body: `A CRM admin or authorised RevOps user can open Settings and select Download CRM export. The JSON includes accounts, contacts, deals and activities that the export grants access to. Pause edits for a consistent handoff and store the file securely. Only CRM admin exports include original source properties and source attachment IDs. Open Attachments on an activity to access transferred files if your role can read the activity.

On an imported account, contact, deal or activity, CRM admins can open Source properties to inspect the source ID and retained populated CSV values. These values are the original import data. The editable CRM fields can change after import.`,
  },
  {
    key: "ask-detent", title: "Use Ask Detent for CRM help", category: "Help",
    body: `Open Ask Detent and enter a specific question, such as how to import activity or how to invite a teammate. Select Search guides. Results show matching published articles. If you get no results, try the label you see on the screen or the type of record you are working with.

Ask Detent searches approved CRM help. For a question about a particular customer, import result or account permission, contact your administrator with the screen and exact issue.`,
  },
  {
    key: "publish-help", title: "Draft and publish CRM help in Command Centre", category: "Staff",
    body: `Open Command Centre using a Detent staff administrator account. Use Ask Detent knowledgebase to select a guide or choose New guide.
1. Enter a title, category and guide body.
2. Select Save draft while reviewing. Readers continue to see any currently published version.
3. Select Publish when the guide is ready. Use Test published help to check how it appears in Ask Detent.
4. Select Unpublish to remove a guide from the published search.

Write the exact navigation labels and steps used in CRM. Keep shared guides free of credentials, private customer records and internal operational details.`,
  },
];

const stop = new Set(["and", "are", "can", "for", "how", "the", "what", "where", "with", "why", "you", "does", "get"]);
function tokens(text) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [])].filter((term) => !stop.has(term));
}

export function searchGuides(guides, question) {
  const terms = tokens(question);
  if (!terms.length) return [];
  return guides.map((guide) => {
    const title = new Set(tokens(guide.title + " " + guide.category));
    const body = new Set(tokens(guide.body));
    const score = terms.reduce((sum, term) => sum + (title.has(term) ? 3 : body.has(term) ? 1 : 0), 0);
    return { guide, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title, "en-GB"))
    .slice(0, 3)
    .map(({ guide }) => guide);
}

export function publishedGuides(overrides) {
  const byKey = new Map(suppliedGuides.map((guide) => [guide.key, guide]));
  for (const row of overrides) {
    if (row.enabled && row.published?.title) byKey.set(row.article_key, { ...row.published, key: row.article_key });
    else if (row.enabled === false) byKey.delete(row.article_key);
  }
  return [...byKey.values()];
}
