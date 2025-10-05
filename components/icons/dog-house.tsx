export function DogHouseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Roof */}
      <path d="M3 12L12 3L21 12" />
      {/* House body */}
      <path d="M5 12V20H19V12" />
      {/* Door/entrance */}
      <path d="M9 20V14H15V20" />
      {/* Paw print detail */}
      <circle cx="8" cy="16" r="0.5" fill="currentColor" />
      <circle cx="10" cy="16" r="0.5" fill="currentColor" />
      <circle cx="9" cy="17.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
