<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

function defaults(string $name = ''): array {
    return ['cfg' => ['tema'=>'escuro', 'cor'=>'#e11d2e', 'tom'=>'neutro', 'diasAviso'=>5,
                      'avVenc'=>true, 'avOrc'=>true, 'avSaldo'=>true, 'avNav'=>false],
            'perfil'=>['nome'=>$name, 'avatar'=>'inicial']];
}

function preferences(array $input): array {
    $cfg = $input['cfg'] ?? null;
    $profile = $input['perfil'] ?? null;
    if (!is_array($cfg) || !is_array($profile)) invalid('Preferências inválidas.');
    $result = defaults();
    foreach (['tema'=>['escuro','claro','auto'], 'tom'=>['neutro','azul','violeta','musgo','cafe'],
              'diasAviso'=>[1,2,3,5,7,10,15]] as $key=>$choices) {
        if (!in_array($cfg[$key] ?? null, $choices, true)) invalid('Preferência inválida: ' . $key);
        $result['cfg'][$key] = $cfg[$key];
    }
    $result['cfg']['cor'] = color($cfg['cor'] ?? null);
    foreach (['avVenc','avOrc','avSaldo','avNav'] as $key) {
        if (!is_bool($cfg[$key] ?? null)) invalid('Preferência de aviso inválida.');
        $result['cfg'][$key] = $cfg[$key];
    }
    $result['perfil'] = ['nome'=>requireText($profile['nome'] ?? null, 30, 'nome', true),
                        'avatar'=>requireText($profile['avatar'] ?? null, 32, 'avatar')];
    if (isset($input['anoMigracao'])) {
        if (!is_int($input['anoMigracao']) || $input['anoMigracao'] < 1000 || $input['anoMigracao'] > 9999) invalid('Ano de migração inválido.');
        $result['anoMigracao'] = $input['anoMigracao'];
    }
    if (isset($input['migradoDe'])) {
        if ($input['migradoDe'] !== 3 || !isset($result['anoMigracao'])) invalid('Origem da migração inválida.');
        $result['migradoDe'] = 3;
    }
    return $result;
}

function category($row): array {
    if (!is_array($row)) invalid('Categoria inválida.');
    $n = requireText($row['n'] ?? null, 100, 'categoria');
    if ($n !== trim($n) || strcasecmp($n,'Entrada') === 0 || in_array($n,['__proto__','constructor','prototype'],true)) invalid('Nome de categoria reservado ou inválido.');
    return ['n'=>$n,'ic'=>requireText($row['ic'] ?? null, 32, 'ícone'),'cor'=>color($row['cor'] ?? null)];
}

function ensureCategory(int $uid, $name): void {
    if (!is_string($name) || !query('SELECT 1 FROM categories WHERE user_id=? AND name=?', [$uid,$name])->fetchColumn()) {
        invalid('A categoria selecionada não existe nesta conta.');
    }
}

function saveCategory(int $uid, $row, ?string $old, int $pos): void {
    $c = category($row);
    $existing = query('SELECT name FROM categories WHERE user_id=? AND LOWER(name)=LOWER(?)', [$uid,$c['n']])->fetchColumn();
    if ($existing !== false && $existing !== $old) invalid('Esse nome de categoria já existe.');
    if ($old !== null) {
        ensureCategory($uid, $old);
        query('UPDATE categories SET name=?,icon=?,color=? WHERE user_id=? AND name=?', [$c['n'],$c['ic'],$c['cor'],$uid,$old]);
    } else {
        query('INSERT INTO categories(user_id,name,icon,color,position) VALUES (?,?,?,?,?)', [$uid,$c['n'],$c['ic'],$c['cor'],$pos]);
    }
}

function entry($row): array {
    if (!is_array($row) || !in_array($row['tipo'] ?? null,['entrada','gasto'],true)) invalid('Tipo de lançamento inválido.');
    $date = $row['data'] ?? null;
    if (!is_string($date) || !preg_match('/^([1-9]\d{3})-(\d{2})-(\d{2})$/D',$date,$m) || !checkdate((int)$m[2],(int)$m[3],(int)$m[1])) invalid('Data de lançamento inválida.');
    $paid = $row['pago'] ?? null;
    $income = $row['tipo'] === 'entrada';
    if (!is_bool($paid) || ($income && $paid)) invalid('Situação de pagamento inválida.');
    if ($income && ($row['cat'] ?? null) !== 'Entrada') invalid('Categoria de entrada inválida.');
    return [$row['tipo'], $income ? null : requireText($row['cat'] ?? null,100,'categoria'),
            requireText($row['desc'] ?? null,255,'descrição',true),money($row['valor'] ?? null),$date,(int)$paid];
}

