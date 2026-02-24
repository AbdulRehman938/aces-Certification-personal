"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import { LoadingScreen } from "../../common/loading-screen";
import { AlertCircle } from "lucide-react";

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-primary rounded-2xl border border-zinc-100 shadow-sm p-4 lg:p-5 flex flex-col",
      className,
    )}
  >
    {children}
  </div>
);

function cn(...inputs: (string | null | undefined | boolean)[]) {
  return inputs.filter(Boolean).join(" ");
}

const Tag = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "active" | "expired";
}) => {
  const styles = {
    default: "bg-zinc-100 text-zinc-500",
    active: "bg-green-50 text-green-500",
    expired: "bg-red/5 text-red",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
};

export function ProfileCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchMyCertificates();
  }, []);

  const fetchMyCertificates = async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(10);

      const branchRes = await axiosInstance.get("/branches/list");
      const branches = branchRes.data?.data || branchRes.data || [];
      const branch = branches.find((b: any) => b.is_main) || branches[0];

      if (!branch) {
        setCertificates([]);
        setLoadingProgress(100);
        return;
      }

      setLoadingProgress(40);

      const certRes = await axiosInstance.get("/my-certificates", {
        params: { branchid: branch.id },
      });

      const apiData =
        certRes.data?.data?.data || certRes.data?.data || certRes.data || [];

      const mapped = apiData
        .filter((item: any) => {
          const status = String(item.status || "").toLowerCase();
          return (
            status === "active" ||
            status === "expired" ||
            item.is_active === true
          );
        })
        .map((item: any) => {
          const rawStatus = String(item.status || "").toLowerCase();
          const displayStatus = rawStatus === "expired" ? "Expired" : "Active";

          return {
            title: item.name || item.certificate?.name,
            code: item.certificate_id || item.certificate?.certificate_id,
            status: displayStatus,
            category:
              (item.industry_names && item.industry_names[0]) ||
              (item.certificate?.industry_names &&
                item.certificate.industry_names[0]) ||
              "General",
            description:
              item.description ||
              item.certificate?.description ||
              "No description available.",
            disclosurePrice:
              item.disclosure_price ||
              item.certificate?.disclosure_price ||
              "500",
            assuredPrice:
              item.assured_price ||
              item.certificate?.assured_price ||
              "3,500–6,000",
          };
        });

      setCertificates(mapped);
      setLoadingProgress(100);
    } catch (error) {
      console.error("Failed to fetch my certificates", error);
      setLoadingProgress(100);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-dull-white/10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-8 mb-0">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-secondary">
              My Certificates
            </h1>
            <p className="text-[#A3A3A3] text-[15px] max-w-4xl font-normal">
              View all certificates you have earned in one place. You can easily
              access, download, or share your verified certificates anytime.
            </p>
          </div>

          <h2 className="text-[18px] font-bold text-secondary pb-2">
            Certificate History
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-100">
            <LoadingScreen
              isLoading={true}
              progress={loadingProgress}
              size="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {certificates.length > 0 ? (
              certificates.map((cert, i) => (
                <Card key={i} className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-[#1F1F1F]">
                        {cert.title}
                      </h3>
                      <p className="text-[11px] text-[#A3A3A3] font-normal leading-tight">
                        {cert.code}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Tag variant="default">{cert.category}</Tag>
                      <Tag
                        variant={
                          cert.status === "Expired" ? "expired" : "active"
                        }
                      >
                        {cert.status}
                      </Tag>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <img
                      src="/assets/imgs/icons/GoldRank.svg"
                      alt="Gold Rank"
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  <p className="text-[10px] text-[#A3A3A3] font-normal leading-relaxed line-clamp-3">
                    {cert.description}
                  </p>
                  <div className="h-px bg-zinc-100" />
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5 flex-1">
                      <p className="text-[11px] font-semibold text-[#1F1F1F]">
                        Self-disclosure: USD {cert.disclosurePrice}
                      </p>
                      <p className="text-[9px] text-[#A3A3A3] leading-snug font-medium">
                        Per property, online checklist.
                      </p>
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <p className="text-[11px] font-semibold text-[#1F1F1F]">
                        Certification: USD {cert.assuredPrice}
                      </p>
                      <p className="text-[9px] text-[#A3A3A3] leading-snug font-medium">
                        Per certification, range by size and complexity.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button className="px-4 h-8 rounded-lg bg-[#242424] text-white font-semibold text-[10px] transition-all hover:bg-black flex items-center justify-center">
                      Download Certificate
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-zinc-400 font-medium">
                  No active certificates found.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

