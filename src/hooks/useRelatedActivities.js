import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { crmRequest } from "@/lib/crm-access";

export function useRelatedActivities(field, id) {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ["crm-related-activities", user?.id, field, id],
    enabled: Boolean(user?.id && id),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => crmRequest({ data: {
      object: "Activity",
      action: "page",
      filter: { [field]: id },
      cursor: pageParam,
      limit: 50,
    } }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
    gcTime: 0,
  });

  return {
    activities: query.data?.pages.flatMap(({ records }) => records) ?? [],
    reload: query.refetch,
    loadOlderActivities: query.hasNextPage ? () => query.fetchNextPage() : undefined,
    activitiesLoading: query.isFetching,
    activitiesError: query.isError,
  };
}
