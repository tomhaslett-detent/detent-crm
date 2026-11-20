import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { crmEntities } from "@/lib/crm-client";

const pageSize = 50;

export function useCrmPage(object, activityType, filter) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [settled, setSettled] = useState("");
  const [position, setPosition] = useState({ index: 0, cursors: [undefined] });
  const { index: page, cursors } = position;
  const cursor = cursors[page];
  useEffect(() => {
    const delay = setTimeout(() => setSettled(search.trim()), 250);
    return () => clearTimeout(delay);
  }, [search]);

  const query = useQuery({
    queryKey: ["crm-page", user?.id, object, settled, cursor, activityType, filter],
    enabled: Boolean(user?.id) && settled === search.trim(),
    queryFn: () => crmEntities[object].page(settled, pageSize, cursor, activityType, filter),
    staleTime: 0,
    retry: false,
  });
  return {
    search,
    changeSearch(value) {
      setPosition({ index: 0, cursors: [undefined] });
      setSearch(value);
    },
    page,
    setPage(index) {
      if (index === page - 1 && index >= 0) {
        setPosition({ index, cursors });
      } else if (index === page + 1 && query.data?.nextCursor) {
        setPosition({ index, cursors: [...cursors.slice(0, index), query.data.nextCursor] });
      }
    },
    hasNext: Boolean(query.data?.nextCursor), pageSize, records: query.data?.records ?? [], total: query.data?.total ?? 0,
    loading: query.isFetching || settled !== search.trim(), error: query.error, reload: query.refetch,
  };
}
