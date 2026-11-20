import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getRegionalPreference } from "@/lib/crm-regional-server";
import { defaultRegion } from "@/lib/crm-regional";

export const regionalKey = (userId) => ["crm-regional", userId];
export function useRegionalPreference() {
  const { user } = useAuth();
  return useQuery({
    queryKey: regionalKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: () => getRegionalPreference(),
    retry: false,
    staleTime: 300000,
  });
}

export function useCrmRegion() {
  return useRegionalPreference().data ?? defaultRegion;
}
