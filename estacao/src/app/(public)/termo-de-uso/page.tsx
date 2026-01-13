export default function TermoPage() {
  return (
     <div className="min-h-screen bg-[#fff] py-6 md:py-12 px-4 md:px-6 lg:px-8" style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-6 md:mb-8">
         TERMO DE ACEITE DO PACIENTE
        </h1>
        <div className="prose prose-sm md:prose-lg text-gray-700 leading-relaxed max-w-none">
          <div className="text-center mb-6">
            <p className="text-base md:text-lg font-medium mb-2">
              Planos Embarque, Viagem e Jornada
            </p>
            <p className="text-xs md:text-sm text-gray-600">
              Versão: 1.0 | Data: 22/12/2025
            </p>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">1. Aceite e documentos vinculados</h2>
          <p>
            Ao clicar em “ACEITAR E CONTRATAR”, ou ao concluir a contratação de qualquer um dos Planos Embarque, Viagem ou Jornada, o(a) CONTRATANTE (Pessoa Física) declara que leu, compreendeu e aceitou integralmente este Termo de Aceite, bem como os documentos vinculados disponíveis no site/painel da Estação Terapia, incluindo (quando aplicável): Termo de Uso do Paciente, Política de Privacidade, Política de Agendamento e Reagendamento, Política de Cancelamento e demais políticas operacionais.
Este Termo integra a contratação e estabelece as condições essenciais do plano escolhido, especialmente sobre cobrança recorrente, expiração de sessões, regras de cancelamento/downgrade, inadimplência e benefícios promocionais.

          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">2. Identificação das partes</h2>
          <p>
            CONTRATADA/PLATAFORMA: MINDFLUENCE PSICOLOGIA LTDA., CNPJ 54.222.003/0001-07, operadora da plataforma “Estação Terapia” (“PLATAFORMA” ou “ESTAÇÃO TERAPIA”), com canais oficiais e endereço informados e atualizados no site/painel.
CONTRATANTE: pessoa física identificada no momento do cadastro/contratação (CPF), responsável pelas informações fornecidas, pelo pagamento e pelo uso adequado da plataforma e do plano contratado.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">3. Natureza do serviço e limites de responsabilidade</h2>
          <p>
            A Estação Terapia é uma plataforma digital que intermedeia a contratação de atendimentos psicológicos on-line com profissionais psicólogos(as) parceiros(as) independentes. A condução técnica do atendimento (avaliação clínica, intervenções, registros e condutas) é de responsabilidade do(a) psicólogo(a) escolhido(a) pelo(a) CONTRATANTE, observadas as normas profissionais aplicáveis.
A PLATAFORMA não substitui serviços de urgência/emergência. Em situações que demandem atendimento imediato, o(a) CONTRATANTE deve buscar serviços de saúde/urgência locais.

          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">4. Regras gerais do plano (válidas para todos os Planos)</h2>
          
          <h3 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-gray-800">4.1. Ciclo mensal e liberação de sessões</h3>
          <p>
            A cobrança é recorrente mensal e, a cada ciclo pago, são disponibilizadas 4 (quatro) sessões para agendamento e realização dentro da PLATAFORMA.
          </p>

          <h3 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-gray-800">4.2. Expiração</h3>
          <p>
            Cada sessão disponibilizada no ciclo mensal tem prazo padrão de expiração de 30 (trinta) dias, contado da disponibilização. Sessões não utilizadas dentro do prazo podem expirar, sem dever de reembolso. O prazo de expiração também se aplica para as sessões experimental e avulsas.
          </p>

          <h3 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-gray-800">4.3. Intransferibilidade</h3>
          <p>
            O plano e as sessões são pessoais e intransferíveis, vinculados ao CPF do(a) CONTRATANTE.
          </p>

          <h3 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-gray-800">4.4. Reagendamento e cancelamento</h3>
          <p>
            As regras de reagendamento, cancelamento e faltas seguem a Política Operacional do Paciente, incluindo prazos mínimos (por exemplo, 24 horas antes da sessão), conforme disponibilizado no site/painel. Caso o prazo não seja respeitado, a sessão será cobrada integralmente, em razão do horário previamente reservado na agenda do(a) psicólogo(a) parceiro(a).
          </p>

          <h3 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-gray-800">4.5. Regras de atraso</h3>
          <p>
            As mesmas regras aplicam-se a atrasos superiores a 10 (dez) minutos. Quando o atraso for do paciente, prevalece a cobrança integral da sessão. Quando o atraso for do(a) psicólogo(a), aplicam-se as consequências previstas para o profissional: o repasse do atendimento poderá ser retido e a sessão será devolvida/creditada ao paciente, conforme a política vigente.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">5. Condições comerciais por Plano</h2>
          <p className="mb-4">
            Os Planos disponíveis seguem o quadro abaixo (valores e regras essenciais). O detalhamento completo consta do ANEXO II.
          </p>
          <div className="w-full overflow-x-auto my-6 border border-gray-200 rounded-lg">
            <table className="min-w-full border-collapse text-sm" style={{ minWidth: '800px' }}>
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Plano</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Sessões por ciclo</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Valor mensal</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Permanência mínima</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Total de sessões</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Multa por cancel./downgrade</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Forma de pagamento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Embarque</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">4</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 719,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Não</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">4</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Não</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Crédito à Vista.</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Viagem</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">4</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 639,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Sim, 3 meses.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">12</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">20% proporcional ao restante.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Crédito à Vista.</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Jornada</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">4</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 599,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Sim, 6 meses.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">24</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">20% proporcional ao restante.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Crédito à Vista.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">6. Cancelamento, downgrade e multa (quando aplicável)</h2>
          <p>
            <strong>6.1. Plano Embarque:</strong> não possui fidelidade/premanência mínima e não prevê multa por cancelamento. O cancelamento impede novas cobranças futuras, sem prejuízo de valores vencidos e não pagos.
          </p>
          <p>
            <strong>6.2. Planos Viagem e Jornada:</strong> possuem permanência mínima (3 meses e 6 meses, respectivamente). Se houver cancelamento antecipado ou downgrade que reduza a permanência contratada, aplica-se a multa contratual de 20% (vinte por cento) proporcional ao restante do contrato.
          </p>
          <p>
            <strong>6.3. Cálculo proporcional (regra geral):</strong> a base de cálculo considera o valor total do período mínimo contratado dividido pelos dias do período, multiplicado pelos dias faltantes para o término, aplicando-se 20% sobre o saldo remanescente. A PLATAFORMA informará o demonstrativo no fluxo de cancelamento/downgrade.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">7. Expiração e prorrogação por força maior</h2>
          <p>
            <strong>7.1. Prorrogação excepcional:</strong> a PLATAFORMA poderá, a seu critério e após análise, prorrogar o prazo de expiração de sessões em casos de força maior, desde que o(a) CONTRATANTE apresente documentação comprobatória, enviada pelo fluxo próprio na plataforma.
          </p>
          <p>
            <strong>7.2. Padrão de análise:</strong> a solicitação deve ser feita assim que possível e, em regra, será analisada em até 72 (setenta e duas) horas úteis. Motivos tipicamente aceitos constam do ANEXO I (lista exemplificativa).
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">8. Inadimplência, suspensão e negativação (cadastros de crédito)</h2>
          <p>
            <strong>8.1. Falha de cobrança:</strong> se a cobrança mensal não for processada (ex.: cartão recusado), a PLATAFORMA poderá suspender temporariamente o acesso a novas sessões e reprocessar a cobrança, além de notificar o(a) CONTRATANTE pelos canais oficiais.
          </p>
          <p>
            <strong>8.2. Cobranças em aberto:</strong> valores vencidos e não pagos permanecem exigíveis. Persistindo a inadimplência após tentativas de cobrança e notificação prévia, a PLATAFORMA poderá adotar medidas de cobrança e, quando cabível, realizar registro do débito em cadastros de proteção ao crédito (ex.: Serasa/Boa Vista), conforme legislação aplicável, resguardados os direitos de informação, contestação e quitação.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">9. Benefício promocional: Cupom Tinta Doce Presentes (40%)</h2>
          <p>
            <strong>9.1. Regra principal:</strong> na aquisição de qualquer um dos Planos Embarque, Viagem ou Jornada, o(a) CONTRATANTE recebe um cupom de desconto de 40% (quarenta por cento) para uso na loja parceira Tinta Doce Presentes, conforme campanha vigente exibida na home/loja e as regras deste Termo.
          </p>
          <p>
            <strong>9.2. Vinculação ao CPF e elegibilidade:</strong> o cupom é vinculado ao CPF do(a) CONTRATANTE e não pode ser transferido. A disponibilidade do cupom está condicionada à vigência do plano e à regularidade de pagamento.
          </p>
          <p>
            <strong>9.3. Condições usuais do cupom</strong> (salvo regra mais específica na home/loja): (i) uso limitado a 1 (uma) compra por CPF; (ii) não cumulativo com outras promoções/cupões; (iii) aplicável apenas a produtos elegíveis; (iv) inserção do cupom no checkout; (v) cancelamento ou suspensão do plano pode implicar perda do benefício.
          </p>
          <p>
            <strong>9.4. Relação com a loja parceira:</strong> a Tinta Doce Presentes é operação independente; questões de estoque, entrega, garantia e devolução devem ser tratadas com o suporte da loja. A PLATAFORMA pode auxiliar orientando o uso do cupom, sem assumir obrigações de fornecimento do produto.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">10. Privacidade e proteção de dados (LGPD)</h2>
          <p>
            O tratamento de dados pessoais do(a) CONTRATANTE segue a Política de Privacidade e as bases legais aplicáveis (LGPD). A PLATAFORMA poderá compartilhar dados estritamente necessários com provedores de pagamento, antifraude, comunicação e, quando aplicável, serviços de cobrança/registro em cadastros de crédito, sempre com salvaguardas contratuais e de segurança.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">11. Condutas proibidas e propriedade intelectual</h2>
          <p>
            É proibido: (i) gravar, reproduzir ou divulgar sessões em qualquer meio de comunicação, privado, público e/ou redes sociais, áudios, vídeos, chats ou materiais do atendimento sem autorização expressa; (ii) usar a plataforma para assédio, discriminação, fraude ou violação de direitos de terceiros; (iii) compartilhar login/senha com terceiros. A violação pode resultar em suspensão, cancelamento e medidas legais cabíveis.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">12. Reembolso em convênios e imposto de renda</h2>
          <p>
            A nota fiscal emitida pela ESTAÇÃO TERAPIA refere-se à intermediação do serviço, e, por isso, não é válida para dedução no Imposto de Renda, conforme as normas do sistema Receita Saúde, que exigem contratação direta entre paciente e profissional. No entanto, as sessões realizadas podem ser reembolsadas por planos de saúde, desde que atendam às exigências da sua operadora. Recomendamos consultar diretamente o seu plano para verificar as condições e cobertura. O pagamento das sessões não é assinado pelo psicólogo parceiro que realiza os atendimentos, por isso, é imprescindível a consulta dos critérios do convênio para compreensão da elegibilidade de reembolso concedido considerando o modelo commercial e fiscal adota pela Plataforma ESTAÇÃO TERAPIA.
          </p>

          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-3 text-gray-800">13. Disposições finais</h2>
          <p>
            A PLATAFORMA pode atualizar este Termo por motivos operacionais, legais ou de segurança, com divulgação no site/painel. Alterações relevantes poderão exigir novo aceite. As condições comerciais do plano vigente respeitam o ciclo já contratado, salvo ajustes necessários por lei ou por falhas materiais.
          </p>
          <p>
            Fica eleito o foro do domicílio do(a) CONTRATANTE para dirimir conflitos, quando aplicável, sem prejuízo de soluções extrajudiciais e canais de atendimento da PLATAFORMA.
          </p>

          <h3 className="text-lg md:text-xl font-semibold mt-6 mb-3 text-gray-800">ANEXO I - Motivos exemplificativos de força maior (prorrogação de expiração)</h3>
          <p className="mb-4">
            Lista exemplificativa de motivos normalmente aceitos, mediante comprovação. A avaliação é caso a caso.
          </p>
          <div className="w-full overflow-x-auto my-6 border border-gray-200 rounded-lg">
            <table className="min-w-full border-collapse text-sm" style={{ minWidth: '700px' }}>
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left">Motivo (exemplos)</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Requer comprovação?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Acidente pessoal ou doméstico que comprometa a sessão</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Acompanhamento urgente de familiar doente</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Agravamento de condição de saúde crônica</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Catástrofes naturais ou eventos climáticos extremos que comprometam a sessão</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Compromissos acadêmicos inesperados e obrigatórios</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Compromissos profissionais urgentes e inesperados</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Crise aguda de ansiedade ou pânico</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Doença súbita pessoal</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Emergência familiar ou com dependentes</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Emergência veterinária com pet (mesma coisa com o de cima)</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Falecimento de familiar de 1º grau</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Falta de conexão geral por problemas com operadora ou tempo</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Interrupção abrupta e comprovada de internet por parte do cliente (Somente antes da sessão ser iniciada)</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Internação hospitalar de si ou de dependente</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Obrigação legal ou judicial imprevista</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Pane elétrica no domicílio</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Procedimento médico emergencial</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Problemas graves com o equipamento (ex: notebook queimado)</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Roubo, furto ou violência recente</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Sim</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg md:text-xl font-semibold mt-6 mb-3 text-gray-800">ANEXO II - Quadro comercial dos Planos (resumo)</h3>
          <div className="w-full overflow-x-auto my-6 border border-gray-200 rounded-lg">
            <table className="min-w-full border-collapse text-sm" style={{ minWidth: '900px' }}>
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Plano</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Valor por sessão</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Valor mensal (4 sessões)</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Permanência mínima</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Total de sessões</th>
                  <th className="border border-gray-300 px-2 md:px-4 py-2 text-left whitespace-nowrap">Total do período mínimo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Embarque</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 179,99</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 719,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">Não</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">4</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">-</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Viagem</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 159,99</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 639,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Sim, 3 meses.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">12</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 1.919,88</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Jornada</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 149,99</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 599,96</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">Sim, 6 meses.</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2">24</td>
                  <td className="border border-gray-300 px-2 md:px-4 py-2 whitespace-nowrap">R$ 3.599,76</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg md:text-xl font-semibold mt-6 mb-3 text-gray-800">ANEXO III - Regras do Cupom Tinta Doce Presentes (40% em qualquer Plano)</h3>
          <p>
            <strong>1) Concessão:</strong> o cupom de 40% é disponibilizado ao(a) CONTRATANTE após a contratação e confirmação do pagamento do plano (Embarque, Viagem ou Jornada).
          </p>
          <p>
            <strong>2) Elegibilidade e vínculo:</strong> cupom vinculado ao CPF do(a) CONTRATANTE. Uso pessoal e intransferível.
          </p>
          <p>
            <strong>3) Validade:</strong> em regra, válido enquanto o plano estiver vigente e adimplente, salvo prazo/política diferente exibida na home da loja/campanha.
          </p>
          <p>
            <strong>4) Limites:</strong> em regra, 1 (uma) compra por CPF; não cumulativo com outras promoções; aplicável a produtos elegíveis conforme regras da loja.
          </p>
          <p>
            <strong>5) Cancelamento/suspensão:</strong> cancelamento do plano, inadimplência ou suspensão pode acarretar perda do benefício.
          </p>
          <p>
            <strong>6) Operação da loja:</strong> compra, entrega, devolução e garantia seguem as políticas da Tinta Doce Presentes.
          </p>

          
          <p className="mt-8 text-sm text-gray-500">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}