import React from "react";

interface RecaptchaOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
}

interface Grecaptcha {
  render: (container: HTMLElement, options: RecaptchaOptions) => number;
  reset: (widgetId?: number) => void;
}

type WindowWithGrecaptcha = Window & { grecaptcha?: Grecaptcha };

export type RecaptchaHandle = {
  reset: () => void;
};

type RecaptchaV2Props = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
  className?: string;
};

const SCRIPT_ID = "recaptcha-v2-script";

async function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return;

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    if ((window as WindowWithGrecaptcha).grecaptcha) return;
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar reCAPTCHA.")), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar reCAPTCHA."));
    document.body.appendChild(script);
  });
}

export const RecaptchaV2 = React.forwardRef<RecaptchaHandle, RecaptchaV2Props>(
  ({ siteKey, onVerify, onExpired, onError, theme = "light", size = "normal", className }, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const widgetIdRef = React.useRef<number | null>(null);
    const [scriptError, setScriptError] = React.useState<string | null>(null);

    React.useImperativeHandle(ref, () => ({
      reset: () => {
        const win = window as WindowWithGrecaptcha;
        if (win.grecaptcha && widgetIdRef.current !== null) {
          win.grecaptcha.reset(widgetIdRef.current);
        }
      },
    }));

    React.useEffect(() => {
      let mounted = true;

      const renderWidget = () => {
        const win = window as WindowWithGrecaptcha;
        if (!mounted || !win.grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = win.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpired?.(),
          "error-callback": () => onError?.(),
          theme,
          size,
        });
      };

      loadRecaptchaScript()
        .then(() => {
          if (!mounted) return;
          renderWidget();
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setScriptError(err.message);
        });

      return () => {
        mounted = false;
      };
    }, [siteKey, onVerify, onExpired, onError, theme, size]);

    if (scriptError) {
      return (
        <div className={className}>
          <p className="text-xs text-red-600">Falha ao carregar o reCAPTCHA.</p>
        </div>
      );
    }

    return <div ref={containerRef} className={className} />;
  }
);

RecaptchaV2.displayName = "RecaptchaV2";
