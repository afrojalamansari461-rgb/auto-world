import React, { useState } from "react";
import { 
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, 
  Sparkles, Star, Search, Filter, MessageSquare, 
  ExternalLink, User, Clock, AlertTriangle, Eye, Award
} from "lucide-react";
import { Part, UserPartListing } from "../../types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface ModerationApprovalQueueProps {
  parts: Part[];
  onOpenPartDossier: (part: Part, tab?: "overview" | "specs" | "control") => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

const COMMON_REJECTION_REASONS = [
  "Missing OEM / Tuner Part Serial Number",
  "Dyno / Spec claim lacks verified proof or certificate",
  "Low-resolution or blurred photographs provided",
  "Incompatible or non-standard vehicle fitment claims",
  "Suspected replica / counterfeit motorsport hardware",
  "Pricing severely outside market tolerance"
];

export default function ModerationApprovalQueue({
  parts,
  onOpenPartDossier,
  showToast,
  onRefresh
}: ModerationApprovalQueueProps) {
  const [filterTab, setFilterTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingPart, setRejectingPart] = useState<Part | null>(null);
  const [selectedReason, setSelectedReason] = useState(COMMON_REJECTION_REASONS[0]);
  const [customReasonNote, setCustomReasonNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 1-Click Approve Action
  const handleApprove = async (part: Part) => {
    try {
      if (part.isUserListing && part.listingId) {
        await updateDoc(doc(db, "parts", part.listingId), {
          status: "active",
          moderationStatus: "approved",
          moderatedAt: new Date().toISOString()
        });
        showToast(`Approved "${part.title}" for public marketplace!`, "success");
      } else {
        showToast("Factory catalog parts are permanently approved.", "info");
      }
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast("Failed to approve part.", "error");
    }
  };

  // 1-Click Auto World Certified Tuner Badge
  const handleAwardCertification = async (part: Part) => {
    try {
      if (part.isUserListing && part.listingId) {
        const nextState = !part.verifiedTuner;
        await updateDoc(doc(db, "parts", part.listingId), {
          verifiedTuner: nextState,
          autoWorldCertified: nextState,
          verified: nextState
        });
        showToast(nextState ? `Awarded Auto World Certified Tuner to "${part.title}"!` : "Revoked certification badge", "success");
      } else {
        showToast("Awarded certification badge to factory catalog item!", "success");
      }
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast("Failed to award certification", "error");
    }
  };

  // Reject with Reason Submission
  const handleConfirmRejection = async () => {
    if (!rejectingPart) return;
    setIsProcessing(true);
    const reasonText = customReasonNote.trim() 
      ? `${selectedReason}: ${customReasonNote.trim()}` 
      : selectedReason;

    try {
      if (rejectingPart.isUserListing && rejectingPart.listingId) {
        await updateDoc(doc(db, "parts", rejectingPart.listingId), {
          status: "hidden",
          moderationStatus: "rejected",
          rejectionReason: reasonText,
          moderatedAt: new Date().toISOString()
        });
        showToast(`Rejected submission with notice: "${reasonText}"`, "info");
      }
      setRejectingPart(null);
      setCustomReasonNote("");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      showToast("Failed to reject submission", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const userSubmissions = parts.filter(p => p.isUserListing);

  const filteredSubmissions = userSubmissions.filter(p => {
    const modStatus = p.moderationStatus || (p.status === "pending" ? "pending" : p.status === "hidden" ? "rejected" : "approved");

    if (filterTab === "pending" && modStatus !== "pending") return false;
    if (filterTab === "approved" && modStatus !== "approved") return false;
    if (filterTab === "rejected" && modStatus !== "rejected") return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || 
        p.sellerName.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = userSubmissions.filter(p => (p.moderationStatus || (p.status === "pending" ? "pending" : "approved")) === "pending").length;
  const approvedCount = userSubmissions.filter(p => (p.moderationStatus || (p.status === "active" ? "approved" : "pending")) === "approved").length;
  const rejectedCount = userSubmissions.filter(p => p.moderationStatus === "rejected" || p.status === "hidden").length;

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-lg border-2 border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-stone-950 rounded">
              Moderation Desk
            </span>
            <h2 className="text-lg font-serif font-black tracking-tight text-white uppercase">
              Community Submission Approval Queue
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Triage tuner and seller submissions, award Auto World Certified badges, and maintain motorsport-grade catalog integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-stone-300 bg-stone-950 px-3 py-2 rounded border border-stone-800 shrink-0">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Pending Backlog: <strong className="text-amber-400">{pendingCount} Submissions</strong></span>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterTab("pending")}
          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
            filterTab === "pending"
              ? "bg-amber-100 border-amber-400 text-amber-950 shadow-sm"
              : "bg-white hover:bg-stone-50 border-stone-300 text-stone-700"
          }`}
        >
          <span className="text-[10px] font-mono font-bold uppercase block">Review Pending</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-amber-900">{pendingCount}</strong>
            <span className="text-[10px] font-mono text-amber-700">Needs Action</span>
          </div>
        </button>

        <button
          onClick={() => setFilterTab("approved")}
          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
            filterTab === "approved"
              ? "bg-emerald-100 border-emerald-400 text-emerald-950 shadow-sm"
              : "bg-white hover:bg-stone-50 border-stone-300 text-stone-700"
          }`}
        >
          <span className="text-[10px] font-mono font-bold uppercase block">Approved Live</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-emerald-900">{approvedCount}</strong>
            <span className="text-[10px] font-mono text-emerald-700">Marketplace</span>
          </div>
        </button>

        <button
          onClick={() => setFilterTab("rejected")}
          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
            filterTab === "rejected"
              ? "bg-red-100 border-red-400 text-red-950 shadow-sm"
              : "bg-white hover:bg-stone-50 border-stone-300 text-stone-700"
          }`}
        >
          <span className="text-[10px] font-mono font-bold uppercase block">Rejected / Corrections</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className="text-xl font-bold font-mono text-red-900">{rejectedCount}</strong>
            <span className="text-[10px] font-mono text-red-700">On Hold</span>
          </div>
        </button>

        <button
          onClick={() => setFilterTab("all")}
          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
            filterTab === "all"
              ? "bg-stone-900 border-stone-950 text-white shadow-sm"
              : "bg-white hover:bg-stone-50 border-stone-300 text-stone-700"
          }`}
        >
          <span className="text-[10px] font-mono font-bold uppercase block">Total Community Submissions</span>
          <div className="flex items-baseline gap-2 mt-1">
            <strong className={`text-xl font-bold font-mono ${filterTab === "all" ? "text-amber-400" : "text-stone-900"}`}>{userSubmissions.length}</strong>
            <span className="text-[10px] font-mono opacity-80">Catalog Total</span>
          </div>
        </button>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filteredSubmissions.map(submission => {
          const isPending = (submission.moderationStatus || (submission.status === "pending" ? "pending" : "approved")) === "pending";
          const isRejected = submission.moderationStatus === "rejected" || submission.status === "hidden";
          const isCertified = submission.verifiedTuner || submission.autoWorldCertified;

          return (
            <div key={submission.id} className="bg-white rounded-lg border border-stone-300 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={submission.image || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800"}
                    alt={submission.title}
                    className="w-14 h-14 rounded object-cover border border-stone-300 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded uppercase">
                        {submission.brand}
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                          ⏳ Verification Pending
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-mono font-bold text-red-800 bg-red-100 px-1.5 py-0.2 rounded border border-red-300">
                          ✕ Rejected / Hold
                        </span>
                      )}
                      {isCertified && (
                        <span className="text-[10px] font-mono font-bold text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-300 flex items-center gap-1">
                          <Award className="w-3 h-3 text-purple-600" />
                          Certified Tuner Spec
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-serif font-bold text-stone-950 mt-0.5">
                      {submission.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500 mt-1">
                      <span>Seller: <strong>{submission.sellerName}</strong> ({submission.sellerPhone})</span>
                      <span>Valuation: <strong className="text-stone-900">₹{submission.price.toLocaleString("en-IN")}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Moderation 1-Click Action Hub */}
                <div className="flex items-center gap-2 flex-wrap font-mono text-xs w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
                  <button
                    onClick={() => onOpenPartDossier(submission, "control")}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Inspect
                  </button>

                  <button
                    onClick={() => handleAwardCertification(submission)}
                    className={`px-2.5 py-1.5 rounded font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1 transition ${
                      isCertified
                        ? "bg-purple-700 text-white border border-purple-800"
                        : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300"
                    }`}
                    title="Toggle Auto World Certified Tuner Status"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    {isCertified ? "Certified" : "Certify"}
                  </button>

                  {isPending && (
                    <button
                      onClick={() => handleApprove(submission)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      1-Click Approve
                    </button>
                  )}

                  {!isRejected && (
                    <button
                      onClick={() => setRejectingPart(submission)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded font-bold uppercase text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject with Reason
                    </button>
                  )}
                </div>
              </div>

              {/* Description & Technical Fitment Excerpt */}
              <div className="bg-[#FAF8F5] p-2.5 rounded text-xs text-stone-700 font-sans border border-stone-200">
                <p className="line-clamp-2">{submission.description}</p>
                {submission.rejectionReason && (
                  <div className="mt-2 text-[11px] font-mono text-red-800 bg-red-50 p-2 rounded border border-red-200">
                    <strong>Moderation Hold Notice:</strong> {submission.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredSubmissions.length === 0 && (
          <div className="p-8 text-center bg-white rounded-lg border border-stone-300">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-800">No community submissions in this filter queue.</p>
            <p className="text-xs text-stone-500 mt-1">All tuner submissions are processed and live!</p>
          </div>
        )}
      </div>

      {/* Reject with Reason Modal */}
      {rejectingPart && (
        <div className="fixed inset-0 z-[10000] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-stone-950 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-red-600 block">Moderation Protocol</span>
                <h3 className="text-base font-serif font-black uppercase text-stone-950">Reject Community Submission</h3>
              </div>
              <button 
                onClick={() => setRejectingPart(null)}
                className="text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Select the motorsport compliance reason for rejecting <strong>"{rejectingPart.title}"</strong>:
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Standard Reason Template</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs outline-none font-sans"
              >
                {COMMON_REJECTION_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase text-stone-700 block">Tuner Guidance / Specific Note (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g. Please re-upload with high-res photo of the turbo compressor wheel serial stamp."
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded text-xs outline-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 font-mono text-xs">
              <button
                type="button"
                onClick={() => setRejectingPart(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRejection}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isProcessing ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
