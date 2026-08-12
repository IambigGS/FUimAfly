import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-charcoal flex flex-col items-center justify-center p-6 font-mono text-brand-ivory z-[99999]">
          <div className="max-w-2xl w-full bg-brand-linen p-8 border-4 border-brand-red shadow-[8px_8px_0px_0px_#FF4444]">
            <h1 className="text-3xl font-black text-brand-red mb-4 uppercase tracking-wider">System Failure</h1>
            <p className="text-brand-charcoal text-lg mb-6 font-serif">
              An unexpected error occurred in the application.
            </p>
            <div className="bg-brand-charcoal/10 p-4 border-l-4 border-brand-red text-brand-charcoal font-bold mb-6 overflow-x-auto whitespace-pre-wrap text-sm">
              {this.state.error?.message || 'Unknown Error'}
            </div>
            <button
              className="bg-brand-red text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-brand-charcoal transition-colors border-2 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A]"
              onClick={() => window.location.reload()}
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
