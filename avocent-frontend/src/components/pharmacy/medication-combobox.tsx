"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Medication } from "@/lib/types";

interface MedicationComboboxProps {
  medications: Medication[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export function MedicationCombobox({
  medications,
  value,
  onChange,
  placeholder = "Search medications…",
}: MedicationComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = medications.find((m) => m.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
          !selected && "text-slate-400",
        )}
      >
        <span className="truncate">
          {selected
            ? `${selected.generic_name} ${selected.strength} (${selected.dosage_form})`
            : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-40" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-white shadow-lg">
          <Command>
            <CommandInput placeholder="Type to filter…" />
            <CommandList>
              <CommandEmpty>No medications found.</CommandEmpty>
              <CommandGroup>
                {medications.map((med) => {
                  const label = `${med.generic_name} ${med.strength} (${med.dosage_form})`;
                  return (
                    <CommandItem
                      key={med.id}
                      value={label}
                      onSelect={() => {
                        onChange(med.id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex-1">{label}</span>
                      {med.is_controlled && (
                        <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Controlled
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
