# Notas sobre o Caddyfile

## Sintaxe do Matcher

O Caddyfile usa a sintaxe `@nome_do_matcher` para definir matchers nomeados. Isso é **sintaxe válida do Caddy** e não deve ser alterado.

### Exemplo:
```caddyfile
@static_assets {
    path *.js *.css *.png
}
header @static_assets {
    Cache-Control "public, max-age=31536000, immutable"
}
```

## Avisos do Linter PowerShell

Se você ver avisos do PowerShell sobre o uso de `@` no Caddyfile, **ignore-os**. Esses são falsos positivos porque:

1. O PowerShell tenta interpretar o Caddyfile como script PowerShell
2. O Caddyfile tem sua própria sintaxe que é válida
3. O Caddy não é um script PowerShell

## Configuração do Editor

O arquivo `.vscode/settings.json` foi configurado para:
- Reconhecer Caddyfile como arquivo de configuração do Caddy
- Desabilitar sugestões do PowerShell para este arquivo
- Usar o formato correto para Caddy

## Validação

Para validar o Caddyfile, use:
```bash
docker run --rm -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
```

Ou se tiver o Caddy instalado:
```bash
caddy validate --config Caddyfile
```

## Sintaxe Correta

A sintaxe atual está **correta**:
- `@static_assets` define um matcher nomeado
- `header @static_assets` aplica headers apenas para requisições que correspondem ao matcher
- Isso é a forma recomendada pelo Caddy
