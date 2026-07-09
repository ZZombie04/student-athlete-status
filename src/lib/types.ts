import type { SchoolLevel } from "./constants";

export interface SportEntryInput {
  sport: string;
  totalAthletes: number;
  failG1: number;
  failG2: number;
  failG3: number;
  completeG1: number;
  completeG2: number;
  completeG3: number;
  basicFailG1: number;
  basicFailG2: number;
  basicFailG3: number;
  note: string;
}

export interface SubmissionInput {
  region: string;
  schoolLevel: SchoolLevel;
  schoolName: string;
  password: string;
  sports: SportEntryInput[];
}

export interface SportEntryRecord extends SportEntryInput {
  id: string;
  submissionId: string;
}

export interface SubmissionRecord {
  id: string;
  region: string;
  schoolLevel: SchoolLevel;
  schoolName: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  sports: SportEntryRecord[];
}

export interface SubmissionPublic {
  id: string;
  region: string;
  schoolLevel: SchoolLevel;
  schoolName: string;
  createdAt: string;
  updatedAt: string;
  sports: SportEntryInput[];
}

export interface RegionStats {
  region: string;
  submissionCount: number;
  schoolCount: number;
  totalAthletes: number;
  totalFail: number;
  totalComplete: number;
  lastSubmittedAt: string | null;
  submissions: Array<{
    id: string;
    schoolName: string;
    schoolLevel: SchoolLevel;
    sportCount: number;
    totalAthletes: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface DashboardStats {
  totalSubmissions: number;
  totalSchools: number;
  totalAthletes: number;
  totalFail: number;
  totalComplete: number;
  byRegion: RegionStats[];
  bySchoolLevel: Record<string, number>;
  bySportTop: Array<{ sport: string; athletes: number }>;
  recentSubmissions: Array<{
    id: string;
    region: string;
    schoolName: string;
    schoolLevel: SchoolLevel;
    createdAt: string;
  }>;
}
