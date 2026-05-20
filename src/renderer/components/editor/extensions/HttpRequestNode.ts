import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { HttpRequestView } from '../views/HttpRequestView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    httpRequest: {
      setHttpRequest: () => ReturnType;
    };
  }
}

/**
 * Burp-style two-pane HTTP request/response block. Each pane is plain text
 * stored on the node's attrs (no nested editing). Status pill draws from
 * `status` attr.
 */
export const HttpRequestNode = Node.create({
  name: 'httpRequest',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      request: {
        default:
          'POST /api/v1/login HTTP/1.1\nHost: app.example.com\nContent-Type: application/json\nContent-Length: 38\n\n{"username":"admin","password":"x"}',
      },
      response: {
        default:
          'HTTP/1.1 200 OK\nContent-Type: application/json\nSet-Cookie: session=abc123; Path=/\n\n{"ok":true,"user":{"id":1}}',
      },
      status: { default: 200 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-rb-http]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-rb-http': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HttpRequestView);
  },

  addCommands() {
    return {
      setHttpRequest:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
