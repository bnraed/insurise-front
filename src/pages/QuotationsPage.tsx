import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Eye,
  FileCheck,
  Loader2,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { quotationsApi, contractsApi, agenciesApi } from "@/services/api";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate, getStatusLabel, todayStr } from "@/utils/helpers";
import type { Quotation } from "@/types";
import SubscriptionWizard from "@/components/SubscriptionWizard";
import DatePicker from "@/components/ui/DatePicker";

// ────────────────────────────────────────────────────────────────
// FORMULE — alignée sur QuotationService.java :
//
//   cotisation        = Σ(taux garanties pack) × marketValue / 100
//   sousTotal         = basePremium + cotisation
//   estimatedPremium  = sousTotal × bonusMalus
//   installment       = estimatedPremium / nb_versements
// ────────────────────────────────────────────────────────────────
function calcPrime(p: {
  basePremium: number;
  marketValue: number;
  guaranteeTaux: number; // somme des taux des garanties du pack (%)
  bonusMalus: number; // coefficient  ex: 1.00 / 0.80 / 1.25
  installmentType: string;
}) {
  const cotisation =
    Math.round(((p.marketValue * p.guaranteeTaux) / 100) * 100) / 100;
  const sousTotal = Math.round((p.basePremium + cotisation) * 100) / 100;
  const estimatedPremium = Math.round(sousTotal * p.bonusMalus * 100) / 100;
  const bonusMalusEffect =
    Math.round((estimatedPremium - sousTotal) * 100) / 100;
  const freq: Record<string, number> = {
    ANNUAL: 1,
    SEMI_ANNUAL: 2,
    QUARTERLY: 4,
    MONTHLY: 12,
  };
  const installment =
    Math.round((estimatedPremium / (freq[p.installmentType] || 1)) * 100) / 100;
  return {
    cotisation,
    sousTotal,
    estimatedPremium,
    bonusMalusEffect,
    installment,
  };
}

const FREQ_LABELS: Record<string, string> = {
  ANNUAL: "Annuel",
  SEMI_ANNUAL: "Semestriel",
  QUARTERLY: "Trimestriel",
  MONTHLY: "Mensuel",
};
const USAGE_OPTIONS = [
  { value: "PERSONNEL", label: "Usage personnel" },
  { value: "PROFESSIONNEL", label: "Usage professionnel" },
  { value: "COMMERCIAL", label: "Véhicule commercial" },
  { value: "TAXI", label: "Taxi / Transport" },
];

interface Agency {
  id: number;
  agencyCode: string;
  agencyName: string;
}

function SecHeader({
  title,
  sub,
  open,
  toggle,
}: {
  title: string;
  sub?: string;
  open: boolean;
  toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center justify-between py-2 mb-3 border-b-2 border-[#1E3A5F]/10"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-[#1E3A5F]">{title}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      {open ? (
        <ChevronUp size={16} className="text-gray-400" />
      ) : (
        <ChevronDown size={16} className="text-gray-400" />
      )}
    </button>
  );
}

