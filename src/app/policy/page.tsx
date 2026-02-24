"use client";

import { useState } from "react";
import LandingHeader from "@/app/components/landingPage/header";

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const isTerms = activeTab === "terms";
  const heading = isTerms ? "Terms of Service" : "Privacy Policy";
  const introText = isTerms
    ? "Please read these Terms of Service carefully before using our certification platform. By accessing or using our services, you agree to be bound by these terms."
    : "Your privacy matters to us. This policy explains how we collect, use, and protect your information when you use our certification platform.";

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-4 py-6 text-slate-900 flex flex-col">
      <LandingHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 py-10">
        <div className="w-full">
          <div className="inline-flex rounded-lg bg-white p-2 shadow-md">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`px-6 py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
                activeTab === "terms"
                  ? "bg-black text-white shadow-lg"
                  : "bg-white text-secondary hover:bg-zinc-50"
              }`}
              style={
                activeTab === "terms"
                  ? {
                      boxShadow:
                        "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                    }
                  : undefined
              }
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`px-6 py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
                activeTab === "privacy"
                  ? "bg-black text-white shadow-lg"
                  : "bg-white text-secondary hover:bg-zinc-50"
              }`}
              style={
                activeTab === "privacy"
                  ? {
                      boxShadow:
                        "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                    }
                  : undefined
              }
            >
              Privacy Policy
            </button>
          </div>

          <div className="mt-8 rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="space-y-6 text-gray">
              <div>
                <h2 className="text-xl font-semibold text-[#262626]">
                  {heading}
                </h2>
                <p className="mt-1 text-sm text-gray">
                  Last updated: January 8, 2026
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm sm:text-base">
                {introText}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Introduction
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  Welcome to our Certification Platform (&quot;Platform,&quot;
                  &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These
                  Terms of Service (&quot;Terms&quot;) govern your access to and
                  use of our certification services, including our website,
                  applications, and related services (collectively, the
                  &quot;Services&quot;).
                </p>
                <p className="text-sm leading-7 sm:text-base">
                  By creating an account, submitting an application, or
                  otherwise using our Services, you (&quot;Applicant,&quot;
                  &quot;you,&quot; or &quot;your&quot;) agree to these Terms. If
                  you are using the Services on behalf of an organization, you
                  represent that you have the authority to bind that
                  organization to these Terms.
                </p>
                <p className="text-sm leading-7 sm:text-base">
                  We reserve the right to modify these Terms at any time. We
                  will notify you of significant changes via email or through
                  the Platform. Your continued use of the Services after such
                  modifications constitutes acceptance of the updated Terms.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Account Responsibilities
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  To access our certification services, you must create an
                  account and provide accurate, complete, and current
                  information. You are responsible for:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    Maintaining the confidentiality of your account credentials
                  </li>
                  <li>All activities that occur under your account</li>
                  <li>
                    Notifying us immediately of any unauthorized use of your
                    account
                  </li>
                  <li>
                    Ensuring all information submitted is truthful and accurate
                  </li>
                  <li>Keeping your contact information up to date</li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  You may not share your account credentials with others, create
                  multiple accounts, or use another person&apos;s account
                  without permission. We reserve the right to suspend or
                  terminate accounts that violate these requirements.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Assessments &amp; Certifications
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  Our certification process involves assessments designed to
                  evaluate your organization&apos;s compliance with applicable
                  standards. By participating in our certification program, you
                  agree to:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    Provide accurate and complete documentation as requested
                  </li>
                  <li>
                    Cooperate fully with assessors during the evaluation process
                  </li>
                  <li>
                    Allow access to relevant facilities, personnel, and records
                  </li>
                  <li>
                    Implement corrective actions for identified non-conformities
                  </li>
                  <li>
                    Maintain compliance with certification requirements
                    throughout the validity period
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  Certifications are valid for the period specified and may be
                  renewed subject to successful reassessment. We reserve the
                  right to modify assessment criteria to reflect changes in
                  industry standards or regulatory requirements.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Payments
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  Certification services are subject to fees as outlined in your
                  service agreement or on our Platform. Payment terms include:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    All fees are quoted in the currency specified and are
                    exclusive of applicable taxes
                  </li>
                  <li>
                    Payment is due within the timeframe specified on your
                    invoice
                  </li>
                  <li>
                    Late payments may result in suspension of services or
                    additional charges
                  </li>
                  <li>
                    Fees are non-refundable unless otherwise stated in writing
                  </li>
                  <li>
                    We reserve the right to adjust pricing with 30 days&apos;
                    notice
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  If you dispute any charges, you must notify us in writing
                  within 14 days of the invoice date. Failure to pay may result
                  in suspension of your certification status and collection
                  actions.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Audits &amp; Reviews
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  As part of the certification process and ongoing compliance
                  monitoring, you agree to:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>Permit scheduled and unannounced surveillance audits</li>
                  <li>
                    Provide auditors with reasonable access to facilities and
                    documentation
                  </li>
                  <li>
                    Report significant changes to your operations that may
                    affect certification
                  </li>
                  <li>Respond to audit findings within specified timeframes</li>
                  <li>
                    Participate in periodic reviews as required by certification
                    standards
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  Audit findings are confidential and will only be shared with
                  relevant parties as required by accreditation bodies or
                  regulatory authorities. You will receive a copy of all audit
                  reports pertaining to your organization.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Certificate Usage
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  Upon successful certification, you may use your certificate
                  and associated marks subject to the following conditions:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    Certificates may only be used in connection with the
                    certified scope
                  </li>
                  <li>
                    Certification marks must be reproduced accurately without
                    modification
                  </li>
                  <li>
                    You may not use certificates to imply endorsement beyond the
                    certified scope
                  </li>
                  <li>
                    Certificates must be returned or destroyed upon expiration
                    or withdrawal
                  </li>
                  <li>
                    You must not make misleading claims about your certification
                    status
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  We maintain a public registry of valid certifications. By
                  accepting certification, you consent to the publication of
                  your organization&apos;s name, certified scope, and validity
                  dates in this registry.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Suspension &amp; Termination
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  We may suspend or terminate your certification or access to
                  Services under the following circumstances:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    Failure to maintain compliance with certification
                    requirements
                  </li>
                  <li>Non-payment of fees or breach of payment terms</li>
                  <li>Misuse of certification marks or misleading claims</li>
                  <li>
                    Refusal to permit audits or provide required documentation
                  </li>
                  <li>Fraudulent or unethical conduct</li>
                  <li>Violation of these Terms or applicable laws</li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  You may voluntarily withdraw from the certification program by
                  providing written notice. Upon suspension, termination, or
                  withdrawal, you must immediately cease using all certification
                  marks and return any physical certificates.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Limitation of Liability
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  To the maximum extent permitted by applicable law:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>
                    Our Services are provided &quot;as is&quot; without
                    warranties of any kind, express or implied
                  </li>
                  <li>
                    We do not guarantee that certification will meet all your
                    business objectives
                  </li>
                  <li>
                    Our liability for any claim arising from these Terms or
                    Services shall not exceed the fees paid by you in the twelve
                    months preceding the claim
                  </li>
                  <li>
                    We shall not be liable for indirect, incidental, special,
                    consequential, or punitive damages
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  Certification is based on evidence available at the time of
                  assessment and does not guarantee future compliance. You
                  remain responsible for maintaining compliance with all
                  applicable requirements.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Governing Law
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the jurisdiction in which our principal
                  office is located, without regard to conflict of law
                  principles.
                </p>
                <p className="text-sm leading-7 sm:text-base">
                  Any dispute arising from these Terms or your use of the
                  Services shall be resolved through:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm sm:text-base">
                  <li>Good faith negotiation between the parties</li>
                  <li>
                    Mediation by a mutually agreed mediator if negotiation fails
                  </li>
                  <li>
                    Binding arbitration in accordance with applicable
                    arbitration rules
                  </li>
                  <li>
                    Litigation in courts of competent jurisdiction as a last
                    resort
                  </li>
                </ul>
                <p className="text-sm leading-7 sm:text-base">
                  You agree to submit to the personal jurisdiction of courts in
                  our principal place of business for any actions not subject to
                  arbitration.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#262626]">
                  Contact Details
                </h3>
                <p className="text-sm leading-7 sm:text-base">
                  If you have questions about these Terms or need assistance
                  with our certification services, please contact us:
                </p>
                <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm sm:text-base">
                  <p className="font-medium text-[#262626]">
                    Certification Platform Legal Team
                  </p>
                  <p className="mt-3 text-[#262626]">
                    Email:{" "}
                    <span className="border-b border-current">
                      legal@certification-platform.com
                    </span>
                  </p>
                  <p className="text-[#262626]">Phone: +1 (555) 123-4567</p>
                  <p className="mt-3 text-sm sm:text-base">Mailing Address:</p>
                  <p className="text-[#262626]">123 Certification Way</p>
                  <p className="text-[#262626]">Suite 400</p>
                  <p className="text-[#262626]">Business City, BC 12345</p>
                </div>
                <p className="text-sm leading-7 sm:text-base">
                  For general inquiries, you may also reach us through the
                  contact form on our website. We aim to respond to all
                  inquiries within 2 business days.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm sm:text-base text-[#262626]">
                <span className="font-semibold text-[#262626]">
                  Acknowledgment:
                </span>{" "}
                By clicking &quot;I Agree&quot; during the signup process or by
                using our Services, you acknowledge that you have read,
                understood, and agree to be bound by these Terms of Service.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
