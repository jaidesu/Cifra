<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php if (isset($publicBase)): ?><base href="public/"><?php endif; ?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#070707">
<title>Cifra · Finanças pessoais</title>
<link rel="icon" href="assets/marca/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="assets/marca/favicon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="assets/marca/cifra-180.png" sizes="180x180">
<link rel="manifest" href="cifra.webmanifest">
<link rel="stylesheet" href="assets/finance.css">
<link rel="stylesheet" href="assets/session.css">
<script defer src="assets/chart.umd.js"></script>
<script defer src="assets/icons.js"></script>
<script defer src="assets/finance.js"></script>
<script defer src="assets/backup.js"></script>
<script defer src="assets/account.js"></script>
</head>
<body>
<section class="login" id="loginPane" aria-label="Acesso ao Cifra">
  <div class="login-card">
    <img class="wordmark" src="assets/marca/cifra-escuro.svg" width="144" height="52" alt="Cifra">
    <h1 id="accessTitle">Acesse sua conta</h1>
    <form id="loginForm" hidden>
      <div id="nameGroup" hidden><label for="ownerName">Seu nome</label><input id="ownerName" maxlength="30" autocomplete="name"></div>
      <label for="email">E-mail</label><input id="email" type="email" autocomplete="username" required maxlength="190">
      <label for="password">Senha</label><input id="password" type="password" autocomplete="current-password" required>
      <label class="remember"><input type="checkbox" id="remember" checked> Manter conectado neste aparelho</label>
      <button class="btn" id="enter">Entrar</button>
    </form>
    <form id="unlockForm" data-mode="pin" hidden>
      <p class="sub">Digite seu PIN para abrir o Cifra.</p>
      <label for="unlockSecret" id="unlockLabel">PIN</label>
      <input id="unlockSecret" class="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="72" required>
      <button class="btn" id="unlockButton"><span data-i="lock"></span>Desbloquear</button>
      <div class="unlock-links">
        <button class="link" type="button" id="unlockMode">Usar a senha da conta</button>
        <button class="link" type="button" onclick="sair()">Sair da conta</button>
      </div>
    </form>
    <p id="loginStatus" role="status">Verificando sua sessão…</p>
    <div class="access-switch" id="accessSwitchBox">
      <span id="accessSwitchMessage"></span>
      <button type="button" class="link" id="accessSwitch"></button>
    </div>
    <button type="button" id="retry" class="btn sec" hidden onclick="location.reload()">Tentar novamente</button>
  </div>
