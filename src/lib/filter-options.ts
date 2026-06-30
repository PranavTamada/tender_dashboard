import { KEYWORD_GROUPS } from "@/lib/keywords";
import {
  type MatchType,
  type TenderStatus,
} from "@/types/tender";

export const MATCH_TYPE_OPTIONS: { value: MatchType; label: string }[] = [
  { value: "KEYWORD", label: "Keyword Match" },
  { value: "DEPARTMENT", label: "Department Match" },
];

export const STATUS_OPTIONS: { value: TenderStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSING_SOON", label: "Closing Soon" },
  { value: "CLOSED", label: "Closed" },
  { value: "UNKNOWN", label: "Unknown" },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "closingSoon", label: "Closing Soon" },
  { value: "highestValue", label: "Highest Value" },
  { value: "sector", label: "Sector" },
  { value: "state", label: "State" },
];

export const KEYWORD_OPTIONS = KEYWORD_GROUPS.map((g) => ({
  value: g.label,
  label: g.label,
})).sort((a, b) => a.label.localeCompare(b.label));

export const STATUS_BADGE: Record<
  TenderStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "destructive" | "secondary";
  }
> = {
  OPEN: { label: "Open", variant: "success" },
  CLOSING_SOON: { label: "Closing Soon", variant: "warning" },
  CLOSED: { label: "Closed", variant: "destructive" },
  UNKNOWN: { label: "Unknown", variant: "secondary" },
};
