# Cifra --- Arquitetura do Projeto

> **Status:** Arquitetura inicial definida\
> **Versão:** 1.0\
> **Objetivo:** Transformar o sistema financeiro atual, originalmente
> executado em um único arquivo HTML com persistência em `localStorage`,
> em uma aplicação web com autenticação própria e armazenamento
> centralizado em MySQL.

------------------------------------------------------------------------

## 1. Visão geral

O Cifra será uma aplicação web de controle financeiro
pessoal, inicialmente utilizada por um único usuário, mas projetada
desde o início para permitir múltiplas contas independentes no futuro.

A aplicação deverá preservar, sempre que possível, a interface e as
funcionalidades existentes no arquivo `Finance.html`. A migração deve
ser incremental: modernizar a persistência e a autenticação sem
reconstruir desnecessariamente a interface.

### 1.1 Decisões já definidas

  -----------------------------------------------------------------------
  Tema                                Decisão
  ----------------------------------- -----------------------------------
  Usuários iniciais                   Somente o proprietário

  Expansão futura                     Arquitetura preparada para
                                      múltiplos usuários

  Cadastro público                    Desativado inicialmente

  Autenticação                        Login e senha próprios

  Integração com login do Eventeen    Não implementar nesta etapa

  Frontend                            HTML, CSS e JavaScript puro

  Gráficos                            Manter Chart.js já utilizado

  Backend                             PHP

  Comunicação                         API HTTP com JSON

  Banco de dados                      MySQL

  Acesso ao banco                     PDO e consultas preparadas

  Hospedagem inicial pretendida       InfinityFree, sujeita à validação
                                      de compatibilidade e limites

  Domínio pretendido                  `cifra.eventeen.com.br`

  Versionamento                       Repositório GitHub privado
  -----------------------------------------------------------------------

### 1.2 Princípios do projeto

1.  **Preservar o que já funciona:** não redesenhar nem reescrever a
    aplicação inteira sem necessidade.
2.  **Segurança no servidor:** nenhuma regra de autorização pode
    depender apenas do frontend.
3.  **Isolamento por usuário:** todo dado privado deve pertencer a uma
    conta.
4.  **Persistência confiável:** o banco de dados será a fonte oficial
    dos dados.
5.  **Migração verificável:** os dados atuais devem ser exportados,
    importados e conferidos antes de abandonar a versão local.
6.  **Simplicidade operacional:** evitar frameworks e serviços
    adicionais enquanto não houver necessidade concreta.
7.  **Evolução gradual:** manter o projeto preparado para cadastro,
    recuperação de senha e múltiplos usuários, sem ativar essas
    funcionalidades prematuramente.

------------------------------------------------------------------------

## 2. Arquitetura lógica

A aplicação será dividida em três camadas principais.

``` text
Navegador
  |
  | HTTPS / JSON
  v
Frontend
HTML + CSS + JavaScript + Chart.js
  |
  | Requisições HTTP para a API
  v
Backend
PHP
  |
  | PDO / consultas preparadas
  v
Banco de dados
MySQL
```

### 2.1 Frontend

Responsabilidades:

-   Exibir a interface do sistema financeiro.
-   Validar campos para melhorar a experiência do usuário.
-   Enviar operações à API.
-   Apresentar estados de carregamento, sucesso e erro.
-   Atualizar gráficos, indicadores e listagens após operações
    confirmadas.
-   Gerenciar a navegação entre telas.
-   Não armazenar credenciais do banco nem decidir quais registros o
    usuário está autorizado a acessar.

O frontend continuará utilizando JavaScript puro. Não migrar para React,
Vue, Angular ou outro framework como parte desta etapa.

### 2.2 Backend

O PHP será responsável por:

-   Autenticar o usuário.
-   Criar e encerrar sessões.
-   Validar e normalizar dados recebidos.
-   Autorizar cada operação com base no usuário autenticado.
-   Executar operações no banco por meio de PDO.
-   Retornar respostas JSON consistentes.
-   Aplicar regras de negócio que não podem ser confiadas ao navegador.
-   Impedir que um usuário consulte, altere ou exclua dados de outra
    conta.

O backend é a autoridade sobre autenticação, autorização e persistência.

