import ActivityTimeline from "@/components/activity/ActivityTimeline";
import { useRelatedActivities } from "@/hooks/useRelatedActivities";
import SavedDirectoryViews from "@/components/layout/SavedDirectoryViews";
import { useCrmRegion } from "@/hooks/use-crm-region";
import { dateForRegion } from "@/lib/crm-regional";
import SourceProperties from "@/components/layout/SourceProperties";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { crmEntities } from "@/lib/crm-client";
import ContactForm from "@/components/contacts/ContactForm";
import FormDialog from "@/components/forms/FormDialog";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCrmPage } from "@/hooks/useCrmPage";
import RecordPagination from "@/components/layout/RecordPagination";
import { useCrmCan } from "@/lib/crm-can";
import { cn } from "@/lib/utils";

const importedEmailLabels = {
  unsubscribed: "Globally unsubscribed",
  no_global_opt_out_recorded: "No global opt-out recorded",
  unknown: "Email status unknown",
};

export const Route = createFileRoute("/_authed/contacts")({
  head: () => ({ meta: [{ title: "Contacts · Detent CRM" }] }),
  component: ContactsPage,
});

const ROLES = {
  champion: { label: "Champion", pill: "bg-emerald-50 text-emerald-700" },
  decision_maker: { label: "Decision maker", pill: "bg-indigo-50 text-indigo-700" },
  influencer: { label: "Influencer", pill: "bg-purple-50 text-purple-700" },
  blocker: { label: "Blocker", pill: "bg-rose-50 text-rose-700" },
  unknown: { label: "Unknown", pill: "bg-slate-100 text-slate-600" },
};

function ContactActivity({ contact }) {
  const { activities, activitiesError, activitiesLoading, loadOlderActivities } = useRelatedActivities("contact_id", contact.id);
  return (
    <div className="space-y-3">
      {activitiesError && <p role="alert" className="text-sm">Could not load contact activity.</p>}
      {(activities.length > 0 || (!activitiesLoading && !activitiesError)) && <ActivityTimeline activities={activities} />}
      {activitiesLoading && <p role="status" className="text-sm">Loading activity…</p>}
      {loadOlderActivities && <Button type="button" variant="outline" disabled={activitiesLoading} onClick={loadOlderActivities}>
        Load older activity
      </Button>}
    </div>
  );
}

function ContactsPage() {
  const region = useCrmRegion();
  const can = useCrmCan();
  const directory = useCrmPage("Contact");
  const { search, changeSearch, records: visible, total, loading, reload } = directory;
  const [activityContact, setActivityContact] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setError("");
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await crmEntities.Contact.update(editing.id, payload);
      } else {
        await crmEntities.Contact.create(payload);
      }
      await reload();
      setFormOpen(false);
    } catch (err) {
      setError(err?.message || "Could not save the contact.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Contacts"
        description={`${total} people in the buying network`}
        actions={
          can.canCreateContact ? (
            <Button onClick={openCreate} className="h-9">
              <Plus className="mr-1.5 h-4 w-4" /> New contact
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          maxLength={100}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Search contacts"
          className="h-9 pl-8 text-sm"
        />
      </div>

      <SavedDirectoryViews object="Contact" search={search} onSearchChange={changeSearch} />

      {directory.error ? <p role="alert">Could not load contacts. Try your search again.</p> : loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-[11px] uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Account</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Last engaged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((contact) => {
                const role = ROLES[contact.role] || ROLES.unknown;
                return (
                  <TableRow
                    key={contact.id}
                    onClick={() => openEdit(contact)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <TableCell>
                      <p className="font-heading text-[13px] font-semibold text-foreground">
                        {`${contact.first_name} ${contact.last_name || ""}`.trim()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{contact.title || "—"}</p>
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={(event) => {
                        event.stopPropagation();
                        setActivityContact(contact);
                      }}>
                        View activity
                      </Button>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{contact.account_name || "—"}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", role.pill)}>
                        {role.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {contact.email || "—"}
                      {contact.hubspot_source_key && (
                        <p className="text-xs text-muted-foreground">
                          {importedEmailLabels[contact.imported_email_status] ?? importedEmailLabels.unknown}
                        </p>
                      )}
                      <SourceProperties object="Contact" record={contact} />
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{dateForRegion(contact.last_engaged, region)}</TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    {search ? "No matching contacts." : "No contacts yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordPagination {...directory} />

      {activityContact && (
        <FormDialog open onOpenChange={(open) => { if (!open) setActivityContact(null); }}
          title={([activityContact.first_name, activityContact.last_name].filter(Boolean).join(" ") || "Contact") + " activity"}>
          <ContactActivity contact={activityContact} />
        </FormDialog>
      )}

      <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Edit contact" : "New contact"}>
        <ContactForm
          key={editing?.id || "new"}
          initial={editing}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      </FormDialog>
    </div>
  );
}