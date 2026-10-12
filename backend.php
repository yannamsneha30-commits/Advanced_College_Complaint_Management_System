<?php
// ============================================================
// BET-T Portal — TKR College of Engineering And Technology
// File: backend.php
// All frontend JS files call: fetch('backend.php?action=...')
// Password hashing: SHA-256 via hash('sha256', $password)
// Default password for all accounts: tkrcet2024
// ============================================================

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

// ── DB Config (change these to match your XAMPP setup) ──────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');           // XAMPP default = empty
define('DB_NAME', 'bett_portal');

// ── Role hierarchy for escalation ───────────────────────────
$HIERARCHY = ['student','faculty','classteacher','hod','ao','principal'];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function db() {
    static $c = null;
    if (!$c) {
        $c = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($c->connect_error) {
            echo json_encode(['success'=>false,'message'=>'DB connection failed: '.$c->connect_error]);
            exit;
        }
        $c->set_charset('utf8mb4');
    }
    return $c;
}

function ok($data = [], $msg = 'OK') {
    echo json_encode(['success'=>true, 'message'=>$msg, 'data'=>$data]);
    exit;
}
function fail($msg) {
    echo json_encode(['success'=>false, 'message'=>$msg, 'data'=>null]);
    exit;
}
function body() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}
function auth() {
    if (empty($_SESSION['uid'])) fail('Not logged in. Please login first.');
}
function hashpwd($p) {
    return hash('sha256', $p);   // same algorithm as JS crypto.subtle SHA-256
}

