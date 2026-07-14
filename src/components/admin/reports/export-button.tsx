"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "pdf", label: "PDF" },
] as const;

export function ExportButton({
  domain,
  label = "Export",
}: {
  domain:
    | "patients"
    | "doctors"
    | "appointments"
    | "payments"
    | "revenue"
    | "medical-history";
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <Download />
            {label}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.value}
            render={
              <a href={`/api/reports/export/${domain}?format=${format.value}`}>
                {format.label}
              </a>
            }
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
