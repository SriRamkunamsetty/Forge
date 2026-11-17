import fs from "fs";
import path from "path";
import type { Lead } from "./leads-store";

/**
 * Storage adapter interface for lead persistence.
 * Implementations can be swapped via environment variables without changing business logic.
 */
export interface LeadsStorageAdapter {
  addLead(value: Omit<Lead, "id" | "createdAt">): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
  leadCount(): Promise<number>;
  findLeadByEmail(email: string): Promise<Lead | undefined>;
  clear?(): Promise<void>;
}

/**
 * In-Memory Adapter (default, ideal for tests & ephemeral demos)
 */
export class MemoryLeadsAdapter implements LeadsStorageAdapter {
  private leads: Lead[] = [];

  async addLead(value: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
    const existing = await this.findLeadByEmail(value.email);
    if (existing) return existing;

    const lead: Lead = {
      id: `ld_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      ...value,
      createdAt: new Date().toISOString(),
    };
    this.leads.push(lead);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return [...this.leads];
  }

  async leadCount(): Promise<number> {
    return this.leads.length;
  }

  async findLeadByEmail(email: string): Promise<Lead | undefined> {
    return this.leads.find((l) => l.email.toLowerCase() === email.toLowerCase());
  }

  async clear(): Promise<void> {
    this.leads = [];
  }
}

/**
 * File-backed JSON Storage Adapter (persists to local disk across server restarts)
 */
export class FileLeadsAdapter implements LeadsStorageAdapter {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.join(process.cwd(), ".data", "leads.json");
  }

  private async ensureFile(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      await fs.promises.writeFile(this.filePath, JSON.stringify([], null, 2), "utf8");
    }
  }

  private async readAll(): Promise<Lead[]> {
    await this.ensureFile();
    try {
      const data = await fs.promises.readFile(this.filePath, "utf8");
      return JSON.parse(data) as Lead[];
    } catch {
      return [];
    }
  }

  private async writeAll(leads: Lead[]): Promise<void> {
    await this.ensureFile();
    await fs.promises.writeFile(this.filePath, JSON.stringify(leads, null, 2), "utf8");
  }

  async addLead(value: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
    const leads = await this.readAll();
    const existing = leads.find((l) => l.email.toLowerCase() === value.email.toLowerCase());
    if (existing) return existing;

    const lead: Lead = {
      id: `ld_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      ...value,
      createdAt: new Date().toISOString(),
    };
    leads.push(lead);
    await this.writeAll(leads);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return await this.readAll();
  }

  async leadCount(): Promise<number> {
    const leads = await this.readAll();
    return leads.length;
  }

  async findLeadByEmail(email: string): Promise<Lead | undefined> {
    const leads = await this.readAll();
    return leads.find((l) => l.email.toLowerCase() === email.toLowerCase());
  }

  async clear(): Promise<void> {
    await this.writeAll([]);
  }
}

/**
 * Factory function to select the active storage adapter.
 * Configurable via LEADS_STORAGE_ADAPTER=memory|file
 */
export function createStorageAdapter(): LeadsStorageAdapter {
  const adapterType = process.env.LEADS_STORAGE_ADAPTER?.toLowerCase();

  if (adapterType === "file") {
    return new FileLeadsAdapter();
  }

  return new MemoryLeadsAdapter();
}
