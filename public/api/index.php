<?php
declare(strict_types=1);
require_once dirname(__DIR__,2) . '/app/first-access.php';

require_once dirname(__DIR__,2) . '/app/privacy.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors','0');

function expired(): void {
    throw new ApiError(401,'UNAUTHENTICATED','Entre novamente para acessar sua conta.');
}

function clearSession(): void {
    $_SESSION = [];
    $cookie = session_get_cookie_params();
    setcookie(session_name(), '', ['expires'=>1,'path'=>$cookie['path'],'secure'=>$cookie['secure'],'httponly'=>true,'samesite'=>'Lax']);
    session_destroy();
}

function signedUser(): ?array {
    if (!isset($_SESSION['uid'])) return null;
    if (time()-$_SESSION['last'] >= 1800 || time()-$_SESSION['start'] >= 43200) {
        session_regenerate_id(true);
        // The page keeps its token, so it can still sign out or resume the remembered browser.
        $_SESSION = ['csrf'=>$_SESSION['csrf'] ?? bin2hex(random_bytes(32))];
        return null;
    }
    $user = query("SELECT id,name,email FROM users WHERE id=? AND status='active'",[$_SESSION['uid']])->fetch();
    if (!$user) { clearSession(); expired(); }
    $_SESSION['last'] = time();
    return $user;
}

function reserveAttempt(string $bucket): void {
    $now = time();
    // Reserve the attempt under a row lock, including concurrent requests.
    transaction(function() use ($bucket,$now) {
        query('DELETE FROM login_attempts WHERE started<=?',[$now-900]);
        query('INSERT INTO login_attempts(bucket,attempts,started) VALUES (?,0,?) ON DUPLICATE KEY UPDATE bucket=?',[$bucket,$now,$bucket]);
        $count = query('SELECT attempts FROM login_attempts WHERE bucket=? FOR UPDATE',[$bucket])->fetchColumn();
        if ($count >= 12) throw new ApiError(429,'TOO_MANY_ATTEMPTS','Muitas tentativas. Tente novamente em 15 minutos.');
        query('UPDATE login_attempts SET attempts=attempts+1 WHERE bucket=?',[$bucket]);
    });
}

function login(array $input): array {
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    if (!is_string($email) || strlen($email)>190 || !is_string($password) || strlen($password)>1024) invalid('Credenciais inválidas.');
    $email = strtolower(trim($email));
    $bucket = hash('sha256',$_SERVER['REMOTE_ADDR'] ?? 'local');
    reserveAttempt($bucket);
    $user = query('SELECT id,password_hash,status FROM users WHERE email=?',[$email])->fetch();
    $dummy = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    if (!password_verify($password,$user['password_hash'] ?? $dummy) || !$user || $user['status'] !== 'active') {
        throw new ApiError(401,'INVALID_LOGIN','E-mail ou senha incorretos.');
    }
    query('DELETE FROM login_attempts WHERE bucket=?',[$bucket]);
    forgetDevice();
    $uid = (int)$user['id'];
    $protected = panelHash($uid) !== '';
    if (($input['remember'] ?? false) === true) rememberDevice($uid);
    beginLogin($uid);
    // The account password also unlocks the panel, so a fresh login does not ask for the PIN.
    return ['user'=>signedUser(),'csrf'=>$_SESSION['csrf'],'protected'=>$protected,
        'proof'=>$protected ? panelProof(panelHash($uid)) : ''];
}

