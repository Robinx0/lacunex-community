import { useMutation, useQuery, useQueryClient, type QueryClient } from '@/lib/query';
import { ipc, qk } from '@/lib/ipc';
import type { IpcInput, IpcOutput } from '@shared/ipc-contracts';
import type { Report, ReportSummary } from '@shared/types';

export function useReportList(archived = false) {
  return useQuery({
    queryKey: qk.reports.list(archived),
    queryFn: () => ipc.reports.list({ archived }),
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: id ? qk.reports.detail(id) : qk.reports.detail('__none__'),
    queryFn: () => (id ? ipc.reports.get({ id }) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation<IpcOutput<'reports.create'>, Error, IpcInput<'reports.create'>>({
    mutationFn: (input) => ipc.reports.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.reports.all });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation<IpcOutput<'reports.delete'>, Error, IpcInput<'reports.delete'>>({
    mutationFn: (input) => ipc.reports.delete(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.reports.all });
    },
  });
}

function summarizeReport(r: Report): ReportSummary {
  return {
    id: r.id,
    title: r.title,
    docId: r.meta.docId,
    reportVersion: r.meta.reportVersion,
    coverId: r.coverId,
    reportTheme: r.reportTheme,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    archived: r.archived,
  };
}

// Skips updatedAt — sidebar doesn't show it, so autosave shouldn't churn the list.
function sameVisibleSummary(a: ReportSummary, b: ReportSummary): boolean {
  return (
    a.title === b.title &&
    a.docId === b.docId &&
    a.reportVersion === b.reportVersion &&
    a.coverId === b.coverId &&
    a.reportTheme === b.reportTheme &&
    a.archived === b.archived
  );
}

function patchListCachesAfterUpdate(
  qc: QueryClient,
  data: Report,
  input: IpcInput<'reports.update'>,
): void {
  if (typeof input.archived === 'boolean') {
    void qc.invalidateQueries({ queryKey: qk.reports.all });
    return;
  }
  const summary = summarizeReport(data);
  for (const archivedKey of [false, true] as const) {
    qc.setQueryData<ReportSummary[]>(qk.reports.list(archivedKey), (old) => {
      if (!old) return old;
      const idx = old.findIndex((r) => r.id === data.id);
      if (idx === -1) return old;
      if (sameVisibleSummary(old[idx], summary)) return old;
      const next = old.slice();
      next[idx] = summary;
      return next;
    });
  }
}

// Synchronous detail-cache patch so slider drags and palette swaps
// land in the same frame as the input. Block edits are excluded —
// the editor is the single writer for those.
function optimisticPatchDetail(
  qc: QueryClient,
  input: IpcInput<'reports.update'>,
): Report | undefined {
  const prev = qc.getQueryData<Report>(qk.reports.detail(input.id));
  if (!prev) return undefined;
  const next: Report = {
    ...prev,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.meta !== undefined ? { meta: input.meta } : {}),
    ...(input.coverId !== undefined ? { coverId: input.coverId } : {}),
    ...(input.customCover !== undefined ? { customCover: input.customCover } : {}),
    ...(input.reportTheme !== undefined ? { reportTheme: input.reportTheme } : {}),
    ...(input.reportAccent !== undefined ? { reportAccent: input.reportAccent } : {}),
    ...(input.coverOptions !== undefined ? { coverOptions: input.coverOptions } : {}),
    ...(input.tocEnabled !== undefined ? { tocEnabled: input.tocEnabled } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
  };
  qc.setQueryData<Report>(qk.reports.detail(input.id), next);
  return prev;
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation<
    IpcOutput<'reports.update'>,
    Error,
    IpcInput<'reports.update'>,
    { prev: Report | undefined }
  >({
    mutationFn: (input) => ipc.reports.update(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.reports.detail(input.id) });
      const prev = optimisticPatchDetail(qc, input);
      return { prev };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.reports.detail(input.id), ctx.prev);
    },
    onSuccess: (data, input) => {
      qc.setQueryData(qk.reports.detail(data.id), data);
      patchListCachesAfterUpdate(qc, data, input);
    },
  });
}

export function useDuplicateReport() {
  const qc = useQueryClient();
  return useMutation<IpcOutput<'reports.duplicate'>, Error, IpcInput<'reports.duplicate'>>({
    mutationFn: (input) => ipc.reports.duplicate(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.reports.all });
    },
  });
}
