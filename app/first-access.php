<?php
declare(strict_types=1);
require_once __DIR__ . '/finance.php';

function ownerNeeded(): bool {
    if (!localRequest()) return false;
    try {
        return !query('SELECT EXISTS(SELECT 1 FROM users)')->fetchColumn();
    } catch (PDOException $e) {
        if (in_array((int)($e->errorInfo[1] ?? 0), [1049,1146], true)) return true;
        throw $e;
    }
}

function validateAccount(string $name, string $email, string $password): array {
    $name = requireText(trim($name),30,'nome');
    $email = strtolower(trim($email));
    if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>190) invalid('Informe um e-mail válido.');
    if (strlen($password)<12 || strlen($password)>72 || str_contains($password,"\0")) invalid('Use uma senha de 12 a 72 bytes.');
    return [$name,$email,password_hash($password,PASSWORD_DEFAULT)];
}

function createAccount(string $name, string $email, string $hash): void {
    transaction(function() use ($name,$email,$hash) {
        query('INSERT INTO users(name,email,password_hash) VALUES (?,?,?)',[$name,$email,$hash]);
        $id = (int)db()->lastInsertId();
        query('INSERT INTO user_settings(user_id,preferences) VALUES (?,?)',[$id,jsonText(defaults($name))]);
        $cats = [['Fatura','💳','#e11d2e'],['Empréstimo','🏦','#a855f7'],['Internet','🌐','#06b6d4'],
                 ['Roupas','👕','#ff6b35'],['Lazer','🎮','#f5a524'],['Comida','🍔','#84cc16'],
                 ['Eletrônico','💻','#3b82f6'],['Objeto','📦','#94a3b8'],['Social','🎉','#ec4899']];
        foreach ($cats as $i=>[$n,$ic,$cor]) saveCategory($id,compact('n','ic','cor'),null,$i);
    });
}

function installOwner(array $input): void {
    if (!localRequest()) throw new ApiError(403,'LOCAL_ONLY','O primeiro acesso exige localhost.');
    foreach (['name','email','password'] as $key) {
        if (!is_string($input[$key] ?? null)) invalid('Preencha nome, e-mail e senha.');
    }
    $account = validateAccount($input['name'],$input['email'],$input['password']);
    $config = databaseConfig();
    try {
        db();
    } catch (PDOException $e) {
        if (($e->errorInfo[1] ?? 0) != 1049) throw $e;
        // Only a validated database identifier is interpolated into DDL.
        if (!preg_match('/(?:^mysql:|;)dbname=([A-Za-z0-9_]{1,64})(?=;|$)/i',$config['dsn'],$match)) {
            invalid('Crie o banco configurado pelo phpMyAdmin e tente novamente.');
        }
        $name = $match[1];
        $config['dsn'] = preg_replace('/(?<=[:;])dbname=[^;]+;?/i','',$config['dsn'],1);
        $server = connectDatabase($config);
        $server->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4");
    }
    $lock = 'cifra.owner.'.substr(hash('sha256',(string)query('SELECT DATABASE()')->fetchColumn()),0,48);
    if ((int)query('SELECT GET_LOCK(?,10)',[$lock])->fetchColumn() !== 1) {
        throw new ApiError(409,'INSTALL_BUSY','Outra instalação está em andamento. Atualize a página.');
    }
    try {
        if (!ownerNeeded()) throw new ApiError(409,'INSTALLED','A conta inicial já existe. Atualize a página para entrar.');
        $schema = file_get_contents(dirname(__DIR__).'/database/schema.sql');
        if ($schema === false) throw new RuntimeException('Schema unavailable');
        foreach (explode(';',$schema) as $statement) {
            if (trim($statement) !== '') db()->exec($statement);
        }
        createAccount(...$account);
    } finally {
        query('SELECT RELEASE_LOCK(?)',[$lock]);
    }
}

