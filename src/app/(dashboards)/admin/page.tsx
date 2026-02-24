"use client";

import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  icon: string;
}

function StatCard({ label, value, trend, icon }: StatCardProps) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <img
          src={icon}
          alt={label}
          className="w-12 h-12"
        />
        <span
          className={`text-[14px] font-medium text-center leading-[14px] align-middle ${isPositive ? "text-green-600" : "text-red-600"
            }`}
        >
          {trend}
        </span>
      </div>
      <p className="text-sm md:text-[16px] font-normal md:leading-[24px] align-middle mb-2 px-2" style={{ color: "#060707" }}>{label}</p>
      <p className="text-[26px] font-medium text-secondary leading-[31.2px] align-middle px-2">{value}</p>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  alt: string;
  onClick?: () => void;
}

function QuickActionCard({ title, description, icon, alt, onClick }: QuickActionCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center gap-4 p-4 rounded-md border border-zinc-100 cursor-pointer hover:shadow-sm transition-all"
      style={{ backgroundColor: "#f5f5f5" }}
    >
      <img
        src={icon}
        alt={alt}
        className="w-10 h-10 md:w-12 md:h-12"
      />
      <div className="flex-1">
        <h3 className="text-[14px] md:text-[18px] font-semibold text-secondary leading-[1.2] align-middle mb-2">
          {title}
        </h3>
        <p className="text-[12px] md:text-[14px] font-normal leading-[1.2] align-middle" style={{ color: "#999999" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

interface AlertCardProps {
  title: string;
  detail: string;
  timestamp: string;
  icon?: string;
}

function AlertCard({ title, detail, timestamp, icon }: AlertCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-md relative overflow-hidden" style={{ backgroundColor: "#f5f5f5" }}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md" style={{ backgroundColor: "#262626" }}></div>
      <div className="shrink-0">
        {icon ? (
          <img src={icon} alt="Alert" className="w-8 h-8 md:w-10 md:h-10" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7">
            <path d="M12 5V19M5 12H19" stroke="#262626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="text-[14px] md:text-[18px] font-semibold text-secondary leading-[1.2] align-middle">
          {title}
        </h3>
        <p className="text-xs md:text-sm font-normal leading-[1.4] align-middle" style={{ color: "#999999" }}>
          {detail}
        </p>
        <p className="text-[10px] md:text-xs font-normal leading-[1.4] align-middle" style={{ color: "#999999" }}>
          {timestamp}
        </p>
      </div>
    </div>
  );
}

const selfAssessmentCards = [
  {
    label: "Total Sold",
    value: "96",
    trend: "+12%",
    icon: "/assets/imgs/admin/dashboard/totalSold.svg",
  },
  {
    label: "InProgress",
    value: "34",
    trend: "+8%",
    icon: "/assets/imgs/admin/dashboard/inProgress.svg",
  },
  {
    label: "Completed",
    value: "41",
    trend: "-5%",
    icon: "/assets/imgs/admin/dashboard/completed.svg",
  },
  {
    label: "idle",
    value: "21",
    trend: "+3%",
    icon: "/assets/imgs/admin/dashboard/idle.svg",
  },
];

const assuredCertificationCards = [
  {
    label: "Total Sold",
    value: "52",
    trend: "+12%",
    icon: "/assets/imgs/admin/dashboard/totalSold.svg",
  },
  {
    label: "Pending Auditor",
    value: "11",
    trend: "+8%",
    icon: "/assets/imgs/admin/dashboard/inProgress.svg",
  },
  {
    label: "Audit InProgress",
    value: "19",
    trend: "-5%",
    icon: "/assets/imgs/admin/dashboard/completed.svg",
  },
  {
    label: "Completed",
    value: "15",
    trend: "+3%",
    icon: "/assets/imgs/admin/dashboard/idle.svg",
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="p-6 bg-light-gray min-h-screen">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-secondary mb-2 leading-[21.6px] align-middle">Dashboard</h1>
        <p className="text-[15px] font-normal text-gray leading-[21.6px] align-middle">Overview of your ESG certification platform</p>
      </div>
      <div className="mb-10">
        <h2 className="text-[20px] font-semibold text-secondary mb-4 leading-[21.6px] align-middle">Self Assessment</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {selfAssessmentCards.map((card, index) => (
            <StatCard
              key={`self-assessment-${index}`}
              label={card.label}
              value={card.value}
              trend={card.trend}
              icon={card.icon}
            />
          ))}
        </div>
      </div>
      <div className="mb-10">
        <h2 className="text-[20px] font-semibold text-secondary mb-4 leading-[21.6px] align-middle">Assured Certification</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assuredCertificationCards.map((card, index) => (
            <StatCard
              key={`assured-certification-${index}`}
              label={card.label}
              value={card.value}
              trend={card.trend}
              icon={card.icon}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E6E6E6" }}  >
          <div className="flex items-center justify-between border-b p-3 md:p-5 mb-4 md:mb-6" style={{ borderColor: "#E6E6E6" }}>
            <h2 className="text-xs md:text-[16px] font-semibold text-secondary leading-[19.2px] align-middle">
              Certification Progress
            </h2>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1 md:gap-2">
                <svg width="10" height="10" className="md:w-[14px] md:h-[14px]" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7" cy="7" r="7" fill="#FFC851" />
                </svg>
                <span className="text-[10px] md:text-[16px] font-normal leading-[19.2px] align-middle" style={{ color: "#FFC851" }}>Completed</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <svg width="10" height="10" className="md:w-[14px] md:h-[14px]" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="7" cy="7" r="7" fill="#262626" />
                </svg>
                <span className="text-[10px] md:text-[16px] font-normal text-secondary leading-[19.2px] align-middle">In Progress</span>
              </div>
            </div>
          </div>
          <div className="pb-3 md:pb-5 pt-2 px-2 md:px-0">
            <div className="w-full mx-auto md:w-[94%] h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { day: "Mon", completed: 22, inProgress: 11 },
                    { day: "Tue", completed: 34, inProgress: 19 },
                    { day: "Wed", completed: 40, inProgress: 20 },
                    { day: "Thu", completed: 30, inProgress: 18 },
                    { day: "Fri", completed: 37, inProgress: 22 },
                    { day: "Sat", completed: 23, inProgress: 14 },
                    { day: "Sun", completed: 19, inProgress: 8 },
                  ]}
                  margin={{ top: 10, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#666", fontSize: 10 }}
                    stroke="#d0d0d0"
                    className="md:text-xs"
                  />
                  <YAxis
                    domain={[0, 60]}
                    tick={{ fill: "#666", fontSize: 10 }}
                    stroke="#d0d0d0"
                    width={30}
                    className="md:text-xs"
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#FFC851"
                    strokeWidth={2}
                    dot={{ fill: "#FFC851", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inProgress"
                    stroke="#262626"
                    strokeWidth={2}
                    dot={{ fill: "#262626", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E6E6E6" }}>
          <div className="flex border-b p-3 md:p-5 mb-4 md:mb-6" style={{ borderColor: "#E6E6E6" }}>
            <h2 className="text-xs md:text-[16px] font-semibold text-secondary leading-[19.2px] align-middle">
              Assessment Results
            </h2>
          </div>
          <div className="pb-3 md:pb-5 pt-2 px-3 md:px-5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6">
              <div className="relative shrink-0 w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px] lg:w-[260px] lg:h-[260px] xl:w-[320px] xl:h-[320px] 2xl:w-[400px] 2xl:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Passed", value: 220, color: "#FFC851" },
                        { name: "Pending", value: 120, color: "#FFDB8E" },
                        { name: "Failed", value: 54, color: "#FFF1D2" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius="40%"
                      outerRadius="75%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: "Passed", value: 220, color: "#FFC851" },
                        { name: "Pending", value: 120, color: "#FFDB8E" },
                        { name: "Failed", value: 54, color: "#FFF1D2" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
                  <div>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-2xl font-semibold text-secondary">394</p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-gray">Total</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-1.5 md:gap-2">
                  <div className="w-3 h-3 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full shrink-0" style={{ backgroundColor: "#FFC851" }}></div>
                  <span className="text-[10px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-normal text-secondary leading-[19.2px] align-middle whitespace-nowrap">Passed</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-1.5 md:gap-2">
                  <div className="w-3 h-3 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full shrink-0" style={{ backgroundColor: "#FFDB8E" }}></div>
                  <span className="text-[10px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-normal text-secondary leading-[19.2px] align-middle whitespace-nowrap">Pending</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-1.5 md:gap-2">
                  <div className="w-3 h-3 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full shrink-0" style={{ backgroundColor: "#FFF1D2" }}></div>
                  <span className="text-[10px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-normal text-secondary leading-[19.2px] align-middle whitespace-nowrap">Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E6E6E6" }}>
          <div className="flex border-b px-3 pt-2 pb-3 md:px-5 md:pt-3.75 md:pb-5" style={{ borderColor: "#E6E6E6" }}>
            <h2 className="text-xs md:text-[16px] font-semibold text-secondary leading-[19.2px] align-middle">
              Quick Actions
            </h2>
          </div>
          <div className="p-3 md:p-5">
            <div className="flex flex-col gap-4">
              <QuickActionCard
                title="Manage Certification"
                description="Start a new certification program"
                icon="/assets/imgs/admin/dashboard/plus.svg"
                alt="Certification"
                onClick={() => router.push("/admin/certifications")}
              />
              <QuickActionCard
                title="Payment"
                description="Manage all your payment"
                icon="/assets/imgs/admin/dashboard/payment2.svg"
                alt="Payment"
                onClick={() => router.push("/admin/payment")}
              />
              <QuickActionCard
                title="Manage Assessments"
                description="Manage Assessments"
                icon="/assets/imgs/admin/dashboard/manageAssess.svg"
                alt="Assessments"
                onClick={() => router.push("/admin/assessment")}
              />
              <QuickActionCard
                title="Manage Auditors and Reviewers"
                description="Manage Auditors and Reviewers"
                icon="/assets/imgs/admin/dashboard/manageAudRev.svg"
                alt="Auditors"
                onClick={() => router.push("/admin/auditors")}
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border" style={{ borderColor: "#E6E6E6" }}>
          <div className="flex border-b px-3 pt-2 pb-3 md:px-5 md:pt-3.75 md:pb-3.75 items-center justify-between" style={{ borderColor: "#E6E6E6" }}>
            <h2 className="text-xs md:text-[16px] font-semibold text-secondary leading-[19.2px] align-middle">
              Alerts
            </h2>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1.5 rounded-full text-[11px] font-medium leading-[14px] text-center align-middle flex items-center justify-center" style={{ backgroundColor: "#FFF1D2", color: "#FAAB00" }}>
                3 unread
              </span>
              <button className="px-2 rounded-lg border border-secondary text-[10px] font-normal leading-[24px] align-middle text-secondary hover:bg-gray-50 transition-colors flex items-center justify-center">
                View All
              </button>
            </div>
          </div>
          <div className="p-3 md:p-5">
            <div className="flex flex-col gap-4">
              <AlertCard
                title="Incomplete certification version"
                detail="ESG Standard v2.1 missing 3 required sections"
                timestamp="2 hours ago"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
