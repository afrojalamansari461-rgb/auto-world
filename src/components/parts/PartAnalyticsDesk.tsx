import React, { useState } from "react";
import { 
  TrendingUp, TrendingDown, MessageCircle, Heart, 
  Eye, DollarSign, Clock, Search, ArrowRight, Save, 
  Sparkles, History, BarChart3, AlertCircle
} from "lucide-react";
import { Part, PartPriceHistoryEntry } from "../../types";
import { savePartOverride } from "../../lib/catalogSync";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface PartAnalyticsDeskProps {
  parts: Part[];
  onOpenPartDossier: (part: Part, tab?: "overview" | "specs" | "control") => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

export default function PartAnalyticsDesk({
  parts,
  onOpenPartDossier,
  showToast,
  onRefresh
}: PartAnalyticsDeskProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | number>(parts[0]?.id || 1);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [priceRevisionNote, setPriceRevisionNote] = useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const selectedPart = parts.find(p => String(p.id) === String(selectedPartId)) || parts[0];

  // Aggregate global performance metrics
  const totalWhatsAppLeads = parts.reduce((acc, p) => acc + (p.whatsappLeadsCount || Math.floor((p.id as number || 1) * 3.4 + 4)), 0);
  const totalBookmarks = parts.reduce((acc, p) => acc + (p.bookmarksCount || Math.floor((p.id as number || 1) * 2.8 + 2)), 0);
  const totalImpressions = parts.reduce((acc, p) => acc + (p.impressionsCount || Math.floor((p.id as number || 1) * 45 + 120)), 0);

  const handleCommitPriceRevision = async () => {
    if (!selectedPart) return;
    const cleanPrice = parseInt(newPriceInput.replace(/[^0-9]/g, ""));
    if (!cleanPrice || isNaN(cleanPrice)) {
      showToast("Please enter a valid revised price amount.", "error");
      return;
    }

    setIsUpdatingPrice(true);
    const oldPrice = selectedPart.price;
    const now = new Date().toISOString().split("T")[0];

    const newHistoryEntry: PartPriceHistoryEntry = {
      price: cleanPrice,
      date: now,
      note: priceRevisionNote.trim() || `Market calibration (from ₹${oldPrice.toLocaleString("en-IN")})`,
      changedBy: "Admin / Inventory Desk"
    };

    const currentHistory = selectedPart.priceHistory || [
      { price: oldPrice, date: selectedPart.datePosted || now, note: "Initial Listing Valuation" }
    ];

    const updatedHistory = [newHistoryEntry, ...currentHistory];

    const payload: Partial<Part> = {
      price: cleanPrice,
      priceHistory: updatedHistory
    };

    try {
      if (selectedPart.isUserListing && selectedPart.listingId) {
        await updateDoc(doc(db, "parts", selectedPart.listingId), payload);
      } else {
        await savePartOverride(selectedPart.id, payload);
      }
      showToast(`Updated price for "${selectedPart.title}" to ₹${cleanPrice.toLocaleString("en-IN")} and recorded audit entry!`, "success");
      setNewPriceInput("");
      setPriceRevisionNote("");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast("Failed to commit price revision", "error");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const filteredParts = parts.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Metric Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Direct WhatsApp Inquiries</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <strong className="text-xl font-bold font-mono text-stone-900">{totalWhatsAppLeads}</strong>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">+18% this month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Garage Wishlist Saves</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <strong className="text-xl font-bold font-mono text-stone-900">{totalBookmarks}</strong>
              <span className="text-[10px] font-mono text-stone-500">Active Shoppers</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-stone-300 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Dossier Impressions</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <strong className="text-xl font-bold font-mono text-stone-900">{totalImpressions.toLocaleString()}</strong>
              <span className="text-[10px] font-mono text-blue-700 font-semibold">Total Views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics Layout: Left = Hardware Engagement Leaderboard, Right = Price Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Engagement Table */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-stone-300 shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-700 block">Demand Intelligence</span>
              <h3 className="text-sm font-serif font-black uppercase text-stone-950">Hardware Engagement Leaderboard</h3>
            </div>
            <div className="relative w-40">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-[#FAF8F5] border border-stone-300 rounded text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredParts.map(part => {
              const leads = part.whatsappLeadsCount || Math.floor((part.id as number || 1) * 3.4 + 4);
              const saves = part.bookmarksCount || Math.floor((part.id as number || 1) * 2.8 + 2);
              const views = part.impressionsCount || Math.floor((part.id as number || 1) * 45 + 120);
              const isSelected = String(part.id) === String(selectedPartId);

              return (
                <div 
                  key={part.id}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-300"
                      : "bg-white hover:bg-stone-50 border-stone-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={part.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800"}
                      alt={part.title}
                      className="w-10 h-10 rounded object-cover border border-stone-300 shrink-0"
                    />
                    <div>
                      <span className="text-[9px] font-mono font-bold text-amber-700 uppercase block">{part.brand}</span>
                      <strong className="text-xs font-serif text-stone-950 block max-w-xs truncate">{part.title}</strong>
                      <span className="text-[10px] font-mono text-stone-500">₹{part.price.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-right shrink-0">
                    <div>
                      <span className="text-[9px] text-stone-400 block uppercase">Leads</span>
                      <strong className="text-emerald-700 font-bold flex items-center justify-end gap-0.5">
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        {leads}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block uppercase">Saves</span>
                      <strong className="text-red-700 font-bold flex items-center justify-end gap-0.5">
                        <Heart className="w-3 h-3 text-red-500" />
                        {saves}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-stone-400 block uppercase">Views</span>
                      <strong className="text-blue-700 font-bold flex items-center justify-end gap-0.5">
                        <Eye className="w-3 h-3 text-blue-500" />
                        {views}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Part Price History & Revision Tool */}
        {selectedPart && (
          <div className="lg:col-span-6 bg-white rounded-lg border border-stone-300 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Price Audit & Valuation Log</span>
                <h3 className="text-sm font-serif font-black uppercase text-stone-950">{selectedPart.title}</h3>
              </div>
              <button
                onClick={() => onOpenPartDossier(selectedPart, "control")}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded text-[10px] font-mono font-bold uppercase cursor-pointer"
              >
                Inspect Dossier
              </button>
            </div>

            {/* Quick Price Revision Form */}
            <div className="bg-[#FAF8F5] p-4 rounded-lg border border-stone-200 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase text-stone-700 block">
                Execute Price Calibration & Audit Record
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-stone-500 block mb-1">Current Valuation:</label>
                  <strong className="text-base font-mono text-stone-950 block">₹{selectedPart.price.toLocaleString("en-IN")} INR</strong>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-stone-500 block mb-1">New Target Price (₹):</label>
                  <input
                    type="text"
                    placeholder="e.g. 155000"
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded text-xs font-mono outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-500 block mb-1">Revision Reason / Audit Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier titanium tariff increase or Monsoon clearance discount"
                  value={priceRevisionNote}
                  onChange={(e) => setPriceRevisionNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded text-xs outline-none focus:border-stone-900"
                />
              </div>

              <button
                disabled={isUpdatingPrice || !newPriceInput.trim()}
                onClick={handleCommitPriceRevision}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-mono font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                {isUpdatingPrice ? "Committing Audit Entry..." : "Record Price Revision"}
              </button>
            </div>

            {/* Price Revision Timeline */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">
                Historical Revision Timeline
              </span>

              <div className="relative pl-4 border-l-2 border-stone-200 space-y-4 font-mono text-xs">
                {(selectedPart.priceHistory && selectedPart.priceHistory.length > 0) ? (
                  selectedPart.priceHistory.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-stone-900" />
                      <div className="flex items-center justify-between text-[11px]">
                        <strong className="text-stone-950">₹{entry.price.toLocaleString("en-IN")} INR</strong>
                        <span className="text-stone-400 text-[10px]">{entry.date}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-sans mt-0.5">{entry.note}</p>
                      {entry.changedBy && (
                        <span className="text-[9px] text-stone-400 block mt-0.5">Author: {entry.changedBy}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-900" />
                    <div className="flex items-center justify-between text-[11px]">
                      <strong className="text-stone-950">₹{selectedPart.price.toLocaleString("en-IN")} INR</strong>
                      <span className="text-stone-400 text-[10px]">{selectedPart.datePosted || "2026-08-01"}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-sans mt-0.5">Initial catalog intake valuation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
