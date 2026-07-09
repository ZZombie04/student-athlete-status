import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { SchoolLevel } from "./constants";
import type {
  DashboardStats,
  RegionStats,
  SportEntryInput,
  SubmissionPublic,
  SubmissionRecord,
} from "./types";

/* ─────────────────────────────────────────────
 * Dual DB: SQLite (local) / PostgreSQL (Railway)
 * ───────────────────────────────────────────── */

const isPostgres = () => {
  const url = process.env.DATABASE_URL || "";
  return (
    url.startsWith("postgres://") ||
    url.startsWith("postgresql://")
  );
};

// ── SQLite ──────────────────────────────────
type SqliteDb = {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => Record<string, unknown> | undefined;
    all: (...args: unknown[]) => Record<string, unknown>[];
  };
  exec: (sql: string) => void;
  pragma: (s: string) => void;
};

let sqliteDb: SqliteDb | null = null;

function getSqlite(): SqliteDb {
  if (sqliteDb) return sqliteDb;
  // Local only — Railway uses PostgreSQL (optionalDependency)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as new (
    path: string
  ) => SqliteDb;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pathMod = require("path") as typeof import("path");
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const raw = process.env.DATABASE_URL?.replace(/^file:/, "") || "data/dev.db";
  const relative = raw.startsWith("./") ? raw.slice(2) : raw;
  const dbPath = pathMod.isAbsolute(raw)
    ? raw
    : pathMod.join(cwd, relative);
  fs.mkdirSync(pathMod.dirname(dbPath), { recursive: true });
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  return sqliteDb;
}

