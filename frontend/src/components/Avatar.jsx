import { BadgeCheck } from "lucide-react";

export function Avatar({ user, size = "md", showStatus = false }) {
  const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };
  return (
    <span className="relative inline-flex shrink-0">
      {user?.avatar ? (
        <img className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`} src={user.avatar} alt="" />
      ) : (
        <span className={`${sizes[size]} grid place-items-center rounded-full bg-mint font-semibold text-forest`}>
          {(user?.name || "U").slice(0, 1)}
        </span>
      )}
      {showStatus && user?.verificationStatus === "verified" && (
        <BadgeCheck aria-label="Demo verified" title="Simulated demo verification" className="absolute -bottom-1 -right-1 h-4 w-4 fill-forest text-white" />
      )}
    </span>
  );
}
