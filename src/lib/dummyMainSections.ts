// Shared dummy data for main sections, used by auditor review and other pages.
export const DUMMY_MAIN_SECTIONS = [
  {
    id: "ms-info-1",
    name: "Information Security Policies",
    isExpanded: true,
    sections: [
      {
        id: "sec-info-1",
        name: "Policy Management",
        isExpanded: false,
        subSections: [],
        questions: [
          {
            id: "q-1",
            text: "Environmental management system overview",
            helpText: "Provide a short overview",
            criteriaInformation: "Must include scope and responsibilities",
            type: "text",
            hasConditionalLogic: false,
          },
          {
            id: "q-2",
            text: "When was the policy last reviewed?",
            helpText: "Provide the last review date or quarter",
            criteriaInformation: "Should be within last 12 months",
            type: "text",
            hasConditionalLogic: false,
          },
          {
            id: "q-3",
            text: "Is there a documented approval process?",
            helpText: "Describe approval and version control",
            criteriaInformation: "Must reference responsible approvers",
            type: "boolean",
            hasConditionalLogic: false,
          },
          {
            id: "q-4",
            text: "List any compulsory documents related to the policy",
            helpText: "E.g., ISO certificates, licenses",
            criteriaInformation: "Provide file names or references",
            type: "text",
            hasConditionalLogic: false,
          },
        ],
      },
      {
        id: "sec-info-2",
        name: "Policy Communication",
        isExpanded: false,
        subSections: [],
        questions: [],
      },
      {
        id: "sec-info-3",
        name: "Policy Implementation",
        isExpanded: false,
        subSections: [],
        questions: [],
      },
    ],
  },
  {
    id: "ms-ops-1",
    name: "Operational Controls",
    isExpanded: false,
    sections: [
      {
        id: "sec-ops-1",
        name: "Access Control",
        isExpanded: false,
        subSections: [],
        questions: [
          {
            id: "q-ops-1",
            text: "Are user access reviews performed regularly?",
            helpText: "Describe frequency and responsible team",
            criteriaInformation: "Should be at least quarterly",
            type: "boolean",
            hasConditionalLogic: false,
          },
          {
            id: "q-ops-2",
            text: "Is multi-factor authentication enforced for privileged accounts?",
            helpText: "State which systems and enforcement method",
            criteriaInformation: "MFA required for all admin accounts",
            type: "boolean",
            hasConditionalLogic: false,
          },
        ],
      },
      {
        id: "sec-ops-2",
        name: "Encryption",
        isExpanded: false,
        subSections: [],
        questions: [],
      },
    ],
  },
];

