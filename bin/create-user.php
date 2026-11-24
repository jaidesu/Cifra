<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
require_once dirname(__DIR__) . '/app/first-access.php';

try {
    if ($argc === 2 && $argv[1] === '--exists') {
        echo query('SELECT EXISTS(SELECT 1 FROM users)')->fetchColumn(), PHP_EOL;
        exit(0);
    }
    if ($argc !== 3) throw new RuntimeException('Uso: php bin/create-user.php email nome (senha pela entrada padrão).');
    $email = strtolower(trim($argv[1]));
    $name = requireText($argv[2],30,'nome');
    if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>190) invalid('E-mail inválido.');
    fwrite(STDERR,"Informe a senha pela entrada padrão.\n");
    $password = rtrim((string)fgets(STDIN),"\r\n");
    createAccount(...validateAccount($name,$email,$password));
    echo "Conta criada.\n";
} catch (Throwable $e) {
    fwrite(STDERR,($e instanceof PDOException ? 'Confira a conexão, o esquema e se o e-mail já está cadastrado.' : $e->getMessage()) . "\n");
    exit(1);
}

