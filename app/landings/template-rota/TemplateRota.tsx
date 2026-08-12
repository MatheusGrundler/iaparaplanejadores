"use client";

import { FormEvent, useState } from "react";
import styles from "./template-rota.module.css";

const routes = [
  ["Fluxo e reservas", "Priorizar escolhas", "Mais previsibilidade", "Ordem antes de expansão.", "Conecte compromissos atuais, reservas e objetivos antes de ampliar decisões."],
  ["Renda e objetivos", "Ajustar o fluxo", "Mais liberdade", "Metas precisam caber no presente.", "Transforme objetivos concorrentes em uma sequência possível."],
  ["Riscos mapeados", "Definir proteções", "Patrimônio preparado", "Proteção começa por dependências reais.", "Reconheça responsabilidades e organize respostas adequadas ao contexto."],
  ["Carteira no contexto", "Rever critérios", "Objetivos financiados", "Produto vem depois do papel no plano.", "Avalie investimentos por prazo, objetivo, liquidez e risco."],
];

const diagnostics = [
  ["Fluxo financeiro", "Quais compromissos disputam o mesmo recurso? Quanto precisa permanecer disponível?", "O processo pode organizar prioridades, reservas, prazos e revisões."],
  ["Aposentadoria", "Qual futuro está sendo financiado e quais premissas precisam ser revistas?", "Cenários ajudam a registrar hipóteses sem prometer resultados."],
  ["Família e proteção", "Quem depende do plano e quais riscos poderiam interrompê-lo?", "O escopo pode conectar proteção, responsabilidades e continuidade."],
  ["Empresa e patrimônio", "Onde vida pessoal e empresa compartilham riscos ou decisões?", "Critérios e coordenação tornam essas dependências visíveis."],
];

const profiles = [
  ["Organizando o presente", "Primeiro, criar margem e prioridade.", "Fluxo, reservas e objetivos deixam de disputar atenção sem uma ordem comum."],
  ["Grande decisão", "Antes de escolher, organizar impactos.", "Compra, mudança profissional, venda de empresa ou transição familiar pedem cenário e critério."],
  ["Patrimônio complexo", "Mais partes exigem melhor coordenação.", "Documentos, profissionais e responsabilidades passam a fazer parte do mesmo plano."],
  ["Família e futuro", "Preparar continuidade sem alarmismo.", "Proteção, aposentadoria e sucessão são tratadas com tempo e contexto."],
];

const serviceRows = [
  ["Fluxo e reservas", "Como o presente sustenta as escolhas?", "Organização financeira", "Revisões de prioridades"],
  ["Renda e objetivos", "O que precisa ser financiado primeiro?", "Plano de objetivos", "Marcos e ajustes"],
  ["Proteção e família", "O que não pode ficar sem resposta?", "Mapeamento de riscos", "Mudanças de contexto"],
  ["Patrimônio e empresa", "Quais decisões têm dependências comuns?", "Coordenação estratégica", "Revisões integradas"],
];

