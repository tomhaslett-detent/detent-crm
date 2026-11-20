import { crmRequest } from "@/lib/crm-access";

const objects = ["Account", "Contact", "Deal", "Activity"];

function entity(object) {
  const call = (action, data = {}) => crmRequest({ data: { object, action, ...data } });
  return {
    page: (search, limit, cursor, activityType, filter) => call("page", { search, limit, cursor, activityType, filter }),
    list: (sort, limit, skip) => call("list", { sort, limit, skip }),
    filter: (filter, options) => call("list", { filter, ...options }),
    get: (id) => call("get", { id }),
    count: (filter) => call("count", { filter }),
    create: (values) => call("create", { values }),
    update: (id, values) => call("update", { id, values }),
  };
}

export const crmEntities = Object.fromEntries(objects.map((name) => [name, entity(name)]));
