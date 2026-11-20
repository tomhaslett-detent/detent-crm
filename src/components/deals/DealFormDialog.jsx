import { useState } from "react";
import { crmEntities } from "@/lib/crm-client";
import DealForm from "@/components/deals/DealForm";
import FormDialog from "@/components/forms/FormDialog";

export default function DealFormDialog({ open, onOpenChange, deal, accounts, contacts, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    try {
      if (deal) {
        await crmEntities.Deal.update(deal.id, payload);
      } else {
        await crmEntities.Deal.create({ ...payload, last_activity_date: new Date().toISOString() });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Could not save the deal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={deal ? "Edit deal" : "New deal"}
      description="Deals live on the pipeline board as soon as they are saved."
    >
      <DealForm
        key={deal?.id || "new"}
        initial={deal}
        accounts={accounts}
        contacts={contacts}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </FormDialog>
  );
}