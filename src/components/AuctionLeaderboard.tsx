import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, Award, Crown, Zap, TrendingUp, ShieldCheck,
  User, CheckCircle2, ArrowUpRight, Clock, ChevronRight,
  Flame, Sparkles, AlertCircle, Lock, ArrowUp
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { Auction, AuctionBid } from "../types";

interface AuctionLeaderboardProps {
  auction: Auction;
  currentUser: FirebaseUser | null;
  onPlaceBid?: (amount: number) => void;
  onSignInClick?: () => void;
  isSubmittingBid?: boolean;
}

export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface RankedCollector {
  rank: number;
  bidderUid: string;
  bidderName: string;
  bidderPhoto?: string;
  highestBid: number;
  latestTimestamp: string;
  totalBidsCount: number;
  isCurrentUser: boolean;
  deltaFromLeader: number;
}

export const AuctionLeaderboard: React.FC<AuctionLeaderboardProps> = ({
  auction,
  currentUser,
  onPlaceBid,
  onSignInClick,
  isSubmittingBid = false,
}) => {
  const [viewMode, setViewMode] = useState<"unique" | "all">("unique");

  const minNextBid = (auction.currentBid || auction.startingBid || 0) + (auction.minIncrement || 50000);

  // 1. Compute Unique Ranked Collectors (by their best/highest bid)
  const uniqueRankedCollectors: RankedCollector[] = useMemo(() => {
    if (!auction.bids || auction.bids.length === 0) return [];

    const bidderMap = new Map<string, {
      bidderUid: string;
      bidderName: string;
      bidderPhoto?: string;
      highestBid: number;
      latestTimestamp: string;
      totalBidsCount: number;
    }>();

    auction.bids.forEach((bid) => {
      const key = bid.bidderUid || bid.bidderName;
      const existing = bidderMap.get(key);
      if (!existing) {
        bidderMap.set(key, {
          bidderUid: bid.bidderUid,
          bidderName: bid.bidderName,
          bidderPhoto: bid.bidderPhoto,
          highestBid: bid.amount,
          latestTimestamp: bid.timestamp,
          totalBidsCount: 1,
        });
      } else {
        if (bid.amount > existing.highestBid) {
          existing.highestBid = bid.amount;
          existing.latestTimestamp = bid.timestamp;
        }
        existing.totalBidsCount += 1;
      }
    });

    const sorted = Array.from(bidderMap.values()).sort((a, b) => b.highestBid - a.highestBid);
    const leaderBid = sorted[0]?.highestBid || auction.currentBid;

    return sorted.map((collector, index) => {
      const isCurrentUser = Boolean(
        currentUser && (
          collector.bidderUid === currentUser.uid ||
          (currentUser.email && collector.bidderName.toLowerCase() === currentUser.email.split("@")[0].toLowerCase()) ||
          (currentUser.displayName && collector.bidderName.toLowerCase() === currentUser.displayName.toLowerCase())
        )
      );

      return {
        rank: index + 1,
        ...collector,
        isCurrentUser,
        deltaFromLeader: leaderBid - collector.highestBid,
      };
    });
  }, [auction.bids, auction.currentBid, currentUser]);

  // 2. All Bids Raw Stream
  const allBidsSorted = useMemo(() => {
    if (!auction.bids || auction.bids.length === 0) return [];
    const leaderBid = auction.currentBid;
    return [...auction.bids]
      .sort((a, b) => b.amount - a.amount)
      .map((bid, index) => {
        const isCurrentUser = Boolean(
          currentUser && (
            bid.bidderUid === currentUser.uid ||
            (currentUser.email && bid.bidderName.toLowerCase() === currentUser.email.split("@")[0].toLowerCase()) ||
            (currentUser.displayName && bid.bidderName.toLowerCase() === currentUser.displayName.toLowerCase())
          )
        );
        return {
          rank: index + 1,
          bid,
          isCurrentUser,
          deltaFromLeader: leaderBid - bid.amount,
        };
      });
  }, [auction.bids, auction.currentBid, currentUser]);

  // 3. User's Current Relative Position
  const userRankEntry = useMemo(() => {
    return uniqueRankedCollectors.find((c) => c.isCurrentUser) || null;
  }, [uniqueRankedCollectors]);

  const userRank = userRankEntry ? userRankEntry.rank : null;
  const userHighestBid = userRankEntry ? userRankEntry.highestBid : null;
  const isUserLeading = userRank === 1;

  const leaderCollector = uniqueRankedCollectors[0] || null;
  const runnerUpCollector = uniqueRankedCollectors[1] || null;

  // Amount needed for the user to take 1st place
  const neededToTakeLead = useMemo(() => {
    const leaderAmount = leaderCollector ? leaderCollector.highestBid : auction.currentBid;
    return leaderAmount + (auction.minIncrement || 50000);
  }, [leaderCollector, auction.currentBid, auction.minIncrement]);

  const handleQuickOutbid = () => {
    if (!currentUser) {
      if (onSignInClick) onSignInClick();
      return;
    }
    if (onPlaceBid) {
      onPlaceBid(neededToTakeLead);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden font-sans">
      {/* 1. Header with Live Pulse */}
      <div className="bg-stone-950 text-white p-4 sm:p-5 border-b border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 rounded-xl font-black shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Live Floor Leaderboard
                </span>
              </div>
              <h3 className="font-serif font-black text-lg sm:text-xl text-white">
                Collector Standings
              </h3>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-stone-900 p-0.5 rounded-lg border border-stone-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode("unique")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === "unique"
                  ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Unique ({uniqueRankedCollectors.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === "all"
                  ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              All Bids ({auction.bids?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Spotlight: Current Highest Bid Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-white border-b border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block">
              Current Highest Bid (1st Place)
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 mt-0.5">
              ₹{auction.currentBid.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-stone-300">
              {leaderCollector ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  Held by: <strong className="text-amber-300">{leaderCollector.bidderName}</strong>
                  {leaderCollector.isCurrentUser && (
                    <span className="px-1.5 py-0.2 bg-emerald-500 text-stone-950 font-black text-[10px] rounded uppercase">
                      YOU
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-stone-400">Opening floor price</span>
              )}
              <span className="text-stone-600">•</span>
              <span className="text-stone-400 font-mono">{auction.bidCount || 0} Total Bids</span>
            </div>
          </div>

          {/* Reserve Clearance Indicator */}
          <div className="sm:text-right shrink-0">
            {auction.isReserveMet ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reserve Met
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" /> Reserve: ₹{((auction.reservePrice || 0) / 100000).toFixed(1)}L
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC USER POSITION CARD (The Core User Relative Rank Experience) */}
      <div className="p-4 sm:p-5 border-b border-stone-200">
        {!currentUser ? (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">Track Your Real-Time Rank</p>
                <p className="text-[11px] text-stone-500 font-sans">
                  Sign in to view your live position, leaderboard rank, and compete for this lot.
                </p>
              </div>
            </div>
            {onSignInClick && (
              <button
                type="button"
                onClick={onSignInClick}
                className="py-2 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shrink-0 cursor-pointer"
              >
                Sign In to Bid
              </button>
            )}
          </div>
        ) : userRankEntry ? (
          /* User is active on the leaderboard */
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-4 rounded-xl border-2 transition-all ${
              isUserLeading
                ? "bg-gradient-to-br from-amber-50 via-amber-100/50 to-emerald-50 border-amber-500 shadow-sm"
                : userRank === 2
                ? "bg-gradient-to-br from-stone-50 to-amber-50/50 border-amber-400 shadow-xs"
                : userRank === 3
                ? "bg-gradient-to-br from-stone-50 to-orange-50/40 border-amber-600/60 shadow-xs"
                : "bg-stone-50 border-stone-300"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                {/* Visual Rank Badge */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black font-mono text-base shrink-0 shadow-sm ${
                    isUserLeading
                      ? "bg-amber-500 text-stone-950 border-2 border-amber-300 ring-2 ring-amber-400/40"
                      : userRank === 2
                      ? "bg-stone-300 text-stone-900 border-2 border-stone-200"
                      : userRank === 3
                      ? "bg-amber-700 text-white border-2 border-amber-600"
                      : "bg-stone-900 text-amber-400"
                  }`}
                >
                  {isUserLeading ? "1st" : getOrdinalSuffix(userRank || 0)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-900 font-mono">
                      {isUserLeading
                        ? "👑 You are in 1st Place (Leader!)"
                        : `You are ${getOrdinalSuffix(userRank || 0)} on the Floor`}
                    </span>
                    <span className="px-2 py-0.5 bg-stone-900 text-amber-300 text-[10px] font-bold rounded-full font-mono">
                      {uniqueRankedCollectors.length} Active Bidders
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-1">
                    {isUserLeading ? (
                      runnerUpCollector ? (
                        <span>
                          Holding top bid at <strong className="text-stone-900 font-mono">₹{userHighestBid?.toLocaleString("en-IN")}</strong>. You lead 2nd place by{" "}
                          <strong className="text-emerald-700 font-mono">+₹{(userHighestBid! - runnerUpCollector.highestBid).toLocaleString("en-IN")}</strong>.
                        </span>
                      ) : (
                        <span>
                          Holding top bid at <strong className="text-stone-900 font-mono">₹{userHighestBid?.toLocaleString("en-IN")}</strong>. You are currently positioned to win!
                        </span>
                      )
                    ) : (
                      <span>
                        Your top bid is <strong className="text-stone-900 font-mono">₹{userHighestBid?.toLocaleString("en-IN")}</strong>. You are{" "}
                        <strong className="text-red-700 font-mono">-₹{(userRankEntry.deltaFromLeader).toLocaleString("en-IN")}</strong> behind 1st place.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Action for Outbidding if not 1st */}
              {!isUserLeading && onPlaceBid && (
                <button
                  type="button"
                  disabled={isSubmittingBid || auction.status !== "live" || auction.isPaused}
                  onClick={handleQuickOutbid}
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <ArrowUp className="w-4 h-4" />
                  Take 1st Place (₹{neededToTakeLead.toLocaleString("en-IN")})
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* User has NOT bid yet */
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">You haven't placed a bid on this lot yet</p>
                <p className="text-[11px] text-stone-600 font-sans">
                  Enter the live floor with a bid of at least <strong className="font-mono text-stone-900">₹{minNextBid.toLocaleString("en-IN")}</strong> to claim a spot on the leaderboard.
                </p>
              </div>
            </div>

            {onPlaceBid && (
              <button
                type="button"
                disabled={isSubmittingBid || auction.status !== "live" || auction.isPaused}
                onClick={() => onPlaceBid(minNextBid)}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Zap className="w-4 h-4" />
                Place Opening Bid (₹{minNextBid.toLocaleString("en-IN")})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Ranked Collector Stream Table / Podium */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
          <span>Rank & Collector</span>
          <span>Highest Bid / Distance</span>
        </div>

        {viewMode === "unique" ? (
          /* Unique Collectors Leaderboard View */
          uniqueRankedCollectors.length > 0 ? (
            <div className="space-y-2.5">
              {uniqueRankedCollectors.map((collector) => (
                <div
                  key={collector.bidderUid || collector.bidderName}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    collector.isCurrentUser
                      ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/40 shadow-sm"
                      : collector.rank === 1
                      ? "bg-stone-50 border-amber-300"
                      : "bg-white border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs font-mono shrink-0 ${
                        collector.rank === 1
                          ? "bg-amber-500 text-stone-950 shadow-xs"
                          : collector.rank === 2
                          ? "bg-stone-300 text-stone-800"
                          : collector.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}
                    >
                      {collector.rank === 1 ? <Crown className="w-4 h-4" /> : collector.rank}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {collector.bidderName}
                        </span>

                        {collector.isCurrentUser && (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black text-[9px] rounded uppercase tracking-wider">
                            YOU
                          </span>
                        )}

                        {collector.rank === 1 && (
                          <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 font-black text-[9px] rounded uppercase tracking-wider">
                            LEADER
                          </span>
                        )}

                        {collector.totalBidsCount > 1 && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({collector.totalBidsCount} bids)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {collector.latestTimestamp || "Floor Time"}
                      </p>
                    </div>
                  </div>

                  {/* Financial Amount & Delta */}
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-sm sm:text-base font-black text-stone-950 block">
                      ₹{collector.highestBid.toLocaleString("en-IN")}
                    </span>
                    {collector.rank > 1 && (
                      <span className="text-[10px] text-red-600 font-medium block">
                        -₹{collector.deltaFromLeader.toLocaleString("en-IN")}
                      </span>
                    )}
                    {collector.rank === 1 && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        Top Bid
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-stone-400 text-xs font-mono">
              No bids recorded yet. Be the first to place a bid!
            </div>
          )
        ) : (
          /* All Bid Events Feed View */
          allBidsSorted.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {allBidsSorted.map(({ rank, bid, isCurrentUser, deltaFromLeader }) => (
                <div
                  key={bid.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                    isCurrentUser
                      ? "bg-amber-50 border-amber-300"
                      : rank === 1
                      ? "bg-stone-50 border-stone-300 font-bold"
                      : "bg-white border-stone-200 text-stone-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{rank}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 truncate">{bid.bidderName}</span>
                        {isCurrentUser && (
                          <span className="px-1 py-0.2 bg-emerald-600 text-white text-[8px] font-bold rounded uppercase">
                            YOU
                          </span>
                        )}
                        {rank === 1 && (
                          <span className="px-1 py-0.2 bg-amber-500 text-stone-950 text-[8px] font-bold rounded uppercase">
                            High
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">{bid.timestamp}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-stone-900 block">
                      ₹{bid.amount.toLocaleString("en-IN")}
                    </span>
                    {rank > 1 && (
                      <span className="text-[9px] text-stone-400 block">
                        -₹{deltaFromLeader.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-stone-400 text-xs font-mono">
              No bids recorded yet.
            </div>
          )
        )}
      </div>

      {/* 5. Escrow and Real-time Sync Assurance */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 text-stone-500 text-[11px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>AutoWorld Sovereign Real-Time Floor Sync</span>
        </div>
        <span className="text-stone-400 font-mono text-[10px]">
          Live updates via Firestore
        </span>
      </div>
    </div>
  );
};
