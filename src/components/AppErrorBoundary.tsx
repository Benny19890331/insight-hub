import React from "react";

type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("App crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-semibold">頁面發生錯誤</h1>
            <p className="text-sm text-white/80">請重新整理頁面再試一次。若持續發生，請通知管理員。</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
