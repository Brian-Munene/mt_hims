"use client";

import { useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? logs.filter((log) => {
        const q = filter.toLowerCase();
        return (
          log.action.toLowerCase().includes(q) ||
          log.model_name.toLowerCase().includes(q) ||
          (log.ip_address ?? "").toLowerCase().includes(q)
        );
      })
    : logs;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter by action, resource type, or IP…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-400">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/compliance/audit/${log.id}`}
                      className="hover:text-teal-700"
                    >
                      {log.action}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <span className="capitalize">{log.model_name.replace(".", " · ")}</span>
                    <span className="ml-1 font-mono text-xs text-slate-400">
                      {log.object_id.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address ?? "—"}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
