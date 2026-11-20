import { crmEntities } from "@/lib/crm-client";
import { STAGE_META } from "@/lib/crm";

const nowIso = () => new Date().toISOString();

export async function moveDealStage(deal, stage, user) {
  await crmEntities.Deal.update(deal.id, { stage, last_activity_date: nowIso() });
  await crmEntities.Activity.create({
    type: stage === "at_risk" ? "recovery" : "note",
    subject: `Stage moved to ${STAGE_META[stage]?.label || stage}`,
    deal_id: deal.id,
    deal_name: deal.title,
    account_id: deal.account_id || "",
    account_name: deal.account_name || "",
    occurred_at: nowIso(),
    owner: user?.full_name || user?.email || "",
  });
}

export async function logActivity({ deal, account, contact, type, subject, body }, user) {
  await crmEntities.Activity.create({
    type,
    subject,
    body: body || "",
    deal_id: deal?.id || "",
    deal_name: deal?.title || "",
    account_id: deal?.account_id || account?.id || "",
    account_name: deal?.account_name || account?.name || "",
    contact_id: deal?.contact_id || contact?.id || "",
    contact_name:
      deal?.contact_name || (contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : ""),
    occurred_at: nowIso(),
    owner: user?.full_name || user?.email || "",
  });
  if (deal) {
    await crmEntities.Deal.update(deal.id, { last_activity_date: nowIso() });
  }
}