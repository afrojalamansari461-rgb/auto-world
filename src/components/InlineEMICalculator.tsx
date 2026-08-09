import React, { useState } from "react";
import { Calculator, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { fireCelebrationConfetti } from "./CelebrationAnimation";

interface InlineEMICalculatorProps {
  vehiclePrice: number;
  vehicleTitle?: string;
  vehicleId?: number;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const InlineEMICalculator: React.FC<InlineEMICalculatorProps> = ({
  vehiclePrice,
  vehicleTitle = "Selected Vehicle",
  vehicleId,
  showToast,
}) => {
  const defaultDownPayment = Math.round(vehiclePrice * 0.2);
  const [downPayment, setDownPayment] = useState<number>(defaultDownPayment);
  const [interestRate, setInterestRate] = useState<number>(9.5); // % per annum
  const [tenureYears, setTenureYears] = useState<number>(5); // 5 years default
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [applicantName, setApplicantName] = useState<string>("");
  const [applicantPhone, setApplicantPhone] = useState<string>("");

  const loanPrincipal = Math.max(0, vehiclePrice - downPayment);
  const tenureMonths = tenureYears * 12;
  const monthlyRate = interestRate / 12 / 100;

  // Monthly EMI calculation formula
  const monthlyEMI =
    monthlyRate > 0 && tenureMonths > 0 && loanPrincipal > 0
      ? Math.round(
          (loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1)
        )
      : Math.round(loanPrincipal / (tenureMonths || 1));

  const totalPayment = monthlyEMI * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - loanPrincipal);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleApplyFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantPhone.trim()) {
      showToast?.("Please enter a valid phone number for loan pre-approval.", "error");
      return;
    }

    setIsApplying(true);
    try {
      const refCode = `FIN-${Math.floor(100000 + Math.random() * 900000)}`;
      const financeLead = {
        refCode,
        vehicleTitle,
        vehicleId: vehicleId || null,
        vehiclePrice,
        downPayment,
        loanPrincipal,
        interestRate,
        tenureYears,
        monthlyEMI,
        applicantName: applicantName.trim() || "Valued Customer",
        applicantPhone: applicantPhone.trim(),
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp(),
        status: "submitted",
      };

      if (db) {
        await addDoc(collection(db, "loan_leads"), financeLead);
      }

      // Local persistence fallback
      const existing = JSON.parse(localStorage.getItem("autoWorld_loan_leads") || "[]");
      existing.unshift(financeLead);
      localStorage.setItem("autoWorld_loan_leads", JSON.stringify(existing));

      setAppliedSuccess(true);
      fireCelebrationConfetti();
      showToast?.(`Loan pre-approval application #${refCode} submitted!`, "success");
    } catch (err) {
      console.error(err);
      showToast?.("Application registered locally. Our finance desk will call you.", "info");
      setAppliedSuccess(true);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 sm:p-6 my-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-250">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Calculator className="w-4.5 h-4.5 text-amber-700" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              Instant EMI & Finance Calculator
            </h4>
            <p className="text-[11px] text-stone-500">
              Estimate monthly payments for {vehicleTitle}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
          Lowest Interest 8.5% p.a.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sliders & Inputs */}
        <div className="lg:col-span-7 space-y-4">
          {/* Vehicle Price & Down Payment */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-stone-700 mb-1.5">
              <span>Down Payment Amount</span>
              <span className="text-amber-700 font-extrabold">
                {formatINR(downPayment)} ({Math.round((downPayment / vehiclePrice) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={Math.round(vehiclePrice * 0.1)}
              max={Math.round(vehiclePrice * 0.8)}
              step={10000}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-amber-600 h-2 bg-stone-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-500 mt-1">
              <span>Min: 10% ({formatINR(vehiclePrice * 0.1)})</span>
              <span>Max: 80% ({formatINR(vehiclePrice * 0.8)})</span>
            </div>
          </div>

          {/* Loan Tenure */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-stone-700 mb-1.5">
              <span>Loan Tenure (Years)</span>
              <span className="text-stone-950 font-extrabold">
                {tenureYears} Years ({tenureMonths} Months)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 5, 7].map((yrs) => (
                <button
                  key={yrs}
                  type="button"
                  onClick={() => setTenureYears(yrs)}
                  className={`py-1.5 text-xs font-bold rounded-md border transition cursor-pointer ${
                    tenureYears === yrs
                      ? "bg-stone-950 text-white border-stone-950 shadow-xs"
                      : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                  }`}
                >
                  {yrs} Yr{yrs > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-stone-700 mb-1.5">
              <span>Expected Annual Interest Rate</span>
              <span className="text-stone-950 font-extrabold">{interestRate}% p.a.</span>
            </div>
            <input
              type="range"
              min={8.0}
              max={16.0}
              step={0.25}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-stone-900 h-2 bg-stone-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-500 mt-1">
              <span>Bank Standard: 8.5% - 10.5%</span>
              <span>NBFC / Premium: 11% - 14%</span>
            </div>
          </div>
        </div>

        {/* Calculated Results & Lead Box */}
        <div className="lg:col-span-5 bg-white border border-stone-300 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
              Estimated Monthly EMI
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-950 my-1">
              {formatINR(monthlyEMI)}
              <span className="text-xs font-normal text-stone-500"> / month</span>
            </div>

            <div className="space-y-2 my-4 pt-3 border-t border-stone-200 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Vehicle Ex-Showroom / Listing:</span>
                <span className="font-semibold text-stone-900">{formatINR(vehiclePrice)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Principal Loan Amount:</span>
                <span className="font-semibold text-stone-900">{formatINR(loanPrincipal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Total Interest Payable:</span>
                <span className="font-semibold text-amber-700">{formatINR(totalInterest)}</span>
              </div>
              <div className="flex justify-between text-stone-900 font-bold pt-2 border-t border-stone-200">
                <span>Total Amount Paid (Loan + Down):</span>
                <span>{formatINR(totalPayment + downPayment)}</span>
              </div>
            </div>
          </div>

          {/* Application Form */}
          {!appliedSuccess ? (
            <form onSubmit={handleApplyFinance} className="mt-2 pt-3 border-t border-stone-200 space-y-2">
              <span className="text-[11px] font-bold text-stone-800 block">
                Get Instant Pre-Approval Offer:
              </span>
              <input
                type="text"
                placeholder="Your Full Name"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Mobile Number *"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <button
                  type="submit"
                  disabled={isApplying}
                  className="px-4 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold rounded-md transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 text-xs mt-2 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pre-Approval Applied!</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Our banking officer will review your score and contact you at {applicantPhone} within 2 hours.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-3 pt-2 border-t border-stone-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>0% processing fee discount available with partner banks (HDFC, ICICI, SBI).</span>
          </div>
        </div>
      </div>
    </div>
  );
};
