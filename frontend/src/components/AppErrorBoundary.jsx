import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Auto-AI UI error", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-[#050505] text-white grid place-items-center px-6">
        <section className="max-w-md text-center">
          <h1 className="font-display text-3xl font-light uppercase">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Auto-AI could not render this screen. Reload and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 bg-[#F59E0B] px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black"
          >
            Reload
          </button>
        </section>
      </main>
    );
  }
}
