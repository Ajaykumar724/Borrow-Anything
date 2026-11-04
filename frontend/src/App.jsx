import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button as FluentButton } from "@fluentui/react-components";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bell, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Compass, Heart, Leaf, MapPin, Plus, Search,
  ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, X
} from "lucide-react";
import { api } from "./api/client.js";
import { Avatar } from "./components/Avatar.jsx";
import { ListingCard } from "./components/ListingCard.jsx";

const categories = ["All items", "Electronics", "Tools", "Outdoors", "Home", "Sports", "Other"];
const money = (value) => `$${Number(value || 0).toFixed(2).replace(/\.00$/, "")}`;
const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nextDate = (value) => {
  if (!value) return dateOffset(1);
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function Modal({ title, eyebrow, onClose, children, wide = false }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section role="dialog" aria-modal="true" aria-label={title} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[1.7rem] bg-white shadow-2xl sm:rounded-[1.7rem] ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2></div>
          <FluentButton appearance="subtle" icon={<X size={18} />} onClick={onClose} aria-label="Close dialog" className="!h-9 !w-9 !min-w-0 !rounded-full !bg-stone-100 !p-0 text-stone-500 hover:!bg-stone-200" />
        </div>
        <div className="p-6">{children}</div>
      </motion.section>
    </div>
  );
}

function StatusPill({ status }) {
  const style = {
    Pending: "bg-amber-50 text-amber-800", Approved: "bg-blue-50 text-blue-800",
    Active: "bg-emerald-50 text-emerald-800", Returned: "bg-stone-100 text-stone-600",
    Disputed: "bg-rose-50 text-rose-700", Declined: "bg-stone-100 text-stone-600"
  }[status] || "bg-stone-100 text-stone-600";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}

