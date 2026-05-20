import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import {
  SlashMenu,
  type SlashMenuHandle,
  type SlashMenuProps,
} from '../SlashMenu';
import { filterSlashItems, type SlashItem } from '@/lib/editor/slashItems';

export interface SlashCommandsOptions {
  suggestion: Omit<SuggestionOptions<SlashItem>, 'editor'>;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        items: ({ query }: { query: string }): SlashItem[] => filterSlashItems(query).slice(0, 12),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null;
          let host: HTMLDivElement | null = null;

          // Flips above the cursor when there isn't room below.
          const place = (rect: DOMRect | null) => {
            if (!host || !rect) return;
            const menuHeight = host.offsetHeight || 280;
            const margin = 8;
            const viewportH = window.innerHeight;
            const below = rect.bottom + 6;
            const above = rect.top - menuHeight - 6;
            const room = viewportH - below - margin;
            const flip = room < menuHeight && above >= margin;
            host.style.top = `${flip ? above : below}px`;
            const menuWidth = host.offsetWidth || 320;
            const maxLeft = window.innerWidth - menuWidth - margin;
            host.style.left = `${Math.max(margin, Math.min(rect.left, maxLeft))}px`;
          };

          return {
            onStart: (props) => {
              host = document.createElement('div');
              host.style.position = 'fixed';
              host.style.zIndex = '60';
              host.style.minWidth = '320px';
              document.body.appendChild(host);

              component = new ReactRenderer<SlashMenuHandle, SlashMenuProps>(SlashMenu, {
                props: {
                  items: props.items,
                  command: (item: SlashItem) => props.command(item),
                  query: props.query,
                },
                editor: props.editor,
              });
              host.appendChild(component.element as Node);
              place(props.clientRect?.() ?? null);
            },
            onUpdate: (props) => {
              component?.updateProps({
                items: props.items,
                command: (item: SlashItem) => props.command(item),
                query: props.query,
              });
              place(props.clientRect?.() ?? null);
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                component?.ref?.close?.();
                return true;
              }
              return Boolean(component?.ref?.onKeyDown?.(props.event));
            },
            onExit: () => {
              component?.destroy();
              component = null;
              host?.remove();
              host = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
