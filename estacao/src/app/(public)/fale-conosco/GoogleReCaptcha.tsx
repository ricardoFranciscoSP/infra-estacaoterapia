
import React from 'react';

interface Grecaptcha {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

type WindowWithGrecaptcha = Window & { grecaptcha?: Grecaptcha };

export function GoogleReCaptcha({ siteKey, onVerify }: { siteKey: string; onVerify: (token: string) => void }) {

  React.useEffect(() => {
    const win = window as WindowWithGrecaptcha;
    if (!win.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.body.appendChild(script);
    }
  }, [siteKey]);


  const executeCaptcha = () => {
    const win = window as WindowWithGrecaptcha;
    if (win.grecaptcha) {
      win.grecaptcha.ready(() => {
        win.grecaptcha!.execute(siteKey, { action: 'submit' }).then((token: string) => {
          onVerify(token);
        });
      });
    }
  };

  return (
    <button type="button" onClick={executeCaptcha} style={{ display: 'none' }} id="recaptcha-exec-btn" />
  );
}
