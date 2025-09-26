// components/ErrorBoundary.js
import React from "react";
import {
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  CheckCircle2,
} from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      info: null,
      copied: false,
      showDetails: false,
    };
    this.copyTimer = null;
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can send this to Sentry/Datadog/etc.
    // eslint-disable-next-line no-console
    console.error("[UI crash] ", error, info?.componentStack);
    this.setState({ info });
  }

  componentWillUnmount() {
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      info: null,
      copied: false,
      showDetails: false,
    });
  };

  copyDetails = async () => {
    const { error, info } = this.state;
    const payload = [
      `Message: ${String(error?.message || error || "Unknown error")}`,
      `Stack: ${String(error?.stack || "N/A")}`,
      `Component stack: ${String(info?.componentStack || "N/A")}`,
      `URL: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
      `When: ${new Date().toISOString()}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      this.setState({ copied: true });
      this.copyTimer = setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback: create a download
      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "error-details.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = process.env.NODE_ENV === "development";
    const compStack = this.state.info?.componentStack || "";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            </div>
          </div>

          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>

          {/* Error Message */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please try refreshing the page or go back to the dashboard. If it keeps happening,
            copy the details and share them with support.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh Page
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center font-medium"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Dashboard
            </button>

            <button
              onClick={this.reset}
              className="w-full text-blue-600 py-2 px-4 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              Try Again
            </button>

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.copyDetails}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm"
                title="Copy error details"
              >
                {this.state.copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy details
                  </>
                )}
              </button>

              {(isDev || compStack) && (
                <button
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm"
                >
                  {this.state.showDetails ? "Hide details" : "Show details"}
                </button>
              )}
            </div>
          </div>

          {/* Details (dev or if stack is present) */}
          {(this.state.showDetails || isDev) && (
            <div className="mt-6 text-left">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Technical details
              </div>
              <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 text-red-700 dark:text-red-300">
                {String(this.state.error?.message || this.state.error || "Error")}
                {"\n\n"}
                {String(this.state.error?.stack || "No JS stack")}
                {"\n\n"}
                {compStack || "No component stack"}
              </pre>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            Need help? Email{" "}
            <a href="mailto:support@schoolmaster.com" className="text-blue-600 hover:text-blue-800">
              support@schoolmaster.com
            </a>
          </p>
        </div>
      </div>
    );
  }
}
