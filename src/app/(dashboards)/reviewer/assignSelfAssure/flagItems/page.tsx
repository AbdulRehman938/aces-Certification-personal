"use client";

import Button from "@/app/(dashboards)/admin/common/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FlagItemsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<number>(0);
  const [showReauditModal, setShowReauditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isIssued, setIsIssued] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const auditors = [
    {
      name: "Sarah Chen",
      email: "sarah.chen@certify.com",
      team: "Security & Privacy",
      available: true,
      disabled: false,
    },
    {
      name: "David Park",
      email: "david.park@certify.com",
      team: "Risk & Controls",
      available: true,
      disabled: false,
    },
    {
      name: "Emily Watson",
      email: "emily.watson@certify.com",
      team: "Compliance",
      available: false,
      disabled: true,
    },
    {
      name: "Michael Lee",
      email: "michael.lee@certify.com",
      team: "Security & Privacy",
      available: true,
      disabled: false,
    },
  ];
  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <button
        type="button"
        onClick={() => router.push("/reviewer/assignSelfAssure/review")}
        className="mb-4 md:mb-6 flex items-center focus:outline-none"
      >
        <svg
          width="23"
          height="23"
          viewBox="0 0 23 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="inline mx-1 rotate-180"
        >
          <path
            d="M9.58333 16.5868L14.6702 11.4999L9.58333 6.41309L8.90483 7.09159L13.3132 11.4999L8.90483 15.9083L9.58333 16.5868Z"
            fill="#999999"
          />
        </svg>
        <span className="text-sm text-[#999]">Back</span>
      </button>

      <h2 className="text-[16px] font-semibold text-dull-gray leading-[19.2px] align-middle">
        Flagged Items
      </h2>

      <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 xl:col-span-9">
          <div className="bg-white rounded-md border border-zinc-100 p-4 md:p-6 shadow-sm">
            <div className=" border border-zinc-100 rounded-md p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h4 className="text-sm font-medium text-secondary leading-[21.6px]">
                    Missing signature on policy document
                  </h4>
                </div>
                <span
                  className="inline-flex items-center px-6 py-0.5 rounded-md text-sm font-medium"
                  style={{
                    color: "#FAAB00",
                    backgroundColor: "#FEF7E5",
                    border: "1px solid #FAAB00",
                  }}
                >
                  Flagged
                </span>
              </div>

              <div className="space-y-4 pl-12 pr-3">
                <div>
                  <h5 className="text-sm font-medium text-gray leading-[21.6px] mb-2">
                    Applicant Response
                  </h5>
                  <div
                    className="min-h-[80px] p-4 rounded-md text-sm text-gray-700"
                    style={{ border: "1px solid #E6E6E6" }}
                  >
                    Yes, we have a comprehensive information security policy
                    that was last reviewed in Q3 2024. The policy covers data
                    classification, access control, incident response, and
                    employee responsibilities.
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray mb-2">
                    Attached Documents
                  </h5>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      className="flex items-center gap-1 px-3 py-2 rounded-md text-sm"
                      style={{ background: "#F6F6F6" }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_566_2624)">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M8.55746 2.08333C8.55746 2.02808 8.53551 1.93602 8.49644 1.93602C8.45737 1.89695 8.40438 1.875 8.34912 1.875H2.51579C1.908 1.875 1.32511 2.11644 0.895335 2.54621C0.465564 2.97598 0.224121 3.55888 0.224121 4.16667V15.8333C0.224121 16.4411 0.465564 17.024 0.895335 17.4538C1.32511 17.8836 1.908 18.125 2.51579 18.125H10.8491C11.4569 18.125 12.0398 17.8836 12.4696 17.4538C12.8993 17.024 13.1408 16.4411 13.1408 15.8333V7.6225C13.1408 7.56725 13.1188 7.51426 13.0798 7.47519C13.0407 7.43612 12.9877 7.41417 12.9325 7.41417H9.18246C9.01669 7.41417 8.85772 7.34832 8.74051 7.23111C8.6233 7.1139 8.55746 6.78917V2.08333ZM9.18246 10.2083C9.34822 10.2083 9.50719 10.2742 9.6244 10.3914C9.74161 10.5086 9.80746 10.6676 9.80746 10.8333C9.80746 10.9991 9.74161 11.1581 9.6244 11.2753C9.50719 11.3925 9.34822 11.4583 9.18246 11.4583H4.18245C4.01669 11.4583 3.85772 11.3925 3.74051 11.2753C3.6233 11.1581 3.55745 10.9991 3.55745 10.8333C3.55745 10.6676 3.6233 10.5086 3.74051 10.3914C3.85772 10.2742 4.01669 10.2083 4.18245 10.2083H9.18246ZM9.18246 13.5417C9.34822 13.5417 9.50719 13.6075 9.6244 13.7247C9.74161 13.8419 9.80746 14.0009 9.80746 14.1667C9.80746 14.3324 9.74161 14.4914 9.6244 14.6086C9.50719 14.7258 9.34822 14.7917 9.18246 14.7917H4.18245C4.01669 14.7917 3.85772 14.7258 3.74051 14.6086C3.6233 14.4914 3.55745 14.3324 3.55745 14.1667C3.55745 14.0009 3.6233 13.8419 3.74051 13.7247C3.85772 13.6075 4.01669 13.5417 4.18245 13.5417H9.18246ZM9.18246 14.167H13.1252C13.2909 14.167 13.4499 14.2328 13.5671 14.35C13.6843 14.4673 13.7502 14.6262 13.7502 14.792C13.7502 14.9578 13.6843 15.1167 13.5671 15.2339C13.4499 15.3511 13.2909 15.417 13.1252 15.417H9.18246C9.01669 15.417 8.85772 15.3511 8.74051 15.2339C8.6233 15.1167 8.55746 14.9578 8.55746 14.792C8.55746 14.6262 8.6233 14.4673 8.74051 14.35C8.55043 14.2328 9.01669 14.167 9.18246 14.167ZM11.2502 6.66699V2.08366L16.2502 7.08366H11.6668C11.5563 7.08366 11.4503 7.03976 11.3722 6.96162C11.2941 6.88348 11.2502 6.7775 11.2502 6.66699Z"
                            fill="#262626"
                          />
                          <path
                            d="M9.80737 2.35322C9.80737 2.19988 9.96821 2.10238 10.0874 2.19822C10.1885 2.27988 10.2782 2.37488 10.3565 2.48322L12.8674 5.98072C12.924 6.06072 12.8624 6.16405 12.764 6.16405H10.0157C9.96045 6.16405 9.90746 6.1421 9.86839 6.10303C9.82932 6.06396 9.80737 6.01097 9.80737 5.95572V2.35322Z"
                            fill="black"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_566_2624">
                            <rect width="20" height="20" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                      <span className="mr-3">ems_overview.pdf</span>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="cursor-pointer"
                        onClick={() => setShowDocumentPreview(true)}
                      >
                        <g clipPath="url(#clip0_702_4088)">
                          <path
                            d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                            fill="#262626"
                          />
                          <path
                            d="M19.3372 9.7875C18.6021 7.88603 17.326 6.24164 15.6665 5.05755C14.007 3.87347 12.0369 3.20161 9.99973 3.125C7.96256 3.20161 5.99248 3.87347 4.33299 5.05755C2.67349 6.24164 1.39733 7.88603 0.662234 9.7875C0.612589 9.92482 0.612589 10.0752 0.662234 10.2125C1.39733 12.114 2.67349 13.7584 4.33299 14.9424C5.99248 16.1265 7.96256 16.7984 9.99973 16.875C12.0369 16.7984 14.007 16.1265 15.6665 14.9424C17.326 13.7584 18.6021 12.114 19.3372 10.2125C19.3869 10.0752 19.3869 9.92482 19.3372 9.7875ZM9.99973 14.0625C9.19625 14.0625 8.41081 13.8242 7.74273 13.3778C7.07466 12.9315 6.55396 12.297 6.24647 11.5547C5.93899 10.8123 5.85854 9.99549 6.01529 9.20745C6.17205 8.4194 6.55896 7.69553 7.12711 7.12738C7.69526 6.55923 8.41913 6.17231 9.20718 6.01556C9.99523 5.85881 10.8121 5.93926 11.5544 6.24674C12.2967 6.55422 12.9312 7.07492 13.3776 7.743C13.824 8.41107 14.0622 9.19651 14.0622 10C14.0606 11.0769 13.632 12.1093 12.8705 12.8708C12.109 13.6323 11.0767 14.0608 9.99973 14.0625Z"
                            fill="#262626"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_702_4088">
                            <rect width="20" height="20" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>

                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="ml-1"
                      >
                        <g clipPath="url(#clip0_566_2628)">
                          <path
                            d="M6.68205 12.9788C6.57094 12.9788 6.46677 12.9616 6.36955 12.9272C6.27233 12.8927 6.18205 12.8336 6.09871 12.7497L3.09871 9.74968C2.93205 9.58301 2.85205 9.38857 2.85871 9.16634C2.86538 8.94412 2.94538 8.74968 3.09871 8.58301C3.26538 8.41634 3.46344 8.32968 3.69288 8.32301C3.92233 8.31634 4.1201 8.39607 4.28621 8.56218L5.84871 10.1247V4.16634C5.84871 3.93023 5.92871 3.73246 6.08871 3.57301C6.24871 3.41357 6.44649 3.33357 6.68205 3.33301C6.9176 3.33246 7.11566 3.41246 7.27621 3.57301C7.43677 3.73357 7.51649 3.93134 7.51538 4.16634V10.1247L9.07788 8.56218C9.24455 8.39551 9.4426 8.31551 9.67205 8.32218C9.90149 8.32884 10.0993 8.41579 10.2654 8.58301C10.4182 8.74968 10.4982 8.94412 10.5054 9.16634C10.5126 9.38857 10.4326 9.58301 10.2654 9.74968L7.26538 12.7497C7.18205 12.833 7.09177 12.8922 6.99455 12.9272C6.89733 12.9622 6.79316 12.9794 6.68205 12.9788ZM1.68205 16.6663C1.22371 16.6663 0.831492 16.5033 0.505381 16.1772C0.17927 15.8511 0.0159364 15.4586 0.0153809 14.9997V13.333C0.0153809 13.0969 0.0953809 12.8991 0.255381 12.7397C0.415381 12.5802 0.613159 12.5002 0.848714 12.4997C1.08427 12.4991 1.28233 12.5791 1.44288 12.7397C1.60344 12.9002 1.68316 13.098 1.68205 13.333V14.9997H11.682V13.333C11.682 13.0969 11.762 12.8991 11.922 12.7397C12.082 12.5802 12.2798 12.5002 12.5154 12.4997C12.7509 12.4991 12.949 12.5791 13.1095 12.7397C13.2701 12.9002 13.3498 13.098 13.3487 13.333V14.9997H11.682H1.68205ZM1.68205 16.6663C1.22371 16.6663 0.831492 16.5033 0.505381 16.1772C0.17927 15.8511 0.0159364 15.4586 0.0153809 14.9997V13.333C0.0153809 13.0969 0.0953809 12.8991 0.255381 12.7397C0.415381 12.5802 0.613159 12.5002 0.848714 12.4997C1.08427 12.4991 1.28233 12.5791 1.44288 12.7397C1.60344 12.9002 1.68316 13.098 1.68205 13.333V14.9997H11.682V13.333C11.682 13.0969 11.762 12.8991 11.922 12.7397C12.082 12.5802 12.2798 12.5002 12.5154 12.4997C12.7509 12.4991 12.949 12.5791 13.1095 12.7397C13.2701 12.9002 13.3498 13.098 13.3487 13.333V14.9997C13.3487 15.458 13.1857 15.8505 12.8595 16.1772C12.5334 16.5038 12.1409 16.6669 11.682 16.6663H1.68205Z"
                            fill="#262626"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_566_2628">
                            <rect width="20" height="20" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray mb-2">
                    AI Analysis
                  </h5>
                  <div
                    className="p-4 rounded-md text-sm text-gray-700 border"
                    style={{ borderColor: "#E6E6E6" }}
                  >
                    Policy document appears comprehensive. Version control
                    evident. Recommend verifying approval signatures.
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray mb-2">
                    Auditor Notes
                  </h5>
                  <div
                    className="p-4 rounded-md text-sm text-gray-700 border"
                    style={{ borderColor: "#E6E6E6" }}
                  >
                    Policy structure follows ISO requirements. Check section 4.3
                    for scope definition.
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray mb-2">
                    Reviewer Notes
                  </h5>
                  <textarea
                    className="w-full min-h-30 p-3 rounded-md text-sm border focus:outline-none focus:border-black"
                    style={{ borderColor: "#E6E6E6" }}
                    placeholder="Add your reviewer notes here..."
                  ></textarea>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <Button
                    variant="custom"
                    className="border rounded-lg px-6 py-2 font-semibold"
                    style={{
                      borderColor: "#E6E6E6",
                      color: "white",
                      background: "#E6E6E6",
                    }}
                  >
                    Non-Compliant
                  </Button>
                  <Button
                    variant="custom"
                    className="border rounded-lg px-6 py-2 font-semibold"
                    style={{ borderColor: "#E6E6E6", color: "#E6E6E6" }}
                  >
                    Request Clarification
                  </Button>
                  <Button
                    variant="custom"
                    className="border rounded-lg px-6 py-2 font-semibold"
                    style={{
                      borderColor: "#E6E6E6",
                      color: "#E6E6E6",
                      background: "white",
                    }}
                  >
                    Compliant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-md border border-zinc-100  flex flex-col">
            {isIssued ? (
              <div
                className="flex flex-col"
                style={{ backgroundColor: "#ffffff" }}
              >
                <div
                  className="p-4 border border-gray-300 rounded-md"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.33301 7.24912C3.3341 8.25871 3.58304 9.25375 4.05953 10.1532C4.53602 11.0526 5.22658 11.8309 6.07491 12.4246L6.07587 12.4255C6.6222 12.8105 7.22627 13.1131 7.86729 13.323L7.91587 13.3404C8.27705 13.4534 8.6476 13.5365 9.02348 13.5888C9.34614 13.6377 9.6721 13.6638 9.99872 13.6667H9.99967C10.333 13.6667 10.6568 13.6355 10.9778 13.5897L11.1511 13.564C11.4717 13.5103 11.7832 13.436 12.0854 13.3413L12.1254 13.3266C14.7616 12.4686 16.6663 10.0715 16.6663 7.24912C16.6663 3.71171 13.6759 0.833374 9.99967 0.833374C6.32348 0.833374 3.33301 3.71171 3.33301 7.24912ZM9.99967 2.66671C12.6244 2.66671 14.7616 4.72187 14.7616 7.24912H12.8568C12.8558 6.52016 12.5544 5.82135 12.0188 5.30598C11.4832 4.79061 10.757 4.50077 9.99967 4.50004V2.66671ZM5.73396 14.3955V19.1667L9.99967 17.7917L14.2654 19.1667L14.2663 14.3955C12.9702 15.1189 11.4985 15.4998 10.0002 15.4998C8.50184 15.4998 7.03013 15.1189 5.73396 14.3955Z"
                        fill="#262626"
                      />
                    </svg>
                    <h3 className="text-base font-semibold text-secondary">
                      Certificate Issued
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 px-2">
                    Decision made by John Reviewer
                  </p>
                </div>
              </div>
            ) : isBlocked ? (
              <div className="bg-gray-50 p-5 rounded-md">
                <div className="flex items-center gap-3 mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.99935 18.3333C8.84657 18.3333 7.76324 18.1144 6.74935 17.6766C5.73546 17.2388 4.85352 16.6452 4.10352 15.8958C3.35352 15.1463 2.75991 14.2644 2.32268 13.25C1.88546 12.2355 1.66657 11.1522 1.66602 9.99996C1.66546 8.84774 1.88435 7.7644 2.32268 6.74996C2.76102 5.73552 3.35463 4.85357 4.10352 4.10413C4.85241 3.35468 5.73435 2.76107 6.74935 2.32329C7.76435 1.88551 8.84768 1.66663 9.99935 1.66663C11.151 1.66663 12.2343 1.88551 13.2493 2.32329C14.2643 2.76107 15.1463 3.35468 15.8952 4.10413C16.6441 4.85357 17.238 5.73552 17.6768 6.74996C18.1157 7.7644 18.3344 8.84774 18.3327 9.99996C18.331 11.1522 18.1121 12.2355 17.676 13.25C17.2399 14.2644 16.6463 15.1463 15.8952 15.8958C15.1441 16.6452 14.2621 17.2391 13.2493 17.6775C12.2366 18.1158 11.1532 18.3344 9.99935 18.3333ZM14.1035 15.2708C14.3257 15.1041 14.5341 14.9236 14.7285 14.7291C14.923 14.5347 15.1035 14.3263 15.2702 14.1041L5.89518 4.72913C5.67296 4.89579 5.46463 5.07635 5.27018 5.27079C5.07574 5.46524 4.89518 5.67357 4.72852 5.89579L14.1035 15.2708Z"
                      fill="black"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-secondary">
                    Certificate Blocked
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Decision made by John Reviewer
                </p>
                <div className="p-2 rounded-md border border-gray-300 bg-white">
                  <p className="text-xs text-gray-700">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                </div>
              </div>
            ) : selectedAuditor === 0 && !isModalOpen ? (
              <div className="p-3 md:p-5 flex flex-col">
                <h3 className="text-lg font-semibold text-secondary mb-2">
                  Ready for Audit
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  All flags reviewed. This assessment requires an audit before
                  certification.
                </p>

                <div className="mt-auto">
                  <Button
                    variant="primary"
                    className="w-full rounded-md px-6 py-3 font-semibold"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Assign Auditor
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 md:p-5 flex flex-col">
                <h3 className="text-lg font-semibold text-secondary mb-2">
                  Final Decision
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Review the audit report and make the final certification
                  decision.
                </p>

                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full rounded-md px-6 py-3 font-semibold"
                    style={{ background: "#262626", color: "white" }}
                    onClick={() => setIsIssued(true)}
                  >
                    Issue Certificate
                  </Button>
                  <Button
                    variant="custom"
                    className="w-full rounded-md px-6 py-3 font-semibold border border-gray-300"
                    style={{ background: "#e9e9e9", color: "#262626" }}
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                  >
                    Block Certificate
                  </Button>
                  <Button
                    variant="custom"
                    className="w-full rounded-md px-6 py-3 font-semibold border border-gray-300"
                    style={{ background: "white", color: "#262626" }}
                    onClick={() => setShowReauditModal(true)}
                  >
                    Reaudit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 md:py-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-white rounded-md shadow-lg z-10 w-full max-w-xl max-h-[90vh] md:max-h-[85vh] flex flex-col">
            <div className="p-6 pb-4 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold">Assign Auditor</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Select an auditor to perform the compliance audit for this
                    assessment.
                  </p>
                </div>

                <button
                  aria-label="Close modal"
                  className="ml-4"
                  onClick={() => setIsModalOpen(false)}
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="close"
                    className="w-5 h-5"
                  />
                </button>
              </div>

              <h5 className="mt-6 text-base font-medium">Final Decision *</h5>
            </div>

            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                {auditors.map((auditor, idx) => (
                  <button
                    key={auditor.email}
                    onClick={() => !auditor.disabled && setSelectedAuditor(idx)}
                    type="button"
                    className={`w-full p-4 border rounded-md flex gap-6 transition-all ${selectedAuditor === idx ? "border-black bg-slate-50" : "border-[#E6E6E6] hover:border-gray-300"} ${auditor.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex pt-0.5 shrink-0">
                      {selectedAuditor === idx ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                          <circle cx="10" cy="10" r="6" fill="#262626" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                          <circle cx="10" cy="10" r="6" fill="#999999" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.66667 5.83333C6.66667 4.94928 7.01786 4.10143 7.64298 3.47631C8.2681 2.85119 9.11594 2.5 10 2.5C10.8841 2.5 11.7319 2.85119 12.357 3.47631C12.9821 4.10143 13.3333 4.94928 13.3333 5.83333C13.3333 6.71739 12.9821 7.56523 12.357 8.19036C11.7319 8.81548 10.8841 9.16667 10 9.16667C9.11594 9.16667 8.2681 8.81548 7.64298 8.19036C7.01786 7.56523 6.66667 6.71739 6.66667 5.83333ZM6.66667 10.8333C5.5616 10.8333 4.50179 11.2723 3.72039 12.0537C2.93899 12.8351 2.5 13.8949 2.5 15C2.5 15.663 2.76339 16.2989 3.23223 16.7678C3.70107 17.2366 4.33696 17.5 5 17.5H15C15.663 17.5 16.2989 17.2366 16.7678 16.7678C17.2366 16.2989 17.5 15.663 17.5 15C17.5 13.8949 17.061 12.8351 16.2796 12.0537C15.4982 11.2723 14.4384 10.8333 13.3333 10.8333H6.66667Z"
                                fill="black"
                              />
                            </svg>
                            <span className="text-base font-medium truncate">
                              {auditor.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 pl-6">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="shrink-0"
                            >
                              <path
                                d="M13.3335 2.66675H2.66683C1.9335 2.66675 1.34016 3.26675 1.34016 4.00008L1.3335 12.0001C1.3335 12.7334 1.9335 13.3334 2.66683 13.3334H13.3335C14.0668 13.3334 14.6668 12.7334 14.6668 12.0001V4.00008C14.6668 3.26675 14.0668 2.66675 13.3335 2.66675ZM13.0668 5.50008L8.3535 8.44675C8.14016 8.58008 7.86016 8.58008 7.64683 8.44675L2.9335 5.50008C2.86665 5.46256 2.80811 5.41186 2.76142 5.35105C2.71473 5.29025 2.68087 5.2206 2.66188 5.14633C2.64289 5.07206 2.63916 4.9947 2.65093 4.91895C2.6627 4.8432 2.68972 4.77062 2.73035 4.70562C2.77098 4.64061 2.82438 4.58452 2.88731 4.54074C2.95025 4.49697 3.02141 4.46642 3.09649 4.45095C3.17158 4.43547 3.24902 4.43539 3.32413 4.45071C3.39925 4.46603 3.47047 4.49644 3.5335 4.54008L8.00016 7.33342L12.4668 4.54008C12.5299 4.49644 12.6011 4.46603 12.6762 4.45071C12.7513 4.43539 12.8287 4.43547 12.9038 4.45095C12.9789 4.46642 13.0501 4.49697 13.113 4.54074C13.1759 4.58452 13.2293 4.64061 13.27 4.70562C13.3106 4.77062 13.3376 4.8432 13.3494 4.91895C13.3612 4.9947 13.3574 5.07206 13.3384 5.14633C13.3195 5.2206 13.2856 5.29025 13.2389 5.35105C13.1922 5.41186 13.1337 5.46256 13.0668 5.50008Z"
                                fill="#999999"
                              />
                            </svg>
                            <span className="text-sm text-gray-500 truncate">
                              {auditor.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 pl-6">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="shrink-0"
                            >
                              <g clipPath="url(#clip0_699_3699)">
                                <path
                                  d="M8 0.666748L2 3.33341V7.33342C2 11.0334 4.56 14.4934 8 15.3334C11.44 14.4934 14 11.0334 14 7.33342V3.33341L8 0.666748ZM8 7.99341H12.6667C12.3133 10.7401 10.48 13.1867 8 13.9534V8.00008H3.33333V4.20008L8 2.12675V7.99341Z"
                                  fill="#999999"
                                />
                              </g>
                              <defs>
                                <clipPath id="clip0_699_3699">
                                  <rect width="16" height="16" fill="white" />
                                </clipPath>
                              </defs>
                            </svg>
                            <span className="text-sm text-gray-400 truncate">
                              {auditor.team}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`w-24 inline-flex items-center justify-center px-3 py-0.5 rounded-md text-xs font-medium ${
                            auditor.available
                              ? "border text-gray-500"
                              : "text-gray-500"
                          }`}
                          style={
                            auditor.available
                              ? {
                                  border: "1px solid #00B448",
                                  color: "#00B448",
                                  background: "#F2FFF7",
                                }
                              : { background: "#F6F6F6" }
                          }
                        >
                          {auditor.available ? "Available" : "Busy"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                <Button
                  variant="custom"
                  className="px-4 py-2"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="px-4 py-2"
                  onClick={() => {
                    setIsModalOpen(false);
                  }}
                >
                  Assign Auditor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReauditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowReauditModal(false)}
          />
          <div className="relative bg-white rounded-lg w-[90%] max-w-xl p-6 shadow-lg">
            <button
              className="absolute top-4 right-4"
              onClick={() => setShowReauditModal(false)}
            >
              <img
                src="/assets/imgs/admin/commons/cross.svg"
                alt="close"
                className="w-5 h-5"
              />
            </button>

            <h3 className="text-lg font-medium text-secondary mb-3">Reaudit</h3>
            <p className="text-sm text-gray-600 mb-4">
              Describe your reaudit reason here....
            </p>

            <textarea
              className="w-full min-h-30 p-3 rounded-md text-sm border"
              style={{ borderColor: "#E6E6E6" }}
              placeholder="Describe your reaudit reason here...."
            />

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowReauditModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  console.log("Reaudit request sent");
                  setShowReauditModal(false);
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRejectModal(false)}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-secondary mb-2">
                  Block Certification
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "#999999" }}>
                  Please provide a reason for blocking this certification.
                </p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.47007 5.46983C5.6107 5.32938 5.80132 5.25049 6.00007 5.25049C6.19882 5.25049 6.38945 5.32938 6.53007 5.46983L18.5301 17.4698C18.6038 17.5385 18.6629 17.6213 18.7039 17.7133C18.7448 17.8053 18.7669 17.9046 18.7687 18.0053C18.7704 18.106 18.7519 18.206 18.7142 18.2994C18.6765 18.3928 18.6203 18.4776 18.5491 18.5489C18.4779 18.6201 18.3931 18.6762 18.2997 18.714C18.2063 18.7517 18.1063 18.7702 18.0056 18.7684C17.9048 18.7666 17.8055 18.7446 17.7135 18.7036C17.6215 18.6626 17.5387 18.6035 17.4701 18.5298L5.47007 6.52983C5.32962 6.3892 5.25073 6.19858 5.25073 5.99983C5.25073 5.80108 5.32962 5.61045 5.47007 5.46983Z"
                    fill="#262626"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.5301 5.46983C18.6705 5.61045 18.7494 5.80108 18.7494 5.99983C18.7494 6.19858 18.6705 6.3892 18.5301 6.52983L6.53009 18.5298C6.38792 18.6623 6.19987 18.7344 6.00557 18.731C5.81127 18.7276 5.62588 18.6489 5.48847 18.5114C5.35106 18.374 5.27234 18.1887 5.26892 17.9944C5.26549 17.8 5.33761 17.612 5.47009 17.4698L17.4701 5.46983C17.6107 5.32938 17.8013 5.25049 18.0001 5.25049C18.1988 5.25049 18.3895 5.32938 18.5301 5.46983Z"
                    fill="#262626"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6 mt-6">
              <div>
                <label className="block text-sm font-normal text-gray-500 mb-2">
                  Reason
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent"
                  placeholder="Describe reason for blocking certification..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-white border border-black rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors w-[160px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log("Block reason sent", blockReason);
                  setShowRejectModal(false);
                  setIsBlocked(true);
                }}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-dull-gray text-primary rounded-lg hover:bg-dull-gray/90 transition-colors shrink-0"
                style={{
                  fontFamily: "Public Sans",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "16px",
                  lineHeight: "24px",
                  letterSpacing: "0%",
                  verticalAlign: "middle",
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                Block Certification
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocumentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDocumentPreview(false)}
          />
          <div className="bg-white rounded-lg w-full max-w-2xl h-[90vh] shadow-lg z-10 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                Environmental_Policy_2024.pdf
              </h3>
              <button
                onClick={() => setShowDocumentPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="text-center">
                <h4 className="text-xl font-semibold text-gray-400 mb-2">
                  Document Preview
                </h4>
                <p className="text-gray-400 mb-2">
                  Environmental_Policy_2024.pdf
                </p>
                <p className="text-sm text-gray-500">
                  This is a placeholder for the actual document preview.
                  <br />
                  In production, a PDF viewer or image display would be shown
                  here.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 p-6 border-t border-gray-200">
              <button className="p-1 hover:bg-gray-100 rounded border border-gray-300">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.5 5L7.5 10L12.5 15"
                    stroke="#262626"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="text-xs text-gray-500 px-2">Page 1 of 5</span>
              <button className="p-1 hover:bg-gray-100 rounded border border-gray-300">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 5L12.5 10L7.5 15"
                    stroke="#262626"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

