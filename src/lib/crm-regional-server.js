import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { actorFor } from "@/lib/crm-access";
import { crmCurrencies, crmLocales, defaultRegion, regionalZones } from "@/lib/crm-regional";

async function userPreference(context) {
  if (!await actorFor(context)) throw new Error("CRM access required.");
  const entity = context.getBase44().asServiceRole.entities.CrmRegionalPreference;
  const response = await entity.filter({ user_id: context.user.id }, "id", 2);
  const rows = Array.isArray(response) ? response : response?.items ?? [];
  if (rows.length > 1) throw new Error("Duplicate regional preferences need review.");
  return { entity, saved: rows[0] };
}

export const getRegionalPreference = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { saved } = await userPreference(context);
    return saved ? { locale: saved.locale, time_zone: saved.time_zone, currency: saved.currency } : defaultRegion;
  });

export const saveRegionalPreference = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    locale: z.enum(crmLocales.map(([locale]) => locale)),
    time_zone: z.enum(regionalZones),
    currency: z.enum(crmCurrencies),
  }))
  .handler(async ({ context, data }) => {
    const { entity, saved } = await userPreference(context);
    if (saved) await entity.update(saved.id, data);
    else await entity.create({ user_id: context.user.id, ...data });
    return data;
  });
