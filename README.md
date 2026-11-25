# Cifra

Aplicativo de finanças pessoais baseado no `Finance.html`. A interface usa HTML, JavaScript e Chart.js 4.4.1. O servidor PHP identifica a conta pela sessão e grava os dados no MySQL.

## Abrir no XAMPP

1. Extraia **Cifra-XAMPP.zip** diretamente em **htdocs** na pasta do XAMPP. O arquivo já contém a pasta **Cifra**. Confira se o resultado é **htdocs/Cifra/index.php**.
2. Abra o painel do XAMPP e inicie **Apache** e **MySQL**.
3. Acesse **http://localhost/Cifra/**. No primeiro acesso pelo próprio computador, informe nome, e-mail e senha. O Cifra prepara o banco, cria as tabelas e abre o painel.
4. Nas próximas vezes, inicie os dois serviços e acesse o mesmo endereço. A opção **Sair da conta** fica em **Ajustes → Acesso**.

O pacote contém os arquivos PHP, a interface, o esquema e as regras de acesso do Apache. Todos os recursos necessários para usar o aplicativo são servidos localmente. A configuração de desenvolvimento usa o banco **cifra**, o MySQL em **127.0.0.1:3306** e o padrão do XAMPP de usuário **root** com senha vazia. Esse padrão só é usado em uma requisição local. PHP 8.1 ou mais recente com PDO MySQL é necessário.

Se o seu MySQL usa outra porta, usuário ou senha, copie **app/config.example.php** para **app/config.local.php** na instalação e preencha os campos. Use um banco dedicado. A instalação inicial precisa de permissão para criar o banco e as tabelas. Também é possível criar o banco pelo phpMyAdmin e importar **database/schema.sql** antes de abrir o aplicativo. Se o Apache usa uma porta diferente de 80, inclua a porta no endereço, por exemplo **http://localhost:8080/Cifra/**.

O cadastro inicial fica disponível apenas por localhost e até a criação da primeira conta. Abrir uma instalação com contas existentes leva ao login. A versão do XAMPP usa seu próprio banco. Se você lançou dados na versão portátil anterior, mantenha a cópia antiga e transfira-os por backup JSON. O ZIP exclui bancos, credenciais locais, programas portáteis e dados de teste.

## Menu, navegador lembrado e privacidade

No tablet ou computador, **Recolher menu** libera espaço no painel. **Mostrar menu** traz a navegação de volta. O navegador guarda essa preferência. Em celulares com largura de até 600 px, a navegação inferior continua disponível.

Ao entrar, **Lembrar de mim** permite retomar a conta nesse navegador por até 30 dias. **Sair da conta** cancela essa autorização no dispositivo. Use a opção em um aparelho pessoal.

Em **Ajustes → Acesso**, confirme a senha da conta e escolha um PIN com pelo menos 6 dígitos ou uma senha de privacidade com pelo menos 8 caracteres (até 72 bytes). A proteção vale para a conta em todos os dispositivos. Abrir, recarregar ou voltar à aba exige desbloqueio. Salve edições antes de sair da aba. A senha principal também desbloqueia o painel caso você esqueça o PIN. Para trocar ou desativar o bloqueio, confirme a senha principal nos ajustes.

O banco guarda o hash do segredo de privacidade e o hash do token de cada navegador lembrado. A exportação financeira exclui essas credenciais. A autorização de desbloqueio fica na memória da página. O servidor verifica essa autorização antes de responder com dados financeiros ou gravar alterações.

**Atualização de bancos existentes:** aplique `database/privacy.sql` no banco do Cifra pelo phpMyAdmin se a conta de serviço tiver permissões limitadas. No XAMPP com permissão de criação, a aplicação cria as duas tabelas automaticamente no primeiro uso autenticado. A migração preserva as contas e os lançamentos existentes.

## Usar os dados do Finance.html

- A versão original e suas instruções estão preservadas na raiz. Os lançamentos da versão antiga pertencem ao navegador e ao perfil onde foram cadastrados.
- Se a versão original já estiver aberta com os dados corretos, use **Ajustes → Dados → Baixar backup** antes de recarregá-la. O original contém uma rotina de reinicialização de estados antigos sem a marca `zerado`. Para esses estados, preserve primeiro a chave `minhas_financas_v2` e as cópias existentes no armazenamento do navegador.
- Guarde o JSON original. No Cifra, exporte também qualquer dado da conta de destino que deseje preservar. Em **Ajustes → Dados → Carregar backup**, selecione a cópia e confira o resumo antes de confirmar a substituição.
- O relatório mostra quantidades e valores de entradas e gastos, pagamentos, categorias e orçamentos. Depois, confira as datas, os gráficos e a caixinha pelos mesmos filtros usados no original.
- A restauração ocorre em uma única transação. Uma linha inválida cancela toda a operação. Importar o mesmo arquivo novamente substitui os mesmos registros. O limite é de 8 MiB por requisição, incluindo o envelope JSON.
- Backups v4 mantêm IDs e datas. Formatos anteriores reconhecidos usam a regra original de dezembro a maio, com prévia do ano-base e ajuste manual de ano. A conversão histórica de Thayna para Social é preservada. Limites conflitantes exigem conferência. O PIN e sua dica são descartados. O acesso online usa a senha da conta.

## Organização e comportamento

