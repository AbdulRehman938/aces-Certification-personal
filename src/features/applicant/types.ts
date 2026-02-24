export interface Applicant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'applicant';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantProfileResponse {
  applicant: Applicant;
  stats?: {
    totalApplications: number;
    status: string;
  };
}

export interface UpdateApplicantDto {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}