### 2.3 Banco de dados

O MySQL será a fonte oficial dos dados financeiros.

O banco deverá utilizar tabelas relacionais, com registros individuais
associados a `user_id`. Não armazenar todo o estado da aplicação em um
único campo JSON como solução principal.

------------------------------------------------------------------------

## 3. Modelo de dados inicial

O esquema abaixo é uma proposta inicial. Antes de criar as tabelas
definitivas, comparar os campos com o estado real do objeto JavaScript
`S` e com o backup JSON exportado pela aplicação atual.

### 3.1 `users`

Armazena as contas.

Campos sugeridos:

  Campo             Tipo sugerido     Observações
  ----------------- ----------------- -----------------------------------
  `id`              BIGINT UNSIGNED   Chave primária
  `name`            VARCHAR(120)      Nome de exibição
  `email`           VARCHAR(190)      Único, normalizado
  `password_hash`   VARCHAR(255)      Hash gerado com `password_hash()`
  `status`          VARCHAR(20)       Ex.: `active`, `disabled`
  `created_at`      DATETIME          Data de criação
  `updated_at`      DATETIME          Última atualização

Regras:

-   Nunca armazenar senhas em texto puro.
-   Usar `password_hash()` para criar o hash e `password_verify()` para
    validar.
-   O cadastro público ficará desativado inicialmente.
-   A primeira conta será criada por procedimento administrativo seguro,
    não por uma rota pública aberta.
-   O e-mail deve ter índice `UNIQUE`.

### 3.2 `transactions`

Armazena entradas e despesas.

Campos sugeridos:

  -----------------------------------------------------------------------
  Campo                   Tipo sugerido           Observações
  ----------------------- ----------------------- -----------------------
  `id`                    BIGINT UNSIGNED         Chave primária

  `user_id`               BIGINT UNSIGNED         Proprietário do
                                                  registro

  `category_id`           BIGINT UNSIGNED,        Categoria relacionada
                          nullable                

  `type`                  VARCHAR(20)             `income` ou `expense`

  `description`           VARCHAR(255)            Descrição

  `amount`                DECIMAL(14,2)           Valor monetário

  `transaction_date`      DATE                    Data do lançamento

  `is_paid`               BOOLEAN                 Situação de pagamento

  `recurrence_group_id`   CHAR(36), nullable      Identificador de série
                                                  recorrente, se
                                                  necessário

  `created_at`            DATETIME                Criação

  `updated_at`            DATETIME                Atualização
  -----------------------------------------------------------------------

Regras:

-   Usar `DECIMAL`, nunca `FLOAT` ou `DOUBLE`, para valores monetários.
-   Toda consulta, atualização ou exclusão deve restringir pelo
    `user_id` autenticado.
-   A modelagem de recorrências deverá ser conferida com o comportamento
    atual do sistema antes de definir os campos finais.
-   Não presumir que cada ocorrência recorrente é apenas uma projeção
    visual: preservar a semântica atual da aplicação.

### 3.3 `categories`

Armazena categorias personalizadas por usuário.

Campos sugeridos:

  Campo          Tipo sugerido           Observações
  -------------- ----------------------- ------------------------------
  `id`           BIGINT UNSIGNED         Chave primária
  `user_id`      BIGINT UNSIGNED         Proprietário
  `name`         VARCHAR(100)            Nome da categoria
  `type`         VARCHAR(20)             Tipo associado, se aplicável
  `color`        VARCHAR(20), nullable   Cor visual
  `icon`         VARCHAR(80), nullable   Ícone, se utilizado
  `created_at`   DATETIME                Criação
  `updated_at`   DATETIME                Atualização

A estrutura definitiva deve respeitar a forma como as categorias são
representadas atualmente em `S.cats`.

### 3.4 `budgets`

Armazena orçamentos por categoria e período.

Campos sugeridos:

  Campo           Tipo sugerido     Observações
  --------------- ----------------- --------------------------------------------
  `id`            BIGINT UNSIGNED   Chave primária
  `user_id`       BIGINT UNSIGNED   Proprietário
  `category_id`   BIGINT UNSIGNED   Categoria
  `period`        VARCHAR(20)       Definir formato conforme a aplicação atual
  `amount`        DECIMAL(14,2)     Limite orçamentário
  `created_at`    DATETIME          Criação
  `updated_at`    DATETIME          Atualização