| Parte | Arquivos | Responsabilidade |
| --- | --- | --- |
| Telas | `public/index.php`, `public/assets/finance.*` | Painel, lista, filtros, gráficos, limites e ajustes do original |
| Conta e gravações | `public/assets/account.js` | Acesso, carregamento, comandos de alteração, confirmação e falhas |
| Migração | `public/assets/backup.js` | Compatibilidade e conferência de backups |
| API | `public/api/index.php` | Sessões, autenticação, CSRF, limitação de tentativas e revisão da conta |
| Regras e persistência | `app/bootstrap.php`, `app/finance.php` | Validação, consultas PDO e transações |
| Instalação | `database/schema.sql`, `app/first-access.php` | Esquema relacional e criação administrativa da conta |

Cada ocorrência mensal é um lançamento independente. A repetição ajusta o dia ao fim do mês, mantendo como referência a data inicial. O orçamento é um limite contínuo por categoria, aplicado ao gasto de cada mês. Renomear uma categoria atualiza os vínculos de lançamentos e orçamento. A caixinha, os filtros e os gráficos continuam calculados a partir dos lançamentos.

O servidor mantém cada transação no banco com a chave composta de proprietário e ID do backup. A categoria é identificada por proprietário e nome. Os vínculos usam chaves estrangeiras compostas. Perfil visual, preferências e metadados de migração ficam em `user_settings`. Senhas ficam em `users`, com hash próprio do PHP.

A API usa o parâmetro `r` para funcionar sem regras de reescrita. `GET api/index.php?r=auth/me` identifica a sessão. `GET …?r=state` devolve a visão consistente da conta. Comandos de lançamentos, categorias, orçamentos, avisos, preferências, backup e autenticação usam POST JSON. As alterações pedem token CSRF e a revisão vista pelo cliente. Quando outra aba já gravou, a API devolve HTTP 409 e a tela pede uma recarga. Em falhas de conexão, confira o estado recarregado antes de repetir.

Sessões expiram após 30 minutos de inatividade ou 12 horas de duração. O login regenera o identificador e há limite de 12 tentativas por endereço em 15 minutos. Navegar, filtrar e renderizar gráficos apenas consultam o estado em memória. O nome de exibição agora tem um botão **Salvar nome**. O Chart.js é servido junto com o aplicativo.

## Hospedagem

Na hospedagem, configure credenciais próprias com **app/config.local.php** ou as variáveis **CIFRA_DSN**, **CIFRA_DB_USER** e **CIFRA_DB_PASSWORD**. Para uma instalação pública, use HTTPS e aponte a raiz pública para **public/**, deixando **app/** e **database/** fora dela. Configure a conta do banco com SELECT, INSERT, UPDATE e DELETE depois da instalação. O repositório de desenvolvimento inclui **bin/create-user.php** para provisionamento administrativo por terminal, se necessário.

No modo de subpasta do XAMPP, o Apache aplica os arquivos **.htaccess** fornecidos para desabilitar a listagem e proteger as pastas privadas. Mantenha esses arquivos ao extrair. Caso tenha personalizado o Apache, habilite as regras de diretório e autorização para a pasta do projeto. A API e os recursos usam caminhos relativos, sem necessidade de reescrita de URLs.

A definição do domínio público, o certificado, a configuração do servidor de produção e a importação dos dados reais pertencem à etapa de implantação.

## Backup do banco

Para operação pessoal, faça um dump diário e antes de cada migração, com retenção sugerida de sete cópias diárias e quatro semanais. Restrinja o acesso, proteja os arquivos com criptografia no destino e guarde uma cópia fora do computador ou provedor. Essa rotina precisa ser configurada no destino escolhido.

No XAMPP, abra o **phpMyAdmin**, selecione o banco **cifra** e use **Exportar → SQL** para baixar a estrutura e os dados. Guarde a cópia em local privado fora de **htdocs**. Para verificar uma cópia, crie um banco de teste vazio pelo phpMyAdmin e use **Importar** nesse banco.

Teste a restauração mensalmente em um banco separado e vazio. Importe o dump com o cliente MySQL, confira contagens e somas e teste o login em uma instalação apontada para a cópia. O dump contém dados financeiros e hashes de senha. O JSON exportado pelo usuário complementa a cópia operacional.

## Verificação desta versão

Foram usados bancos separados e contas fictícias. A suíte de API cobre login válido e inválido, regeneração de sessão, logout, CSRF, isolamento, registros pagos, edições, exclusões, orçamentos, mudança de ano, conflito de revisão e substituição de backup com rollback. A suíte de navegador cobre as telas desktop e móvel, recorrência de fim de mês, filtros, gráficos, JSON, CSV, importação, falha de rede e navegação sem gravações. Também foram verificados o vencimento da sessão, o bloqueio temporário de login e a restauração de um dump em outro banco.

Para repetir as suítes no ambiente isolado de desenvolvimento, use `node tests/run-local.cjs tests/api.mjs tests/browser.mjs` com o MySQL local em execução. O executor usa o banco privado de testes, cria duas contas fictícias e inicia um servidor temporário. Para outro ambiente, configure `CIFRA_TEST_URL`, `CIFRA_TEST_A`, `CIFRA_TEST_B`, `CIFRA_TEST_PASSWORD` e, para a suíte de navegador, `CIFRA_TEST_CHROME`. Use exclusivamente contas descartáveis em um banco de teste. As suítes alteram essas contas.

O pacote da instalação em subpasta foi verificado no Windows com Apache 2.4.58, PHP 8.2.12 e MariaDB 10.4.32 do XAMPP. Os testes cobriram banco novo, primeiro acesso, bloqueio de um segundo cadastro, login, gravação e leitura após nova sessão, recursos estáticos e restrição das pastas privadas.

A conferência com um backup financeiro real, o acesso de dois dispositivos pela rede de produção e a publicação ficam para a etapa de implantação.

