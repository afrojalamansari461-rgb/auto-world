import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Trophy, Award, ShieldCheck, CheckCircle2, DollarSign,
  TrendingUp, Calendar, Clock, User, FileText, Share2,
  Copy, Check, ArrowRight, Car, Sparkles, ExternalLink,
  ChevronRight, Lock, Hash, ShieldAlert, Zap, AlertCircle
} from "lucide-react";
import { Auction, AuctionBid, Vehicle } from "../types";

interface PostAuctionResultProps {
  auction: Auction;
  currentUserId?: string;
  currentUserEmail?: string;
  nextQueuedAuction?: Auction | null;
  intermissionGapMinutes?: number;
  onSelectNextAuction?: (auction: Auction) => void;
  onViewVehicleDossier?: (vehicleId?: string | number) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  isCompact?: boolean;
}

export const PostAuctionResult: React.FC<PostAuctionResultProps> = ({
  auction,
  currentUserId,
  currentUserEmail,
  nextQueuedAuction,
  intermissionGapMinutes = 15,
  onSelectNextAuction,
  onViewVehicleDossier,
  showToast,
  isCompact = false
}) => {
  const [copiedCert, setCopiedCert] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Derive Winner & Podium Stats
  const bidsSorted = [...(auction.bids || [])].sort((a, b) => b.amount - a.amount);
  const topBid = bidsSorted[0];
  const runnerUpBid = bidsSorted[1];
  const thirdPlaceBid = bidsSorted[2];

  const winningAmount = auction.winningBid || (topBid ? topBid.amount : auction.currentBid);
  const winnerName = auction.winnerName || (topBid ? topBid.bidderName : "Certified Floor Bidder");
  const winnerUid = auction.winnerUid || (topBid ? topBid.bidderUid : null);

  const hasBids = (auction.bids && auction.bids.length > 0) || (auction.bidCount > 0);
  const isReserveSatisfied = auction.isReserveMet || (winningAmount >= (auction.reservePrice || 0));

  const startingBid = auction.startingBid || 1000000;
  const growthAmount = winningAmount - startingBid;
  const growthPercent = startingBid > 0 ? ((growthAmount / startingBid) * 100).toFixed(1) : "0.0";

  // Provenance & Certificate ID
  const certId = `AW-PROV-${auction.id.toUpperCase()}-${Math.abs(
    (winningAmount * 13 + (auction.year || 2023)) % 99999
  ).toString().padStart(5, "0")}`;

  const isCurrentUserWinner = Boolean(
    (currentUserId && winnerUid && currentUserId === winnerUid) ||
    (currentUserEmail && winnerUid && currentUserEmail.toLowerCase() === winnerUid.toLowerCase())
  );

  const isCurrentUserSeller = Boolean(
    (currentUserId && auction.sellerUid && currentUserId === auction.sellerUid) ||
    (currentUserEmail && auction.sellerEmail && currentUserEmail.toLowerCase() === auction.sellerEmail.toLowerCase())
  );

  const handleCopyCertificate = () => {
    navigator.clipboard.writeText(certId);
    setCopiedCert(true);
    if (showToast) showToast(`Provenance Certificate ID ${certId} copied!`, "success");
    setTimeout(() => setCopiedCert(false), 3000);
  };

  const handleShareResult = () => {
    const shareText = `🏆 AUCTION CONCLUDED: ${auction.title} officially sold for ₹${winningAmount.toLocaleString("en-IN")} on Auto World Vault! Certified Winner: ${winnerName}. Provenance: ${certId}`;
    if (navigator.share) {
      navigator.share({
        title: `Auction Result: ${auction.title}`,
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      if (showToast) showToast("Auction summary report copied to clipboard!", "success");
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-stone-900 shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] font-mono overflow-hidden">
      {/* Official Top Clearance Header */}
      <div className="bg-stone-950 text-white p-4 sm:p-5 border-b-2 border-stone-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-stone-950 font-black shrink-0 shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  OFFICIAL POST-AUCTION RESULT
                </span>
                <span className="text-stone-400 text-xs">
                  Lot #{auction.id} • Concluded & Settled
                </span>
              </div>
              <h2 className="font-serif font-black text-lg sm:text-2xl text-stone-100 mt-1 leading-tight">
                {auction.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleShareResult}
              className="py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              {shareSuccess ? "Copied Report" : "Share Dossier"}
            </button>
            <button
              type="button"
              onClick={handleCopyCertificate}
              className="py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
            >
              {copiedCert ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              {copiedCert ? "Copied Cert" : "Cert ID"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Winner Clearance Banner */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* Personal Winner Highlight Notification if Current User Won */}
        {isCurrentUserWinner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-950 text-emerald-100 border-2 border-emerald-500 shadow-md font-mono"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-black text-emerald-300 text-xs uppercase tracking-widest block">
                  🎉 CONGRATULATIONS • YOU ARE THE WINNING COLLECTOR
                </span>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-sans">
                  You held the highest certified bid when the auction period expired. Our Auto World Private Client concierge will contact you within 2 business hours to execute RTO state NOC transfers and secure white-glove transport.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Consignor Notification if Current User is the Seller */}
        {isCurrentUserSeller && (
          <div className="p-4 bg-amber-950/80 text-amber-100 border-2 border-amber-500 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider">
                Consignor Clearance: Your vehicle was successfully hammered down for ₹{winningAmount.toLocaleString("en-IN")}.
              </span>
            </div>
          </div>
        )}

        {/* Core Result Cards Grid: (1) Winner Identity & (2) Final Hammer Economics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Winner Identity Card */}
          <div className="bg-white p-5 border-2 border-stone-900 relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider">
                Official Winning Collector
              </span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-950 font-bold text-[10px] uppercase border border-purple-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-700" /> Identity Cleared
              </span>
            </div>

            <div className="my-4 flex items-center gap-4">
              <div className="w-14 h-14 bg-stone-900 text-amber-400 font-black text-xl flex items-center justify-center border-2 border-stone-900 shrink-0 shadow-xs">
                {winnerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-stone-500 font-sans">Certified Vault Bidder</p>
                <h3 className="font-serif font-black text-xl sm:text-2xl text-stone-900 leading-tight">
                  {winnerName}
                </h3>
                <p className="text-[11px] text-stone-600 font-mono mt-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-stone-400" />
                  <span>Bidder ID: {winnerUid ? winnerUid.slice(0, 12) + "..." : "VAULT-CERT-VIP"}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Provenance Token:</span>
                <span className="font-bold text-stone-900">{certId}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Escrow Status:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AutoWorld Escrow Guaranteed
                </span>
              </div>
            </div>
          </div>

          {/* Winning Bid & Financial Summary Card */}
          <div className="bg-white p-5 border-2 border-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider">
                Final Winning Bid Summary
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 font-bold text-[10px] uppercase border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Hammer Down
              </span>
            </div>

            <div className="my-3">
              <p className="text-xs text-stone-500">Official Hammer Price</p>
              <div className="text-3xl sm:text-4xl font-black font-mono text-stone-950 tracking-tight">
                ₹{winningAmount.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                (Approx. ₹{(winningAmount / 100000).toFixed(2)} Lakhs / ₹{(winningAmount / 10000000).toFixed(3)} Crores)
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block">Starting Bid</span>
                <span className="font-bold text-stone-900">₹{(startingBid / 100000).toFixed(2)}L</span>
              </div>
              <div className="p-2 bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block">Total Bids</span>
                <span className="font-bold text-stone-900">{auction.bidCount || auction.bids?.length || 1} Bids</span>
              </div>
              <div className="p-2 bg-stone-50 border border-stone-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-stone-500 uppercase block">Appreciation</span>
                <span className="font-bold text-emerald-700">+{growthPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reserve Price Clearance Indicator */}
        <div className={`p-3.5 border-2 text-xs flex items-center justify-between gap-3 ${
          isReserveSatisfied 
            ? "bg-emerald-50 border-emerald-700 text-emerald-950" 
            : "bg-amber-50 border-amber-700 text-amber-950"
        }`}>
          <div className="flex items-center gap-2">
            {isReserveSatisfied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span>
              <strong>Reserve Status:</strong> {isReserveSatisfied 
                ? `Reserve Price (₹${((auction.reservePrice || 0) / 100000).toFixed(2)} Lakhs) was fully satisfied and exceeded.` 
                : `Sold at Floor Discretion (Reserve was ₹${((auction.reservePrice || 0) / 100000).toFixed(2)} Lakhs).`}
            </span>
          </div>
          <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white border border-current shrink-0">
            {isReserveSatisfied ? "RESERVE MET" : "RESERVE NOT MET"}
          </span>
        </div>

        {/* Podium / Final Bid Progression Stream */}
        {bidsSorted.length > 0 && (
          <div className="bg-white p-5 border-2 border-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <span className="text-xs font-black uppercase text-stone-800 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" /> Final Bidding Podium & Competing Collector Stream
              </span>
              <span className="text-[11px] text-stone-500 font-mono">
                {bidsSorted.length} Certified Bids Recorded
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {bidsSorted.slice(0, 5).map((bid, idx) => (
                <div
                  key={bid.id || idx}
                  className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    idx === 0 
                      ? "bg-amber-50/80 border-amber-500 font-bold" 
                      : idx === 1 
                      ? "bg-stone-50 border-stone-300" 
                      : "bg-white border-stone-200 text-stone-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0 
                        ? "bg-amber-500 text-stone-950" 
                        : idx === 1 
                        ? "bg-stone-300 text-stone-900" 
                        : "bg-stone-100 text-stone-600 border border-stone-300"
                    }`}>
                      {idx === 0 ? "1" : idx === 1 ? "2" : String(idx + 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-900 font-bold">{bid.bidderName}</span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider">
                            WINNER
                          </span>
                        )}
                        {idx === 1 && (
                          <span className="px-1.5 py-0.2 bg-stone-600 text-white text-[9px] font-bold uppercase tracking-wider">
                            RUNNER-UP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">{bid.timestamp || "Official Floor Timestamp"}</span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <span className="text-sm font-black text-stone-950">
                      ₹{bid.amount.toLocaleString("en-IN")}
                    </span>
                    {idx > 0 && topBid && (
                      <span className="block text-[10px] text-stone-400">
                        -₹{(topBid.amount - bid.amount).toLocaleString("en-IN")} from winner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Scheduled FIFO Lot Banner if Available */}
        {nextQueuedAuction && onSelectNextAuction && (
          <div className="p-4 bg-stone-900 text-stone-100 border-2 border-stone-900 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-stone-800 border border-stone-700 overflow-hidden shrink-0">
                  <img src={nextQueuedAuction.image} alt={nextQueuedAuction.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-stone-950 font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider">
                      NEXT FIFO LOT IN LINEUP
                    </span>
                    <span className="text-stone-400 text-[10px]">
                      {intermissionGapMinutes}m Intermission Cooldown
                    </span>
                  </div>
                  <p className="text-stone-100 font-bold text-xs sm:text-sm truncate mt-0.5">
                    {nextQueuedAuction.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectNextAuction(nextQueuedAuction)}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 transition"
              >
                Inspect Next Lot <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Sovereign Escrow Guarantee Footer Note */}
        <div className="p-3 bg-stone-100 border border-stone-300 text-stone-600 text-[11px] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Official Auto World Guarantee:</strong> Post-auction results are recorded immutably. Funds are held in Auto World Sovereign Escrow until the buyer physically verifies the 200-point inspection dossier and all regional RTO registration paperwork is cleared.
          </span>
        </div>
      </div>
    </div>
  );
};
