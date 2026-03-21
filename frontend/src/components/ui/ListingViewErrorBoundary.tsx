"use client";

import React, { type ReactNode } from "react";

type State = { hasError: boolean };

/**
 * Izoluje błędy renderu na stronie oferty (np. widget klienta) — zapobiega białemu ekranowi całej podstrony.
 */
export class ListingViewErrorBoundary extends React.Component<
  { children: ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ListingViewErrorBoundary", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-amber-900">
            Nie udało się wyświetlić części strony oferty.
          </p>
          <p className="mt-2 text-xs text-amber-800/90">
            Odśwież stronę lub wróć do wyszukiwarki.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
