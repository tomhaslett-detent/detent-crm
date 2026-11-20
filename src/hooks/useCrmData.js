import { useCallback, useEffect, useState } from "react";
import { crmEntities } from "@/lib/crm-client";
import { rows } from "@/lib/crm";

export function useCrmData() {
  const [deals, setDeals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [dealPage, accountPage, contactPage] = await Promise.all([
      crmEntities.Deal.list("-updated_date", 500),
      crmEntities.Account.list("name", 500),
      crmEntities.Contact.list("first_name", 500),
    ]);
    setDeals(rows(dealPage));
    setAccounts(rows(accountPage));
    setContacts(rows(contactPage));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { deals, accounts, contacts, loading, reload };
}