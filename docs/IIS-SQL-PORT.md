# Detent CRM IIS and SQL Server port

The local application source was captured from Base44 revision `8aed03088a00625047da3ce594368ddf0cd23cad`. The copied frontend and application logic still depend on the Base44 SDK and Cloudflare runtime. The SQL migration, record loader and IIS web-root generator are staging tools. The SQL entity adapter in `server/sql-entities.js` is ready for integration with the self-hosted runtime and must be tested against SQL Server before cutover.

| Resource | Dev | Live |
| --- | --- | --- |
| IIS HTTPS binding | `crm-dev.mialab.co.uk` | `crm.mialab.co.uk` |
| IIS site and app pool | `Detent-CRM-Dev` | `Detent-CRM-Live` |
| IIS content directory | `C:\inetpub\detent\detent-crm-dev` | `C:\inetpub\detent\detent-crm-live` |
| SQL database | `Detent-CRM-Dev` | `Detent-CRM-Live` |
| Private worker | Dedicated loopback port and service identity | Separate loopback port and service identity |
| Private files and secrets | Dev-only storage and configuration | Separate live storage and configuration |

Both sites and their app pools were created in IIS Manager on 20 November 2026. Each has a hostname-specific HTTPS binding with the existing wildcard certificate. Both sites were stopped at handoff. The named SQL databases reported ONLINE in SQL Server Management Studio. The Dev schema is installed. A SQL Server smoke test inserted a synthetic contact, found it by its secondary association and rolled back the test row. The Live schema, data and workers still need deployment. Verify DNS before activating either site. Choose unused loopback ports on that host. IIS URL Rewrite and ARR are required. Give IIS access only to the generated web root. Keep application code, configuration, uploads and exported CRM records outside that root.

## Build for the Node host

Run `npm ci`, `node --test tests/*.test.mjs` and `npm run build:iis`. The IIS build emits browser assets under `dist-iis/client` and a Fetch-compatible TanStack handler at `dist-iis/server/server.js`. It omits the Base44 editor bridge and Cloudflare error reporting. A local Node smoke test rendered the Detent CRM login page with HTTP 200 using that handler. The build still uses Base44 for sign-in and business operations and should only be used for local port testing until the SQL and authentication wiring is complete.

For the loopback HTTP smoke check, set `CRM_ENVIRONMENT=Dev` and run `npm run start:iis:smoke`. It listens only on `127.0.0.1` (default port 3085) and serves the login document, built assets, and branding files. It accepts no sign-in or CRM requests. `/health/live` reports HTTP 200, and `/health/ready` reports HTTP 503 until a production worker replaces this smoke entry. Do not bind either IIS site to this worker.

## Stage the database and records

On a host with SQL connectivity and a trusted SQL Server certificate, run `deploy/Initialize-CrmDatabases.ps1 -SqlServer <server> -Environment Dev`. Add `-CreateDatabase` only when the setup identity is authorised to create the named database. Run the same command for Live when staging that environment. Both scripts use Windows integrated authentication by default and accept a securely obtained SQL credential if required.

The shared SQL endpoint accepted TCP connections from the development workstation, but its certificate chain was untrusted there. Configure the trusted issuing certificate chain and use the SQL hostname covered by the certificate before attempting Dev setup.

The SQL runtime factory derives its database from `CRM_ENVIRONMENT` (Dev or Live) and reads `CRM_SQL_HOST`, `CRM_SQL_USER`, `CRM_SQL_PASSWORD` and optional `CRM_SQL_PORT`. It requires encryption and certificate validation and checks the target database and table before returning the entity adapter.

Export records using **Settings → Download CRM export** as a Base44 Super Admin. Keep the export outside the repository. Run `deploy/Import-CrmRecords.ps1 -SqlServer <server> -Environment Dev -ExportPath <file> -WhatIf` to check the export and referenced record IDs without connecting to SQL. Omit `-WhatIf` to insert the records in one transaction into a fresh target. Existing IDs or source keys cause the transaction to roll back. The loader keeps record IDs, mapped fields, source fields and association arrays. Use synthetic or approved scrubbed data for Dev.

## Finish the application port before cutover

1. Replace the Base44 and Cloudflare runtime with a loopback worker and SQL-backed data access. Preserve existing record and field permissions and validate them against the real SQL backend.
2. Add first-party authentication, session and invite handling. Re-establish verified admin identities and memberships. Base44 passwords, tokens and sessions do not transfer.
3. Migrate CRM configuration, saved views, Ask Detent content and private attachment binaries separately from the four-object export. Verify the files remain accessible only through authorised activity access.
4. Run Dev and Live with separate SQL credentials, file stores, session secrets and service identities. Test the Dev release behind IIS with HTTPS, then rehearse backup, restore and the live data handoff.
5. Prepare each empty IIS site root with `deploy/New-CrmIisWebRoot.ps1` using the matching worker port. Bind the actual hostname and certificate in IIS after the ported worker is running. Keep Base44 available until the new Live deployment and its imports pass cutover checks.
