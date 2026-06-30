"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.stats(),
  });
}
