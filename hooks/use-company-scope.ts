"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/client";

export type CompanyOption = { id: string; name: string };

export function useCompanyScope() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [companiesLoading, setCompaniesLoading] = useState(true);

  useEffect(() => {
    void apiRequest<{ items: CompanyOption[] }>("/api/companies?limit=100").then(({ items }) => {
      setCompanies(items);
      setCompanyId((current) => current || items[0]?.id || "");
    }).catch(() => {
      // ADMIN users cannot list companies; their scope is derived by the API.
    }).finally(() => setCompaniesLoading(false));
  }, []);

  return { companies, companyId, setCompanyId, companiesLoading };
}