function saveEntry(int $uid, int $id, $row, bool $edit): void {
    $fields = entry($row);
    if ($fields[1] !== null) ensureCategory($uid, $fields[1]);
    $values = array_merge($fields, [$uid,$id]);
    if ($edit) {
        if (!query('SELECT 1 FROM transactions WHERE user_id=? AND id=?',[$uid,$id])->fetchColumn()) invalid('Lançamento não encontrado.');
        query('UPDATE transactions SET type=?,category_name=?,description=?,amount=?,transaction_date=?,is_paid=? WHERE user_id=? AND id=?',$values);
    } else {
        query('INSERT INTO transactions(type,category_name,description,amount,transaction_date,is_paid,user_id,id) VALUES (?,?,?,?,?,?,?,?)',$values);
    }
}

function saveBudget(int $uid, $name, $value): void {
    ensureCategory($uid,$name);
    if ($value === null) {
        query('DELETE FROM budgets WHERE user_id=? AND category_name=?',[$uid,$name]);
    } else {
        $amount = money($value);
        query('INSERT INTO budgets(user_id,category_name,amount) VALUES (?,?,?) ON DUPLICATE KEY UPDATE amount=?',[$uid,$name,$amount,$amount]);
    }
}

function setPreferences(int $uid, array $prefs): void {
    query('UPDATE user_settings SET preferences=? WHERE user_id=?',[jsonText(preferences($prefs)),$uid]);
}

function snapshot(int $uid): array {
    $account = query('SELECT revision,next_id FROM users WHERE id=? LOCK IN SHARE MODE',[$uid])->fetch();
    $prefs = json_decode(query('SELECT preferences FROM user_settings WHERE user_id=?',[$uid])->fetchColumn(),true,512,JSON_THROW_ON_ERROR);
    $cats = query('SELECT name AS n,icon AS ic,color AS cor FROM categories WHERE user_id=? ORDER BY position,name',[$uid])->fetchAll();
    $lanc = [];
    foreach (query('SELECT id,type,category_name,description,amount,transaction_date,is_paid FROM transactions WHERE user_id=? ORDER BY id',[$uid]) as $r) {
        $lanc[] = ['id'=>(int)$r['id'],'tipo'=>$r['type'],'cat'=>$r['category_name'] ?? 'Entrada','desc'=>$r['description'],
                   'valor'=>(float)$r['amount'],'data'=>$r['transaction_date'],'pago'=>(bool)$r['is_paid']];
    }
    $budgets = query('SELECT category_name,amount FROM budgets WHERE user_id=?',[$uid])->fetchAll(PDO::FETCH_KEY_PAIR);
    $disp = query('SELECT notification_key FROM dismissed_notifications WHERE user_id=? ORDER BY notification_key',[$uid])->fetchAll(PDO::FETCH_COLUMN);
    return ['revision'=>(int)$account['revision'],'state'=>$prefs + ['ver'=>4,'zerado'=>true,'nid'=>(int)$account['next_id'],
            'cats'=>$cats,'lanc'=>$lanc,'orc'=>(object)array_map('floatval',$budgets),'disp'=>$disp]];
}

function listValue($value, string $label): array {
    if (!is_array($value) || !array_is_list($value)) invalid("Lista inválida: $label.");
    return $value;
}

function dismiss(int $uid, $keys): void {
    foreach (listValue($keys,'avisos') as $key) {
        requireText($key,190,'aviso');
        query('INSERT INTO dismissed_notifications(user_id,notification_key) VALUES (?,?) ON DUPLICATE KEY UPDATE notification_key=?',[$uid,$key,$key]);
    }
}

function restore(int $uid, $data): void {
    if (!is_array($data) || ($data['ver'] ?? null) !== 4) invalid('Formato de backup incompatível.');
    $cats = listValue($data['cats'] ?? null,'categorias');
    $rows = listValue($data['lanc'] ?? null,'lançamentos');
    if (!is_array($data['orc'] ?? null)) invalid('Orçamentos inválidos.');
    $next = recordId($data['nid'] ?? null);
    query('DELETE FROM transactions WHERE user_id=?',[$uid]);
    query('DELETE FROM categories WHERE user_id=?',[$uid]);
    query('DELETE FROM dismissed_notifications WHERE user_id=?',[$uid]);
    foreach ($cats as $pos=>$cat) saveCategory($uid,$cat,null,$pos);
    $seen = [];
    foreach ($rows as $i=>$row) {
        try {
            $id = recordId($row['id'] ?? null);
            if (isset($seen[$id]) || $id >= $next) invalid('ID duplicado ou contador incompatível.');
            $seen[$id] = true;
            saveEntry($uid,$id,$row,false);
        } catch (ApiError $error) { invalid('Lançamento ' . ($i+1) . ': ' . $error->getMessage()); }
    }
    foreach ($data['orc'] as $name=>$amount) saveBudget($uid,(string)$name,$amount);
    dismiss($uid,$data['disp'] ?? null);
    setPreferences($uid,$data);
    query('UPDATE users SET next_id=? WHERE id=?',[$next,$uid]);
}

