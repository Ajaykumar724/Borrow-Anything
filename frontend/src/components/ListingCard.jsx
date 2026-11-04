import { useState } from "react";
import { ArrowUpRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar } from "./Avatar.jsx";

export function ListingCard({ item, onOpen, featured = false }) {
  const reduceMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <motion.button onClick={() => onOpen(item)} whileHover={reduceMotion ? undefined : { y: -4 }} whileTap={reduceMotion ? undefined : { scale: 0.99 }} className={`group overflow-hidden rounded-[1.35rem] border border-stone-200/80 bg-white text-left shadow-card transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${featured ? "sm:col-span-2 sm:grid sm:grid-cols-[1.1fr_1fr]" : ""}`}>
      <div className={`relative overflow-hidden bg-mint ${featured ? "min-h-64" : "aspect-[1.38]"}`}>
        {item.imageUrl && !imageFailed ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" onError={() => setImageFailed(true)} />
        ) : null}
        {(!item.imageUrl || imageFailed) && <div className="absolute inset-0 grid place-items-center text-forest/50"><Sparkles size={42} /></div>}
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink shadow-sm">{item.category}</span>
        <span className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-ink shadow-sm"><ArrowUpRight size={16} /></span>
      </div>
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold leading-snug text-ink">{item.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={13} /> {item.location}</p>
          </div>
          <p className="shrink-0 text-right text-sm font-bold text-ink">${item.dailyRate}<span className="font-normal text-stone-500"> /day</span></p>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-stone-600">{item.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar user={item.owner} size="sm" showStatus />
            <div><p className="text-xs font-medium text-ink">{item.owner?.name || "Community host"}</p><p className="text-[11px] text-stone-500">{item.owner?.trustScore ? `${item.owner.trustScore} demo trust score` : "Community member"}</p></div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-forest"><ShieldCheck size={14} /> ${item.deposit} deposit</span>
        </div>
      </div>
    </motion.button>
  );
}
