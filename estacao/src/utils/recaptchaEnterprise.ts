interface GrecaptchaEnterprise {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, params: { action: string }) => Promise<string>;
}

type WindowWithGrecaptcha = Window & {
  grecaptcha?: {
    enterprise?: GrecaptchaEnterprise;
  };
};

export async function getRecaptchaEnterpriseToken(siteKey: string, action: string): Promise<string> {
  if (!siteKey) {
    throw new Error("reCAPTCHA não configurado.");
  }

  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA indisponível no servidor.");
  }

  const win = window as WindowWithGrecaptcha;

  const waitForEnterprise = async () => {
    const start = Date.now();
    while (!win.grecaptcha?.enterprise) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (Date.now() - start > 10000) {
        throw new Error("reCAPTCHA não carregou.");
      }
    }
  };

  await waitForEnterprise();

  return new Promise<string>((resolve, reject) => {
    win.grecaptcha!.enterprise!.ready(() => {
      win.grecaptcha!.enterprise!
        .execute(siteKey, { action })
        .then(resolve)
        .catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error("Falha ao executar reCAPTCHA."));
        });
    });
  });
}
