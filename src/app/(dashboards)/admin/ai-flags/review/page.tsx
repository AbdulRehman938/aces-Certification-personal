'use client'

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import React from 'react';
import Button from '../../common/button';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function MetricCard({ icon, title, value }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 md:gap-4">
        
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center shrink-0 border border-zinc-200">
          {icon}
        </div>
        
        <div className="flex-1">
          <h3
            className="text-gray mb-1 font-light md:text-[16px] text-[13px]"
            style={{
              color: '#060707'
            }}
          >
            {title}
          </h3>
          <p
            className="text-secondary font-medium md:text-[19px] text-[15px]"
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flagId = searchParams.get('id');

  
  const [reviewData] = useState({
    organisation: 'TechCorp Solutions',
    certification: 'ISO 27001 Security',
    type: 'Self-Assessment',
    flagged: 'Dec 20, 2024 19:32',
  });

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      
      <div className="flex items-center mb-4 md:mb-6 text-sm">
        <button
          onClick={() => router.push('/admin/ai-flags')}
          className="text-gray hover:text-secondary"
        >
          AI Flags
        </button>
        <span className="flex items-center">
          <svg
            width="23"
            height="23"
            viewBox="0 0 23 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="inline mx-1"
          >
            <path
              d="M9.58333 16.5868L14.6702 11.4999L9.58333 6.41309L8.90483 7.09159L13.3132 11.4999L8.90483 15.9083L9.58333 16.5868Z"
              fill="#999999"
            />
          </svg>
        </span>
        <span className="text-secondary">Review</span>
      </div>

      
      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div className="flex-1">
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            {reviewData.organisation}
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {reviewData.certification}
            </span>
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {reviewData.type}
            </span>
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {reviewData.flagged}
            </span>
          </div>
        </div>
        <button
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 border border-black"
        >
          <img
            src="/assets/imgs/admin/commons/filter.svg"
            alt="Filter"
            className="w-6 h-6 md:w-7 md:h-7"
          />
        </button>
      </div>

      
      <div className="bg-white rounded-xl p-4 md:p-4 shadow-sm mb-4 md:mb-6">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <h4 className="text-[16px] md:text-[18px] font-semibold text-secondary mr-4">
            Quick Actions
          </h4>
          <Button className="shrink-0 px-4 py-2 md:px-8 md:py-2">
            Improve All & Resolve
          </Button>
          <Button variant="secondary" className="px-4 py-1 md:px-6 md:py-2" >
            Escalated All Assessment
          </Button>
          </div>
      </div>

      
      <div className="mb-4 md:mb-6">
        
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-secondary mb-1">
            AI Analysis Summary
          </h2>
          <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
            Missing mandatory document for access control policy
          </span>
        </div>

        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.33333 2.5H16.6667C17.125 2.5 17.5 2.875 17.5 3.33333V18.3333C17.5 18.625 17.2792 18.8458 16.9875 18.8458C16.6958 18.8458 16.475 18.625 16.475 18.3333V16.6667H3.525V18.3333C3.525 18.625 3.30417 18.8458 3.0125 18.8458C2.72083 18.8458 2.5 18.625 2.5 18.3333V3.33333C2.5 2.875 2.875 2.5 3.33333 2.5ZM15.8333 14.1667V4.16667H4.16667V14.1667H15.8333Z" fill="#262626" />
              </svg>
            }
            title="Flags"
            value="1"
          />
          <MetricCard
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.66667 3.33333L10 6.66667L13.3333 3.33333H6.66667Z" fill="#262626" />
                <rect x="6.66667" y="8.33333" width="6.66667" height="6.66667" fill="#262626" />
                <circle cx="10" cy="15" r="2.5" fill="#262626" />
              </svg>
            }
            title="Categories"
            value="Doc"
          />
          <MetricCard
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1.66667L2.5 17.5H17.5L10 1.66667ZM10 8.33333V13.3333M10 15H10.0083" stroke="#262626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Risk Level"
            value="high"
          />
          <MetricCard
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2.5C5.83333 2.5 2.5 5.83333 2.5 10C2.5 14.1667 5.83333 17.5 10 17.5C14.1667 17.5 17.5 14.1667 17.5 10C17.5 5.83333 14.1667 2.5 10 2.5ZM10 15.8333C6.775 15.8333 4.16667 13.225 4.16667 10C4.16667 6.775 6.775 4.16667 10 4.16667C13.225 4.16667 15.8333 6.775 15.8333 10C15.8333 13.225 13.225 15.8333 10 15.8333Z" fill="#262626" />
                <path d="M10 5.83333V10L12.5 12.5" stroke="#262626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Confidence"
            value="92%"
          />
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-secondary mb-1">
        AI Analysis Summary
        </h2>
      </div>

      
      <div className="bg-white rounded-xl shadow-sm">
        
        <div className="flex items-start gap-3 p-4 md:p-6 border-b border-zinc-200">
          <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-secondary">1</span>
          </div>
          <div className="flex-1">
            <p className="text-sm md:text-base font-medium text-secondary">
              Please upload your organization's Access Control Policy document.
            </p>
          </div>
          <span className="px-6 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: '#ffe6e6', color: '#DC2626', borderColor: '#DC2626' }}>
            High
          </span>
        </div>

        
        <div className="p-4 md:p-6">
          <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
            Applicant's Answer
          </span>
          <div
            className="px-4 py-3 border border-zinc-200 rounded-md"
            style={{ backgroundColor: "#e9e9e9" }}
          >
            <p className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle">
              We have an access control policy in place.
            </p>
          </div>
        </div>

        
        <div className="p-4 md:p-6">
          <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
              AI Flag Reason
            </span>
          <div className="px-4 py-3 rounded-md border" style={{ backgroundColor: '#ffe6e6', borderColor: '#DC2626' }}>
              <p className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle" style={{ color: '#DC2626' }}>
                No document was uploaded despite claiming policy exists
              </p>
          </div>
        </div>

        
        <div className="p-4 md:p-6">
          <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
            AI Suggestion
          </span>
          <div className="px-4 py-3 rounded-md border" style={{ backgroundColor: '#fef3c7', borderColor: '#F59E0B' }}>
            <p className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle" style={{ color: '#F59E0B' }}>
              Request the actual policy document for verification
            </p>
          </div>
        </div>

        
        <div className="p-4 md:p-6 flex flex-wrap gap-3">
          <Button className="shrink-0">
            Approve Assessment
          </Button>
          <Button variant="secondary" className="px-4 py-2 md:px-6 md:py-3">
            Request Clarification
          </Button>
          <Button variant="custom" className="px-4 py-2 md:px-6 md:py-3 text-secondary border border-black" style={{ backgroundColor: '#e9e9e9' }}>
            Escalate to Audit
          </Button>
        </div>
      </div>
      
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
    </div>
    }>
      <ReviewPageContent />
    </Suspense>
  );
}
