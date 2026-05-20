import type { Paragraph, Table } from 'docx';
import type { Block, BlockType } from '../types';

export interface BlockRenderers {
  toMarkdown: (block: Block) => string[];
  toHtml: (block: Block) => string;
  toConfluence: (block: Block) => string;
  toWord: (block: Block) => Array<Paragraph | Table>;
}

const REGISTRY = new Map<BlockType, BlockRenderers>();

export function registerBlockRenderers(type: BlockType, renderers: BlockRenderers): void {
  REGISTRY.set(type, renderers);
}

const FALLBACK: BlockRenderers = {
  toMarkdown: () => [''],
  toHtml: () => '',
  toConfluence: () => '',
  toWord: () => [],
};

// Falls back to `paragraph`, then a no-op stub, so unknown block types never crash.
export function rendersFor(type: BlockType): BlockRenderers {
  return REGISTRY.get(type) ?? REGISTRY.get('paragraph') ?? FALLBACK;
}
