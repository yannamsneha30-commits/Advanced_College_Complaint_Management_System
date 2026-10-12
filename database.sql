-- ============================================================
-- BET-T Portal — TKR College of Engineering And Technology
-- File: database.sql
-- Run this in phpMyAdmin or MySQL command line
-- Default password for all accounts: tkrcet2024
-- ============================================================

CREATE DATABASE IF NOT EXISTS bett_portal;
USE bett_portal;

-- ── TABLE: departments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    dept_id   INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(10)  NOT NULL UNIQUE,
    dept_name VARCHAR(120) NOT NULL,
    hod_name  VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── TABLE: users ─────────────────────────────────────────────
-- username format : rollno@tkrcet.ac.in  or  empid@tkrcet.ac.in
-- password        : SHA-256 hex of plain password
CREATE TABLE IF NOT EXISTS users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(64)  NOT NULL,
    role        ENUM('student','faculty','classteacher','hod','ao','principal') NOT NULL,
    dept_id     INT,
    section     VARCHAR(5),
    year        TINYINT,
    employee_id VARCHAR(30),
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- ── TABLE: complaints ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id    INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(80)  NOT NULL,
    ai_category     VARCHAR(80)  DEFAULT NULL,
    priority        ENUM('low','medium','high','critical') DEFAULT 'medium',
    status          ENUM('open','in_progress','resolved','closed','escalated') DEFAULT 'open',
    filed_by        INT NOT NULL,
    against_user    INT DEFAULT NULL,
    assigned_to     INT DEFAULT NULL,
    dept_id         INT,
    deadline_days   INT DEFAULT 7,
    attachment_path VARCHAR(255) DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (filed_by)     REFERENCES users(user_id),
    FOREIGN KEY (against_user) REFERENCES users(user_id),
    FOREIGN KEY (assigned_to)  REFERENCES users(user_id),
    FOREIGN KEY (dept_id)      REFERENCES departments(dept_id)
);

-- ── TABLE: complaint_timeline ────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_timeline (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    action_by    INT NOT NULL,
    action_text  TEXT NOT NULL,
    action_type  ENUM('filed','update','resolved','escalated','closed','comment') DEFAULT 'update',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
    FOREIGN KEY (action_by)    REFERENCES users(user_id)
);

-- ── TABLE: messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    from_user  INT NOT NULL,
    to_user    INT NOT NULL,
    message    TEXT NOT NULL,
    is_read    TINYINT(1) DEFAULT 0,
    sent_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user) REFERENCES users(user_id),
    FOREIGN KEY (to_user)   REFERENCES users(user_id)
);

-- ── TABLE: notifications ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    notif_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    message    VARCHAR(300) NOT NULL,
    type       ENUM('complaint','message','escalation','system') DEFAULT 'system',
    is_read    TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ── TABLE: reports ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    report_id    INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    generated_by INT NOT NULL,
    report_type  VARCHAR(30) DEFAULT 'custom',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

-- ════════════════════════════════════════════════════════════
-- SEED: DEPARTMENTS
-- ════════════════════════════════════════════════════════════
INSERT INTO departments (dept_code, dept_name, hod_name) VALUES
('CSE',  'Computer Science & Engineering',          'Dr. A. Suresh Rao'),
('CSD',  'Computer Science & Data Science',               'Dr. V. Krishna'),
('CSM',  'Computer Science & Machine Learning',     'Mrs. Jayalaxmi C'),
('IT',   'Information Technology',                  'Dr. Satya Narayana'),
('CIVIL','Civil Engineering',                        'KVR Satya Sai'),
('ECE',  'Electronics & Communication Engineering', 'M. Mahesh'),
('EEE',  'Electrical & Electronics Engineering',    'K. Raju'),
('MECH', 'Mechanical Engineering',                  'D.V. Ravi Dhankar'),
('MBA',  'Master of Business Administration',       'TBA'),
('ADMIN','Administration',                          'G. L. N. Reddy');

