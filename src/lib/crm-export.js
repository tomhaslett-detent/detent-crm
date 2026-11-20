import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";
import { rows } from "@/lib/crm";

const entityNames = ["Account", "Contact", "Deal", "Activity"];

async function readAll(entity) {
  const records = [];
  const seen = new Set();
  const pageSize = 250;
  for (let offset = 0; ; offset += pageSize) {
    const response = await entity.list("id", pageSize, offset);
    if (!Array.isArray(response) && !Array.isArray(response?.items)) {
      throw new Error("Unexpected CRM data response");
    }
    const page = rows(response);
    for (const record of page) {
      if (!record.id || seen.has(record.id)) {
        throw new Error("CRM records changed during export. Please retry.");
      }
      seen.add(record.id);
      records.push(record);
    }
    if (page.length < pageSize) return records;
  }
}

export const exportCrm = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("CRM admin access required");
    const { entities } = context.getBase44();
    const entries = await Promise.all(entityNames.map(async (name) => [name, await readAll(entities[name])]));
    return {
      format: "detent-crm",
      version: 1,
      exported_at: new Date().toISOString(),
      records: Object.fromEntries(entries),
    };
  });
