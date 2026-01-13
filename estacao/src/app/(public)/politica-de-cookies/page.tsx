export default function PoliticaPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Política de Cookies
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 space-y-8">
          {/* Introdução */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Esta Política de Cookies explica como a <strong>Estação Saúde Mental</strong> utiliza cookies e tecnologias similares em nossa plataforma para proporcionar uma melhor experiência aos usuários, melhorar nossos serviços e personalizar o conteúdo.
            </p>
          </section>

          {/* Seção 1 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              1. O que são cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies são pequenos arquivos de texto armazenados em seu dispositivo (computador, tablet ou smartphone) quando você visita nosso site. Eles contêm informações sobre sua navegação e são amplamente utilizados para fazer os sites funcionarem de forma mais eficiente.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Os cookies ajudam a lembrar suas preferências, melhorar a segurança, analisar o desempenho do site e personalizar sua experiência.
            </p>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              2. Para que usamos cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizamos cookies para diversos propósitos essenciais:
            </p>
            <ul className="space-y-3 ml-4">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Garantir o funcionamento básico:</strong> Permitir que você navegue pelo site e use recursos essenciais como áreas seguras e carrinhos de compra</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Lembrar suas preferências:</strong> Manter suas configurações de idioma, região e outras personalizações</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Melhorar o desempenho:</strong> Entender como você usa o site para otimizar velocidade e funcionalidade</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Análises estatísticas:</strong> Coletar dados anônimos sobre padrões de uso e comportamento dos visitantes</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Segurança:</strong> Detectar e prevenir fraudes e atividades maliciosas</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-3">•</span>
                <span className="text-gray-700"><strong>Conteúdo personalizado:</strong> Exibir informações relevantes baseadas em seus interesses e histórico de navegação</span>
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              3. Tipos de cookies utilizados
            </h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3.1 Cookies Essenciais</h3>
                <p className="text-gray-700 leading-relaxed">
                  São necessários para o funcionamento básico do site. Sem eles, algumas funcionalidades não estarão disponíveis. Incluem cookies de autenticação, segurança e manutenção de sessão.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3.2 Cookies de Desempenho</h3>
                <p className="text-gray-700 leading-relaxed">
                  Coletam informações sobre como os visitantes usam o site, como páginas mais visitadas e mensagens de erro. Esses cookies ajudam a melhorar o desempenho e a experiência do usuário.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3.3 Cookies de Funcionalidade</h3>
                <p className="text-gray-700 leading-relaxed">
                  Permitem que o site lembre suas escolhas (como nome de usuário, idioma ou região) e forneçam recursos aprimorados e mais personalizados.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3.4 Cookies de Marketing</h3>
                <p className="text-gray-700 leading-relaxed">
                  Rastreiam sua atividade de navegação para exibir anúncios relevantes. Eles também ajudam a limitar o número de vezes que você vê um anúncio e a medir a eficácia de campanhas publicitárias.
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">3.5 Cookies de Terceiros</h3>
                <p className="text-gray-700 leading-relaxed">
                  Alguns cookies são definidos por serviços de terceiros que aparecem em nossas páginas, como Google Analytics, ferramentas de chat e integrações de redes sociais.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              4. Duração dos cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Cookies de Sessão</h3>
                <p className="text-gray-700">
                  São temporários e expiram quando você fecha o navegador. Eles permitem que o site ligue suas ações durante uma sessão de navegação.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Cookies Persistentes</h3>
                <p className="text-gray-700">
                  Permanecem em seu dispositivo por um período definido ou até que você os exclua. Eles nos ajudam a reconhecê-lo quando você retorna ao site.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 5 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              5. Gerenciamento de cookies
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Você tem controle total sobre os cookies e pode gerenciá-los de várias maneiras:
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Configurações do navegador</h3>
              <p className="text-gray-700 mb-2">
                A maioria dos navegadores permite que você controle cookies através das configurações. Você pode:
              </p>
              <ul className="space-y-1 ml-4 text-gray-700">
                <li>• Bloquear todos os cookies</li>
                <li>• Aceitar apenas cookies específicos</li>
                <li>• Excluir cookies ao fechar o navegador</li>
                <li>• Receber notificações antes de aceitar cookies</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <p className="text-gray-700">
                <strong>⚠️ Importante:</strong> Ao desabilitar cookies, algumas funcionalidades do site podem ficar indisponíveis ou não funcionar corretamente. Isso pode afetar sua capacidade de fazer login, agendar consultas ou usar recursos personalizados.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-gray-700 font-semibold">Instruções para navegadores populares:</p>
              <ul className="space-y-1 ml-4 text-gray-700">
                <li>• <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
                <li>• <a href="https://support.mozilla.org/pt-BR/kb/cookies" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
                <li>• <a href="https://support.microsoft.com/pt-br/microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
                <li>• <a href="https://support.apple.com/pt-br/guide/safari/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Safari</a></li>
              </ul>
            </div>
          </section>

          {/* Seção 6 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              6. Consentimento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ao utilizar nosso site, você concorda com o uso de cookies conforme descrito nesta política. Quando você visita o site pela primeira vez, solicitamos seu consentimento para o uso de cookies não essenciais.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Você pode retirar ou modificar seu consentimento a qualquer momento através das configurações do navegador ou entrando em contato conosco.
            </p>
          </section>

          {/* Seção 7 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              7. Privacidade e proteção de dados
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Levamos sua privacidade a sério. As informações coletadas através de cookies são tratadas de acordo com nossa{' '}
              <a href="/politica-de-privacidade" className="text-blue-600 hover:underline font-semibold">
                Política de Privacidade
              </a>{' '}
              e em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
            <p className="text-gray-700 leading-relaxed">
              Os dados coletados são utilizados apenas para as finalidades descritas nesta política e não são compartilhados com terceiros, exceto quando necessário para o funcionamento de serviços integrados ou quando exigido por lei.
            </p>
          </section>

          {/* Seção 8 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              8. Alterações nesta política
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças em nossas práticas ou por razões operacionais, legais ou regulatórias. Recomendamos que você consulte esta página regularmente para se manter informado sobre como utilizamos cookies. A data da última atualização está indicada no início deste documento.
            </p>
          </section>

          {/* Seção 9 */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              9. Contato
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-4">
                Se você tiver dúvidas sobre nossa Política de Cookies ou sobre como gerenciamos seus dados, entre em contato conosco:
              </p>
              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>E-mail:</strong>{' '}
                  <a href="mailto:privacidade@estacaosaudemental.com.br" className="text-blue-600 hover:underline">
                    privacidade@estacaosaudemental.com.br
                  </a>
                </p>
                <p>
                  <strong>Empresa:</strong> Estação Saúde Mental
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Estação Saúde Mental. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}