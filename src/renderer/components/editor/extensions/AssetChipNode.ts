import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AssetChipView } from '../views/AssetChipView';
import type { ScopeItem } from '@shared/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    assetChip: {
      insertAssetChip: (item: Omit<ScopeItem, 'tagClass'> & { tagClass?: ScopeItem['tagClass'] }) => ReturnType;
    };
  }
}

/**
 * Inline reference to an in-scope asset (Domain / IP CIDR / URL / AD / etc.)
 */
export const AssetChipNode = Node.create({
  name: 'assetChip',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      assetType: { default: 'Asset' },
      assetValue: { default: '' },
      tagClass: { default: 'gray' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-rb-asset]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-rb-asset': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AssetChipView);
  },

  addCommands() {
    return {
      insertAssetChip:
        (item) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                assetType: item.type,
                assetValue: item.value,
                tagClass: item.tagClass ?? 'gray',
              },
            })
            .run(),
    };
  },
});
