/**
 * Local cache store (offline-first).
 *
 * Backed by Node's built-in `node:sqlite` so there is NO native npm dependency
 * to install — important since the project targets a personal machine and a
 * future Capacitor build. The CacheStore interface keeps the backend swappable
 * (a Postgres implementation can drop in later behind the same methods).
 *
 * node:sqlite is currently experimental; run with `--experimental-sqlite`.
 */
import { DatabaseSync } from "node:sqlite";
import type { SpeciesRecord, TypeRelation, MetaRow } from "../sources/types.js";

export interface CacheStore {
  init(): void;
  /** Remove all cached species (call before re-seeding the roster). */
  clearSpecies(): void;
  saveSpecies(records: SpeciesRecord[]): void;
  getSpecies(name: string): SpeciesRecord | null;
  allSpecies(): SpeciesRecord[];
  legalPool(): SpeciesRecord[];
  saveTypeChart(rows: TypeRelation[]): void;
  getTypeChart(): TypeRelation[];
  saveMeta(format: string, season: string, species: string, rows: MetaRow[]): void;
  getMeta(format: string, season: string, species: string): MetaRow[];
  setMetadata(key: string, value: string): void;
  getMetadata(key: string): string | null;
  close(): void;
}

export class SqliteCacheStore implements CacheStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS species (
        name TEXT PRIMARY KEY,
        id INTEGER,
        is_final INTEGER,
        is_standalone INTEGER,
        is_legendary INTEGER,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS type_chart (
        type TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta_usage (
        format TEXT, season TEXT, species TEXT, data TEXT NOT NULL,
        PRIMARY KEY (format, season, species)
      );
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY, value TEXT NOT NULL
      );
    `);
  }

  clearSpecies(): void {
    this.db.exec("DELETE FROM species");
  }

  saveSpecies(records: SpeciesRecord[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO species
       (name, id, is_final, is_standalone, is_legendary, data)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    this.db.exec("BEGIN");
    try {
      for (const r of records) {
        stmt.run(
          r.name,
          r.id,
          r.isFinalStage ? 1 : 0,
          r.isStandalone ? 1 : 0,
          r.isLegendary ? 1 : 0,
          JSON.stringify(r)
        );
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  getSpecies(name: string): SpeciesRecord | null {
    const row = this.db
      .prepare(`SELECT data FROM species WHERE name = ?`)
      .get(name.toLowerCase()) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as SpeciesRecord) : null;
  }

  allSpecies(): SpeciesRecord[] {
    const rows = this.db.prepare(`SELECT data FROM species`).all() as {
      data: string;
    }[];
    return rows.map((r) => JSON.parse(r.data) as SpeciesRecord);
  }

  legalPool(): SpeciesRecord[] {
    const rows = this.db
      .prepare(
        `SELECT data FROM species WHERE is_final = 1 OR is_standalone = 1`
      )
      .all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as SpeciesRecord);
  }

  saveTypeChart(rows: TypeRelation[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO type_chart (type, data) VALUES (?, ?)`
    );
    for (const r of rows) stmt.run(r.type, JSON.stringify(r));
  }

  getTypeChart(): TypeRelation[] {
    const rows = this.db.prepare(`SELECT data FROM type_chart`).all() as {
      data: string;
    }[];
    return rows.map((r) => JSON.parse(r.data) as TypeRelation);
  }

  saveMeta(format: string, season: string, species: string, rows: MetaRow[]): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO meta_usage (format, season, species, data)
         VALUES (?, ?, ?, ?)`
      )
      .run(format, season, species.toLowerCase(), JSON.stringify(rows));
  }

  getMeta(format: string, season: string, species: string): MetaRow[] {
    const row = this.db
      .prepare(
        `SELECT data FROM meta_usage WHERE format = ? AND season = ? AND species = ?`
      )
      .get(format, season, species.toLowerCase()) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as MetaRow[]) : [];
  }

  setMetadata(key: string, value: string): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)`)
      .run(key, value);
  }

  getMetadata(key: string): string | null {
    const row = this.db
      .prepare(`SELECT value FROM metadata WHERE key = ?`)
      .get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  close(): void {
    this.db.close();
  }
}