export default function QuotationsPage() {
  const {
    quotations,
    contracts,
    users,
    vehicles,
    packs,
    guarantees,
    getUserById,
    getVehicleById,
    getPackByCode,
    refreshQuotations,
    refreshContracts,
    showToast,
    currentUser,
  } = useAppState();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewItem, setViewItem] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<
    Partial<Quotation> & {
      usageVehicle?: string;
      bonusMalusCoef?: string;
      licenseDate?: string;
      addrNumRue?: string;
      addrNomRue?: string;
      addrCodePostal?: string;
      marketValueOverride?: number;
      listPriceOverride?: number;
      totalAmountOverride?: string;
      feeAmountOverride?: string;
      netAmountOverride?: string;
    }
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [wizardQuotation, setWizardQuotation] = useState<Quotation | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [openSec, setOpenSec] = useState({
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: false,
  });
  const [marketValueStr, setMarketValueStr] = useState("");
  const [listPriceStr, setListPriceStr] = useState("");
  const tog = (k: keyof typeof openSec) =>
    setOpenSec((p) => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    agenciesApi
      .getActive()
      .then((r) => setAgencies(r.data || []))
      .catch(() => {});
  }, []);

  // ── Filtrage ────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      quotations.filter((q) => {
        const s = search.toLowerCase();
        const u = getUserById(q.userId);
        const v = getVehicleById(q.vehicleId);
        return (
          (!s ||
            q.quoteNumber.toLowerCase().includes(s) ||
            (u && `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)) ||
            (v && v.registrationNumber.toLowerCase().includes(s))) &&
          (!statusFilter || q.status === statusFilter)
        );
      }),
    [quotations, search, statusFilter, getUserById, getVehicleById],
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // ── Données contextuelles ───────────────────────────────────────
  const availableVehicles = current.userId
    ? vehicles.filter((v) => v.userId === Number(current.userId))
    : vehicles;
  const selectedVehicle = current.vehicleId
    ? getVehicleById(Number(current.vehicleId))
    : null;
  const selectedPack = current.packCode
    ? getPackByCode(current.packCode)
    : null;
  const optionalGuarantees = guarantees.filter(
    (g) => g.type === "OPTIONAL" && g.isActive,
  );

  // ── Somme des taux des garanties du pack sélectionné ───────────
  const packTaux = useMemo(() => {
    if (!selectedPack) return 0;
    const codes = selectedPack.guarantees || [];
    return guarantees
      .filter((g) => codes.includes(g.codeGarantie) && g.isActive)
      .reduce((sum, g) => sum + parseFloat(g.taux || "0"), 0);
  }, [selectedPack, guarantees]);

  // ── Somme des taux des garanties optionnelles sélectionnées ────
  const optTaux = useMemo(
    () =>
      guarantees
        .filter((g) => selectedOptionals.includes(g.codeGarantie))
        .reduce((sum, g) => sum + parseFloat(g.taux || "0"), 0),
    [selectedOptionals, guarantees],
  );

  // ── Calcul de la prime (miroir exact du backend) ────────────────
  const prime = useMemo(() => {
    if (!selectedPack || !selectedVehicle) return null;
    const mv =
      marketValueStr !== ""
        ? Number(marketValueStr)
        : Number(selectedVehicle.marketValue) || 0;
    return calcPrime({
      basePremium: Number(selectedPack.basePremium) || 0,
      marketValue: mv,
      guaranteeTaux: packTaux + optTaux,
      bonusMalus:
        parseFloat(
          current.bonusMalusCoef || selectedVehicle.bonusMalus || "1",
        ) || 1,
      installmentType: current.installmentType || "ANNUAL",
    });
  }, [
    selectedPack,
    selectedVehicle,
    packTaux,
    optTaux,
    current.bonusMalusCoef,
    current.installmentType,
    marketValueStr,
  ]);

  // ── Soumission ──────────────────────────────────────────────────
  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    if (!current.userId) errs.userId = "Requis";
    if (!current.vehicleId) errs.vehicleId = "Requis";
    if (!current.packCode) errs.packCode = "Requis";
    if (!current.effectiveDate) errs.effectiveDate = "Requise";
    if (!current.expirationDate) errs.expirationDate = "Requise";
    if (!current.installmentType) errs.installmentType = "Requis";
    if (!current.agencyCode) errs.agencyCode = "Requise";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const vehicle = getVehicleById(Number(current.vehicleId));
    setSaving(true);
    try {
      // ── Construire les objets garanties depuis le pack sélectionné ──────
      const packCodes = selectedPack?.guarantees || [];
      const packGuaranteeItems = guarantees
        .filter((g) => packCodes.includes(g.codeGarantie))
        .map((g, i) => ({
          id: g.id,
          guaranteeCode: g.codeGarantie,
          guaranteeLabel: g.libelleGarantie,
          insuredCapital: g.capitalAssure || "",
          deductible: g.franchise || "",
          rate: g.taux || "0",
          type: "pack",
          displayOrder: i + 1,
        }));
      const optGuaranteeItems = guarantees
        .filter((g) => selectedOptionals.includes(g.codeGarantie))
        .map((g, i) => ({
          id: g.id,
          guaranteeCode: g.codeGarantie,
          guaranteeLabel: g.libelleGarantie,
          insuredCapital: g.capitalAssure || "",
          deductible: g.franchise || "",
          rate: g.taux || "0",
          type: "optionnelle",
          displayOrder: i + 1,
        }));

      const mv =
        marketValueStr !== ""
          ? Number(marketValueStr)
          : (Number(vehicle?.marketValue) ?? 0);
      const cv =
        listPriceStr !== ""
          ? Number(listPriceStr)
          : (Number(vehicle?.listPrice) ?? 0);
      const fpRaw = vehicle?.fiscalHorsepower?.replace(" CV", "") || "";

      // Fractionnement → contractSplitType
      const splitMap: Record<string, string> = {
        ANNUAL: "ANNUAL",
        SEMI_ANNUAL: "SEMESTER",
        QUARTERLY: "QUARTERLY",
        MONTHLY: "MONTHLY",
      };

      await quotationsApi.create({
        userId: Number(current.userId),
        agencyCode: current.agencyCode!,

        // Adresse souscripteur
        userAddress: {
          numRue: Number((current as any).addrNumRue) || 0,
          nomRue: (current as any).addrNomRue || "",
          codePostal: (current as any).addrCodePostal || "",
          contactParDefaut: true,
        },

        // Détails contrat
        contractDetails: {
          productType: "AUTO",
          contractGenerated: "false",
          contractNature:
            current.renewalType === "AUTOMATIC" ? "RENEWABLE" : "MANUAL",
          contractSplitType:
            splitMap[current.installmentType || "ANNUAL"] || "ANNUAL",
        },

        // Montants — utilisés tels quels si saisis, sinon estimés depuis la prime
        paymentDetails: {
          totalAmount:
            (current as any).totalAmountOverride != null
              ? String((current as any).totalAmountOverride)
              : String(prime?.estimatedPremium || 0),
          feeAmount:
            (current as any).feeAmountOverride != null
              ? String((current as any).feeAmountOverride)
              : "0",
          netAmount:
            (current as any).netAmountOverride != null
              ? String((current as any).netAmountOverride)
              : String(prime?.sousTotal || 0),
        },

        // Informations du devis
        quotation: {
          creationDate: todayStr(),
          effectiveDate: current.effectiveDate!,
          expirationDate: current.expirationDate!,
          paymentFrequency: current.installmentType!,
          renewalType: current.renewalType || "AUTOMATIC",
          status: "PENDING",
        },

        // Garanties pack — objets complets
        guarantees: packGuaranteeItems,

        // Garanties optionnelles — objets complets
        optionalGuarantees: optGuaranteeItems,

        // Profil véhicule — format complet aligné sur le payload cible
        vehicleProfile: {
          registrationNumber: vehicle?.registrationNumber || "",
          brand: vehicle?.make || "",
          model: vehicle?.make || "",
          year: vehicle?.firstRegistrationDate
            ? new Date(vehicle.firstRegistrationDate).getFullYear().toString()
            : "",
          power: vehicle?.horsepower || "",
          usefulLoad: vehicle?.payload ? vehicle.payload + "kg" : "",
          totalWeight: vehicle?.grossVehicleWeight
            ? vehicle.grossVehicleWeight + "kg"
            : "",
          numberOfSeats: Number(vehicle?.seatingCapacity) || 5,
          firstRegistrationDate: vehicle?.firstRegistrationDate || "",
          vehicleType: vehicle?.vehicleType || "",
          vehicleNature: vehicle?.vehicleNature || "",
          marketValue: mv,
          serialNumber: vehicle?.vin || "",
          vin: vehicle?.vin || "",
          bonusMalus: current.bonusMalusCoef || vehicle?.bonusMalus || "1.00",
          mandatorySubscriptionIndicator: true,
          manufacturer: vehicle?.manufacturer || "",
          fiscalPower: Number(fpRaw) || 0,
          catalogValue: cv,
          replacementValue: cv,
          vehicleAge: 0,
          horsepower: Number(vehicle?.horsepower) || 0,
          drivingLicenseIssueDate: (current as any).licenseDate || "",
        },

        // Pack
        pack: { packCode: current.packCode! },
      });
      showToast("Devis créé avec succès");
      await refreshQuotations();
      setModalOpen(false);
      setCurrent({});
      setSelectedOptionals([]);
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erreur création devis", "error");
    } finally {
      setSaving(false);
    }
  };

  const convertToContract = async (q: Quotation) => {
    setSaving(true);
    try {
      const vehicle = getVehicleById(q.vehicleId);
      const pack = getPackByCode(q.packCode);

      // ── Garanties pack incluses dans le devis ──────────────────
      const packCodes = pack?.guarantees || [];
      const packGuaranteeItems = guarantees
        .filter((g) => packCodes.includes(g.codeGarantie))
        .map((g, i) => ({
          id: g.id,
          guaranteeCode: g.codeGarantie,
          guaranteeLabel: g.libelleGarantie,
          insuredCapital: g.capitalAssure || "",
          deductible: g.franchise || "",
          rate: g.taux || "0",
          type: "pack",
          displayOrder: i + 1,
        }));

      // ── Garanties optionnelles (coverages du devis) ────────────
      const optCodes = q.coverages || [];
      const optGuaranteeItems = guarantees
        .filter((g) => optCodes.includes(g.id) && g.type === "OPTIONAL")
        .map((g, i) => ({
          id: g.id,
          guaranteeCode: g.codeGarantie,
          guaranteeLabel: g.libelleGarantie,
          insuredCapital: g.capitalAssure || "",
          deductible: g.franchise || "",
          rate: g.taux || "0",
          type: "optionnelle",
          displayOrder: i + 1,
        }));

      const mv = Number(vehicle?.marketValue) || 0;
      const cv = Number(vehicle?.listPrice) || 0;
      const fpRaw = vehicle?.fiscalHorsepower?.replace(" CV", "") || "";

      const splitMap: Record<string, string> = {
        ANNUAL: "ANNUAL",
        SEMI_ANNUAL: "SEMESTER",
        QUARTERLY: "QUARTERLY",
        MONTHLY: "MONTHLY",
      };

      await contractsApi.create({
        quotationId: q.quoteNumber,
        effectiveDate: q.effectiveDate,
        paymentFrequency: q.installmentType,
        paymentMethod: "BANK_TRANSFER",

        // ── Champs payload complets hérités du devis ──────────────
        branch: "AUTO",
        branchCode: "AU01",
        subscriberIndicator: true,
        insuredIndicator: false,
        contractualDueDate: q.expirationDate,

        // Adresse souscripteur (dénormalisée depuis devis)
        userAddress: {
          numRue: q.addrNumRue || 0,
          nomRue: q.addrNomRue || "",
          codePostal: q.addrCodePostal || "",
          contactParDefaut: true,
        },

        // Détails contrat
        contractDetails: {
          productType: q.productType || "AUTO",
          contractGenerated: "false",
          contractNature:
            q.contractNature ||
            (q.renewalType === "AUTOMATIC" ? "RENEWABLE" : "MANUAL"),
          contractSplitType:
            splitMap[q.installmentType || "ANNUAL"] || "ANNUAL",
        },

        // Montants réels depuis le devis
        paymentDetails: {
          totalAmount: String(q.totalAmount ?? q.estimatedPremium ?? 0),
          feeAmount: String(q.feeAmount ?? 0),
          netAmount: String(q.netAmount ?? q.estimatedPremium ?? 0),
        },

        // Profil véhicule complet
        vehicleProfile: vehicle
          ? {
              registrationNumber: vehicle.registrationNumber || "",
              brand: vehicle.make || "",
              model: vehicle.make || "",
              year: vehicle.firstRegistrationDate
                ? new Date(vehicle.firstRegistrationDate)
                    .getFullYear()
                    .toString()
                : "",
              power: vehicle.horsepower || "",
              usefulLoad: vehicle.payload ? vehicle.payload + "kg" : "",
              totalWeight: vehicle.grossVehicleWeight
                ? vehicle.grossVehicleWeight + "kg"
                : "",
              numberOfSeats: Number(vehicle.seatingCapacity) || 5,
              firstRegistrationDate: vehicle.firstRegistrationDate || "",
              vehicleType: vehicle.vehicleType || "",
              vehicleNature: vehicle.vehicleNature || "",
              marketValue: mv,
              serialNumber: vehicle.vin || "",
              bonusMalus: vehicle.bonusMalus || "1.00",
              mandatorySubscriptionIndicator: true,
              manufacturer: vehicle.manufacturer || "",
              fiscalPower: Number(fpRaw) || 0,
              catalogValue: cv,
              replacementValue: cv,
              vehicleAge: 0,
              horsepower: Number(vehicle.horsepower) || 0,
              vin: vehicle.vin || "",
            }
          : undefined,

        // Garanties pack
        guarantees: packGuaranteeItems,

        // Garanties optionnelles
        optionalGuarantees: optGuaranteeItems,

        // Pack
        pack: { packCode: q.packCode },
        // ─────────────────────────────────────────────────────────
      });
      showToast(`Contrat émis depuis ${q.quoteNumber}`);
      await Promise.all([refreshQuotations(), refreshContracts()]);
    } catch (e: any) {
      showToast(e.response?.data?.message || e.response?.data?.error || "Erreur création contrat", "error");
    } finally {
      setSaving(false);
    }
  };

  const viewed =
    viewItem !== null ? quotations.find((q) => q.id === viewItem) : null;

  const openCreate = () => {
    setCurrent({
      renewalType: "AUTOMATIC",
      installmentType: "ANNUAL",
      creationDate: todayStr(),
      effectiveDate: todayStr(),
      licenseDate: "",
    });
    setSelectedOptionals([]);
    setErrors({});
    setOpenSec({ s1: true, s2: true, s3: true, s4: true, s5: false });
    setMarketValueStr("");
    setListPriceStr("");
    setModalOpen(true);
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]";
  const F = ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );

  // ── RENDU ───────────────────────────────────────────────────────
  return (
    <div className="pb-24">
      {/* Bouton nouveau devis */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#E8003D] text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus size={18} /> Nouveau devis
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          {
            label: "Total",
            value: quotations.length,
            color: "bg-gray-100 text-gray-700",
          },
          {
            label: "En attente",
            value: quotations.filter((q) => q.status === "PENDING").length,
            color: "bg-blue-100 text-blue-700",
          },
          {
            label: "Acceptés",
            value: quotations.filter((q) => q.status === "ACCEPTED").length,
            color: "bg-green-100 text-green-700",
          },
          {
            label: "Expirés",
            value: quotations.filter((q) => q.status === "EXPIRED").length,
            color: "bg-red-100 text-red-700",
          },
        ].map((s) => (
          <span
            key={s.label}
            className={`${s.color} text-xs px-3 py-1.5 rounded-full font-medium`}
          >
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {/* Recherche + filtre */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par N devis, client, véhicule..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8003D]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {["PENDING", "ACCEPTED", "EXPIRED", "ABANDONED"].map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {[
                  "N Devis",
                  "Client",
                  "Véhicule",
                  "Pack",
                  "Prime est.",
                  "Fréquence",
                  "Statut",
                  "Créé le",
                  "Expire le",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((q) => {
                const u = getUserById(q.userId);
                const v = getVehicleById(q.vehicleId);
                const p = getPackByCode(q.packCode);
                const hasContract = contracts.some(
                  (c) => c.quotationId === q.quoteNumber,
                );
                return (
                  <tr
                    key={q.id}
                    className="border-b border-gray-100 hover:bg-gray-50 text-sm"
                  >
                    <td className="px-3 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">
                      {q.quoteNumber}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {u ? `${u.firstName} ${u.lastName}` : "--"}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {v ? `${v.make} ${v.registrationNumber}` : "--"}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {p?.packLabel || q.packCode}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">
                      {q.estimatedPremium} DT
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                        {FREQ_LABELS[q.installmentType] || q.installmentType}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        label={getStatusLabel(q.status)}
                        status={q.status}
                      />
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(q.creationDate)}
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(q.expirationDate)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewItem(q.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <Eye size={16} />
                        </button>
                        {q.status === "PENDING" && !hasContract && (
                          <button
                            onClick={() => setWizardQuotation(q)}
                            disabled={saving}
                            className="p-1 text-green-700 bg-green-50 hover:bg-green-100 rounded text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-60"
                          >
                            <FileCheck size={14} /> Contrat
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    Aucun devis trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          MODAL — Fiche de tarification assurance auto
          ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau devis — Assurance Auto"
        subtitle="Fiche de tarification"
        size="lg"
      >
        <div className="space-y-5">
          {/* ─── S1 : Souscripteur & Agence ─────────────────────── */}
          <div>
            <SecHeader
              title="1. Souscripteur & Agence"
              sub="Identification du client et agence émettrice"
              open={openSec.s1}
              toggle={() => tog("s1")}
            />
            {openSec.s1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <F label="Client *" error={errors.userId}>
                    <select
                      value={current.userId || ""}
                      onChange={(e) => {
                        const uid = Number(e.target.value);
                        const selectedUser = users.find((u) => u.id === uid);
                        const userAgency = selectedUser?.agencyId
                          ? agencies.find((a) => a.id === selectedUser.agencyId)
                          : null;
                        setCurrent((p) => ({
                          ...p,
                          userId: uid || undefined,
                          vehicleId: undefined,
                          agencyCode:
                            userAgency?.agencyCode || p.agencyCode || "",
                        }));
                      }}
                      className={inputCls}
                    >
                      <option value="">Sélectionner un client</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                          {u.identifier ? ` — ${u.identifier}` : ""}
                        </option>
                      ))}
                    </select>
                  </F>
                  <F label="Agence *" error={errors.agencyCode}>
                    <select
                      value={current.agencyCode || ""}
                      onChange={(e) =>
                        setCurrent((p) => ({
                          ...p,
                          agencyCode: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      <option value="">Sélectionner une agence</option>
                      {agencies.map((a) => (
                        <option key={a.id} value={a.agencyCode}>
                          {a.agencyCode} — {a.agencyName}
                        </option>
                      ))}
                    </select>
                  </F>
                </div>

                {/* ─── Adresse du souscripteur ───────────────────── */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Adresse du souscripteur
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <F label="N° de rue">
                      <input
                        type="number"
                        value={(current as any).addrNumRue || ""}
                        onChange={(e) =>
                          setCurrent((p) => ({
                            ...p,
                            addrNumRue: e.target.value,
                          }))
                        }
                        placeholder="12"
                        className={inputCls}
                      />
                    </F>
                    <F label="Nom de rue">
                      <input
                        value={(current as any).addrNomRue || ""}
                        onChange={(e) =>
                          setCurrent((p) => ({
                            ...p,
                            addrNomRue: e.target.value,
                          }))
                        }
                        placeholder="Rue de la République"
                        className={inputCls}
                      />
                    </F>
                    <F label="Code postal">
                      <input
                        value={(current as any).addrCodePostal || ""}
                        onChange={(e) =>
                          setCurrent((p) => ({
                            ...p,
                            addrCodePostal: e.target.value,
                          }))
                        }
                        placeholder="5000"
                        className={inputCls}
                      />
                    </F>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── S2 : Véhicule ──────────────────────────────────── */}
          <div>
            <SecHeader
              title="2. Identification du véhicule"
              sub="Immatriculation, caractéristiques techniques, valeur"
              open={openSec.s2}
              toggle={() => tog("s2")}
            />
            {openSec.s2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <F label="Véhicule *" error={errors.vehicleId}>
                    <select
                      value={current.vehicleId || ""}
                      onChange={(e) =>
                        setCurrent((p) => ({
                          ...p,
                          vehicleId: Number(e.target.value),
                        }))
                      }
                      className={inputCls}
                    >
                      <option value="">Sélectionner un véhicule</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} — {v.make} {v.vehicleType}
                        </option>
                      ))}
                    </select>
                  </F>
                  <F label="Usage du véhicule">
                    <select
                      value={current.usageVehicle || "PERSONNEL"}
                      onChange={(e) =>
                        setCurrent((p) => ({
                          ...p,
                          usageVehicle: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      {USAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </F>
                </div>

                {/* Fiche technique auto-remplie */}
                {selectedVehicle && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-3 gap-3 text-xs">
                    {[
                      ["Marque", selectedVehicle.make || "--"],
                      ["Type", selectedVehicle.vehicleType || "--"],
                      [
                        "Puissance fiscale",
                        selectedVehicle.fiscalHorsepower || "--",
                      ],
                      ["Chevaux DIN", selectedVehicle.horsepower || "--"],
                      ["Nb places", selectedVehicle.seatingCapacity || "--"],
                      [
                        "1ère immat.",
                        formatDate(selectedVehicle.firstRegistrationDate) ||
                          "--",
                      ],
                      ["VIN", selectedVehicle.vin || "--"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-blue-400 font-medium">{k}</p>
                        <p className="text-blue-900 font-semibold">{v}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Valeur vénale et prix catalogue — modifiables dans le devis */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Valeur vénale et prix catalogue */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">Valeur vénale (DT) *</label>
    <input
      type="text"
      inputMode="numeric"
      value={marketValueStr}
      onChange={e => setMarketValueStr(e.target.value.replace(/[^0-9.]/g, ''))}
      placeholder="Ex: 215000"
      className={inputCls}
      autoFocus={false}
    />
  </div>
  <div>
<label className="block text-xs font-medium text-gray-600 mb-1">Prix catalogue (DT)</label>
    <input
      type="text"
      inputMode="numeric"
      value={listPriceStr}
      onChange={e => setListPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
      placeholder="Ex: 220000"
      className={inputCls}
    />
  </div>
</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <F label="Coefficient Bonus / Malus">
                    <select
                      value={
                        current.bonusMalusCoef ||
                        selectedVehicle?.bonusMalus ||
                        "1.00"
                      }
                      onChange={(e) =>
                        setCurrent((p) => ({
                          ...p,
                          bonusMalusCoef: e.target.value,
                        }))
                      }
                      className={inputCls}
                    >
                      {[
                        ["0.50", "Bonus maximal  — ×0.50"],
                        ["0.60", "Bonus           — ×0.60"],
                        ["0.70", "Bonus           — ×0.70"],
                        ["0.80", "Bonus           — ×0.80"],
                        ["0.90", "Bonus           — ×0.90"],
                        ["1.00", "Coefficient de base — ×1.00"],
                        ["1.25", "Malus           — ×1.25"],
                        ["1.50", "Malus           — ×1.50"],
                        ["1.75", "Malus           — ×1.75"],
                        ["2.00", "Malus           — ×2.00"],
                        ["2.50", "Malus maximal  — ×2.50"],
                      ].map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </F>
                  <F label="Date d'obtention du permis">
                    <DatePicker
                      value={current.licenseDate || ""}
                      onChange={(v) => setCurrent((p) => ({ ...p, licenseDate: v }))}
                      className={inputCls}
                    />
                  </F>
                </div>
              </div>
            )}
          </div>

          {/* ─── S3 : Couvertures ───────────────────────────────── */}
          <div>
            <SecHeader
              title="3. Couvertures & Garanties"
              sub="Pack de base + garanties optionnelles"
              open={openSec.s3}
              toggle={() => tog("s3")}
            />
            {openSec.s3 && (
              <div className="space-y-4">
                <F label="Pack d'assurance *" error={errors.packCode}>
                  <select
                    value={current.packCode || ""}
                    onChange={(e) =>
                      setCurrent((p) => ({ ...p, packCode: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="">Sélectionner un pack</option>
                    {packs
                      .filter((p) => p.isActive)
                      .map((p) => (
                        <option key={p.packCode} value={p.packCode}>
                          {p.packLabel} — prime de base {p.basePremium} DT
                        </option>
                      ))}
                  </select>
                </F>

                {/* Garanties incluses dans le pack */}
                {selectedPack && (selectedPack.guarantees || []).length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">
                      Garanties incluses dans ce pack (Σ taux ={" "}
                      {packTaux.toFixed(2)}%) :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedPack.guarantees || []).map((code) => {
                        const g = guarantees.find(
                          (x) => x.codeGarantie === code,
                        );
                        return (
                          <span
                            key={code}
                            className="bg-blue-200 text-blue-900 text-xs px-2 py-0.5 rounded font-mono"
                          >
                            {code}
                            {g ? ` ${g.taux}%` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Garanties optionnelles */}
                {optionalGuarantees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Garanties optionnelles à ajouter :
                    </p>
                    <div className="border border-orange-100 bg-orange-50/40 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {optionalGuarantees.map((g) => (
                        <label
                          key={g.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                            selectedOptionals.includes(g.codeGarantie)
                              ? "bg-orange-100"
                              : "hover:bg-orange-100/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOptionals.includes(g.codeGarantie)}
                            onChange={() =>
                              setSelectedOptionals((prev) =>
                                prev.includes(g.codeGarantie)
                                  ? prev.filter((c) => c !== g.codeGarantie)
                                  : [...prev, g.codeGarantie],
                              )
                            }
                            className="accent-orange-500"
                          />
                          <span className="bg-orange-200 text-orange-900 font-mono text-xs px-1.5 py-0.5 rounded">
                            {g.codeGarantie}
                          </span>
                          <span className="flex-1 text-gray-700">
                            {g.libelleGarantie}
                          </span>
                          <span className="text-xs font-semibold text-orange-600">
                            +{g.taux}%
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── S4 : Conditions de la police ──────────────────── */}
          <div>
            <SecHeader
              title="4. Conditions de la police"
              sub="Période de couverture et modalités de paiement"
              open={openSec.s4}
              toggle={() => tog("s4")}
            />
            {openSec.s4 && (
              <div className="grid grid-cols-2 gap-4">
                <F label="Date d'effet *" error={errors.effectiveDate}>
                  <DatePicker
                    value={current.effectiveDate || todayStr()}
                    onChange={(v) => setCurrent((p) => ({ ...p, effectiveDate: v }))}
                    className={inputCls}
                  />
                </F>
                <F label="Date d'expiration *" error={errors.expirationDate}>
                  <DatePicker
                    value={current.expirationDate || ""}
                    onChange={(v) => setCurrent((p) => ({ ...p, expirationDate: v }))}
                    min={current.effectiveDate || todayStr()}
                    className={inputCls}
                  />
                </F>
                <F label="Fractionnement *" error={errors.installmentType}>
                  <select
                    value={current.installmentType || ""}
                    onChange={(e) =>
                      setCurrent((p) => ({
                        ...p,
                        installmentType: e.target
                          .value as Quotation["installmentType"],
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="">Sélectionner</option>
                    {Object.entries(FREQ_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </F>
                <F label="Mode de renouvellement">
                  <select
                    value={current.renewalType || "AUTOMATIC"}
                    onChange={(e) =>
                      setCurrent((p) => ({
                        ...p,
                        renewalType: e.target.value as Quotation["renewalType"],
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="AUTOMATIC">Automatique</option>
                    <option value="MANUAL">Manuel</option>
                  </select>
                </F>
              </div>
            )}
          </div>

          {/* ─── S5 : Montants de la police ─────────────────────── */}
          <div>
            <SecHeader
              title="5. Montants de la police"
              sub="totalAmount, feeAmount, netAmount — optionnel, sinon calculés auto"
              open={openSec.s5}
              toggle={() => tog("s5")}
            />
            {openSec.s5 && (
              <div className="grid grid-cols-3 gap-4">
                <F label="Montant total (DT)">
                  <input
                    type="number"
                    step="0.01"
                    value={(current as any).totalAmountOverride ?? ""}
                    onChange={(e) =>
                      setCurrent((p) => ({
                        ...p,
                        totalAmountOverride:
                          e.target.value !== "" ? e.target.value : undefined,
                      }))
                    }
                    placeholder={
                      prime ? String(prime.estimatedPremium) : "Auto calculé"
                    }
                    className={inputCls}
                  />
                </F>
                <F label="Frais (feeAmount) (DT)">
                  <input
                    type="number"
                    step="0.01"
                    value={(current as any).feeAmountOverride ?? ""}
                    onChange={(e) =>
                      setCurrent((p) => ({
                        ...p,
                        feeAmountOverride:
                          e.target.value !== "" ? e.target.value : undefined,
                      }))
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </F>
                <F label="Montant net (DT)">
                  <input
                    type="number"
                    step="0.01"
                    value={(current as any).netAmountOverride ?? ""}
                    onChange={(e) =>
                      setCurrent((p) => ({
                        ...p,
                        netAmountOverride:
                          e.target.value !== "" ? e.target.value : undefined,
                      }))
                    }
                    placeholder={
                      prime ? String(prime.sousTotal) : "Auto calculé"
                    }
                    className={inputCls}
                  />
                </F>
              </div>
            )}
          </div>

          {/* ─── Aperçu de la prime ─────────────────────────────── */}
          {prime && (
            <div className="bg-[#1E3A5F] rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={18} className="text-blue-300" />
                <p className="font-semibold text-sm">Aperçu de la prime</p>
                <span className="ml-auto text-xs text-blue-300">
                  Estimation indicative
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {/* Prime de base */}
                <div className="flex justify-between">
                  <span className="text-blue-200">Prime de base du pack</span>
                  <span>
                    {Number(selectedPack?.basePremium || 0).toFixed(2)} DT
                  </span>
                </div>

                {/* Cotisation garanties */}
                <div className="flex justify-between">
                  <span className="text-blue-200">
                    Cotisation garanties
                    <span className="text-xs ml-1 text-blue-400">
                      ({(packTaux + optTaux).toFixed(2)}% ×{" "}
                      {(marketValueStr !== '' ? Number(marketValueStr) : Number(selectedVehicle?.marketValue || 0)).toLocaleString()}{" "}
                      DT)
                    </span>
                  </span>
                  <span>{prime.cotisation.toFixed(2)} DT</span>
                </div>

                {/* Sous-total */}
                <div className="flex justify-between border-t border-blue-700/50 pt-2 text-blue-100 font-medium">
                  <span>Sous-total</span>
                  <span>{prime.sousTotal.toFixed(2)} DT</span>
                </div>

                {/* Bonus/Malus si différent de 1 */}
                {parseFloat(
                  current.bonusMalusCoef || selectedVehicle?.bonusMalus || "1",
                ) !== 1 && (
                  <div className="flex justify-between">
                    <span className="text-blue-200">
                      Coef. Bonus/Malus ×{" "}
                      {current.bonusMalusCoef || selectedVehicle?.bonusMalus}
                    </span>
                    <span
                      className={
                        prime.bonusMalusEffect <= 0
                          ? "text-green-300"
                          : "text-red-300"
                      }
                    >
                      {prime.bonusMalusEffect >= 0 ? "+" : ""}
                      {prime.bonusMalusEffect.toFixed(2)} DT
                    </span>
                  </div>
                )}

                {/* Prime estimée = résultat sauvegardé en base */}
                <div className="flex justify-between font-bold text-lg border-t border-blue-600 pt-3 mt-1">
                  <span>Prime estimée</span>
                  <span className="text-yellow-300">
                    {prime.estimatedPremium.toFixed(2)} DT
                  </span>
                </div>

                {/* Échéance si fractionné */}
                {current.installmentType &&
                  current.installmentType !== "ANNUAL" && (
                    <div className="flex justify-between text-xs bg-blue-800/50 rounded-lg px-3 py-2 mt-1">
                      <span className="text-blue-200">
                        Échéance{" "}
                        {FREQ_LABELS[current.installmentType]?.toLowerCase()}
                      </span>
                      <span className="font-semibold">
                        {prime.installment.toFixed(2)} DT
                      </span>
                    </div>
                  )}
              </div>

              {/* Rappel formule */}
              <p className="text-xs text-blue-400 mt-4 border-t border-blue-700/40 pt-3">
                Formule : (prime de base + valeur vénale × Σtaux%) × coef. B/M
              </p>
            </div>
          )}

          {/* ─── Boutons ─────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 bg-[#E8003D] text-white rounded-lg hover:bg-red-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Enregistrer le devis
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal détail devis */}
      <Modal
        isOpen={viewed !== null && viewed !== undefined}
        onClose={() => setViewItem(null)}
        title={`Devis — ${viewed?.quoteNumber}`}
        size="lg"
      >
        {viewed && (
          <div className="grid grid-cols-2 gap-4">
            {[
              ["N° Devis", viewed.quoteNumber],
              [
                "Client",
                (() => {
                  const u = getUserById(viewed.userId);
                  return u ? `${u.firstName} ${u.lastName}` : "--";
                })(),
              ],
              [
                "Véhicule",
                (() => {
                  const v = getVehicleById(viewed.vehicleId);
                  return v ? `${v.make} ${v.registrationNumber}` : "--";
                })(),
              ],
              [
                "Pack",
                getPackByCode(viewed.packCode)?.packLabel || viewed.packCode,
              ],
              ["Prime estimée", `${viewed.estimatedPremium} DT`],
              [
                "Fréquence",
                FREQ_LABELS[viewed.installmentType] || viewed.installmentType,
              ],
              ["Statut", getStatusLabel(viewed.status)],
              [
                "Renouvellement",
                viewed.renewalType === "AUTOMATIC" ? "Automatique" : "Manuel",
              ],
              ["Date d'effet", formatDate(viewed.effectiveDate)],
              ["Date expiration", formatDate(viewed.expirationDate)],
              ["Agence", viewed.agencyCode || "--"],
            ].map(([label, value]) => (
              <div key={label} className="py-2 border-b border-gray-50">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-[#1A1A2E]">
                  {value || "--"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Wizard souscription ─────────────────────────────── */}
      {wizardQuotation && (
        <SubscriptionWizard
          quotation={wizardQuotation}
          currentUser={currentUser}
          getUserById={getUserById}
          vehicle={getVehicleById(wizardQuotation.vehicleId)}
          pack={getPackByCode(wizardQuotation.packCode)}
          guarantees={guarantees}
          onClose={() => setWizardQuotation(null)}
          onSuccess={async () => {
            setWizardQuotation(null);
            await Promise.all([refreshQuotations(), refreshContracts()]);
          }}
          showToast={showToast}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => setDeleteConfirm(null)}
        title="Supprimer le devis ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
