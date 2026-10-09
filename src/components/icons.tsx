// Line icons of the mockups (24-unit grid, 2px stroke, round joins).

type IconProps = { size?: number; className?: string };

function LineIcon({
  size = 18,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </LineIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M9 5l7 7-7 7" />
    </LineIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </LineIcon>
  );
}

export function PaperPlaneIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M21 3L10.5 13.5" />
      <path d="M21 3l-6.5 18-4-7.5L3 9.5 21 3z" />
    </LineIcon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 20h4L19.5 8.5l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </LineIcon>
  );
}

/** The mockup's download arrow ("Exportar para el cliente"). */
export function DownloadIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </LineIcon>
  );
}

/** The download arrow upside down ("Importar Excel o HTML"). */
export function UploadIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 16V5" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </LineIcon>
  );
}

/** The mockup's open lock ("Reabrir calendario"). */
export function UnlockIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.6-1.7" />
    </LineIcon>
  );
}

/** Filled ink circle with a white tick: "Aprobado". */
export function ApprovedIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
    >
      <circle cx="8" cy="8" r="8" className="fill-ink" />
      <path
        d="M4.6 8.3l2.2 2.2 4.6-4.9"
        fill="none"
        className="stroke-surface"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