// Auto-escalate overdue complaints (runs silently on each authority login)
function autoEscalate() {
    $db = db();
    $db->query("
        UPDATE complaints
        SET status='escalated', updated_at=NOW()
        WHERE status IN ('open','in_progress')
          AND DATE_ADD(created_at, INTERVAL deadline_days DAY) < NOW()
    ");
    // Add timeline entries for newly escalated
    $res = $db->query("
        SELECT c.complaint_id FROM complaints c
        WHERE c.status='escalated'
          AND c.updated_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
          AND c.complaint_id NOT IN (
              SELECT complaint_id FROM complaint_timeline
              WHERE action_text LIKE 'AUTO-ESCALATED%'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
          )
    ");
    while ($row = $res->fetch_assoc()) {
        $cid = $row['complaint_id'];
        $db->query("
            INSERT INTO complaint_timeline (complaint_id, action_by, action_text, action_type)
            VALUES ($cid, 1, 'AUTO-ESCALATED: Deadline exceeded. Escalated by system.', 'escalated')
        ");
    }
}

// Smart AI category from keywords
function smartCategory($title, $desc) {
    $text = strtolower($title . ' ' . $desc);
    $map = [
        'Examination'   => ['exam','grade','mark','result','paper','revaluat','evaluat'],
        'Attendance'    => ['attend','bunk','absent','shortage','present','period'],
        'Infrastructure'=> ['lab','computer','equipment','projector','chair','room','fan','ac','power','broken'],
        'Library / Lab' => ['library','book','journal','reference','digital'],
        'Fee Related'   => ['fee','fine','payment','challan','refund','scholarship'],
        'Faculty Conduct'=>['faculty','teacher','professor','conduct','behav','language','rude','insult'],
        'Harassment'    => ['harass','bully','abuse','discriminat','threat','fear','unsafe'],
        'Facility'      => ['hostel','canteen','bus','transport','toilet','water','wifi','network'],
    ];
    foreach ($map as $cat => $keywords) {
        foreach ($keywords as $kw) {
            if (str_contains($text, $kw)) return $cat;
        }
    }
    return 'General';
}

// ════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════
$in     = body();
$action = $_GET['action'] ?? $in['action'] ?? '';

switch ($action) {

// ── AUTH ────────────────────────────────────────────────────

    case 'login':
        $username = trim($in['username'] ?? '');
        $password = trim($in['password'] ?? '');
        if (!$username || !$password) fail('Username and password are required.');

        $hashed = hashpwd($password);
        $db     = db();
        $stmt   = $db->prepare(
            "SELECT u.*, d.dept_code, d.dept_name
             FROM users u
             LEFT JOIN departments d ON u.dept_id = d.dept_id
             WHERE u.username = ? AND u.password = ? AND u.is_active = 1"
        );
        $stmt->bind_param('ss', $username, $hashed);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!$user) fail('Invalid username or password. Please check and try again.');

        $_SESSION['uid']   = $user['user_id'];
        $_SESSION['role']  = $user['role'];
        $_SESSION['uname'] = $user['full_name'];

        // Run auto-escalation when authority logs in
        if (in_array($user['role'], ['hod','ao','principal'])) autoEscalate();

        unset($user['password']);
        ok($user, 'Login successful.');
        break;

    case 'register':
        $name     = trim($in['full_name']   ?? '');
        $username = trim($in['username']    ?? '');
        $password = trim($in['password']    ?? '');
        $role     = trim($in['role']        ?? '');
        $dept_id  = (int)($in['dept_id']    ?? 0);
        $empid    = trim($in['employee_id'] ?? '');
        $section  = trim($in['section']     ?? '');
        $year     = (int)($in['year']       ?? 0);

        $allowed_roles = ['student','faculty','classteacher','hod','ao','principal'];
        if (!$name || !$username || !$password || !$role) fail('Please fill all required fields.');
        if (!in_array($role, $allowed_roles)) fail('Invalid role selected.');
        if (!str_ends_with($username, '@tkrcet.ac.in')) fail('Username must end with @tkrcet.ac.in');
        if (strlen($password) < 6) fail('Password must be at least 6 characters.');

        $db   = db();
        $chk  = $db->prepare('SELECT user_id FROM users WHERE username = ?');
        $chk->bind_param('s', $username); $chk->execute();
        if ($chk->get_result()->num_rows > 0) fail('This username is already registered.');

        $hashed  = hashpwd($password);
        $dept_v  = $dept_id  ?: null;
        $year_v  = $year     ?: null;

        $stmt = $db->prepare(
            "INSERT INTO users (full_name, username, password, role, dept_id, employee_id, section, year)
             VALUES (?,?,?,?,?,?,?,?)"
        );
        $stmt->bind_param('ssssissi', $name,$username,$hashed,$role,$dept_v,$empid,$section,$year_v);
        if (!$stmt->execute()) fail('Registration failed. Please try again.');

        $uid = $db->insert_id;
        $_SESSION['uid']   = $uid;
        $_SESSION['role']  = $role;
        $_SESSION['uname'] = $name;

        // Fetch dept info for response
        $d = null;
        if ($dept_v) {
            $ds = $db->prepare('SELECT dept_code, dept_name FROM departments WHERE dept_id = ?');
            $ds->bind_param('i', $dept_v); $ds->execute();
            $d = $ds->get_result()->fetch_assoc();
        }
        ok(['user_id'=>$uid,'full_name'=>$name,'role'=>$role,'username'=>$username,
            'dept_id'=>$dept_v,'dept_code'=>$d['dept_code']??'','dept_name'=>$d['dept_name']??'',
            'section'=>$section,'year'=>$year_v,'employee_id'=>$empid], 'Account created.');
        break;

    case 'logout':
        session_destroy();
        ok([], 'Logged out successfully.');
        break;

    case 'check_session':
        if (empty($_SESSION['uid'])) fail('No active session.');
        $db   = db();
        $uid  = $_SESSION['uid'];
        $stmt = $db->prepare(
            "SELECT u.*, d.dept_code, d.dept_name
             FROM users u LEFT JOIN departments d ON u.dept_id=d.dept_id
             WHERE u.user_id = ?"
        );
        $stmt->bind_param('i', $uid); $stmt->execute();
        $u = $stmt->get_result()->fetch_assoc();
        if (!$u) fail('Session user not found.');
        unset($u['password']);
        ok($u);
        break;

// ── REFERENCE DATA ───────────────────────────────────────────

    case 'get_departments':
        $rows = db()->query('SELECT * FROM departments ORDER BY dept_code')->fetch_all(MYSQLI_ASSOC);
        ok($rows);
        break;

    case 'get_users':
        auth();
        $uid  = $_SESSION['uid'];
        $stmt = db()->prepare(
            "SELECT u.user_id, u.full_name, u.username, u.role, u.section,
                    d.dept_code, d.dept_name
             FROM users u LEFT JOIN departments d ON u.dept_id=d.dept_id
             WHERE u.user_id != ? ORDER BY u.role, u.full_name"
        );
        $stmt->bind_param('i', $uid); $stmt->execute();
        ok($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        break;

// ── COMPLAINTS ───────────────────────────────────────────────

    case 'file_complaint':
        auth();
        $uid   = $_SESSION['uid'];
        $title = trim($in['title']       ?? '');
        $desc  = trim($in['description'] ?? '');
        $cat   = trim($in['category']    ?? '');
        $pri   = $in['priority'] ?? 'medium';
        $dead  = (int)($in['deadline_days'] ?? 7);
        $ag    = !empty($in['against_user']) ? (int)$in['against_user'] : null;
        $ass   = !empty($in['assigned_to'])  ? (int)$in['assigned_to']  : null;
        $dept  = !empty($in['dept_id'])      ? (int)$in['dept_id']      : null;

        if (!$title || !$desc) fail('Title and description are required.');
        if (strlen($desc) < 20) fail('Description must be at least 20 characters.');

        $ai_cat = smartCategory($title, $desc);

        // Auto-assign to HOD of dept if no assignee picked
        $db = db();
        if (!$ass && $dept) {
            $r   = $db->query("SELECT user_id FROM users WHERE role='hod' AND dept_id=$dept LIMIT 1");
            $row = $r->fetch_assoc();
            if ($row) $ass = $row['user_id'];
        }

        $stmt = $db->prepare(
            "INSERT INTO complaints
             (title,description,category,ai_category,priority,filed_by,against_user,assigned_to,dept_id,deadline_days)
             VALUES (?,?,?,?,?,?,?,?,?,?)"
        );
        $stmt->bind_param('sssssiiiis',$title,$desc,$cat,$ai_cat,$pri,$uid,$ag,$ass,$dept,$dead);
        // Fix: correct type string length = 10 chars for 10 params
        $stmt = $db->prepare(
            "INSERT INTO complaints
             (title,description,category,ai_category,priority,filed_by,against_user,assigned_to,dept_id,deadline_days)
             VALUES (?,?,?,?,?,?,?,?,?,?)"
        );
        $stmt->bind_param('sssssiiiii',$title,$desc,$cat,$ai_cat,$pri,$uid,$ag,$ass,$dept,$dead);
        if (!$stmt->execute()) fail('Failed to save complaint: '.$db->error);

        $cid   = $db->insert_id;
        $uname = $_SESSION['uname'];
        $db->query("INSERT INTO complaint_timeline (complaint_id,action_by,action_text,action_type)
                    VALUES ($cid,$uid,'Complaint filed by $uname','filed')");

        if ($ass) {
            $db->query("INSERT INTO notifications (user_id,message,type)
                        VALUES ($ass,'New complaint assigned: $title','complaint')");
        }
        ok(['complaint_id'=>$cid,'ai_category'=>$ai_cat], 'Complaint filed successfully.');
        break;

    case 'get_complaints':
        auth();
        $uid    = $_SESSION['uid'];
        $role   = $_SESSION['role'];
        $filter = trim($in['filter'] ?? 'all');
        $search = '%'.trim($in['search'] ?? '').'%';
        $high   = ['principal','ao','hod'];
        $db     = db();

        if (in_array($role, $high)) {
            $sql  = "SELECT c.*,
                       u1.full_name AS filed_by_name,
                       u2.full_name AS against_name,
                       u3.full_name AS assigned_to_name,
                       d.dept_code,
                       DATEDIFF(DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY),NOW()) AS days_left
                     FROM complaints c
                     LEFT JOIN users u1 ON c.filed_by=u1.user_id
                     LEFT JOIN users u2 ON c.against_user=u2.user_id
                     LEFT JOIN users u3 ON c.assigned_to=u3.user_id
                     LEFT JOIN departments d ON c.dept_id=d.dept_id
                     WHERE (c.title LIKE ? OR c.category LIKE ?)";
            $t = [$search,$search]; $ty = 'ss';
        } else {
            $sql  = "SELECT c.*,
                       u1.full_name AS filed_by_name,
                       u2.full_name AS against_name,
                       u3.full_name AS assigned_to_name,
                       d.dept_code,
                       DATEDIFF(DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY),NOW()) AS days_left
                     FROM complaints c
                     LEFT JOIN users u1 ON c.filed_by=u1.user_id
                     LEFT JOIN users u2 ON c.against_user=u2.user_id
                     LEFT JOIN users u3 ON c.assigned_to=u3.user_id
                     LEFT JOIN departments d ON c.dept_id=d.dept_id
                     WHERE (c.filed_by=? OR c.assigned_to=? OR c.against_user=?)
                       AND (c.title LIKE ? OR c.category LIKE ?)";
            $t = [$uid,$uid,$uid,$search,$search]; $ty = 'iiiss';
        }

        $valid = ['open','in_progress','resolved','closed','escalated'];
        if ($filter !== 'all' && in_array($filter, $valid)) {
            $sql .= ' AND c.status=?'; $t[] = $filter; $ty .= 's';
        } elseif ($filter === 'critical') {
            $sql .= " AND c.priority='critical'";
        } elseif ($filter === 'overdue') {
            $sql .= " AND c.status NOT IN ('resolved','closed')
                      AND DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY) < NOW()";
        }
        $sql .= ' ORDER BY c.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->bind_param($ty, ...$t);
        $stmt->execute();
        ok($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        break;

    case 'complaint_detail':
        auth();
        $cid  = (int)($in['complaint_id'] ?? 0);
        $db   = db();
        $stmt = $db->prepare(
            "SELECT c.*,
               u1.full_name AS filed_by_name,
               u2.full_name AS against_name,
               u3.full_name AS assigned_to_name,
               d.dept_code, d.dept_name,
               DATEDIFF(DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY),NOW()) AS days_left
             FROM complaints c
             LEFT JOIN users u1 ON c.filed_by=u1.user_id
             LEFT JOIN users u2 ON c.against_user=u2.user_id
             LEFT JOIN users u3 ON c.assigned_to=u3.user_id
             LEFT JOIN departments d ON c.dept_id=d.dept_id
             WHERE c.complaint_id=?"
        );
        $stmt->bind_param('i',$cid); $stmt->execute();
        $c = $stmt->get_result()->fetch_assoc();
        if (!$c) fail('Complaint not found.');

        $tl = $db->query(
            "SELECT t.*, u.full_name AS by_name
             FROM complaint_timeline t
             LEFT JOIN users u ON t.action_by=u.user_id
             WHERE t.complaint_id=$cid ORDER BY t.created_at ASC"
        )->fetch_all(MYSQLI_ASSOC);

        ok(['complaint'=>$c,'timeline'=>$tl]);
        break;

    case 'update_status':
        auth();
        $uid    = $_SESSION['uid'];
        $uname  = $_SESSION['uname'];
        $role   = $_SESSION['role'];
        $cid    = (int)($in['complaint_id'] ?? 0);
        $status = $in['status'] ?? '';
        $valid  = ['open','in_progress','resolved','closed','escalated'];
        if (!in_array($status, $valid)) fail('Invalid status.');
        if (!in_array($role, ['hod','ao','principal','classteacher','faculty'])) fail('Permission denied.');

        $db = db();
        $db->query("UPDATE complaints SET status='$status', updated_at=NOW() WHERE complaint_id=$cid");
        $db->query("INSERT INTO complaint_timeline (complaint_id,action_by,action_text,action_type)
                    VALUES ($cid,$uid,'Status set to \"$status\" by $uname','$status')");

        $r   = $db->query("SELECT filed_by, title FROM complaints WHERE complaint_id=$cid");
        $row = $r->fetch_assoc();
        if ($row) {
            $filer = $row['filed_by']; $t = $db->real_escape_string($row['title']);
            $db->query("INSERT INTO notifications (user_id,message,type)
                        VALUES ($filer,'Your complaint \"$t\" status changed to: $status','complaint')");
        }
        ok([], 'Status updated to '.$status.'.');
        break;

    case 'add_comment':
        auth();
        $uid   = $_SESSION['uid'];
        $uname = $_SESSION['uname'];
        $cid   = (int)($in['complaint_id'] ?? 0);
        $cmnt  = trim($in['comment'] ?? '');
        if (!$cmnt) fail('Comment cannot be empty.');
        $cmnt_esc = db()->real_escape_string($cmnt);
        db()->query("INSERT INTO complaint_timeline (complaint_id,action_by,action_text,action_type)
                     VALUES ($cid,$uid,'$cmnt_esc — $uname','comment')");
        ok([], 'Comment added.');
        break;

    case 'escalate':
        auth();
        global $HIERARCHY;
        $uid   = $_SESSION['uid'];
        $uname = $_SESSION['uname'];
        $role  = $_SESSION['role'];
        $cid   = (int)($in['complaint_id'] ?? 0);

        $idx = array_search($role, $HIERARCHY);
        if ($idx === false || $idx >= count($HIERARCHY)-1) fail('You cannot escalate further — already at top level.');

        $nextRole = $HIERARCHY[$idx+1];
        $db       = db();
        $r        = $db->query("SELECT user_id, full_name FROM users WHERE role='$nextRole' LIMIT 1");
        $next     = $r->fetch_assoc();
        if (!$next) fail('No user found for role: '.$nextRole);

        $nextId   = $next['user_id'];
        $nextName = $next['full_name'];
        $db->query("UPDATE complaints SET status='escalated', assigned_to=$nextId, updated_at=NOW()
                    WHERE complaint_id=$cid");
        $db->query("INSERT INTO complaint_timeline (complaint_id,action_by,action_text,action_type)
                    VALUES ($cid,$uid,'Escalated to $nextRole ($nextName) by $uname','escalated')");
        $db->query("INSERT INTO notifications (user_id,message,type)
                    VALUES ($nextId,'Complaint #$cid has been escalated to you.','escalation')");
        ok([], 'Escalated to '.$nextRole.' ('.$nextName.').');
        break;

// ── MESSAGES ─────────────────────────────────────────────────

    case 'send_message':
        auth();
        $from = $_SESSION['uid'];
        $to   = (int)($in['to_user']  ?? 0);
        $msg  = trim($in['message']   ?? '');
        if (!$to || !$msg)  fail('Recipient and message are required.');
        if ($from === $to)  fail('You cannot send a message to yourself.');
        $msg_esc = db()->real_escape_string($msg);
        $uname   = db()->real_escape_string($_SESSION['uname']);
        db()->query("INSERT INTO messages (from_user,to_user,message) VALUES ($from,$to,'$msg_esc')");
        $mid = db()->insert_id;
        db()->query("INSERT INTO notifications (user_id,message,type)
                     VALUES ($to,'New private message from $uname','message')");
        ok(['message_id'=>$mid], 'Message sent.');
        break;

    case 'get_inbox':
        auth();
        $uid  = $_SESSION['uid'];
        $db   = db();
        $stmt = $db->prepare(
            "SELECT m.from_user, m.to_user, m.message, m.sent_at, m.is_read,
                    u1.full_name AS from_name, u1.role AS from_role,
                    u2.full_name AS to_name,   u2.role AS to_role
             FROM messages m
             LEFT JOIN users u1 ON m.from_user=u1.user_id
             LEFT JOIN users u2 ON m.to_user=u2.user_id
             WHERE m.from_user=? OR m.to_user=?
             ORDER BY m.sent_at DESC"
        );
        $stmt->bind_param('ii',$uid,$uid); $stmt->execute();
        $all   = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $convs = [];
        foreach ($all as $m) {
            $oid  = ($m['from_user']==$uid) ? $m['to_user']   : $m['from_user'];
            $on   = ($m['from_user']==$uid) ? $m['to_name']   : $m['from_name'];
            $or_  = ($m['from_user']==$uid) ? $m['to_role']   : $m['from_role'];
            if (!isset($convs[$oid])) {
                $convs[$oid] = ['other_id'=>$oid,'other_name'=>$on,'other_role'=>$or_,
                                'last_msg'=>$m['message'],'last_time'=>$m['sent_at'],'unread'=>0];
            }
            if ($m['to_user']==$uid && !$m['is_read']) $convs[$oid]['unread']++;
        }
        ok(array_values($convs));
        break;

    case 'get_conversation':
        auth();
        $uid   = $_SESSION['uid'];
        $other = (int)($in['other_user'] ?? 0);
        $db    = db();
        $stmt  = $db->prepare(
            "SELECT m.*, u.full_name AS sender_name
             FROM messages m
             LEFT JOIN users u ON m.from_user=u.user_id
             WHERE (m.from_user=? AND m.to_user=?) OR (m.from_user=? AND m.to_user=?)
             ORDER BY m.sent_at ASC"
        );
        $stmt->bind_param('iiii',$uid,$other,$other,$uid); $stmt->execute();
        $msgs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $db->query("UPDATE messages SET is_read=1 WHERE to_user=$uid AND from_user=$other");
        ok($msgs);
        break;

// ── NOTIFICATIONS ────────────────────────────────────────────

    case 'get_notifications':
        auth();
        $uid  = $_SESSION['uid'];
        $stmt = db()->prepare(
            "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30"
        );
        $stmt->bind_param('i',$uid); $stmt->execute();
        ok($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        break;

    case 'mark_read':
        auth();
        $uid = $_SESSION['uid'];
        db()->query("UPDATE notifications SET is_read=1 WHERE user_id=$uid");
        ok([], 'Marked as read.');
        break;

// ── STATS & REPORTS ──────────────────────────────────────────

    case 'get_stats':
        auth();
        $uid  = $_SESSION['uid'];
        $role = $_SESSION['role'];
        $high = ['principal','ao','hod'];
        $db   = db();

        $where = in_array($role,$high) ? '' : "WHERE (c.filed_by=$uid OR c.assigned_to=$uid)";

        $cnt = [];
        foreach (['open','in_progress','resolved','closed','escalated'] as $s) {
            $q = $where ? "$where AND c.status='$s'" : "WHERE c.status='$s'";
            $cnt[$s] = (int)$db->query("SELECT COUNT(*) AS n FROM complaints c $q")->fetch_assoc()['n'];
        }
        $q2 = $where ? "$where AND c.priority='critical'" : "WHERE c.priority='critical'";
        $cnt['critical'] = (int)$db->query("SELECT COUNT(*) AS n FROM complaints c $q2")->fetch_assoc()['n'];
        $cnt['total']    = (int)$db->query("SELECT COUNT(*) AS n FROM complaints c $where")->fetch_assoc()['n'];

        $cnt['unread_messages'] = (int)$db->query("SELECT COUNT(*) n FROM messages WHERE to_user=$uid AND is_read=0")->fetch_assoc()['n'];
        $cnt['unread_notifs']   = (int)$db->query("SELECT COUNT(*) n FROM notifications WHERE user_id=$uid AND is_read=0")->fetch_assoc()['n'];

        $q3 = $where ? "$where AND c.status NOT IN ('resolved','closed') AND DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY)<NOW()"
                     : "WHERE c.status NOT IN ('resolved','closed') AND DATE_ADD(c.created_at,INTERVAL c.deadline_days DAY)<NOW()";
        $cnt['overdue'] = (int)$db->query("SELECT COUNT(*) n FROM complaints c $q3")->fetch_assoc()['n'];

        $cats = $db->query("SELECT category, COUNT(*) AS cnt FROM complaints GROUP BY category ORDER BY cnt DESC")->fetch_all(MYSQLI_ASSOC);
        $cnt['by_category'] = $cats;

        ok($cnt);
        break;

    case 'admin_users':
        auth();
        if (!in_array($_SESSION['role'],['hod','ao','principal'])) fail('Access denied.');
        $rows = db()->query(
            "SELECT u.user_id,u.full_name,u.username,u.role,u.employee_id,u.section,u.year,d.dept_code,d.dept_name
             FROM users u LEFT JOIN departments d ON u.dept_id=d.dept_id ORDER BY u.role,u.full_name"
        )->fetch_all(MYSQLI_ASSOC);
        ok($rows);
        break;

    default:
        fail('Unknown action: ' . htmlspecialchars($action));
}
?>
