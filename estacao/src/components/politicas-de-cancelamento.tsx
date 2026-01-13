import React from "react";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";

const PoliticasDeCancelamento: React.FC = () => (
  <section className="font-fira-sans bg-[#FCFBF6] w-full py-6 md:py-10 text-[#2B2D42] flex justify-center">
    <div className="w-full max-w-[1440px] px-4 md:px-8 mx-auto">
      <BreadcrumbsVoltar label="Política de Cancelamento" />

      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl md:text-4xl font-bold text-[#4B5AEF] mb-6 tracking-tight mt-4">
          POLÍTICA DE AGENDAMENTO E REAGENDAMENTO DE SESSÕES (PACIENTE)
        </h1>
        <p className="text-base md:text-lg leading-relaxed mb-6 italic">
          Aplicável aos atendimentos intermediados pela Plataforma Estação Terapia
        </p>
        <p className="text-base md:text-lg leading-relaxed mb-8">
          Esta Política integra e complementa os Termos/Contrato do Paciente e as regras operacionais da Plataforma.
        </p>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">SUMÁRIO</h2>
          <ol className="list-decimal list-inside space-y-2 text-base md:text-lg">
            <li>Objetivo e escopo</li>
            <li>Definições essenciais</li>
            <li>Regras de agendamento</li>
            <li>Regras de reagendamento</li>
            <li>Prazos, pontualidade e no-show</li>
            <li>Situações técnicas e condições mínimas para a sessão</li>
            <li>Força maior: quando pode evitar cobrança</li>
            <li>Canais de suporte e registros</li>
            <li>ANEXO A — Motivos de força maior (aprovados e reprovados)</li>
            <li>ANEXO B — Documentos (exemplos) para comprovação</li>
          </ol>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">1. Objetivo e escopo</h2>
          <p className="text-base md:text-lg leading-relaxed mb-4">
            Esta Política define regras operacionais para o(a) PACIENTE/CLIENTE sobre agendamento e reagendamento de sessões intermediadas pela Plataforma Estação Terapia, incluindo prazos, efeitos sobre créditos/sessões e procedimentos de comprovação em situações excepcionais (força maior).
          </p>
          <p className="text-base md:text-lg leading-relaxed">
            As sessões são realizadas, em regra, em videossala da Plataforma, com duração de 50 (cinquenta) minutos, conforme o serviço/benefício contratado.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">2. Definições essenciais</h2>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg">
            <li><strong>Agendada:</strong> sessão confirmada no calendário com data e horário definidos.</li>
            <li><strong>Reagendada:</strong> sessão cujo horário foi alterado pelo(a) paciente/cliente (ou, excepcionalmente, pelo(a) psicólogo(a)) via Plataforma.</li>
            <li><strong>Dentro do prazo:</strong> reagendamento solicitado com antecedência mínima de 24 (vinte e quatro) horas do horário de início.</li>
            <li><strong>Fora do prazo:</strong> reagendamento solicitado com antecedência inferior a 24 (vinte e quatro) horas do horário de início.</li>
            <li><strong>No-show:</strong> ausência do(a) paciente/cliente na sala virtual após a tolerância operacional definida pela Plataforma (em regra, 10 minutos).</li>
            <li><strong>Força maior:</strong> evento imprevisível e inevitável que inviabilize o comparecimento, sujeito a comprovação e aprovação (ver Seção 7 e Anexos).</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">3. Regras de agendamento</h2>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">3.1. Como agendar</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>O(a) paciente/cliente pode agendar sessões com antecedência mínima de 1 (uma) hora em relação ao horário desejado, conforme disponibilidade do(a) psicólogo(a).</li>
            <li>O agendamento deve ser realizado dentro da Plataforma, para garantir registro, rastreabilidade e segurança operacional.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">3.2. Validade e expiração de sessões</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Sessões de planos/assinaturas e pacotes podem ter validade de até 30 (trinta) dias corridos para serem agendadas e realizadas, conforme o serviço contratado e seu ciclo.</li>
            <li>Sessões não utilizadas dentro do prazo podem expirar, conforme regras do serviço contratado.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">3.3. Recomendações de continuidade</h3>
          <p className="text-base md:text-lg leading-relaxed">
            Para favorecer continuidade do cuidado, recomenda-se manter frequência regular e, quando possível, agendar a próxima sessão para a semana seguinte.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">4. Regras de reagendamento</h2>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">4.1. Reagendamento dentro do prazo (&gt;= 24h)</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Você pode reagendar diretamente na Plataforma sem cobrança adicional.</li>
            <li>O crédito/sessão permanece disponível, respeitando a validade do plano/pacote.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">4.2. Reagendamento fora do prazo (&lt; 24h)</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Em regra, o reagendamento fora do prazo é considerado fora do período de reagendamento gratuito.</li>
            <li>Nessa hipótese, a sessão pode ser contabilizada como devida (consumida/cobrada), mesmo que não ocorra o atendimento.</li>
            <li><strong>Exceção:</strong> força maior aprovada. Se houver motivo de força maior e a documentação for aprovada, a sessão não será cobrada e o crédito será ajustado (ver Seção 7).</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">4.3. Como solicitar reagendamento por força maior (fora do prazo)</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg">
            <li>No momento do reagendamento, selecione o motivo correspondente e envie o documento comprobatório (upload), quando aplicável.</li>
            <li>A equipe da Plataforma analisará a documentação e confirmará a aprovação/indeferimento em até 72 (setenta e duas) horas úteis.</li>
            <li>Se aprovado, o status será ajustado e não haverá cobrança/consumo da sessão, conforme regras aplicáveis.</li>
            <li>Se indeferido, a sessão permanecerá registrada conforme o status original (fora do prazo).</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">5. Prazos, pontualidade e no-show</h2>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">5.1. Tolerância e atraso do(a) paciente</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Há tolerância operacional de até 10 (dez) minutos após o horário de início.</li>
            <li>Atraso superior ao limite pode levar ao encerramento/registro de no-show e à contabilização da sessão como consumida, conforme regras do plano/contrato.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">5.2. Comparecimento do(a) psicólogo(a)</h3>
          <p className="text-base md:text-lg leading-relaxed">
            Caso o(a) psicólogo(a) não compareça, a sessão não deve ser cobrada do(a) paciente/cliente e o crédito deve ser preservado, conforme os status sistêmicos e regras da Plataforma.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">6. Situações técnicas e condições mínimas para a sessão</h2>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">6.1. Responsabilidade por conexão e ambiente do(a) paciente</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>É responsabilidade do(a) paciente/cliente manter conexão de internet estável e condições técnicas adequadas para a sessão.</li>
            <li>Se a sessão ficar inviável por falha de conexão do(a) paciente/cliente, a sessão poderá ser registrada como consumida, conforme contrato e regras vigentes.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">6.2. Falhas técnicas do(a) psicólogo(a) ou indisponibilidade da Plataforma</h3>
          <p className="text-base md:text-lg leading-relaxed mb-4">
            Se a falha técnica decorrer da conexão/equipamento do(a) psicólogo(a) ou indisponibilidade da Plataforma, a sessão deve ser reagendada sem ônus ao(à) paciente/cliente, conforme registro na Plataforma.
          </p>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">6.3. Privacidade e segurança</h3>
          <p className="text-base md:text-lg leading-relaxed">
            A sessão deve ocorrer em ambiente reservado e com privacidade adequada. Situações que comprometam sigilo podem inviabilizar a continuidade do atendimento no momento.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">7. Força maior: quando pode evitar cobrança</h2>
          <p className="text-base md:text-lg leading-relaxed mb-4">
            Em situações excepcionais, eventos imprevisíveis e inevitáveis podem justificar reagendamento fora do prazo sem cobrança/consumo da sessão, desde que o motivo esteja listado como aprovado e haja documentação comprobatória, sujeita à análise e aprovação pela Plataforma.
          </p>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">7.1. Regras gerais</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Força maior exige comprovação documental e análise da Plataforma.</li>
            <li>A documentação deve ser enviada preferencialmente no ato da solicitação, pela Plataforma (upload).</li>
            <li>A aprovação ajusta o status e os efeitos financeiros do reagendamento, conforme regras do plano/contrato.</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">7.2. Internação hospitalar</h3>
          <p className="text-base md:text-lg leading-relaxed">
            Em caso de internação hospitalar, o responsável pelo contrato deve contatar o suporte para avaliar suspensão temporária do tratamento e apresentar a declaração/atestado correspondente.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">8. Canais de suporte e registros</h2>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg">
            <li>Use sempre os fluxos da Plataforma para agendar e reagendar, garantindo registro e rastreabilidade.</li>
            <li>Em caso de dúvidas, falhas ou necessidade de orientação, acione o suporte pelos canais oficiais indicados no site/painel do paciente.</li>
            <li>Para solicitações com comprovação (força maior), utilize o upload/documentos na própria Plataforma para análise.</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">ANEXO A — Motivos de força maior (aprovados e reprovados)</h2>
          <p className="text-base md:text-lg leading-relaxed mb-4">
            A lista abaixo reúne os motivos operacionais cadastrados pela Plataforma para análise de força maior. A aprovação depende de comprovação (quando aplicável) e validação interna.
          </p>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">A.1. Motivos aprovados (exigem comprovação)</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg mb-4">
            <li>Acidente pessoal ou doméstico que comprometa a sessão</li>
            <li>Acompanhamento urgente de familiar doente</li>
            <li>Agravamento de condição de saúde crônica</li>
            <li>Catástrofes naturais ou eventos climáticos extremos que comprometam a sessão</li>
            <li>Compromissos acadêmicos inesperados e obrigatórios</li>
            <li>Compromissos profissionais urgentes e inesperados</li>
            <li>Crise aguda de ansiedade ou pânico</li>
            <li>Doença súbita pessoal</li>
            <li>Emergência familiar ou com dependentes</li>
            <li>Emergência veterinária com pet</li>
            <li>Falecimento de familiar de 1º grau</li>
            <li>Falta de conexão geral por problemas com operadora ou tempo</li>
            <li>Interrupção abrupta e comprovada de internet por parte do cliente</li>
            <li>Internação hospitalar de si ou de dependente</li>
            <li>Obrigação legal ou judicial imprevista</li>
            <li>Pane elétrica no domicílio</li>
            <li>Procedimento médico emergencial</li>
            <li>Problemas graves com o equipamento</li>
            <li>Roubo, furto ou violência recente</li>
          </ul>

          <h3 className="text-xl md:text-2xl font-semibold text-[#4B5AEF] mb-3 mt-4">A.2. Motivos reprovados (não caracterizam força maior)</h3>
          <ul className="list-disc list-inside space-y-2 text-base md:text-lg">
            <li>Conflito com outro compromisso previamente marcado</li>
            <li>Fiquei preso em algum compromisso</li>
            <li>Confusão de horário com outro compromisso</li>
            <li>Fiquei preso(a) em uma reunião</li>
            <li>Instabilidade na conexão com a internet, mas sem queda total</li>
            <li>Me atrasei para a sessão</li>
            <li>Não vi o horário / perdi a hora</li>
            <li>Problemas com barulho ou ambiente ruim</li>
            <li>Problemas pessoais</li>
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4B5AEF] mb-4">ANEXO B — Documentos (exemplos) para comprovação</h2>
          <p className="text-base md:text-lg leading-relaxed mb-4">
            Os documentos abaixo são exemplos usuais de comprovação. A Plataforma pode solicitar documentos adicionais, conforme o caso, para validação.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-base md:text-lg">
              <thead>
                <tr className="bg-[#4B5AEF] text-white">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Motivo</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Documentos (exemplos)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Doença súbita / crise aguda</td>
                  <td className="border border-gray-300 px-4 py-3">Atestado médico, receita, evidência de pronto atendimento</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Procedimento médico emergencial / internação</td>
                  <td className="border border-gray-300 px-4 py-3">Atestado, comprovante de internação, registro de atendimento</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Agravamento de condição crônica</td>
                  <td className="border border-gray-300 px-4 py-3">Laudo/atestado com indicação de crise, receita recente</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Falecimento de familiar de 1º grau</td>
                  <td className="border border-gray-300 px-4 py-3">Certidão de óbito ou declaração funerária</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Compromisso acadêmico obrigatório</td>
                  <td className="border border-gray-300 px-4 py-3">Declaração/e-mail da instituição; convocação/atividade obrigatória</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Compromisso laboral urgente</td>
                  <td className="border border-gray-300 px-4 py-3">Declaração/e-mail do superior; escala/plantão</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Interrupção abrupta de internet (antes do início)</td>
                  <td className="border border-gray-300 px-4 py-3">Evidência da operadora/print; registro de indisponibilidade</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Acidente pessoal/doméstico</td>
                  <td className="border border-gray-300 px-4 py-3">Atestado/registro de atendimento; boletim de ocorrência (se aplicável)</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Convocação judicial/policial</td>
                  <td className="border border-gray-300 px-4 py-3">Intimação oficial</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Pane elétrica</td>
                  <td className="border border-gray-300 px-4 py-3">Comunicado da concessionária; protocolo de atendimento</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Roubo/furto/violência</td>
                  <td className="border border-gray-300 px-4 py-3">Boletim de ocorrência policial</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Emergência com dependente</td>
                  <td className="border border-gray-300 px-4 py-3">Atestado/declaração de serviço de saúde; documento escolar (quando aplicável)</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Catástrofes/eventos climáticos extremos</td>
                  <td className="border border-gray-300 px-4 py-3">Comunicado oficial/Defesa Civil; registro local</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Falha grave de equipamento</td>
                  <td className="border border-gray-300 px-4 py-3">Nota/ordem de serviço de assistência técnica; evidência do defeito</td>
                </tr>
                <tr className="bg-white">
                  <td className="border border-gray-300 px-4 py-3 font-medium">Emergência veterinária</td>
                  <td className="border border-gray-300 px-4 py-3">Nota/receita do veterinário</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PoliticasDeCancelamento;