A chave única deverá impedir duplicidade do orçamento para a mesma
combinação de usuário, categoria e período.

### 3.5 `user_settings`

Armazena preferências individuais.

Campos possíveis:

  Campo             Tipo sugerido      Observações
  ----------------- ------------------ ------------------------------
  `id`              BIGINT UNSIGNED    Chave primária
  `user_id`         BIGINT UNSIGNED    Proprietário, único
  `settings_json`   JSON ou LONGTEXT   Preferências não relacionais
  `created_at`      DATETIME           Criação
  `updated_at`      DATETIME           Atualização

Pode armazenar preferências como tema, cor, tom visual e configurações
de notificações. O conteúdo deverá ser mapeado a partir de `S.cfg` e
demais propriedades relevantes.

O uso de JSON nesta tabela é aceitável para preferências flexíveis; não
deve substituir as tabelas relacionais de lançamentos, categorias e
orçamentos.

### 3.6 `dismissed_notifications`

Armazena notificações dispensadas, caso a funcionalidade continue sendo
necessária após a migração.

Campos sugeridos:

-   `id`
-   `user_id`
-   `notification_key`
-   `dismissed_at`

A estrutura deverá refletir o formato real de `S.disp`.

### 3.7 Relacionamentos e índices

-   `transactions.user_id` → `users.id`
-   `categories.user_id` → `users.id`
-   `budgets.user_id` → `users.id`
-   `user_settings.user_id` → `users.id`
-   `dismissed_notifications.user_id` → `users.id`
-   `transactions.category_id` → `categories.id`
-   `budgets.category_id` → `categories.id`

Criar índices para os campos utilizados em filtros frequentes,
especialmente `user_id`, datas e categorias.

Sempre que possível, utilizar chaves estrangeiras e regras de
integridade compatíveis com a versão do MySQL disponível na hospedagem.

------------------------------------------------------------------------

## 4. Autenticação e sessões

### 4.1 Fluxo de login

1.  O usuário informa e-mail e senha.
2.  O frontend envia os dados por HTTPS para `POST /api/auth/login`.
3.  O PHP procura a conta pelo e-mail normalizado.
4.  O PHP valida a senha com `password_verify()`.
5.  Se as credenciais forem válidas e a conta estiver ativa, o servidor
    regenera o ID da sessão e inicia a sessão autenticada.
6.  O frontend recebe uma resposta de sucesso e carrega os dados do
    usuário.

Não retornar se o e-mail existe ou não. Mensagens de falha devem evitar
facilitar a enumeração de contas.

### 4.2 Sessões

Utilizar sessões nativas do PHP, com configuração segura:

-   Cookies com `HttpOnly`.
-   `Secure` quando servido por HTTPS.
-   `SameSite=Lax` ou política mais restritiva compatível com o fluxo.
-   Regenerar o ID da sessão após login.
-   Encerrar a sessão no logout.
-   Definir expiração e política de inatividade.
-   Não guardar senha ou hash de senha no navegador.

### 4.3 PIN existente

O PIN da versão local não deve ser tratado como autenticação da
aplicação online.

A autenticação principal será e-mail e senha. Caso seja desejado
futuramente, o PIN poderá ser reintroduzido como bloqueio adicional de
interface, sem substituir a sessão autenticada e sem ser considerado uma
barreira de segurança do servidor.

### 4.4 Funcionalidades futuras

Preparar a arquitetura para:

-   Cadastro de usuários, inicialmente desativado.
-   Recuperação e redefinição de senha.
-   Verificação de e-mail, se necessária.
-   Desativação de contas.
-   Limitação de tentativas de login.
-   Integração futura com a autenticação do Eventeen, somente se houver
    decisão específica para isso.

Não implementar essas funcionalidades por antecipação se não forem
necessárias para a primeira versão.

------------------------------------------------------------------------

## 5. API HTTP

A API deverá utilizar JSON nas requisições e respostas, exceto quando
uma operação exigir outro formato.

### 5.1 Padrão de resposta

Exemplo de sucesso:

