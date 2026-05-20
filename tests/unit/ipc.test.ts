import { describe, it, expect } from 'vitest';
import { ipcContracts } from '@shared/ipc-contracts';
import { openDatabase } from '../../src/main/db/connection';
import { ReportService } from '../../src/main/services/ReportService';
import { TemplateService } from '../../src/main/services/TemplateService';
import { FindingService } from '../../src/main/services/FindingService';
import { seedReportsIfEmpty } from '../../src/main/lib/seed';

/**
 * Integration-shape test for the IPC contracts: invoke each contract's
 * input + output schemas against the shape that the matching service method
 * actually returns. We don't go through Electron's `ipcMain` here (no
 * BrowserWindow), but we cover the validation boundary, which is the part
 * that breaks most often.
 */
describe('ipc contracts', () => {
  it('every contract has matching input + output schemas', () => {
    for (const [channel, contract] of Object.entries(ipcContracts)) {
      expect(contract.input, `${channel} input`).toBeTruthy();
      expect(contract.output, `${channel} output`).toBeTruthy();
    }
  });

  it('reports.list output validates the ReportService.list shape', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    seedReportsIfEmpty(reports);

    const list = reports.list();
    const parsed = ipcContracts['reports.list'].output.parse(list);
    expect(parsed).toHaveLength(2);

    handle.close();
  });

  it('reports.create input rejects an empty title', () => {
    const result = ipcContracts['reports.create'].input.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('reports.create round-trips through service + output schema', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const reports = new ReportService(handle.db);
    const created = reports.create({ title: 'IPC roundtrip' });
    const parsed = ipcContracts['reports.create'].output.parse(created);
    expect(parsed.title).toBe('IPC roundtrip');
    handle.close();
  });

  it('templates.list returns []', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const templates = new TemplateService(handle.db);
    const result = ipcContracts['templates.list'].output.parse(templates.list());
    expect(result).toEqual([]);
    handle.close();
  });

  it('findings.search returns [] on empty index', () => {
    const handle = openDatabase({ filename: ':memory:' });
    const findings = new FindingService(handle.db);
    const result = ipcContracts['findings.search'].output.parse(findings.search('anything'));
    expect(result).toEqual([]);
    handle.close();
  });
});
