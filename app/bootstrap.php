<?php
declare(strict_types=1);

final class ApiError extends RuntimeException {
    public $status;
    public $label;
    function __construct(int $status, string $label, string $message) {
        parent::__construct($message);
        $this->status = $status;
        $this->label = $label;
    }
}

function invalid(string $message): void {
    throw new ApiError(422, 'VALIDATION_ERROR', $message);
}

function localRequest(): bool {
    $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
    return in_array($_SERVER['REMOTE_ADDR'] ?? '', ['::1','127.0.0.1'], true)
        && preg_match('/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/D',$host) === 1
        && !isset($_SERVER['HTTP_FORWARDED']) && !isset($_SERVER['HTTP_X_FORWARDED_FOR'])
        && !isset($_SERVER['HTTP_X_FORWARDED_HOST']);
}

function databaseConfig(): array {
    if ($dsn = getenv('CIFRA_DSN')) {
        return ['dsn'=>$dsn,'user'=>(string)getenv('CIFRA_DB_USER'),'password'=>(string)getenv('CIFRA_DB_PASSWORD')];
    }
    $file = __DIR__.'/config.local.php';
    if (is_file($file)) return require $file;
    if (localRequest()) return ['dsn'=>'mysql:host=127.0.0.1;port=3306;dbname=cifra;charset=utf8mb4','user'=>'root','password'=>''];
    throw new ApiError(503,'DB_CONFIG','Configure a conexão com o banco em app/config.local.php.');
}

function connectDatabase(array $config): PDO {
    return new PDO($config['dsn'],$config['user'],$config['password'],[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES=>false,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
}

function db(): PDO {
    static $connection;
    return $connection ??= connectDatabase(databaseConfig());
}

function query(string $sql, array $values = []): PDOStatement {
    $stmt = db()->prepare($sql);
    $stmt->execute($values);
    return $stmt;
}

function transaction(callable $work) {
    db()->beginTransaction();
    try {
        $result = $work();
        db()->commit();
        return $result;
    } catch (Throwable $error) {
        db()->rollBack();
        throw $error;
    }
}

function jsonText($value): string {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function requireText($value, int $max, string $field, bool $empty = false): string {
    if (!is_string($value) || preg_match('/[\x00-\x1F\x7F]/u', $value) ||
        !preg_match('/^.{0,' . $max . '}$/usD', $value) || (!$empty && trim($value) === '')) {
        invalid("Confira o campo $field (até $max caracteres).");
    }
    return $value;
}

function money($value): string {
    if (!(is_int($value) || is_float($value) || is_string($value)) ||
        !preg_match('/^\d{1,12}(\.\d{1,2})?$/D', (string)$value) || (float)$value <= 0) {
        invalid('O valor precisa ser positivo, com até duas casas decimais.');
    }
    return number_format((float)$value, 2, '.', '');
}

function recordId($id): int {
    if (!is_int($id) || $id < 1 || $id >= 9007199254740991) invalid('Identificador inválido.');
    return $id;
}

function color($value): string {
    if (!is_string($value) || !preg_match('/^#[0-9a-f]{6}$/iD', $value)) invalid('Cor inválida.');
    return $value;
}