``` json
{
  "success": true,
  "data": {},
  "message": "Operação realizada."
}
```

Exemplo de erro:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os dados enviados."
  }
}
```

Não retornar mensagens internas do banco, caminhos do servidor, stack
traces ou segredos.

### 5.2 Endpoints iniciais sugeridos

  Método     Endpoint                   Responsabilidade
  ---------- -------------------------- ------------------------
  `POST`     `/api/auth/login`          Autenticar
  `POST`     `/api/auth/logout`         Encerrar sessão
  `GET`      `/api/auth/me`             Consultar sessão atual
  `GET`      `/api/transactions`        Listar lançamentos
  `POST`     `/api/transactions`        Criar lançamento
  `GET`      `/api/transactions/{id}`   Consultar lançamento
  `PUT`      `/api/transactions/{id}`   Atualizar lançamento
  `DELETE`   `/api/transactions/{id}`   Excluir lançamento
  `GET`      `/api/categories`          Listar categorias
  `POST`     `/api/categories`          Criar categoria
  `PUT`      `/api/categories/{id}`     Atualizar categoria
  `DELETE`   `/api/categories/{id}`     Excluir categoria
  `GET`      `/api/budgets`             Listar orçamentos
  `POST`     `/api/budgets`             Criar orçamento
  `PUT`      `/api/budgets/{id}`        Atualizar orçamento
  `DELETE`   `/api/budgets/{id}`        Excluir orçamento
  `GET`      `/api/settings`            Consultar preferências
  `PUT`      `/api/settings`            Atualizar preferências

Os endpoints são uma convenção inicial. A implementação deverá
considerar as limitações do ambiente PHP/hospedagem e manter rotas
consistentes.

### 5.3 Regras obrigatórias da API

-   Verificar autenticação em toda rota privada.
-   Obter o `user_id` exclusivamente da sessão validada no servidor.
-   Nunca confiar em um `user_id` enviado pelo frontend.
-   Filtrar por `user_id` em toda consulta, alteração e exclusão de
    dados privados.
-   Validar tipo, formato, tamanho e faixa dos campos recebidos.
-   Utilizar consultas preparadas com PDO.
-   Usar transações SQL quando uma operação envolver várias alterações
    que precisem ser atômicas.
-   Validar propriedade de categorias antes de associá-las a
    lançamentos.
-   Retornar códigos HTTP adequados (`200`, `201`, `400`, `401`, `403`,
    `404`, `422`, `500`, entre outros).
-   Não permitir que erros internos sejam expostos ao usuário.

------------------------------------------------------------------------

## 6. Segurança

A aplicação armazenará informações financeiras pessoais. Segurança deve
ser requisito de implementação, não uma etapa opcional posterior.

### 6.1 Requisitos

-   HTTPS obrigatório em produção.
-   Senhas protegidas com `password_hash()` e verificadas com
    `password_verify()`.
-   PDO com prepared statements.
-   Sessões PHP configuradas com cookies seguros.
-   Proteção CSRF para operações autenticadas baseadas em cookies.
-   Validação e normalização no servidor.
-   Escape de dados ao inserir conteúdo na página, prevenindo XSS.
-   Verificação de propriedade de cada registro.
-   Mensagens de erro sem detalhes internos.
-   Segredos e credenciais fora do repositório.
-   Arquivos de configuração não acessíveis pela web.
-   Limitação de tentativas de login, dentro das possibilidades do
    ambiente.
-   Logs sem senhas, tokens de sessão ou dados financeiros
    desnecessários.

### 6.2 Proteção de dados entre usuários

Todas as operações privadas devem seguir este princípio:

``` text
Usuário autenticado
      |
      v
Servidor identifica user_id pela sessão
      |
      v
Consulta/alteração inclui o user_id
      |
      v
Somente registros daquele usuário são acessíveis
```

Exemplo conceitual de consulta segura:

``` sql
SELECT *
FROM transactions
WHERE id = :transaction_id
  AND user_id = :authenticated_user_id;
