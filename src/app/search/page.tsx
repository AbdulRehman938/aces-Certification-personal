"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LandingHeader from "@/app/components/landingPage/header";
import Footer from "@/app/components/landingPage/footer";
import Dropdown from "@/app/(dashboards)/admin/common/dropdown";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [organization, setOrganization] = useState("");
  const [certificate, setCertificate] = useState("");

  const resultCards = [
    {
      title: "TechCorp Industries",
      description:
        "Leading provider of enterprise software solutions and cloud infrastructure services, serving Fortune 500 companies globally.",
      category: "Technology",
      location: "United States",
      certificates: "3 Certificates",
    },
    {
      title: "AeroSafe Systems",
      description:
        "Specialized in aerospace safety systems with compliance programs across aviation and defense sectors.",
      category: "Aerospace",
      location: "Canada",
      certificates: "2 Certificates",
    },
    {
      title: "Greenline Logistics",
      description:
        "End-to-end logistics partner focusing on sustainable supply chain and distribution services.",
      category: "Logistics",
      location: "United Kingdom",
      certificates: "4 Certificates",
    },
  ];

  const resultSummary = useMemo(() => {
    if (!query) {
      return "0 results - Start typing in the search bar to see matches.";
    }
    return `4 results - Organizations matching "${query}"`;
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-4 py-6 text-slate-900 flex flex-col">
      <LandingHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#262626]">
                Search Results
              </h1>
              <p className="mt-2 text-sm text-gray">{resultSummary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Dropdown
                placeholder="Country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                options={[
                  { value: "us", label: "United States" },
                  { value: "ca", label: "Canada" },
                  { value: "uk", label: "United Kingdom" },
                ]}
                className="min-w-[150px]"
              />
              <Dropdown
                placeholder="Industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                options={[
                  { value: "technology", label: "Technology" },
                  { value: "healthcare", label: "Healthcare" },
                  { value: "manufacturing", label: "Manufacturing" },
                ]}
                className="min-w-[150px]"
              />
              <Dropdown
                placeholder="Organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                options={[
                  { value: "techcorp", label: "TechCorp" },
                  { value: "aces", label: "ACES Global" },
                  { value: "verisafe", label: "VeriSafe Labs" },
                ]}
                className="min-w-[170px]"
              />
              <Dropdown
                placeholder="Certificate"
                value={certificate}
                onChange={(event) => setCertificate(event.target.value)}
                options={[
                  { value: "iso9001", label: "ISO 9001" },
                  { value: "iso27001", label: "ISO 27001" },
                  { value: "soc2", label: "SOC 2 Type II" },
                ]}
                className="min-w-[170px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {resultCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center">
                      <svg
                        width="25"
                        height="25"
                        viewBox="0 0 25 25"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M21.2801 8.554C21.4191 6.901 21.9176 5.3835 22.7951 3.992L19.4281 0.75C18.3646 1.6315 17.1526 2.12 15.7806 2.206C14.5226 2.3155 13.3306 2.0855 12.2086 1.5145C11.0556 2.0665 9.86805 2.298 8.63055 2.206C7.37099 2.10541 6.16647 1.64671 5.15905 0.884L1.78355 4.125C2.61405 5.536 3.07655 7.0125 3.16705 8.554C3.21005 9.2635 3.00005 10.2415 2.52755 11.504C2.3131 12.1002 2.12574 12.7058 1.96605 13.319C1.84805 13.8235 1.77455 14.2325 1.74955 14.54C1.73255 15.8855 2.12455 17.1005 2.92855 18.181C3.55705 18.9695 4.59355 19.8405 6.03255 20.793C7.60655 21.5645 8.82505 22.065 9.67855 22.2785L10.3866 22.596C10.6091 22.698 10.8476 22.7985 11.0961 22.9075C11.6336 23.2175 12.0101 23.553 12.2086 23.8995C12.4526 23.524 12.8381 23.1975 13.3501 22.9075C13.657 22.7807 13.9614 22.6479 14.2631 22.509L14.7976 22.279C14.9801 22.1925 15.2186 22.0925 15.5086 21.982C15.8674 21.8452 16.2281 21.7134 16.5906 21.5865C17.4221 21.3035 18.0276 21.035 18.4121 20.793C19.8081 19.841 20.8286 18.9835 21.4781 18.218C22.3106 17.134 22.7156 15.913 22.6971 14.541C22.6476 13.926 22.3771 12.943 21.8861 11.6035C21.4191 10.298 21.2126 9.285 21.2801 8.554Z"
                          fill="black"
                        />
                      </svg>
                    </span>
                    <h2 className="text-lg font-semibold text-[#262626]">
                      {card.title}
                    </h2>
                  </div>
                  <span className="text-[#262626]">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M18.0001 6H8.2876C8.08869 6 7.89792 5.92098 7.75727 5.78033C7.61662 5.63968 7.5376 5.44891 7.5376 5.25C7.5376 5.05109 7.61662 4.86032 7.75727 4.71967C7.89792 4.57902 8.08869 4.5 8.2876 4.5H18.7501C18.949 4.5 19.1398 4.57902 19.2804 4.71967C19.4211 4.86032 19.5001 5.05109 19.5001 5.25V15.75C19.5001 15.9489 19.4211 16.1397 19.2804 16.2803C19.1398 16.421 18.949 16.5 18.7501 16.5C18.5512 16.5 18.3604 16.421 18.2198 16.2803C18.0791 16.1397 18.0001 15.9489 18.0001 15.75V6Z"
                        fill="#262626"
                      />
                      <path
                        d="M18.219 4.719C18.3598 4.57817 18.5508 4.49905 18.75 4.49905C18.9491 4.49905 19.1401 4.57817 19.281 4.719C19.4218 4.85983 19.5009 5.05084 19.5009 5.25C19.5009 5.44916 19.4218 5.64017 19.281 5.781L6.53097 18.531C6.46124 18.6007 6.37846 18.656 6.28735 18.6938C6.19624 18.7315 6.09859 18.7509 5.99997 18.7509C5.90135 18.7509 5.8037 18.7315 5.7126 18.6938C5.62149 18.656 5.5387 18.6007 5.46897 18.531C5.39924 18.4613 5.34392 18.3785 5.30619 18.2874C5.26845 18.1963 5.24902 18.0986 5.24902 18C5.24902 17.9014 5.26845 17.8037 5.30619 17.7126C5.34392 17.6215 5.39924 17.5387 5.46897 17.469L18.219 4.719Z"
                        fill="#262626"
                      />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray">
                  {card.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray">
                  <div className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M15.75 14.25H17.25V15.75H0.75V14.25H2.25V3C2.25 2.80109 2.32902 2.61032 2.46967 2.46967C2.61032 2.32902 2.80109 2.25 3 2.25H10.5C10.6989 2.25 10.8897 2.32902 11.0303 2.46967C11.171 2.61032 11.25 2.80109 11.25 3V14.25H12.75V6.75H15C15.1989 6.75 15.3897 6.82902 15.5303 6.96967C15.671 7.11032 15.75 7.30109 15.75 7.5V14.25ZM5.25 8.25V9.75H8.25V8.25H5.25ZM5.25 5.25V6.75H8.25V5.25H5.25Z"
                        fill="#999999"
                      />
                    </svg>
                    <span>{card.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M8.4465 16.6005C8.4465 16.6005 3 12.0135 3 7.5C3 5.9087 3.63214 4.38258 4.75736 3.25736C5.88258 2.13214 7.4087 1.5 9 1.5C10.5913 1.5 12.1174 2.13214 13.2426 3.25736C14.3679 4.38258 15 5.9087 15 7.5C15 12.0135 9.5535 16.6005 9.5535 16.6005C9.2505 16.8795 8.75175 16.8765 8.4465 16.6005ZM9 10.125C9.34472 10.125 9.68606 10.0571 10.0045 9.92518C10.323 9.79327 10.6124 9.59991 10.8562 9.35616C11.0999 9.1124 11.2933 8.82302 11.4252 8.50454C11.5571 8.18606 11.625 7.84472 11.625 7.5C11.625 7.15528 11.5571 6.81394 11.4252 6.49546C11.2933 6.17698 11.0999 5.8876 10.8562 5.64385C10.6124 5.40009 10.323 5.20674 10.0045 5.07482C9.68606 4.9429 9.34472 4.875 9 4.875C8.30381 4.875 7.63613 5.15156 7.14384 5.64385C6.65156 6.13613 6.375 6.80381 6.375 7.5C6.375 8.19619 6.65156 8.86387 7.14384 9.35616C7.63613 9.84844 8.30381 10.125 9 10.125Z"
                        fill="#999999"
                      />
                    </svg>
                    <span>{card.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5998 2.70001C3.12241 2.70001 2.66458 2.88965 2.32701 3.22722C1.98945 3.56479 1.7998 4.02262 1.7998 4.50001V7.80391C2.47495 6.96848 3.45432 6.43547 4.52246 6.32213C5.59061 6.20879 6.66002 6.52441 7.49545 7.19956C8.33089 7.87471 8.8639 8.85408 8.97724 9.92222C9.09057 10.9904 8.77495 12.0598 8.0998 12.8952V13.5H14.3998C14.8772 13.5 15.335 13.3104 15.6726 12.9728C16.0102 12.6352 16.1998 12.1774 16.1998 11.7V4.50001C16.1998 4.02262 16.0102 3.56479 15.6726 3.22722C15.335 2.88965 14.8772 2.70001 14.3998 2.70001H3.5998ZM4.9498 6.30001C4.83046 6.30001 4.716 6.2526 4.63161 6.16821C4.54722 6.08382 4.4998 5.96936 4.4998 5.85001C4.4998 5.73066 4.54722 5.61621 4.63161 5.53181C4.716 5.44742 4.83046 5.40001 4.9498 5.40001H13.0498C13.1692 5.40001 13.2836 5.44742 13.368 5.53181C13.4524 5.61621 13.4998 5.73066 13.4998 5.85001C13.4998 5.96936 13.4524 6.08382 13.368 6.16821C13.2836 6.2526 13.1692 6.30001 13.0498 6.30001H4.9498ZM9.8998 9.45001C9.8998 9.33066 9.94722 9.21621 10.0316 9.13181C10.116 9.04742 10.2305 9.00001 10.3498 9.00001H13.0498C13.1692 9.00001 13.2836 9.04742 13.368 9.13181C13.4524 9.21621 13.4998 9.33066 13.4998 9.45001C13.4998 9.56936 13.4524 9.68382 13.368 9.76821C13.2836 9.8526 13.1692 9.90001 13.0498 9.90001H10.3498C10.2305 9.90001 10.116 9.8526 10.0316 9.76821C9.94722 9.68382 9.8998 9.56936 9.8998 9.45001ZM4.9498 13.5C4.11437 13.5 3.31316 13.1681 2.72242 12.5774C2.13168 11.9867 1.7998 11.1854 1.7998 10.35C1.7998 9.51458 2.13168 8.71337 2.72242 8.12263C3.31316 7.53189 4.11437 7.20001 4.9498 7.20001C5.78524 7.20001 6.58645 7.53189 7.17719 8.12263C7.76793 8.71337 8.0998 9.51458 8.0998 10.35C8.0998 11.1854 7.76793 11.9867 7.17719 12.5774C6.58645 13.1681 5.78524 13.5 4.9498 13.5ZM2.6998 13.7178C3.36585 14.1627 4.14885 14.4001 4.9498 14.4C5.7823 14.4 6.5563 14.148 7.1998 13.7178V16.2C7.1998 16.2836 7.17653 16.3655 7.1326 16.4366C7.08866 16.5077 7.0258 16.5651 6.95105 16.6025C6.8763 16.6399 6.79262 16.6557 6.70939 16.6482C6.62616 16.6407 6.54666 16.6102 6.4798 16.56L5.2198 15.615C5.14191 15.5566 5.04717 15.525 4.9498 15.525C4.85244 15.525 4.7577 15.5566 4.6798 15.615L3.4198 16.56C3.35295 16.6102 3.27345 16.6407 3.19022 16.6482C3.10698 16.6557 3.02331 16.6399 2.94856 16.6025C2.87381 16.5651 2.81095 16.5077 2.76701 16.4366C2.72308 16.3655 2.6998 16.2836 2.6998 16.2V13.7178Z"
                        fill="#999999"
                      />
                    </svg>
                    <span>{card.certificates}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FB] px-4 py-6 text-slate-900" />
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

