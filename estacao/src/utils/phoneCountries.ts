export type PhoneCountry = {
    code: string;
    name: string;
    dial: string;
    flag: string;
};

// 🌍 Lista completa de países (baseada em ITU E.164 + ISO 3166-1)
export const PHONE_COUNTRIES: PhoneCountry[] = [
    { code: "AF", name: "Afeganistão", dial: "+93", flag: "🇦🇫" },
    { code: "AL", name: "Albânia", dial: "+355", flag: "🇦🇱" },
    { code: "DZ", name: "Argélia", dial: "+213", flag: "🇩🇿" },
    { code: "AD", name: "Andorra", dial: "+376", flag: "🇦🇩" },
    { code: "AO", name: "Angola", dial: "+244", flag: "🇦🇴" },
    { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
    { code: "AM", name: "Armênia", dial: "+374", flag: "🇦🇲" },
    { code: "AU", name: "Austrália", dial: "+61", flag: "🇦🇺" },
    { code: "AT", name: "Áustria", dial: "+43", flag: "🇦🇹" },
    { code: "AZ", name: "Azerbaijão", dial: "+994", flag: "🇦🇿" },
    { code: "BH", name: "Bahrein", dial: "+973", flag: "🇧🇭" },
    { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
    { code: "BY", name: "Bielorrússia", dial: "+375", flag: "🇧🇾" },
    { code: "BE", name: "Bélgica", dial: "+32", flag: "🇧🇪" },
    { code: "BZ", name: "Belize", dial: "+501", flag: "🇧🇿" },
    { code: "BJ", name: "Benim", dial: "+229", flag: "🇧🇯" },
    { code: "BT", name: "Butão", dial: "+975", flag: "🇧🇹" },
    { code: "BO", name: "Bolívia", dial: "+591", flag: "🇧🇴" },
    { code: "BA", name: "Bósnia e Herzegovina", dial: "+387", flag: "🇧🇦" },
    { code: "BW", name: "Botsuana", dial: "+267", flag: "🇧🇼" },
    { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
    { code: "BN", name: "Brunei", dial: "+673", flag: "🇧🇳" },
    { code: "BG", name: "Bulgária", dial: "+359", flag: "🇧🇬" },
    { code: "BF", name: "Burquina Fasso", dial: "+226", flag: "🇧🇫" },
    { code: "BI", name: "Burundi", dial: "+257", flag: "🇧🇮" },
    { code: "KH", name: "Camboja", dial: "+855", flag: "🇰🇭" },
    { code: "CM", name: "Camarões", dial: "+237", flag: "🇨🇲" },
    { code: "CA", name: "Canadá", dial: "+1", flag: "🇨🇦" },
    { code: "CV", name: "Cabo Verde", dial: "+238", flag: "🇨🇻" },
    { code: "CF", name: "República Centro-Africana", dial: "+236", flag: "🇨🇫" },
    { code: "TD", name: "Chade", dial: "+235", flag: "🇹🇩" },
    { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
    { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
    { code: "CO", name: "Colômbia", dial: "+57", flag: "🇨🇴" },
    { code: "KM", name: "Comores", dial: "+269", flag: "🇰🇲" },
    { code: "CG", name: "Congo", dial: "+242", flag: "🇨🇬" },
    { code: "CR", name: "Costa Rica", dial: "+506", flag: "🇨🇷" },
    { code: "HR", name: "Croácia", dial: "+385", flag: "🇭🇷" },
    { code: "CU", name: "Cuba", dial: "+53", flag: "🇨🇺" },
    { code: "CY", name: "Chipre", dial: "+357", flag: "🇨🇾" },
    { code: "CZ", name: "Tchéquia", dial: "+420", flag: "🇨🇿" },
    { code: "DK", name: "Dinamarca", dial: "+45", flag: "🇩🇰" },
    { code: "DO", name: "República Dominicana", dial: "+1", flag: "🇩🇴" },
    { code: "EC", name: "Equador", dial: "+593", flag: "🇪🇨" },
    { code: "EG", name: "Egito", dial: "+20", flag: "🇪🇬" },
    { code: "SV", name: "El Salvador", dial: "+503", flag: "🇸🇻" },
    { code: "EE", name: "Estônia", dial: "+372", flag: "🇪🇪" },
    { code: "ET", name: "Etiópia", dial: "+251", flag: "🇪🇹" },
    { code: "FI", name: "Finlândia", dial: "+358", flag: "🇫🇮" },
    { code: "FR", name: "França", dial: "+33", flag: "🇫🇷" },
    { code: "GE", name: "Geórgia", dial: "+995", flag: "🇬🇪" },
    { code: "DE", name: "Alemanha", dial: "+49", flag: "🇩🇪" },
    { code: "GH", name: "Gana", dial: "+233", flag: "🇬🇭" },
    { code: "GR", name: "Grécia", dial: "+30", flag: "🇬🇷" },
    { code: "GT", name: "Guatemala", dial: "+502", flag: "🇬🇹" },
    { code: "GN", name: "Guiné", dial: "+224", flag: "🇬🇳" },
    { code: "GY", name: "Guiana", dial: "+592", flag: "🇬🇾" },
    { code: "HT", name: "Haiti", dial: "+509", flag: "🇭🇹" },
    { code: "HN", name: "Honduras", dial: "+504", flag: "🇭🇳" },
    { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
    { code: "HU", name: "Hungria", dial: "+36", flag: "🇭🇺" },
    { code: "IS", name: "Islândia", dial: "+354", flag: "🇮🇸" },
    { code: "IN", name: "Índia", dial: "+91", flag: "🇮🇳" },
    { code: "ID", name: "Indonésia", dial: "+62", flag: "🇮🇩" },
    { code: "IR", name: "Irã", dial: "+98", flag: "🇮🇷" },
    { code: "IQ", name: "Iraque", dial: "+964", flag: "🇮🇶" },
    { code: "IE", name: "Irlanda", dial: "+353", flag: "🇮🇪" },
    { code: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
    { code: "IT", name: "Itália", dial: "+39", flag: "🇮🇹" },
    { code: "JM", name: "Jamaica", dial: "+1", flag: "🇯🇲" },
    { code: "JP", name: "Japão", dial: "+81", flag: "🇯🇵" },
    { code: "JO", name: "Jordânia", dial: "+962", flag: "🇯🇴" },
    { code: "KZ", name: "Cazaquistão", dial: "+7", flag: "🇰🇿" },
    { code: "KE", name: "Quênia", dial: "+254", flag: "🇰🇪" },
    { code: "KR", name: "Coreia do Sul", dial: "+82", flag: "🇰🇷" },
    { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
    { code: "LV", name: "Letônia", dial: "+371", flag: "🇱🇻" },
    { code: "LB", name: "Líbano", dial: "+961", flag: "🇱🇧" },
    { code: "LY", name: "Líbia", dial: "+218", flag: "🇱🇾" },
    { code: "LT", name: "Lituânia", dial: "+370", flag: "🇱🇹" },
    { code: "LU", name: "Luxemburgo", dial: "+352", flag: "🇱🇺" },
    { code: "MG", name: "Madagascar", dial: "+261", flag: "🇲🇬" },
    { code: "MY", name: "Malásia", dial: "+60", flag: "🇲🇾" },
    { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
    { code: "MT", name: "Malta", dial: "+356", flag: "🇲🇹" },
    { code: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
    { code: "MD", name: "Moldávia", dial: "+373", flag: "🇲🇩" },
    { code: "MC", name: "Mônaco", dial: "+377", flag: "🇲🇨" },
    { code: "MN", name: "Mongólia", dial: "+976", flag: "🇲🇳" },
    { code: "ME", name: "Montenegro", dial: "+382", flag: "🇲🇪" },
    { code: "MA", name: "Marrocos", dial: "+212", flag: "🇲🇦" },
    { code: "MZ", name: "Moçambique", dial: "+258", flag: "🇲🇿" },
    { code: "NA", name: "Namíbia", dial: "+264", flag: "🇳🇦" },
    { code: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵" },
    { code: "NL", name: "Países Baixos", dial: "+31", flag: "🇳🇱" },
    { code: "NZ", name: "Nova Zelândia", dial: "+64", flag: "🇳🇿" },
    { code: "NI", name: "Nicarágua", dial: "+505", flag: "🇳🇮" },
    { code: "NE", name: "Níger", dial: "+227", flag: "🇳🇪" },
    { code: "NG", name: "Nigéria", dial: "+234", flag: "🇳🇬" },
    { code: "NO", name: "Noruega", dial: "+47", flag: "🇳🇴" },
    { code: "OM", name: "Omã", dial: "+968", flag: "🇴🇲" },
    { code: "PK", name: "Paquistão", dial: "+92", flag: "🇵🇰" },
    { code: "PA", name: "Panamá", dial: "+507", flag: "🇵🇦" },
    { code: "PY", name: "Paraguai", dial: "+595", flag: "🇵🇾" },
    { code: "PE", name: "Peru", dial: "+51", flag: "🇵🇪" },
    { code: "PH", name: "Filipinas", dial: "+63", flag: "🇵🇭" },
    { code: "PL", name: "Polônia", dial: "+48", flag: "🇵🇱" },
    { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
    { code: "QA", name: "Catar", dial: "+974", flag: "🇶🇦" },
    { code: "RO", name: "Romênia", dial: "+40", flag: "🇷🇴" },
    { code: "RU", name: "Rússia", dial: "+7", flag: "🇷🇺" },
    { code: "SA", name: "Arábia Saudita", dial: "+966", flag: "🇸🇦" },
    { code: "SN", name: "Senegal", dial: "+221", flag: "🇸🇳" },
    { code: "RS", name: "Sérvia", dial: "+381", flag: "🇷🇸" },
    { code: "SG", name: "Singapura", dial: "+65", flag: "🇸🇬" },
    { code: "SK", name: "Eslováquia", dial: "+421", flag: "🇸🇰" },
    { code: "SI", name: "Eslovênia", dial: "+386", flag: "🇸🇮" },
    { code: "ZA", name: "África do Sul", dial: "+27", flag: "🇿🇦" },
    { code: "ES", name: "Espanha", dial: "+34", flag: "🇪🇸" },
    { code: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
    { code: "SE", name: "Suécia", dial: "+46", flag: "🇸🇪" },
    { code: "CH", name: "Suíça", dial: "+41", flag: "🇨🇭" },
    { code: "SY", name: "Síria", dial: "+963", flag: "🇸🇾" },
    { code: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
    { code: "TZ", name: "Tanzânia", dial: "+255", flag: "🇹🇿" },
    { code: "TH", name: "Tailândia", dial: "+66", flag: "🇹🇭" },
    { code: "TN", name: "Tunísia", dial: "+216", flag: "🇹🇳" },
    { code: "TR", name: "Turquia", dial: "+90", flag: "🇹🇷" },
    { code: "UG", name: "Uganda", dial: "+256", flag: "🇺🇬" },
    { code: "UA", name: "Ucrânia", dial: "+380", flag: "🇺🇦" },
    { code: "AE", name: "Emirados Árabes Unidos", dial: "+971", flag: "🇦🇪" },
    { code: "GB", name: "Reino Unido", dial: "+44", flag: "🇬🇧" },
    { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
    { code: "UY", name: "Uruguai", dial: "+598", flag: "🇺🇾" },
    { code: "UZ", name: "Uzbequistão", dial: "+998", flag: "🇺🇿" },
    { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪" },
    { code: "VN", name: "Vietnã", dial: "+84", flag: "🇻🇳" },
    { code: "YE", name: "Iêmen", dial: "+967", flag: "🇾🇪" },
    { code: "ZM", name: "Zâmbia", dial: "+260", flag: "🇿🇲" },
    { code: "ZW", name: "Zimbábue", dial: "+263", flag: "🇿🇼" },
];

// Retorna a URL da bandeira por código ISO-3166 alpha-2 (lowercase)
export const getFlagUrl = (code: string) => {
    const lc = (code || "").toLowerCase();
    return `https://flagcdn.com/${lc}.svg`;
};

// 🔢 utilidade
export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

// DDDs válidos do Brasil (ANATEL)
export const VALID_BR_DDDS = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
    '21', '22', '24', // Rio de Janeiro
    '27', '28', // Espírito Santo
    '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
    '41', '42', '43', '44', '45', '46', // Paraná
    '47', '48', '49', // Santa Catarina
    '51', '53', '54', '55', // Rio Grande do Sul
    '61', // Distrito Federal
    '62', '64', // Goiás
    '63', // Tocantins
    '65', '66', // Mato Grosso
    '67', // Mato Grosso do Sul
    '68', // Acre
    '69', // Rondônia
    '71', '73', '74', '75', '77', // Bahia
    '79', // Sergipe
    '81', '87', // Pernambuco
    '82', // Alagoas
    '83', // Paraíba
    '84', // Rio Grande do Norte
    '85', '88', // Ceará
    '86', '89', // Piauí
    '91', '93', '94', // Pará
    '92', '97', // Amazonas
    '95', // Roraima
    '96', // Amapá
    '98', '99', // Maranhão
];

// Valida telefone brasileiro (DDD + número)
export function validateBrazilianPhone(phone: string): { valid: boolean; error?: string } {
    const digits = onlyDigits(phone);

    // Deve ter 10 dígitos (fixo) ou 11 dígitos (móvel)
    if (digits.length < 10 || digits.length > 11) {
        return { valid: false, error: "Telefone deve ter 10 ou 11 dígitos" };
    }

    // Extrai o DDD (primeiros 2 dígitos)
    const ddd = digits.slice(0, 2);

    // Valida se o DDD existe
    if (!VALID_BR_DDDS.includes(ddd)) {
        return { valid: false, error: "DDD inválido" };
    }

    // Valida o número após o DDD
    const numero = digits.slice(2);

    if (numero.length === 9) {
        // Celular: deve começar com 9
        if (!numero.startsWith('9')) {
            return { valid: false, error: "Celular deve começar com 9" };
        }
    } else if (numero.length === 8) {
        // Fixo: não deve começar com 9
        if (numero.startsWith('9')) {
            return { valid: false, error: "Telefone fixo não pode começar com 9" };
        }
    } else {
        return { valid: false, error: "Número inválido" };
    }

    return { valid: true };
}

// Valida telefone por país (BR com regra de DDD; demais com tamanho E.164)
export function validatePhoneByCountry(countryCode: string, phone: string): { valid: boolean; error?: string } {
    const digits = onlyDigits(phone);

    if (!digits) {
        return { valid: false, error: "Telefone é obrigatório" };
    }

    if (countryCode === "BR") {
        return validateBrazilianPhone(digits);
    }

    if (digits.length < 6 || digits.length > 15) {
        return { valid: false, error: "Digite um telefone válido" };
    }

    return { valid: true };
}

// Limpa o número de telefone removendo o código do país se presente
export function cleanPhoneNumber(digits: string, countryCode: string): string {
    const d = onlyDigits(digits);
    if (countryCode === "BR") {
        // Remove o código do país +55 se presente no início
        if (d.startsWith("55") && d.length >= 12) {
            // Se começa com 55 e tem 12 ou mais dígitos, provavelmente inclui o código do país
            const withoutCountry = d.slice(2);
            // Verifica se os próximos 2 dígitos formam um DDD válido
            const possibleDDD = withoutCountry.slice(0, 2);
            if (VALID_BR_DDDS.includes(possibleDDD)) {
                return withoutCountry;
            }
        }
        // Caso especial: se tiver 13 dígitos começando com 55, pode ser +55 (DDD) NNNNN-NNNN
        // Exemplo: 5511974249091 -> 11974249091
        if (d.length === 13 && d.startsWith("55")) {
            const withoutCountry = d.slice(2);
            const possibleDDD = withoutCountry.slice(0, 2);
            if (VALID_BR_DDDS.includes(possibleDDD)) {
                return withoutCountry;
            }
        }
        return d;
    }

    const dialDigits = onlyDigits(PHONE_COUNTRIES.find(c => c.code === countryCode)?.dial || "");
    if (dialDigits && d.startsWith(dialDigits)) {
        const withoutCountry = d.slice(dialDigits.length);
        if (withoutCountry.length >= 6) {
            return withoutCountry;
        }
    }

    return d;
}

// 📞 máscara por país
export function maskTelefoneByCountry(countryCode: string, digits: string): string {
    // Limpa o número removendo código do país se presente
    const cleaned = cleanPhoneNumber(digits, countryCode);
    const d = cleaned.slice(0, countryCode === "BR" ? 11 : 15);
    
    switch (countryCode) {
        case "BR": {
            const ddd = d.slice(0, 2);
            const rest = d.slice(2);
            if (!ddd) return "";
            if (rest.length <= 8) {
                // Telefone fixo: (DDD) NNNN-NNNN
                const p1 = rest.slice(0, 4);
                const p2 = rest.slice(4, 8);
                return `(${ddd}) ${p1}${p2 ? "-" + p2 : ""}`.trim();
            }
            // Celular: (DDD) NNNNN-NNNN
            const p1 = rest.slice(0, 5);
            const p2 = rest.slice(5, 9);
            return `(${ddd}) ${p1}${p2 ? "-" + p2 : ""}`.trim();
        }
        case "US":
        case "CA": {
            const a = d.slice(0, 3);
            const b = d.slice(3, 6);
            const c = d.slice(6, 10);
            if (!a) return "";
            if (!b) return `(${a})`;
            if (!c) return `(${a}) ${b}`;
            return `(${a}) ${b}-${c}`;
        }
        default: {
            const a = d.slice(0, 3);
            const b = d.slice(3, 6);
            const c = d.slice(6, 10);
            const rest = d.slice(10, 15);
            return [a, b, c, rest].filter(Boolean).join(" ").trim();
        }
    }
}
