"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui";
import { Tag, FileText, Calendar, Eye, Search } from "lucide-react";
import { RxCross2 } from "react-icons/rx";
import { MdKeyboardArrowDown, MdUpload, MdClose } from "react-icons/md";
import { GrUpload } from "react-icons/gr";
import { axiosInstance } from "@/lib/axios";

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
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCertificationOpen, setIsCertificationOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>(
    {},
  );
  const [totalTickets, setTotalTickets] = useState(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [hasAnyTickets, setHasAnyTickets] = useState(false);
  const [certSearchTerm, setCertSearchTerm] = useState("");

  const isAnyUploading = useMemo(
    () => Object.values(uploadingFiles).some((v) => v === true),
    [uploadingFiles],
  );

  const filteredCertificates = useMemo(() => {
    if (!certSearchTerm.trim()) return availableCertificates;
    const term = certSearchTerm.toLowerCase();
    return availableCertificates.filter((cert) => {
      const name = (cert.name || "").toLowerCase();
      return name.includes(term);
    });
  }, [availableCertificates, certSearchTerm]);

  const canWriteSupport = useMemo(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem("organization_profile");
      if (!raw) return true;
      const profile = JSON.parse(raw);
      if (profile?._type !== "employee") return true;
      const perms: { resource: string; action: string[] | string }[] =
        profile?.permissions ?? [];
      return perms.some((p) => {
        const actions = Array.isArray(p.action)
          ? p.action
          : typeof p.action === "string"
            ? [p.action]
            : [];
        return (
          p.resource === "support" &&
          actions.some((a) => a.toLowerCase() === "write")
        );
      });
    } catch {
      return true;
    }
  }, []);

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTickets = tickets;

  const emptyTicketValues = {
    subject: "",
    category: "",
    relatedCertification: "",
    certificateId: "",
    description: "",
    attachments: [] as Attachment[],
  };

  const ticketValidationSchema = Yup.object({
    subject: Yup.string().required("Subject is required"),
    category: Yup.string().required("Category is required"),
    relatedCertification: Yup.string().required(
      "Related certification is required",
    ),
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
  }>({
    initialValues: emptyTicketValues,
    validationSchema: ticketValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const pendingUploads = values.attachments.filter((a) => !a.url);
      if (pendingUploads.length > 0) {
        console.warn("Some attachments are still uploading or failed");
        setSubmitting(false);
        return;
      }

      try {
        const payload = {
          subject: values.subject,
          category: values.category.toLowerCase().trim().replace(/\s+/g, "-"),
          certificate_id: values.certificateId,
          description: values.description,
          supporting_document: values.attachments[0]?.url || "",
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

  useEffect(() => {
    const fetchCertificates = async () => {
      setIsLoadingCerts(true);
      try {
        const response = await axiosInstance.get("/certificates");
        const responseData = response.data;
        const items =
          responseData?.data?.data || responseData?.data || responseData || [];

        setAvailableCertificates(
          (Array.isArray(items) ? items : [])
            .map((c: any) => ({
              id: c.id || c.certificate_id || "",
              name:
                c.name ||
                c.certificate_name ||
                c.certificate_id ||
                "Unknown Certificate",
            }))
            .filter((c) => c.id !== ""),
        );
      } catch (error) {
        console.error("Failed to fetch certificates", error);
      } finally {
        setIsLoadingCerts(false);
      }
    };

    fetchCertificates();
  }, []);

  useEffect(() => {
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

    fetchTickets();
  }, [activeFilter, currentPage]);

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
                  ticketFormik.resetForm({ values: emptyTicketValues });
                  setIsCategoryOpen(false);
                  setIsCertificationOpen(false);
                  setIsCreateOpen(true);
                }}
              >
                Create New Ticket
              </Button>
            )}
          </div>
        </div>

        {hasAnyTickets && (
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-full max-w-md items-center justify-between rounded-2xl border border-light-gray-2 bg-primary p-1 shadow-sm">
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
                        : "bg-primary text-dull-gray hover:bg-light-gray"
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-light-gray-2 bg-primary px-6 py-10 text-center shadow-sm sm:px-10">
              <p className="text-xl font-semibold text-secondary animate-pulse">
                Loading tickets...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-light-gray-2 bg-primary px-6 py-10 text-center shadow-sm sm:px-10">
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
                  className="flex flex-col gap-3 rounded-2xl border border-light-gray-2 bg-primary px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 hover:shadow-md transition-shadow"
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
                          : "bg-primary text-dull-gray border border-light-gray-2 hover:bg-light-gray"
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
                className="relative w-full max-w-xl rounded-2xl bg-primary border border-light-gray-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden"
              >
                <form
                  onSubmit={ticketFormik.handleSubmit}
                  className="px-6 py-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <h2 className="text-xl font-semibold text-secondary">
                        Create New Support Ticket
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
                      className={`-mt-3 -mr-2 h-8 w-8 hover:text-secondary flex items-center justify-center rounded-full text-dull-gray transition-colors ${isAnyUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <RxCross2 className="h-4 w-4" />
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
                                  className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
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
                                  onClick={() => setIsCertificationOpen(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 8 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-light-gray-2 bg-primary shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                                >
                                  {availableCertificates.length > 10 && (
                                    <div className="p-2 border-b border-light-gray-2 bg-primary/95 sticky top-0 backdrop-blur-sm z-30">
                                      <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray" />
                                        <input
                                          type="text"
                                          value={certSearchTerm}
                                          onChange={(e) =>
                                            setCertSearchTerm(e.target.value)
                                          }
                                          placeholder="Search certificates..."
                                          className="form-select-search h-8 pl-8 text-xs w-full"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <div className="max-h-60 overflow-y-auto">
                                    {filteredCertificates.map((cert) => (
                                      <button
                                        key={cert.id}
                                        type="button"
                                        onClick={() => {
                                          ticketFormik.setValues({
                                            ...ticketFormik.values,
                                            relatedCertification: cert.name,
                                            certificateId: cert.id,
                                          });
                                          setTimeout(() => {
                                            ticketFormik.setFieldTouched(
                                              "relatedCertification",
                                              true,
                                              true,
                                            );
                                            ticketFormik.validateForm();
                                          }, 0);
                                          setIsCertificationOpen(false);
                                        }}
                                        className={`form-dropdown-item ${
                                          ticketFormik.values.certificateId ===
                                          cert.id
                                            ? "form-dropdown-item-active"
                                            : "form-dropdown-item-inactive"
                                        }`}
                                      >
                                        {cert.name}
                                      </button>
                                    ))}
                                    {filteredCertificates.length === 0 && (
                                      <div className="p-4 text-center text-xs text-gray">
                                        {isLoadingCerts
                                          ? "Loading..."
                                          : certSearchTerm
                                            ? "No certificates match your search"
                                            : "No certifications found"}
                                      </div>
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
                      className={`h-10 rounded-xl border border-light-gray-2 bg-primary px-5 text-sm font-semibold text-dull-gray transition-colors ${isAnyUploading ? "cursor-not-allowed opacity-50" : "hover:bg-light-gray"}`}
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
                className="relative w-full max-w-sm rounded-2xl bg-primary border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
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
                className="relative w-full max-w-sm rounded-2xl bg-primary border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-6 space-y-4"
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
                    className="h-9 px-4 rounded-lg border border-light-gray-2 bg-primary text-base font-semibold text-dull-gray hover:bg-light-gray transition-colors"
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
                className="relative w-full max-w-4xl h-[80vh] rounded-2xl bg-primary border border-light-gray-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
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
      </div>
    </div>
  );
}
