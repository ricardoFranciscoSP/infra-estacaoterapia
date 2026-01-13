# 🔧 Correção de BOM (Byte Order Mark) em Scripts

## ⚠️ Problema

Erro ao executar scripts `.sh`:
```
./deploy-all.sh: line 1: $'\357\273\277': command not found
```

## 🔍 Causa

O erro ocorre quando um arquivo shell script tem um **BOM (Byte Order Mark)** no início. O BOM é um caractere invisível (bytes `EF BB BF` em UTF-8) que alguns editores no Windows adicionam automaticamente.

## ✅ Solução

### Remover BOM na VPS (Comando Único)

Execute este comando **na VPS** para remover o BOM:

```bash
# Remover BOM do deploy-all.sh
sed -i '1s/^\xEF\xBB\xBF//' deploy-all.sh

# Verificar se funcionou (deve mostrar #!/bin/bash ou similar)
head -1 deploy-all.sh
```

### Alternativa: Usar dos2unix

Se `dos2unix` estiver disponível:

```bash
# Instalar dos2unix (se necessário)
sudo apt-get update && sudo apt-get install -y dos2unix

# Remover BOM e converter line endings
dos2unix deploy-all.sh
```

### Alternativa: Usar Perl

Se `sed` não funcionar:

```bash
# Remover BOM usando Perl
perl -i -pe 's/^\xEF\xBB\xBF//' deploy-all.sh
```

### Remover BOM de Todos os Scripts

Para remover BOM de todos os scripts `.sh`:

```bash
# Remover BOM de todos os scripts .sh
find . -name "*.sh" -type f -exec sed -i '1s/^\xEF\xBB\xBF//' {} \;

# Ou usar um loop
for file in $(find . -name "*.sh" -type f); do
    sed -i '1s/^\xEF\xBB\xBF//' "$file"
done
```

### Verificar se o BOM foi Removido

```bash
# Verificar se há BOM no início do arquivo
head -c 3 deploy-all.sh | od -An -tx1

# Se mostrar "ef bb bf", ainda tem BOM
# Se mostrar "23 21 2f" (#!/), BOM foi removido
```

### Script Automático de Correção

Crie um script `fix-bom.sh`:

```bash
#!/bin/bash
# Script para remover BOM de todos os scripts .sh

echo "Removendo BOM de scripts .sh..."

find . -name "*.sh" -type f | while read file; do
    if [ -f "$file" ]; then
        # Verificar se tem BOM
        if head -c 3 "$file" | od -An -tx1 | grep -q "ef bb bf"; then
            echo "Removendo BOM de: $file"
            sed -i '1s/^\xEF\xBB\xBF//' "$file"
        fi
    fi
done

echo "Concluído!"
```

## 🛠️ Prevenção

### Configurar Editor (VS Code)

Para evitar que o VS Code adicione BOM:

1. Abra as configurações do VS Code
2. Adicione:
```json
{
    "files.encoding": "utf8",
    "files.eol": "\n",
    "[shellscript]": {
        "files.encoding": "utf8",
        "files.eol": "\n"
    }
}
```

### Configurar Git

Para converter automaticamente no checkout (Linux):

```bash
# Configurar Git para remover BOM automaticamente
git config --global core.autocrlf input
git config --global filter.utf8.clean 'sed -i "1s/^\xEF\xBB\xBF//"'
```

## 📝 Notas

- O BOM é mais comum em arquivos editados no Windows
- Scripts shell não devem ter BOM
- O BOM pode causar erros como `command not found` na primeira linha
- Sempre verifique scripts após edição no Windows

## 🔍 Verificação Rápida

Para verificar rapidamente se um arquivo tem BOM:

```bash
# Ver os primeiros 3 bytes em hexadecimal
head -c 3 deploy-all.sh | od -An -tx1

# Se mostrar "ef bb bf", tem BOM
# Se mostrar algo diferente (como "23 21 2f" para #!/), não tem BOM
```
