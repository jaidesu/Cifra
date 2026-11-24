# Cifra — Guia de design

O Cifra é um caderno de finanças pessoais de uso frequente. Quem abre o painel pode ter uma pergunta simples em mente: “Quanto ainda preciso pagar este mês?”. A tela deve permitir que a pessoa identifique o período, leia o valor e chegue às contas que compõem aquele total. Essa sequência orienta a hierarquia visual.

Este guia se aplica às próximas revisões de interface e ao futuro trabalho de identidade. As medidas atuais vêm de `public/assets/finance.css`. As metas de revisão abaixo são propostas de design.

## 1. O que dá identidade ao Cifra

Preservar o vocabulário que já aproxima o aplicativo de quem cuida das próprias contas: **Entrou**, **Saiu**, **Falta pagar** e **Caixinha**. Há mais personalidade em “Entrou e saiu, mês a mês” do que em um título abstrato sobre desempenho financeiro. Usar o nome técnico quando ele dá precisão à tarefa, como em “Exportar CSV”.

A aparência deve lembrar um extrato bem composto. Descrições começam no mesmo eixo, valores terminam no mesmo eixo e o período fica próximo daquilo que ele afeta. A composição pode ser discreta porque os próprios dados dão ritmo à página.

Antes de acrescentar um elemento, identificar sua função. Um selo pode indicar “Vencida”. Uma linha auxiliar pode explicar que o orçamento vale para todos os meses. Se a frase apenas repetir o título, retirar a frase. Evitar gradientes ornamentais, brilho atrás de valores, saudações promocionais e ícones repetidos em cada título. Ao simplificar um elemento clicável, preservar a indicação de que ele pode ser acionado.

## 2. Tipografia e apresentação de dinheiro

| Elemento | Regra de composição |
| --- | --- |
| Título da página | Manter como referência os 26 px e peso 800 do desktop. Um título principal por tela. |
| Título de seção | Partir dos 17 px e peso 700 existentes. Usar caixa de frase, como em “Próximas contas a pagar”. |
| Texto e controles | O corpo atual é de 15 px, com entrelinha de 1,45. Manter a família Archivo quando disponível e a fonte do sistema como alternativa local. |
| Informação auxiliar | Usar a escala atual de aproximadamente 13–14 px para contexto e datas. Valor, vencimento e erro de campo precisam ser legíveis em tamanho normal. |
| Valores | Usar formato brasileiro, como **R$ 1.248,90**. Nas listas e tabelas, alinhar à direita e preferir algarismos tabulares com `font-variant-numeric: tabular-nums`. |

Dar destaque ao valor que responde à pergunta da seção. O total do período pode ser maior que os lançamentos individuais. Em uma lista, conservar o mesmo tamanho para todas as quantias, inclusive a maior despesa. Manter símbolo, sinal e valor juntos. Testar com **−R$ 123.456,78**, além de valores pequenos e zero.

## 3. Cor, superfícies e espaçamento

O tema escuro atual combina fundo quase preto (`#070707`), superfície (`#121212`), campo ou superfície secundária (`#1c1c1c`) e borda (`#2b2b2b`). Usar os papéis já definidos em CSS — `--bg`, `--card`, `--card2`, `--borda`, `--txt` e `--sub` — para que a mesma tela acompanhe o tema claro e os ajustes pessoais.

- **Ação e seleção.** O vermelho de destaque padrão é `#e11d2e`. Usar a cor de destaque configurada para a ação principal e o item ativo. Na navegação, conservar também a faixa lateral ou um marcador equivalente.
- **Significado financeiro.** Entrada, gasto, pagamento e atraso são informações diferentes. Uma despesa paga continua sendo uma saída. Identificar o movimento pelo rótulo ou sinal e o pagamento pelo texto “Pago” ou “A pagar”. Reservar “Vencida” para uma conta pendente cujo prazo passou.
- **Agrupamento.** Usar uma superfície para itens que se leem juntos. Dentro de “Próximas contas a pagar”, uma lista com divisórias finas atende melhor à leitura de vencimentos do que um cartão completo por conta. Reservar sombra para elementos sobrepostos, como o formulário de lançamento.
- **Distâncias.** Como referência para ajustes, usar 8 px entre controles relacionados, 12–16 px dentro de um grupo e 24 px entre assuntos. Ajustar pela proximidade percebida. Um rótulo deve ficar visualmente mais perto do próprio campo do que do anterior.

Verificar texto regular com meta de contraste de 4,5:1, inclusive nos temas personalizados. Testar a ação principal com destaque amarelo e com azul escuro para conferir se o texto continua legível sobre ambos.

## 4. Regras por tela

