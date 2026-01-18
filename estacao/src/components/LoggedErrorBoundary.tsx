"use client";

import React from "react";

type LoggedErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  message?: string;
  onReset?: () => void;
};

type LoggedErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class LoggedErrorBoundary extends React.Component<
  LoggedErrorBoundaryProps,
  LoggedErrorBoundaryState
> {
  state: LoggedErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): LoggedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[LoggedErrorBoundary] Erro em página logada:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.title ?? "Algo deu errado";
    const message =
      this.props.message ??
      "Ocorreu um erro ao carregar esta área. Recarregue a página para continuar.";

    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">{title}</h1>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center justify-center rounded-md bg-[#6D75C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a61a8] transition"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
