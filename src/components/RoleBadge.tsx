import React from "react";
import { 
  Crown, 
  ShieldCheck, 
  Shield, 
  Boxes, 
  TrendingUp, 
  Headphones, 
  Eye, 
  Landmark, 
  Megaphone, 
  User 
} from "lucide-react";
import { UserRole } from "../lib/userRoles";

interface RoleBadgeProps {
  role: UserRole | string;
  size?: "sm" | "md" | "lg";
  showIconOnly?: boolean;
  className?: string;
}

export const getRoleIcon = (role: string, iconSize: string = "w-3.5 h-3.5") => {
  switch (role) {
    case "Owner":
      return <Crown className={`${iconSize} text-amber-500 fill-amber-400/30 shrink-0`} />;
    case "Co-Owner":
      return <ShieldCheck className={`${iconSize} text-amber-600 shrink-0`} />;
    case "Super Admin":
      return <Shield className={`${iconSize} text-purple-500 shrink-0`} />;
    case "Inventory Manager":
      return <Boxes className={`${iconSize} text-emerald-600 shrink-0`} />;
    case "Sales & Leads Specialist":
    case "Sales & Leads":
      return <TrendingUp className={`${iconSize} text-blue-600 shrink-0`} />;
    case "Support Agent":
      return <Headphones className={`${iconSize} text-cyan-600 shrink-0`} />;
    case "Content Moderator":
      return <Eye className={`${iconSize} text-rose-600 shrink-0`} />;
    case "Finance Specialist":
      return <Landmark className={`${iconSize} text-indigo-600 shrink-0`} />;
    case "Marketing & Social Media Lead":
    case "Marketing & Social Lead":
      return <Megaphone className={`${iconSize} text-pink-600 shrink-0`} />;
    default:
      return <User className={`${iconSize} text-stone-500 shrink-0`} />;
  }
};

export default function RoleBadge({ role, size = "md", showIconOnly = false, className = "" }: RoleBadgeProps) {
  let badgeStyles = "bg-stone-100 text-stone-800 border-stone-300";
  let iconSize = "w-3 h-3";
  let textSize = "text-[10px]";

  if (size === "sm") {
    iconSize = "w-2.5 h-2.5";
    textSize = "text-[8.5px]";
  } else if (size === "lg") {
    iconSize = "w-4 h-4";
    textSize = "text-xs";
  }

  switch (role) {
    case "Owner":
      badgeStyles = "bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/20 text-amber-900 border-amber-500/40 font-black shadow-xs";
      break;
    case "Co-Owner":
      badgeStyles = "bg-amber-600/15 text-amber-950 border-amber-600/40 font-bold";
      break;
    case "Super Admin":
      badgeStyles = "bg-purple-500/15 text-purple-950 border-purple-500/40 font-bold";
      break;
    case "Inventory Manager":
      badgeStyles = "bg-emerald-500/15 text-emerald-950 border-emerald-500/40 font-bold";
      break;
    case "Sales & Leads Specialist":
    case "Sales & Leads":
      badgeStyles = "bg-blue-500/15 text-blue-950 border-blue-500/40 font-bold";
      break;
    case "Support Agent":
      badgeStyles = "bg-cyan-500/15 text-cyan-950 border-cyan-500/40 font-bold";
      break;
    case "Content Moderator":
      badgeStyles = "bg-rose-500/15 text-rose-950 border-rose-500/40 font-bold";
      break;
    case "Finance Specialist":
      badgeStyles = "bg-indigo-500/15 text-indigo-950 border-indigo-500/40 font-bold";
      break;
    case "Marketing & Social Media Lead":
    case "Marketing & Social Lead":
      badgeStyles = "bg-pink-500/15 text-pink-950 border-pink-500/40 font-bold";
      break;
    default:
      badgeStyles = "bg-stone-100 text-stone-700 border-stone-300 font-medium";
      break;
  }

  if (showIconOnly) {
    return (
      <span className={`inline-flex items-center justify-center p-1 rounded border ${badgeStyles} ${className}`} title={role}>
        {getRoleIcon(role, iconSize)}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border uppercase font-mono tracking-wider whitespace-nowrap shrink-0 ${textSize} ${badgeStyles} ${className}`}>
      {getRoleIcon(role, iconSize)}
      <span>{role}</span>
    </span>
  );
}