function applyChange(int $uid, string $route, array $p, int $next): void {
    switch ($route) {
    case 'transactions/add':
        $rows = listValue($p['rows'] ?? null,'lançamentos');
        if (!$rows || count($rows)>24) invalid('Escolha entre 1 e 24 ocorrências.');
        foreach ($rows as $row) saveEntry($uid,$next++,$row,false);
        query('UPDATE users SET next_id=? WHERE id=?',[$next,$uid]);
        break;
    case 'transactions/undo':
        $id = recordId($p['id'] ?? null);
        if ($id >= $next || query('SELECT 1 FROM transactions WHERE user_id=? AND id=?',[$uid,$id])->fetchColumn()) invalid('Esse lançamento não pode ser recuperado.');
        saveEntry($uid,$id,$p['row'] ?? null,false);
        break;
    case 'transactions/edit':
        saveEntry($uid,recordId($p['id'] ?? null),$p['row'] ?? null,true);
        break;
    case 'transactions/delete':
        if (!query('DELETE FROM transactions WHERE user_id=? AND id=?',[$uid,recordId($p['id'] ?? null)])->rowCount()) invalid('Lançamento não encontrado.');
        break;
    case 'transactions/shift':
        $years = $p['years'] ?? null;
        if (!in_array($years,[-1,1],true)) invalid('Deslocamento inválido.');
        $edge = $years < 0 ? 1000 : 9999;
        if (query('SELECT 1 FROM transactions WHERE user_id=? AND YEAR(transaction_date)=? LIMIT 1',[$uid,$edge])->fetchColumn()) invalid('O deslocamento ultrapassa o intervalo de datas.');
        query('UPDATE transactions SET transaction_date=DATE_ADD(transaction_date,INTERVAL ? YEAR) WHERE user_id=?',[$years,$uid]);
        $prefs = currentPreferences($uid);
        if (isset($prefs['anoMigracao'])) { $prefs['anoMigracao'] += $years; setPreferences($uid,$prefs); }
        break;
    case 'transactions/clear':
        query('DELETE FROM transactions WHERE user_id=?',[$uid]);
        query('DELETE FROM dismissed_notifications WHERE user_id=?',[$uid]);
        $prefs = currentPreferences($uid);
        unset($prefs['migradoDe'],$prefs['anoMigracao']);
        setPreferences($uid,$prefs);
        break;
    case 'categories/add':
        $pos = (int)query('SELECT COALESCE(MAX(position)+1,0) FROM categories WHERE user_id=?',[$uid])->fetchColumn();
        saveCategory($uid,$p['category'] ?? null,null,$pos);
        break;
    case 'categories/edit':
        saveCategory($uid,$p['category'] ?? null,requireText($p['name'] ?? null,100,'categoria'),0);
        break;
    case 'categories/delete':
        $name = $p['name'] ?? null;
        ensureCategory($uid,$name);
        if (query('SELECT 1 FROM transactions WHERE user_id=? AND category_name=? LIMIT 1',[$uid,$name])->fetchColumn()) invalid('Mude os lançamentos para outra categoria antes de apagar.');
        query('DELETE FROM categories WHERE user_id=? AND name=?',[$uid,$name]);
        break;
    case 'budgets/set':
        if (!array_key_exists('amount',$p)) invalid('Informe o limite.');
        saveBudget($uid,$p['name'] ?? null,$p['amount']);
        break;
    case 'settings/set':
        $prefs = currentPreferences($uid);
        foreach (['cfg','perfil'] as $group) {
            if (isset($p[$group])) {
                if (!is_array($p[$group]) || array_diff_key($p[$group],$prefs[$group])) invalid('Preferência desconhecida.');
                $prefs[$group] = array_replace($prefs[$group],$p[$group]);
            }
        }
        setPreferences($uid,$prefs);
        break;
    case 'notifications/dismiss':
        dismiss($uid,$p['keys'] ?? null);
        break;
    case 'backup/restore':
        restore($uid,$p['backup'] ?? null);
        break;
    default:
        throw new ApiError(404,'NOT_FOUND','Operação desconhecida.');
    }
}

function currentPreferences(int $uid): array {
    return json_decode(query('SELECT preferences FROM user_settings WHERE user_id=?',[$uid])->fetchColumn(),true,512,JSON_THROW_ON_ERROR);
}

