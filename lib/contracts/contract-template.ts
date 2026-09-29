/**
 * Gerenciador do Modelo Homologado de Contrato da Empresa
 * Suporta tags dinâmicas para substituição automática de dados do mentorado
 */

export interface ContractTemplateConfig {
  title: string;
  contractorName: string;
  contractorDocument: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorAddress: string;
  contractorRepresentative: string;
  clausesText: string;
  pdfReferenceUrl?: string;
  pdfReferenceName?: string;
  updatedAt?: string;
}

export interface ContractVariablesData {
  nomeMentorado?: string;
  documento?: string; // CPF ou CNPJ
  email?: string;
  telefone?: string;
  endereco?: string;
  empresaCliente?: string;
  especialidade?: string;
  programaMentoria?: string;
  valorTotal?: number | string;
  duracaoMeses?: number | string;
  formaPagamento?: string;
  dataInicio?: string;
  razaoSocialContratada?: string;
  cnpjContratada?: string;
  enderecoContratada?: string;
}

export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplateConfig = {
  title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MENTORIA EXECUTIVA & ACELERAÇÃO',
  contractorName: 'SCALEMENTORS GESTÃO & CONSULTORIA LTDA',
  contractorDocument: '48.912.345/0001-89',
  contractorEmail: 'contratos@scalementors.com.br',
  contractorPhone: '(11) 99530-2672',
  contractorAddress: 'Av. Paulista, 1000 - São Paulo/SP',
  contractorRepresentative: 'Marcio Santos - Diretor Executivo',
  clausesText: `CLÁUSULA 1ª - DO OBJETO
O presente instrumento tem por objeto a prestação de serviços de mentoria executiva, consultoria estratégica e capacitação empresarial pelo programa {{PROGRAMA_MENTORIA}}, promovido pela CONTRATADA em favor da CONTRATANTE {{NOME_MENTORADO}}, inscrita no documento sob nº {{CPF_CNPJ}}, com sede/domicílio em {{ENDERECO}}.

CLÁUSULA 2ª - DOS ENTREGÁVEIS & METODOLOGIA
A CONTRATADA fornecerá acesso integral à plataforma ScaleMentors, acompanhamento estratégico individual, encontros de alinhamento com mentor master, acesso à Scale Academy, modelos operacionais (SOPs) e ferramentas proprietárias de aceleração e escala de negócios para a empresa {{EMPRESA_CLIENTE}}.

CLÁUSULA 3ª - DO INVESTIMENTO & FORMA DE PAGAMENTO
Pela prestação dos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor total de {{VALOR_TOTAL}}, mediante {{FORMA_PAGAMENTO}}, conforme cronograma ajustado no ato da adesão.

CLÁUSULA 4ª - DA CONFIDENCIALIDADE & NÃO DIVULGAÇÃO
As partes comprometem-se reciprocamente a manter o mais absoluto sigilo e confidencialidade sobre todas as informações estratégicas, financeiras, comerciais, métodos, clientes e dados operacionais compartilhados durante as sessões e no ecossistema ScaleMentors.

CLÁUSULA 5ª - DA VIGÊNCIA & RENOVAÇÃO
O presente contrato vige pelo prazo determinado de {{DURACAO_MESES}} meses, com início em {{DATA_INICIO}}, podendo ser renovado mediante termo aditivo ou adesão a novos ciclos de aceleração.

CLÁUSULA 6ª - DA VALIDADE JURÍDICA DA ASSINATURA ELETRÔNICA
As partes reconhecem expressamente a plena validade jurídica, autenticidade e eficácia probatória deste instrumento assinado por meio eletrônico, com aposição de carimbo de data/hora, endereço IP e hash criptográfico imutável padrão SHA-256, em conformidade com a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.`,
};

