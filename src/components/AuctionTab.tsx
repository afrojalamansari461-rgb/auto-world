import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Clock, ShieldCheck, Flame, ChevronRight, TrendingUp, 
  Gavel, CheckCircle2, AlertCircle, ArrowUpRight, Award, 
  Volume2, Eye, Filter, Sparkles, RefreshCw, Trophy, 
  Car, User, ArrowRight, Check, History, Info, Lock,
  Megaphone, Pause, Calendar, DollarSign, AlertTriangle,
  Play, Edit3, X, Sliders, ShieldAlert, ListOrdered,
  Timer, Hourglass, Layers, FileText, CheckCheck
} from "lucide-react";
import { Auction, AuctionBid, DEFAULT_AUCTIONS, Vehicle } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { UserRole, canControlAuctionLot, canManageAuctions, OWNER_EMAIL } from "../lib/userRoles";
import { PostAuctionResult } from "./PostAuctionResult";
import { AuctionLeaderboard, getOrdinalSuffix } from "./AuctionLeaderboard";

interface AuctionTabProps {
  currentUser: FirebaseUser | null;
  userRole?: UserRole;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onSignInClick: () => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onPlayEngineSound?: (url?: string, title?: string, type?: string) => void;
  isEngineSoundEnabled?: boolean;
}