// ── Postgres ────────────────────────────────
type PgPool = {
  query: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

let pgPool: PgPool | null = null;

async function getPg(): Promise<PgPool> {
  if (pgPool) return pgPool;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as {
    Pool: new (c: { connectionString: string; ssl?: object }) => PgPool;
  };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  pgPool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return pgPool;
}

function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function queryAll(
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  if (isPostgres()) {
    const pool = await getPg();
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows;
  }
  const db = getSqlite();
  return db.prepare(sql).all(...params);
}

async function queryOne(
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown> | undefined> {
  if (isPostgres()) {
    const pool = await getPg();
    const res = await pool.query(toPgPlaceholders(sql), params);
    return res.rows[0];
  }
  const db = getSqlite();
  return db.prepare(sql).get(...params);
}

async function exec(sql: string, params: unknown[] = []): Promise<void> {
  if (isPostgres()) {
    const pool = await getPg();
    await pool.query(toPgPlaceholders(sql), params);
    return;
  }
  const db = getSqlite();
  db.prepare(sql).run(...params);
}

async function execRaw(sql: string): Promise<void> {
  if (isPostgres()) {
    const pool = await getPg();
    await pool.query(sql);
    return;
  }
  getSqlite().exec(sql);
}

/* ─────────────────────────────────────────────
 * Schema init
 * ───────────────────────────────────────────── */

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  if (isPostgres()) {
    await execRaw(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        region TEXT NOT NULL,
        school_level TEXT NOT NULL,
        school_name TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sport_entries (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        sport TEXT NOT NULL,
        total_athletes INTEGER NOT NULL DEFAULT 0,
        fail_g1 INTEGER NOT NULL DEFAULT 0,
        fail_g2 INTEGER NOT NULL DEFAULT 0,
        fail_g3 INTEGER NOT NULL DEFAULT 0,
        complete_g1 INTEGER NOT NULL DEFAULT 0,
        complete_g2 INTEGER NOT NULL DEFAULT 0,
        complete_g3 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g1 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g2 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g3 INTEGER NOT NULL DEFAULT 0,
        note TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_submissions_region ON submissions(region);
      CREATE INDEX IF NOT EXISTS idx_sport_entries_submission ON sport_entries(submission_id);
    `);
  } else {
    await execRaw(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        region TEXT NOT NULL,
        school_level TEXT NOT NULL,
        school_name TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sport_entries (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        sport TEXT NOT NULL,
        total_athletes INTEGER NOT NULL DEFAULT 0,
        fail_g1 INTEGER NOT NULL DEFAULT 0,
        fail_g2 INTEGER NOT NULL DEFAULT 0,
        fail_g3 INTEGER NOT NULL DEFAULT 0,
        complete_g1 INTEGER NOT NULL DEFAULT 0,
        complete_g2 INTEGER NOT NULL DEFAULT 0,
        complete_g3 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g1 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g2 INTEGER NOT NULL DEFAULT 0,
        basic_fail_g3 INTEGER NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_submissions_region ON submissions(region);
      CREATE INDEX IF NOT EXISTS idx_sport_entries_submission ON sport_entries(submission_id);
    `);
  }
  initialized = true;
}

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

function mapSport(row: Record<string, unknown>): SportEntryInput & {
  id: string;
  submissionId: string;
} {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    sport: String(row.sport),
    totalAthletes: Number(row.total_athletes) || 0,
    failG1: Number(row.fail_g1) || 0,
    failG2: Number(row.fail_g2) || 0,
    failG3: Number(row.fail_g3) || 0,
    completeG1: Number(row.complete_g1) || 0,
    completeG2: Number(row.complete_g2) || 0,
    completeG3: Number(row.complete_g3) || 0,
    basicFailG1: Number(row.basic_fail_g1) || 0,
    basicFailG2: Number(row.basic_fail_g2) || 0,
    basicFailG3: Number(row.basic_fail_g3) || 0,
    note: String(row.note || ""),
  };
}

function mapSubmission(
  row: Record<string, unknown>,
  sports: ReturnType<typeof mapSport>[]
): SubmissionRecord {
  return {
    id: String(row.id),
    region: String(row.region),
    schoolLevel: String(row.school_level) as SchoolLevel,
    schoolName: String(row.school_name),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sports,
  };
}

function toPublic(s: SubmissionRecord): SubmissionPublic {
  return {
    id: s.id,
    region: s.region,
    schoolLevel: s.schoolLevel,
    schoolName: s.schoolName,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    sports: s.sports.map(({ id: _i, submissionId: _s, ...rest }) => rest),
  };
}

async function loadSports(submissionId: string) {
  const rows = await queryAll(
    `SELECT * FROM sport_entries WHERE submission_id = ? ORDER BY sport`,
    [submissionId]
  );
  return rows.map(mapSport);
}

/* ─────────────────────────────────────────────
 * Public API
 * ───────────────────────────────────────────── */

export async function findBySchoolName(
  schoolName: string
): Promise<SubmissionRecord | null> {
  await initDb();
  const row = await queryOne(
    `SELECT * FROM submissions WHERE school_name = ?`,
    [schoolName]
  );
  if (!row) return null;
  const sports = await loadSports(String(row.id));
  return mapSubmission(row, sports);
}

export async function findSubmission(
  region: string,
  schoolLevel: string,
  schoolName: string
): Promise<SubmissionRecord | null> {
  await initDb();
  const row = await queryOne(
    `SELECT * FROM submissions WHERE region = ? AND school_level = ? AND school_name = ?`,
    [region, schoolLevel, schoolName]
  );
  if (!row) return null;
  const sports = await loadSports(String(row.id));
  return mapSubmission(row, sports);
}

export async function createSubmission(data: {
  region: string;
  schoolLevel: SchoolLevel;
  schoolName: string;
  password: string;
  sports: SportEntryInput[];
}): Promise<SubmissionPublic> {
  await initDb();

  const existing = await findBySchoolName(data.schoolName);
  if (existing) {
    throw new Error("DUPLICATE_SCHOOL");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, 10);

  await exec(
    `INSERT INTO submissions (id, region, school_level, school_name, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.region,
      data.schoolLevel,
      data.schoolName,
      passwordHash,
      now,
      now,
    ]
  );

  for (const s of data.sports) {
    await exec(
      `INSERT INTO sport_entries (
        id, submission_id, sport, total_athletes,
        fail_g1, fail_g2, fail_g3,
        complete_g1, complete_g2, complete_g3,
        basic_fail_g1, basic_fail_g2, basic_fail_g3, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        id,
        s.sport,
        s.totalAthletes,
        s.failG1,
        s.failG2,
        s.failG3,
        s.completeG1,
        s.completeG2,
        s.completeG3,
        s.basicFailG1,
        s.basicFailG2,
        s.basicFailG3,
        s.note || "",
      ]
    );
  }

  const created = await findBySchoolName(data.schoolName);
  return toPublic(created!);
}

