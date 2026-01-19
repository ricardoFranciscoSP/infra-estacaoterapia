Fluxos de cadastro, checkout e limpeza de cache

1) Caminho 1 - Banners (cliente)
- Clique no banner leva para cadastro de paciente com intenção de compra.
- Após cadastro: redireciona para checkout da primeira consulta.
- Cache: primeira compra expira em 15 minutos; ao fechar/desistir limpa dados temporários.

2) Caminho 2 - Seção "Para pacientes" > "Começar minha terapia"
- Se paciente logado: vai para /painel.
- Se psicólogo logado: vai para /adm-psicologo.
- Se não logado: vai para cadastro de paciente sem intenção de compra.
- Não redireciona ao checkout.

3) Caminho 3 - "Você merece esse cuidado" > "Fazer minha sessão experimental agora!"
- Vai para cadastro de paciente com intenção de compra.
- Após cadastro: redireciona para checkout com o plano de primeira consulta (planoId e productId).
- Cache: primeira compra expira em 15 minutos; ao fechar/desistir limpa dados temporários.

4) Caminho 4 - "Conheça nossos planos" > "Adquirir primeira sessão agora"
- Vai para cadastro de paciente com intenção de compra e planoId.
- Após cadastro: redireciona para checkout da primeira consulta.
- Cache: primeira compra expira em 15 minutos; ao fechar/desistir limpa dados temporários.

5) Caminho 5 - Botão "Criar conta"
- Vai para cadastro de paciente sem intenção de compra.
- Não redireciona ao checkout.

6) Caminho 6 - Marketplace > "Agendar"
- Se não logado: cria DraftSession, salva agendamento pendente (com timestamp) e vai para cadastro de paciente com intenção de compra.
- Após cadastro: redireciona para checkout com psicólogo selecionado.
- Após pagamento: confirma DraftSession e conclui agendamento.
- Onboarding/Tutorial: segue fluxo padrão do painel após cadastro/compra.
- Cache: agendamento pendente e draftId expiram em 15 minutos; ao fechar/desistir limpa dados temporários.

Limpeza de cache e expiração
- Primeira compra: expira em 15 minutos e é limpa quando expira, quando o usuário cancela, ou ao fechar a página.
- Marketplace (agendamento pendente): expira em 15 minutos e é limpo quando expira ou ao fechar/cancelar a compra.