export default function TemplateRota() {
  const [route, setRoute] = useState(0);
  const [diagnostic, setDiagnostic] = useState(0);
  const [profile, setProfile] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.header}>
        <a className={styles.brand} href="#inicio"><span>ROTA</span><i>•</i><small>PLANEJAMENTO</small></a>
        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="#funciona">Como funciona</a><a href="#rotas">Rotas de atuação</a><a href="#para-quem">Para quem</a><a href="#escritorio">Escritório</a><a href="#faq">Dúvidas</a>
        </nav>
        <a className={styles.headerAction} href="#diagnostico">Traçar minha rota</a>
        <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>Menu <span>+</span></button>
        {menuOpen && <nav className={styles.mobileNav}><a onClick={() => setMenuOpen(false)} href="#funciona">Como funciona</a><a onClick={() => setMenuOpen(false)} href="#rotas">Rotas de atuação</a><a onClick={() => setMenuOpen(false)} href="#para-quem">Para quem</a><a onClick={() => setMenuOpen(false)} href="#escritorio">Escritório</a><a onClick={() => setMenuOpen(false)} href="#faq">Dúvidas</a><a onClick={() => setMenuOpen(false)} href="#diagnostico">Traçar minha rota</a></nav>}
      </header>

      <main id="conteudo">
        <section className={styles.hero} id="inicio">
          <div className={styles.shell + " " + styles.heroCopy}>
            <p className={styles.kicker}>Planejamento que acompanha decisões reais</p>
            <h1>Seu plano,<br /><em>em movimento.</em></h1>
            <p className={styles.lead}>Organize o agora, escolha o próximo passo e construa um horizonte mais previsível para suas decisões financeiras.</p>
            <div className={styles.actions}><a className={styles.primaryButton} href="#diagnostico">Traçar minha rota <span>↗</span></a><a className={styles.textLink} href="#funciona">Entender como funciona <span>↓</span></a></div>
          </div>
          <div className={styles.shell}>
            <div className={styles.routeBoard}>
              <header><span>SINAL / DECISÃO / HORIZONTE</span><b><i /> ACOMPANHAMENTO ATIVO</b></header>
              <div className={styles.columnLabels}><span>Agora</span><span>Próxima decisão</span><span>Horizonte</span></div>
              <div className={styles.routeTabs} role="tablist" aria-label="Cenários de decisão">
                {routes.map((item, index) => <button key={item[0]} onClick={() => setRoute(index)} aria-selected={route === index}><span>{item[0]}</span><span>{item[1]}</span><span>{item[2]}</span></button>)}
              </div>
              <div className={styles.routeDetail}><span>0{route + 1} / 04</span><strong>{routes[route][3]}</strong><p>{routes[route][4]}</p><div className={styles.routeLine}><i /><i /><i /></div></div>
            </div>
          </div>
        </section>

        <div className={styles.trust}><div className={styles.shell}><span>Atendimento online para todo o Brasil</span><span>Confidencialidade</span><span>[CERTIFICAÇÃO REAL]</span><span>Acompanhamento periódico</span><span>Portal opcional</span></div></div>

        <section className={styles.light + " " + styles.section} id="funciona"><div className={styles.shell}>
          <div className={styles.heading}><span>O PROCESSO</span><h2>Cada decisão ocupa<br />o seu lugar.</h2><p>Você entende o que precisa fornecer, o que recebe e qual é o próximo movimento.</p></div>
          <div className={styles.journey}>{["Diagnóstico", "Prioridades", "Plano", "Implementação", "Acompanhamento"].map((step, i) => <div key={step}><b>0{i + 1}</b><span>{step}</span></div>)}</div>
          <div className={styles.journeyDetails}><article><span>Você compartilha</span><p>Contexto, documentos necessários e decisões que estão próximas.</p></article><article><span>O processo organiza</span><p>Perguntas, critérios, responsáveis e dependências.</p></article><article><span>Você recebe</span><p>Um plano compreensível, próximos passos e pontos de revisão.</p></article></div>
        </div></section>

        <section className={styles.diagnostic + " " + styles.section}><div className={styles.shell + " " + styles.twoColumn}><div><span className={styles.invertedLabel}>PRIMEIRO SINAL</span><h2>O que hoje está<br />fora de rota?</h2><p>Selecione um tema para reconhecer as perguntas certas. Esta interação não realiza análise financeira e não coleta dados.</p></div><div><div className={styles.pills} role="tablist">{diagnostics.map((item, index) => <button key={item[0]} onClick={() => setDiagnostic(index)} aria-selected={diagnostic === index}>{item[0]}</button>)}</div><div className={styles.diagPanel}><span>PERGUNTAS DE REFLEXÃO</span><h3>{diagnostics[diagnostic][1]}</h3><p>{diagnostics[diagnostic][2]}</p></div></div></div></section>

        <section className={styles.light + " " + styles.section} id="rotas"><div className={styles.shell}><div className={styles.heading}><span>MAPA DE ATUAÇÃO</span><h2>Rotas de atuação.</h2><p>Uma matriz direta para conectar situação, pergunta e acompanhamento.</p></div><div className={styles.matrix}><div className={styles.matrixHead}><span>Situação</span><span>Pergunta central</span><span>Frente</span><span>Acompanhamento</span></div>{serviceRows.map((row) => <div className={styles.matrixRow} key={row[0]}>{row.map((item) => <span key={item}>{item}</span>)}</div>)}</div></div></section>

        <section className={styles.continuity + " " + styles.section}><div className={styles.shell + " " + styles.continuityGrid}><h2>O plano não termina<br />na entrega.</h2><div><p>Mudanças de vida pedem revisão. O acompanhamento evita que decisões antigas continuem valendo por inércia.</p><ul><li>Mudança de renda ou profissão</li><li>Nascimento, casamento ou separação</li><li>Compra ou venda de imóvel</li><li>Abertura ou venda de empresa</li><li>Aposentadoria, herança ou mudança de país</li></ul></div><aside><span>GATILHO DE REVISÃO</span><strong>A vida mudou.</strong><p>O plano volta à mesa com contexto atualizado, critérios registrados e uma nova ordem de ações.</p></aside></div></section>

        <section className={styles.light + " " + styles.section}><div className={styles.shell + " " + styles.portal}><div><span>PORTAL DO CLIENTE</span><h2>Um plano vivo,<br />acompanhado no mesmo lugar.</h2><p>Quando houver um portal real, mostre decisões, responsáveis, documentos e revisões sem expor valores patrimoniais.</p><a className={styles.textLink} href="#diagnostico">Acessar portal do cliente <span>↗</span></a></div><div className={styles.portalScreen}><header><span>ROTA ATUAL</span><b>DEMONSTRAÇÃO</b></header><div className={styles.mapLines}><i /><i /><i /><i /></div><dl><div><dt>Agora</dt><dd>[DECISÃO]</dd></div><div><dt>Responsável</dt><dd>[NOME]</dd></div><div><dt>Revisão</dt><dd>[DATA]</dd></div></dl><small>Substitua esta composição por telas reais do portal.</small></div></div></section>

        <section className={styles.profiles + " " + styles.section} id="para-quem"><div className={styles.shell}><div className={styles.heading}><span>MOMENTOS DE PLANEJAMENTO</span><h2>Em qual momento<br />você está?</h2></div><div className={styles.profileGrid}>{profiles.map((item, index) => <button className={profile === index ? styles.activeProfile : ""} onClick={() => setProfile(index)} key={item[0]}><span>0{index + 1}</span><strong>{item[0]}</strong><i>↗</i></button>)}</div><div className={styles.profileDetail}><span>MOMENTO SELECIONADO</span><h3>{profiles[profile][1]}</h3><p>{profiles[profile][2]}</p></div></div></section>

        <section className={styles.about + " " + styles.section} id="escritorio"><div className={styles.shell + " " + styles.aboutGrid}><div className={styles.photoPlaceholder}><span>FOTOGRAFIA AUTORIZADA</span><b>→</b></div><div><span>QUEM ACOMPANHA A ROTA</span><h2>Conheça o escritório<br />e a equipe.</h2><h3>[NOME DO PLANEJADOR]</h3><p className={styles.role}>[TÍTULO PROFISSIONAL]</p><p>[BIOGRAFIA REAL]</p><p>Nosso acompanhamento coloca cada decisão na sequência certa.</p><div className={styles.credentials}><span>[CERTIFICAÇÃO REAL]</span><span>[MODELO DE REMUNERAÇÃO REAL]</span><span>[FORMA DE ATENDIMENTO]</span></div></div></div></section>

        <section className={styles.light + " " + styles.section} id="faq"><div className={styles.shell + " " + styles.faq}><div><span>DÚVIDAS FREQUENTES</span><h2>Antes de iniciar<br />a rota.</h2><p>Respostas diretas reduzem objeções sem pressionar a decisão.</p></div><div><details open><summary>O diagnóstico já é uma recomendação financeira?<b>+</b></summary><p>Não. Ele organiza contexto e perguntas; recomendações dependem do escopo contratado e de informações validadas.</p></details><details><summary>Preciso ter todos os documentos para começar?<b>+</b></summary><p>Não. O primeiro contato identifica o que é necessário e ajuda a organizar a sequência.</p></details><details><summary>Como funciona o acompanhamento?<b>+</b></summary><p>As revisões são definidas conforme o escopo e os gatilhos relevantes da sua vida.</p></details></div></div></section>

        <section className={styles.contact + " " + styles.section} id="diagnostico"><div className={styles.shell + " " + styles.contactGrid}><div><span>PRÓXIMO MOVIMENTO</span><h2>Inicie o<br />diagnóstico.</h2><p>Informe apenas contato e o tema geral. O formulário não deve receber dados financeiros sensíveis.</p><p>Prazo de retorno: <b>[PRAZO REAL DE RETORNO]</b></p></div><form onSubmit={handleSubmit}><label>Nome<input required minLength={2} name="name" autoComplete="name" /></label><label>E-mail<input required type="email" name="email" autoComplete="email" /></label><label>WhatsApp<input required type="tel" name="phone" autoComplete="tel" /></label><label>Decisão mais próxima<select required defaultValue=""><option value="" disabled>Selecione</option><option>Organizar o presente</option><option>Preparar uma grande decisão</option><option>Conectar empresa e vida pessoal</option><option>Estruturar o futuro da família</option></select></label><label>Prazo aproximado<select required defaultValue=""><option value="" disabled>Selecione</option><option>Até 3 meses</option><option>Entre 3 e 12 meses</option><option>Mais de 12 meses</option><option>Ainda não sei</option></select></label><label>Preferência de contato<select required defaultValue=""><option value="" disabled>Selecione</option><option>E-mail</option><option>WhatsApp</option><option>Ligação</option></select></label><label className={styles.consent}><input required type="checkbox" /> Concordo com o tratamento dos dados conforme a política de privacidade.</label><button className={styles.primaryButton} type="submit">Traçar minha rota <span>↗</span></button>{sent && <p className={styles.sent}>Recebemos seu contato. Em breve retornaremos.</p>}</form></div></section>
      </main>
      <footer className={styles.footer}><div className={styles.shell}><a className={styles.brand} href="#inicio"><span>ROTA</span><i>•</i><small>PLANEJAMENTO</small></a><p>Planejamento para colocar decisões em sequência, com critérios e acompanhamento.</p><address>[CIDADE/UF]<br />Atendimento online para todo o Brasil<br />[E-MAIL] · [TELEFONE]</address><div className={styles.footerLegal}><span>[RAZÃO SOCIAL] · [CNPJ OU IDENTIFICAÇÃO]</span><span>[AVISO LEGAL VALIDADO PARA O SERVIÇO OFERECIDO]</span></div></div></footer>
    </div>
  );
}
