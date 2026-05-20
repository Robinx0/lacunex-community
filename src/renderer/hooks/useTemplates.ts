import { useMutation, useQuery, useQueryClient } from '@/lib/query';
import { ipc, qk } from '@/lib/ipc';
import type { IpcInput, IpcOutput } from '@shared/ipc-contracts';

export function useTemplateList(category?: string) {
  return useQuery({
    queryKey: qk.templates.list(category),
    queryFn: () => ipc.templates.list(category ? { category } : undefined),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation<IpcOutput<'templates.create'>, Error, IpcInput<'templates.create'>>({
    mutationFn: (input) => ipc.templates.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates.all }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation<IpcOutput<'templates.delete'>, Error, IpcInput<'templates.delete'>>({
    mutationFn: (input) => ipc.templates.delete(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates.all }),
  });
}
