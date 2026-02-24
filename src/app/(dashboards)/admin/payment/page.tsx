'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../common/button';
import { Loading } from '../common/Loading';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import axios from 'axios';
import { axiosInstance } from '@/lib/axios';

interface PaymentCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
}

type Payment = {
  paymentId: string;
  organizationId: string;
  organizationName: string;
  assessmentOrCertificationType: string;
  certificateProductId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
};

type PaymentsApiResponse = {
  success: boolean;
  message: string;
  data?: {
    data?: Payment[];
    total?: number;
    page?: number;
    limit?: number;
  };
};

type PaymentMetrics = {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPaymentsCount: number;
  failedPaymentsCount: number;
};

type PaymentMetricsApiResponse = {
  success: boolean;
  message: string;
  data?: {
    totalRevenue?: number;
    monthlyRevenue?: number;
    pendingPaymentsCount?: number;
    pendingPaymentsAmount?: number;
    failedPaymentsCount?: number;
    failedPaymentsAmount?: number;
  };
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatStatus = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return status;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const truncateText = (value: string, maxLength = 40) => {
  const text = (value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/["\n\r,]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const downloadTextFile = (filename: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

const getStatusBadgeClass = (status: string) => {
  switch (status.trim().toLowerCase()) {
    case 'completed':
      return 'bg-green-50 text-green-600 border-green-300';
    case 'pending':
      return 'bg-yellow-50 text-yellow-600 border-yellow-300';
    case 'failed':
      return 'bg-red-50 text-red-600 border-red-300';
    default:
      return 'bg-zinc-100 text-secondary border-zinc-300';
  }
};

function PaymentCard({ icon, label, value, change, changeType = 'positive' }: PaymentCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-zinc-100">
      <div className="flex items-start justify-between mb-4">
        
        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        
        {change && (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              changeType === 'positive'
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      
      <p className="text-sm md:text-base font-normal text-gray mb-2">{label}</p>
      
      <p className="text-lg md:text-2xl font-semibold text-secondary">{value}</p>
    </div>
  );
}

export default function PaymentPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [isMetricsFetching, setIsMetricsFetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [pageLoadingProgress, setPageLoadingProgress] = useState(0);
  const pageLoaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageLoaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsMetricsFetching(true);
    try {
      const response = await axiosInstance.get<PaymentMetricsApiResponse>('/admin/payments/metrics');
      const apiMetrics = response.data?.data;
      if (!apiMetrics) {
        setMetrics(null);
        return;
      }

      setMetrics({
        totalRevenue: apiMetrics.totalRevenue ?? 0,
        monthlyRevenue: apiMetrics.monthlyRevenue ?? 0,
        pendingPaymentsCount: apiMetrics.pendingPaymentsCount ?? 0,
        failedPaymentsCount: apiMetrics.failedPaymentsCount ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch payment metrics:', err);
      setMetrics(null);
    } finally {
      setIsMetricsFetching(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsFetching(true);
    setError('');
    try {
      const response = await axiosInstance.get<PaymentsApiResponse>('/admin/payments', {
        params: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
        },
      });

      const payments = response.data?.data?.data ?? [];
      const nextTotal = response.data?.data?.total ?? payments.length;

      setData(payments);
      setTotal(nextTotal);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      let errorMessage = 'Failed to load payments. Please try again.';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
      setData([]);
      setTotal(0);
    } finally {
      setIsFetching(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const isPageFetching = isFetching || isMetricsFetching;

  useEffect(() => {
    if (pageLoaderIntervalRef.current) {
      clearInterval(pageLoaderIntervalRef.current);
      pageLoaderIntervalRef.current = null;
    }
    if (pageLoaderFinishTimeoutRef.current) {
      clearTimeout(pageLoaderFinishTimeoutRef.current);
      pageLoaderFinishTimeoutRef.current = null;
    }

    if (isPageFetching) {
      setShowPageLoader(true);
      setPageLoadingProgress(0);
      pageLoaderIntervalRef.current = setInterval(() => {
        setPageLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showPageLoader) {
      setPageLoadingProgress(100);
      pageLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowPageLoader(false);
        setPageLoadingProgress(0);
      }, 300);
    }
  }, [isPageFetching, showPageLoader]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const exportPageSize = 200;
      const maxPagesSafety = 5000;
      const allPayments: Payment[] = [];
      let page = 1;
      let totalFromApi: number | null = null;

      while (page <= maxPagesSafety) {
        const response = await axiosInstance.get<PaymentsApiResponse>('/admin/payments', {
          params: { page, limit: exportPageSize },
        });

        const batch = response.data?.data?.data ?? [];
        const apiTotal = response.data?.data?.total;
        if (typeof apiTotal === 'number') totalFromApi = apiTotal;

        allPayments.push(...batch);

        if (batch.length < exportPageSize) break;
        if (totalFromApi !== null && allPayments.length >= totalFromApi) break;
        page += 1;
      }

      if (allPayments.length === 0) {
        setExportError('No payments found to export.');
        return;
      }

      const headers = [
        'Payment ID',
        'Organization',
        'Assessment/Certification Type',
        'Certificate Product ID',
        'Amount',
        'Currency',
        'Status',
        'Payment Method',
        'Created At',
      ];

      const rows = allPayments.map((p) => [
        p.paymentId,
        p.organizationName,
        p.assessmentOrCertificationType,
        p.certificateProductId,
        p.amount,
        p.currency,
        p.status,
        p.paymentMethod,
        p.createdAt,
      ]);

      const csv = [
        headers.map(csvEscape).join(','),
        ...rows.map((row) => row.map(csvEscape).join(',')),
      ].join('\r\n');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = `payments_${yyyy}-${mm}-${dd}.csv`;

      downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
    } catch (err) {
      console.error('Failed to export payments:', err);
      let errorMessage = 'Failed to export payments. Please try again.';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: 'organizationName',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Organization
          </span>
        ),
        cell: ({ getValue }) => {
          const fullText = getValue<string>() || '';
          const displayText = truncateText(fullText, 40);
          return (
            <span
              className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray underline cursor-pointer block w-full truncate"
              style={{ letterSpacing: '1%' }}
              title={fullText}
            >
              {displayText}
            </span>
          );
        },
        size: 220,
        minSize: 180,
        maxSize: 260,
      },
      {
        accessorKey: 'assessmentOrCertificationType',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Certification
          </span>
        ),
        cell: ({ getValue }) => {
          const fullText = getValue<string>() || '';
          const displayText = truncateText(fullText, 40);
          return (
            <span
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle bg-zinc-100 text-secondary border border-zinc-300 text-center w-full truncate"
              title={fullText}
            >
              {displayText}
            </span>
          );
        },
        size: 320,
        minSize: 240,
        maxSize: 360,
      },
      {
        accessorKey: 'certificateProductId',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Reason
          </span>
        ),
        cell: ({ getValue }) => {
          const fullText = getValue<string>() || '';
          const displayText = truncateText(fullText, 40);
          return (
            <span
              className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block w-full truncate"
              style={{ letterSpacing: '1%' }}
              title={fullText}
            >
              {displayText}
            </span>
          );
        },
        size: 220,
        minSize: 160,
        maxSize: 280,
      },
      {
        accessorKey: 'amount',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Amount
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap"
            style={{ letterSpacing: '1%' }}
          >
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
        size: 110,
        minSize: 90,
        maxSize: 130,
      },
      {
        accessorKey: 'status',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Status
          </span>
        ),
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <span
              className={`inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[9px] md:text-xs font-medium leading-[100%] align-middle border whitespace-nowrap text-center ${getStatusBadgeClass(
                status
              )}`}
            >
              {formatStatus(status)}
            </span>
          );
        },
        size: 110,
        minSize: 90,
        maxSize: 130,
      },
      {
        accessorKey: 'paymentMethod',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Method
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray block truncate max-w-25 md:max-w-35"
            style={{ letterSpacing: '1%' }}
            title={getValue<string>()}
          >
            {getValue<string>()}
          </span>
        ),
        size: 130,
        minSize: 100,
        maxSize: 150,
      },
      {
        accessorKey: 'createdAt',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Date
          </span>
        ),
        cell: ({ getValue }) => (
          <span
            className="text-[10px] md:text-xs font-normal leading-[100%] align-middle text-dull-gray whitespace-nowrap"
            style={{ letterSpacing: '1%' }}
          >
            {formatDate(getValue<string>())}
          </span>
        ),
        size: 110,
        minSize: 90,
        maxSize: 130,
      },
      {
        id: 'action',
        header: () => (
          <span
            className="text-[10px] md:text-[12.2px] font-medium leading-[100%] align-middle text-center block"
            style={{ color: '#9B9B9B', letterSpacing: '1%' }}
          >
            Action
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <button 
              onClick={() => {
                setSelectedPayment(row.original);
                setIsPaymentDetailsModalOpen(true);
              }}
              className="px-3 py-1 md:px-5 md:py-1.5 border border-black rounded-lg text-[9px] md:text-xs font-normal text-secondary hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              View
            </button>
          </div>
        ),
        enableSorting: false,
        size: 100,
        minSize: 80,
        maxSize: 120,
      },
    ],
    []
  );

  const pageCount = useMemo(() => {
    if (total <= 0) return 1;
    return Math.max(1, Math.ceil(total / pagination.pageSize));
  }, [pagination.pageSize, total]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  return (
    <div className="relative p-3 md:p-6 bg-light-gray min-h-screen">
      {showPageLoader && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-light-gray/80 backdrop-blur-sm">
          <Loading isLoading size="lg" progress={pageLoadingProgress} className="p-6" />
        </div>
      )}
      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Payments
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Monitor incoming payments from organizations
          </p>
        </div>
        <Button
          variant="custom"
          className="px-3 py-1.5 md:px-8 md:py-3 rounded-lg text-[10px] md:text-sm shrink-0 text-white"
          style={{ backgroundColor: '#262626' }}
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{error}</p>
        </div>
      )}

      {exportError && (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{exportError}</p>
        </div>
      )}

      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
        <PaymentCard
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_467_2388)">
                <path fillRule="evenodd" clipRule="evenodd" d="M19.2328 13.8459C19.2328 18.0916 15.3857 20.0002 9.99995 20.0002C4.61423 20.0002 0.76709 18.0916 0.76709 13.8759C0.76709 9.26018 3.07566 6.92161 7.69138 4.58304L6.05709 1.53875C5.95958 1.38627 5.90528 1.21019 5.89998 1.02927C5.89469 0.848356 5.93859 0.669395 6.02701 0.511471C6.11543 0.353546 6.24505 0.22258 6.40206 0.132536C6.55906 0.0424922 6.73756 -0.00325241 6.91852 0.000179874H13.4428C13.6124 0.00451986 13.7781 0.0519467 13.9244 0.137997C14.0706 0.224047 14.1925 0.34589 14.2787 0.49206C14.3649 0.638229 14.4124 0.803918 14.4169 0.973532C14.4213 1.14315 14.3826 1.31111 14.3042 1.46161L12.3085 4.58304C16.9228 6.89018 19.2328 9.22875 19.2328 13.8459ZM10.8928 6.98161C10.8928 6.74481 10.7987 6.51771 10.6313 6.35026C10.4638 6.18282 10.2367 6.08875 9.99995 6.08875C9.76315 6.08875 9.53605 6.18282 9.3686 6.35026C9.20116 6.51771 9.10709 6.74481 9.10709 6.98161V7.87732C8.50192 7.90064 7.92609 8.14408 7.48772 8.56193C7.04935 8.97979 6.77861 9.54331 6.72634 10.1467C6.67407 10.75 6.84387 11.3517 7.20386 11.8387C7.56384 12.3257 8.08923 12.6646 8.68138 12.7916L10.7857 13.2516C11.0013 13.298 11.1922 13.4227 11.3214 13.6015C11.4506 13.7803 11.5091 14.0006 11.4855 14.22C11.4619 14.4393 11.3579 14.6422 11.1936 14.7894C11.0293 14.9367 10.8163 15.0178 10.5957 15.0173H9.40423C9.21953 15.0176 9.03928 14.9606 8.88832 14.8542C8.73737 14.7477 8.62314 14.5971 8.56138 14.423C8.52531 14.3088 8.46662 14.203 8.38882 14.112C8.31103 14.0209 8.2157 13.9464 8.10852 13.893C8.00134 13.8395 7.8845 13.8081 7.76495 13.8008C7.64541 13.7934 7.5256 13.8101 7.41266 13.85C7.29972 13.8899 7.19596 13.9521 7.10756 14.0329C7.01915 14.1137 6.94791 14.2115 6.89807 14.3204C6.84824 14.4293 6.82082 14.5472 6.81746 14.6669C6.8141 14.7866 6.83487 14.9058 6.87852 15.0173C7.04688 15.4915 7.34506 15.9088 7.73908 16.2218C8.1331 16.5347 8.60711 16.7307 9.10709 16.7873V17.6959C9.10709 17.9327 9.20116 18.1598 9.3686 18.3272C9.53605 18.4947 9.76315 18.5888 9.99995 18.5888C10.2367 18.5888 10.4638 18.4947 10.6313 18.3272C10.7987 18.1598 10.8928 17.9327 10.8928 17.6959V16.7873C11.5232 16.7157 12.1077 16.4227 12.5423 15.9606C12.977 15.4984 13.2336 14.8971 13.2665 14.2635C13.2994 13.6299 13.1065 13.0052 12.7221 12.5005C12.3376 11.9959 11.7866 11.6439 11.1671 11.5073L9.0628 11.0473C8.89208 11.0124 8.74052 10.915 8.63778 10.7742C8.53504 10.6335 8.48849 10.4595 8.50724 10.2862C8.526 10.113 8.6087 9.95292 8.73919 9.83741C8.86967 9.7219 9.03855 9.65921 9.2128 9.66161H10.5957C10.7806 9.66026 10.9613 9.71685 11.1125 9.82343C11.2637 9.93001 11.3777 10.0812 11.4385 10.2559C11.5216 10.4736 11.6865 10.6502 11.8981 10.748C12.1096 10.8458 12.351 10.857 12.5706 10.7792C12.7903 10.7015 12.9709 10.5409 13.0738 10.3318C13.1767 10.1227 13.1938 9.88169 13.1214 9.66018C12.9543 9.18537 12.6564 8.76744 12.2621 8.45454C11.8678 8.14164 11.3932 7.9465 10.8928 7.89161V6.98161Z" fill="black"/>
              </g>
              <defs>
                <clipPath id="clip0_467_2388">
                  <rect width="20" height="20" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          }
          label="Total Revenue"
          value={
            isMetricsFetching
              ? 'Loading...'
              : metrics
                ? formatMoney(metrics.totalRevenue, 'USD')
                : '—'
          }
        />
        <PaymentCard
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_467_2393)">
                <path d="M18.0859 0.792969L12.3281 2.95508L14.3945 4.25781C10.7031 8.90625 5.36328 11.7695 0.851562 12.8594L2.12969 15.1875C7.19922 13.5352 12.5664 10.5547 16.0234 5.28906L17.5977 6.28125L18.0859 0.792969ZM18.3867 5.35156L18.1992 7.49219L16.1953 6.22656C16.125 6.33203 16.0508 6.43359 15.9766 6.53906V19.0234H19.0234V5.35156H18.3867ZM12.5039 10.3516C12.0078 10.7812 11.4961 11.1875 10.9766 11.5703V19.0234H14.0234V10.3516H12.5039ZM7.67187 13.6328C7.10937 13.9297 6.54688 14.2031 5.97656 14.4609V19.0234H9.02344V13.6328H7.67187ZM0.976563 15.3516V19.0234H4.02344V15.3516H3.80156C3.22266 15.5664 2.64414 15.7656 2.06914 15.9492L1.79336 16.0352L1.41836 15.3516H0.976563Z" fill="black"/>
              </g>
              <defs>
                <clipPath id="clip0_467_2393">
                  <rect width="20" height="20" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          }
          label="Monthly Revenue"
          value={
            isMetricsFetching
              ? 'Loading...'
              : metrics
                ? formatMoney(metrics.monthlyRevenue, 'USD')
                : '—'
          }
        />
        <PaymentCard
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.83337 12.5H7.50004C7.50004 13.4 8.64171 14.1667 10 14.1667C11.3584 14.1667 12.5 13.4 12.5 12.5C12.5 11.5833 11.6334 11.25 9.80004 10.8083C8.03337 10.3667 5.83337 9.81667 5.83337 7.5C5.83337 6.00833 7.05837 4.74167 8.75004 4.31667V2.5H11.25V4.31667C12.9417 4.74167 14.1667 6.00833 14.1667 7.5H12.5C12.5 6.6 11.3584 5.83333 10 5.83333C8.64171 5.83333 7.50004 6.6 7.50004 7.5C7.50004 8.41667 8.36671 8.75 10.2 9.19167C11.9667 9.63333 14.1667 10.1833 14.1667 12.5C14.1667 13.9917 12.9417 15.2583 11.25 15.6833V17.5H8.75004V15.6833C7.05837 15.2583 5.83337 13.9917 5.83337 12.5Z" fill="black"/>
            </svg>
          }
          label="Pending Payment"
          value={
            isMetricsFetching
              ? 'Loading...'
              : metrics
                ? metrics.pendingPaymentsCount.toLocaleString('en-US')
                : '—'
          }
        />
        <PaymentCard
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 1.66699C14.6025 1.66699 18.3334 5.39783 18.3334 10.0003C18.3334 14.6028 14.6025 18.3337 10 18.3337C5.39752 18.3337 1.66669 14.6028 1.66669 10.0003C1.66669 5.39783 5.39752 1.66699 10 1.66699ZM10 12.5003C9.77901 12.5003 9.56705 12.5881 9.41076 12.7444C9.25448 12.9007 9.16669 13.1126 9.16669 13.3337C9.16669 13.5547 9.25448 13.7666 9.41076 13.9229C9.56705 14.0792 9.77901 14.167 10 14.167C10.221 14.167 10.433 14.0792 10.5893 13.9229C10.7456 13.7666 10.8334 13.5547 10.8334 13.3337C10.8334 13.1126 10.7456 12.9007 10.5893 12.7444C10.433 12.5881 10.221 12.5003 10 12.5003ZM10 5.00033C9.79591 5.00035 9.59891 5.07529 9.44638 5.21092C9.29385 5.34655 9.1964 5.53345 9.17252 5.73616L9.16669 5.83366V10.8337C9.16692 11.0461 9.24825 11.2504 9.39406 11.4048C9.53987 11.5592 9.73915 11.6522 9.95118 11.6646C10.1632 11.6771 10.372 11.6081 10.5349 11.4718C10.6978 11.3354 10.8024 11.1421 10.8275 10.9312L10.8334 10.8337V5.83366C10.8334 5.61264 10.7456 5.40068 10.5893 5.2444C10.433 5.08812 10.221 5.00033 10 5.00033Z" fill="black"/>
            </svg>
          }
          label="Failed payment"
          value={
            isMetricsFetching
              ? 'Loading...'
              : metrics
                ? metrics.failedPaymentsCount.toLocaleString('en-US')
                : '—'
          }
        />
      </div>

      
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250" style={{ tableLayout: 'fixed' }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-2 md:px-4 py-2 md:py-4 ${
                        header.id === 'action' ? 'text-center' : 'text-left'
                      }`}
                      style={{
                        width: `${header.column.getSize()}px`,
                        minWidth: `${header.column.columnDef.minSize || 100}px`,
                        maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isFetching ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    Loading payments...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray text-sm"
                  >
                    No payments found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-2 md:px-4 py-2 md:py-4 ${
                          cell.column.id === 'action' ? 'text-center' : ''
                        }`}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.columnDef.minSize || 100}px`,
                          maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-2 md:px-4 py-3 md:py-4 border-t border-zinc-100 flex items-center justify-center overflow-x-auto">
          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={isFetching || !table.getCanPreviousPage()}
              className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 md:w-4 md:h-4"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.2325 4.18414C10.4622 4.423 10.4547 4.80282 10.2159 5.0325L7.06567 8L10.2159 10.9675C10.4547 11.1972 10.4622 11.577 10.2325 11.8159C10.0028 12.0547 9.623 12.0622 9.38414 11.8325L5.78413 8.4325C5.66649 8.31938 5.6 8.16321 5.6 8C5.6 7.83679 5.66649 7.68062 5.78413 7.5675L9.38414 4.1675C9.623 3.93782 10.0028 3.94527 10.2325 4.18414Z"
                  fill="#999999"
                />
              </svg>
              <span className="hidden sm:inline ml-1 md:ml-0">Back</span>
            </button>
            {(() => {
              const currentPage = table.getState().pagination.pageIndex;
              const totalPages = table.getPageCount();
              const maxPagesToShow = 8;
              let startPage = 0;
              let endPage = Math.min(maxPagesToShow - 1, totalPages - 1);
              if (currentPage >= maxPagesToShow) {
                startPage = currentPage;
                endPage = Math.min(currentPage + maxPagesToShow - 1, totalPages - 1);
              }
              const pages = [];
              if (startPage > 0) {
                pages.push(
                  <span key="dots-before" className="px-1 md:px-2 text-[10px] md:text-xs text-gray">
                    ...
                  </span>
                );
              }
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => table.setPageIndex(i)}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                      currentPage === i
                        ? 'bg-dull-gray text-primary'
                        : 'bg-primary text-secondary border hover:bg-zinc-100'
                    }`}
                    style={
                      currentPage !== i
                        ? { borderColor: '#E6E6E6' }
                        : undefined
                    }
                  >
                    {i + 1}
                  </button>
                );
              }
              if (endPage < totalPages - 1) {
                pages.push(
                  <span key="dots-after" className="px-1 md:px-2 text-[10px] md:text-xs text-gray">
                    ...
                  </span>
                );
                pages.push(
                  <button
                    key={totalPages - 1}
                    onClick={() => table.setPageIndex(totalPages - 1)}
                    className={`px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-sm text-[10px] md:text-xs font-normal transition-colors ${
                      currentPage === totalPages - 1
                        ? 'bg-dull-gray text-primary'
                        : 'bg-primary text-secondary border hover:bg-zinc-100'
                    }`}
                    style={
                      currentPage !== totalPages - 1
                        ? { borderColor: '#E6E6E6' }
                        : undefined
                    }
                  >
                    {totalPages}
                  </button>
                );
              }
              return pages;
            })()}
            <button
              onClick={() => table.nextPage()}
              disabled={isFetching || !table.getCanNextPage()}
              className="flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 text-gray rounded-sm text-[10px] md:text-xs font-normal hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200"
            >
              <span className="hidden sm:inline mr-1 md:mr-0">Next</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3 h-3 md:w-4 md:h-4"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.76748 11.8159C5.5378 11.577 5.54525 11.1972 5.78411 10.9675L8.93431 8L5.78411 5.0325C5.54525 4.80282 5.5378 4.423 5.76748 4.18413C5.99715 3.94527 6.37698 3.93782 6.61584 4.1675L10.2158 7.5675C10.3335 7.68062 10.4 7.83679 10.4 8C10.4 8.16321 10.3335 8.31938 10.2158 8.4325L6.61584 11.8325C6.37698 12.0622 5.99715 12.0547 5.76748 11.8159Z"
                  fill="#999999"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      
      {isPaymentDetailsModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsPaymentDetailsModalOpen(false)}
          ></div>

          
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 p- md:p-4">
            
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg md:text-xl font-semibold text-secondary">
                Payment Details
              </h3>
              <button
                onClick={() => setIsPaymentDetailsModalOpen(false)}
                className=" hover:bg-zinc-100 rounded transition-colors"
              >
                <img src="/assets/imgs/admin/commons/cross.svg" alt="Close" className="w-6 h-6" />
              </button>
            </div>

            
            <div className="space-y-6">
              
              <div className="pb-6 border-b border-zinc-200">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="block text-sm font-normal text-gray mb-1">
                      Amount
                    </label>
                    <p className="text-base md:text-lg font-medium text-secondary">
                      {formatMoney(selectedPayment.amount, selectedPayment.currency)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center px-4 py-1 rounded-md text-xs font-medium border ${getStatusBadgeClass(
                      selectedPayment.status
                    )}`}
                  >
                    {formatStatus(selectedPayment.status)}
                  </span>
                </div>
              </div>

              
              <div>
                <label className="block text-sm font-normal text-gray">
                  Organization
                </label>
                <p className="text-sm md:text-base font-medium text-secondary">
                  {selectedPayment.organizationName}
                </p>
              </div>

              
              <div>
                <label className="block text-sm font-normal text-gray">
                  Transaction ID
                </label>
                <p className="text-sm md:text-base font-medium text-secondary">
                  {selectedPayment.paymentId}
                </p>
              </div>

              
              <div>
                <label className="block text-sm font-normal text-gray">
                  Certification
                </label>
                <p className="text-sm md:text-base font-medium text-secondary mb-1">
                  {selectedPayment.assessmentOrCertificationType}
                </p>
                <p className="text-xs md:text-sm font-normal text-gray">
                  {selectedPayment.certificateProductId}
                </p>
              </div>

              
              <div>
                <label className="block text-sm font-normal text-gray">
                  Payment Method
                </label>
                <p className="text-sm md:text-base font-medium text-secondary">
                  {selectedPayment.paymentMethod}
                </p>
              </div>

              
              <div>
                <label className="block text-sm font-normal text-gray">
                  Date
                </label>
                <p className="text-sm md:text-base font-medium text-secondary">
                  {formatDate(selectedPayment.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
