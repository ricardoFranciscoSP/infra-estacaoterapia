# Variáveis do Contrato de Parceria - Psicólogo

Este documento lista todas as variáveis que devem ser preenchidas pelo sistema no template `contrato-parceria-psicologo.html`.

## Variáveis para PESSOA JURÍDICA

Quando o psicólogo atua através de uma empresa:

### Dados da Empresa

- `{{razaoSocial}}` - Razão social da empresa
- `{{cnpj}}` - CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)
- `{{enderecoEmpresa}}` - Endereço completo da empresa (logradouro)
- `{{numeroEmpresa}}` - Número do endereço da empresa
- `{{complementoEmpresa}}` - Complemento do endereço (opcional)
- `{{bairroEmpresa}}` - Bairro da empresa
- `{{cidadeEmpresa}}` - Cidade da empresa
- `{{ufEmpresa}}` - UF (sigla do estado) da empresa

### Dados do Representante Legal

- `{{nomeRepresentanteLegal}}` - Nome do representante legal (pode ser resumido)
- `{{nomeCompletoRepresentanteLegal}}` - Nome completo do representante legal
- `{{rgRepresentante}}` - RG do representante legal
- `{{cpfRepresentante}}` - CPF do representante legal (formato: XXX.XXX.XXX-XX)
- `{{crpRepresentante}}` - CRP do representante legal (formato: XX/XXXXX)
- `{{enderecoRepresentante}}` - Endereço completo do representante (logradouro)
- `{{numeroRepresentante}}` - Número do endereço do representante
- `{{complementoRepresentante}}` - Complemento do endereço do representante (opcional)
- `{{bairroRepresentante}}` - Bairro do representante
- `{{cidadeRepresentante}}` - Cidade do representante
- `{{ufRepresentante}}` - UF (sigla do estado) do representante

## Variáveis para PESSOA FÍSICA (Psicólogo Autônomo)

Quando o psicólogo atua de forma autônoma:

### Dados do Psicólogo

- `{{nomePsicologo}}` - Nome completo do psicólogo
- `{{rgPsicologo}}` - RG do psicólogo
- `{{cpfPsicologo}}` - CPF do psicólogo (formato: XXX.XXX.XXX-XX)
- `{{crpPsicologo}}` - CRP do psicólogo (formato: XX/XXXXX)
- `{{enderecoPsicologo}}` - Endereço completo do psicólogo (logradouro)
- `{{numeroPsicologo}}` - Número do endereço do psicólogo
- `{{complementoPsicologo}}` - Complemento do endereço (opcional)
- `{{bairroPsicologo}}` - Bairro do psicólogo
- `{{cidadePsicologo}}` - Cidade do psicólogo
- `{{ufPsicologo}}` - UF (sigla do estado) do psicólogo

## Variáveis de Data e Assinatura

Utilizadas tanto para pessoa física quanto jurídica:

- `{{diaAssinatura}}` - Dia da assinatura (formato: DD)
- `{{mesAssinatura}}` - Mês da assinatura (por extenso: janeiro, fevereiro, etc.)
- `{{anoAssinatura}}` - Ano da assinatura (formato: YYYY)
- `{{assinaturaIntermediador}}` - Assinatura digital ou campo de assinatura do intermediador
- `{{assinaturaPsicologo}}` - Assinatura digital ou campo de assinatura do psicólogo/empresa

## Exemplo de Uso no Código

```typescript
const dadosContrato = {
  // Pessoa Jurídica
  razaoSocial: 'Clínica Mente Sã Ltda',
  cnpj: '12.345.678/0001-90',
  enderecoEmpresa: 'Rua das Flores',
  numeroEmpresa: '123',
  complementoEmpresa: 'Sala 45',
  bairroEmpresa: 'Centro',
  cidadeEmpresa: 'São Paulo',
  ufEmpresa: 'SP',

  nomeRepresentanteLegal: 'Dr. João Silva',
  nomeCompletoRepresentanteLegal: 'João da Silva Santos',
  rgRepresentante: '12.345.678-9',
  cpfRepresentante: '123.456.789-00',
  crpRepresentante: '06/12345',
  enderecoRepresentante: 'Rua das Palmeiras',
  numeroRepresentante: '456',
  complementoRepresentante: 'Apto 12',
  bairroRepresentante: 'Jardins',
  cidadeRepresentante: 'São Paulo',
  ufRepresentante: 'SP',

  // Ou Pessoa Física
  nomePsicologo: 'Maria Santos Silva',
  rgPsicologo: '98.765.432-1',
  cpfPsicologo: '987.654.321-00',
  crpPsicologo: '06/54321',
  enderecoPsicologo: 'Avenida Paulista',
  numeroPsicologo: '1000',
  complementoPsicologo: 'Conj 202',
  bairroPsicologo: 'Bela Vista',
  cidadePsicologo: 'São Paulo',
  ufPsicologo: 'SP',

  // Data e Assinatura
  diaAssinatura: '04',
  mesAssinatura: 'janeiro',
  anoAssinatura: '2026',
  assinaturaIntermediador: '[Assinatura Digital Intermediador]',
  assinaturaPsicologo: '[Assinatura Digital Psicólogo]',
};

// Substitui as variáveis no template
let contratoHTML = templateHTML;
Object.keys(dadosContrato).forEach((key) => {
  const regex = new RegExp(`{{${key}}}`, 'g');
  contratoHTML = contratoHTML.replace(regex, dadosContrato[key]);
});
```

## Notas Importantes

1. **Campos Opcionais**: Os campos de complemento podem ser vazios se não houver complemento no endereço
2. **Formatação**: Mantenha a formatação correta dos documentos (CPF, CNPJ, CRP)
3. **Validação**: Valide todos os dados antes de gerar o contrato
4. **Assinaturas**: As assinaturas podem ser campos de texto, imagens ou integração com sistemas de assinatura digital
5. **Escolha**: O contrato suporta tanto PESSOA FÍSICA quanto PESSOA JURÍDICA - apenas um conjunto de dados deve ser preenchido

## Correções Realizadas

1. ✅ Substituição de todas as lacunas (underscores) por variáveis do sistema
2. ✅ Correção do charset de `windows-1252` para `UTF-8`
3. ✅ Adição de DOCTYPE HTML5
4. ✅ Padronização dos campos de endereço
5. ✅ Criação de variáveis para data e assinatura
