export type DashboardRole = "admin" | "auditor" | "reviewer";

export type MenuItem = {
  label: string;
  icon: string;
  href: string;
  resources?: string[];
};

type DashboardConfig = {
  roleLabel: string;
  defaultInitial: string;
  rootPath: string;
  expandedWidthClass: string;
  enablePermissions?: boolean;
  menuItems: MenuItem[];
};

export const dashboardConfig: Record<DashboardRole, DashboardConfig> = {
  admin: {
    roleLabel: "Admin",
    defaultInitial: "A",
    rootPath: "/admin",
    expandedWidthClass: "w-64",
    enablePermissions: true,
    menuItems: [
      {
        label: "Dashboard",
        icon: "/assets/imgs/admin/dashboard/dashboard.svg",
        href: "/admin",
        resources: [],
      },
      {
        label: "Industry",
        icon: "/assets/imgs/admin/dashboard/industry.svg",
        href: "/admin/industry",
        resources: ["industry"],
      },
      {
        label: "Certifications",
        icon: "/assets/imgs/admin/dashboard/certifications.svg",
        href: "/admin/certifications",
        resources: ["certifications"],
      },
      {
        label: "Assessment",
        icon: "/assets/imgs/admin/dashboard/assessments.svg",
        href: "/admin/assessment",
        resources: ["assessment", "assessments"],
      },
      {
        label: "AI Flags",
        icon: "/assets/imgs/admin/dashboard/flags.svg",
        href: "/admin/ai-flags",
        resources: ["aiFlags"],
      },
      {
        label: "Auditors & Reviewers",
        icon: "/assets/imgs/admin/dashboard/auditorReviewer.svg",
        href: "/admin/auditors",
        resources: ["auditor"],
      },
      {
        label: "Payment",
        icon: "/assets/imgs/admin/dashboard/payment.svg",
        href: "/admin/payment",
        resources: ["payment"],
      },
      {
        label: "Team",
        icon: "/assets/imgs/admin/dashboard/team.svg",
        href: "/admin/team",
        resources: ["team", "users"],
      },
      {
        label: "Notifications",
        icon: "/assets/imgs/admin/dashboard/bell.svg",
        href: "/admin/notifications",
        resources: [],
      },
      {
        label: "Messages",
        icon: "/assets/imgs/admin/dashboard/chat.svg",
        href: "/admin/messages",
        resources: ["messages"],
      },
      {
        label: "Setting",
        icon: "/assets/imgs/admin/dashboard/setting.svg",
        href: "/admin/settings",
        resources: ["setting"],
      },
      {
        label: "Support Center",
        icon: "/assets/imgs/admin/dashboard/support.svg",
        href: "/admin/support",
        resources: ["supportCenter"],
      },
    ],
  },
  auditor: {
    roleLabel: "Auditor",
    defaultInitial: "A",
    rootPath: "/auditor",
    expandedWidthClass: "w-64",
    menuItems: [
      {
        label: "Dashboard",
        icon: "/assets/imgs/auditor/sidebar/home.svg",
        href: "/auditor",
      },
      {
        label: "Assigned Audits",
        icon: "/assets/imgs/auditor/sidebar/assigned.svg",
        href: "/auditor/assignAudits",
      },
      {
        label: "Completed Audits",
        icon: "/assets/imgs/auditor/sidebar/completed.svg",
        href: "/auditor/completeAudits",
      },
      {
        label: "Notifications",
        icon: "/assets/imgs/admin/dashboard/bell.svg",
        href: "/auditor/notifications",
      },
      {
        label: "Messages",
        icon: "/assets/imgs/admin/dashboard/chat.svg",
        href: "/auditor/messages",
      },
      {
        label: "Setting",
        icon: "/assets/imgs/auditor/sidebar/setting.svg",
        href: "/auditor/settings",
      },
    ],
  },
  reviewer: {
    roleLabel: "Reviewer",
    defaultInitial: "R",
    rootPath: "/reviewer",
    expandedWidthClass: "w-70",
    menuItems: [
      {
        label: "Dashboard",
        icon: "/assets/imgs/reviewer/dashboard/dashboard.svg",
        href: "/reviewer",
      },
      {
        label: "Self-assured Certificates",
        icon: "/assets/imgs/reviewer/dashboard/certificates.svg",
        href: "/reviewer/assignSelfAssure",
      },
      {
        label: "Completed Reviewers",
        icon: "/assets/imgs/reviewer/dashboard/completed.svg",
        href: "/reviewer/completedReviews",
      },
      {
        label: "Notifications",
        icon: "/assets/imgs/admin/dashboard/bell.svg",
        href: "/reviewer/notifications",
      },
      {
        label: "Messages",
        icon: "/assets/imgs/admin/dashboard/chat.svg",
        href: "/reviewer/messages",
      },
      {
        label: "Setting",
        icon: "/assets/imgs/reviewer/dashboard/setting.svg",
        href: "/reviewer/settings",
      },
    ],
  },
};
