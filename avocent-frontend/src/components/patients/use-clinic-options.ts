"use client";

import { useEffect, useState } from "react";

import { browserRequest } from "@/lib/api/browser";
import type { ApiListResponse, Clinic } from "@/lib/types";

export interface ClinicOption {
  value: string;
  label: string;
}

export function useClinicOptions() {
  const [options, setOptions] = useState<ClinicOption[]>([]);

  useEffect(() => {
    let isCancelled = false;

    browserRequest<ApiListResponse<Clinic>>("/api/proxy/api/organization/clinics/")
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setOptions(
          response.results.map((clinic) => ({
            value: clinic.id,
            label: `${clinic.name} (${clinic.code})`,
          })),
        );
      })
      .catch(() => {
        if (!isCancelled) {
          setOptions([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return options;
}