</section>
<noscript>Ative o JavaScript para acessar o Cifra.</noscript>
<div id="workspace" hidden>
<div class="app" id="app">
  <aside class="lado" id="sideMenu">
    <div class="logo"><img id="marcaLateral" src="assets/marca/cifra-escuro.svg" width="108" height="39" alt="Cifra"></div>
    <button class="perfil" onclick="abrir('ajustes')" title="Abrir perfil e ajustes">
      <span class="av" id="sAv"></span>
      <span class="pf"><b id="sNome"></b><small>Perfil e ajustes</small></span>
    </button>
    <nav class="menu" aria-label="Seções">
      <button class="nv ativa" data-pg="painel" onclick="abrir('painel')"><span class="ic" data-i="layout-dashboard"></span>Painel</button>
      <button class="nv" data-pg="lanc" onclick="abrir('lanc')"><span class="ic" data-i="receipt-text"></span>Lançamentos</button>
      <button class="nv" data-pg="graficos" onclick="abrir('graficos')"><span class="ic" data-i="chart-line"></span>Gráficos e números</button>
      <button class="nv" data-pg="orc" onclick="abrir('orc')"><span class="ic" data-i="target"></span>Orçamentos</button>
      <button class="nv" data-pg="ajustes" onclick="abrir('ajustes')"><span class="ic" data-i="settings"></span>Ajustes</button>
    </nav>
    <div class="ladoBase">
      <button class="btn" onclick="abrirForm()"><span data-i="plus"></span>Lançar</button>
      <small>Seus dados ficam salvos na sua conta.</small>
    </div>
  </aside>

  <main><div class="conteudo">
    <header class="topo">
      <button type="button" class="icb" id="menuToggle" aria-controls="sideMenu bottomMenu" aria-expanded="true" aria-label="Recolher menu" title="Recolher menu"></button>
      <img class="marca-compacta" src="assets/marca/favicon.svg" width="32" height="32" alt="Cifra">
      <div class="titulo"><div class="oi" id="oi"></div><h1 id="tituloPg">Painel</h1></div>
      <div class="dir">
        <button class="btn lancar" onclick="abrirForm()"><span data-i="plus"></span>Lançar</button>
        <button class="icb" id="btSino" onclick="alternarNotif(event)" aria-label="Notificações" title="Notificações"><span data-i="bell"></span><span class="badge" id="nBadge"></span></button>
        <button class="icb" id="btTema" onclick="trocarTema()" aria-label="Trocar entre tema claro e escuro" title="Tema claro ou escuro"></button>
        <div class="notif" id="notif"></div>
      </div>
    </header>

    <div class="periodo" id="barraPeriodo">
      <div class="seg" id="pModo">
        <button data-v="dia">Dia</button><button data-v="semana">Semana</button><button data-v="mes">Mês</button>
        <button data-v="ano">Ano</button><button data-v="tudo">Tudo</button><button data-v="custom">Entre datas</button>
      </div>
      <div class="pnav" id="pNav">
        <button class="seta" onclick="moverPeriodo(-1)" aria-label="Período anterior"><span data-i="chevron-left"></span></button>
        <button type="button" class="plabel" id="pLabel" onclick="escolherData()" title="Escolher uma data"></button>
        <button class="seta" onclick="moverPeriodo(1)" aria-label="Próximo período"><span data-i="chevron-right"></span></button>
      </div>
      <div class="pextra" id="pIrBox">
        <label for="pIr" class="pIrRot">Ir para</label><input type="date" id="pIr" onchange="irPara(this.value)">
        <button class="btn sec" onclick="irHoje()">Hoje</button>
      </div>
      <div class="pextra" id="pCustom">
        <label for="pDe">De</label><input type="date" id="pDe" onchange="defCustom()">
        <label for="pAte">até</label><input type="date" id="pAte" onchange="defCustom()">
      </div>
    </div>

    <!-- ===== PAINEL ===== -->
    <section class="pg ativa" id="pg-painel">
      <div class="duasCol">
        <div class="balanco" id="blocoLista">
          <div class="abas">
            <button class="kpi" data-v="entrada" onclick="verNoPainel('entrada')"><span class="kr">Entrou</span><span class="num pos" id="kEnt"></span><span class="mini" id="kEntM"></span></button>
            <button class="kpi" data-v="gasto" onclick="verNoPainel('gasto')"><span class="kr">Saiu</span><span class="num neg" id="kSai"></span><span class="mini" id="kSaiM"></span></button>
            <button class="kpi" data-v="tudo" onclick="verNoPainel('tudo')"><span class="kr">Sobrou</span><span class="num" id="kSob"></span><span class="mini" id="kSobM"></span></button>
            <button class="kpi" data-v="pendente" onclick="verNoPainel('pendente')"><span class="kr">Falta pagar</span><span class="num" id="kFal"></span><span class="mini" id="kFalM"></span><span class="barra"><span id="kBar"></span></span></button>
          </div>
          <div class="listaBox">
            <div class="cab"><h2 id="lTit"></h2><span class="sub" id="lSub"></span></div>
            <div id="lista"></div>
          </div>
        </div>
        <div class="col">
          <div class="card" id="cxCard"></div>
          <div class="card"><h2>Gastos por categoria</h2><p class="sub" id="cSub"></p><div id="cats"></div></div>
          <div class="card"><h2>Próximas contas a pagar</h2><p class="sub">Inclui contas de outros meses que ainda não foram pagas.</p><div id="prox"></div></div>
        </div>
      </div>
      <div class="inds" id="inds"></div>
      <div class="card"><h2>Entrou e saiu, mês a mês</h2><p class="sub" id="pSubMes"></p><div class="chartbox"><canvas id="chPainel"></canvas></div></div>
    </section>

    <!-- ===== LANÇAMENTOS ===== -->
    <section class="pg" id="pg-lanc">
      <div class="card filtros" id="filtros">
        <input id="qBusca" type="search" placeholder="Buscar por descrição ou categoria" aria-label="Buscar" oninput="renderLanc()">
        <button type="button" class="btn sec btFiltros" id="btFiltros" onclick="alternarFiltros()" aria-expanded="false" aria-controls="filtrosMais"><span data-i="sliders-horizontal"></span>Filtros<b id="nFiltros"></b></button>
        <div class="filtrosMais" id="filtrosMais">
        <select id="qTipo" aria-label="Tipo" onchange="renderLanc()">
          <option value="">Entradas e gastos</option><option value="entrada">Só entradas</option><option value="gasto">Só gastos</option>
        </select>
        <select id="qCat" aria-label="Categoria" onchange="renderLanc()"></select>
        <select id="qStatus" aria-label="Situação" onchange="renderLanc()">
          <option value="">Qualquer situação</option><option value="pago">Pagas</option><option value="pendente">A pagar</option><option value="atrasado">Vencidas</option>
        </select>
        <input id="qMin" inputmode="decimal" placeholder="Valor mínimo" aria-label="Valor mínimo" oninput="renderLanc()">
        <input id="qMax" inputmode="decimal" placeholder="Valor máximo" aria-label="Valor máximo" oninput="renderLanc()">
        <select id="qOrd" aria-label="Ordem" onchange="renderLanc()">
          <option value="dataA">Data, do mais antigo</option><option value="dataD">Data, do mais novo</option>
          <option value="valD">Valor, do maior</option><option value="valA">Valor, do menor</option><option value="desc">Descrição, de A a Z</option>
        </select>
        <button class="btn sec" onclick="limparFiltros()">Limpar filtros</button>
        </div>
      </div>
      <div class="inds" id="lResumo"></div>
      <div class="card semPad"><div id="lTabela"></div></div>
      <div><button class="btn sec" onclick="exportarCSV(true)">Baixar esta lista em planilha (CSV)</button></div>
    </section>

    <!-- ===== GRÁFICOS ===== -->
    <section class="pg" id="pg-graficos">
      <div class="g2">
        <div class="card"><h2>Para onde foi seu dinheiro</h2><p class="sub" id="gSub1"></p>
          <div class="rosca"><div class="chartbox peq"><canvas id="chCat"></canvas></div><div id="legCat"></div></div>
        </div>
        <div class="card"><h2>De onde veio o dinheiro</h2><p class="sub" id="gSub2"></p><div id="fontes"></div></div>
      </div>
      <div class="card"><h2>Entrou e saiu, mês a mês</h2><p class="sub" id="gSubMes"></p><div class="chartbox"><canvas id="chMes"></canvas></div></div>
      <div class="g2">
        <div class="card"><h2>Quanto sobrou em cada mês</h2><p class="sub">Verde é mês que fechou no positivo, vermelho é mês que faltou.</p><div class="chartbox"><canvas id="chSob"></canvas></div></div>
        <div class="card"><h2>Caixinha no fim de cada mês</h2><p class="sub">Quanto ficou guardado ao fechar cada mês: as sobras entram, os meses que faltou dinheiro saem dela.</p><div class="chartbox"><canvas id="chAcum"></canvas></div></div>
      </div>
      <div class="g2">
        <div class="card"><h2>Dia a dia</h2><p class="sub" id="gSubDia"></p>
          <div class="chartbox" id="boxDia"><canvas id="chDia"></canvas></div>
          <div class="vazio" id="diaMsg">Escolha Dia, Semana ou Mês na barra de período para ver o movimento de cada dia.</div>
        </div>
        <div class="card"><h2>Maiores gastos</h2><p class="sub" id="gSub3"></p><div id="tops"></div></div>
      </div>
      <div class="card"><h2>Resumo mês a mês</h2><p class="sub">Clique no nome de um mês para abrir ele no painel.</p><div class="rolagem"><table id="tbMes"></table></div></div>
      <div class="card"><h2>Gastos de cada categoria em cada mês</h2><p class="sub">Valores em reais.</p><div class="rolagem"><table id="tbMatriz"></table></div></div>
    </section>

    <!-- ===== ORÇAMENTOS ===== -->
    <section class="pg" id="pg-orc">
      <div class="card"><h2 id="oTit"></h2><p class="sub">Defina quanto quer gastar por mês em cada categoria. O limite vale para todos os meses. Deixe vazio para não limitar.</p><div id="oResumo"></div></div>
      <div class="g2" id="oLista"></div>
    </section>

    <!-- ===== AJUSTES ===== -->
    <section class="pg" id="pg-ajustes">
      <div class="g2">
        <div class="card"><h2>Perfil</h2><p class="sub">Como o sistema chama você.</p>
          <label class="rot" for="aNome">Seu nome</label>
          <div class="linha"><input id="aNome" maxlength="30" placeholder="Digite seu nome" autocomplete="off"><button class="btn sec" onclick="defNome()">Salvar nome</button></div>
          <span class="rot">Avatar</span><div class="chips" id="aAvs"></div>
        </div>
        <div class="card"><h2>Acesso</h2><p class="sub"><span id="accountEmail"></span></p><p id="privacyState"></p>
          <form id="privacyForm">
            <label class="rot" for="confirmPassword">Senha atual da conta</label>
            <input type="password" id="confirmPassword" autocomplete="current-password" required>
            <label class="rot" for="privacySecret">Novo PIN ou senha de privacidade</label>
            <input type="password" id="privacySecret" autocomplete="new-password">
            <p class="sub">Use pelo menos 6 dígitos para o PIN ou 8 caracteres para a senha. Este aparelho fica conectado e, ao abrir o Cifra ou voltar depois de 1 minuto fora, pede só o PIN.</p>
            <div class="botoes"><button class="btn sec" type="submit">Salvar bloqueio</button>
            <button class="btn sec" type="submit" id="disablePrivacy" hidden>Desativar bloqueio</button></div>
            <p role="status" id="privacyStatus"></p>
          </form><button class="btn sec" onclick="sair()"><span data-i="log-out"></span>Sair da conta</button></div>
        <div class="card"><h2>Aparência</h2>
          <span class="rot">Tema</span>
          <div class="seg" id="aTema"><button data-v="escuro"><span data-i="moon"></span>Escuro</button><button data-v="claro"><span data-i="sun"></span>Claro</button><button data-v="auto"><span data-i="monitor-smartphone"></span>Seguir o aparelho</button></div>
          <span class="rot">Cor de destaque</span>
          <div class="cores"><span class="cores" id="aCores"></span><input type="color" id="aCorLivre" aria-label="Escolher outra cor" title="Escolher qualquer cor" onchange="defCor(this.value)"></div>
          <span class="rot">Tom do fundo</span><div class="chips" id="aTons"></div>
          <span class="rot">Cansou?</span><button class="btn sec" onclick="padraoVisual()">Voltar ao visual original</button>
        </div>
        <div class="card"><h2>Notificações</h2><p class="sub">Os avisos aparecem no sino, no alto da tela.</p>
          <label class="sw"><input type="checkbox" id="nVenc" onchange="defCfg('avVenc',this.checked)"><i></i>Avisar de contas vencendo e atrasadas</label>
          <label class="rot" for="nDias">Avisar com quantos dias de antecedência</label>
          <select id="nDias" onchange="defCfg('diasAviso',+this.value)">
            <option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option>
            <option value="7">7 dias</option><option value="10">10 dias</option><option value="15">15 dias</option>
          </select>
          <label class="sw"><input type="checkbox" id="nOrc" onchange="defCfg('avOrc',this.checked)"><i></i>Avisar quando um orçamento passar de 80%</label>
          <label class="sw"><input type="checkbox" id="nSaldo" onchange="defCfg('avSaldo',this.checked)"><i></i>Avisar quando o mês atual ficar no vermelho (contando a caixinha)</label>
          <label class="sw"><input type="checkbox" id="nNav" onchange="ligarNotifNav(this.checked)"><i></i>Mostrar também como aviso do navegador ao abrir</label>
        </div>
        <div class="card"><h2>Categorias</h2><p class="sub">Troque ícone, nome e cor. Só dá para apagar categoria sem lançamentos.</p>
          <div id="aCats"></div>
          <span class="rot">Nova categoria</span>
          <div class="catEd">
            <input class="emo" id="cNovoIc" maxlength="4" placeholder="🛒" aria-label="Ícone da nova categoria">
            <input id="cNovoNome" maxlength="24" placeholder="Nome" aria-label="Nome da nova categoria">
            <input type="color" id="cNovoCor" value="#14b8a6" aria-label="Cor da nova categoria">
            <small></small>
            <button class="btn sec" onclick="addCat()">Adicionar</button>
          </div>
        </div>
        <div class="card"><h2>Dados</h2><p class="sub">Guarde uma cópia dos dados da sua conta.</p>
          <div class="botoes">
            <button class="btn sec" onclick="exportar()">Baixar backup</button>
            <button class="btn sec" onclick="exportarCSV(false)">Baixar tudo em planilha (CSV)</button>
          </div>
          <div class="secao">
            <span class="rot">Restaurar um backup</span>
            <p class="sub">Substitui todos os dados desta conta pelos do arquivo JSON. Baixe um backup antes.</p>
            <div class="botoes"><button class="btn sec" onclick="document.getElementById('arq').click()">Carregar backup</button></div>
            <input type="file" id="arq" accept=".json,application/json" style="display:none" onchange="importar(event)">
          </div>
          <div class="secao">
            <span class="rot">Ano dos lançamentos</span>
            <p class="sub">Use se as datas ficaram no ano errado. Move todos os lançamentos de uma vez.</p>
            <div class="botoes"><button class="btn sec" onclick="deslocarAno(-1)">Voltar 1 ano</button><button class="btn sec" onclick="deslocarAno(1)">Avançar 1 ano</button></div>
          </div>
          <div class="secao">
            <span class="rot">Recomeçar</span>
            <div class="botoes"><button class="btn sec perigo" onclick="apagarLancamentos()">Apagar todos os lançamentos</button></div>
          </div>
        </div>
      </div>
    </section>
  </div></main>
