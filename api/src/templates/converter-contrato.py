#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para converter o contrato do Word para HTML limpo e formatado
Seguindo padrões ABNT2 para documentos
"""

import re
import html
from pathlib import Path

def limpar_texto(texto):
    """Remove caracteres de formatação e normaliza o texto"""
    # Decodificar entidades HTML
    texto = html.unescape(texto)
    
    # Corrigir caracteres mal codificados
    replacements = {
        'ï¿½': 'ã',
        '�': '',
        'Ã§': 'ç',
        'Ã£': 'ã',
        'Ã©': 'é',
        'Ãª': 'ê',
        'Ã­': 'í',
        'Ã³': 'ó',
        'Ãº': 'ú',
        'Ã': 'à',
        'Ã¡': 'á',
        'Ãµ': 'õ',
        'Ã§Ã£': 'ção',
        'Ã§Ã': 'çõ',
        '&#45;': '-',
        '&nbsp;': ' ',
    }
    
    for old, new in replacements.items():
        texto = texto.replace(old, new)
    
    return texto

def extrair_conteudo(html_content):
    """Extrai TODO o conteúdo principal do HTML do Word incluindo tabelas e anexos"""
    
    # Extrair body
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.DOTALL | re.IGNORECASE)
    if not body_match:
        return ""
    
    content = body_match.group(1)
    
    # Remover scripts e estilos inline que não servem
    content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remover comentários condicionais do Word mas PRESERVAR CONTEÚDO
    content = re.sub(r'<!\[if[^\]]*\]>(.*?)<!\[endif\]>', r'\1', content, flags=re.DOTALL)
    content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    
    # Remover namespace declarations e atributos desnecessários do Word
    content = re.sub(r'\s+xmlns[^=]*="[^"]*"', '', content)
    content = re.sub(r'\s+o:\w+="[^"]*"', '', content)
    content = re.sub(r'\s+v:\w+="[^"]*"', '', content)
    content = re.sub(r'\s+w:\w+="[^"]*"', '', content)
    content = re.sub(r'\s+x:\w+="[^"]*"', '', content)
    content = re.sub(r'\s+mso-[^=]*="[^"]*"', '', content)
    
    sections = []
    
    # PROCESSAR TABELAS INTEIRAS
    for table_match in re.finditer(r'<table[^>]*>(.*?)</table>', content, re.DOTALL | re.IGNORECASE):
        table_content = table_match.group(0)
        sections.append(('table', table_content))
        # Remover tabela do conteúdo para não processar novamente
        content = content.replace(table_match.group(0), '<!-- TABELA PROCESSADA -->')
    
    # Processar h1/h2/h3 (títulos)
    for match in re.finditer(r'<h[123][^>]*>(.*?)</h[123]>', content, re.DOTALL):
        text = limpar_html_tags(match.group(1))
        text = limpar_texto(text)
        text = re.sub(r'\s+', ' ', text).strip()
        if text and len(text) > 3:
            sections.append(('h2', text))
    
    # Processar TODOS os parágrafos (não filtrar apenas MsoBodyText)
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', content, re.DOTALL):
        raw_text = match.group(1)
        # Pular se contém apenas espaços ou imagens
        if '<img' in raw_text or re.match(r'^\s*$', raw_text):
            continue
        
        text = limpar_html_tags(raw_text)
        text = limpar_texto(text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        if text and len(text) > 1:
            # Detectar tipo
            if re.match(r'^\d+\.', text):
                sections.append(('h2', text))
            elif re.match(r'^(Parágrafo|PARÁGRAFO)', text):
                sections.append(('paragrafo', text))
            else:
                sections.append(('p', text))
    
    # Processar TODAS as listas (li items)
    for match in re.finditer(r'<li[^>]*>(.*?)</li>', content, re.DOTALL):
        text = limpar_html_tags(match.group(1))
        text = limpar_texto(text)
        text = re.sub(r'\s+', ' ', text).strip()
        if text and len(text) > 1:
            sections.append(('li', text))
    
    # Processar divs que possam conter conteúdo
    for match in re.finditer(r'<div[^>]*>(.*?)</div>', content, re.DOTALL):
        div_content = match.group(1)
        # Pular divs vazios ou com pouquíssimo conteúdo
        if len(re.sub(r'<[^>]+>', '', div_content).strip()) < 20:
            continue
        if '<table' not in div_content and '<p' not in div_content and '<h' not in div_content:
            text = limpar_html_tags(div_content)
            text = limpar_texto(text)
            text = re.sub(r'\s+', ' ', text).strip()
            if text and len(text) > 20:
                sections.append(('p', text))
    
    return sections

def limpar_html_tags(text):
    """Remove tags HTML mas preserva o conteúdo"""
    # Preservar quebras de linha
    text = re.sub(r'<br[^>]*>', '\n', text)
    # Remover tags
    text = re.sub(r'<[^>]+>', ' ', text)
    return text

def gerar_html_limpo(sections):
    """Gera HTML limpo e formatado com CSS ABNT2"""
    
    html_parts = ['''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Parceria e Intermediação - Psicólogo</title>
    <style>
        /* Reset e configurações básicas */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Padrões ABNT2 */
        @page {
            size: A4;
            margin: 3cm 3cm 2cm 3cm; /* Superior: 3cm, Direita: 3cm, Inferior: 2cm, Esquerda: 3cm */
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
            max-width: 21cm;
            margin: 0 auto;
            padding: 3cm 3cm 2cm 3cm;
            text-align: justify;
            hyphens: auto;
        }
        
        /* Títulos principais */
        h1 {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin: 24pt 0 12pt 0;
            page-break-after: avoid;
        }
        
        /* Subtítulos e seções */
        h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 18pt 0 6pt 0;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 12pt;
            font-weight: bold;
            font-style: italic;
            margin: 12pt 0 6pt 0;
        }
        
        /* Parágrafos */
        p {
            margin: 6pt 0;
            text-indent: 1.25cm; /* Recuo de primeira linha ABNT */
        }
        
        p.sem-recuo {
            text-indent: 0;
        }
        
        p.paragrafo-unico {
            font-weight: bold;
            text-indent: 0;
            margin-top: 6pt;
        }
        
        /* Listas */
        ul, ol {
            margin: 6pt 0 6pt 1.25cm;
            padding-left: 1.25cm;
        }
        
        li {
            margin: 3pt 0;
            text-align: justify;
        }
        
        /* Ênfases */
        strong, b {
            font-weight: bold;
        }
        
        em, i {
            font-style: italic;
        }
        
        /* Tabelas ABNT */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            page-break-inside: avoid;
            font-size: 11pt;
        }
        
        th, td {
            border: 1pt solid #000;
            padding: 6pt 8pt;
            text-align: left;
            vertical-align: top;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        
        tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        /* Assinaturas */
        .assinaturas {
            margin-top: 48pt;
            page-break-inside: avoid;
        }
        
        .assinatura {
            margin: 24pt 0;
            text-align: center;
        }
        
        .linha-assinatura {
            border-top: 1pt solid #000;
            width: 60%;
            margin: 0 auto 6pt auto;
        }
        
        .data-assinatura {
            text-align: right;
            margin: 24pt 0;
        }
        
        /* Variáveis do sistema */
        .variavel {
            background-color: #ffffcc;
            padding: 0 2pt;
            font-family: 'Courier New', monospace;
        }
        
        /* Quebras de página */
        .quebra-pagina {
            page-break-before: always;
        }
        
        /* Impressão */
        @media print {
            body {
                padding: 0;
                max-width: 100%;
            }
            
            .variavel {
                background-color: transparent;
            }
        }
        
        /* Cabeçalho do documento */
        .cabecalho {
            text-align: center;
            margin-bottom: 24pt;
        }
        
        /* Qualificação das partes */
        .qualificacao {
            margin: 12pt 0;
        }
        
        .qualificacao p {
            text-indent: 0;
        }
    </style>
</head>
<body>
''']
    
    in_list = False
    list_counter = 0
    
    for tipo, texto in sections:
        if tipo == 'table':
            # Processar tabelas HTML
            if in_list:
                html_parts.append('    </ul>\n')
                in_list = False
            
            # Limpar atributos desnecessários da tabela
            tabela_limpa = texto
            tabela_limpa = re.sub(r'\s+style="[^"]*"', '', tabela_limpa, flags=re.IGNORECASE)
            tabela_limpa = re.sub(r'\s+class="[^"]*"', '', tabela_limpa, flags=re.IGNORECASE)
            tabela_limpa = re.sub(r'\s+width="[^"]*"', '', tabela_limpa, flags=re.IGNORECASE)
            tabela_limpa = re.sub(r'\s+valign="[^"]*"', '', tabela_limpa, flags=re.IGNORECASE)
            tabela_limpa = re.sub(r'\s+align="[^"]*"', '', tabela_limpa, flags=re.IGNORECASE)
            
            # Limpar conteúdo das células
            tabela_limpa = limpar_html_tags(tabela_limpa)
            tabela_limpa = limpar_texto(tabela_limpa)
            
            html_parts.append(f'    {tabela_limpa}\n')
        
        else:
            # Substituir variáveis mantendo o formato
            texto = texto.replace('{{', '<span class="variavel">{{').replace('}}', '}}</span>')
            
            if tipo == 'h2':
                if in_list:
                    html_parts.append('    </ul>\n')
                    in_list = False
                html_parts.append(f'    <h2>{texto}</h2>\n')
            
            elif tipo == 'paragrafo':
                if in_list:
                    html_parts.append('    </ul>\n')
                    in_list = False
                html_parts.append(f'    <p class="paragrafo-unico">{texto}</p>\n')
            
            elif tipo == 'li':
                if not in_list:
                    html_parts.append('    <ul>\n')
                    in_list = True
                html_parts.append(f'        <li>{texto}</li>\n')
            
            else:  # p
                if in_list:
                    html_parts.append('    </ul>\n')
                    in_list = False
                
                # Detectar se precisa de recuo
                if texto.startswith(('OU,', 'E,', 'Pelo presente')):
                    html_parts.append(f'    <p class="sem-recuo">{texto}</p>\n')
                else:
                    html_parts.append(f'    <p>{texto}</p>\n')
    
    if in_list:
        html_parts.append('</ul>\n')
    
    # Adicionar seção de assinaturas
    html_parts.append('''
    <div class="assinaturas">
        <div class="data-assinatura">
            <p class="sem-recuo">Barueri, <span class="variavel">{{diaAssinatura}}</span> de <span class="variavel">{{mesAssinatura}}</span> de <span class="variavel">{{anoAssinatura}}</span>.</p>
        </div>
        
        <div class="assinatura">
            <p class="sem-recuo"><strong>INTERMEDIADOR:</strong></p>
            <div class="linha-assinatura"></div>
            <p class="sem-recuo"><span class="variavel">{{assinaturaIntermediador}}</span></p>
            <p class="sem-recuo">MINDFLUENCE PSICOLOGIA LTDA.</p>
        </div>
        
        <div class="assinatura">
            <p class="sem-recuo"><strong>PSICÓLOGO(A) PESSOA FÍSICA / PESSOA JURÍDICA:</strong></p>
            <div class="linha-assinatura"></div>
            <p class="sem-recuo"><span class="variavel">{{assinaturaPsicologo}}</span></p>
        </div>
    </div>
''')
    
    html_parts.append('''
</body>
</html>
''')
    
    return ''.join(html_parts)

def main():
    """Função principal"""
    input_file = Path('contrato-parceria-psicologo.html')
    output_file = Path('contrato-parceria-psicologo-limpo.html')
    
    print(f'Lendo {input_file}...')
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()
    
    print('Extraindo conteúdo...')
    sections = extrair_conteudo(html_content)
    
    print(f'Encontradas {len(sections)} seções')
    
    print('Gerando HTML limpo...')
    html_limpo = gerar_html_limpo(sections)
    
    print(f'Salvando em {output_file}...')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_limpo)
    
    print('✓ Conversão concluída!')
    print(f'✓ Arquivo gerado: {output_file}')
    print(f'✓ Total de seções processadas: {len(sections)}')

if __name__ == '__main__':
    main()
