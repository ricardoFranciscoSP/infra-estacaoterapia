import fs from "fs";
import path from "path";

type TemplateVariables = Record<string, any>;

/**
 * Encontra o diretório de templates tentando múltiplos caminhos
 */
const getTemplatesDir = (): string => {
    const possiblePaths = [
        __dirname, // Caminho após compilação (dist/templates)
        path.resolve(__dirname, "..", "..", "src", "templates"), // Caminho de desenvolvimento
        path.resolve(process.cwd(), "dist", "templates"), // Caminho absoluto do dist
        path.resolve(process.cwd(), "src", "templates"), // Caminho absoluto do src (dev)
    ];

    for (const dirPath of possiblePaths) {
        try {
            const layoutPath = path.join(dirPath, "layout.html");
            if (fs.existsSync(layoutPath)) {
                return dirPath;
            }
        } catch (e) {
            // Continua tentando outros caminhos
        }
    }

    // Retorna o caminho padrão mesmo se não existir (será tratado no código)
    return __dirname;
};

export function renderEmail(
    templateName: string,
    variables: TemplateVariables
): string {
    const templatesDir = getTemplatesDir();
    const layoutPath = path.join(templatesDir, "layout.html");
    const templatePath = path.join(templatesDir, `${templateName}.html`);

    // Verifica se os arquivos existem antes de ler
    if (!fs.existsSync(layoutPath)) {
        throw new Error(`Layout não encontrado: ${layoutPath}`);
    }
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`);
    }

    let layout = fs.readFileSync(layoutPath, "utf-8");
    let template = fs.readFileSync(templatePath, "utf-8");

    // Garante variáveis padrão
    const safeVariables: TemplateVariables = {
        year: new Date().getFullYear(),
        title: "Estação Terapia",
        ...variables,
    };

    // Substitui variáveis no template específico
    for (const [key, value] of Object.entries(safeVariables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        template = template.replace(regex, String(value ?? ""));
    }

    // Insere o conteúdo no layout base
    let html = layout.replace("{{content}}", template);

    // Substitui variáveis também no layout
    for (const [key, value] of Object.entries(safeVariables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        html = html.replace(regex, String(value ?? ""));
    }

    return html;
}