-- ════════════════════════════════════════════════════════════
-- SEED: USERS
-- All passwords = SHA-256("tkrcet2024")
-- = 07973ed63e2ac500dbdf4d314e22ceae9eade5e0374405f4acdf296594801039
-- ════════════════════════════════════════════════════════════
SET @pwd = '07973ed63e2ac500dbdf4d314e22ceae9eade5e0374405f4acdf296594801039';

INSERT INTO users (full_name, username, password, role, dept_id, employee_id) VALUES
('Dr. D.V. Manohar Reddy', 'PRI001@tkrcet.ac.in', @pwd, 'principal', 10, 'PRI001'),
('G. L. N. Reddy',         'AO001@tkrcet.ac.in',  @pwd, 'ao',        10, 'AO001'),
('Dr. A. Suresh Rao',      'HOD001@tkrcet.ac.in', @pwd, 'hod',        1, 'HOD001'),
('Dr. V. Krishna',         'HOD002@tkrcet.ac.in', @pwd, 'hod',        2, 'HOD002'),
('Mrs. Jayalaxmi C',       'HOD003@tkrcet.ac.in', @pwd, 'hod',        3, 'HOD003'),
('Dr. Satya Narayana',     'HOD004@tkrcet.ac.in', @pwd, 'hod',        4, 'HOD004'),
('KVR Satya Sai',          'HOD005@tkrcet.ac.in', @pwd, 'hod',        5, 'HOD005'),
('M. Mahesh',              'HOD006@tkrcet.ac.in', @pwd, 'hod',        6, 'HOD006'),
('K. Raju',                'HOD007@tkrcet.ac.in', @pwd, 'hod',        7, 'HOD007'),
('D.V. Ravi Dhankar',      'HOD008@tkrcet.ac.in', @pwd, 'hod',        8, 'HOD008');

INSERT INTO users (full_name, username, password, role, dept_id, employee_id, section) VALUES
('CH. Gayathri',    'CT001@tkrcet.ac.in', @pwd, 'classteacher', 2, 'CT001', 'D'),
('K. Uma Bharathi', 'CT002@tkrcet.ac.in', @pwd, 'classteacher', 2, 'CT002', 'C'),
('B. Tejaswini',    'CT003@tkrcet.ac.in', @pwd, 'classteacher', 2, 'CT003', 'B'),
('C. Jyothi',       'CT004@tkrcet.ac.in', @pwd, 'classteacher', 2, 'CT004', 'A');

INSERT INTO users (full_name, username, password, role, dept_id, employee_id, section, year) VALUES
('Sample Student (CSD-D)', '24K91A6701@tkrcet.ac.in', @pwd, 'student', 2, '24K91A6701', 'D', 3);

-- ════════════════════════════════════════════════════════════
-- SEED: SAMPLE COMPLAINTS (filed by user_id=16 = student)
-- ════════════════════════════════════════════════════════════
INSERT INTO complaints
  (title, description, category, ai_category, priority, status, filed_by, assigned_to, dept_id, deadline_days, created_at)
VALUES
('CSD Lab 2 Computers Non-Functional',
 'All 20 computers in CSD Lab 2 have been non-functional for over 3 weeks. Practical sessions are being cancelled.',
 'Infrastructure','Infrastructure','high','open', 16, 4, 2, 5, DATE_SUB(NOW(), INTERVAL 3 DAY)),

('Attendance Mismatch in Student Portal',
 'Portal shows 62% attendance but the physical register maintained by class teacher shows 78%. This is affecting my exam eligibility.',
 'Attendance','Attendance','medium','in_progress', 16, 11, 2, 7, DATE_SUB(NOW(), INTERVAL 6 DAY)),

('Library Reference Books Not Available',
 'The CLRS (Cormen) reference book for Data Structures is not available in the library before semester exams.',
 'Library / Lab','Library / Lab','low','resolved', 16, 2, 2, 14, DATE_SUB(NOW(), INTERVAL 12 DAY)),

