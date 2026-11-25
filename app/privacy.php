<?php
declare(strict_types=1);

// Existing installations can also apply this additive migration in phpMyAdmin.
function accessQuery(string $sql, array $args): PDOStatement {
    try { return query($sql,$args); }
    catch (PDOException $error) {
        if ((int)($error->errorInfo[1] ?? 0) !== 1146) throw $error;
        $schema = file_get_contents(dirname(__DIR__).'/database/privacy.sql');
        if ($schema === false) throw new RuntimeException('Missing privacy schema');
        foreach (explode(';',$schema) as $statement) {
            if (trim($statement) !== '') db()->exec($statement);
        }
        return query($sql,$args);
    }
}

function rememberName(): string { return session_name().'_device'; }

function rememberCookie(string $token, int $expires): void {
    $cookie = session_get_cookie_params();
    setcookie(rememberName(),$token,['expires'=>$expires,'path'=>rtrim(dirname($_SERVER['SCRIPT_NAME']),'/').'/',
        'secure'=>$cookie['secure'],'httponly'=>true,'samesite'=>'Lax']);
}

function forgetDevice(): void {
    $token = $_COOKIE[rememberName()] ?? '';
    if (!$token) return;
    accessQuery('DELETE FROM remembered_devices WHERE token_hash=?',[hash('sha256',$token)]);
    rememberCookie('',1);
    unset($_COOKIE[rememberName()]);
}

function rememberDevice(int $uid): void {
    $token = bin2hex(random_bytes(32));
    $expires = time()+30*86400;
    accessQuery('DELETE FROM remembered_devices WHERE expires_at<=?',[time()]);
    accessQuery('INSERT INTO remembered_devices(token_hash,user_id,expires_at) VALUES (?,?,?)',
        [hash('sha256',$token),$uid,$expires]);
    rememberCookie($token,$expires);
}

function beginLogin(int $uid): void {
    session_regenerate_id(true);
    $_SESSION = ['uid'=>$uid,'start'=>time(),'last'=>time(),'csrf'=>bin2hex(random_bytes(32))];
}

function resumeDevice(): void {
    $token = $_COOKIE[rememberName()] ?? '';
    if (!is_string($token) || !preg_match('/^[0-9a-f]{64}$/D',$token)) return;
    $uid = accessQuery("SELECT d.user_id FROM remembered_devices d JOIN users u ON u.id=d.user_id
        WHERE d.token_hash=? AND d.expires_at>? AND u.status='active'",[hash('sha256',$token),time()])->fetchColumn();
    if ($uid) beginLogin((int)$uid);
    else forgetDevice();
}

function panelHash(int $uid): string {
    return (string)accessQuery('SELECT secret_hash FROM panel_locks WHERE user_id=?',[$uid])->fetchColumn();
}

// The page keeps this proof only in memory. A new page must unlock again.
function panelProof(string $hash): string {
    return hash_hmac('sha256',$hash,$_SESSION['csrf']);
}

function verifyAccountPassword(int $uid, $password): bool {
    if (!is_string($password) || strlen($password)>1024 || str_contains($password,"\0")) return false;
    $hash = query('SELECT password_hash FROM users WHERE id=?',[$uid])->fetchColumn();
    return $hash && password_verify($password,$hash);
}

function unlockPanel(int $uid,string $hash,array $input): array {
    $key = hash('sha256','panel:'.$uid);
    reserveAttempt($key);
    $secret = $input['secret'] ?? null;
    if (!is_string($secret) || strlen($secret)>1024 || str_contains($secret,"\0") ||
        !(password_verify($secret,$hash) || verifyAccountPassword($uid,$secret))) {
        throw new ApiError(403,'WRONG_SECRET','PIN ou senha incorretos.');
    }
    query('DELETE FROM login_attempts WHERE bucket=?',[$key]);
    return ['proof'=>panelProof($hash)];
}

function configurePanel(int $uid,array $input): array {
    $key = hash('sha256','configure:'.$uid);
    reserveAttempt($key);
    if (!verifyAccountPassword($uid,$input['password'] ?? null)) throw new ApiError(403,'WRONG_PASSWORD','Senha da conta incorreta.');
    $secret = $input['secret'] ?? null;
    if (!is_string($secret) || strlen($secret)>72 || str_contains($secret,"\0")) invalid('Credencial de privacidade inválida.');
    if ($secret === '') {
        accessQuery('DELETE FROM panel_locks WHERE user_id=?',[$uid]);
    } else {
        $valid = ctype_digit($secret) ? strlen($secret)>=6 : preg_match('/^.{8,}$/usD',$secret);
        if (!$valid) invalid('Use pelo menos 6 dígitos no PIN ou 8 caracteres na senha (até 72 bytes).');
        $hash = password_hash($secret,PASSWORD_DEFAULT);
        accessQuery('INSERT INTO panel_locks(user_id,secret_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE secret_hash=?',[$uid,$hash,$hash]);
    }
    query('DELETE FROM login_attempts WHERE bucket=?',[$key]);
    return ['enabled'=>$secret!=='','proof'=>$secret!=='' ? panelProof($hash) : ''];
}