// Live Countdown Helper Component
function AuctionCountdown({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-md uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5" /> Auction Concluded
      </span>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${
      isUrgent ? "text-rose-500 animate-pulse" : "text-amber-500"
    }`}>
      <span className="bg-stone-900 text-white px-2 py-1 rounded shadow-inner">
        {String(timeLeft.hours).padStart(2, "0")}h
      </span>
      <span>:</span>
      <span className="bg-stone-900 text-white px-2 py-1 rounded shadow-inner">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </span>
      <span>:</span>
      <span className="bg-stone-900 text-amber-400 px-2 py-1 rounded shadow-inner">
        {String(timeLeft.seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}

export default function AuctionTab({
  currentUser,
  userRole,
  showToast,
  onSignInClick,
  onSelectVehicle,
  onPlayEngineSound,
  isEngineSoundEnabled
}: AuctionTabProps) {
  const [auctions, setAuctions] = useState<Auction[]>(() => {
    try {
      const stored = localStorage.getItem("autoworld_auctions_data");
      return stored ? JSON.parse(stored) : DEFAULT_AUCTIONS;
    } catch (e) {
      return DEFAULT_AUCTIONS;
    }
  });

  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "ended">("live");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  
  // Custom Bidding Console State (Additive vs Exact)
  const [customBidMode, setCustomBidMode] = useState<"additive" | "exact">("additive");
  const [additiveIncrement, setAdditiveIncrement] = useState<number | "">(50000);
  const [exactCustomBid, setExactCustomBid] = useState<number | "">("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);

  // Scheduling & Intermission State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [targetScheduleAuctionId, setTargetScheduleAuctionId] = useState<string | null>(null);
  const [customScheduleDateTime, setCustomScheduleDateTime] = useState<string>("");
  const [intermissionGapMinutes, setIntermissionGapMinutes] = useState<number>(30);

  // New Auction submission form
  const [newAuctionTitle, setNewAuctionTitle] = useState("");
  const [newAuctionMake, setNewAuctionMake] = useState("");
  const [newAuctionModel, setNewAuctionModel] = useState("");
  const [newAuctionYear, setNewAuctionYear] = useState(2023);
  const [newAuctionStartingBid, setNewAuctionStartingBid] = useState(5000000);
  const [newAuctionReservePrice, setNewAuctionReservePrice] = useState(6000000);
  const [newAuctionImage, setNewAuctionImage] = useState("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80");
  const [newAuctionMileage, setNewAuctionMileage] = useState("10,000 km");
  const [newAuctionLocation, setNewAuctionLocation] = useState("Mumbai, Maharashtra");

  // Real-time Global Settings Listener (Intermission Gap & Scheduling Policy)
  useEffect(() => {
    try {
      const unsubSettings = onSnapshot(doc(db, "admin_settings", "auction_settings"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.intermissionGapMinutes) {
            setIntermissionGapMinutes(data.intermissionGapMinutes);
          }
        }
      });
      return () => unsubSettings();
    } catch (e) {
      console.warn("Global auction settings listener notice:", e);
    }
  }, []);

  // Background Auto-Scheduler & Automated Expiration / Settlement Engine
  useEffect(() => {
    const runAutoAuctionEngine = () => {
      const now = Date.now();
      auctions.forEach(async (auc) => {
        // 1. Auto-Live Transition for Scheduled Upcoming Drops
        if (auc.status === "upcoming" && auc.scheduledStartTime) {
          const schedTime = new Date(auc.scheduledStartTime).getTime();
          if (schedTime <= now) {
            const newEnd = new Date(now + 24 * 3600 * 1000).toISOString();
            try {
              await updateDoc(doc(db, "auctions", auc.id), {
                status: "live",
                startTime: new Date().toISOString(),
                endTime: newEnd,
                isPaused: false
              });
              setAuctions(prev => prev.map(a => a.id === auc.id ? {
                ...a,
                status: "live",
                startTime: new Date().toISOString(),
                endTime: newEnd,
                isPaused: false
              } : a));
            } catch (err) {
              console.warn("Auto-live transition notice:", err);
            }
          }
        }

        // 2. Automated Settlement & Winner Declaration when Auction Period Expires
        if ((auc.status === "live" || auc.status === "paused") && auc.endTime) {
          const endMillis = new Date(auc.endTime).getTime();
          if (endMillis <= now) {
            const sortedBids = [...(auc.bids || [])].sort((a, b) => b.amount - a.amount);
            const topBid = sortedBids[0];
            const winnerName = topBid ? topBid.bidderName : (auc.winnerName || "Certified Floor Collector");
            const winnerUid = topBid ? topBid.bidderUid : (auc.winnerUid || "vault-winner");
            const winningBid = topBid ? topBid.amount : (auc.winningBid || auc.currentBid);

            try {
              await updateDoc(doc(db, "auctions", auc.id), {
                status: "settled",
                isPaused: false,
                winnerUid: winnerUid,
                winnerName: winnerName,
                winningBid: winningBid,
                isWinnerDeclared: true,
                concludedAt: new Date().toISOString()
              });

              setAuctions(prev => prev.map(a => a.id === auc.id ? {
                ...a,
                status: "settled",
                isPaused: false,
                winnerUid: winnerUid,
                winnerName: winnerName,
                winningBid: winningBid,
                isWinnerDeclared: true,
                concludedAt: new Date().toISOString()
              } : a));

              if (selectedAuction?.id === auc.id) {
                setSelectedAuction(prev => prev ? {
                  ...prev,
                  status: "settled",
                  isPaused: false,
                  winnerUid: winnerUid,
                  winnerName: winnerName,
                  winningBid: winningBid,
                  isWinnerDeclared: true,
                  concludedAt: new Date().toISOString()
                } : null);
              }
            } catch (err) {
              console.warn("Auto-settle auction expiration notice:", err);
            }
          }
        }
      });
    };

    const interval = setInterval(runAutoAuctionEngine, 5000);
    runAutoAuctionEngine();
    return () => clearInterval(interval);
  }, [auctions, selectedAuction?.id]);

  // Subscribe to real-time auctions from Firestore
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "auctions"), (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Auction[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ ...(docSnap.data() as Auction), id: docSnap.id });
          });
          setAuctions(loaded);
          try {
            localStorage.setItem("autoworld_auctions_data", JSON.stringify(loaded));
          } catch (e) {
            console.error(e);
          }
        } else {
          // If empty in Firestore, write initial presets
          DEFAULT_AUCTIONS.forEach(async (auc) => {
            try {
              await setDoc(doc(db, "auctions", auc.id), auc);
            } catch (err) {
              console.warn("Auction preset sync notice:", err);
            }
          });
        }
      }, (error) => {
        console.warn("Auctions onSnapshot notice:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore auctions listener init:", e);
    }
  }, []);

  const filteredAuctions = useMemo(() => {
    if (activeFilter === "all") return auctions;
    return auctions.filter((a) => a.status === activeFilter);
  }, [auctions, activeFilter]);

  // FIFO Queue Engine: Sort upcoming and queued lots strictly by submittedAt timestamp
  const fifoQueue = useMemo(() => {
    const sorted = [...auctions]
      .filter((a) => a.status === "upcoming" || a.status === "live")
      .sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : (a.startTime ? new Date(a.startTime).getTime() : 0);
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : (b.startTime ? new Date(b.startTime).getTime() : 0);
        return timeA - timeB;
      });

    return sorted.map((lot, idx) => ({
      ...lot,
      queuePosition: idx + 1
    }));
  }, [auctions]);

  // Current User's Consigned Queued Lots (FIFO position lookup)
  const userQueuedLots = useMemo(() => {
    if (!currentUser) return [];
    return fifoQueue.filter((lot) => 
      lot.sellerUid === currentUser.uid || 
      (currentUser.email && lot.sellerEmail?.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [fifoQueue, currentUser]);

  const activeAuctionDetail = selectedAuction || (filteredAuctions.length > 0 ? filteredAuctions[0] : auctions[0]);

  // Find next queued auction for post-auction result handoff
  const nextQueuedAuction = useMemo(() => {
    return auctions.find(a => (a.status === "upcoming" || a.status === "live") && a.id !== activeAuctionDetail?.id) || null;
  }, [auctions, activeAuctionDetail?.id]);

  // Role Authorization & Permissions
  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() || userRole === "Owner";
  const hasGlobalAuctionRole = canManageAuctions(userRole, currentUser?.email);
  const isAuthorizedDirector = useMemo(() => {
    if (!activeAuctionDetail) return false;
    return canControlAuctionLot(activeAuctionDetail, userRole, currentUser?.email, currentUser?.uid) || isOwner;
  }, [activeAuctionDetail, userRole, currentUser?.email, currentUser?.uid, isOwner]);

  // Real-Time Computed User Rank on Current Active Lot
  const userActiveLotRank = useMemo(() => {
    if (!currentUser || !activeAuctionDetail?.bids || activeAuctionDetail.bids.length === 0) return null;
    const bidderMap = new Map<string, number>();
    activeAuctionDetail.bids.forEach((b) => {
      const key = b.bidderUid || b.bidderName;
      const currentHigh = bidderMap.get(key) || 0;
      if (b.amount > currentHigh) bidderMap.set(key, b.amount);
    });
    const sorted = Array.from(bidderMap.entries()).sort((a, b) => b[1] - a[1]);
    const userIndex = sorted.findIndex(([uid]) =>
      uid === currentUser.uid ||
      (currentUser.email && uid.toLowerCase() === currentUser.email.split("@")[0].toLowerCase()) ||
      (currentUser.displayName && uid.toLowerCase() === currentUser.displayName.toLowerCase())
    );
    if (userIndex === -1) return null;
    return {
      rank: userIndex + 1,
      isLeading: userIndex === 0,
      totalBidders: sorted.length,
      userHighBid: sorted[userIndex][1]
    };
  }, [currentUser, activeAuctionDetail]);

  // Quick date helper for preset scheduling (e.g. Next Friday 1:00 AM)
  const getPresetDate = (dayOfWeek: number, targetHour: number, targetMinute: number = 0) => {
    const d = new Date();
    const currentDay = d.getDay(); // 0: Sun, 5: Fri
    let diff = dayOfWeek - currentDay;
    if (diff < 0 || (diff === 0 && (d.getHours() > targetHour || (d.getHours() === targetHour && d.getMinutes() >= targetMinute)))) {
      diff += 7;
    }
    const target = new Date(d);
    target.setDate(d.getDate() + diff);
    target.setHours(targetHour, targetMinute, 0, 0);
    return target.toISOString();
  };

  // Schedule Auction Start Time Handler
  const handleScheduleAuction = async (targetId: string, scheduledIso: string) => {
    if (!isAuthorizedDirector) {
      if (showToast) showToast("Access Denied: Only Owner or Auction Director can schedule auction drops.", "error");
      return;
    }

    try {
      const scheduledDate = new Date(scheduledIso);
      const scheduledEnd = new Date(scheduledDate.getTime() + 24 * 3600 * 1000).toISOString();
      await updateDoc(doc(db, "auctions", targetId), {
        scheduledStartTime: scheduledIso,
        startTime: scheduledIso,
        endTime: scheduledEnd,
        status: "upcoming",
        isPaused: false
      });

      setAuctions(prev => prev.map(a => a.id === targetId ? {
        ...a,
        scheduledStartTime: scheduledIso,
        startTime: scheduledIso,
        endTime: scheduledEnd,
        status: "upcoming",
        isPaused: false
      } : a));

      if (selectedAuction?.id === targetId) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          scheduledStartTime: scheduledIso,
          startTime: scheduledIso,
          endTime: scheduledEnd,
          status: "upcoming",
          isPaused: false
        } : null);
      }

      setIsScheduleModalOpen(false);
      setTargetScheduleAuctionId(null);
      if (showToast) showToast(`📅 Auction scheduled to start on ${new Date(scheduledIso).toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}!`, "success");
    } catch (err) {
      console.error("Failed to schedule auction:", err);
      if (showToast) showToast("Failed to save scheduled start time.", "error");
    }
  };

  // Update Intermission Gap Setting (Owner / Director)
  const handleUpdateIntermissionGap = async (minutes: number) => {
    if (!isAuthorizedDirector) {
      if (showToast) showToast("Access Denied: Only Auction Director can update intermission settings.", "error");
      return;
    }

    try {
      await setDoc(doc(db, "admin_settings", "auction_settings"), {
        intermissionGapMinutes: minutes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || "Director"
      }, { merge: true });
      setIntermissionGapMinutes(minutes);
      if (showToast) showToast(`⏳ Inter-auction intermission gap set to ${minutes} minutes.`, "success");
    } catch (err) {
      console.error("Failed to save intermission gap:", err);
      setIntermissionGapMinutes(minutes);
    }
  };

  // Automated Auction Settlement on Timer Expiration (No role-block, runs system-wide)
  const handleAutomateLotSettlement = async (auctionId: string) => {
    const target = auctions.find(a => a.id === auctionId);
    if (!target || target.status === "settled") return;

    const sortedBids = [...(target.bids || [])].sort((a, b) => b.amount - a.amount);
    const topBid = sortedBids[0];
    const winnerName = topBid ? topBid.bidderName : (target.winnerName || "Certified Floor Bidder");
    const winnerUid = topBid ? topBid.bidderUid : (target.winnerUid || "vault-winner");
    const winningBid = topBid ? topBid.amount : (target.winningBid || target.currentBid);

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "settled",
        isPaused: false,
        winnerUid: winnerUid,
        winnerName: winnerName,
        winningBid: winningBid,
        isWinnerDeclared: true,
        concludedAt: new Date().toISOString()
      });

      setAuctions(prev => prev.map(a => a.id === auctionId ? {
        ...a,
        status: "settled",
        isPaused: false,
        winnerUid: winnerUid,
        winnerName: winnerName,
        winningBid: winningBid,
        isWinnerDeclared: true,
        concludedAt: new Date().toISOString()
      } : a));

      if (selectedAuction?.id === auctionId) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          status: "settled",
          isPaused: false,
          winnerUid: winnerUid,
          winnerName: winnerName,
          winningBid: winningBid,
          isWinnerDeclared: true,
          concludedAt: new Date().toISOString()
        } : null);
      }

      if (showToast) showToast(`🏆 Timer Expired! Auction concluded and winner cleared: ${winnerName} (₹${winningBid.toLocaleString("en-IN")})`, "info");
    } catch (err) {
      console.error("Failed to auto-settle expired auction:", err);
    }
  };

  // Declare Winner & Conclude Auction (Cleared to everyone)
  const handleConcludeAndDeclareWinner = async (auctionId: string) => {
    const target = auctions.find(a => a.id === auctionId);
    if (!target) return;
    if (!isAuthorizedDirector) {
      if (showToast) showToast("Access Denied: Only Owner or Auction Director can finalize lots.", "error");
      return;
    }

    const topBid = target.bids && target.bids.length > 0 ? target.bids[0] : null;
    const winnerName = topBid ? topBid.bidderName : (target.winnerName || "Certified Vault Collector");
    const winnerUid = topBid ? topBid.bidderUid : (target.winnerUid || "vault-winner");
    const winningBid = topBid ? topBid.amount : target.currentBid;

    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "settled",
        isPaused: false,
        winnerUid: winnerUid,
        winnerName: winnerName,
        winningBid: winningBid,
        isWinnerDeclared: true,
        concludedAt: new Date().toISOString()
      });

      setAuctions(prev => prev.map(a => a.id === auctionId ? {
        ...a,
        status: "settled",
        isPaused: false,
        winnerUid: winnerUid,
        winnerName: winnerName,
        winningBid: winningBid,
        isWinnerDeclared: true,
        concludedAt: new Date().toISOString()
      } : a));

      if (selectedAuction?.id === auctionId) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          status: "settled",
          isPaused: false,
          winnerUid: winnerUid,
          winnerName: winnerName,
          winningBid: winningBid,
          isWinnerDeclared: true,
          concludedAt: new Date().toISOString()
        } : null);
      }

      if (showToast) showToast(`🏆 Hammer Down! Winner declared: ${winnerName} (₹${winningBid.toLocaleString("en-IN")}) — Cleared to all users!`, "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to conclude auction in database.", "error");
    }
  };

  // Live Notice & Popup Modal State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState<string | null>(null);
  const [isEditNoticeModalOpen, setIsEditNoticeModalOpen] = useState(false);
  const [noticeEditText, setNoticeEditText] = useState("");
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  // Sync notice popup trigger on change
  useEffect(() => {
    if (activeAuctionDetail?.floorNotice) {
      const noticeKey = `${activeAuctionDetail.id}_${activeAuctionDetail.floorNotice}_${activeAuctionDetail.floorNoticeTimestamp || ""}`;
      if (dismissedNoticeKey !== noticeKey) {
        setIsNoticeModalOpen(true);
      }
      setNoticeEditText(activeAuctionDetail.floorNotice);
    } else {
      setIsNoticeModalOpen(false);
    }
  }, [activeAuctionDetail?.id, activeAuctionDetail?.floorNotice, activeAuctionDetail?.floorNoticeTimestamp, dismissedNoticeKey]);

  // Executive Floor Operations (Restricted to Owner & Authorized Roles)
  const handleDirectGoLive = async () => {
    if (!activeAuctionDetail) return;
    if (!isAuthorizedDirector) {
      if (showToast) showToast("Access Denied: Only Owner or Auction Floor Director can launch this lot live.", "error");
      return;
    }
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    try {
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        status: "live",
        isPaused: false,
        pauseReason: "",
        startTime: now.toISOString(),
        endTime: endTime
      });
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? {
        ...a,
        status: "live",
        isPaused: false,
        pauseReason: "",
        startTime: now.toISOString(),
        endTime: endTime
      } : a));
      if (selectedAuction?.id === activeAuctionDetail.id) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          status: "live",
          isPaused: false,
          pauseReason: "",
          startTime: now.toISOString(),
          endTime: endTime
        } : null);
      }
      if (showToast) showToast(`🔥 Lot #${activeAuctionDetail.id} is now LIVE on the floor! 24-Hour countdown active.`, "success");
    } catch (err) {
      console.error("Failed to make auction live:", err);
      if (showToast) showToast("Failed to launch auction live in database.", "error");
    }
  };

  const handleDirectTogglePause = async () => {
    if (!activeAuctionDetail || !isAuthorizedDirector) return;
    const willPause = !(activeAuctionDetail.isPaused || activeAuctionDetail.status === "paused");
    const reason = willPause ? "Floor bidding temporarily frozen by Auction Director" : "";
    try {
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        isPaused: willPause,
        status: willPause ? "paused" : "live",
        pauseReason: reason
      });
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? {
        ...a,
        isPaused: willPause,
        status: willPause ? "paused" : "live",
        pauseReason: reason
      } : a));
      if (selectedAuction?.id === activeAuctionDetail.id) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          isPaused: willPause,
          status: willPause ? "paused" : "live",
          pauseReason: reason
        } : null);
      }
      if (showToast) showToast(willPause ? "⏸️ Auction floor temporarily paused" : "▶️ Auction floor resumed", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectExtendTime = async (hours: number) => {
    if (!activeAuctionDetail || !isAuthorizedDirector) return;
    const currentEnd = new Date(activeAuctionDetail.endTime).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    const newEnd = new Date(baseTime + hours * 3600 * 1000).toISOString();
    try {
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        endTime: newEnd,
        status: "live",
        isPaused: false
      });
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? {
        ...a,
        endTime: newEnd,
        status: "live",
        isPaused: false
      } : a));
      if (selectedAuction?.id === activeAuctionDetail.id) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          endTime: newEnd,
          status: "live",
          isPaused: false
        } : null);
      }
      if (showToast) showToast(`Auction timer extended by +${hours >= 1 ? `${hours}h` : `${hours * 60}m`}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFloorNotice = async (text: string) => {
    if (!activeAuctionDetail || !isAuthorizedDirector) return;
    setIsSavingNotice(true);
    const cleanText = text.trim();
    const timestamp = cleanText ? new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
    try {
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        floorNotice: cleanText,
        floorNoticeTimestamp: timestamp
      });
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? {
        ...a,
        floorNotice: cleanText,
        floorNoticeTimestamp: timestamp
      } : a));
      if (selectedAuction?.id === activeAuctionDetail.id) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          floorNotice: cleanText,
          floorNoticeTimestamp: timestamp
        } : null);
      }
      setIsEditNoticeModalOpen(false);
      if (showToast) showToast(cleanText ? "📢 Live floor notice broadcasted to all collectors!" : "Floor notice cleared", "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to save notice", "error");
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleDirectScheduleLot = async (auctionId: string, scheduledIso: string) => {
    if (!isAuthorizedDirector) return;
    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        scheduledStartTime: scheduledIso,
        status: "upcoming",
        isPaused: false
      });
      setAuctions(prev => prev.map(a => a.id === auctionId ? {
        ...a,
        scheduledStartTime: scheduledIso,
        status: "upcoming",
        isPaused: false
      } : a));
      if (selectedAuction?.id === auctionId) {
        setSelectedAuction(prev => prev ? {
          ...prev,
          scheduledStartTime: scheduledIso,
          status: "upcoming",
          isPaused: false
        } : null);
      }
      setIsScheduleModalOpen(false);
      if (showToast) showToast(`Auction scheduled for ${new Date(scheduledIso).toLocaleString("en-IN")}`, "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to schedule auction", "error");
    }
  };

  // Handle Bidding Submission
  const handlePlaceBid = async (amount: number) => {
    if (!currentUser) {
      onSignInClick();
      return;
    }
    if (!activeAuctionDetail) return;

    if (activeAuctionDetail.isPaused || activeAuctionDetail.status === "paused") {
      setBidError("Auction floor is currently paused by the Director. Bidding is temporarily frozen.");
      return;
    }

    if (activeAuctionDetail.status !== "live") {
      setBidError("Bidding is only permitted on active 24-hour Live Flash Auctions.");
      return;
    }

    const minAllowed = activeAuctionDetail.currentBid + (activeAuctionDetail.minIncrement || 50000);
    if (amount < minAllowed) {
      setBidError(`Minimum valid bid is ₹${minAllowed.toLocaleString("en-IN")} (+₹${(activeAuctionDetail.minIncrement || 50000).toLocaleString("en-IN")} increment).`);
      return;
    }

    setIsSubmittingBid(true);
    setBidError(null);

    const newBid: AuctionBid = {
      id: `bid_${Date.now()}`,
      bidderUid: currentUser.uid,
      bidderName: currentUser.displayName || currentUser.email?.split("@")[0] || "Verified Bidder",
      bidderPhoto: currentUser.photoURL || undefined,
      amount: amount,
      timestamp: "Just now"
    };

    const isReserveNowMet = amount >= activeAuctionDetail.reservePrice;
    const updatedBids = [newBid, ...(activeAuctionDetail.bids || [])];
    const updatedAuction: Auction = {
      ...activeAuctionDetail,
      currentBid: amount,
      bidCount: (activeAuctionDetail.bidCount || 0) + 1,
      isReserveMet: isReserveNowMet,
      bids: updatedBids,
      winnerUid: currentUser.uid,
      winnerName: currentUser.displayName || "Top Bidder",
      winningBid: amount
    };

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        currentBid: amount,
        bidCount: updatedAuction.bidCount,
        isReserveMet: isReserveNowMet,
        bids: updatedBids,
        winnerUid: currentUser.uid,
        winnerName: currentUser.displayName || "Top Bidder",
        winningBid: amount
      });

      // 2. Update local state
      setAuctions((prev) => prev.map((a) => (a.id === activeAuctionDetail.id ? updatedAuction : a)));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`Bid of ₹${amount.toLocaleString("en-IN")} successfully confirmed on the live floor!`);
      setExactCustomBid("");
      setTimeout(() => setBidSuccess(null), 6000);
    } catch (err) {
      console.error("Bid submission error:", err);
      // Fallback local update
      setAuctions((prev) => prev.map((a) => (a.id === activeAuctionDetail.id ? updatedAuction : a)));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`Bid of ₹${amount.toLocaleString("en-IN")} accepted locally!`);
      setTimeout(() => setBidSuccess(null), 6000);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Handle Instant Buy-Now Direct Acquisition
  const handleBuyNow = async () => {
    if (!currentUser) {
      onSignInClick();
      return;
    }
    if (!activeAuctionDetail || !activeAuctionDetail.buyNowPrice) return;
    if (activeAuctionDetail.isPaused || activeAuctionDetail.status === "paused") {
      setBidError("Auction is temporarily frozen by the Director.");
      return;
    }

    if (!window.confirm(`Confirm Instant Buy-Now Acquisition for ₹${activeAuctionDetail.buyNowPrice.toLocaleString("en-IN")}? This will immediately conclude the auction and reserve this vehicle for you.`)) {
      return;
    }

    const buyPrice = activeAuctionDetail.buyNowPrice;
    const newBid: AuctionBid = {
      id: `bid_buynow_${Date.now()}`,
      bidderUid: currentUser.uid,
      bidderName: currentUser.displayName || currentUser.email?.split("@")[0] || "Buy-Now Collector",
      bidderPhoto: currentUser.photoURL || undefined,
      amount: buyPrice,
      timestamp: "Instant Buy-Now"
    };

    const updatedBids = [newBid, ...(activeAuctionDetail.bids || [])];
    const updatedAuction: Auction = {
      ...activeAuctionDetail,
      currentBid: buyPrice,
      bidCount: (activeAuctionDetail.bidCount || 0) + 1,
      isReserveMet: true,
      status: "settled",
      isPaused: false,
      bids: updatedBids,
      winnerUid: currentUser.uid,
      winnerName: currentUser.displayName || "Instant Buyer",
      winningBid: buyPrice
    };

    try {
      await updateDoc(doc(db, "auctions", activeAuctionDetail.id), {
        currentBid: buyPrice,
        bidCount: updatedAuction.bidCount,
        isReserveMet: true,
        status: "settled",
        isPaused: false,
        bids: updatedBids,
        winnerUid: currentUser.uid,
        winnerName: currentUser.displayName || "Instant Buyer",
        winningBid: buyPrice
      });
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? updatedAuction : a));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`🎉 Congratulations! You have acquired this vehicle instantly via Buy-Now at ₹${buyPrice.toLocaleString("en-IN")}! Our concierge will connect with you.`);
    } catch (err) {
      console.error(err);
      setAuctions(prev => prev.map(a => a.id === activeAuctionDetail.id ? updatedAuction : a));
      setSelectedAuction(updatedAuction);
      setBidSuccess(`Instant Buy-Now confirmed!`);
    }
  };

  // Handle Submitting a New Car for Flash Auction (Enters FIFO Queue)
  const handleProposeAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onSignInClick();
      return;
    }

    const newId = `auc-${Date.now()}`;
    const submissionTime = new Date().toISOString();
    const upcomingCount = auctions.filter(a => a.status === "upcoming").length;
    const assignedPosition = upcomingCount + 1;

    const newAuctionItem: Auction = {
      id: newId,
      title: newAuctionTitle || `${newAuctionYear} ${newAuctionMake} ${newAuctionModel}`,
      make: newAuctionMake || "Porsche",
      model: newAuctionModel || "GT3",
      year: Number(newAuctionYear),
      image: newAuctionImage,
      photos: [{ src: newAuctionImage, alt: newAuctionTitle }],
      startingBid: Number(newAuctionStartingBid),
      currentBid: Number(newAuctionStartingBid),
      bidCount: 0,
      minIncrement: 50000,
      reservePrice: Number(newAuctionReservePrice),
      isReserveMet: false,
      startTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      endTime: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
      scheduledStartTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      status: "upcoming",
      submittedAt: submissionTime,
      queuePosition: assignedPosition,
      bids: [],
      sellerUid: currentUser.uid,
      sellerName: currentUser.displayName || currentUser.email?.split("@")[0] || "Verified Consignor",
      sellerPhone: "+91 98000 00000",
      sellerEmail: currentUser.email || "seller@autoworld.in",
      location: newAuctionLocation,
      condition: 5,
      mileage: newAuctionMileage,
      fuel: "Petrol",
      transmission: "Automatic",
      highlights: [
        "Verified platform 100-point inspection certified",
        "Clear RTO NOC documentation and Single Owner Registry",
        "Entered in FIFO Auction Drop Lineup"
      ],
      verifiedOnly: true,
      featured: true
    };

    try {
      await setDoc(doc(db, "auctions", newId), newAuctionItem);
    } catch (err) {
      console.warn("Firestore auction creation notice:", err);
    }

    const nextList = [...auctions, newAuctionItem];
    setAuctions(nextList);
    try {
      localStorage.setItem("autoworld_auctions_data", JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
    }

    setSelectedAuction(newAuctionItem);
    setIsProposeModalOpen(false);
    setBidSuccess(`⚡ Your vehicle has entered the FIFO Auction Drop Queue as #${assignedPosition} in line!`);
    setTimeout(() => setBidSuccess(null), 7000);
  };

  return (
    <div id="auction-tab-container" className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-stone-950 text-white border-b border-amber-500/30 relative overflow-hidden pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Zap className="w-3.5 h-3.5 fill-amber-400" /> Live Flash Auction & Transparent Bidding Floor
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight text-white">
                Weekly 24-Hour <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">Verified Supercar Auctions</span>
              </h1>
              <p className="mt-2 text-stone-400 text-sm sm:text-base max-w-2xl">
                Real-time timed drops for certified exotic machinery. Zero hidden reserve games, 100% transparent bidding stream, and guaranteed ownership transfer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="propose-auction-btn"
                onClick={() => setIsProposeModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Gavel className="w-4 h-4" /> Propose Car for Flash Auction
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-800 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Drop Duration</p>
                <p className="font-bold text-white font-mono">Strict 24-Hour Timer</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Vehicle Integrity</p>
                <p className="font-bold text-emerald-400">100-Point Inspected</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Floor Transparency</p>
                <p className="font-bold text-blue-400">Real-Time Bid Stream</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-400 text-xs">Reserve Guarantee</p>
                <p className="font-bold text-purple-400">Clear Reserve Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Floor & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter("live")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeFilter === "live"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Drops ({auctions.filter((a) => a.status === "live").length})
            </button>
            <button
              onClick={() => setActiveFilter("upcoming")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeFilter === "upcoming"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              Upcoming ({auctions.filter((a) => a.status === "upcoming").length})
            </button>
            <button
              onClick={() => setActiveFilter("settled")}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeFilter === "settled"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              <Trophy className="w-4 h-4 text-purple-600" />
              Settled Results ({auctions.filter((a) => a.status === "settled").length})
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              All Drops ({auctions.length})
            </button>
          </div>

          <div className="text-xs text-stone-500 font-mono">
            Auto-refreshing live socket floor • Anti-sniping +2m enabled
          </div>
        </div>

        {/* Success / Error Alerts */}
        <AnimatePresence>
          {bidSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center gap-3 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{bidSuccess}</span>
            </motion.div>
          )}

          {bidError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold flex items-center gap-3 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{bidError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. User Consignor FIFO Queue Status Banner (e.g. "You will be 3rd") */}
        {userQueuedLots.length > 0 && (
          <div className="mt-4 p-4 bg-stone-900 text-stone-100 border-2 border-amber-500/60 shadow-lg font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-amber-500 text-stone-950 font-black shrink-0">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-stone-950 px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider">
                      Your Consigned Vehicle Lineup
                    </span>
                    <span className="text-stone-400 text-[10px]">Strict FIFO Release</span>
                  </div>
                  {userQueuedLots.map((lot) => (
                    <p key={lot.id} className="text-stone-200 text-xs sm:text-sm font-bold mt-1">
                      🚗 <span className="text-amber-300 font-black">{lot.title}</span> is currently{" "}
                      <span className="text-white underline decoration-amber-400 font-mono text-sm sm:text-base">
                        #{lot.queuePosition} in the Drop Lineup
                      </span>{" "}
                      <span className="text-amber-400/90 font-mono text-[11px] block sm:inline">
                        (You will be {lot.queuePosition === 1 ? "1st" : lot.queuePosition === 2 ? "2nd" : lot.queuePosition === 3 ? "3rd" : `${lot.queuePosition}th`})
                      </span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-[11px] text-stone-400">
                  Released sequentially based on submission time + {intermissionGapMinutes}m intermission gap.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Featured Active Bidding Arena */}
        {activeAuctionDetail ? (
          <div className="mt-6 space-y-4">
            {/* Executive Director Floor Operations Bar (Owner & Specified Roles Only) */}
            {isAuthorizedDirector && (
              <div className="p-4 bg-white border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] font-mono text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-stone-900 text-white font-mono text-[9px] font-black uppercase tracking-wider">
                      👑 {isOwner ? "OWNER CLEARANCE" : (userRole || "DIRECTOR DESK")}
                    </span>
                    <span className="text-stone-800 font-serif font-black text-sm">
                      Floor Governance for Lot #{activeAuctionDetail.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${
                      activeAuctionDetail.status === "settled"
                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                        : activeAuctionDetail.isPaused || activeAuctionDetail.status === "paused"
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : activeAuctionDetail.status === "live"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse"
                        : "bg-stone-200 text-stone-800"
                    }`}>
                      ● Status: {activeAuctionDetail.status === "settled" ? "CONCLUDED / SETTLED" : activeAuctionDetail.isPaused ? "PAUSED" : activeAuctionDetail.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Master Go-Live Button */}
                  {activeAuctionDetail.status !== "live" || activeAuctionDetail.isPaused ? (
                    <button
                      type="button"
                      onClick={handleDirectGoLive}
                      className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Play className="w-4 h-4 fill-white" /> Open & Go Live (24h Flash)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDirectTogglePause}
                      className="py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Pause className="w-4 h-4 fill-white" /> Emergency Floor Freeze
                    </button>
                  )}

                  {activeAuctionDetail.isPaused && (
                    <button
                      type="button"
                      onClick={handleDirectTogglePause}
                      className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Play className="w-4 h-4 fill-white" /> Resume Floor Bidding
                    </button>
                  )}

                  {/* Schedule Drop Button (Friday 1 AM etc.) */}
                  <button
                    type="button"
                    onClick={() => {
                      setTargetScheduleAuctionId(activeAuctionDetail.id);
                      setIsScheduleModalOpen(true);
                    }}
                    className="py-2.5 px-3.5 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-900 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-300" />
                    Schedule Drop (e.g. Friday 1 AM)
                  </button>

                  {/* Declare Winner & Conclude Lot */}
                  {activeAuctionDetail.status !== "settled" && (
                    <button
                      type="button"
                      onClick={() => handleConcludeAndDeclareWinner(activeAuctionDetail.id)}
                      className="py-2.5 px-3.5 bg-purple-900 hover:bg-purple-800 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Gavel className="w-3.5 h-3.5 text-purple-200" />
                      Conclude & Declare Winner
                    </button>
                  )}

                  {/* Edit Live Notice Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNoticeEditText(activeAuctionDetail.floorNotice || "");
                      setIsEditNoticeModalOpen(true);
                    }}
                    className="py-2.5 px-3.5 bg-[#FAF8F5] hover:bg-stone-100 text-stone-900 border border-stone-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-stone-800" />
                    {activeAuctionDetail.floorNotice ? "Edit Live Notice" : "+ Broadcast Notice"}
                  </button>

                  {/* Intermission Gap Control */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-stone-600 font-bold uppercase mr-1">Intermission Gap:</span>
                    {[15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleUpdateIntermissionGap(mins)}
                        className={`py-1.5 px-2.5 font-bold text-[10px] cursor-pointer transition ${
                          intermissionGapMinutes === mins
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Official Director Floor Notice (Website Theme: Warm Stone & Charcoal) */}
            {activeAuctionDetail.floorNotice && (
              <div className="p-4 bg-[#FAF8F5] text-stone-900 border-2 border-stone-900 font-mono text-xs shadow-[3px_3px_0px_0px_rgba(28,25,23,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 bg-stone-900 text-white shrink-0">
                    <Megaphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-red-700 text-white font-mono font-bold px-1.5 py-0.5 uppercase tracking-wider">
                        Official Floor Notice
                      </span>
                      {activeAuctionDetail.floorNoticeTimestamp && (
                        <span className="text-[10px] text-stone-500 font-mono">
                          {activeAuctionDetail.floorNoticeTimestamp}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-900 font-bold mt-0.5 text-xs sm:text-sm">
                      {activeAuctionDetail.floorNotice}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setIsNoticeModalOpen(true)}
                    className="py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-white" /> View Pop-up
                  </button>

                  {isAuthorizedDirector && (
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeEditText(activeAuctionDetail.floorNotice || "");
                        setIsEditNoticeModalOpen(true);
                      }}
                      className="py-1.5 px-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-400 font-bold text-[10px] uppercase cursor-pointer"
                      title="Edit Floor Notice"
                    >
                      <Edit3 className="w-3 h-3 text-stone-700" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Emergency Pause Warning */}
            {(activeAuctionDetail.isPaused || activeAuctionDetail.status === "paused") && (
              <div className="p-4 bg-rose-600 text-white font-mono text-xs font-bold flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(28,25,23,1)] border-2 border-stone-950 animate-pulse">
                <div className="flex items-center gap-3">
                  <Pause className="w-5 h-5 shrink-0 fill-white" />
                  <div>
                    <span className="block font-black uppercase text-sm">AUCTION FLOOR TEMPORARILY PAUSED</span>
                    <span className="text-xs font-normal text-rose-100">{activeAuctionDetail.pauseReason || "The Auction Director has temporarily halted bidding on this lot."}</span>
                  </div>
                </div>
                {isAuthorizedDirector && (
                  <button
                    type="button"
                    onClick={handleDirectTogglePause}
                    className="py-1.5 px-3 bg-white text-stone-950 hover:bg-stone-100 font-mono text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    Resume Floor
                  </button>
                )}
              </div>
            )}

            {/* Scheduled Drop Banner with Countdown */}
            {activeAuctionDetail.status === "upcoming" && (
              <div className="p-4 bg-stone-900 text-stone-100 border-2 border-stone-800 font-mono text-xs shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-stone-950 font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider">
                        SCHEDULED FLASH DROP
                      </span>
                      <span className="text-stone-400 text-[10px]">
                        FIFO Position #{activeAuctionDetail.queuePosition || 1}
                      </span>
                    </div>
                    <p className="text-stone-200 font-bold text-sm mt-0.5">
                      Opens: {activeAuctionDetail.scheduledStartTime 
                        ? new Date(activeAuctionDetail.scheduledStartTime).toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "Friday Drop Scheduled"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAuthorizedDirector && (
                    <button
                      type="button"
                      onClick={handleDirectGoLive}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase cursor-pointer shadow-xs"
                    >
                      Open Live Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Intermission Gap Status Box */}
            <div className="p-3 bg-stone-100 border border-stone-300 text-stone-700 font-mono text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-stone-800" />
                <span>
                  <strong>Configured Intermission Gap:</strong> {intermissionGapMinutes} minutes between consecutive auction drops (Decided by Director/Owner).
                </span>
              </div>
              <span className="text-[10px] text-stone-500">First-In First-Out Queue Active</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Visuals & Vehicle Dossier (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden">
                {/* Main Media Showcase */}
                <div className="relative aspect-video bg-stone-900 overflow-hidden group">
                  <img
                    src={activeAuctionDetail.image}
                    alt={activeAuctionDetail.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-stone-950/80 backdrop-blur-md border border-amber-500/40 text-amber-400 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" /> Lot #{activeAuctionDetail.id}
                    </span>

                    {activeAuctionDetail.isReserveMet ? (
                      <span className="px-3 py-1 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Reserve Price Met
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Reserve Not Yet Met
                      </span>
                    )}

                    {activeAuctionDetail.queuePosition && (
                      <span className="px-3 py-1 bg-stone-900/90 text-stone-300 text-xs font-mono font-bold rounded-md border border-stone-700">
                        Queue #{activeAuctionDetail.queuePosition}
                      </span>
                    )}

                    {userActiveLotRank && (
                      <span className={`px-3 py-1 backdrop-blur-md text-xs font-bold rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md ${
                        userActiveLotRank.isLeading
                          ? "bg-amber-500 text-stone-950 border border-amber-300 font-black"
                          : "bg-stone-900/90 text-amber-300 border border-amber-500/50"
                      }`}>
                        <Trophy className="w-3.5 h-3.5" />
                        {userActiveLotRank.isLeading ? "👑 You are 1st (Leader!)" : `You are ${getOrdinalSuffix(userActiveLotRank.rank)}`}
                      </span>
                    )}
                  </div>

                  {/* Engine Acoustic Player Button */}
                  {activeAuctionDetail.engineSoundUrl && onPlayEngineSound && (
                    <button
                      onClick={() => onPlayEngineSound(
                        activeAuctionDetail.engineSoundUrl,
                        activeAuctionDetail.engineSoundTitle,
                        activeAuctionDetail.engineSoundType
                      )}
                      className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-stone-900/90 backdrop-blur-md hover:bg-stone-900 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
                    >
                      <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" /> Listen to Exhaust Note
                    </button>
                  )}

                  {/* Live Timer Pill */}
                  <div className="absolute bottom-4 right-4 bg-stone-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-stone-700 shadow-xl">
                    <AuctionCountdown 
                      endTime={activeAuctionDetail.endTime} 
                      onExpire={() => handleAutomateLotSettlement(activeAuctionDetail.id)}
                    />
                  </div>
                </div>

                {/* Info and Highlights */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                    <div>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                        {activeAuctionDetail.year} • {activeAuctionDetail.make} • {activeAuctionDetail.location}
                      </p>
                      <h2 className="text-2xl font-bold font-serif text-stone-900">
                        {activeAuctionDetail.title}
                      </h2>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-stone-500">Starting Bid</p>
                      <p className="text-sm font-bold text-stone-700 font-mono">
                        ₹{activeAuctionDetail.startingBid.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Highlights Bullet List */}
                  {activeAuctionDetail.highlights && activeAuctionDetail.highlights.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                        Lot Highlights & Provenance
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeAuctionDetail.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-100">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Specifications Grid */}
                  {activeAuctionDetail.specs && (
                    <div className="mt-5 pt-4 border-t border-stone-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
                        Technical Dossier & Certification
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(activeAuctionDetail.specs).map(([key, val]) => (
                          <div key={key} className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <p className="text-stone-400 text-[10px] uppercase font-semibold">{key}</p>
                            <p className="font-bold text-stone-800 mt-0.5 truncate">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Flash Lots Bar */}
              <div className="bg-white p-4 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  All Active Lots in this Flash Window
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {auctions.map((auc) => (
                    <button
                      key={auc.id}
                      onClick={() => setSelectedAuction(auc)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
                        activeAuctionDetail.id === auc.id
                          ? "bg-amber-50/60 border-amber-500/50 shadow-sm"
                          : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      <img src={auc.image} alt={auc.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{auc.title}</p>
                        <p className="text-xs font-mono font-bold text-amber-600">₹{(auc.currentBid / 100000).toFixed(2)} Lakhs</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Bidding Floor & Action Console (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* If Auction is Settled / Concluded -> Show Automated Post-Auction Result Component */}
              {activeAuctionDetail.status === "settled" ? (
                <PostAuctionResult
                  auction={activeAuctionDetail}
                  currentUserId={currentUser?.uid}
                  currentUserEmail={currentUser?.email || undefined}
                  nextQueuedAuction={nextQueuedAuction}
                  intermissionGapMinutes={intermissionGapMinutes}
                  onSelectNextAuction={(auc) => {
                    setSelectedAuction(auc);
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  showToast={showToast}
                />
              ) : (
                /* Active Bid Console with Additive Custom Bidding */
                <div className="bg-stone-950 text-white rounded-2xl p-6 border border-amber-500/30 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Live Bidding Floor</span>
                    </div>
                    <span className="text-xs font-mono text-stone-400">{activeAuctionDetail.bidCount} Bids Placed</span>
                  </div>

                  {/* Current High Bid Card */}
                  <div className="my-5 p-4 rounded-xl bg-stone-900/90 border border-stone-800 text-center">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Highest Bid</p>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 mt-1">
                      ₹{activeAuctionDetail.currentBid.toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {activeAuctionDetail.isReserveMet ? (
                        <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reserve Met • Highest bidder takes the vehicle
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Reserve not met yet (Min reserve: ₹{(activeAuctionDetail.reservePrice / 100000).toFixed(2)} Lakhs)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Custom Additive Bidding Console (Adds to Current Amount) */}
                  <div className="space-y-4">
                    {/* Mode Switcher: Additive (+ increment) vs Exact Total */}
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs text-stone-300 font-bold">Custom Bidding Console:</span>
                      <div className="flex bg-stone-900 p-0.5 rounded-lg border border-stone-800 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setCustomBidMode("additive")}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            customBidMode === "additive" ? "bg-amber-500 text-stone-950 font-bold shadow-xs" : "text-stone-400"
                          }`}
                        >
                          + Add to Current
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomBidMode("exact")}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            customBidMode === "exact" ? "bg-amber-500 text-stone-950 font-bold shadow-xs" : "text-stone-400"
                          }`}
                        >
                          Exact Amount
                        </button>
                      </div>
                    </div>

                    {customBidMode === "additive" ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-stone-400 font-medium">Select or enter amount to add to current highest bid:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[25000, 50000, 100000, 250000, 500000, 1000000].map((inc) => (
                            <button
                              key={inc}
                              type="button"
                              onClick={() => setAdditiveIncrement(inc)}
                              className={`py-2 px-2 font-mono text-xs rounded-lg transition-all border cursor-pointer text-center ${
                                additiveIncrement === inc
                                  ? "bg-amber-500 text-stone-950 font-black border-amber-400 shadow-md"
                                  : "bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800"
                              }`}
                            >
                              +₹{(inc / 1000 >= 100 ? `${(inc / 100000).toFixed(1)}L` : `${(inc / 1000).toFixed(0)}k`)}
                            </button>
                          ))}
                        </div>

                        {/* Custom Incremental Input */}
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-stone-400 font-mono text-xs">+ ₹</span>
                          <input
                            type="number"
                            min={10000}
                            step={10000}
                            placeholder="Custom increment (e.g. 75000)"
                            value={additiveIncrement}
                            onChange={(e) => setAdditiveIncrement(e.target.value ? Number(e.target.value) : "")}
                            className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Live Calculation Preview */}
                        {typeof additiveIncrement === "number" && additiveIncrement > 0 && (
                          <div className="p-3 bg-stone-900/90 border border-amber-500/40 rounded-xl font-mono text-xs space-y-1">
                            <div className="flex justify-between text-stone-400 text-[11px]">
                              <span>Current High Bid:</span>
                              <span>₹{activeAuctionDetail.currentBid.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-amber-400 text-[11px]">
                              <span>+ Your Added Bid:</span>
                              <span>+ ₹{additiveIncrement.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-stone-800 text-white font-bold text-sm">
                              <span>👉 Calculated Total Bid:</span>
                              <span className="text-amber-300">
                                ₹{(activeAuctionDetail.currentBid + additiveIncrement).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          disabled={!additiveIncrement || isSubmittingBid || activeAuctionDetail.status !== "live"}
                          onClick={() => typeof additiveIncrement === "number" && handlePlaceBid(activeAuctionDetail.currentBid + additiveIncrement)}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-40"
                        >
                          Place Total Bid of ₹{(activeAuctionDetail.currentBid + (Number(additiveIncrement) || 0)).toLocaleString("en-IN")}
                        </button>
                      </div>
                    ) : (
                      /* Exact Total Bid Mode */
                      <div className="space-y-3">
                        <label className="text-[11px] text-stone-400 block font-medium">Enter Exact Total Bid (Must exceed ₹{(activeAuctionDetail.currentBid + (activeAuctionDetail.minIncrement || 50000)).toLocaleString("en-IN")}):</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-stone-400 font-mono text-sm">₹</span>
                          <input
                            type="number"
                            min={activeAuctionDetail.currentBid + (activeAuctionDetail.minIncrement || 50000)}
                            step={10000}
                            placeholder={String(activeAuctionDetail.currentBid + (activeAuctionDetail.minIncrement || 50000))}
                            value={exactCustomBid}
                            onChange={(e) => setExactCustomBid(e.target.value ? Number(e.target.value) : "")}
                            className="w-full pl-7 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <button
                          disabled={!exactCustomBid || isSubmittingBid || activeAuctionDetail.status !== "live"}
                          onClick={() => exactCustomBid && handlePlaceBid(Number(exactCustomBid))}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-40"
                        >
                          Submit Exact Bid of ₹{(Number(exactCustomBid) || 0).toLocaleString("en-IN")}
                        </button>
                      </div>
                    )}

                    {/* Instant Buy-Now Option if enabled */}
                    {activeAuctionDetail.buyNowPrice && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-stone-900 border border-emerald-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase">
                            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                            Instant Buy-Now Option
                          </div>
                          <span className="font-mono text-xs font-black text-emerald-300">
                            ₹{activeAuctionDetail.buyNowPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-300">
                          Acquire this lot directly without waiting for the auction countdown.
                        </p>
                        <button
                          onClick={handleBuyNow}
                          disabled={activeAuctionDetail.isPaused || activeAuctionDetail.status === "settled"}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-lg transition shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                        >
                          <DollarSign className="w-4 h-4" /> Instant Buyout (₹{(activeAuctionDetail.buyNowPrice / 100000).toFixed(2)} Lakhs)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bidder Protection Notice */}
                  <div className="mt-5 p-3 rounded-lg bg-stone-900/60 border border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Bids are legally binding. Winning lot includes Auto World Escrow Protection, physical delivery inspection, and state RTO clearance guarantee.
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Collector Leaderboard & Relative Position Console */}
              <AuctionLeaderboard
                auction={activeAuctionDetail}
                currentUser={currentUser}
                onPlaceBid={handlePlaceBid}
                onSignInClick={onSignInClick}
                isSubmittingBid={isSubmittingBid}
              />
            </div>
            </div>

            {/* 5. Dedicated FIFO Auction Drop Lineup Section */}
            <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-stone-900 text-white rounded-md">
                      <ListOrdered className="w-4 h-4" />
                    </span>
                    <h3 className="font-serif font-black text-xl text-stone-900">
                      FIFO Auction Drop Lineup
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    First-In, First-Out drop sequence. Vehicles are scheduled and released strictly in the order they were submitted by consignors.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700">
                    Intermission Gap: <strong>{intermissionGapMinutes} mins</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fifoQueue.map((lot, idx) => {
                  const isUserCar = currentUser && (lot.sellerUid === currentUser.uid || (currentUser.email && lot.sellerEmail?.toLowerCase() === currentUser.email.toLowerCase()));
                  return (
                    <div
                      key={lot.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        isUserCar 
                          ? "bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/30" 
                          : "bg-[#FAF8F5] border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2.5 py-1 text-xs font-mono font-black uppercase rounded-md shadow-xs ${
                          idx === 0 
                            ? "bg-emerald-600 text-white" 
                            : idx === 1 
                            ? "bg-amber-500 text-stone-950" 
                            : "bg-stone-900 text-stone-100"
                        }`}>
                          #{idx + 1} {idx === 0 ? "Next Up / Live" : idx === 1 ? "2nd in Line" : idx === 2 ? "3rd in Line" : `${idx + 1}th in Line`}
                        </span>

                        {isUserCar && (
                          <span className="bg-amber-500 text-stone-950 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-xs">
                            ★ YOUR VEHICLE
                          </span>
                        )}
                      </div>

                      <div className="aspect-video rounded-lg overflow-hidden bg-stone-900 mb-3 relative">
                        <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white font-mono text-[10px] rounded">
                          ₹{(lot.startingBid / 100000).toFixed(2)}L Starting
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-stone-900 text-sm truncate">
                        {lot.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Consignor: {lot.sellerName || "Certified Consignor"}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-500">
                          {lot.status === "live" ? "🔥 Drop Active" : "⏳ In Queue"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAuction(lot);
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }}
                          className="text-stone-900 hover:text-amber-600 font-bold underline cursor-pointer"
                        >
                          Select Lot →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 mt-6">
            <Clock className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800">No Auctions in this Filter</h3>
            <p className="text-stone-500 text-sm mt-1">Check back soon for the next scheduled 24-hour supercar drop.</p>
          </div>
        )}
      </div>

      {/* Propose Car for Flash Auction Modal */}
      <AnimatePresence>
        {isProposeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-lg font-bold font-serif text-stone-900">List for 24-Hour Flash Auction</h3>
                </div>
                <button
                  onClick={() => setIsProposeModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeAuction} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Vehicle Full Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2022 Porsche 911 GT3 RS"
                    value={newAuctionTitle}
                    onChange={(e) => setNewAuctionTitle(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Make</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Porsche / BMW / Ferrari"
                      value={newAuctionMake}
                      onChange={(e) => setNewAuctionMake(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 911 / M3 / F8"
                      value={newAuctionModel}
                      onChange={(e) => setNewAuctionModel(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Starting Bid (₹)</label>
                    <input
                      type="number"
                      required
                      value={newAuctionStartingBid}
                      onChange={(e) => setNewAuctionStartingBid(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Reserve Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newAuctionReservePrice}
                      onChange={(e) => setNewAuctionReservePrice(Number(e.target.value))}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Mileage</label>
                    <input
                      type="text"
                      placeholder="e.g. 6,500 km"
                      value={newAuctionMileage}
                      onChange={(e) => setNewAuctionMileage(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Location / RTO</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai (MH-01)"
                      value={newAuctionLocation}
                      onChange={(e) => setNewAuctionLocation(e.target.value)}
                      className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Primary Showcase Photo URL</label>
                  <input
                    type="url"
                    required
                    value={newAuctionImage}
                    onChange={(e) => setNewAuctionImage(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-sm"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                  ⚡ The auction will run for exactly 24 hours from launch. All bids will be published transparently with anti-sniping protection.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsProposeModalOpen(false)}
                    className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Launch 24h Flash Auction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Official Live Floor Notice Pop-up Modal (Website Editorial Theme) */}
      <AnimatePresence>
        {isNoticeModalOpen && activeAuctionDetail?.floorNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#FAF8F5] max-w-lg w-full border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] relative overflow-hidden font-mono"
            >
              {/* Header */}
              <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold text-xs uppercase tracking-wider">AutoWorld Floor Broadcast</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeAuctionDetail.floorNoticeTimestamp && (
                    <span className="text-[11px] text-stone-300 bg-stone-800 px-2 py-0.5 border border-stone-700">
                      {activeAuctionDetail.floorNoticeTimestamp}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const noticeKey = `${activeAuctionDetail.id}_${activeAuctionDetail.floorNotice}_${activeAuctionDetail.floorNoticeTimestamp || ""}`;
                      setDismissedNoticeKey(noticeKey);
                      setIsNoticeModalOpen(false);
                    }}
                    className="text-stone-400 hover:text-white ml-2 text-base font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-stone-900 text-white shrink-0">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider block">
                      Live Auction Room Alert
                    </span>
                    <h3 className="font-serif font-black text-xl text-stone-900 mt-0.5">
                      Lot #{activeAuctionDetail.id} Notice
                    </h3>
                    <p className="text-xs text-stone-600 font-sans mt-0.5">
                      {activeAuctionDetail.title}
                    </p>
                  </div>
                </div>

                {/* Notice text box */}
                <div className="bg-white border-2 border-stone-300 p-4 shadow-xs">
                  <p className="text-stone-900 text-sm font-semibold leading-relaxed whitespace-pre-wrap font-mono">
                    "{activeAuctionDetail.floorNotice}"
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
                  {isAuthorizedDirector && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNoticeModalOpen(false);
                        setNoticeEditText(activeAuctionDetail.floorNotice || "");
                        setIsEditNoticeModalOpen(true);
                      }}
                      className="py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-900 border border-stone-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-700" /> Edit Notice
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const noticeKey = `${activeAuctionDetail.id}_${activeAuctionDetail.floorNotice}_${activeAuctionDetail.floorNoticeTimestamp || ""}`;
                      setDismissedNoticeKey(noticeKey);
                      setIsNoticeModalOpen(false);
                    }}
                    className="ml-auto py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                  >
                    Acknowledge & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Director Schedule Auction Drop Modal (e.g. Friday 1 AM) */}
      <AnimatePresence>
        {isScheduleModalOpen && isAuthorizedDirector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF8F5] max-w-lg w-full border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] relative overflow-hidden font-mono"
            >
              {/* Header */}
              <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Schedule Drop Date & Time • Lot #{targetScheduleAuctionId || activeAuctionDetail?.id}
                  </span>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="text-stone-400 hover:text-white text-base font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs text-stone-600 font-sans">
                  Configure when this consigned vehicle will automatically go live. Lots are ordered by consignor submission time (FIFO).
                </p>

                {/* 1-Click Friday 1 AM & Popular Quick Presets */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1.5">
                    Quick Scheduling Presets:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Calculate next Friday 1:00 AM
                        const now = new Date();
                        const nextFri = new Date();
                        const dayDiff = (5 - now.getDay() + 7) % 7 || 7;
                        nextFri.setDate(now.getDate() + dayDiff);
                        nextFri.setHours(1, 0, 0, 0);
                        const localIso = new Date(nextFri.getTime() - nextFri.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setCustomScheduleDateTime(localIso);
                      }}
                      className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-stone-900 text-left font-bold text-xs rounded-lg cursor-pointer transition flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="block text-[11px] text-amber-900">🌟 Next Friday 01:00 AM</span>
                        <span className="text-[9px] text-stone-500 font-normal">Auto 24h flash window</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Tomorrow 12:00 PM
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        tom.setHours(12, 0, 0, 0);
                        const localIso = new Date(tom.getTime() - tom.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setCustomScheduleDateTime(localIso);
                      }}
                      className="p-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 text-left font-bold text-xs rounded-lg cursor-pointer transition flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4 text-stone-700 shrink-0" />
                      <div>
                        <span className="block text-[11px]">Tomorrow 12:00 PM</span>
                        <span className="text-[9px] text-stone-500 font-normal">Midday Flash Launch</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                    Or Pick Custom Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={customScheduleDateTime}
                    onChange={(e) => setCustomScheduleDateTime(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-stone-300 rounded-lg text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-[11px] text-stone-600">
                  ⚡ <strong>Auto-Transition Engine:</strong> The system automatically launches this lot when the scheduled start time is reached, respecting the {intermissionGapMinutes}m intermission gap between preceding lots.
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="py-2 px-4 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (targetScheduleAuctionId && customScheduleDateTime) {
                        handleDirectScheduleLot(targetScheduleAuctionId, new Date(customScheduleDateTime).toISOString());
                      } else if (activeAuctionDetail && customScheduleDateTime) {
                        handleDirectScheduleLot(activeAuctionDetail.id, new Date(customScheduleDateTime).toISOString());
                      }
                    }}
                    disabled={!customScheduleDateTime}
                    className="py-2 px-5 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Confirm Schedule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditNoticeModalOpen && activeAuctionDetail && isAuthorizedDirector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF8F5] max-w-lg w-full border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)] relative overflow-hidden font-mono"
            >
              {/* Header */}
              <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-white" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Edit Live Floor Notice • Lot #{activeAuctionDetail.id}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditNoticeModalOpen(false)}
                  className="text-stone-400 hover:text-white text-base font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                    Bulletin Message (Broadcasted live to all viewers)
                  </label>
                  <textarea
                    rows={4}
                    value={noticeEditText}
                    onChange={(e) => setNoticeEditText(e.target.value)}
                    placeholder="e.g. Reserve price has been lowered by the consignor. Final 15 minutes of bidding."
                    className="w-full p-3 bg-white border-2 border-stone-300 text-stone-900 text-xs font-mono focus:outline-none focus:border-stone-900 shadow-inner resize-none"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1.5">
                    Quick Preset Bulletins:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Reserve Price Lowered by Consignor • Available for immediate hammer",
                      "Final 15 Minutes • Anti-sniping auto-extension is active",
                      "100-Point Mechanical Certification Dossier Verified & Attached",
                      "Bidding Pace Active • Verified floor participants only"
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNoticeEditText(preset)}
                        className="text-[10px] py-1 px-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-left cursor-pointer"
                      >
                        + {preset.split("•")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    disabled={isSavingNotice}
                    onClick={() => handleSaveFloorNotice("")}
                    className="py-2 px-3 text-red-700 hover:bg-red-50 border border-red-200 font-bold text-xs uppercase cursor-pointer"
                  >
                    Clear Notice
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditNoticeModalOpen(false)}
                      className="py-2 px-4 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold text-xs uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingNotice}
                      onClick={() => handleSaveFloorNotice(noticeEditText)}
                      className="py-2 px-5 bg-stone-900 hover:bg-stone-800 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      {isSavingNotice ? "Broadcasting..." : "Broadcast Notice"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
