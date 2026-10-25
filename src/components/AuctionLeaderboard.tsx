import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Trophy,
  Crown,
  Zap,
  ShieldCheck,
  User,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  ArrowUp,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { Auction } from "../types";
import {
  AnimatedPriceFlash,
  MagneticButton,
  staggerContainerVariants,
  staggerItemVariants,
} from "./AnimationWrapper";

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

  const minNextBid =
    (auction.currentBid || auction.startingBid || 0) +
    (auction.minIncrement || 50000);

  // 1. Compute Unique Ranked Collectors
  const uniqueRankedCollectors: RankedCollector[] = useMemo(() => {
    if (!auction.bids || auction.bids.length === 0) return [];

    const bidderMap = new Map<
      string,
      {
        bidderUid: string;
        bidderName: string;
        bidderPhoto?: string;
        highestBid: number;
        latestTimestamp: string;
        totalBidsCount: number;
      }
    >();

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

    const sorted = Array.from(bidderMap.values()).sort(
      (a, b) => b.highestBid - a.highestBid
    );
    const leaderBid = sorted[0]?.highestBid || auction.currentBid;

    return sorted.map((collector, index) => {
      const isCurrentUser = Boolean(
        currentUser &&
          (collector.bidderUid === currentUser.uid ||
            (currentUser.email &&
              collector.bidderName.toLowerCase() ===
                currentUser.email.split("@")[0].toLowerCase()) ||
            (currentUser.displayName &&
              collector.bidderName.toLowerCase() ===
                currentUser.displayName.toLowerCase()))
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
          currentUser &&
            (bid.bidderUid === currentUser.uid ||
              (currentUser.email &&
                bid.bidderName.toLowerCase() ===
                  currentUser.email.split("@")[0].toLowerCase()) ||
              (currentUser.displayName &&
                bid.bidderName.toLowerCase() ===
                  currentUser.displayName.toLowerCase()))
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

  const neededToTakeLead = useMemo(() => {
    const leaderAmount = leaderCollector
      ? leaderCollector.highestBid
      : auction.currentBid;
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
    <div className="bg-white border-2 border-[#0F0F10] overflow-hidden font-sans">
      {/* 1. Financial Trading Desk Header */}
      <div className="bg-[#0F0F10] text-white p-4 sm:p-5 border-b border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#D5001C] text-white flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 font-mono">
                  REAL-TIME ORDER BOOK
                </span>
              </div>
              <h3 className="font-serif font-extrabold text-base sm:text-lg uppercase tracking-tight text-white">
                Institutional Floor Standings
              </h3>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-stone-900 border border-stone-800 text-[10px] font-mono uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode("unique")}
              className={`px-3 py-1.5 transition cursor-pointer tabular-nums ${
                viewMode === "unique"
                  ? "bg-white text-[#0F0F10] font-bold"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Principals ({uniqueRankedCollectors.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 transition cursor-pointer tabular-nums ${
                viewMode === "all"
                  ? "bg-white text-[#0F0F10] font-bold"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Tape ({auction.bids?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Ticker Spotlight: Current Highest Bid */}
      <div className="p-4 sm:p-5 bg-[#161618] text-white border-b border-stone-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 block">
              CURRENT CLEARING BID (1ST POSITION)
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1 tabular-nums">
              <AnimatedPriceFlash value={auction.currentBid} />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-stone-300 font-mono tabular-nums">
              {leaderCollector ? (
                <span className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#D5001C] shrink-0" />
                  HOLDER:{" "}
                  <strong className="text-white uppercase">
                    {leaderCollector.bidderName}
                  </strong>
                  {leaderCollector.isCurrentUser && (
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-[#0F0F10] font-black text-[9px] uppercase">
                      YOU
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-stone-400">OPENING FLOOR PRICE</span>
              )}
              <span className="text-stone-600">•</span>
              <span className="text-stone-400">
                {auction.bidCount || 0} EXECUTIONS
              </span>
            </div>
          </div>

          {/* Reserve Clearance Indicator */}
          <div className="sm:text-right shrink-0">
            {auction.isReserveMet ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" /> RESERVE MET
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-700 text-stone-300 text-[10px] font-mono font-bold uppercase tracking-widest tabular-nums">
                <Lock className="w-3.5 h-3.5 text-[#D5001C]" /> RESERVE: ₹
                {((auction.reservePrice || 0) / 100000).toFixed(1)}L
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC USER POSITION CARD */}
      <div className="p-4 sm:p-5 border-b border-[#0F0F10]/15 bg-[#F6F5F2]">
        {!currentUser ? (
          <div className="p-4 bg-white border border-[#0F0F10]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0F0F10] flex items-center justify-center text-white font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F10]">
                  Authenticate for Real-Time Position Tracking
                </p>
                <p className="text-[11px] text-stone-500 font-sans">
                  Sign in to view your live order-book standing and execute floor bids.
                </p>
              </div>
            </div>
            {onSignInClick && (
              <MagneticButton
                type="button"
                onClick={onSignInClick}
                className="py-2.5 px-4 bg-[#D5001C] hover:bg-[#b80018] text-white font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] transition shrink-0 cursor-pointer"
              >
                Authenticate
              </MagneticButton>
            )}
          </div>
        ) : userRankEntry ? (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-4 border-2 transition-all ${
              isUserLeading
                ? "bg-white border-emerald-600"
                : "bg-white border-[#0F0F10]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`w-12 h-12 flex items-center justify-center font-extrabold font-mono text-sm shrink-0 tabular-nums ${
                    isUserLeading
                      ? "bg-emerald-600 text-white"
                      : "bg-[#0F0F10] text-white"
                  }`}
                >
                  {isUserLeading ? "1ST" : getOrdinalSuffix(userRank || 0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F10] font-mono">
                      {isUserLeading
                        ? "POSITION: 1ST PLACE (FLOOR LEADER)"
                        : `POSITION: ${getOrdinalSuffix(userRank || 0).toUpperCase()} ON THE FLOOR`}
                    </span>
                    <span className="px-2 py-0.5 bg-[#0F0F10] text-white text-[9px] font-mono font-bold uppercase tabular-nums">
                      {uniqueRankedCollectors.length} ACTIVE PRINCIPALS
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mt-1 tabular-nums">
                    {isUserLeading ? (
                      runnerUpCollector ? (
                        <span>
                          Holding top bid at{" "}
                          <strong className="text-[#0F0F10] font-mono">
                            ₹{userHighestBid?.toLocaleString("en-IN")}
                          </strong>
                          . Spread over 2nd:{" "}
                          <strong className="text-emerald-700 font-mono">
                            +₹
                            {(
                              userHighestBid! - runnerUpCollector.highestBid
                            ).toLocaleString("en-IN")}
                          </strong>
                          .
                        </span>
                      ) : (
                        <span>
                          Holding top bid at{" "}
                          <strong className="text-[#0F0F10] font-mono">
                            ₹{userHighestBid?.toLocaleString("en-IN")}
                          </strong>
                          .
                        </span>
                      )
                    ) : (
                      <span>
                        Your bid:{" "}
                        <strong className="text-[#0F0F10] font-mono">
                          ₹{userHighestBid?.toLocaleString("en-IN")}
                        </strong>
                        . Spread to 1st:{" "}
                        <strong className="text-[#D5001C] font-mono">
                          -₹{userRankEntry.deltaFromLeader.toLocaleString("en-IN")}
                        </strong>
                        .
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!isUserLeading && onPlaceBid && (
                <MagneticButton
                  type="button"
                  disabled={
                    isSubmittingBid || auction.status !== "live" || auction.isPaused
                  }
                  onClick={handleQuickOutbid}
                  className="py-3 px-4 bg-[#D5001C] hover:bg-[#b80018] text-white font-sans font-extrabold text-[11px] uppercase tracking-[0.14em] transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 tabular-nums"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Place Bid (₹{neededToTakeLead.toLocaleString("en-IN")})
                </MagneticButton>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="p-4 bg-white border border-[#0F0F10]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0F0F10] text-white font-bold flex items-center justify-center text-sm shrink-0">
                <Flame className="w-4 h-4 text-[#D5001C]" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#0F0F10]">
                  No Active Position Recorded
                </p>
                <p className="text-[11px] text-stone-600 font-sans tabular-nums">
                  Enter the trading book with a minimum bid of{" "}
                  <strong className="font-mono text-[#0F0F10]">
                    ₹{minNextBid.toLocaleString("en-IN")}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {onPlaceBid && (
              <MagneticButton
                type="button"
                disabled={
                  isSubmittingBid || auction.status !== "live" || auction.isPaused
                }
                onClick={() => onPlaceBid(minNextBid)}
                className="py-3 px-4 bg-[#D5001C] hover:bg-[#b80018] text-white font-sans font-extrabold text-[11px] uppercase tracking-[0.14em] transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 tabular-nums"
              >
                <Zap className="w-3.5 h-3.5" />
                Place Bid (₹{minNextBid.toLocaleString("en-IN")})
              </MagneticButton>
            )}
          </div>
        )}
      </div>

      {/* 4. Staggered Order Book Stream (stiffness: 100, damping: 15) */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#0F0F10]/15 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-[0.18em]">
          <span>POS / PRINCIPAL</span>
          <span>AMOUNT (INR) / SPREAD</span>
        </div>

        {viewMode === "unique" ? (
          uniqueRankedCollectors.length > 0 ? (
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {uniqueRankedCollectors.map((collector) => (
                <motion.div
                  key={collector.bidderUid || collector.bidderName}
                  variants={staggerItemVariants}
                  className={`p-3.5 border flex items-center justify-between gap-3 transition-colors ${
                    collector.isCurrentUser
                      ? "bg-[#F6F5F2] border-[#0F0F10] border-2"
                      : collector.rank === 1
                      ? "bg-[#F6F5F2]/60 border-[#0F0F10]/30"
                      : "bg-white border-[#0F0F10]/15 hover:border-[#0F0F10]/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 flex items-center justify-center font-extrabold text-xs font-mono shrink-0 tabular-nums ${
                        collector.rank === 1
                          ? "bg-[#0F0F10] text-white"
                          : "bg-[#F6F5F2] text-[#0F0F10] border border-[#0F0F10]/20"
                      }`}
                    >
                      {collector.rank === 1 ? "01" : `0${collector.rank}`.slice(-2)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#0F0F10] truncate">
                          {collector.bidderName}
                        </span>

                        {collector.isCurrentUser && (
                          <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-mono font-bold text-[9px] uppercase tracking-wider">
                            YOU
                          </span>
                        )}

                        {collector.rank === 1 && (
                          <span className="px-1.5 py-0.5 bg-[#D5001C] text-white font-mono font-bold text-[9px] uppercase tracking-wider">
                            HIGH BID
                          </span>
                        )}

                        {collector.totalBidsCount > 1 && (
                          <span className="text-[10px] text-stone-400 font-mono tabular-nums">
                            [{collector.totalBidsCount}x]
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5 tabular-nums">
                        <Clock className="w-3 h-3" />{" "}
                        {collector.latestTimestamp || "LIVE"}
                      </p>
                    </div>
                  </div>

                  {/* Tabular Financial Amount & Spread */}
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="text-sm sm:text-base font-extrabold text-[#0F0F10] block">
                      <AnimatedPriceFlash value={collector.highestBid} />
                    </span>
                    {collector.rank > 1 ? (
                      <span className="text-[10px] text-[#D5001C] font-bold block">
                        -₹{collector.deltaFromLeader.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">
                        CLEARING LEAD
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-10 text-stone-400 text-xs font-mono uppercase tracking-widest">
              NO EXECUTIONS RECORDED ON ORDER BOOK.
            </div>
          )
        ) : allBidsSorted.length > 0 ? (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1.5 max-h-96 overflow-y-auto pr-1"
          >
            {allBidsSorted.map(({ rank, bid, isCurrentUser, deltaFromLeader }) => (
              <motion.div
                key={bid.id}
                variants={staggerItemVariants}
                className={`p-3 border flex items-center justify-between gap-3 text-xs tabular-nums ${
                  isCurrentUser
                    ? "bg-[#F6F5F2] border-[#0F0F10]"
                    : "bg-white border-[#0F0F10]/15 text-stone-600"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 bg-[#0F0F10] text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0F0F10] truncate">
                        {bid.bidderName}
                      </span>
                      {isCurrentUser && (
                        <span className="px-1 py-0.5 bg-emerald-600 text-white text-[8px] font-mono font-bold uppercase">
                          YOU
                        </span>
                      )}
                      {rank === 1 && (
                        <span className="px-1 py-0.5 bg-[#D5001C] text-white text-[8px] font-mono font-bold uppercase">
                          HIGH
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      {bid.timestamp}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono tabular-nums">
                  <span className="font-extrabold text-[#0F0F10] block">
                    ₹{bid.amount.toLocaleString("en-IN")}
                  </span>
                  {rank > 1 && (
                    <span className="text-[9px] text-[#D5001C] block">
                      -₹{deltaFromLeader.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-10 text-stone-400 text-xs font-mono uppercase tracking-widest">
            NO EXECUTIONS RECORDED.
          </div>
        )}
      </div>

      {/* 5. Escrow and Real-time Sync Assurance */}
      <div className="p-3 bg-[#F6F5F2] border-t border-[#0F0F10]/15 text-stone-600 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>SOVEREIGN ORDER BOOK SYNC</span>
        </div>
        <span className="text-stone-400">REAL-TIME TELEMETRY</span>
      </div>
    </div>
  );
};
