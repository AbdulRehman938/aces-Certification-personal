"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui";
import { Tag, FileText, Calendar, Eye, Search, Lock } from "lucide-react";
import { RxCross2 } from "react-icons/rx";
import { MdKeyboardArrowDown, MdUpload, MdClose } from "react-icons/md";
import { GrUpload } from "react-icons/gr";
import { axiosInstance } from "@/lib/axios";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

type TicketStatus = "pending" | "inProgress" | "completed";

interface Ticket {
  id: string;
  title: string;
  category: string;
  standard: string;
  date: string;
  status: TicketStatus;
}

interface Attachment {
  file: File;
  url?: string;
}

type TicketType = "support" | "dispute" | "other";
type TargetType = "certificate" | "assessment" | "billing" | "other";

interface TicketTypeOption {
  id: TargetType;
  label: string;
  description: string;
  ticket_type: TicketType;
}

const TICKET_TYPE_OPTIONS: TicketTypeOption[] = [
  {
    id: "certificate",
    label: "Certificate support ticket",
    description: "Issues related to certification renewal or documentation.",
    ticket_type: "support",
  },
  {
    id: "assessment",
    label: "Assessment dispute ticket",
    description: "Dispute assessment scores or request manual reviews.",
    ticket_type: "dispute",
  },
  {
    id: "billing",
    label: "Billing ticket",
    description: "Inquiries regarding payments, invoices, or subscriptions.",
    ticket_type: "dispute",
  },
  {
    id: "other",
    label: "Generic / Other tickets",
    description: "General questions or platform-related help.",
    ticket_type: "other",
  },
];

type FilterKey = "all" | TicketStatus;

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Tickets" },
  { key: "pending", label: "Pending" },
  { key: "inProgress", label: "In Process" },
  { key: "completed", label: "Completed" },
];

const statusStyles: Record<TicketStatus, { label: string; className: string }> =
  {
    inProgress: {
      label: "In progress",
      className:
        "border-dull-gray-2 rounded-sm px-4 text-dull-gray bg-[#2626261A]",
    },
    pending: {
      label: "Pending",
      className:
        "border-[#FAAB00]-2 px-6 rounded-sm text-[#FAAB00] bg-[#FAAB001A]",
    },
    completed: {
      label: "Completed",
      className:
        "border-[#00B448]-2 px-4 rounded-sm text-[#00B448] bg-[#F2FFF7]",
    },
  };

