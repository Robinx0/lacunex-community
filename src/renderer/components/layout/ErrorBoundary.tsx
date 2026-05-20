import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  region: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: number;
}

/**
 * Region-level error boundary. We wrap the sidebar, editor, and preview each
 * in their own boundary so a crash in one pane doesn't take the whole app
 * down — the user can still switch reports / export from the others.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[lacunex] ${this.props.region} crashed:`, error, info);
  }

  reset = (): void => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-[var(--rb-red)]" aria-hidden />
          <p className="text-sm font-semibold text-[var(--rb-text-primary)]">
            {this.props.region} crashed
          </p>
          <p className="max-w-[320px] text-xs text-[var(--rb-text-muted)]">
            <span className="font-mono">{this.state.error.message}</span>
          </p>
          <Button size="sm" variant="ghost" onClick={this.reset}>
            <RefreshCw className="h-3 w-3" aria-hidden />
            Try again
          </Button>
        </div>
      );
    }
    // The wrapper div MUST forward the parent's dimensions or every
    // boundary'd region (Sidebar, Editor, Preview) collapses to
    // content height — `h-full` in the wrapped component then
    // resolves against an auto-height div, which breaks the flex
    // distribution above us. Symptom: bottom-pinned UI inside the
    // sidebar floats wherever content ends instead of sticking to
    // the actual bottom of its parent.
    return (
      <div className="h-full w-full" key={this.state.resetKey}>
        {this.props.children}
      </div>
    );
  }
}