function dispatch(): array {
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $local = localRequest();
    if (!$https && !$local) {
        throw new ApiError(403,'HTTPS_REQUIRED','Use HTTPS para acessar o Cifra.');
    }
    session_name('cifra_' . substr(hash('sha256',__DIR__),0,16));
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    ini_set('session.gc_maxlifetime','1800');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$https,'httponly'=>true,'samesite'=>'Lax']);
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $route = $_GET['r'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    $user = signedUser();
    if (!$user && $route === 'auth/me' && $method === 'GET') {
        resumeDevice();
        $user = signedUser();
    }
    $hash = $user ? panelHash((int)$user['id']) : '';
    if ($method === 'GET' && $route === 'auth/me') return ['user'=>$user,'csrf'=>$_SESSION['csrf'],'protected'=>$hash !== '','setup'=>!$user && ownerNeeded()];
    if ($route === 'auth/logout' && $method === 'POST') {
        if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new ApiError(403,'CSRF','Atualize a página e tente novamente.');
        forgetDevice();
        clearSession();
        return [];
    }
    if (!$user && !in_array($route,['auth/login','auth/register','setup/owner'],true)) expired();
    $uid = (int)($user['id'] ?? 0);
    if ($hash !== '' && !in_array($route,['auth/unlock','auth/logout','auth/login'],true)
        && !hash_equals(panelProof($hash),$_SERVER['HTTP_X_PANEL_PROOF'] ?? '')) {
        throw new ApiError(423,'PANEL_LOCKED','Desbloqueie o painel para continuar.');
    }
    if ($method === 'GET' && $route === 'state') return transaction(fn()=>snapshot($uid));
    if ($method !== 'POST') throw new ApiError(405,'METHOD','Método não permitido.');
    if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new ApiError(403,'CSRF','Atualize a página e tente novamente.');
    if (strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') throw new ApiError(415,'CONTENT_TYPE','Envie JSON.');
    $raw = file_get_contents('php://input',false,null,0,8388609);
    if (strlen($raw)>8388608) throw new ApiError(413,'TOO_LARGE','O arquivo excede o limite de 8 MiB.');
    try { $input = json_decode($raw,true,64,JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { invalid('JSON inválido.'); }
    if (!is_array($input) || array_key_exists('user_id',$input)) invalid('Requisição inválida.');
    if ($route === 'setup/owner') {
        if ($local && ownerNeeded()) installOwner($input);
        else registerAccount($input);
        return ['created'=>true];
    }
    if ($route === 'auth/register') {
        registerAccount($input);
        return ['created'=>true];
    }
    if ($route === 'auth/login') return login($input);
    if ($route === 'auth/unlock' && $hash !== '') return unlockPanel($uid,$hash,$input);
    if ($route === 'auth/privacy') return configurePanel($uid,$input);
    return transaction(function () use ($uid,$route,$input) {
        $account = query('SELECT revision,next_id FROM users WHERE id=? FOR UPDATE',[$uid])->fetch();
        if (($input['revision'] ?? null) !== (int)$account['revision']) {
            throw new ApiError(409,'STALE','Os dados mudaram. Recarregue a página e confira antes de repetir a alteração.');
        }
        foreach (listValue($input['expiredKeys'] ?? [],'avisos expirados') as $key) {
            query('DELETE FROM dismissed_notifications WHERE user_id=? AND notification_key=?',[$uid,requireText($key,190,'aviso')]);
        }
        applyChange($uid,$route,$input,(int)$account['next_id']);
        query('UPDATE users SET revision=revision+1 WHERE id=?',[$uid]);
        return snapshot($uid);
    });
}

try {
    echo jsonText(['success'=>true,'data'=>dispatch()]);
} catch (Throwable $error) {
    if (localRequest() && $error instanceof PDOException) {
        $code = (int)($error->errorInfo[1] ?? 0);
        if (in_array($code,[1044,1045,1142],true)) $error = new ApiError(503,'DB_ACCESS','Confira o usuário, a senha e as permissões do MySQL em app/config.local.php.');
        elseif (in_array($code,[2002,2003,2006],true)) $error = new ApiError(503,'DB_OFFLINE','Inicie o MySQL no XAMPP e confira a porta da conexão.');
        elseif (!in_array('mysql',PDO::getAvailableDrivers(),true)) $error = new ApiError(503,'DB_DRIVER','Ative a extensão pdo_mysql no PHP do XAMPP e reinicie o Apache.');
    }
    $known = $error instanceof ApiError;
    http_response_code($known ? $error->status : 500);
    if (!$known) error_log('Cifra: falha interna (' . get_class($error) . ').');
    echo jsonText(['success'=>false,'error'=>['code'=>$known ? $error->label : 'INTERNAL_ERROR',
        'message'=>$known ? $error->getMessage() : 'Serviço indisponível. Confira a configuração do servidor.']]);
}

