import { useQuery } from "@tanstack/react-query";
import { getCrmActor } from "@/lib/crm-access";
import { useAuth } from "@/lib/AuthContext";

export function useEffectiveCrmActor() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["crm-actor", user?.id],
    queryFn: () => getCrmActor(),
    enabled: Boolean(user?.id),
    retry: false,
    staleTime: 0,
  }).data;
}
