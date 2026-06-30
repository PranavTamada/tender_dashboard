"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type TenderFilters } from "@/lib/api-client";

export function useTenders(filters: TenderFilters) {
  return useQuery({
    queryKey: ["tenders", filters],
    queryFn: () => api.tenders(filters),
    placeholderData: (prev) => prev,
  });
}

export function useTender(id: string | null) {
  return useQuery({
    queryKey: ["tender", id],
    queryFn: () => api.tender(id as string),
    enabled: !!id,
  });
}
