import { Crosshair, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { BufferedInput } from '@/components/ui/BufferedInput';
import { useArrayKeys } from '@/hooks/useArrayKeys';

export function PocView({ node, updateAttributes }: NodeViewProps): JSX.Element {
  const steps = (node.attrs.steps as string[] | undefined) ?? [];
  const keys = useArrayKeys(steps.length);

  const update = (next: string[]) => updateAttributes({ steps: next });
  const add = () => {
    keys.add();
    update([...steps, `Step ${steps.length + 1}: `]);
  };
  const remove = (i: number) => {
    keys.remove(i);
    update(steps.filter((_, idx) => idx !== i));
  };
  const move = (i: number, delta: -1 | 1) => {
    const next = [...steps];
    const target = i + delta;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    keys.swap(i, target);
    update(next);
  };
  const setStep = (i: number, value: string) => {
    const next = [...steps];
    next[i] = value;
    update(next);
  };

  return (
    <NodeViewWrapper className="rb-poc">
      <div className="rb-poc__head" contentEditable={false}>
        <Crosshair className="h-3.5 w-3.5 text-[var(--rb-orange)]" aria-hidden />
        <span className="rb-poc__title">Proof-of-concept steps</span>
      </div>
      <ol className="rb-poc__list" contentEditable={false}>
        {steps.map((step, i) => (
          <li key={keys.read(i)} className="rb-poc__item">
            <span className="rb-poc__num">{i + 1}.</span>
            <BufferedInput
              className="rb-poc__input"
              value={step}
              onCommit={(v) => setStep(i, v)}
              aria-label={`Step ${i + 1}`}
            />
            <button
              type="button"
              className="rb-poc__btn"
              title="Move up"
              onClick={() => move(i, -1)}
              disabled={i === 0}
            >
              <ArrowUp className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              className="rb-poc__btn"
              title="Move down"
              onClick={() => move(i, 1)}
              disabled={i === steps.length - 1}
            >
              <ArrowDown className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              className="rb-poc__btn rb-poc__btn--danger"
              title="Delete step"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={add} className="rb-poc__add" contentEditable={false}>
        <Plus className="h-3 w-3" aria-hidden />
        Add step
      </button>
    </NodeViewWrapper>
  );
}
