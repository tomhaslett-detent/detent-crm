# Detent CRM IIS and SQL Server port

The local application source was captured from Base44 revision `8aed03088a00625047da3ce594368ddf0cd23cad`. The IIS Dev build uses SQL-backed authentication and record access with the existing CRM policy handlers. The separate Base44 build remains available. The Dev worker still needs an IIS and SQL Server integration test before it serves users.

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

Run `npm ci`, `node --test tests/*.test.mjs` and `npm run build:iis`. The IIS build emits browser assets under `dist-iis/client` and a Fetch-compatible TanStack handler at `dist-iis/server/server.js`. It omits the Base44 editor bridge and Cloudflare error reporting. A local test exercised the built handler with a synthetic server-side session and checked that anonymous server function calls return HTTP 401.

For the loopback HTTP smoke check, set `CRM_ENVIRONMENT=Dev` and run `npm run start:iis:smoke`. It listens only on `127.0.0.1` (default port 3085) and serves the login document, built assets, and branding files. It accepts no sign-in or CRM requests. `/health/live` reports HTTP 200, and `/health/ready` reports HTTP 503 until a production worker replaces this smoke entry. Do not bind either IIS site to this worker.

The authenticated Dev entry point is `npm run start:iis:dev`. It starts only after connecting to the verified Dev database. The worker accepts state-changing browser requests only from that environment's HTTPS origin. For the first Dev administrator, a deployment operator can run `node server/bootstrap-crm-admin.js` with `CRM_BOOTSTRAP_EMAIL`, `CRM_BOOTSTRAP_NAME` and `CRM_BOOTSTRAP_PASSWORD` in the process environment. Use a 16-character minimum password and remove the bootstrap variables afterwards. The command refuses to add an administrator if one exists. The Live worker configuration is gated by `CRM_LIVE_ENABLED=true`, which should only be set after Dev sign-in has passed through IIS. Dev defaults to port 3085 and Live to 3084. Work-email invitations, recovery, MFA, private file storage and HubSpot OAuth are pending in the self-hosted build.

## Stage the database and records

On a host with SQL connectivity and a trusted SQL Server certificate, run `deploy/Initialize-CrmDatabases.ps1 -SqlServer <server> -Environment Dev`. Add `-CreateDatabase` only when the setup identity is authorised to create the named database. Run the same command for Live when staging that environment. Both scripts use Windows integrated authentication by default and accept a securely obtained SQL credential if required.

The shared SQL endpoint accepted TCP connections from the development workstation, but its certificate chain was untrusted there. Configure the trusted issuing certificate chain and use the SQL hostname covered by the certificate before attempting Dev setup.

The SQL runtime factory derives its database from `CRM_ENVIRONMENT` (Dev or Live) and reads `CRM_SQL_HOST`, `CRM_SQL_USER`, `CRM_SQL_PASSWORD` and optional `CRM_SQL_PORT`. It requires encryption and certificate validation and checks the target database and table before returning the entity adapter.

Use a trusted connection with an authorised SQL setup identity to run `deploy/New-CrmSqlRuntimeLogin.ps1 -SqlServer <certificate-hostname> -Environment Dev`. Supply `-SqlSetupCredential (Get-Credential)` for SQL Server authentication. The script prompts for the dedicated runtime password and reports the login name without printing the password. It grants access only to the CRM tables used by the worker and fails if that login already exists. Use `detent_crm_dev_app` when running `deploy/Install-CrmWorker.ps1` from the extracted build on the IIS host.

Export records using **Settings → Download CRM export** as a Base44 Super Admin. Keep the export outside the repository. Run `deploy/Import-CrmRecords.ps1 -SqlServer <server> -Environment Dev -ExportPath <file> -WhatIf` to check the export and referenced record IDs without connecting to SQL. Omit `-WhatIf` to insert the records in one transaction into a fresh target. Existing IDs or source keys cause the transaction to roll back. The loader keeps record IDs, mapped fields, source fields and association arrays. Use synthetic or approved scrubbed data for Dev.

## Finish the application port before cutover

1. Replace the Base44 and Cloudflare runtime with a loopback worker and SQL-backed data access. Preserve existing record and field permissions and validate them against the real SQL backend.
2. Add first-party authentication, session and invite handling. Re-establish verified admin identities and memberships. Base44 passwords, tokens and sessions do not transfer.
3. Migrate CRM configuration, saved views, Ask Detent content and private attachment binaries separately from the four-object export. Verify the files remain accessible only through authorised activity access.
4. Run Dev and Live with separate SQL credentials, file stores, session secrets and service identities. Test the Dev release behind IIS with HTTPS, then rehearse backup, restore and the live data handoff.
5. Prepare each empty IIS site root with `deploy/New-CrmIisWebRoot.ps1` using the matching worker port. Bind the actual hostname and certificate in IIS after the ported worker is running. Keep Base44 available until the new Live deployment and its imports pass cutover checks.
