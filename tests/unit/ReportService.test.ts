import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, type DatabaseHandle } from '../../src/main/db/connection';
import { ReportService } from '../../src/main/services/ReportService';
import type { Block } from '@shared/types';

function newHandle(): DatabaseHandle {
  return openDatabase({ filename: ':memory:' });
}

describe('ReportService', () => {
  let handle: DatabaseHandle;
  let service: ReportService;

  beforeEach(() => {
    handle = newHandle();
    service = new ReportService(handle.db);
  });

  it('creates a report with sane defaults and lists it', () => {
    const created = service.create({ title: 'Acme — External Pentest' });
    expect(created.id).toMatch(/^r_/);
    expect(created.title).toBe('Acme — External Pentest');
    expect(created.coverId).toBe('blackops-dark');
    expect(created.reportTheme).toBe('dark');
    expect(created.archived).toBe(false);
    expect(created.blocks).toEqual([]);
    expect(created.meta.classification).toBe('Confidential');

    const list = service.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].title).toBe(created.title);
  });

  it('round-trips meta and customCover JSON intact', () => {
    const created = service.create({
      title: 'Northwind — Web App',
      meta: { client: 'Northwind Inc.', authors: 'I. Montasir' },
      customCover: { name: 'Custom', html: '<h1>Hi</h1>', css: 'h1{color:red}', js: '' },
      coverId: 'custom',
      reportTheme: 'light',
      reportAccent: '#ff0044',
    });
    const got = service.get(created.id);
    expect(got).not.toBeNull();
    expect(got!.meta.client).toBe('Northwind Inc.');
    expect(got!.meta.authors).toBe('I. Montasir');
    expect(got!.customCover.html).toBe('<h1>Hi</h1>');
    expect(got!.coverId).toBe('custom');
    expect(got!.reportTheme).toBe('light');
    expect(got!.reportAccent).toBe('#ff0044');
  });

  it('updates a report and bumps updated_at', async () => {
    const created = service.create({ title: 'Old title' });
    const originalUpdatedAt = created.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const updated = service.update({ id: created.id, title: 'New title', archived: true });
    expect(updated.title).toBe('New title');
    expect(updated.archived).toBe(true);
    expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  it('list filters by archived flag', () => {
    const a = service.create({ title: 'A' });
    service.create({ title: 'B' });
    service.update({ id: a.id, archived: true });
    expect(service.list()).toHaveLength(1);
    expect(service.list({ archived: true })).toHaveLength(1);
  });

  it('delete removes the report and any cascaded blocks', () => {
    const r = service.create({ title: 'Will be deleted' });
    service.replaceBlocks(r.id, [
      { id: 'b1', type: 'paragraph', position: 0, content: 'hello' },
    ]);
    expect(handle.db.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toMatchObject({ c: 1 });
    service.delete(r.id);
    expect(service.get(r.id)).toBeNull();
    expect(handle.db.prepare('SELECT COUNT(*) AS c FROM blocks').get()).toMatchObject({ c: 0 });
  });

  it('replaceBlocks atomically writes the new ordered list', () => {
    const r = service.create({ title: 'Block roundtrip' });
    const blocks: Block[] = [
      { id: 'b1', type: 'heading_1', position: 0, content: 'Executive Summary' },
      { id: 'b2', type: 'paragraph', position: 1, content: 'Some body copy' },
      { id: 'b3', type: 'finding', position: 2, attrs: { vulnId: 'ACME-001', severity: 'crit' } },
    ];
    service.replaceBlocks(r.id, blocks);
    const reloaded = service.get(r.id);
    expect(reloaded!.blocks).toHaveLength(3);
    expect(reloaded!.blocks[0].type).toBe('heading_1');
    expect(reloaded!.blocks[2].attrs).toEqual({ vulnId: 'ACME-001', severity: 'crit' });
  });

  it('duplicate creates an independent copy with its own id and blocks', () => {
    const r = service.create({ title: 'Source' });
    service.replaceBlocks(r.id, [
      { id: 'b1', type: 'paragraph', position: 0, content: 'original copy' },
    ]);
    const dup = service.duplicate(r.id);
    expect(dup.id).not.toBe(r.id);
    expect(dup.title).toBe('Source (copy)');
    expect(dup.blocks).toHaveLength(1);
    expect(dup.blocks[0].content).toBe('original copy');
  });
});
