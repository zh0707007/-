export type NavIconName =
  | "admin"
  | "analysis"
  | "community"
  | "home"
  | "member"
  | "order"
  | "organization"
  | "profile"
  | "user";

type NavIconProps = {
  active?: boolean;
  name: NavIconName;
};

const paths: Record<NavIconName, string> = {
  admin: "M4 6h16M7 6v14M17 6v14M8 10h3M13 10h3M8 14h3M13 14h3",
  analysis: "M4 19V5M8 17v-6M12 17V7M16 17v-9M20 17v-4",
  community: "M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21a6 6 0 0 1 10.4-4.1M13 21a6 6 0 0 1 8-5.6",
  home: "M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6",
  member: "M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3Z",
  order: "M7 3h10l2 3v15H5V6l2-3ZM7 6h10M8 11h8M8 15h8",
  organization: "M4 20h16M6 20V8l6-4 6 4v12M9 20v-6h6v6M9 10h.01M15 10h.01",
  profile: "M8 4h8l3 3v13H5V4h3ZM15 4v4h4M8 12h8M8 16h6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
};

export function NavIcon({ active = false, name }: NavIconProps) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
        active ? "bg-gold/15 text-gold" : "bg-white text-black/45"
      }`}
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d={paths[name]} />
      </svg>
    </span>
  );
}
