'use client'

import { useState } from 'react';

interface SupportTicketCardProps {
  title: string;
  category: string;
  certification: string;
  date: string;
  status: string;
  onStatusChange?: (newStatus: string) => void;
}

function SupportTicketCard({ 
  title, 
  category, 
  certification, 
  date, 
  status,
  onStatusChange 
}: SupportTicketCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  const statusOptions = ['In progress', 'Pending', 'Completed', 'Open', 'Resolved', 'Closed'];

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    setIsDropdownOpen(false);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const getStatusButtonClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in progress':
        return 'bg-[#e9e9e9] border-black text-black';
      case 'pending':
        return 'bg-yellow-50 border-yellow-300 text-yellow-700';
      case 'completed':
        return 'bg-green-50 border-green-300 text-green-700';
      default:
        return 'bg-zinc-100 border-zinc-200 text-secondary';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        <div className="flex-1">
          
          <h3 className="text-base md:text-lg font-semibold text-secondary mb-3">
            {title}
          </h3>

          
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.58329 5.83366C4.25177 5.83366 3.93383 5.70196 3.69941 5.46754C3.46499 5.23312 3.33329 4.91518 3.33329 4.58366C3.33329 4.25214 3.46499 3.9342 3.69941 3.69978C3.93383 3.46535 4.25177 3.33366 4.58329 3.33366C4.91481 3.33366 5.23276 3.46535 5.46718 3.69978C5.7016 3.9342 5.83329 4.25214 5.83329 4.58366C5.83329 4.91518 5.7016 5.23312 5.46718 5.46754C5.23276 5.70196 4.91481 5.83366 4.58329 5.83366ZM17.8416 9.65033L10.3416 2.15033C10.0416 1.85033 9.62496 1.66699 9.16663 1.66699H3.33329C2.40829 1.66699 1.66663 2.40866 1.66663 3.33366V9.16699C1.66663 9.62533 1.84996 10.042 2.15829 10.342L9.64996 17.842C9.95829 18.142 10.375 18.3337 10.8333 18.3337C11.2916 18.3337 11.7083 18.142 12.0083 17.842L17.8416 12.0087C18.15 11.7087 18.3333 11.292 18.3333 10.8337C18.3333 10.367 18.1416 9.95033 17.8416 9.65033Z" fill="#999999"/>
              </svg>
              <span className="text-sm text-gray">{category}</span>
            </div>

            
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6.66699V1.66699H5.00004C4.55801 1.66699 4.13409 1.84259 3.82153 2.15515C3.50897 2.46771 3.33337 2.89163 3.33337 3.33366V16.667C3.33337 17.109 3.50897 17.5329 3.82153 17.8455C4.13409 18.1581 4.55801 18.3337 5.00004 18.3337H15C15.4421 18.3337 15.866 18.1581 16.1786 17.8455C16.4911 17.5329 16.6667 17.109 16.6667 16.667V8.33366H11.6667C11.2247 8.33366 10.8008 8.15806 10.4882 7.8455C10.1756 7.53294 10 7.10902 10 6.66699ZM6.87504 9.58366H13.125C13.2908 9.58366 13.4498 9.64951 13.567 9.76672C13.6842 9.88393 13.75 10.0429 13.75 10.2087C13.75 10.3744 13.6842 10.5334 13.567 10.6506C13.4498 10.7678 13.2908 10.8337 13.125 10.8337H6.87504C6.70928 10.8337 6.55031 10.7678 6.4331 10.6506C6.31589 10.5334 6.25004 10.3744 6.25004 10.2087C6.25004 10.0429 6.31589 9.88393 6.4331 9.76672C6.55031 9.64951 6.70928 9.58366 6.87504 9.58366ZM6.87504 11.8753H13.125C13.2908 11.8753 13.4498 11.9412 13.567 12.0584C13.6842 12.1756 13.75 12.3346 13.75 12.5003C13.75 12.6661 13.6842 12.8251 13.567 12.9423C13.4498 13.0595 13.2908 13.1253 13.125 13.1253H6.87504C6.70928 13.1253 6.55031 13.0595 6.4331 12.9423C6.31589 12.8251 6.25004 12.6661 6.25004 12.5003C6.25004 12.3346 6.31589 12.1756 6.4331 12.0584C6.55031 11.9412 6.70928 11.8753 6.87504 11.8753ZM6.87504 14.167H13.125C13.2908 14.167 13.4498 14.2328 13.567 14.35C13.6842 14.4673 13.75 14.6262 13.75 14.792C13.75 14.9578 13.6842 15.1167 13.567 15.2339C13.4498 15.3511 13.2908 15.417 13.125 15.417H6.87504C6.70928 15.417 6.55031 15.3511 6.4331 15.2339C6.31589 15.1167 6.25004 14.9578 6.25004 14.792C6.25004 14.6262 6.31589 14.4673 6.4331 14.35C6.55031 14.2328 6.70928 14.167 6.87504 14.167ZM11.25 6.66699V2.08366L16.25 7.08366H11.6667C11.5562 7.08366 11.4502 7.03976 11.3721 6.96162C11.2939 6.88348 11.25 6.7775 11.25 6.66699Z" fill="#999999"/>
              </svg>
              <span className="text-sm text-gray">{certification}</span>
            </div>

            
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.66663 7.50033C1.66663 5.92866 1.66663 5.14366 2.15496 4.65533C2.64329 4.16699 3.42829 4.16699 4.99996 4.16699H15C16.5716 4.16699 17.3566 4.16699 17.845 4.65533C18.3333 5.14366 18.3333 5.92866 18.3333 7.50033C18.3333 7.89283 18.3333 8.08949 18.2116 8.21199C18.0891 8.33366 17.8916 8.33366 17.5 8.33366H2.49996C2.10746 8.33366 1.91079 8.33366 1.78829 8.21199C1.66663 8.08949 1.66663 7.89199 1.66663 7.50033ZM1.66663 15.0003C1.66663 16.572 1.66663 17.357 2.15496 17.8453C2.64329 18.3337 3.42829 18.3337 4.99996 18.3337H15C16.5716 18.3337 17.3566 18.3337 17.845 17.8453C18.3333 17.357 18.3333 16.572 18.3333 15.0003V10.8337C18.3333 10.4412 18.3333 10.2445 18.2116 10.122C18.0891 10.0003 17.8916 10.0003 17.5 10.0003H2.49996C2.10746 10.0003 1.91079 10.0003 1.78829 10.122C1.66663 10.2445 1.66663 10.442 1.66663 10.8337V15.0003Z" fill="#999999"/>
                <path d="M5.83325 2.5V5M14.1666 2.5V5" stroke="#999999" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="text-sm text-gray">{date}</span>
            </div>
          </div>
        </div>

        
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-center gap-2 px-4 py-1 border rounded-lg text-sm font-medium transition-colors min-w-[140px] ${getStatusButtonClass(currentStatus)}`}
          >
            <span>{currentStatus}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#999999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-20">
                {statusOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleStatusChange(option)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      currentStatus === option ? 'bg-zinc-100 font-medium' : ''
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="mb-4 md:mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Support Center
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Manage support tickets for your ESG certification inquiries
          </p>
        </div>
      </div>

      
      <div className="mb-4 md:mb-6">
        <h2 className="text-base md:text-lg font-semibold text-secondary leading-[21.6px] align-middle">
          All Ticks
        </h2>
      </div>

      
      <div className="space-y-4">
        <SupportTicketCard
          title="Missing documentation for carbon emissions reporting"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="In progress"
        />
        <SupportTicketCard
          title="Missing documentation for carbon emissions reporting"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="In progress"
        />
        <SupportTicketCard
          title="Missing documentation for carbon emissions reporting"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="Pending"
        />
        <SupportTicketCard
          title="Missing documentation for carbon emissions reporting"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="Pending"
        />
        <SupportTicketCard
          title="Question about GRI Standards compliance requirements"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="Completed"
        />
        <SupportTicketCard
          title="Question about GRI Standards compliance requirements"
          category="Documentation Issue"
          certification="ISO 14064-1 Carbon Footprint"
          date="Jan 15, 2024"
          status="Completed"
        />
      </div>
    </div>
  );
}