('Faculty Using Inappropriate Language',
 'A faculty member used offensive language during the lecture on Monday. Multiple students are witnesses. Requesting immediate action.',
 'Faculty Conduct','Faculty Conduct','critical','escalated', 16, 4, 2, 3, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Timelines
INSERT INTO complaint_timeline (complaint_id, action_by, action_text, action_type) VALUES
(1, 16, 'Complaint filed by student', 'filed'),
(1,  4, 'Received by HOD CSD. Forwarding to Admin Officer for inspection.', 'update'),
(2, 16, 'Complaint filed by student', 'filed'),
(2, 11, 'Attendance records currently under review.', 'update'),
(3, 16, 'Complaint filed by student', 'filed'),
(3,  2, 'Books have been procured and added to library shelves.', 'resolved'),
(4, 16, 'Complaint filed by student', 'filed'),
(4,  4, 'AUTO-ESCALATED: Deadline of 3 days exceeded. Escalated to Admin Officer.', 'escalated');

-- Messages
INSERT INTO messages (from_user, to_user, message) VALUES
(16, 11, 'Ma''am, can we discuss my attendance records privately?'),
(11, 16, 'Sure, I will check the register and get back to you tomorrow.'),
( 4,  1, 'Principal sir, CSD infrastructure issues need urgent attention.'),
( 1,  4, 'Noted. Please schedule a meeting with AO this Friday.');

-- Notifications
INSERT INTO notifications (user_id, message, type) VALUES
(16, 'Your complaint "Library Books" has been resolved.', 'complaint'),
(16, 'Complaint #4 auto-escalated (deadline exceeded).', 'escalation'),
(16, 'New message from CH. Gayathri.', 'message'),
( 4, 'New complaint assigned: CSD Lab 2 Computers Non-Functional', 'complaint');

-- ════════════════════════════════════════════════════════════
-- USEFUL VIEWS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_complaints AS
SELECT c.*,
  u1.full_name AS filed_by_name,   u1.role AS filed_by_role,
  u2.full_name AS against_name,
  u3.full_name AS assigned_to_name,
  d.dept_code,  d.dept_name,
  DATEDIFF(DATE_ADD(c.created_at, INTERVAL c.deadline_days DAY), NOW()) AS days_left
FROM complaints c
LEFT JOIN users u1 ON c.filed_by     = u1.user_id
LEFT JOIN users u2 ON c.against_user = u2.user_id
LEFT JOIN users u3 ON c.assigned_to  = u3.user_id
LEFT JOIN departments d ON c.dept_id = d.dept_id;

CREATE OR REPLACE VIEW v_overdue AS
SELECT * FROM v_complaints
WHERE status NOT IN ('resolved','closed') AND days_left < 0;

CREATE OR REPLACE VIEW v_dept_stats AS
SELECT d.dept_code, d.dept_name,
  COUNT(c.complaint_id)              AS total,
  SUM(c.status='open')               AS open_c,
  SUM(c.status='resolved')           AS resolved_c,
  SUM(c.priority='critical')         AS critical_c
FROM departments d
LEFT JOIN complaints c ON d.dept_id = c.dept_id
GROUP BY d.dept_id;

-- ════════════════════════════════════════════════════════════
-- AUTO-ESCALATION STORED PROCEDURE
-- Schedule via cron: mysql -u root bett_portal -e "CALL auto_escalate();"
-- ════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS auto_escalate;
DELIMITER $$
CREATE PROCEDURE auto_escalate()
BEGIN
  UPDATE complaints
  SET status = 'escalated', updated_at = NOW()
  WHERE status IN ('open','in_progress')
    AND DATE_ADD(created_at, INTERVAL deadline_days DAY) < NOW();

  INSERT INTO complaint_timeline (complaint_id, action_by, action_text, action_type)
  SELECT complaint_id, 1,
    'AUTO-ESCALATED: Deadline exceeded. System escalated this complaint.',
    'escalated'
  FROM complaints
  WHERE status = 'escalated'
    AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    AND complaint_id NOT IN (
      SELECT DISTINCT complaint_id FROM complaint_timeline
      WHERE action_type = 'escalated'
        AND action_text LIKE 'AUTO-ESCALATED%'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    );
END$$
DELIMITER ;
