import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Modal from "./Modal";
import { 
  Calculator, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Building2, 
  Percent, 
  Calendar, 
  IndianRupee, 
  Sparkles, 
  Lock,
  ArrowRight,
  User,
  Phone,
  MapPin,
  Briefcase
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase";

interface EMICalculatorProps {
  vehiclePrice: number;
  vehicleTitle?: string;
  vehicleId?: string | number;
  className?: string;
}

export const EMICalculator: React.FC<EMICalculatorProps> = ({
  vehiclePrice,
  vehicleTitle = "Selected Vehicle",
  vehicleId = "N/A",
  className = ""
}) => {
  // Slider states
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [interestRate, setInterestRate] = useState<number>(9.5);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("₹50,000 - ₹1,00,000 / month");
  
  // Submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculations
  const downPaymentAmount = Math.round(vehiclePrice * (downPaymentPercent / 100));
  const principal = Math.max(0, vehiclePrice - downPaymentAmount);
  const tenureMonths = tenureYears * 12;
  const monthlyInterestRate = interestRate / (12 * 100);

  let monthlyEMI = 0;
  if (principal > 0 && tenureMonths > 0) {
    if (monthlyInterestRate === 0) {
      monthlyEMI = Math.round(principal / tenureMonths);
    } else {
      const pow = Math.pow(1 + monthlyInterestRate, tenureMonths);
      monthlyEMI = Math.round((principal * monthlyInterestRate * pow) / (pow - 1));
    }
  }

  const totalPayment = monthlyEMI * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - principal);

  const formatINRCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !city.trim()) {
      setErrorMessage("Please fill in all required fields (Name, Phone, City).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const leadPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      monthlyIncome: monthlyIncome,
      vehiclePrice: Math.round(vehiclePrice),
      downPayment: Math.round(downPaymentAmount),
      loanAmount: Math.round(principal),
      tenureYears: Number(tenureYears),
      interestRate: Number(interestRate),
      monthlyEMI: Math.round(monthlyEMI),
      vehicleTitle: String(vehicleTitle),
      vehicleId: String(vehicleId),
      createdAt: new Date().toISOString(),
      status: "new"
    };

    try {
      await addDoc(collection(db, "loanLeads"), leadPayload);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting loan lead:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, "loanLeads");
      } catch (fErr) {
        setErrorMessage("Failed to submit loan request. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setIsSubmitted(false);
    setIsModalOpen(false);
    setErrorMessage(null);
  };

  return (
    <div className={`bg-stone-900 border border-stone-800 rounded-xl p-5 sm:p-6 text-stone-100 shadow-2xl relative ${className}`}>
      {/* Background Subtle Accent */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-widest">
            <Calculator className="w-4 h-4" />
            <span>Instant Finance & EMI Calculator</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            Calculate Monthly Installments
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time Indian vehicle loan estimate for <span className="text-stone-200 font-semibold">{vehicleTitle}</span>
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Vehicle Price</span>
          <span className="text-sm font-bold text-amber-400">{formatINRCurrency(vehiclePrice)}</span>
        </div>
      </div>

      {/* Oversized EMI Output Display */}
      <div className="my-5 p-4 sm:p-5 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 border border-stone-800 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Estimated Monthly Installment (EMI)</span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight mt-1">
            {formatINRCurrency(monthlyEMI)}
            <span className="text-xs font-normal text-stone-400 ml-1.5">/ month</span>
          </div>
        </div>

        <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:items-end text-xs text-stone-300 border-t sm:border-t-0 border-stone-800 pt-3 sm:pt-0">
          <div>
            <span className="text-stone-400 font-mono text-[10px] block uppercase">Loan Principal</span>
            <span className="font-semibold text-white">{formatINRCurrency(principal)}</span>
          </div>
          <div className="sm:mt-2">
            <span className="text-stone-400 font-mono text-[10px] block uppercase">Total Interest</span>
            <span className="font-semibold text-amber-200">{formatINRCurrency(totalInterest)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Range Sliders */}
      <div className="space-y-5 my-6">
        {/* 1. Down Payment Slider */}
        <div className="bg-stone-950/60 p-3.5 rounded-lg border border-stone-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <label htmlFor="downPaymentSlider" className="font-semibold text-stone-200 flex items-center gap-1.5 cursor-pointer">
              <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
              Down Payment ({downPaymentPercent}%)
            </label>
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
              {formatINRCurrency(downPaymentAmount)}
            </span>
          </div>
          <input
            id="downPaymentSlider"
            type="range"
            min={10}
            max={80}
            step={5}
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            aria-label="Down payment percentage"
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
            <span>10% ({formatINRCurrency(Math.round(vehiclePrice * 0.1))})</span>
            <span>50%</span>
            <span>80% ({formatINRCurrency(Math.round(vehiclePrice * 0.8))})</span>
          </div>
        </div>

        {/* 2. Loan Tenure Slider */}
        <div className="bg-stone-950/60 p-3.5 rounded-lg border border-stone-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <label htmlFor="tenureSlider" className="font-semibold text-stone-200 flex items-center gap-1.5 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Loan Tenure ({tenureYears} {tenureYears === 1 ? "Year" : "Years"})
            </label>
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
              {tenureMonths} Months
            </span>
          </div>
          <input
            id="tenureSlider"
            type="range"
            min={1}
            max={7}
            step={1}
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            aria-label="Loan tenure in years"
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
            <span>1 Year (12m)</span>
            <span>3 Years</span>
            <span>5 Years</span>
            <span>7 Years (84m)</span>
          </div>
        </div>

        {/* 3. Interest Rate Slider */}
        <div className="bg-stone-950/60 p-3.5 rounded-lg border border-stone-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <label htmlFor="interestSlider" className="font-semibold text-stone-200 flex items-center gap-1.5 cursor-pointer">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              Interest Rate (p.a.)
            </label>
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
              {interestRate}% per annum
            </span>
          </div>
          <input
            id="interestSlider"
            type="range"
            min={7.5}
            max={15}
            step={0.25}
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            aria-label="Annual interest rate percentage"
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
            <span>7.5% (Prime Bank)</span>
            <span>9.5% (Default)</span>
            <span>15% (Max)</span>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4 text-xs">
        <div className="bg-stone-950 p-2.5 rounded border border-stone-800/60">
          <span className="text-[10px] font-mono text-stone-400 block uppercase">Net Loan Principal</span>
          <span className="font-bold text-white text-xs">{formatINRCurrency(principal)}</span>
        </div>
        <div className="bg-stone-950 p-2.5 rounded border border-stone-800/60">
          <span className="text-[10px] font-mono text-stone-400 block uppercase">Total Interest</span>
          <span className="font-bold text-amber-300 text-xs">{formatINRCurrency(totalInterest)}</span>
        </div>
        <div className="bg-stone-950 p-2.5 rounded border border-stone-800/60 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono text-stone-400 block uppercase">Total Amount Payable</span>
          <span className="font-bold text-amber-400 text-xs">{formatINRCurrency(totalPayment)}</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="mt-6 pt-2">
        <button
          id="applyInstantLoanBtn"
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold uppercase tracking-wider text-xs rounded-lg transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer group"
        >
          <ShieldCheck className="w-4 h-4 text-stone-950" />
          <span>Apply for Instant Loan Approval</span>
          <ArrowRight className="w-4 h-4 text-stone-950 transition-transform group-hover:translate-x-1" />
        </button>
        <p className="text-[10px] text-center text-stone-400 mt-2 font-mono flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-stone-400 shrink-0" />
          <span>Zero processing fee pre-check • Instant bank & insurance referral</span>
        </p>
      </div>

      {/* Lead Capture Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={handleResetModal} containerClassName="w-full max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-stone-900 border border-stone-800 text-stone-100 rounded-xl w-full p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleResetModal}
                className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {!isSubmitted ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-widest mb-1">
                    <Building2 className="w-4 h-4" />
                    <span>Bank & Insurance Pre-Approval</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Apply for Instant Vehicle Financing
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 mb-5">
                    Submit your details to receive pre-approved loan offers from top Indian lenders (HDFC, ICICI, SBI) for <span className="text-amber-400 font-semibold">{vehicleTitle}</span>.
                  </p>

                  {/* Loan Summary Badge in Modal */}
                  <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 mb-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-mono block">Calculated EMI</span>
                      <span className="text-amber-400 font-extrabold text-base">{formatINRCurrency(monthlyEMI)} <span className="text-[10px] text-stone-400 font-normal">/ mo</span></span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 text-[10px] uppercase font-mono block">Loan Principal</span>
                      <span className="text-stone-200 font-bold">{formatINRCurrency(principal)} ({tenureYears} yrs)</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-200 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  {/* Lead Capture Form */}
                  <form onSubmit={handleSubmitLead} className="space-y-4">
                    <div>
                      <label htmlFor="leadFullName" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Full Name *
                      </label>
                      <input
                        id="leadFullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 text-white text-xs rounded focus:outline-none focus:border-amber-500 transition placeholder:text-stone-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="leadPhone" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          Phone Number *
                        </label>
                        <input
                          id="leadPhone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 text-white text-xs rounded focus:outline-none focus:border-amber-500 transition placeholder:text-stone-400"
                        />
                      </div>

                      <div>
                        <label htmlFor="leadCity" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          City / Location *
                        </label>
                        <input
                          id="leadCity"
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai / Delhi / Bengaluru"
                          className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 text-white text-xs rounded focus:outline-none focus:border-amber-500 transition placeholder:text-stone-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="leadIncome" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        Monthly Income Range
                      </label>
                      <select
                        id="leadIncome"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 text-white text-xs rounded focus:outline-none focus:border-amber-500 transition cursor-pointer"
                      >
                        <option value="Under ₹30,000 / month">Under ₹30,000 / month</option>
                        <option value="₹30,000 - ₹50,000 / month">₹30,000 - ₹50,000 / month</option>
                        <option value="₹50,000 - ₹1,00,000 / month">₹50,000 - ₹1,00,000 / month</option>
                        <option value="₹1,00,000 - ₹2,50,000 / month">₹1,00,000 - ₹2,50,000 / month</option>
                        <option value="Above ₹2,50,000 / month">Above ₹2,50,000 / month</option>
                      </select>
                    </div>

                    <div className="pt-3">
                      <button
                        id="submitLoanLeadBtn"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold uppercase tracking-wider text-xs rounded transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                      >
                        {isSubmitting ? (
                          <span>Processing Application...</span>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-stone-950" />
                            <span>Submit Financing Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                /* Success State */
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  
                  <h3 className="text-2xl font-extrabold text-white">
                    Application Received
                  </h3>

                  <p className="text-sm text-stone-300 max-w-sm mx-auto leading-relaxed">
                    Our finance team will contact you shortly with pre-approved loan options & custom insurance quotes.
                  </p>

                  <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 text-left text-xs max-w-sm mx-auto space-y-1.5 text-stone-400">
                    <div className="flex justify-between">
                      <span>Applicant:</span>
                      <span className="text-white font-semibold">{fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vehicle:</span>
                      <span className="text-amber-400 font-semibold truncate max-w-[180px]">{vehicleTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requested EMI:</span>
                      <span className="text-emerald-400 font-bold">{formatINRCurrency(monthlyEMI)} / mo</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleResetModal}
                      className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold uppercase tracking-wider rounded transition cursor-pointer"
                    >
                      Done & Return to Vehicle
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};