export async function updateSubmission(
  id: string,
  password: string,
  sports: SportEntryInput[]
): Promise<SubmissionPublic> {
  await initDb();
  const row = await queryOne(`SELECT * FROM submissions WHERE id = ?`, [id]);
  if (!row) throw new Error("NOT_FOUND");

  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) throw new Error("INVALID_PASSWORD");

  const now = new Date().toISOString();
  await exec(`UPDATE submissions SET updated_at = ? WHERE id = ?`, [now, id]);
  await exec(`DELETE FROM sport_entries WHERE submission_id = ?`, [id]);

  for (const s of sports) {
    await exec(
      `INSERT INTO sport_entries (
        id, submission_id, sport, total_athletes,
        fail_g1, fail_g2, fail_g3,
        complete_g1, complete_g2, complete_g3,
        basic_fail_g1, basic_fail_g2, basic_fail_g3, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        id,
        s.sport,
        s.totalAthletes,
        s.failG1,
        s.failG2,
        s.failG3,
        s.completeG1,
        s.completeG2,
        s.completeG3,
        s.basicFailG1,
        s.basicFailG2,
        s.basicFailG3,
        s.note || "",
      ]
    );
  }

  const updated = await findBySchoolName(String(row.school_name));
  return toPublic(updated!);
}

export async function verifyAndGet(data: {
  region: string;
  schoolLevel: string;
  schoolName: string;
  password: string;
}): Promise<SubmissionPublic> {
  await initDb();
  const sub = await findSubmission(
    data.region,
    data.schoolLevel,
    data.schoolName
  );
  if (!sub) throw new Error("NOT_FOUND");
  const ok = await bcrypt.compare(data.password, sub.passwordHash);
  if (!ok) throw new Error("INVALID_PASSWORD");
  return toPublic(sub);
}

export async function getAllSubmissions(): Promise<SubmissionRecord[]> {
  await initDb();
  const rows = await queryAll(
    `SELECT * FROM submissions ORDER BY region, school_name`
  );
  const result: SubmissionRecord[] = [];
  for (const row of rows) {
    const sports = await loadSports(String(row.id));
    result.push(mapSubmission(row, sports));
  }
  return result;
}

export async function getSubmissionsByRegion(
  region: string
): Promise<SubmissionRecord[]> {
  await initDb();
  const rows = await queryAll(
    `SELECT * FROM submissions WHERE region = ? ORDER BY school_name`,
    [region]
  );
  const result: SubmissionRecord[] = [];
  for (const row of rows) {
    const sports = await loadSports(String(row.id));
    result.push(mapSubmission(row, sports));
  }
  return result;
}

function sumFail(s: SportEntryInput) {
  return s.failG1 + s.failG2 + s.failG3;
}
function sumComplete(s: SportEntryInput) {
  return s.completeG1 + s.completeG2 + s.completeG3;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const all = await getAllSubmissions();
  const byRegionMap = new Map<string, SubmissionRecord[]>();
  for (const s of all) {
    const list = byRegionMap.get(s.region) || [];
    list.push(s);
    byRegionMap.set(s.region, list);
  }

  const byRegion: RegionStats[] = [];
  // Import REGIONS dynamically to keep order
  const { REGIONS } = await import("./constants");
  for (const region of REGIONS) {
    const list = byRegionMap.get(region) || [];
    byRegion.push(buildRegionStats(region, list));
  }

  const bySchoolLevel: Record<string, number> = { 초: 0, 중: 0, 고: 0 };
  const sportMap = new Map<string, number>();
  let totalAthletes = 0;
  let totalFail = 0;
  let totalComplete = 0;

  for (const s of all) {
    bySchoolLevel[s.schoolLevel] = (bySchoolLevel[s.schoolLevel] || 0) + 1;
    for (const sp of s.sports) {
      totalAthletes += sp.totalAthletes;
      totalFail += sumFail(sp);
      totalComplete += sumComplete(sp);
      sportMap.set(sp.sport, (sportMap.get(sp.sport) || 0) + sp.totalAthletes);
    }
  }

  const bySportTop = [...sportMap.entries()]
    .map(([sport, athletes]) => ({ sport, athletes }))
    .sort((a, b) => b.athletes - a.athletes)
    .slice(0, 10);

  const recentSubmissions = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 15)
    .map((s) => ({
      id: s.id,
      region: s.region,
      schoolName: s.schoolName,
      schoolLevel: s.schoolLevel,
      createdAt: s.updatedAt,
    }));

  return {
    totalSubmissions: all.length,
    totalSchools: all.length,
    totalAthletes,
    totalFail,
    totalComplete,
    byRegion,
    bySchoolLevel,
    bySportTop,
    recentSubmissions,
  };
}

export async function getRegionStats(region: string): Promise<RegionStats> {
  const list = await getSubmissionsByRegion(region);
  return buildRegionStats(region, list);
}

function buildRegionStats(
  region: string,
  list: SubmissionRecord[]
): RegionStats {
  let totalAthletes = 0;
  let totalFail = 0;
  let totalComplete = 0;
  let lastSubmittedAt: string | null = null;

  const submissions = list.map((s) => {
    let athletes = 0;
    for (const sp of s.sports) {
      athletes += sp.totalAthletes;
      totalAthletes += sp.totalAthletes;
      totalFail += sumFail(sp);
      totalComplete += sumComplete(sp);
    }
    if (
      !lastSubmittedAt ||
      new Date(s.updatedAt) > new Date(lastSubmittedAt)
    ) {
      lastSubmittedAt = s.updatedAt;
    }
    return {
      id: s.id,
      schoolName: s.schoolName,
      schoolLevel: s.schoolLevel,
      sportCount: s.sports.length,
      totalAthletes: athletes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  return {
    region,
    submissionCount: list.length,
    schoolCount: list.length,
    totalAthletes,
    totalFail,
    totalComplete,
    lastSubmittedAt,
    submissions,
  };
}

/**
 * Aggregate sport stats for excel export (tab 4 format)
 * Returns map: sport -> { 초, 중, 고 } metrics
 */
export type SportAgg = {
  total: number;
  failG1: number;
  failG2: number;
  failG3: number;
  completeG1: number;
  completeG2: number;
  completeG3: number;
};

export type RegionAgg = Record<
  string,
  { 초: SportAgg; 중: SportAgg; 고: SportAgg }
>;

function emptyAgg(): SportAgg {
  return {
    total: 0,
    failG1: 0,
    failG2: 0,
    failG3: 0,
    completeG1: 0,
    completeG2: 0,
    completeG3: 0,
  };
}

export async function aggregateForExport(
  region?: string
): Promise<RegionAgg> {
  const list = region
    ? await getSubmissionsByRegion(region)
    : await getAllSubmissions();

  const { SPORTS } = await import("./constants");
  const result: RegionAgg = {};

  for (const sport of SPORTS) {
    result[sport] = { 초: emptyAgg(), 중: emptyAgg(), 고: emptyAgg() };
  }

  for (const sub of list) {
    const level = sub.schoolLevel;
    for (const sp of sub.sports) {
      if (!result[sp.sport]) {
        result[sp.sport] = { 초: emptyAgg(), 중: emptyAgg(), 고: emptyAgg() };
      }
      const bucket = result[sp.sport][level];
      bucket.total += sp.totalAthletes;
      bucket.failG1 += sp.failG1;
      bucket.failG2 += sp.failG2;
      bucket.failG3 += sp.failG3;
      bucket.completeG1 += sp.completeG1;
      bucket.completeG2 += sp.completeG2;
      bucket.completeG3 += sp.completeG3;
    }
  }

  return result;
}