| Tela | O que deve aparecer primeiro | Decisão para a próxima revisão |
| --- | --- | --- |
| Acesso | Nome Cifra, título da tarefa e primeiro campo | Manter o formulário em uma coluna. “Entrar” e “Criar conta” identificam fluxos diferentes. Exibir a exigência de senha no momento da criação. |
| Painel | Período selecionado e resumo de entradas, gastos, sobra e pendências | Tratar os quatro indicadores como um conjunto. Ao escolher “Falta pagar”, evidenciar a seleção e manter a lista correspondente próxima. Em meses encerrados, deixar claro que as próximas contas a pagar podem vir de outros períodos. |
| Lançamentos | Busca, filtros ativos e registros encontrados | Usar descrição e valor como eixos da linha. Alinhar datas e situações em colunas estáveis. No celular, colocar data e categoria sob a descrição e manter o valor visível à direita. |
| Gráficos | Pergunta respondida, período e unidade | Ordenar gastos por categoria do maior para o menor e meses em ordem cronológica. Manter as mesmas cores para entrada e saída em gráficos relacionados. Disponibilizar valores exatos em lista ou tabela, inclusive para quem navega por teclado. |
| Orçamentos | Categoria, gasto realizado e limite mensal | Mostrar “R$ 320,00 de R$ 400,00” junto à barra. Se ultrapassar o limite, informar o excedente em reais. Distinguir categoria sem limite definido de categoria com gasto zero. |
| Ajustes | Títulos de grupos que indiquem onde agir | Agrupar perfil, aparência, avisos e dados. Separar visualmente “Baixar backup” de “Carregar backup”, pois restaurar substitui os dados da conta. |

**Exemplo de revisão do painel.** Em “Próximas contas a pagar”, usar “Internet” e “R$ 99,90” na primeira linha. Abaixo, “Vence em 28/11”. Se o usuário marcar a despesa como paga, atualizar a lista e o total após a confirmação da gravação. A informação que merece atenção é a próxima conta pendente.

## 5. Interação e linguagem

- Dar à ação principal um verbo específico, como “Salvar lançamento”. Ações secundárias recebem menos peso visual. Pedir confirmação proporcional ao impacto, especialmente ao restaurar um backup.
- Em formulários, manter rótulos visíveis acima dos campos. Informar o problema no campo correspondente e preservar o que já foi digitado. Exemplo: “Informe um valor maior que zero.”
- Distinguir uma conta nova de um filtro sem resultados. Na primeira, “Nenhum lançamento ainda” pode vir com “Criar lançamento”. Na segunda, “Nenhum lançamento neste período” combina com “Alterar período”.
- Reservar uma indicação breve para gravações em andamento. Exibir sucesso após confirmação. Quando a conexão cair e o resultado estiver incerto, explicar a próxima ação: “Recarregue para conferir se o lançamento foi salvo.”
- Manter os ícones de categoria escolhidos pela pessoa. Para comandos como editar, duplicar e excluir, usar uma família de ícones consistente, nome acessível e área de toque confortável. No celular, comandos menos frequentes podem compartilhar um menu de ações identificado pelo lançamento.

## 6. Celular e acessibilidade

O layout atual reorganiza as colunas em 1180 px, troca a navegação lateral pela inferior em 980 px e compacta as linhas em 760 px. Usar esses pontos como referência ao ajustar uma tela. Verificar também as larguras intermediárias, onde duas colunas às vezes cabem tecnicamente, mas deixam valores ou títulos espremidos.

No celular, testar com 360 px de largura, teclado aberto e uma descrição longa. O botão de salvar e o último lançamento devem continuar alcançáveis acima da navegação inferior. Em tabelas extensas, permitir rolagem horizontal dentro da tabela. Manter o restante da página na largura da tela.

Percorrer os controles com Tab, acionar com o teclado e fechar o formulário com Escape. Manter o foco visível e devolvê-lo ao controle que abriu o formulário. Adotar 44 × 44 px como alvo de toque para ações frequentes. Respeitar a preferência de movimento reduzido, inclusive nas animações dos gráficos.

## 7. Direção para a futura logo

A identidade precisa funcionar nos lugares que o produto realmente oferece: ao lado do nome na barra lateral, no acesso à conta e no ícone da aba do navegador. Começar explorando a própria palavra **Cifra**. Observar o desenho do C, o ritmo das cinco letras e a legibilidade do conjunto em tamanho pequeno. Um símbolo independente só se justifica se continuar reconhecível fora do nome.

Preparar a primeira avaliação em uma cor, sobre fundos claro e escuro. Testar o símbolo a 16 e 32 px e a assinatura junto ao título “Acesse sua conta”. Conferir se a marca mantém presença quando o usuário troca a cor de destaque da interface. Evitar depender de cifrão, pilha de moedas ou seta ascendente para identificar o produto.

A escolha do desenho fica para a etapa de criação. O critério de aprovação será reconhecer o Cifra em tamanho de uso, sem confundir a marca com um indicador de saldo, um alerta ou um botão.

## 8. Como revisar uma mudança

1. Escolher uma tarefa real, como localizar a próxima conta, corrigir um lançamento ou conferir o limite de uma categoria.
2. Comparar a tela atual e a proposta com os mesmos dados fictícios e período. Observar o que a pessoa lê primeiro, como identifica o valor e onde consegue agir.
3. Repetir em tema claro e escuro, no desktop e no celular. Incluir conta vazia, descrição longa, saldo negativo e orçamento excedido.
4. Conferir os estados de foco, seleção, carregamento, sucesso e falha que a mudança afeta. Uma captura de tela estática cobre apenas parte da experiência.
5. Registrar a decisão em uma frase concreta. Por exemplo: “Alinhamos os valores e colocamos o vencimento sob a descrição para permitir comparar contas sem abrir cada lançamento.”