export const CONTRACT_VARIABLE_TAGS = [
  { tag: '{{NOME_MENTORADO}}', label: 'Nome do Mentorado', example: 'Carlos Alberto Silva' },
  { tag: '{{CPF_CNPJ}}', label: 'CPF ou CNPJ', example: '123.456.789-00' },
  { tag: '{{EMAIL}}', label: 'E-mail do Mentorado', example: 'carlos@empresa.com.br' },
  { tag: '{{TELEFONE}}', label: 'WhatsApp / Telefone', example: '(11) 98888-7777' },
  { tag: '{{EMPRESA_CLIENTE}}', label: 'Empresa do Cliente', example: 'Silva Soluções Digitais' },
  { tag: '{{ESPECIALIDADE}}', label: 'Nicho / Especialidade', example: 'Consultoria B2B' },
  { tag: '{{ENDERECO}}', label: 'Endereço do Cliente', example: 'São Paulo/SP' },
  { tag: '{{PROGRAMA_MENTORIA}}', label: 'Nome do Programa', example: 'Mentoria ScaleMentors High-Ticket' },
  { tag: '{{VALOR_TOTAL}}', label: 'Valor Formatado', example: 'R$ 15.000,00' },
  { tag: '{{DURACAO_MESES}}', label: 'Duração em Meses', example: '6' },
  { tag: '{{FORMA_PAGAMENTO}}', label: 'Forma de Pagamento', example: 'Pix / Cartão de Crédito' },
  { tag: '{{DATA_INICIO}}', label: 'Data de Início / Assinatura', example: '28/09/2026' },
  { tag: '{{RAZAO_SOCIAL_CONTRATADA}}', label: 'Razão Social Contratada', example: 'SCALEMENTORS GESTÃO LTDA' },
  { tag: '{{CNPJ_CONTRATADA}}', label: 'CNPJ Contratada', example: '48.912.345/0001-89' },
  { tag: '{{ENDERECO_CONTRATADA}}', label: 'Endereço Contratada', example: 'Av. Paulista, 1000 - SP' },
];

/**
 * Lê o template do localStorage (com fallback para o padrão)
 */
export function getStoredContractTemplate(): ContractTemplateConfig {
  if (typeof window === 'undefined') return DEFAULT_CONTRACT_TEMPLATE;
  try {
    const saved = localStorage.getItem('rocket_club_contract_template');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONTRACT_TEMPLATE, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_CONTRACT_TEMPLATE;
}

/**
 * Salva o template no localStorage
 */
export function saveStoredContractTemplate(template: ContractTemplateConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('rocket_club_contract_template', JSON.stringify({
      ...template,
      updatedAt: new Date().toISOString(),
    }));
  } catch (e) {}
}

/**
 * Preenche as variáveis no modelo do contrato
 */
export function interpolateContractTemplate(
  templateText: string,
  data: ContractVariablesData
): string {
  if (!templateText) return '';

  const valorStr =
    typeof data.valorTotal === 'number'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valorTotal)
      : data.valorTotal || 'R$ 0,00';

  const replacements: Record<string, string> = {
    '{{NOME_MENTORADO}}': data.nomeMentorado || 'Mentorado(a)',
    '{{NOME_CLIENTE}}': data.nomeMentorado || 'Mentorado(a)',
    '{{CPF_CNPJ}}': data.documento || '000.000.000-00',
    '{{DOCUMENTO}}': data.documento || '000.000.000-00',
    '{{EMAIL}}': data.email || 'contato@cliente.com.br',
    '{{TELEFONE}}': data.telefone || '(00) 00000-0000',
    '{{ENDERECO}}': data.endereco || 'Endereço Comercial / Residencial',
    '{{EMPRESA_CLIENTE}}': data.empresaCliente || 'Empresa Própria',
    '{{ESPECIALIDADE}}': data.especialidade || 'Negócios & Estratégia',
    '{{PROGRAMA_MENTORIA}}': data.programaMentoria || 'Mentoria Rocket Scale High-Ticket',
    '{{VALOR_TOTAL}}': valorStr,
    '{{DURACAO_MESES}}': String(data.duracaoMeses || 6),
    '{{FORMA_PAGAMENTO}}': data.formaPagamento || 'Pix / Cartão de Crédito via Gateway Seguro',
    '{{DATA_INICIO}}': data.dataInicio || new Date().toLocaleDateString('pt-BR'),
    '{{RAZAO_SOCIAL_CONTRATADA}}': data.razaoSocialContratada || 'ROCKET CLUB GESTÃO & CONSULTORIA LTDA',
    '{{CNPJ_CONTRATADA}}': data.cnpjContratada || '48.912.345/0001-89',
    '{{ENDERECO_CONTRATADA}}': data.enderecoContratada || 'Av. Paulista, 1000 - São Paulo/SP',
  };

  let result = templateText;
  for (const [tag, val] of Object.entries(replacements)) {
    result = result.split(tag).join(val);
  }

  return result;
}
