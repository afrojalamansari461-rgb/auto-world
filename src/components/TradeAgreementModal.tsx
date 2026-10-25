import React from "react";
import { createPortal } from "react-dom";
import { X, FileText, Download, Printer, ShieldCheck, Award, CheckCircle2 } from "lucide-react";
import { ExchangeRequest } from "../types";

interface TradeAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchange: ExchangeRequest | null;
}

export const TradeAgreementModal: React.FC<TradeAgreementModalProps> = ({
  isOpen,
  onClose,
  exchange
}) => {
  if (!isOpen || !exchange) return null;

  const offered = exchange.offeredVehicle;
  const agreementId = `AW-BARTER-${exchange.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[135] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-300 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                  Certified P2P Vehicle Barter & Exchange Agreement
                </h3>
              </div>
              <p className="text-xs text-stone-400 font-mono">
                Doc Ref: {agreementId} • Standard Indian RTO Barter Contract
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close trade agreement modal"
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-stone-900 font-serif leading-relaxed text-xs sm:text-sm bg-[#FCFBF9]">
          {/* Letterhead */}
          <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-stone-950">
                AUTO WORLD
              </h2>
              <p className="text-xs font-sans text-stone-600 uppercase tracking-wider font-semibold">
                Autonomous Certified Automotive Exchange & B2C/P2P Vault
              </p>
            </div>
            <div className="text-left sm:text-right font-sans text-xs text-stone-600">
              <p><strong className="text-stone-900">Agreement Date:</strong> {dateStr}</p>
              <p><strong className="text-stone-900">Jurisdiction:</strong> Motor Vehicles Act, 1988 (India)</p>
            </div>
          </div>

          {/* Parties & Vehicles Involved */}
          <div className="space-y-3 font-sans">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
              1. SCHEDULE OF VEHICLES AND COUNTERPARTIES
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-stone-100 rounded-lg border border-stone-200 text-xs">
                <span className="text-stone-500 font-bold uppercase block text-[10px]">Party A (Listing Trade Consignor)</span>
                <p className="font-bold text-stone-900 text-sm mt-0.5">{exchange.creatorName}</p>
                <p className="text-stone-600">Location: {exchange.location}</p>
                <div className="mt-2 pt-2 border-t border-stone-300">
                  <p className="font-bold text-stone-900">Vehicle: {offered.year} {offered.make} {offered.model}</p>
                  <p className="text-stone-600">Mileage: {offered.mileage} • Valuation: ₹{(offered.valuation / 100000).toFixed(2)} Lakhs</p>
                </div>
              </div>

              <div className="p-3 bg-stone-100 rounded-lg border border-stone-200 text-xs">
                <span className="text-stone-500 font-bold uppercase block text-[10px]">Party B (Counter-Trade Proposer)</span>
                <p className="font-bold text-stone-900 text-sm mt-0.5">Certified Auto World Verified Counter-Party</p>
                <p className="text-stone-600">Pan-India Transferable Registry</p>
                <div className="mt-2 pt-2 border-t border-stone-300">
                  <p className="font-bold text-stone-900">Target Match: {exchange.desiredVehicle.targetMake || "Approved Trade Match"}</p>
                  <p className="text-stone-600">Cash Delta: ₹{(exchange.cashDelta / 100000).toFixed(2)} Lakhs ({exchange.cashDirection === "pay_difference" ? "Party A Pays" : "Party A Receives"})</p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2 text-xs font-sans text-stone-700">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 border-b border-stone-300 pb-1">
              2. ESSENTIAL COVENANTS & RTO OBLIGATIONS
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>Both parties guarantee clear title, valid registration certificate (RC), and active insurance policy for their respective vehicle.</li>
              <li>Form 28 (NOC), Form 29 (Notice of Transfer), and Form 30 (Application for Transfer) shall be executed simultaneously upon vehicle physical exchange.</li>
              <li>Neither vehicle has outstanding bank hypothecation without formal NOC from the financing institution.</li>
              <li>Auto World 100-Point Certified Inspection status is accepted as mutual baseline condition parameter.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-stone-300 grid grid-cols-2 gap-8 font-sans">
            <div>
              <div className="h-12 border-b border-stone-400 flex items-end pb-1">
                <span className="font-mono text-xs text-stone-500 italic">Signed digitally via Auto World Auth</span>
              </div>
              <p className="text-xs font-bold text-stone-900 mt-1">Authorized Party A Signature</p>
              <p className="text-[10px] text-stone-500">{exchange.creatorName}</p>
            </div>
            <div>
              <div className="h-12 border-b border-stone-400 flex items-end pb-1">
                <span className="font-mono text-xs text-stone-500 italic">Verified Counter-Party Signature</span>
              </div>
              <p className="text-xs font-bold text-stone-900 mt-1">Authorized Party B Signature</p>
              <p className="text-[10px] text-stone-500">Auto World Certified Member</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