export function SupportCenterPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [availableCertificates, setAvailableCertificates] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [selectedTypeOption, setSelectedTypeOption] =
    useState<TicketTypeOption | null>(null);
  const [tempCertificateId, setTempCertificateId] = useState("");
  const [tempCertificateName, setTempCertificateName] = useState("");

  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCertificationOpen, setIsCertificationOpen] = useState(false);
  const [isSelectionCertOpen, setIsSelectionCertOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>(
    {},
  );
  const [totalTickets, setTotalTickets] = useState(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [hasAnyTickets, setHasAnyTickets] = useState(false);
  const [certSearchTerm, setCertSearchTerm] = useState("");
  const [selectionCertSearch, setSelectionCertSearch] = useState("");

  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("organization_profile");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const { isEmployee, hasAccess, hasWrite } =
    useEmployeePermissions(profileData);
  const canAccess = !isEmployee || hasAccess("support_center");
  const canWriteSupport = !isEmployee || hasWrite("support_center");

  useEffect(() => {
    const loadProfile = () => {
      const stored = localStorage.getItem("organization_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener("storage", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTickets = tickets;

  const isAnyUploading = useMemo(
    () => Object.values(uploadingFiles).some((v) => v === true),
    [uploadingFiles],
  );

  const fetchCertificates = async () => {
    if (isLoadingCerts) return;

    setIsLoadingCerts(true);
    try {
      const response = await axiosInstance.get("/certificates", {
        params: { limit: 100 },
      });

      const rawData = response.data;
      let items: any[] = [];

      // Prioritize data.data, then data, then raw array
      if (rawData?.data?.data && Array.isArray(rawData.data.data)) {
        items = rawData.data.data;
      } else if (rawData?.data && Array.isArray(rawData.data)) {
        items = rawData.data;
      } else if (Array.isArray(rawData)) {
        items = rawData;
      }

      setAvailableCertificates(
        items
          .map((c: any) => ({
            id: c.id || c.certificate_id || "",
            name:
              c.name ||
              c.certificate_name ||
              c.certificate_id ||
              "Unknown Certificate",
          }))
          .filter((c: any) => c.id !== ""),
      );
    } catch (error) {
      console.error("SupportCenter: Failed to fetch certificates", error);
    } finally {
      setIsLoadingCerts(false);
    }
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        status:
          activeFilter === "all"
            ? ""
            : activeFilter === "inProgress"
              ? "in-progress"
              : activeFilter,
      };
      const response = await axiosInstance.get("/support-tickets", {
        params,
      });
      if (response.data.success) {
        const apiTickets = (response.data.data || []).map((t: any) => {
          let status: TicketStatus = "pending";
          if (t.status === "in-progress" || t.status === "inProgress")
            status = "inProgress";
          else if (t.status === "completed" || t.status === "completd")
            status = "completed";
          else if (t.status === "pending") status = "pending";

          return {
            id: t.id,
            title: t.subject,
            category: t.category,
            standard: t.certificate_name || "N/A",
            date: new Date(t.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status,
          };
        });
        setTickets(apiTickets);
        const total = response.data.total || 0;
        setTotalTickets(total);
        if (activeFilter === "all" && !searchTerm) {
          setHasAnyTickets(total > 0);
        } else if (total > 0) {
          setHasAnyTickets(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      await Promise.all([fetchCertificates(), fetchTickets()]);
    };

    const orgId =
      typeof window !== "undefined"
        ? localStorage.getItem("organization_id")
        : null;
    if (orgId && orgId !== "undefined") {
      loadData();
    } else {
      const handleProfileUpdate = () => {
        if (isMounted) loadData();
      };
      window.addEventListener("profile-updated", handleProfileUpdate);
      // Also try to load anyway after a short delay if no event comes
      const timer = setTimeout(() => {
        if (isMounted) loadData();
      }, 2000);
      return () => {
        window.removeEventListener("profile-updated", handleProfileUpdate);
        clearTimeout(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [activeFilter, currentPage]);

  const mainFormFilteredCertificates = useMemo(() => {
    if (!certSearchTerm.trim()) return availableCertificates;
    const term = certSearchTerm.toLowerCase();
    return availableCertificates.filter((cert) => {
      const name = (cert.name || "").toLowerCase();
      return name.includes(term);
    });
  }, [availableCertificates, certSearchTerm]);

  const selectionModalFilteredCertificates = useMemo(() => {
    if (!selectionCertSearch.trim()) return availableCertificates;
    const term = selectionCertSearch.toLowerCase();
    return availableCertificates.filter((cert) => {
      const name = (cert.name || "").toLowerCase();
      return name.includes(term);
    });
  }, [availableCertificates, selectionCertSearch]);

  useEffect(() => {
    if (isSelectionOpen) {
      fetchCertificates();
    }
  }, [isSelectionOpen]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const emptyTicketValues = {
    subject: "",
    category: "",
    relatedCertification: "",
    certificateId: "",
    description: "",
    attachments: [] as Attachment[],
    ticket_type: "support" as TicketType,
    target_type: "other" as TargetType,
    target_id: "",
    metadata: {} as any,
  };

  const ticketValidationSchema = Yup.object({
    subject: Yup.string().required("Subject is required"),
    category: Yup.string().required("Category is required"),
    relatedCertification: Yup.string().when("target_type", {
      is: (val: string) => val !== "other",
      then: (schema) => schema.required("Related certification is required"),
      otherwise: (schema) => schema.optional(),
    }),
    description: Yup.string().required("Description is required"),
    attachments: Yup.array()
      .of(Yup.mixed())
      .min(1, "Please upload at least one file")
      .max(1, "Only one document is allowed per ticket"),
  });

  const ticketFormik = useFormik<{
    subject: string;
    category: string;
    relatedCertification: string;
    certificateId: string;
    description: string;
    attachments: Attachment[];
    ticket_type: TicketType;
    target_type: TargetType;
    target_id: string;
    metadata: any;
  }>({
    initialValues: emptyTicketValues,
    validationSchema: ticketValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const pendingUploads = values.attachments.filter((a) => !a.url);
      if (pendingUploads.length > 0) {
        setSubmitting(false);
        return;
      }

      try {
        const payload = {
          subject: values.subject,
          category: values.category.toLowerCase().trim().replace(/\s+/g, "-"),
          certificate_id: values.certificateId || undefined,
          description: values.description,
          supporting_document: values.attachments[0]?.url || "",
          ticket_type: values.ticket_type,
          target_type: values.target_type,
          target_id: values.target_id || values.certificateId,
          metadata: values.metadata || {},
        };

        const response = await axiosInstance.post("/support-tickets", payload);

        if (response.data.success) {
          const createdTicket = response.data.data;
          const newTicket: Ticket = {
            id: createdTicket.id,
            title: createdTicket.subject,
            category: createdTicket.category,
            standard:
              createdTicket.certificate_name || values.relatedCertification,
            date: new Date(createdTicket.created_at).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            ),
            status: "pending",
          };

          setTickets((prev) => [newTicket, ...prev]);
          setHasAnyTickets(true);
          setTotalTickets((prev) => prev + 1);
          setIsCreateOpen(false);
          setIsSuccessOpen(true);
          resetForm({ values: emptyTicketValues });
        }
      } catch (error) {
        console.error("Failed to create support ticket", error);
      } finally {
        setSubmitting(false);
        setIsCategoryOpen(false);
        setIsCertificationOpen(false);
      }
    },
  });

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("document", file);
    try {
      setUploadingFiles((prev) => ({ ...prev, [file.name]: true }));
      const response = await axiosInstance.post("/uploads/documents", formData);
      return response.data.url;
    } catch (error) {
      console.error("Upload failed", error);
      return null;
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [file.name]: false }));
    }
  };

  const handleRequestCloseCreate = () => {
    if (ticketFormik.dirty) {
      setIsCloseConfirmOpen(true);
    } else {
      ticketFormik.resetForm({ values: emptyTicketValues });
      setIsCreateOpen(false);
      setIsCategoryOpen(false);
      setIsCertificationOpen(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:pt-3">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-secondary">
              Support Center
            </h1>
            <p className="text-sm text-gray sm:text-sm">
              Create and track support tickets for your ESG certification
              inquiries
            </p>
          </div>

          <div className="w-full md:w-auto md:pt-1 flex md:justify-end">
            {canWriteSupport && (
              <Button
                variant="secondary"
                className="h-10 w-full rounded-md px-4 text-base font-semibold md:w-auto"
                onClick={() => {
                  fetchCertificates();
                  setSelectedTypeOption(null);
                  setTempCertificateId("");
                  setTempCertificateName("");
                  setIsSelectionCertOpen(false);
                  setIsSelectionOpen(true);
                }}
              >
                Create New Ticket
              </Button>
            )}
          </div>
        </div>

        {hasAnyTickets && (
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-full max-w-md items-center justify-between rounded-2xl border border-light-gray-2 bg-zinc-50 p-1 shadow-sm">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`flex-1 cursor-pointer rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-secondary text-primary shadow-md"
                        : "bg-zinc-50 text-dull-gray hover:bg-light-gray"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="flex w-full flex-col gap-1 md:w-auto md:flex-row md:items-center md:justify-end md:gap-3">
              <p className="text-sm font-medium text-gray">
                {totalTickets} ticket
                {totalTickets === 1 ? "" : "s"}
              </p>
              <div className="w-full md:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search tickets"
                  className="form-select-search h-10"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {isLoadingTickets ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-light-gray-2 bg-zinc-50 px-6 py-10 text-center shadow-sm sm:px-10">
              <p className="text-xl font-semibold text-secondary animate-pulse">
                Loading tickets...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-light-gray-2 bg-zinc-50 px-6 py-10 text-center shadow-sm sm:px-10">
              <p className="text-xl font-semibold text-secondary">
                {activeFilter === "all" && !searchTerm
                  ? "No tickets yet"
                  : "No tickets found"}
              </p>
              <p className="mt-1 max-w-md text-xs text-gray">
                {activeFilter === "all" && !searchTerm
                  ? 'Create your first support ticket to see it appear here. Use the "Create New Ticket" button to get started.'
                  : "Try adjusting your filters or search term to find what you're looking for."}
              </p>
            </div>
          ) : (
            paginatedTickets.map((ticket) => {
              const badge = statusStyles[ticket.status] || {
                label: ticket.status,
                className: "border-gray text-gray bg-light-gray",
              };
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col gap-3 rounded-2xl border border-light-gray-2 bg-zinc-50 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-secondary sm:text-lg">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray">
                      <div className="flex items-center gap-1.5">
                        <Tag
                          className="h-3.5 w-3.5 text-gray"
                          fill="currentColor"
                        />
                        <span>{ticket.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText
                          className="h-3.5 w-3.5 text-gray"
                          fill="currentColor"
                        />
                        <span>{ticket.standard}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar
                          className="h-3.5 w-3.5 text-gray"
                          fill="currentColor"
                        />
                        <span>{ticket.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-start sm:justify-end">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {totalTickets > PAGE_SIZE && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-base text-gray sm:text-base">
              Showing
              <span className="mx-1 font-semibold text-secondary">
                {startIndex + 1}
              </span>
              to
              <span className="mx-1 font-semibold text-secondary">
                {Math.min(startIndex + PAGE_SIZE, totalTickets)}
              </span>
              of
              <span className="mx-1 font-semibold text-secondary">
                {totalTickets}
              </span>
              tickets
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 rounded-xl border border-light-gray-2 px-3 text-base font-medium text-dull-gray disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 min-w-8 rounded-xl px-2 text-base font-semibold transition-colors ${
                        isActive
                          ? "bg-secondary text-primary"
                          : "bg-zinc-50 text-dull-gray border border-light-gray-2 hover:bg-light-gray"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8 rounded-xl border border-light-gray-2 px-3 text-base font-medium text-dull-gray disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create Ticket Modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div
                className={`absolute inset-0 bg-secondary/30 backdrop-blur-sm ${isAnyUploading ? "cursor-not-allowed" : ""}`}
                onClick={() => !isAnyUploading && setIsCreateOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-xl rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden"
              >
                <form
                  onSubmit={ticketFormik.handleSubmit}
                  className="px-6 py-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <h2 className="text-xl font-semibold text-secondary">
                        Create {selectedTypeOption?.label || "Support Ticket"}
                      </h2>
                      <p className="text-xs text-gray">
                        Submit a formal support or compliance ticket. Our team
                        will respond within 24-48 hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isAnyUploading}
                      onClick={handleRequestCloseCreate}
                      className={`-mt-3 -mr-2 h-8 w-8 hover:text-secondary flex items-center justify-center rounded-full text-zinc-400 transition-colors ${isAnyUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <RxCross2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="form-field-wrapper">
                      <label className="form-label">Subject</label>
                      <input
                        name="subject"
                        placeholder="Brief description of your issue"
                        value={ticketFormik.values.subject}
                        onChange={ticketFormik.handleChange}
                        onBlur={ticketFormik.handleBlur}
                        className={`form-input ${
                          ticketFormik.touched.subject &&
                          ticketFormik.errors.subject
                            ? "form-input-error"
                            : ""
                        }`}
                      />
                      {ticketFormik.touched.subject &&
                        ticketFormik.errors.subject && (
                          <p className="form-error-message">
                            {ticketFormik.errors.subject}
                          </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="form-field-wrapper">
                        <label className="form-label">Category</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCategoryOpen((prev) => !prev)}
                            className={`form-dropdown-trigger ${
                              ticketFormik.touched.category &&
                              ticketFormik.errors.category
                                ? "form-dropdown-trigger-error"
                                : ""
                            }`}
                          >
                            <span
                              className={
                                ticketFormik.values.category
                                  ? "text-secondary font-medium"
                                  : "text-gray/50"
                              }
                            >
                              {ticketFormik.values.category ||
                                "Select category"}
                            </span>
                            <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray" />
                          </button>

                          <AnimatePresence>
                            {isCategoryOpen && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0 z-10"
                                  onClick={() => setIsCategoryOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                >
                                  {[
                                    "Documentation Issue",
                                    "Technical Issue",
                                    "Compliance Query",
                                    "Renewal",
                                  ].map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        ticketFormik.setFieldValue(
                                          "category",
                                          option,
                                        );
                                        ticketFormik.setFieldTouched(
                                          "category",
                                          true,
                                          false,
                                        );
                                        setIsCategoryOpen(false);
                                      }}
                                      className={`form-dropdown-item ${
                                        ticketFormik.values.category === option
                                          ? "form-dropdown-item-active"
                                          : "form-dropdown-item-inactive"
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {ticketFormik.touched.category &&
                          ticketFormik.errors.category && (
                            <p className="form-error-message">
                              {ticketFormik.errors.category}
                            </p>
                          )}
                      </div>

                      {ticketFormik.values.target_type !== "other" && (
                        <div className="form-field-wrapper">
                          <label className="form-label">
                            Related Certification
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCertificationOpen((prev) => !prev);
                                setCertSearchTerm("");
                              }}
                              className={`form-dropdown-trigger ${
                                ticketFormik.touched.relatedCertification &&
                                ticketFormik.errors.relatedCertification
                                  ? "form-dropdown-trigger-error"
                                  : ""
                              }`}
                            >
                              <span
                                className={
                                  ticketFormik.values.relatedCertification
                                    ? "text-secondary font-medium"
                                    : "text-gray/50"
                                }
                              >
                                {ticketFormik.values.relatedCertification ||
                                  "Select certification"}
                              </span>
                              <MdKeyboardArrowDown className="ml-2 h-4 w-4 text-gray" />
                            </button>

                            <AnimatePresence>
                              {isCertificationOpen && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-10"
                                    onClick={() =>
                                      setIsCertificationOpen(false)
                                    }
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                  >
                                    {availableCertificates.length > 5 && (
                                      <div className="p-2 border-b border-light-gray-2 bg-primary/95 sticky top-0 backdrop-blur-sm z-30">
                                        <div className="relative">
                                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray" />
                                          <input
                                            type="text"
                                            value={certSearchTerm}
                                            onChange={(e) =>
                                              setCertSearchTerm(e.target.value)
                                            }
                                            placeholder="Search..."
                                            className="w-full h-8 pl-8 text-xs bg-light-gray/20 border-none rounded-lg focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="max-h-60 overflow-y-auto">
                                      {isLoadingCerts ? (
                                        <div className="p-4 text-center text-xs text-secondary animate-pulse font-medium">
                                          Loading certificates...
                                        </div>
                                      ) : mainFormFilteredCertificates.length ===
                                        0 ? (
                                        <div className="p-4 text-center text-xs text-gray">
                                          {certSearchTerm
                                            ? "No certificates match your search"
                                            : "No certificates found"}
                                        </div>
                                      ) : (
                                        mainFormFilteredCertificates.map(
                                          (cert) => (
                                            <button
                                              key={cert.id}
                                              type="button"
                                              onClick={() => {
                                                ticketFormik.setFieldValue(
                                                  "relatedCertification",
                                                  cert.name,
                                                );
                                                ticketFormik.setFieldValue(
                                                  "certificateId",
                                                  cert.id,
                                                );
                                                ticketFormik.setFieldValue(
                                                  "target_id",
                                                  cert.id,
                                                );
                                                setIsCertificationOpen(false);
                                              }}
                                              className={`w-full text-left px-4 py-2 text-sm transition-colors overflow-hidden ${
                                                ticketFormik.values
                                                  .certificateId === cert.id
                                                  ? "bg-secondary text-primary font-semibold"
                                                  : "text-secondary font-medium hover:text-secondary/80"
                                              }`}
                                            >
                                              <span className="block truncate">
                                                {cert.name}
                                              </span>
                                            </button>
                                          ),
                                        )
                                      )}
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                          {ticketFormik.touched.relatedCertification &&
                            ticketFormik.errors.relatedCertification && (
                              <p className="form-error-message">
                                {ticketFormik.errors.relatedCertification}
                              </p>
                            )}
                        </div>
                      )}
                    </div>

                    <div className="form-field-wrapper">
                      <label className="form-label">Description</label>
                      <textarea
                        name="description"
                        rows={4}
                        placeholder="Kindly provide detailed information about your inquiry or issue..."
                        value={ticketFormik.values.description}
                        onChange={ticketFormik.handleChange}
                        onBlur={ticketFormik.handleBlur}
                        className={`form-input resize-none py-2 ${
                          ticketFormik.touched.description &&
                          ticketFormik.errors.description
                            ? "form-input-error"
                            : ""
                        }`}
                      />
                      {ticketFormik.touched.description &&
                        ticketFormik.errors.description && (
                          <p className="form-error-message">
                            {ticketFormik.errors.description}
                          </p>
                        )}
                    </div>

                    <div className="form-field-wrapper">
                      <label className="form-label">Attachments</label>
                      {ticketFormik.values.attachments.length === 0 && (
                        <div
                          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${
                            ticketFormik.touched.attachments &&
                            ticketFormik.errors.attachments
                              ? "border-red bg-red/5"
                              : "border-light-gray-2 hover:bg-light-gray hover:border-gray/30"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            onChange={async (e) => {
                              const incoming = Array.from(
                                e.target.files || [],
                              )[0];
                              if (!incoming) return;

                              const newAttachment: Attachment = {
                                file: incoming,
                              };

                              ticketFormik.setFieldValue("attachments", [
                                newAttachment,
                              ]);
                              ticketFormik.setFieldTouched(
                                "attachments",
                                true,
                                false,
                              );

                              // Upload file
                              const url = await handleUpload(incoming);
                              if (url) {
                                ticketFormik.setFieldValue("attachments", [
                                  { ...newAttachment, url },
                                ]);
                              }
                            }}
                          />
                          <div className="flex flex-col items-center gap-2">
                            <GrUpload className="h-5 w-5 text-gray" />
                            <p className="font-semibold text-secondary">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray">
                              PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                            </p>
                            <p className="text-[10px] text-gray/60 font-medium">
                              Only one document allowed per ticket
                            </p>
                          </div>
                        </div>
                      )}
                      {ticketFormik.values.attachments.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {ticketFormik.values.attachments.map((att, idx) => (
                            <div
                              key={`${att.file.name}-${idx}`}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-light-gray border border-light-gray-2 text-sm text-secondary"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-4 w-4 shrink-0 text-gray" />
                                <span className="truncate">
                                  {att.file.name}
                                </span>
                                {uploadingFiles[att.file.name] && (
                                  <span className="text-[10px] text-gray animate-pulse">
                                    Uploading...
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {att.url && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPreviewUrl(att.url!);
                                      setIsPreviewOpen(true);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray hover:text-secondary transition-colors shadow-sm"
                                    title="Preview"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isAnyUploading}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray transition-colors shadow-sm ${isAnyUploading ? "cursor-not-allowed opacity-50" : "hover:text-red"}`}
                                  onClick={() => {
                                    const next = [
                                      ...ticketFormik.values.attachments,
                                    ];
                                    next.splice(idx, 1);
                                    ticketFormik.setFieldValue(
                                      "attachments",
                                      next,
                                    );
                                    if (next.length === 0) {
                                      ticketFormik.setFieldError(
                                        "attachments",
                                        "Please upload at least one file",
                                      );
                                    }
                                  }}
                                >
                                  <MdClose className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {ticketFormik.touched.attachments &&
                        ticketFormik.errors.attachments && (
                          <p className="form-error-message">
                            {ticketFormik.errors.attachments as string}
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      disabled={isAnyUploading}
                      onClick={handleRequestCloseCreate}
                      className="h-10 rounded-xl border border-light-gray-2 bg-zinc-50 px-5 text-sm font-semibold text-dull-gray transition-colors hover:bg-light-gray disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={ticketFormik.isSubmitting || isAnyUploading}
                      className="h-10 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto"
                    >
                      {isAnyUploading ? "Uploading..." : "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ticket success modal */}
        <AnimatePresence>
          {isSuccessOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-sm rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-secondary">
                    Ticket submitted
                  </h3>
                  <p className="text-base font-medium text-gray">
                    Your support ticket has been created successfully.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-5 rounded-lg text-base font-semibold"
                    onClick={() => setIsSuccessOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCloseConfirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-sm rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-secondary">
                    Discard changes?
                  </h3>
                  <p className="text-base font-medium text-gray">
                    You have unsaved changes. If you close now, your data will
                    be lost.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCloseConfirmOpen(false)}
                    className="h-9 px-4 rounded-lg border border-light-gray-2 bg-zinc-50 text-base font-semibold text-dull-gray hover:bg-light-gray transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-auto h-9 px-5 rounded-lg text-base font-semibold"
                    onClick={() => {
                      ticketFormik.resetForm({ values: emptyTicketValues });
                      setIsCloseConfirmOpen(false);
                      setIsCreateOpen(false);
                      setIsCategoryOpen(false);
                      setIsCertificationOpen(false);
                    }}
                  >
                    Discard
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Document Preview Modal */}
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 flex items-center justify-center px-4"
            >
              <div
                className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
                onClick={() => setIsPreviewOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-4xl h-[80vh] rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-light-gray-2">
                  <h3 className="text-base font-semibold text-secondary">
                    Document Preview
                  </h3>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-light-gray text-gray transition-colors"
                  >
                    <RxCross2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 bg-light-gray/30 p-4">
                  <iframe
                    src={selectedPreviewUrl}
                    className="w-full h-full rounded-xl border border-light-gray-2"
                    title="Document Preview"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Ticket Type Selection Modal */}
        <AnimatePresence>
          {isSelectionOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div
                className="absolute inset-0 bg-secondary/30 backdrop-blur-sm"
                onClick={() => setIsSelectionOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-lg rounded-2xl bg-zinc-50 border border-light-gray-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
              >
                <div className="px-6 py-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-secondary">
                        Choose Ticket Type
                      </h2>
                      <p className="text-sm text-gray">
                        Select the category that best fits your inquiry.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsSelectionOpen(false)}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-secondary transition-colors hover:bg-light-gray"
                    >
                      <RxCross2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {TICKET_TYPE_OPTIONS.map((option) => (
                      <div key={option.id} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTypeOption(option);
                            if (option.id === "other") {
                              setTempCertificateId("");
                              setTempCertificateName("");
                            }
                          }}
                          className={`w-full flex items-start p-4 rounded-xl border-2 transition-all text-left ${
                            selectedTypeOption?.id === option.id
                              ? "border-secondary bg-secondary/5 shadow-sm"
                              : "border-zinc-100 hover:border-zinc-200 bg-white"
                          }`}
                        >
                          <div className="mt-1">
                            <div
                              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                selectedTypeOption?.id === option.id
                                  ? "border-secondary"
                                  : "border-zinc-300"
                              }`}
                            >
                              {selectedTypeOption?.id === option.id && (
                                <div className="h-2 w-2 rounded-full bg-secondary" />
                              )}
                            </div>
                          </div>
                          <div className="ml-3">
                            <p
                              className={`text-sm font-semibold ${
                                selectedTypeOption?.id === option.id
                                  ? "text-secondary"
                                  : "text-zinc-900"
                              }`}
                            >
                              {option.label}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </button>

                        {/* Certificate Selection inside option when selected */}
                        {option.id !== "other" &&
                          selectedTypeOption?.id === option.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-7 space-y-2"
                            >
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIsSelectionCertOpen((prev) => !prev)
                                  }
                                  className={`w-full h-10 px-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
                                    isSelectionCertOpen
                                      ? "border-secondary ring-2 ring-secondary/5 bg-white"
                                      : "border-zinc-200 bg-primary/50"
                                  }`}
                                >
                                  <span
                                    className={
                                      tempCertificateName
                                        ? "text-zinc-900 font-medium"
                                        : "text-zinc-400"
                                    }
                                  >
                                    {tempCertificateName ||
                                      "Select Certificate"}
                                  </span>
                                  <MdKeyboardArrowDown
                                    className={`h-5 w-5 text-zinc-400 transition-transform ${isSelectionCertOpen ? "rotate-180" : ""}`}
                                  />
                                </button>

                                <AnimatePresence>
                                  {isSelectionCertOpen && (
                                    <>
                                      <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="absolute z-100 mt-1 w-full rounded-xl border border-zinc-100 bg-white shadow-2xl overflow-hidden"
                                      >
                                        <div className="p-2 border-b border-zinc-50 bg-white sticky top-0 z-10">
                                          <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <input
                                              type="text"
                                              value={selectionCertSearch}
                                              onChange={(e) =>
                                                setSelectionCertSearch(
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="Search certificates..."
                                              className="w-full h-8 pl-8 text-xs bg-zinc-50 border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary/20"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                          {isLoadingCerts ? (
                                            <div className="p-4 text-center text-xs text-secondary animate-pulse font-medium">
                                              Loading certificates...
                                            </div>
                                          ) : selectionModalFilteredCertificates.length ===
                                            0 ? (
                                            <div className="p-4 text-center text-xs text-zinc-400">
                                              {selectionCertSearch
                                                ? "No certificates match your search."
                                                : "No certificates found."}
                                            </div>
                                          ) : (
                                            selectionModalFilteredCertificates.map(
                                              (cert) => (
                                                <button
                                                  key={cert.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setTempCertificateId(
                                                      cert.id,
                                                    );
                                                    setTempCertificateName(
                                                      cert.name,
                                                    );
                                                    setIsSelectionCertOpen(
                                                      false,
                                                    );
                                                  }}
                                                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-zinc-50 ${
                                                    tempCertificateId ===
                                                    cert.id
                                                      ? "bg-secondary/5 text-secondary font-semibold"
                                                      : "text-zinc-600"
                                                  }`}
                                                >
                                                  {cert.name}
                                                </button>
                                              ),
                                            )
                                          )}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsSelectionOpen(false)}
                      className="flex-1 h-12 rounded-xl text-gray font-semibold text-sm hover:bg-light-gray transition-colors border border-light-gray-2"
                    >
                      Cancel
                    </button>
                    <Button
                      variant="secondary"
                      className="flex-1 h-12 rounded-xl text-sm font-semibold shadow-lg shadow-secondary/10"
                      disabled={
                        !selectedTypeOption ||
                        (selectedTypeOption.id !== "other" &&
                          !tempCertificateId)
                      }
                      onClick={() => {
                        const type = selectedTypeOption?.id || "other";
                        let initialCategory = "general";
                        let initialSubject = "";
                        let metadata = {};

                        if (type === "certificate") {
                          initialCategory = "renewal";
                          initialSubject = "Certificate renewal issue";
                        } else if (type === "assessment") {
                          initialCategory = "assessment-review";
                          initialSubject = "Assessment score dispute";
                          metadata = {
                            assessment_id:
                              "880e8400-e29b-41d4-a716-446655440003",
                            ai_review_id:
                              "990e8400-e29b-41d4-a716-446655440004",
                            source: "notification",
                          };
                        } else if (type === "billing") {
                          initialCategory = "billing";
                          initialSubject = "Billing inquiry";
                        }

                        ticketFormik.resetForm({
                          values: {
                            ...emptyTicketValues,
                            subject: initialSubject,
                            category:
                              initialCategory === "renewal"
                                ? "Renewal"
                                : initialCategory === "assessment-review"
                                  ? "Compliance Query"
                                  : initialCategory === "billing"
                                    ? "Documentation Issue"
                                    : "General inquiry",
                            ticket_type:
                              selectedTypeOption?.ticket_type || "support",
                            target_type: type,
                            target_id:
                              type === "certificate"
                                ? tempCertificateId
                                : type === "assessment"
                                  ? "880e8400-e29b-41d4-a716-446655440003"
                                  : "",
                            metadata: metadata,
                            relatedCertification: tempCertificateName,
                            certificateId: tempCertificateId,
                          },
                        });

                        setIsSelectionOpen(false);
                        setIsCreateOpen(true);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