</div>

<nav id="bottomMenu" class="baixo" aria-label="Seções">
  <button class="ativa" data-pg="painel" onclick="abrir('painel')"><span class="ic" data-i="layout-dashboard"></span>Painel</button>
  <button data-pg="lanc" onclick="abrir('lanc')"><span class="ic" data-i="receipt-text"></span>Lista</button>
  <button data-pg="graficos" onclick="abrir('graficos')"><span class="ic" data-i="chart-line"></span>Gráficos</button>
  <button data-pg="orc" onclick="abrir('orc')"><span class="ic" data-i="target"></span>Orçamento</button>
  <button data-pg="ajustes" onclick="abrir('ajustes')"><span class="ic" data-i="settings"></span>Ajustes</button>
</nav>
<button type="button" class="fab" onclick="abrirForm()" aria-label="Novo lançamento" title="Novo lançamento"><span data-i="plus"></span></button>

<!-- ===== JANELA DE LANÇAMENTO ===== -->
<div class="fundo" id="mdForm" onmousedown="if(event.target===this)fecharForm()">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="fTit">
    <div class="mdTop"><h2 id="fTit">Novo lançamento</h2><button class="ac" onclick="fecharForm()" aria-label="Fechar"><span data-i="x"></span></button></div>
    <div class="seg larga" id="fTipo"><button type="button" data-v="gasto"><span data-i="arrow-up-right"></span>Gasto</button><button type="button" data-v="entrada"><span data-i="arrow-down-left"></span>Entrada</button></div>
    <div id="fBlocoCat"><span class="rot">Categoria</span><div class="chips" id="fCats"></div></div>
    <div class="duas">
      <div><label class="rot" for="fVal">Valor em reais</label><input id="fVal" class="grande" inputmode="decimal" autocomplete="off" placeholder="0,00"></div>
      <div><label class="rot" for="fData">Data</label><input id="fData" type="date"></div>
    </div>
    <label class="rot" for="fDesc">Descrição</label>
    <input id="fDesc" maxlength="60" autocomplete="off">
    <div class="duas">
      <div id="fBlocoPago"><span class="rot">Situação</span><div class="seg larga" id="fPago"><button type="button" data-v="0">A pagar</button><button type="button" data-v="1">Já paguei</button></div></div>
      <div id="fBlocoRep"><label class="rot" for="fRep">Repetir</label>
        <select id="fRep">
          <option value="1">Só uma vez</option><option value="2">Todo mês, por 2 meses</option><option value="3">Todo mês, por 3 meses</option>
          <option value="4">Todo mês, por 4 meses</option><option value="5">Todo mês, por 5 meses</option><option value="6">Todo mês, por 6 meses</option>
          <option value="8">Todo mês, por 8 meses</option><option value="10">Todo mês, por 10 meses</option><option value="12">Todo mês, por 12 meses</option>
          <option value="18">Todo mês, por 18 meses</option><option value="24">Todo mês, por 24 meses</option>
        </select>
      </div>
    </div>
    <p class="msg" id="fMsg" role="alert"></p>
    <div class="mdBase"><button class="btn sec perigo" id="fDel" onclick="apagarDoForm()"><span data-i="trash-2"></span>Apagar</button><button class="btn sec" id="fDup" onclick="duplicarDoForm()"><span data-i="copy"></span>Duplicar</button><button class="btn" onclick="salvarForm()">Salvar lançamento</button></div>
  </div>
</div>

<div class="toast" id="toast" role="status" aria-live="polite"><span id="toastTx"></span><button class="link" id="toastBt"></button></div>
</div>
<div id="sync" role="status" hidden><span id="syncText"></span> <button id="refresh" class="link" onclick="location.reload()" hidden>Recarregar</button></div>
</body>
</html>
