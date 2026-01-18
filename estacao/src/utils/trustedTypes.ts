type TrustedTypePolicyLike = {
    createHTML: (input: string) => string;
};

let cachedPolicy: TrustedTypePolicyLike | null | undefined;

const getPolicy = () => {
    if (typeof window === "undefined") {
        return null;
    }

    if (cachedPolicy !== undefined) {
        return cachedPolicy;
    }

    cachedPolicy =
        (window.trustedTypes?.createPolicy("estacao-trusted-html", {
            createHTML: (input) => input,
        }) as TrustedTypePolicyLike | undefined) ?? null;

    return cachedPolicy;
};

export const asTrustedHTML = (html: string) => {
    const policy = getPolicy();
    return policy ? (policy.createHTML(html) as unknown as string) : html;
};
