import { describe, it, expect } from 'vitest';
import { openDatabase } from '../../src/main/db/connection';
import { ReportService } from '../../src/main/services/ReportService';
import { AttachmentService } from '../../src/main/services/AttachmentService';
import { createInMemoryFileIO } from '../../src/main/lib/io';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');

function makeFixture() {
  const handle = openDatabase({ filename: ':memory:' });
  const reports = new ReportService(handle.db);
  const io = createInMemoryFileIO();
  const root = '/virt/attachments';
  const attachments = new AttachmentService(handle.db, io, {
    rootDir: () => root,
    reportDir: (reportId) => `${root}/${reportId}`,
  });
  const r = reports.create({ title: 'T' });
  return { handle, reports, attachments, io, r };
}

describe('AttachmentService (with in-memory FileIO)', () => {
  it('upload writes a file and inserts a row', () => {
    const { attachments, io, r, handle } = makeFixture();
    const a = attachments.upload({
      reportId: r.id,
      filename: 'screenshot.png',
      mimetype: 'image/png',
      base64: PNG_SIGNATURE,
    });
    expect(a.id).toMatch(/^a_/);
    expect(a.filepath).toContain(r.id);
    // File was actually written somewhere — only one entry expected.
    expect(io.dump().size).toBe(1);
    handle.close();
  });

  it('getDataUrl round-trips bytes', () => {
    const { attachments, r, handle } = makeFixture();
    const a = attachments.upload({
      reportId: r.id,
      filename: 'shot.png',
      mimetype: 'image/png',
      base64: PNG_SIGNATURE,
    });
    const dataUrl = attachments.getDataUrl(a.id);
    expect(dataUrl).not.toBeNull();
    expect(dataUrl!.mimetype).toBe('image/png');
    expect(dataUrl!.base64).toBe(PNG_SIGNATURE);
    handle.close();
  });

  it('delete removes file + row', () => {
    const { attachments, io, r, handle } = makeFixture();
    const a = attachments.upload({
      reportId: r.id,
      filename: 'x.png',
      mimetype: 'image/png',
      base64: PNG_SIGNATURE,
    });
    expect(io.dump().size).toBe(1);
    attachments.delete(a.id);
    expect(io.dump().size).toBe(0);
    expect(attachments.get(a.id)).toBeNull();
    handle.close();
  });

  it('returns null when the underlying file is missing on disk', () => {
    const { attachments, io, r, handle } = makeFixture();
    const a = attachments.upload({
      reportId: r.id,
      filename: 'x.png',
      mimetype: 'image/png',
      base64: PNG_SIGNATURE,
    });
    // Corrupt the disk: row is still there, file gone.
    io.dump().clear();
    expect(attachments.getDataUrl(a.id)).toBeNull();
    handle.close();
  });

  it('rejects an invalid reportId', () => {
    const { attachments, handle } = makeFixture();
    expect(() =>
      attachments.upload({
        reportId: '../etc',
        filename: 'x.png',
        mimetype: 'image/png',
        base64: PNG_SIGNATURE,
      }),
    ).toThrow(/invalid reportId/);
    handle.close();
  });

  it('strips dangerous extensions from the on-disk name', () => {
    const { attachments, io, r, handle } = makeFixture();
    const a = attachments.upload({
      reportId: r.id,
      filename: 'malicious.exe',
      mimetype: 'image/png',
      base64: PNG_SIGNATURE,
    });
    // The original filename is preserved as metadata, but the on-disk
    // path uses the mimetype-derived extension only.
    expect(a.filename).toBe('malicious.exe');
    const onDisk = Array.from(io.dump().keys())[0]!;
    expect(onDisk.endsWith('.png')).toBe(true);
    expect(onDisk.endsWith('.exe')).toBe(false);
    handle.close();
  });

  it('rejects payloads larger than the cap', () => {
    const { attachments, r, handle } = makeFixture();
    // 26 MB — one byte over the 25 MB cap, encoded as base64.
    const big = Buffer.alloc(26 * 1024 * 1024).toString('base64');
    expect(() =>
      attachments.upload({
        reportId: r.id,
        filename: 'big.png',
        mimetype: 'image/png',
        base64: big,
      }),
    ).toThrow(/size limit/);
    handle.close();
  });

  it('rejects an empty payload', () => {
    const { attachments, r, handle } = makeFixture();
    expect(() =>
      attachments.upload({
        reportId: r.id,
        filename: 'empty.png',
        mimetype: 'image/png',
        base64: '',
      }),
    ).toThrow(/empty payload/);
    handle.close();
  });
});
