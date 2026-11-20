# CRM feature audit

Reviewed 20 November 2026 against the Detent GTM OS Build State Brief and production readiness checklist, the 21 September source snapshot (HANDOVER, CRM Core, permissions, AI and write-back design notes, CRM backend routes and panels), the current standalone Base44 CRM, and HubSpot's published CRM documentation.

| Area | Detent documented capability | Standalone CRM | Remaining work |
| --- | --- | --- | --- |
| Lattice | Configurable objects and typed attributes; dry-run field changes; calculated roll-ups and provenance | Accounts, contacts, deals and activities with fixed fields. Source columns retained during import. | Object and property registry, type conversion, validation, roll-ups, permissions and UI for definitions. |
| Associations | Labelled many-to-many, lookup and parent-child links with cascade or restrict | Primary account and contact references, secondary imported company IDs | First-class association types, labels, direction, referential rules and association management UI. |
| Deskview and Lenses | Record grid, board, bulk edit, private/role/org saved views | Account and contact directory search and paging, private saved searches, deal table and board | Shared views, configurable columns and filters, bulk actions, all-object paging and full-volume lookup selectors. |
| Dossier | Configurable record layout, account 360, related panels and stakeholder Thread | Account summary, related activities, deals and contacts | Person and deal 360, configurable layout, relationship roles, stakeholder thread and related panels. |
| Trace | Field-change and activity timelines, capture and assisted follow-up | Manual activity and stage notes; admin activity CSV import with original timestamps and multiple links | Property history, complete chronological association, ingest email/calendar and attachments, and follow-up tasks. |
| Steward | Duplicate policies, block or warn, validators, merge and unmerge | Imported source ID duplicate checks | Native duplicate detection, preview, reversible merge, property validation and data quality screens. |
| Cohorts | Live query segments and counts | Basic search | Dynamic and static segments with filter builder, refresh and permission inheritance. |
| Sales pipeline | Commercial pipeline analytics, stage management, opportunity progress, currency and forecast rules | Fixed stage board and summary metrics | Multiple configurable pipelines, stage rules and required fields, stage history, reporting and forecasting. |
| Account context | Health, contracts, quotes, proposals, renewals and support | Basic account and health fields | Joined product workflows across the GTM OS modules, commercial agreements and ticketing. |
| AI and intelligence | Ask, Signal Score, Autofill, Compose, enrichment, research, news, events and intelligence write-back | No verified equivalent | Permission-scoped implementation, provenance, deterministic fallbacks and integration testing. |
| Documents and collaboration | Record documents and document Q&A, Chatter and customer dashboards | No verified equivalent | Private file storage and lifecycle, discussions, customer dashboard access and reporting. |
| Automation and marketing | CRM flows, campaigns, capture and webinar surfaces; outbound governance wider in the OS | Stage transition activity | Durable scheduled workflows, runs and retries, optional HubSpot-equivalent marketing features and consent enforcement. |
| Permissions | Configurable object and field permission sets | Six role presets and own/team/all checks, work-email invites | Field permissions, configurable permission sets and live account matrix. |
| Migration | Native schema model plus HubSpot-style object, property and association portability | Company/contact CSV and Excel template plus a Detent activity CSV template, with source IDs and link reconciliation | Universal schema mapping, additional objects, native labels, history, activity, files, permissions and consent. |
| Production | Authentication, tenant isolation, scalable lists, backup restore and operational readiness | Auth and app scope, basic audit and directory pagination | Realistic load and tenant tests, administration lifecycle, monitored jobs and tested restore. |

The standalone CRM and the wider Detent GTMOS Base44 shell are separate applications. The documented CRM Core implementation from the September snapshot is an integration target. Its source routes or demo status do not establish that the standalone app offers equivalent behavior.

HubSpot references: https://knowledge.hubspot.com/records/view-and-filter-records ; https://knowledge.hubspot.com/records/merge-records ; https://knowledge.hubspot.com/records/assign-access-to-records ; https://knowledge.hubspot.com/forecast/set-up-the-forecast-tool ; https://knowledge.hubspot.com/account-management/export-your-content-and-data
