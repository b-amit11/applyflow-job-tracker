const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
const samples = [
  ["Northstar Labs", "Software Engineering Intern", "Interview", "2026-09-18", "", "Technical interview next week."],
  ["Blue Harbor Systems", "Data Analyst Intern", "Applied", "2026-09-24", "", "Submitted through the careers page."],
  ["CivicWorks", "IT Support Intern", "Screening", "2026-09-22", "", "Recruiter call scheduled."]
];

function createStore(filename = "applyflow.db") {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('Applied','Screening','Interview','Offer','Rejected')),
    applied_date TEXT NOT NULL, job_link TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const insert = db.prepare("INSERT INTO applications (id,company,role,stage,applied_date,job_link,notes) VALUES (?,?,?,?,?,?,?)");
  const map = row => row && ({ id: row.id, company: row.company, role: row.role, stage: row.stage, appliedDate: row.applied_date, jobLink: row.job_link, notes: row.notes });
  const seed = () => { if (!db.prepare("SELECT COUNT(*) count FROM applications").get().count) for (const row of samples) insert.run(randomUUID(), ...row); };
  seed();
  return {
    all({ search = "", stage = "All" } = {}) { const term = `%${search.trim()}%`; return (stage === "All" ? db.prepare("SELECT * FROM applications WHERE company LIKE ? OR role LIKE ? ORDER BY applied_date DESC,created_at DESC").all(term, term) : db.prepare("SELECT * FROM applications WHERE stage=? AND (company LIKE ? OR role LIKE ?) ORDER BY applied_date DESC,created_at DESC").all(stage, term, term)).map(map); },
    get(id) { return map(db.prepare("SELECT * FROM applications WHERE id=?").get(id)); },
    create(value) { const id = randomUUID(); insert.run(id, value.company, value.role, value.stage, value.appliedDate, value.jobLink, value.notes); return this.get(id); },
    update(id, value) { const result = db.prepare("UPDATE applications SET company=?,role=?,stage=?,applied_date=?,job_link=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(value.company, value.role, value.stage, value.appliedDate, value.jobLink, value.notes, id); return result.changes ? this.get(id) : null; },
    remove(id) { return db.prepare("DELETE FROM applications WHERE id=?").run(id).changes > 0; },
    reset() { db.exec("DELETE FROM applications"); seed(); return this.all(); },
    close() { db.close(); }
  };
}

function validateApplication(input = {}) {
  const value = { company: String(input.company || "").trim(), role: String(input.role || "").trim(), stage: String(input.stage || "Applied"), appliedDate: String(input.appliedDate || ""), jobLink: String(input.jobLink || "").trim(), notes: String(input.notes || "").trim() };
  const errors = [];
  if (!value.company || value.company.length > 80) errors.push("Company is required and must be 80 characters or fewer.");
  if (!value.role || value.role.length > 100) errors.push("Role is required and must be 100 characters or fewer.");
  if (!STAGES.includes(value.stage)) errors.push("Stage is invalid.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.appliedDate)) errors.push("Applied date must use YYYY-MM-DD format.");
  if (value.jobLink) { try { const url = new URL(value.jobLink); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { errors.push("Job link must be a valid HTTP or HTTPS URL."); } }
  if (value.notes.length > 500) errors.push("Notes must be 500 characters or fewer.");
  return { value, errors };
}

module.exports = { createStore, validateApplication };
