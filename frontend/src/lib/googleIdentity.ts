type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptMomentNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void;
  cancel?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In działa tylko w przeglądarce."));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Nie udało się załadować Google Sign-In.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Nie udało się załadować Google Sign-In."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function requestGoogleCredential(clientId: string): Promise<string> {
  if (!clientId) {
    throw new Error("Brak konfiguracji Google Sign-In (Client ID).");
  }

  await loadGoogleIdentityScript();
  const googleId = window.google?.accounts?.id;
  if (!googleId) {
    throw new Error("Google Sign-In nie jest dostępny.");
  }

  return new Promise<string>((resolve, reject) => {
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      reject(new Error(message));
    };
    const ok = (credential: string) => {
      if (finished) return;
      finished = true;
      resolve(credential);
    };

    const timeout = window.setTimeout(() => {
      fail("Przekroczono czas oczekiwania na logowanie Google.");
    }, 45_000);

    googleId.cancel?.();
    googleId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response: GoogleCredentialResponse) => {
        window.clearTimeout(timeout);
        if (response.credential) {
          ok(response.credential);
          return;
        }
        fail("Nie udało się pobrać poświadczenia Google.");
      },
    });

    googleId.prompt((notification: GooglePromptMomentNotification) => {
      if (finished) return;
      if (notification.isNotDisplayed?.()) {
        window.clearTimeout(timeout);
        fail("Google Sign-In nie mógł zostać wyświetlony.");
        return;
      }
      if (notification.isSkippedMoment?.() || notification.isDismissedMoment?.()) {
        window.clearTimeout(timeout);
        fail("Logowanie Google zostało anulowane.");
      }
    });
  });
}
