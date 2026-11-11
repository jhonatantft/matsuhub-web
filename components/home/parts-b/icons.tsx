import type { IconName } from "./agentScenarios";

const PATHS: Record<IconName, React.ReactNode> = {
  chat: (
    <>
      <path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 9 18.2Z" />
      <path d="M9 10.5h6M9 13.5h4" />
    </>
  ),
  crm: (
    <>
      <rect x="3.5" y="4.5" width="5" height="15" rx="1.5" />
      <rect x="10" y="4.5" width="5" height="10" rx="1.5" />
      <rect x="16.5" y="4.5" width="4" height="6" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="12" cy="14.8" r="1.4" />
    </>
  ),
  book: (
    <>
      <path d="M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2Z" />
      <path d="M5 19.5a2 2 0 0 0 2 1h12v-3M9 8h6" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17M7 14.5h4" />
    </>
  ),
  building: (
    <>
      <path d="M5 20.5V5l7-2v17.5M12 8l7 2.2v10.3M3 20.5h18" />
      <path d="M8 8v.01M8 11v.01M8 14v.01M15.5 13v.01M15.5 16v.01" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9.5h3.8l3.2 3.3V16h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 13.5h6M9 17h3" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8.5h13l-3.5-3.5M20 15.5H7l3.5 3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
};

export function ToolIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
