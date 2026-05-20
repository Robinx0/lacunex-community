import type { Database } from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { Block, Template } from '@shared/types';

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  type: 'block' | 'section' | 'finding';
  blocks_json: string;
  created_at: number;
  updated_at: number;
  use_count: number;
}

function rowToTemplate(row: TemplateRow): Template {
  let blocks: Block[] = [];
  try {
    blocks = JSON.parse(row.blocks_json) as Block[];
  } catch (err) {
    console.warn(`[TemplateService] failed to parse blocks_json for template ${row.id}`, err);
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    type: row.type,
    blocks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    useCount: row.use_count,
  };
}

export interface TemplateInput {
  name: string;
  description: string;
  category: string;
  icon: string;
  type: 'block' | 'section' | 'finding';
  blocks: Block[];
}

export class TemplateService {
  constructor(private readonly db: Database) {}

  list(opts: { category?: string } = {}): Template[] {
    const rows = opts.category
      ? (this.db
          .prepare(
            `SELECT * FROM templates WHERE category = ? ORDER BY updated_at DESC`,
          )
          .all(opts.category) as TemplateRow[])
      : (this.db
          .prepare(`SELECT * FROM templates ORDER BY updated_at DESC`)
          .all() as TemplateRow[]);
    return rows.map(rowToTemplate);
  }

  create(input: TemplateInput): Template {
    const id = `t_${nanoid(10)}`;
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO templates
           (id, name, description, category, icon, type, blocks_json,
            created_at, updated_at, use_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      )
      .run(
        id,
        input.name,
        input.description,
        input.category,
        input.icon,
        input.type,
        JSON.stringify(input.blocks),
        now,
        now,
      );
    return {
      id,
      name: input.name,
      description: input.description,
      category: input.category,
      icon: input.icon,
      type: input.type,
      blocks: input.blocks,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    };
  }

  delete(id: string): void {
    const result = this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    if (result.changes === 0) throw new Error(`Template not found: ${id}`);
  }
}
