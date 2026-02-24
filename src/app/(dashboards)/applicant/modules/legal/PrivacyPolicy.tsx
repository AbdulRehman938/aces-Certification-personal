"use client";

import { motion } from "framer-motion";

export const PrivacyPolicy = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 text-xs md:text-sm text-gray/80 leading-snug font-medium"
    >
      <div className="space-y-0.5">
        <h2 className="text-xl md:text-2xl font-semibold text-secondary">
          Privacy Policy
        </h2>
        <p className="text-xs md:text-sm text-gray/50 font-semibold">
          Last updated: January 8, 2026
        </p>
      </div>

      <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
        <p className="text-secondary font-semibold text-sm md:text-lg">
          Your privacy matters to us. This policy explains how we collect, use,
          and protect your information when you use our certification platform.
        </p>
      </div>

      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Introduction
        </h3>
        <p>
          Welcome to our Certification Platform (&quot;Platform,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of
          Service (&quot;Terms&quot;) govern your access to and use of our
          certification services, including our website, applications, and
          related services (collectively, the &quot;Services&quot;).
        </p>
        <p>
          By creating an account, submitting an application, or otherwise using
          our Services, you (&quot;Applicant,&quot; &quot;you,&quot; or
          &quot;your&quot;) agree to these Terms. If you are using the Services
          on behalf of an organization, you represent that you have the
          authority to bind that organization to these Terms.
        </p>
        <p>
          We reserve the right to modify these Terms at any time. We will notify
          you of significant changes via email or through the Platform. Your
          continued use of the Services after such modifications constitutes
          acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Account Responsibilities
        </h3>
        <p>
          To access our certification services, you must create an account and
          provide accurate, complete, and current information. You are
          responsible for:
        </p>
        <ul className="list-disc pl-5 space-y-1 marker:text-gray/50">
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>
            Notifying us immediately of any unauthorized use of your account
          </li>
          <li>Ensuring all information submitted is truthful and accurate</li>
          <li>Keeping your contact information up to date</li>
        </ul>
        <p>
          You may not share your account credentials with others, create
          multiple accounts, or use another person&apos;s account without
          permission. We reserve the right to suspend or terminate accounts that
          violate these requirements.
        </p>
      </section>

      {/* Assessments & Certifications */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Assessments & Certifications
        </h3>
        <p>
          Our certification process involves assessments designed to evaluate
          your organization&apos;s compliance with applicable standards. By
          participating in our certification program, you agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>Provide accurate and complete documentation as requested</li>
          <li>Cooperate fully with assessors during the evaluation process</li>
          <li>Allow access to relevant facilities, personnel, and records</li>
          <li>Implement corrective actions for identified non-conformities</li>
          <li>
            Maintain compliance with certification requirements throughout the
            validity period
          </li>
        </ul>
        <p>
          Certifications are valid for the period specified and may be renewed
          subject to successful reassessment. We reserve the right to modify
          assessment criteria to reflect changes in industry standards or
          regulatory requirements.
        </p>
      </section>

      {/* Payments */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Payments
        </h3>
        <p>
          Certification services are subject to fees as outlined in your service
          agreement or on our Platform. Payment terms include:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>
            All fees are quoted in the currency specified and are exclusive of
            applicable taxes
          </li>
          <li>Payment is due within the timeframe specified on your invoice</li>
          <li>
            Late payments may result in suspension of services or additional
            charges
          </li>
          <li>Fees are non-refundable unless otherwise stated in writing</li>
          <li>
            We reserve the right to adjust pricing with 30 days&apos; notice
          </li>
        </ul>
        <p>
          If you dispute any charges, you must notify us in writing within 14
          days of the invoice date. Failure to pay may result in suspension of
          your certification status and collection actions.
        </p>
      </section>

      {/* Audits & Reviews */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Audits & Reviews
        </h3>
        <p>
          As part of the certification process and ongoing compliance
          monitoring, you agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>
            As part of the certification process and ongoing compliance
            monitoring, you agree to:
          </li>
          <li>Permit scheduled and unannounced surveillance audits</li>
          <li>
            Provide auditors with reasonable access to facilities and
            documentation
          </li>
          <li>
            Report significant changes to your operations that may affect
            certification
          </li>
          <li>Respond to audit findings within specified timeframes</li>
          <li>
            Participate in periodic reviews as required by certification
            standards
          </li>
        </ul>
        <p>
          Audit findings are confidential and will only be shared with relevant
          parties as required by accreditation bodies or regulatory authorities.
          You will receive a copy of all audit reports pertaining to your
          organization.
        </p>
      </section>

      {/* Certificate Usage */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Certificate Usage
        </h3>
        <p>
          Upon successful certification, you may use your certificate and
          associated marks subject to the following conditions:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>
            Certificates may only be used in connection with the certified scope
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
            Certificates must be returned or destroyed upon expiration or
            withdrawal
          </li>
          <li>
            You must not make misleading claims about your certification status
          </li>
        </ul>
        <p>
          We maintain a public registry of valid certifications. By accepting
          certification, you consent to the publication of your
          organization&apos;s name, certified scope, and validity dates in this
          registry.
        </p>
      </section>

      {/* Suspension & Termination */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Suspension & Termination
        </h3>
        <p>
          We may suspend or terminate your certification or access to Services
          under the following circumstances:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>
            Failure to maintain compliance with certification requirements
          </li>
          <li>Non-payment of fees or breach of payment terms</li>
          <li>Misuse of certification marks or misleading claims</li>
          <li>Refusal to permit audits or provide required documentation</li>
          <li>Fraudulent or unethical conduct</li>
          <li>Violation of these Terms or applicable laws</li>
        </ul>
        <p>
          You may voluntarily withdraw from the certification program by
          providing written notice. Upon suspension, termination, or withdrawal,
          you must immediately cease using all certification marks and return
          any physical certificates.
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Limitation of Liability
        </h3>
        <p>To the maximum extent permitted by applicable law:</p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>
            Our Services are provided &quot;as is&quot; without warranties of
            any kind, express or implied
          </li>
          <li>
            We do not guarantee that certification will meet all your business
            objectives
          </li>
          <li>
            Our liability for any claim arising from these Terms or Services
            shall not exceed the fees paid by you in the twelve months preceding
            the claim
          </li>
          <li>
            We shall not be liable for indirect, incidental, special,
            consequential, or punitive damages
          </li>
        </ul>
        <p>
          Certification is based on evidence available at the time of assessment
          and does not guarantee future compliance. You remain responsible for
          maintaining compliance with all applicable requirements.
        </p>
      </section>

      {/* Governing Law */}
      <section className="space-y-1.5">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Governing Law
        </h3>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which our principal office is located,
          without regard to conflict of law principles.
        </p>
        <p>
          Any dispute arising from these Terms or your use of the Services shall
          be resolved through:
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-gray/50">
          <li>Good faith negotiation between the parties</li>
          <li>Mediation by a mutually agreed mediator if negotiation fails</li>
          <li>
            Binding arbitration in accordance with applicable arbitration rules
          </li>
          <li>
            Litigation in courts of competent jurisdiction as a last resort
          </li>
        </ul>
        <p>
          You agree to submit to the personal jurisdiction of courts in our
          principal place of business for any actions not subject to
          arbitration.
        </p>
      </section>

      {/* Contact Details */}
      <section className="bg-zinc-50 rounded-xl p-5 border border-zinc-100 space-y-2">
        <h3 className="text-base md:text-lg font-semibold text-secondary">
          Contact Details
        </h3>
        <p>
          If you have questions about these Terms or need assistance with our
          certification services, please contact us:.
        </p>
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <p className="font-semibold text-secondary">
              Certification Platform Legal Team
            </p>
            <p>
              Email:{" "}
              <span className="font-semibold border-b border-black">
                legal@certification-platform.com
              </span>
            </p>
            <p>
              Phone: <span className="font-semibold">+1 (555) 123-4567</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-gray/50 font-medium">Mailing Address:</p>
            <p className="font-semibold text-secondary">
              123 Certification Way
              <br />
              Suite 400
              <br />
              Business City, BC 12345
            </p>
          </div>
        </div>
        <p className="text-xs text-gray/40 pt-2 font-medium">
          For general inquiries, you may also reach us through the contact form
          on our website. We aim to respond to all inquiries within 2 business
          days.
        </p>
      </section>

      {/* Acknowledgment */}
      <section className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
        <p className="text-secondary font-semibold text-sm">
          Acknowledgment: By clicking &quot;I Agree&quot; during the signup
          process or by using our Services, you acknowledge that you have read,
          understood, and agree to be bound by these Terms of Service.
        </p>
      </section>
    </motion.div>
  );
};
