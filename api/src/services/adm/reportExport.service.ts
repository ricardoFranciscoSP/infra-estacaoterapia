/**
 * Serviço de Exportação de Relatórios (Excel e PDF)
 */

import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import { Response } from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export class ReportExportService {
    /**
     * Exporta dados para Excel
     */
    async exportToExcel(
        data: Record<string, unknown>[],
        headers: string[],
        filename: string,
        res: Response
    ): Promise<void> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Relatório");

        // Estilo do cabeçalho
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF8494E9" },
        };
        worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

        // Adiciona cabeçalhos
        worksheet.columns = headers.map((header, index) => ({
            header,
            key: `col${index}`,
            width: 20,
        }));

        // Adiciona dados
        data.forEach((row, rowIndex) => {
            const excelRow = worksheet.addRow(
                headers.map((_, colIndex) => {
                    const key = Object.keys(row)[colIndex];
                    const value = row[key];
                    
                    // Formatação de datas
                    if (value instanceof Date) {
                        return dayjs(value).tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm");
                    }
                    
                    // Formatação de valores monetários
                    if (typeof value === "number" && (key.toLowerCase().includes("valor") || key.toLowerCase().includes("preco"))) {
                        return value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                        });
                    }
                    
                    return value ?? "";
                })
            );

            // Alterna cores das linhas
            if (rowIndex % 2 === 0) {
                excelRow.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF5F5F5" },
                };
            }
        });

        // Ajusta altura das linhas
        worksheet.eachRow((row) => {
            row.height = 20;
        });

        // Configura resposta
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();
    }

    /**
     * Exporta dados para PDF
     */
    async exportToPDF(
        data: Record<string, unknown>[],
        headers: string[],
        title: string,
        filename: string,
        res: Response
    ): Promise<void> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        try {
            const page = await browser.newPage();

            // Gera HTML da tabela
            const html = this.generateTableHTML(data, headers, title);

            await page.setContent(html, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                format: "A4",
                landscape: headers.length > 6,
                margin: {
                    top: "20mm",
                    right: "10mm",
                    bottom: "20mm",
                    left: "10mm",
                },
                printBackground: true,
            });

            await browser.close();

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${filename}_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.pdf"`
            );
            res.send(pdfBuffer);
        } catch (error) {
            await browser.close();
            throw error;
        }
    }

    /**
     * Gera HTML da tabela para PDF
     */
    private generateTableHTML(
        data: Record<string, unknown>[],
        headers: string[],
        title: string
    ): string {
        const formatValue = (value: unknown): string => {
            if (value instanceof Date) {
                return dayjs(value).tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm");
            }
            if (typeof value === "number" && value.toString().includes(".")) {
                return value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            }
            if (typeof value === "number") {
                return value.toLocaleString("pt-BR");
            }
            return String(value ?? "");
        };

        const rows = data
            .map(
                (row) => `
            <tr>
                ${headers
                    .map(
                        (_, index) => `
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">
                        ${formatValue(Object.values(row)[index])}
                    </td>
                `
                    )
                    .join("")}
            </tr>
        `
            )
            .join("");

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                }
                h1 {
                    color: #8494E9;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .info {
                    text-align: center;
                    margin-bottom: 20px;
                    color: #666;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 10px;
                }
                th {
                    background-color: #8494E9;
                    color: white;
                    font-weight: bold;
                    padding: 10px;
                    text-align: left;
                    border: 1px solid #ddd;
                }
                td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                tr:nth-child(even) {
                    background-color: #f5f5f5;
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="info">
                Gerado em: ${dayjs().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss")} | 
                Total de registros: ${data.length}
            </div>
            <table>
                <thead>
                    <tr>
                        ${headers.map((header) => `<th>${header}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </body>
        </html>
    `;
    }
}