function RentalCard({ rental, mode, currentUser, onAction, onReport }) {
  const item = rental.item;
  const counterpart = mode === "owner" ? rental.renter : rental.owner;
  const daysUntilReturn = Math.ceil((new Date(`${rental.endDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  const actionButtons = mode === "owner" && !rental.locked && rental.status !== "Disputed" ? (
    <>
      {rental.status === "Pending" && <><button onClick={() => onAction(rental, "Approved")} className="button-primary !px-3 !py-2"><Check size={14} /> Approve</button><button onClick={() => onAction(rental, "Declined")} className="button-light !px-3 !py-2">Decline</button></>}
      {rental.status === "Approved" && <button onClick={() => onAction(rental, "Active")} className="button-primary !px-3 !py-2">Mark picked up</button>}
      {rental.status === "Active" && <button onClick={() => onAction(rental, "Returned")} className="button-light !px-3 !py-2">Mark returned</button>}
      {["Approved", "Active"].includes(rental.status) && <button onClick={() => onReport(rental)} className="button-danger !px-3 !py-2"><ShieldAlert size={14} /> Report issue</button>}
    </>
  ) : null;
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img src={item?.imageUrl} alt="" className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-ink">{item?.title || "Item rental"}</p><p className="mt-1 text-xs text-stone-500">{mode === "owner" ? "Borrowed by" : "Hosted by"} {counterpart?.name || "Neighbor"}</p></div><StatusPill status={rental.status} /></div>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-500"><CalendarDays size={14} /> {rental.startDate} <ArrowRight size={12} /> {rental.endDate} <span className="ml-auto font-semibold text-ink">{money(rental.total)}</span></p>
          <p className="mt-1 text-[11px] text-stone-500">{rental.days} day{rental.days === 1 ? "" : "s"} · {money(rental.dailyRate)} daily + {money(rental.deposit)} refundable deposit + {money(rental.platformFee ?? rental.commission)} demo platform fee</p>
          {rental.status === "Active" && <div className="mt-3 rounded-xl bg-mint px-3 py-2 text-xs text-forest"><b>{daysUntilReturn > 0 ? `${daysUntilReturn} day${daysUntilReturn === 1 ? "" : "s"} until return` : daysUntilReturn === 0 ? "Return due today" : "Return date has passed"}</b><span className="mt-1 block text-stone-600">Coordinate the drop-off with {counterpart?.name || "your neighbor"} at the original pickup spot, and confirm the item’s condition together.</span></div>}
          {rental.locked && rental.status !== "Disputed" && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Booking locked while the renter’s incident case is reviewed.</p>}
          <div className="mt-3 flex flex-wrap gap-2">{actionButtons}</div>
        </div>
      </div>
      {rental.dispute && <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><span><b>Incident report under review.</b> A legal-review record is pending (demo only, not a legal notice). Case {rental.dispute.id}{rental.dispute.legalNoticeGeneratedAt && <> · Recorded {new Date(rental.dispute.legalNoticeGeneratedAt).toLocaleString()}</>}.</span></div>}
    </article>
  );
}

function ListingForm({ currentUser, onClose, onCreated }) {
  const [values, setValues] = useState({ title: "", category: "Electronics", description: "", dailyRate: "", deposit: "", replacementValue: "", location: currentUser.location || "", imageUrl: "", specifications: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setValues((old) => ({ ...old, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createItem({
        ...values, ownerId: currentUser.id, dailyRate: Number(values.dailyRate),
        deposit: Number(values.deposit), replacementValue: Number(values.replacementValue),
        specifications: values.specifications.split(",").map((part) => part.trim()).filter(Boolean)
      });
      onCreated();
    } catch (issue) { setError(issue.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Share something good" eyebrow="New listing" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="What are you sharing?" value={values.title} onChange={update("title")} required placeholder="e.g. Portable espresso maker" />
        <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Category<select className="field-control" value={values.category} onChange={update("category")}>{["Electronics", "Tools", "Outdoors", "Home", "Sports", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><Field label="Neighborhood" value={values.location} onChange={update("location")} required placeholder="Brooklyn, NY" /></div>
        <label className="field-label">A little about it<textarea className="field-control min-h-24 resize-y" value={values.description} onChange={update("description")} required placeholder="What makes it useful? What's included?" /></label>
        <div className="grid grid-cols-3 gap-3"><Field label="Daily rate ($)" type="number" min="1" value={values.dailyRate} onChange={update("dailyRate")} required /><Field label="Deposit ($)" type="number" min="0" value={values.deposit} onChange={update("deposit")} required /><Field label="Value ($)" type="number" min="1" value={values.replacementValue} onChange={update("replacementValue")} required /></div>
        <Field label="Photo URL (optional)" type="url" value={values.imageUrl} onChange={update("imageUrl")} placeholder="https://…" />
        <Field label="What's included? (comma-separated)" value={values.specifications} onChange={update("specifications")} placeholder="Charger, carrying case" />
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="button-primary w-full justify-center">{busy ? "Publishing…" : "Publish listing"} <ArrowUpRight size={16} /></button>
      </form>
    </Modal>
  );
}

function Field({ label, ...props }) {
  return <label className="field-label">{label}<input className="field-control" {...props} /></label>;
}

function ItemDetails({ item, currentUser, onClose, onBooked }) {
  const [startDate, setStartDate] = useState(dateOffset(1));
  const [endDate, setEndDate] = useState(dateOffset(3));
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const days = Math.max(0, Math.ceil((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000));
  useEffect(() => {
    if (!startDate || !endDate || startDate >= endDate) {
      setQuote(null);
      setQuoteError("");
      return undefined;
    }
    let active = true;
    setQuote(null);
    setQuoteError("");
    api.quote({ itemId: item.id, startDate, endDate })
      .then((result) => active && setQuote(result))
      .catch((issue) => active && setQuoteError(issue.message));
    return () => { active = false; };
  }, [item.id, startDate, endDate]);
  async function book() {
    setBusy(true); setError("");
    try {
      await api.createRental({ itemId: item.id, renterId: currentUser.id, startDate, endDate });
      onBooked();
    } catch (issue) { setError(issue.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={item.title} eyebrow={`${item.category} · ${item.location}`} onClose={onClose} wide>
      <div className="grid gap-7 md:grid-cols-[1.1fr_.9fr]">
        <div>
          {item.imageUrl && !imageFailed ? <img src={item.imageUrl} alt={item.title} onError={() => setImageFailed(true)} className="h-64 w-full rounded-2xl object-cover" /> : <div className="grid h-64 w-full place-items-center rounded-2xl bg-mint text-forest"><Sparkles size={42} /></div>}
          <p className="mt-5 text-sm leading-7 text-stone-600">{item.description}</p>
          {item.specifications?.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold text-ink">Included in the rental</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{item.specifications.map((spec) => <li key={spec} className="flex items-center gap-2 text-sm text-stone-600"><Check size={15} className="text-forest" />{spec}</li>)}</ul></div>}
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-canvas p-4"><Avatar user={item.owner} showStatus /><div><p className="text-sm font-semibold text-ink">{item.owner?.name}</p><p className="mt-0.5 text-xs text-stone-500">{item.owner?.trustScore || 50} demo trust score · Member since {item.owner?.joinedAt?.slice(0, 4)}</p></div><ShieldCheck className="ml-auto text-forest" size={20} /></div>
        </div>
        <div className="h-fit rounded-2xl border border-stone-200 p-5">
          <p className="text-2xl font-bold text-ink">{money(item.dailyRate)} <span className="text-sm font-normal text-stone-500">/ day</span></p>
          <p className="mt-1 text-xs text-stone-500">A refundable {money(item.deposit)} security deposit is included.</p>
          {currentUser.id === item.ownerId ? <div className="mt-6 rounded-xl bg-mint p-4 text-sm text-forest">This is your listing. Share it with your neighbors!</div> : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3"><Field label="Pick-up" type="date" min={dateOffset(0)} value={startDate} onChange={(e) => { const value = e.target.value; setStartDate(value); if (endDate <= value) setEndDate(nextDate(value)); }} /><Field label="Return" type="date" min={nextDate(startDate)} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div className="rounded-xl bg-mint/70 p-3 text-xs leading-5 text-forest"><b>Simulated escrow estimate</b><br />No funds are collected or held by this demo.</div>
              <div className="space-y-3 border-t border-stone-100 pt-4 text-sm"><div className="flex justify-between text-stone-600"><span>{money(item.dailyRate)} × {quote?.days ?? days} {(quote?.days ?? days) === 1 ? "day" : "days"}</span><span>{quote ? money(quote.subtotal) : "—"}</span></div><div className="flex justify-between text-stone-600"><span>Refundable deposit estimate</span><span>{quote ? money(quote.deposit) : "—"}</span></div><div className="flex justify-between text-stone-600"><span>Platform fee (10% of rental)</span><span>{quote ? money(quote.platformFee) : "—"}</span></div><div className="flex justify-between border-t border-stone-100 pt-3 font-bold text-ink"><span>Estimated total</span><span>{quote ? money(quote.total) : "—"}</span></div></div>
              {quoteError && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{quoteError}</p>}
              {currentUser.verificationStatus === "suspended" && <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">This demo profile is suspended and cannot submit a rental request.</p>}
              {error && <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
              <button onClick={book} disabled={busy || days < 1 || !quote || currentUser.verificationStatus === "suspended"} className="button-primary w-full justify-center">{busy ? "Sending request…" : "Request to borrow"} <ArrowRight size={16} /></button>
              <p className="text-center text-[11px] text-stone-500">Estimate only: no payment processing, escrow, or money movement.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReportModal({ rental, onClose, onSubmit }) {
  const [reason, setReason] = useState("not_returned");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Report an incident" eyebrow="Trust & safety" onClose={onClose}>
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldAlert className="mt-1 shrink-0" size={18} /><p>A report flags the rental for review and suspends the renter's account while the case is assessed. This prototype does not initiate real legal action.</p></div>
      <label className="field-label">What happened?<select className="field-control" value={reason} onChange={(e) => setReason(e.target.value)}><option value="not_returned">Item was not returned</option><option value="stolen">Item reported stolen</option></select></label>
      <label className="field-label mt-4">Notes for review<textarea className="field-control min-h-24 resize-y" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Share relevant details (optional)" /></label>
      <button className="button-danger mt-5 w-full justify-center" disabled={busy} onClick={async () => { setBusy(true); await onSubmit(rental, reason, details); setBusy(false); }}>{busy ? "Submitting…" : "Submit report"}</button>
    </Modal>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentId, setCurrentId] = useState("");
  const [items, setItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [view, setView] = useState("explore");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All items");
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [listingOpen, setListingOpen] = useState(false);
  const [reportRental, setReportRental] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = users.find((user) => user.id === currentId) || users[0];
  const isOwnerView = view === "owner";
  const loadUsers = useCallback(async () => {
    const data = await api.users();
    setUsers(data);
    setCurrentId((old) => old || data.find((user) => user.verificationStatus !== "suspended")?.id || data[0]?.id || "");
    return data;
  }, []);
  const loadItems = useCallback(async () => {
    const filters = { q: search, location, maxPrice, category: category === "All items" ? "" : category, startDate: availabilityStart && availabilityEnd ? availabilityStart : "", endDate: availabilityStart && availabilityEnd ? availabilityEnd : "" };
    setItems(await api.items(filters));
  }, [search, location, maxPrice, category, availabilityStart, availabilityEnd]);
  const loadDashboard = useCallback(async () => {
    const [allRentals, allDisputes] = await Promise.all([api.rentals(currentId), api.disputes()]);
    setRentals(allRentals);
    setDisputes(allDisputes);
  }, [currentId]);

  useEffect(() => {
    let active = true;
    Promise.all([api.users(), api.items()]).then(([people, listings]) => {
      if (!active) return;
      setUsers(people); setCurrentId(people.find((user) => user.verificationStatus !== "suspended")?.id || people[0]?.id || ""); setItems(listings); setLoading(false);
    }).catch((issue) => { if (active) { setError(issue.message); setLoading(false); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!users.length) return;
    let active = true;
    const filters = { q: search, location, maxPrice, category: category === "All items" ? "" : category, startDate: availabilityStart && availabilityEnd ? availabilityStart : "", endDate: availabilityStart && availabilityEnd ? availabilityEnd : "" };
    api.items(filters).then((data) => { if (active) { setItems(data); setError(""); } }).catch((issue) => active && setError(issue.message));
    return () => { active = false; };
  }, [search, category, location, maxPrice, availabilityStart, availabilityEnd, users.length]);
  useEffect(() => {
    if (!currentId) return;
    let active = true;
    Promise.all([api.rentals(currentId), api.disputes()]).then(([allRentals, allDisputes]) => {
      if (active) { setRentals(allRentals); setDisputes(allDisputes); }
    }).catch((issue) => active && setError(issue.message));
    return () => { active = false; };
  }, [currentId, view]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const rentalRows = useMemo(() => rentals.filter((rental) => isOwnerView ? rental.ownerId === currentId : rental.renterId === currentId), [rentals, isOwnerView, currentId]);
  async function refreshEverything() {
    try {
      await Promise.all([loadUsers(), loadItems(), loadDashboard()]);
    } catch (issue) { setError(issue.message); }
  }
  async function updateRental(rental, status) {
    try {
      await api.updateRental(rental.id, status, currentId);
      setToast(`Rental ${status.toLowerCase()}.`);
      await refreshEverything();
    } catch (issue) { setToast(issue.message); }
  }
  async function verifyDemo(method) {
    try {
      const verified = await api.verifyDemo(currentId, method);
      setUsers((people) => people.map((user) => user.id === currentId ? verified : user));
      setToast(`Demo ${method} verification recorded. No real checks were performed.`);
    } catch (issue) { setToast(issue.message); }
  }
  async function submitReport(rental, reason, details) {
    try {
      await api.report(rental.id, { actorId: currentId, reason, details });
      setReportRental(null);
      setToast("Report filed. The case is flagged for review.");
      await refreshEverything();
    } catch (issue) { setToast(issue.message); }
  }
  async function listingCreated() {
    setListingOpen(false); setView("explore"); setToast("Your listing is live.");
    await refreshEverything();
  }
  async function rentalCreated() {
    setSelectedItem(null); setView("renter"); setToast("Request sent! You can follow its progress in your dashboard.");
    await refreshEverything();
  }

  const activeItems = items;
  const featuredItem = activeItems[0];
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-7">
          <button onClick={() => setView("explore")} className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-lime"><Leaf size={19} /></span>
            <span className="text-[17px] font-bold tracking-tight text-ink">borrow<span className="text-forest">anything</span><span className="ml-1 align-top text-[9px] font-semibold uppercase tracking-widest text-stone-400">.co</span></span>
          </button>
          <nav className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-sm md:flex">
            <NavButton active={view === "explore"} onClick={() => setView("explore")}><Compass size={15} /> Explore</NavButton>
            <NavButton active={view === "renter"} onClick={() => setView("renter")}><ArrowDownRight size={15} /> Borrowing</NavButton>
            <NavButton active={view === "owner"} onClick={() => setView("owner")}><ArrowUpRight size={15} /> Lending</NavButton>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setListingOpen(true)} className="hidden items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-forest hover:text-forest sm:flex"><Plus size={15} /> List an item</button>
            <div className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-3 pr-2 sm:flex">
              <Avatar user={currentUser} size="sm" />
              <select aria-label="Demo profile" className="max-w-36 bg-transparent pr-1 text-xs font-medium text-ink outline-none" value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.verificationStatus === "suspended" ? " · Suspended" : ""}</option>)}
              </select>
              <ChevronDown size={13} className="text-stone-400" />
            </div>
            <button aria-label="Notifications" className="relative rounded-full bg-white p-2.5 text-stone-600 shadow-sm"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-forest" /></button>
            <label className="sr-only" htmlFor="mobile-profile">Demo profile</label>
            <select id="mobile-profile" className="max-w-[5.5rem] rounded-full border border-stone-200 bg-white px-2 py-2 text-[10px] font-semibold text-ink sm:hidden" value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name.split(" ")[0]}{user.verificationStatus === "suspended" ? " · Suspended" : ""}</option>)}
            </select>
            <button className="rounded-full bg-white p-2.5 text-stone-600 shadow-sm sm:hidden" onClick={() => setListingOpen(true)} aria-label="List an item"><Plus size={17} /></button>
          </div>
        </div>
      </header>
      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-stone-200 bg-white/95 p-2 pb-4 shadow-[0_-8px_24px_rgba(27,55,45,.08)] backdrop-blur md:hidden">
        <NavButton active={view === "explore"} onClick={() => setView("explore")}><Compass size={15} /> Explore</NavButton>
        <NavButton active={view === "renter"} onClick={() => setView("renter")}><ArrowDownRight size={15} /> Borrowing</NavButton>
        <NavButton active={view === "owner"} onClick={() => setView("owner")}><ArrowUpRight size={15} /> Lending</NavButton>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-7 sm:pt-10 md:pb-20">
        {view === "explore" ? (
          <>
            <section className="relative overflow-hidden rounded-[1.8rem] bg-forest px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-14">
              <div className="relative z-10 max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.15em] text-lime"><Sparkles size={13} /> The neighborhood sharing economy</p>
                <h1 className="max-w-xl text-[2.4rem] font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[3.55rem]">Good things are meant to be <span className="font-serif italic text-lime">shared.</span></h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">Find what you need nearby. Lend what you don’t use every day. Better things, together.</p>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-20 h-80 w-80 rounded-full border border-white/10 sm:right-6 sm:top-[-5rem] sm:h-[28rem] sm:w-[28rem]"><div className="absolute inset-8 rounded-full border border-white/10"><div className="absolute inset-8 rounded-full border border-white/10" /></div></div>
              <div className="pointer-events-none absolute bottom-[-4rem] right-[17%] hidden h-36 w-36 rotate-12 rounded-[2rem] border border-lime/25 bg-lime/10 sm:block" />
              <div className="relative z-10 mt-8 grid gap-2 rounded-2xl bg-white p-2 shadow-xl sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:rounded-full">
                <label className="flex items-center gap-3 rounded-full px-4 py-2.5 text-ink"><Search size={17} className="shrink-0 text-forest" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="What are you looking for?" /></label>
                <label className="flex items-center gap-3 border-t border-stone-100 px-4 py-2.5 text-ink sm:border-l sm:border-t-0"><MapPin size={17} className="shrink-0 text-forest" /><input value={location} onChange={(e) => setLocation(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Neighborhood" /></label>
                <label className="flex items-center gap-3 border-t border-stone-100 px-4 py-2.5 text-ink sm:border-l sm:border-t-0"><SlidersHorizontal size={17} className="shrink-0 text-forest" /><span className="shrink-0 text-xs text-stone-500">Up to $</span><input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Any price" /></label>
                <button onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-lime px-7 py-3 text-sm font-bold text-ink transition hover:bg-[#e4f6a4]">Find something</button>
              </div>
              <div className="relative z-10 mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-white/10 p-3 sm:w-fit sm:rounded-full sm:px-5">
                <label className="text-[11px] font-medium text-white/80">Available from<input aria-label="Availability start date" type="date" min={dateOffset(0)} value={availabilityStart} onChange={(event) => setAvailabilityStart(event.target.value)} className="mt-1 block rounded-lg border border-white/30 bg-white px-3 py-2 text-xs text-ink" /></label>
                <label className="text-[11px] font-medium text-white/80">Available through<input aria-label="Availability end date" type="date" min={availabilityStart ? nextDate(availabilityStart) : dateOffset(1)} value={availabilityEnd} onChange={(event) => setAvailabilityEnd(event.target.value)} className="mt-1 block rounded-lg border border-white/30 bg-white px-3 py-2 text-xs text-ink" /></label>
                {(availabilityStart || availabilityEnd) && <button onClick={() => { setAvailabilityStart(""); setAvailabilityEnd(""); }} className="rounded-full px-3 py-2 text-xs font-semibold text-white underline underline-offset-2">Clear dates</button>}
              </div>
            </section>

            <section className="mt-9">
              <div className="flex items-end justify-between gap-4">
                <div><p className="eyebrow">Good finds, close by</p><h2 id="discover" className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">Popular in your neighborhood</h2></div>
                <button onClick={() => setListingOpen(true)} className="hidden items-center gap-1 text-sm font-semibold text-forest hover:text-ink sm:flex">Have something to share? <ArrowRight size={15} /></button>
              </div>
              <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${category === item ? "bg-ink text-white" : "border border-stone-200 bg-white text-stone-600 hover:border-forest hover:text-forest"}`}>{item}</button>)}</div>
              {loading ? <div className="grid min-h-56 place-items-center text-sm text-stone-500">Finding good things nearby…</div> : error && !items.length ? (
                <div className="mt-7 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-800"><b>Can’t reach the marketplace.</b> {error}<p className="mt-1 text-xs">Start the backend with <code>npm --prefix backend start</code>.</p></div>
              ) : activeItems.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeItems.slice(0, 1).map((item) => <ListingCard key={item.id} item={item} onOpen={setSelectedItem} featured />)}
                  {activeItems.slice(1).map((item) => <ListingCard key={item.id} item={item} onOpen={setSelectedItem} />)}
                </div>
              ) : <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center"><CircleHelp className="mx-auto text-stone-400" /><p className="mt-3 font-semibold text-ink">Nothing found just yet</p><p className="mt-1 text-sm text-stone-500">Try another search or loosen your filters.</p></div>}
            </section>
            <section className="mt-14 grid gap-4 rounded-[1.7rem] bg-[#edf1e8] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
              <div><p className="eyebrow">Make room for more</p><h2 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">Your rarely-used things could be someone’s favorite thing.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Share with people nearby, set your own rate, and keep your community a little more connected.</p></div>
              <button onClick={() => setListingOpen(true)} className="button-primary w-fit">List an item <ArrowUpRight size={16} /></button>
            </section>
          </>
        ) : (
          <section>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="eyebrow">{isOwnerView ? "Your neighborhood shop" : "Your borrowing story"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{isOwnerView ? "Lending dashboard" : "Borrowing dashboard"}</h1><p className="mt-2 text-sm text-stone-500">A little sharing goes a long way, {currentUser?.name?.split(" ")[0]}.</p></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2 pr-3"><Avatar user={currentUser} size="sm" showStatus /><select className="max-w-36 bg-transparent text-xs font-medium outline-none" value={currentId} onChange={(e) => setCurrentId(e.target.value)} aria-label="Choose demo profile">{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select><ChevronDown size={13} className="text-stone-400" /></div>
                {isOwnerView && <button onClick={() => setListingOpen(true)} className="button-primary"><Plus size={15} /> New listing</button>}
              </div>
            </div>
            {currentUser?.verificationStatus === "suspended" && <div className="mt-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><ShieldAlert size={18} className="shrink-0" /><p><b>Account suspended.</b> Your account was flagged following an item incident report. New rental requests are disabled while the case is under review.</p></div>}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <StatCard label={isOwnerView ? "Items shared" : "Items borrowed"} value={isOwnerView ? items.filter((item) => item.ownerId === currentId).length : rentalRows.length} icon={<Sparkles size={18} />} />
              <StatCard label="In progress" value={rentalRows.filter((rental) => ["Pending", "Approved", "Active"].includes(rental.status)).length} icon={<Clock3 size={18} />} />
              <StatCard label={isOwnerView ? "Community earnings*" : "Total checkout"} value={money(rentalRows.reduce((total, rental) => total + (isOwnerView ? rental.subtotal || rental.dailyRate * rental.days : rental.total), 0))} icon={<ArrowUpRight size={18} />} />
            </div>
            <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_310px]">
              <div>
                <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">{isOwnerView ? "Your lending activity" : "Your rental requests"}</h2><span className="text-xs text-stone-500">{rentalRows.length} total</span></div>
                {rentalRows.length ? <div className="space-y-3">{rentalRows.map((rental) => <RentalCard key={rental.id} rental={rental} mode={isOwnerView ? "owner" : "renter"} currentUser={currentUser} onAction={updateRental} onReport={setReportRental} />)}</div> : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center"><CalendarDays className="mx-auto text-stone-400" /><p className="mt-3 font-semibold text-ink">Your next good find is out there</p><p className="mt-1 text-sm text-stone-500">{isOwnerView ? "New rental requests will show up here." : "Browse nearby items and send your first request."}</p><button onClick={() => setView("explore")} className="button-primary mx-auto mt-5">Explore the marketplace <ArrowRight size={15} /></button></div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-2xl bg-ink p-5 text-white"><ShieldCheck size={22} className="text-lime" /><h3 className="mt-3 font-semibold">Trust makes sharing easier.</h3><p className="mt-2 text-xs leading-5 text-white/65">Your profile has a <b className="text-lime">{currentUser?.trustScore ?? 50}/100 demo trust score</b>. Estimate based on simulated verification, account age, and completed demo rentals—not a real identity or safety assessment.</p><div className="mt-3 flex flex-wrap gap-1.5">{(currentUser?.trustBadges || []).map((badge) => <span key={badge} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-lime">{badge}</span>)}{!currentUser?.trustBadges?.length && <span className="text-[10px] text-white/55">No demo verification badges yet</span>}</div><p className="mt-3 text-xs text-white/65">Keep communication on-platform and confirm item condition at handoff.</p><div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/70"><Avatar user={currentUser} size="sm" showStatus />{currentUser?.name}<BadgeCheck size={15} className="text-lime" /></div>{currentUser?.verificationStatus !== "suspended" && <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => verifyDemo("phone")} disabled={currentUser?.phoneVerified} className="rounded-lg bg-white/10 px-2 py-2 text-[10px] font-semibold text-white hover:bg-white/20 disabled:opacity-50">{currentUser?.phoneVerified ? "Phone · demo" : "Verify phone · demo"}</button><button onClick={() => verifyDemo("id")} disabled={currentUser?.idVerified} className="rounded-lg bg-white/10 px-2 py-2 text-[10px] font-semibold text-white hover:bg-white/20 disabled:opacity-50">{currentUser?.idVerified ? "ID · demo" : "Verify ID · demo"}</button></div>}</div>
                {isOwnerView && <div className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">Case review queue</h3><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">{disputes.length}</span></div>{disputes.length ? <div className="mt-4 space-y-3">{disputes.map((dispute) => <div key={dispute.id} className="rounded-xl bg-canvas p-3"><p className="text-xs font-semibold text-ink">{dispute.reason === "stolen" ? "Reported stolen" : "Not returned"}</p><p className="mt-1 text-[11px] text-stone-500">{dispute.item?.title} · {dispute.renter?.name}</p><p className="mt-2 text-[10px] font-medium text-rose-700">Demo legal-review record · pending</p>{dispute.legalNoticeGeneratedAt && <p className="mt-1 text-[10px] text-stone-500">Record timestamp: {new Date(dispute.legalNoticeGeneratedAt).toLocaleString()}</p>}<p className="mt-1 text-[10px] text-stone-400">Not an actual legal notice or legal advice.</p></div>)}</div> : <p className="mt-3 text-xs text-stone-500">No reports filed. Keep sharing safely.</p>}</div>}
                <div className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="text-sm font-semibold text-ink">A good neighbor tip</h3><p className="mt-2 text-xs leading-5 text-stone-500">A quick photo at pick-up and return helps everyone feel good about sharing.</p><button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest">Community guidelines <ArrowUpRight size={13} /></button></div>
              </aside>
            </div>
            {isOwnerView && <div className="mt-5 text-[11px] text-stone-400">* Demo estimate before any fees. No money changes hands in this prototype.</div>}
          </section>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="font-semibold text-forest">borrowanything.co</span><span>Better things, together. A local sharing prototype.</span><span className="flex items-center gap-1"><Heart size={12} className="text-rose-400" /> Made for neighbors</span></div></footer>
      {selectedItem && <ItemDetails item={selectedItem} currentUser={currentUser} onClose={() => setSelectedItem(null)} onBooked={rentalCreated} />}
      {listingOpen && currentUser && <ListingForm currentUser={currentUser} onClose={() => setListingOpen(false)} onCreated={listingCreated} />}
      {reportRental && <ReportModal rental={reportRental} onClose={() => setReportRental(null)} onSubmit={submitReport} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl"><Check size={16} className="text-lime" />{toast}</div>}
      <div className="fixed bottom-4 right-4 hidden items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-[10px] text-stone-500 shadow-sm lg:flex"><span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"}`} />Demo mode · no real payments</div>
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return <button onClick={onClick} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${active ? "bg-ink text-white" : "text-stone-500 hover:text-ink"}`}>{children}</button>;
}

function StatCard({ label, value, icon }) {
  return <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-forest">{icon}</span><div><p className="text-[11px] text-stone-500">{label}</p><p className="mt-0.5 text-xl font-semibold text-ink">{value}</p></div></div>;
}