```

O `authenticated_user_id` deve vir da sessão do PHP, nunca de um campo
enviado pelo navegador.

### 6.3 Ambiente de hospedagem

Antes da publicação, verificar:

-   Versão do PHP disponível.
-   Extensão PDO e driver PDO MySQL.
-   Versão e recursos do MySQL.
-   Possibilidade de configurar HTTPS no subdomínio.
-   Possibilidade de manter arquivos privados fora do diretório público.
-   Regras de rewrite/roteamento disponíveis.
-   Limites de execução, armazenamento, conexões e tráfego.
-   Política de backups e possibilidade de exportar o banco.

Se o plano gratuito não oferecer os recursos necessários, adaptar a
implantação ou escolher outra hospedagem. Não reduzir requisitos
essenciais de segurança apenas para manter custo zero.

------------------------------------------------------------------------

## 7. Estrutura de diretórios proposta

Estrutura lógica sugerida:

``` text
eventeen-financeiro/
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── api/
│       ├── auth/
│       ├── transactions/
│       ├── categories/
│       ├── budgets/
│       └── settings/
│
├── app/
│   ├── config/
│   │   └── database.php
│   ├── middleware/
│   │   └── auth.php
│   ├── services/
│   ├── repositories/
│   └── helpers/
│
├── database/
│   ├── schema.sql
│   └── migrations/
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATA-MIGRATION.md
│
├── .gitignore
└── README.md
```

Esta é uma organização lógica para o repositório. A implantação real
deve manter arquivos privados e credenciais fora do diretório público
sempre que a hospedagem permitir.

Se a hospedagem obrigar uma estrutura diferente, adaptar os caminhos sem
expor `app/config`, arquivos SQL, backups ou segredos.

### 7.1 Arquivos de configuração

-   Não incluir senhas reais no código.
-   Utilizar variáveis de ambiente ou arquivo de configuração privado
    fora da raiz pública, conforme suporte da hospedagem.
-   Incluir no Git apenas um exemplo sem credenciais, como
    `.env.example`, se essa abordagem for compatível com o ambiente.
-   Incluir arquivos de segredo no `.gitignore`.

------------------------------------------------------------------------

## 8. Migração do sistema local atual

### 8.1 Situação atual conhecida

O sistema original está no arquivo `Finance.html`, construído com HTML,
CSS e JavaScript puro, e utiliza Chart.js 4.4.1.

A persistência atual utiliza:

``` javascript
const KEY = 'minhas_financas_v2';
localStorage.setItem(KEY, JSON.stringify(S));
```

O estado principal é mantido no objeto JavaScript `S`. Entre as
propriedades identificadas estão:

-   `ver`
-   `lanc`
-   `nid`
-   `cats`
-   `perfil`
-   `cfg`
-   `orc`
-   `disp`
-   metadados de migração e estado

A estrutura exata dos objetos e subobjetos deve ser confirmada
diretamente no arquivo e em um backup JSON real antes da implementação
definitiva do esquema.

O HTML contém o código da aplicação; os dados atuais do usuário estão no
armazenamento local do navegador e não devem ser presumidos como parte
do arquivo HTML.

### 8.2 Backup antes da migração

Antes de qualquer alteração:

1.  Abrir a versão local original no navegador onde os dados estão
    armazenados.
2.  Utilizar a função de exportação de backup JSON da própria aplicação.
3.  Guardar uma cópia original do arquivo HTML.
4.  Guardar o backup JSON em local seguro.
5.  Não limpar os dados do navegador.
6.  Não sobrescrever a versão original durante o desenvolvimento.

O backup JSON é a fonte para a migração dos registros existentes.

### 8.3 Estratégia de adaptação

Não substituir mecanicamente todas as chamadas a `localStorage` por
chamadas assíncronas ao servidor.

A aplicação atual possui uma função `salvar()` e chamadas de
renderização que podem acionar salvamento. A nova implementação deve
separar:

-   Estado em memória.
-   Carregamento inicial dos dados.
-   Renderização da interface.
-   Operações que alteram dados.
-   Persistência na API.
-   Tratamento de falhas.

A renderização não deve provocar gravações no banco.

### 8.4 Fluxo de carregamento

1.  Verificar a sessão com `/api/auth/me`.
2.  Se não houver sessão, exibir login.
3.  Se houver sessão, carregar os dados necessários pela API.
4.  Montar o estado da aplicação em memória.
5.  Renderizar a interface.

### 8.5 Fluxo de gravação

1.  Usuário realiza uma alteração.
2.  Frontend valida campos básicos.
3.  Frontend envia a operação à API.
4.  Backend autentica e valida os dados.
5.  Backend grava no MySQL.
6.  API retorna sucesso ou erro.
7.  Frontend atualiza a interface com o resultado confirmado.

Não apresentar uma operação como salva antes da confirmação do servidor.
Se futuramente for implementado comportamento otimista, deverá existir
reversão visual clara quando a gravação falhar.

### 8.6 Importação do backup

Criar um processo controlado de importação:

1.  Ler e validar o JSON.
2.  Reconhecer a versão do formato (`ver`).
3.  Reutilizar, quando apropriado, as regras de migração existentes.
4.  Mapear lançamentos, categorias, orçamentos e configurações para as
    tabelas.
5.  Associar todos os registros ao usuário autenticado.
6.  Preservar datas, valores, status, categorias e recorrências.
7.  Executar a importação em transação sempre que possível.
8.  Gerar relatório de sucesso e falhas.
9.  Comparar totais e quantidades com o backup original.

A importação deve ser idempotente ou protegida contra duplicação
acidental. Definir claramente se a operação será uma importação inicial,
uma substituição completa ou uma mesclagem. Não mesclar silenciosamente
registros duplicados.

### 8.7 Conferência

Antes de considerar a migração concluída, conferir:

-   Quantidade de entradas.
-   Quantidade de despesas.
-   Soma de entradas.
-   Soma de despesas.
-   Lançamentos pagos e pendentes.
-   Datas e anos.
-   Categorias.
-   Orçamentos.
-   Recorrências.
-   Preferências.
-   Gráficos e indicadores calculados.

Manter o backup original até que a aplicação online tenha sido testada e
os dados conferidos.

------------------------------------------------------------------------

## 9. Funcionalidades a preservar

A migração deve identificar e preservar as funcionalidades presentes na
versão atual, incluindo, conforme aplicável:

-   Cadastro de entradas e despesas.
-   Edição e exclusão de lançamentos.
-   Marcação de lançamentos como pagos.
-   Categorias personalizadas.
-   Orçamentos por categoria.
-   Lançamentos recorrentes.
-   Gráficos e indicadores com Chart.js.
-   Preferências visuais.
-   Notificações e dispensas.
-   Exportação JSON.
-   Importação JSON.
-   Exportação CSV.
-   Navegação e filtros por período/ano.

Não remover uma funcionalidade apenas porque sua implementação atual
depende de `localStorage`. Adaptar sua persistência para a API.

Antes de alterar a interface, mapear os fluxos existentes no arquivo
original e registrar eventuais diferenças de comportamento.

------------------------------------------------------------------------

## 10. Backups e recuperação

A aplicação deverá manter duas formas de proteção:

### 10.1 Exportação pelo usuário

Manter uma opção para exportar os dados financeiros em formato JSON e,
quando aplicável, CSV.

O JSON deve permitir restaurar os dados, não ser apenas um relatório
legível.

### 10.2 Backup do banco

Definir uma rotina periódica de backup MySQL independente da hospedagem
principal, se tecnicamente possível.

Requisitos:

-   Guardar cópias em local separado do banco de produção.
-   Restringir acesso aos arquivos.
-   Não armazenar backups em diretório público.
-   Testar periodicamente a restauração.
-   Documentar a frequência e o procedimento.
-   Não considerar exportação manual como substituta completa de backups
    operacionais.

A disponibilidade de backups automáticos do provedor deve ser
verificada; não presumir que o plano gratuito os oferece.

------------------------------------------------------------------------

## 11. Implantação e ambientes

### 11.1 Ambientes

Sempre que possível, separar:

-   **Desenvolvimento:** ambiente local para implementar e testar.
-   **Produção:** aplicação publicada em `financeiro.eventeen.com.br`.

Não utilizar dados financeiros reais em ambientes de teste sem
necessidade. Preferir dados fictícios.

### 11.2 Publicação

Antes de publicar:

1.  Validar a compatibilidade do PHP e MySQL.
2.  Criar o banco e usuário de banco com permissões mínimas necessárias.
3.  Configurar credenciais fora do repositório.
4.  Configurar HTTPS.
5.  Configurar o subdomínio.
6.  Aplicar o esquema SQL e migrações.
7.  Criar a primeira conta por procedimento seguro.
8.  Testar login, logout e rotas privadas.
9.  Importar o backup.
10. Conferir os dados.
11. Fazer backup inicial.

### 11.3 GitHub

O repositório deverá ser privado.

Nunca enviar ao Git:

-   Senhas reais.
-   Credenciais MySQL.
-   Chaves privadas.
-   Cookies ou tokens de sessão.
-   Backups reais com dados financeiros.
-   Arquivos `.env` de produção.

O histórico do Git também deve ser tratado como persistente: remover um
segredo de um arquivo em um commit posterior não o apaga dos commits
anteriores.

------------------------------------------------------------------------

## 12. Testes e critérios de aceitação

A primeira versão online só será considerada pronta quando os testes
abaixo forem concluídos.

### Autenticação

-   [ ] Login válido funciona.
-   [ ] Senha inválida não autentica.
-   [ ] Logout encerra a sessão.
-   [ ] Rotas privadas rejeitam usuários não autenticados.
-   [ ] O ID da sessão é regenerado após login.
-   [ ] A sessão expira conforme a política definida.

### Isolamento de dados

-   [ ] O backend não aceita `user_id` arbitrário enviado pelo frontend.
-   [ ] Consultas são filtradas pelo usuário autenticado.
-   [ ] Não é possível consultar um lançamento de outra conta alterando
    seu ID.
-   [ ] Não é possível editar ou excluir dados de outra conta.
-   [ ] Categorias e orçamentos também respeitam o proprietário.

### Operações financeiras

-   [ ] Criar entrada.
-   [ ] Criar despesa.
-   [ ] Editar lançamento.
-   [ ] Excluir lançamento.
-   [ ] Marcar como pago ou pendente.
-   [ ] Criar e editar categorias.
-   [ ] Criar e editar orçamentos.
-   [ ] Testar recorrências.
-   [ ] Conferir gráficos, filtros e totais.

### Persistência e migração

-   [ ] Dados continuam disponíveis após sair e entrar novamente.
-   [ ] Dados aparecem em outro dispositivo após autenticação.
-   [ ] Falhas de rede são comunicadas corretamente.
-   [ ] A renderização não grava dados indevidamente.
-   [ ] Backup JSON pode ser exportado.
-   [ ] Backup JSON pode ser importado.
-   [ ] Quantidades e totais importados conferem com a origem.
-   [ ] Restauração de backup foi testada.

### Segurança e publicação

-   [ ] HTTPS funciona.
-   [ ] Credenciais não aparecem no frontend.
-   [ ] Configurações privadas não são acessíveis publicamente.
-   [ ] Consultas usam parâmetros preparados.
-   [ ] Operações autenticadas têm proteção CSRF adequada.
-   [ ] Mensagens de erro não revelam detalhes internos.
-   [ ] Backup não está em diretório público.

------------------------------------------------------------------------

## 13. Fases de implementação

### Fase 1 --- Inspeção e preparação

-   Analisar novamente o `Finance.html` completo.
-   Mapear funções, estado, eventos e fluxos.
-   Examinar um backup JSON real.
-   Criar o repositório privado.
-   Validar ambiente PHP/MySQL.
-   Criar documentação e esquema inicial.

**Entrega:** diagnóstico técnico, repositório preparado e modelo de
dados revisado.

### Fase 2 --- Backend e autenticação

-   Criar conexão PDO.
-   Criar tabelas.
-   Implementar sessão.
-   Implementar login, logout e consulta de sessão.
-   Criar a primeira conta de forma segura.
-   Implementar middleware de autenticação.

**Entrega:** backend autenticado e protegido.

### Fase 3 --- API financeira

-   Implementar operações de lançamentos.
-   Implementar categorias.
-   Implementar orçamentos.
-   Implementar configurações e notificações.
-   Testar isolamento por usuário.

**Entrega:** API funcional com persistência MySQL.

### Fase 4 --- Integração com o frontend

-   Criar tela de login.
-   Adaptar carregamento inicial.
-   Separar renderização de persistência.
-   Integrar operações à API.
-   Preservar interface e funcionalidades.
-   Implementar estados de carregamento e erro.

**Entrega:** aplicação funcionando com backend.

### Fase 5 --- Migração e validação

-   Exportar backup original.
-   Importar dados.
-   Conferir registros e valores.
-   Testar todos os fluxos.
-   Testar exportação e restauração.

**Entrega:** dados migrados e conferidos.

### Fase 6 --- Publicação

-   Configurar subdomínio.
-   Configurar HTTPS.
-   Configurar banco e credenciais de produção.
-   Publicar aplicação.
-   Fazer backup inicial.
-   Monitorar erros e estabilidade.

**Entrega:** primeira versão online.

------------------------------------------------------------------------

## 14. Instruções para o agente de desenvolvimento (Claude Code)

Ao trabalhar neste repositório:

1.  Leia este documento antes de modificar o código.
2.  Inspecione o código existente antes de propor substituições.
3.  Não reescreva a interface inteira sem justificativa técnica e
    autorização.
4.  Não remova funcionalidades existentes sem documentar o motivo e
    obter aprovação.
5.  Não invente campos do banco sem comparar com o estado real da
    aplicação e o backup.
6.  Faça alterações pequenas, organizadas e verificáveis.
7.  Explique quais arquivos serão criados ou modificados antes de
    mudanças amplas.
8.  Não execute migrações destrutivas nem apague dados.
9.  Não use dados reais em testes automatizados.
10. Não coloque credenciais, tokens ou dados financeiros no código ou no
    Git.
11. Não confie em validações feitas somente no frontend.
12. Não aceite `user_id` enviado pelo cliente como identidade
    autenticada.
13. Inclua tratamento de erros e validação em todas as operações da API.
14. Atualize a documentação quando a arquitetura mudar.
15. Ao concluir cada fase, informe arquivos alterados, decisões tomadas,
    testes executados e pendências.

### Regra de segurança para alterações

Antes de executar qualquer ação que possa apagar, sobrescrever ou migrar
dados:

-   Explicar o impacto.
-   Confirmar a existência de backup.
-   Propor um procedimento reversível, quando possível.
-   Solicitar autorização explícita.

Não executar ações destrutivas por iniciativa própria.

------------------------------------------------------------------------

## 15. Pendências que precisam ser confirmadas durante a implementação

Este documento define a direção arquitetural, mas não presume que todos
os detalhes do ambiente já foram verificados.

-   [ ] Versões exatas de PHP e MySQL disponíveis na hospedagem.
-   [ ] Suporte a PDO MySQL e demais extensões necessárias.
-   [ ] Possibilidade de armazenar configurações fora da raiz pública.
-   [ ] Recursos de roteamento disponíveis para a API.
-   [ ] Política real de backup e limites do plano de hospedagem.
-   [ ] Estrutura exata dos dados de recorrência.
-   [ ] Estrutura completa de categorias e orçamentos.
-   [ ] Formato e conteúdo de um backup JSON real.
-   [ ] Política de expiração de sessão.
-   [ ] Frequência e destino dos backups independentes.

Não tratar itens pendentes como capacidades já confirmadas.

------------------------------------------------------------------------

## 16. Resultado esperado

Ao final, o Cifra deverá:

-   Funcionar em `financeiro.eventeen.com.br`.
-   Possuir login e senha próprios.
-   Armazenar os dados em MySQL.
-   Permitir acesso aos mesmos dados em diferentes dispositivos.
-   Preservar as funcionalidades importantes do sistema local.
-   Manter exportação e restauração dos dados.
-   Proteger os registros no servidor.
-   Estar preparado para múltiplos usuários, embora inicialmente apenas
    uma conta seja utilizada.
-   Permitir evolução futura sem exigir uma reconstrução completa.

**Diretriz final:** construir primeiro uma versão pessoal, segura e
confiável. A preparação para múltiplos usuários deve estar na estrutura
do banco e nas regras de autorização desde o começo, mas recursos
públicos de cadastro e administração de usuários só devem ser
implementados quando forem realmente necessários.
