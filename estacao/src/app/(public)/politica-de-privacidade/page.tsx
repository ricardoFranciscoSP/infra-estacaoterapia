export default function PoliticaPage() {
  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}>
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">
            POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Versão: 3.0
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Última atualização: 22/12/2025
          </p>
        </div>

        {/* Tabela de Informações da Controladora */}
        <div className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Informações da Controladora</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm sm:text-base">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900 w-1/3 sm:w-1/4">Razão Social</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700">Mindfluence Psicologia Ltda</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Nome Fantasia</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700">Estação Terapia</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">CNPJ</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700">54.222.003/0001-07</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Endereço</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700">Al. Rio Negro, 503, Sala 2020, Alphaville Industrial, Barueri/SP - CEP 06454-000 - Brasil</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Website</td>
                  <td className="py-3 px-3 sm:px-4 text-blue-600"><a href="https://www.estacaoterapia.com.br" target="_blank" rel="noopener noreferrer">www.estacaoterapia.com.br</a></td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Canal de Privacidade / Encarregado (DPO)</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700"><a href="mailto:privacidade@estacaoterapia.com.br" className="text-blue-600 break-all">privacidade@estacaoterapia.com.br</a></td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Atendimento ao Cliente</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700"><a href="mailto:atendimento@estacaoterapia.com.br" className="text-blue-600 break-all">atendimento@estacaoterapia.com.br</a></td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Suporte Técnico</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700"><a href="mailto:suporte@estacaoterapia.com.br" className="text-blue-600 break-all">suporte@estacaoterapia.com.br</a></td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Contato Telefônico (WhatsApp)</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700"><a href="https://wa.me/5511960892131" target="_blank" rel="noopener noreferrer" className="text-blue-600">+55 11 96089-2131</a></td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-3 sm:px-4 font-semibold bg-gray-50 text-gray-900">Jurídico e Compliance</td>
                  <td className="py-3 px-3 sm:px-4 text-gray-700"><a href="mailto:juridico@estacaoterapia.com.br" className="text-blue-600 break-all">juridico@estacaoterapia.com.br</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Conteúdo da Política */}
        <div className="space-y-6 sm:space-y-8 text-gray-700 text-sm sm:text-base leading-relaxed">
          
          {/* Seção 1 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">1. Informações gerais</h2>
            <p className="mb-4">
              Esta Política descreve como a Estação Terapia realiza a coleta, o uso, o armazenamento, o compartilhamento e a proteção de dados pessoais relacionados ao uso do site e da plataforma Estação Terapia, por pacientes/clientes, psicólogos(as) parceiros(as) e visitantes. O documento foi redigido em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018 - LGPD) e o Marco Civil da Internet (Lei 12.965/2014). A política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais.
            </p>
            <p className="font-semibold mb-2">Para fins desta Política, considere as seguintes definições:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Estação Terapia:</strong> a plataforma digital operada pela Mindfluence Psicologia Ltda, incluindo site, painéis e funcionalidades associadas.</li>
              <li><strong>Usuário:</strong> qualquer pessoa que utilize ou visite a plataforma (paciente/cliente, psicólogo(a) parceiro(a) ou visitante).</li>
              <li><strong>Psicólogo(a):</strong> profissional de psicologia que realiza atendimentos por meio da plataforma, conforme regras de credenciamento e conformidade.</li>
              <li><strong>Paciente/Cliente:</strong> pessoa que contrata ou utiliza serviços de psicoterapia e/ou funcionalidades disponibilizadas na plataforma.</li>
              <li><strong>Dados pessoais:</strong> informações relacionadas a pessoa natural identificada ou identificável.</li>
              <li><strong>Dados pessoais sensíveis:</strong> dados sobre saúde e outros previstos no art. 5º, II, da LGPD.</li>
            </ul>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">2. Como coletamos dados pessoais</h2>
            <p className="mb-4">A Estação Terapia pode coletar dados pessoais diretamente do Usuário, automaticamente durante o uso do site/plataforma, ou por intermédio de terceiros, sempre de acordo com as finalidades descritas nesta Política.</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Cadastro e uso da conta:</strong> quando o Usuário cria, atualiza ou utiliza sua conta/perfil, agenda sessões, realiza pagamentos, envia documentos ou interage com funcionalidades.</li>
              <li><strong>Atendimento e suporte:</strong> quando o Usuário entra em contato por e-mail, WhatsApp, chat, formulários ou outros canais oficiais.</li>
              <li><strong>Dados de navegação:</strong> quando o Usuário acessa páginas, realiza buscas, visualiza conteúdos e utiliza recursos do site/plataforma; podem ser coletados registros como IP, data/hora, dispositivo e logs de eventos.</li>
              <li><strong>Login por terceiros:</strong> quando o Usuário opta por autenticação via provedores terceiros, conforme as permissões concedidas no próprio provedor.</li>
              <li><strong>Cookies e tecnologias similares:</strong> para permitir o funcionamento, medir desempenho, personalizar experiência e prevenir fraudes (ver Seção 9).</li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">3. Quais dados pessoais coletamos</h2>
            <p className="mb-4">Os tipos de dados coletados variam conforme o perfil do Usuário (paciente/cliente, psicólogo(a) ou visitante) e as funcionalidades utilizadas. Sempre que possível, aplicamos o princípio da minimização: coletar apenas o necessário para a finalidade informada.</p>
            
            <h3 className="font-bold text-lg mb-3 mt-4">3.1. Dados de identificação e contato</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Nome, data de nascimento (quando aplicável), CPF e outros identificadores necessários para cadastro e verificação.</li>
              <li>E-mail, telefone/WhatsApp, endereço (quando necessário para fins fiscais/operacionais).</li>
              <li>Credenciais de acesso (login e senha) e preferências de conta.</li>
            </ul>

            <h3 className="font-bold text-lg mb-3 mt-4">3.2. Dados profissionais (Psicólogos(as))</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>CRP (pessoa física e/ou pessoa jurídica, quando aplicável), documentos de regularidade e demais evidências exigidas para credenciamento.</li>
              <li>Dados de perfil profissional (formação, especialidades, biografia, foto, disponibilidade e agenda).</li>
              <li>Dados bancários para repasse e informações fiscais necessárias ao cumprimento de obrigações legais e contratuais.</li>
            </ul>

            <h3 className="font-bold text-lg mb-3 mt-4">3.3. Dados de transações e faturamento</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Informações sobre pagamentos e transações (ex.: status, valores, datas, método de pagamento).</li>
              <li>Dados de cartão podem ser processados por intermediadores/gateways de pagamento; a plataforma busca não armazenar dados completos de cartão, dependendo da integração utilizada.</li>
            </ul>

            <h3 className="font-bold text-lg mb-3 mt-4">3.4. Dados de navegação e dispositivos</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Endereço IP, identificadores de dispositivo, tipo e versão do navegador, sistema operacional, logs de acesso e eventos de uso.</li>
              <li>Dados relacionados à prevenção de fraude, segurança e integridade da plataforma.</li>
            </ul>

            <h3 className="font-bold text-lg mb-3 mt-4">3.5. Dados sensíveis e conteúdos relacionados à saúde</h3>
            <p>Por se tratar de uma plataforma de psicoterapia, podem existir dados relacionados à saúde e ao contexto do atendimento. Quando tais dados forem tratados no ecossistema da Estação Terapia, o tratamento ocorrerá com salvaguardas reforçadas e base legal apropriada, observando-se o sigilo profissional e as regras éticas aplicáveis. Em muitos casos, o(a) psicólogo(a) atua como controlador(a) dos dados clínicos gerados na relação terapêutica, e a Estação Terapia pode atuar como operadora, na medida necessária para viabilizar a prestação do serviço e manter registros operacionais.</p>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">4. Para quais finalidades utilizamos os dados</h2>
            <p className="mb-4">Os dados pessoais podem ser tratados, entre outras, para as seguintes finalidades:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Prestação do serviço:</strong> permitir cadastro, autenticação, agenda, realização de sessões, pagamentos, repasses e execução do contrato/termos de uso.</li>
              <li><strong>Segurança e integridade:</strong> autenticação, prevenção a fraudes, controle de acesso, auditoria, detecção e resposta a incidentes.</li>
              <li><strong>Melhoria da plataforma:</strong> entender como os recursos são usados, corrigir problemas, desenvolver funcionalidades e aprimorar a experiência do Usuário.</li>
              <li><strong>Comunicações:</strong> envio de mensagens transacionais (confirmações, avisos operacionais), suporte, orientações e comunicações relevantes.</li>
              <li><strong>Marketing e relacionamento (quando aplicável):</strong> envio de conteúdos, novidades e campanhas, respeitando preferências e bases legais pertinentes.</li>
              <li><strong>Cumprimento legal/regulatório:</strong> atendimento a obrigações legais, fiscais, contábeis, e solicitações de autoridades competentes.</li>
              <li><strong>Exercício regular de direitos:</strong> prevenção e gestão de disputas, defesa em processos administrativos/judiciais e gestão de riscos.</li>
            </ul>
            <p className="mt-4">Quando o tratamento ocorrer para finalidades não previstas nesta Política, a Estação Terapia buscará informar o Usuário previamente, mantendo aplicáveis os direitos e deveres aqui descritos.</p>
          </section>

          {/* Seção 5 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">5. Por quanto tempo os dados ficam armazenados</h2>
            <p className="mb-4">Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades deste documento, para execução do contrato e/ou para cumprimento de obrigações legais e regulatórias. Quando possível e apropriado, os dados podem ser anonimizados ou eliminados mediante solicitação do titular, exceto nas hipóteses em que a lei exigir ou autorizar a conservação.</p>
            <p>Como prática de governança e para fins de auditoria, preservação de evidências e defesa de direitos, a Estação Terapia pode manter determinados registros por até 5 (cinco) anos contados do encerramento da relação contratual ou dos Termos de Uso, sem prejuízo de prazos superiores quando exigidos por lei ou regulamento.</p>
          </section>

          {/* Seção 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">6. Segurança dos dados pessoais armazenados</h2>
            <p className="mb-4">A Estação Terapia aplica medidas técnicas e organizacionais razoáveis e proporcionais ao risco para proteger dados pessoais contra acessos não autorizados, perda, destruição, alteração, comunicação ou difusão indevida.</p>
            <p className="font-semibold mb-2">Exemplos de medidas adotadas e/ou buscadas, conforme maturidade e evolução da plataforma, incluem:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Criptografia de tráfego (TLS/HTTPS) entre o dispositivo do Usuário e os servidores/fornecedores da plataforma.</li>
              <li>Controle de acesso baseado em necessidade (princípio do menor privilégio), com gestão de credenciais e registros de auditoria.</li>
              <li>Backups e mecanismos de continuidade, com testes periódicos quando aplicável.</li>
              <li>Monitoramento e registro de eventos de segurança, com rotinas de resposta a incidentes.</li>
              <li>Gestão de vulnerabilidades (atualizações, correções e boas práticas de hardening).</li>
              <li>Regras de confidencialidade e treinamento para pessoas com acesso a dados.</li>
            </ul>
            <p>Nenhum método de transmissão ou armazenamento é 100% seguro. A Estação Terapia não se responsabiliza por eventos decorrentes de culpa exclusiva de terceiros (ex.: ataques a sistemas fora de seu controle) ou de culpa exclusiva do Usuário (ex.: compartilhamento de senha, uso de dispositivos comprometidos). Havendo incidente de segurança relevante, buscaremos avaliar a necessidade de comunicação aos titulares e à ANPD, conforme LGPD e orientações aplicáveis.</p>
          </section>

          {/* Seção 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">7. Compartilhamento de dados</h2>
            <p className="mb-4">A Estação Terapia compartilha dados pessoais apenas quando necessário para a operação do serviço, para as finalidades informadas e/ou mediante base legal apropriada.</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Dados do(a) psicólogo(a):</strong> informações de perfil profissional podem ser exibidas publicamente no site/plataforma e em mecanismos de busca, para facilitar a escolha pelo paciente/cliente.</li>
              <li><strong>Dados do paciente/cliente:</strong> são disponibilizados ao(à) psicólogo(a) responsável pelo atendimento e à plataforma, na medida necessária para viabilizar agendamento, sessão e suporte.</li>
              <li><strong>Dados financeiros sensíveis:</strong> informações bancárias e dados de pagamento são protegidos e compartilhados apenas com prestadores estritamente necessários (ex.: intermediadores de pagamento), quando aplicável.</li>
            </ul>
          </section>

          {/* Seção 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">8. Transferência a terceiros e fornecedores</h2>
            <p className="mb-4">Podemos utilizar fornecedores para viabilizar a operação da plataforma, como infraestrutura em nuvem, videoconferência, antifraude, mensageria (e-mail/SMS/WhatsApp), marketing, automatização, analytics, suporte e processadores de pagamento. Esses terceiros recebem dados na medida do necessário para executar os serviços contratados, sob obrigações de confidencialidade, segurança e conformidade com a LGPD, GPDR e padrões HIPAA.</p>
            <p className="mb-4">Alguns fornecedores podem estar localizados no exterior ou possuir infraestrutura fora do Brasil. Nessas hipóteses, poderá ocorrer transferência internacional de dados, com adoção de salvaguardas contratuais e técnicas compatíveis, conforme aplicável. Ao utilizar a plataforma, o Usuário reconhece essa possibilidade nos limites desta Política.</p>
            <p>Quando o Usuário for redirecionado para sites/aplicativos de terceiros, a relação passará a ser regida pelas políticas desses terceiros. Recomendamos a leitura dessas políticas.</p>
          </section>

          {/* Seção 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">9. Cookies e dados de navegação</h2>
            <p className="mb-4">Cookies são pequenos arquivos de texto armazenados no dispositivo do Usuário, que permitem reconhecer preferências e melhorar a experiência de navegação. Podemos utilizar cookies de sessão (expiram ao fechar o navegador) e cookies persistentes (permanecem até serem excluídos ou expirarem).</p>
            <p>O Usuário pode configurar o navegador para recusar ou remover cookies. Entretanto, a desativação pode afetar funcionalidades essenciais da plataforma.</p>
          </section>

          {/* Seção 10 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">10. Direitos do titular e consentimento</h2>
            <p className="mb-4">Ao utilizar os serviços e fornecer dados pessoais, o Usuário declara estar ciente desta Política. Quando o tratamento depender de consentimento, o Usuário poderá revogá-lo a qualquer tempo, sem afetar a legalidade do tratamento realizado anteriormente.</p>
            <p className="mb-4">Nos termos da LGPD, o titular pode solicitar, entre outros: confirmação da existência de tratamento; acesso; correção; anonimização, bloqueio ou eliminação; portabilidade; informações sobre compartilhamentos; e revisão de decisões automatizadas, quando aplicável.</p>
            <p>Para exercer direitos, o Usuário deve contatar o canal de privacidade/Encarregado (DPO): <a href="mailto:privacidade@estacaoterapia.com.br" className="text-blue-600">privacidade@estacaoterapia.com.br</a> ou via ferramenta de abertura de solicitações ou por correspondência ao endereço da Controladora indicado na capa. Poderemos solicitar informações adicionais para confirmar a identidade do solicitante e prevenir fraudes.</p>
          </section>

          {/* Seção 11 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">11. Alterações desta Política</h2>
            <p className="mb-4">A Estação Terapia pode modificar esta Política a qualquer momento para refletir mudanças legais, técnicas ou operacionais. Recomendamos revisão periódica. Alterações relevantes poderão ser comunicadas por avisos no site/plataforma e/ou por e-mail, quando aplicável. O uso contínuo dos serviços após a publicação de alterações indica ciência e concordância com a versão atualizada.</p>
            <p>Em caso de reorganização societária (ex.: fusão, aquisição ou venda de ativos), dados pessoais poderão ser transferidos para os novos controladores, respeitados os limites da LGPD e desta Política.</p>
          </section>

          {/* Seção 12 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">12. Jurisdição e legislação aplicável</h2>
            <p>Esta Política é regida pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca onde se encontra a sede da Controladora (Barueri/SP) para dirimir eventuais controvérsias, salvo disposição legal em sentido diverso.</p>
          </section>

          {/* Seção 13 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">13. Governança, LGPD e Sigilo Profissional (Complemento)</h2>
            <p className="mb-4">Este complemento integra esta Política e descreve, de forma mais detalhada, práticas de governança e segurança relacionadas ao tratamento de dados pessoais no ecossistema da Estação Terapia, incluindo cuidados adicionais aplicáveis a psicólogos(as) parceiros(as) independentes e fornecedores (operadores e suboperadores) que apoiam a operação da plataforma.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.1. Compromisso com a LGPD e normas aplicáveis</h3>
            <p className="mb-4">A Estação Terapia (Mindfluence Psicologia Ltda) declara cumprir a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD), bem como demais normas aplicáveis de proteção de dados, sigilo profissional e ética em Psicologia. Do mesmo modo, a Estação Terapia estabelece requisitos contratuais de privacidade e segurança a seus psicólogos(as) parceiros(as) e fornecedores, na medida aplicável às respectivas atividades e responsabilidades, sem que isso configure vínculo empregatício, subordinação ou controle de jornada.</p>
            <p>Para fins deste complemento, aplicam-se as definições da LGPD, incluindo: (i) dados pessoais; (ii) dados pessoais sensíveis (como dados de saúde); (iii) controlador; (iv) operador; e (v) encarregado (Data Protection Officer - DPO).</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.2. Papéis de controladora, operadora e encarregado (DPO)</h3>
            <p className="mb-4">No contexto da plataforma:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>a)</strong> A Estação Terapia atua, em regra, como CONTROLADORA de dados pessoais cadastrais e operacionais de usuários (pacientes/clientes, psicólogos(as) parceiros(as) e visitantes), tais como nome, dados de contato, dados de acesso, logs de uso, registros de agendamento, pagamentos, repasses e histórico de utilização da plataforma, definindo finalidades e meios de tratamento para viabilizar a prestação do serviço e a operação do marketplace.</li>
              <li><strong>b)</strong> O(a) psicólogo(a) parceiro(a) (pessoa física ou pessoa jurídica) atua, em regra, como CONTROLADOR(A) autônomo(a) dos dados clínicos do paciente/cliente produzidos na relação terapêutica (por exemplo, prontuários, anotações técnicas e demais informações de saúde), sendo responsável por finalidades, adequação, necessidade, qualidade, exatidão, guarda, confidencialidade e sigilo desses dados, conforme LGPD e Código de Ética Profissional do Psicólogo.</li>
              <li><strong>c)</strong> Na medida em que dados clínicos transitem pela infraestrutura tecnológica viabilizada pela plataforma (por exemplo, videoconferência, troca de mensagens e/ou armazenamento em nuvem associado às funcionalidades), a Estação Terapia poderá atuar como OPERADORA desses dados em relação ao(à) psicólogo(a) parceiro(a), seguindo instruções lícitas e adotando medidas de segurança compatíveis com o risco envolvido.</li>
              <li><strong>d)</strong> A Estação Terapia designa formalmente Encarregado(a) pelo Tratamento de Dados Pessoais (DPO), com canal de contato informado na capa desta Política, atuando como ponto de contato com titulares, com a Autoridade Nacional de Proteção de Dados (ANPD) e com parceiros/fornecedores em temas de privacidade.</li>
            </ul>

            <h3 className="font-bold text-lg mb-3 mt-4">13.3. Bases legais</h3>
            <p className="mb-4">As operações de tratamento de dados pessoais observam, quando aplicável, as bases legais previstas na LGPD, em especial: (i) execução de contrato e procedimentos preliminares (art. 7º, V); (ii) cumprimento de obrigação legal ou regulatória (art. 7º, II); (iii) exercício regular de direitos (art. 7º, VI); (iv) proteção da vida ou da incolumidade física (art. 7º, VII). Em relação a dados sensíveis de saúde, podem ser aplicáveis as hipóteses legais pertinentes (por exemplo, tutela da saúde, conforme art. 11, II, &apos;f&apos;, e demais hipóteses previstas em lei). Quando o tratamento se fundar em consentimento, ele será livre, informado e inequívoco, podendo ser revogado a qualquer tempo, nos termos desta Política.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.4. Medidas de segurança e privacidade (padrões e fornecedores)</h3>
            <p className="mb-4">A Estação Terapia compromete-se a adotar medidas técnicas e administrativas de segurança aptas a proteger dados pessoais contra acessos não autorizados, situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão, em conformidade com a LGPD e com padrões reconhecidos de segurança da informação.</p>
            <p className="mb-4">As sessões de psicoterapia por videoconferência realizadas por meio da plataforma utilizam infraestrutura tecnológica de terceiros especializados e/ou componentes de nuvem, que podem adotar mecanismos de proteção como: criptografia forte (por exemplo, AES 128/256 em trânsito, conforme tecnologia do fornecedor), controles de identidade e acesso, certificações ISO/IEC 27001, 27017, 27018 e 27701, relatórios SOC 2 e programas de conformidade com GDPR (Regulamento Geral de Proteção de Dados da União Europeia) e HIPAA (padrões aplicáveis à privacidade e segurança em contexto de saúde). Esses padrões contribuem para que a plataforma atenda também brasileiros residentes no exterior.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.5. Atualização/substituição de fornecedores</h3>
            <p className="mb-4">A Estação Terapia poderá, a qualquer tempo, substituir ou atualizar fornecedores de tecnologia (incluindo videoconferência, nuvem, meios de pagamento e e-mail transacional), desde que mantenha, no mínimo, nível de segurança e conformidade equivalente ao descrito neste complemento e nas demais seções desta Política.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.6. Transferência internacional de dados</h3>
            <p className="mb-4">A plataforma pode atender usuários localizados no Brasil e brasileiros residentes no exterior. Quando houver transferência internacional de dados, a Estação Terapia adotará salvaguardas técnicas e contratuais adequadas, em linha com a LGPD e com boas práticas de segurança, incluindo cláusulas contratuais apropriadas e outros mecanismos de proteção quando houver tratamento ou armazenamento em infraestrutura fora do território nacional.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.7. Compartilhamento com operadores/suboperadores (fornecedores)</h3>
            <p className="mb-4">Dados pessoais poderão ser compartilhados, estritamente na medida necessária e com base legal apropriada, com terceiros que atuem como fornecedores, operadores ou suboperadores, tais como: (a) provedores de infraestrutura em nuvem; (b) provedores de videoconferência (certificados pelos mais altos padrões de segurança digital internacionais de acordo com normas como GPDR e padrões HIPAA; (c) gateways e intermediadores de pagamento; (d) plataformas de envio de e-mails e mensagens transacionais; (e) prestadores de serviços de contabilidade, auditoria, antifraude e consultoria jurídica; e (f) parceiros tecnológicos vinculados à operação da plataforma. Em todos esses casos, a Estação Terapia busca exigir compromisso contratual de tratar dados exclusivamente para as finalidades contratadas, sob confidencialidade, com observância da LGPD, desta Política e de padrões adequados de cibersegurança.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.8. Deveres específicos de psicólogos(as) parceiros(as) (sem vínculo trabalhista)</h3>
            <p className="mb-4">Para proteção dos titulares e integridade do ecossistema, a Estação Terapia pode estabelecer requisitos de privacidade e segurança a psicólogos(as) parceiros(as) independentes (PF ou PJ), incluindo boas práticas de sigilo, guarda de prontuários, uso de dispositivos protegidos e adoção de canais seguros. É vedado ao(à) psicólogo(a) parceiro(a) compartilhar, ceder ou exportar base de dados de pacientes/clientes obtida por meio da plataforma para terceiros ou sistemas externos, salvo hipóteses legais, consentimento específico e informado do titular, ou outras hipóteses expressamente autorizadas pelos instrumentos aplicáveis. Tais requisitos são de conformidade e segurança do marketplace e não configuram subordinação, controle de jornada ou vínculo de emprego.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.9. Incidentes de segurança</h3>
            <p className="mb-4">Na hipótese de acesso ou uso desautorizado, incidente de segurança, vazamento ou qualquer violação de dados pessoais relacionada ao ecossistema da plataforma, a Estação Terapia manterá rotinas de avaliação e mitigação e, quando aplicável, buscará cooperar com operadores/suboperadores e psicólogos(as) parceiros(as) para apuração, contenção e avaliação da necessidade de comunicação à ANPD e aos titulares afetados, nos termos da LGPD e orientações aplicáveis.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.10. Atendimento a direitos do titular por tipo de dado</h3>
            <p className="mb-4">Em regra, o(a) psicólogo(a) parceiro(a), como controlador(a) dos dados clínicos, é o principal responsável por atender solicitações do paciente/cliente relacionadas a prontuário e registros clínicos (acesso, retificação, eliminação, portabilidade, quando aplicável), observados sigilo profissional e deveres éticos. A Estação Terapia, por sua vez, atende solicitações relativas a dados cadastrais e operacionais sob sua posição de controladora, e pode prestar apoio técnico razoável ao(à) psicólogo(a) para localização e extração de informações que estejam sob sua guarda como operadora.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.11. Confidencialidade e sigilo profissional</h3>
            <p className="mb-4">A Estação Terapia adota e exige, na medida aplicável, obrigações de confidencialidade e sigilo (inclusive por instrumentos contratuais como termos de confidencialidade - NDA) para proteger informações técnicas, comerciais, operacionais e dados pessoais tratados em seu ecossistema. Quando aplicável, distinguem-se: (i) Informações Clínicas Sigilosas (prontuários e registros decorrentes do serviço psicológico) e (ii) Informações Operacionais (metadados e logs de uso da plataforma, como datas/horários de agendamentos, status de comparecimento e registros de acesso). Análises automatizadas para prevenção a fraude, segurança, controle de acesso ou qualidade restringem-se a dados operacionais e não alcançam, como regra, conteúdo de prontuário.</p>
            <p className="mb-4">A Estação Terapia não acessa o conteúdo de prontuários e anotações técnicas do(a) psicólogo(a), salvo quando estritamente necessário para suporte técnico, cumprimento legal/ordens de autoridades competentes ou proteção do ecossistema, sempre com minimização, registro e salvaguardas compatíveis. Havendo ordem ou requisição de autoridade, a divulgação limitar-se-á ao mínimo necessário e observará, cumulativamente, a LGPD, o sigilo profissional e as normas éticas aplicáveis.</p>

            <h3 className="font-bold text-lg mb-3 mt-4">13.12. Retenção e descarte seguro</h3>
            <p>Em caso de término da relação com fornecedores ou descontinuidade de acesso do(a) psicólogo(a) parceiro(a) à plataforma, a Estação Terapia poderá exigir, nos instrumentos aplicáveis, devolução e/ou destruição segura de informações confidenciais de sua titularidade que estejam sob guarda do fornecedor/parceiro, excetuados registros que devam ser mantidos por obrigação legal (como prontuários sob responsabilidade do(a) psicólogo(a)). As obrigações de confidencialidade relacionadas a dados pessoais e dados clínicos sujeitos a sigilo profissional vigoram enquanto persistirem os deveres legais/éticos e, quanto a informações técnicas/comerciais, por prazo mínimo compatível com a finalidade e com exigências legais.</p>
          </section>

          {/* Rodapé */}
          <div className="mt-12 pt-8 border-t border-gray-300">
            <p className="text-xs sm:text-sm text-gray-600 text-center">
              Para dúvidas ou solicitações sobre privacidade, entre em contato através do email <a href="mailto:privacidade@estacaoterapia.com.br" className="text-blue-600">privacidade@estacaoterapia.com.br</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}