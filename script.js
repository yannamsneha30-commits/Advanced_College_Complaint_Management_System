// ============================================================
// BET-T Portal — TKR College of Engineering And Technology
// File: script.js   (linked from index.html via <script src="script.js">)
// Works in two modes:
//   1. WITH PHP server (XAMPP): calls backend.php
//   2. WITHOUT server (open index.html directly): uses localStorage demo
// ============================================================

'use strict';

// ── CORRECT SHA-256 of "tkrcet2024" ─────────────────────────
// Verified: crypto.createHash('sha256').update('tkrcet2024').digest('hex')
const CORRECT_HASH = '07973ed63e2ac500dbdf4d314e22ceae9eade5e0374405f4acdf296594801039';

// ── College Info ─────────────────────────────────────────────
const COLLEGE = {
  name:      'TKR College of Engineering And Technology',
  code:      'TKRCET',
  portal:    'BET-T Portal',
  location:  'Meerpet, LB Nagar, Hyderabad',
  principal: 'Dr. D.V. Manohar Reddy',
  ao:        'G. L. N. Reddy',
  dean:      'Dr. A. Suresh Rao'
};

const DEPTS = [
  { id:1, code:'CSE',  name:'Computer Science & Engineering',          hod:'Dr. A. Suresh Rao' },
  { id:2, code:'CSD',  name:'Computer Science & Data Science',               hod:'Dr. V. Krishna' },
  { id:3, code:'CSM',  name:'Computer Science & Machine Learning',     hod:'Mrs. Jayalaxmi C' },
  { id:4, code:'IT',   name:'Information Technology',                  hod:'Dr. Satya Narayana' },
  { id:5, code:'CIVIL',name:'Civil Engineering',                        hod:'KVR Satya Sai' },
  { id:6, code:'ECE',  name:'Electronics & Communication Engineering', hod:'M. Mahesh' },
  { id:7, code:'EEE',  name:'Electrical & Electronics Engineering',    hod:'K. Raju' },
  { id:8, code:'MECH', name:'Mechanical Engineering',                  hod:'D.V. Ravi Dhankar' },
  { id:9, code:'MBA',  name:'Master of Business Administration',       hod:'TBA' }
];

const ROLES = {
  student:      { label:'Student',       icon:'🎓', color:'#2563a8' },
  faculty:      { label:'Faculty',       icon:'📚', color:'#7c3aed' },
  classteacher: { label:'Class Teacher', icon:'🏫', color:'#059669' },
  hod:          { label:'HOD',           icon:'🏛️', color:'#d97706' },
  ao:           { label:'Admin Officer', icon:'📋', color:'#dc2626' },
  principal:    { label:'Principal',     icon:'👑', color:'#1a3a5c' }
};

const HIERARCHY = ['student','faculty','classteacher','hod','ao','principal'];

const AI_KEYWORDS = {
  'Examination':    ['exam','grade','mark','result','paper','evaluat','revaluat'],
  'Attendance':     ['attend','bunk','absent','shortage','present','period'],
  'Infrastructure': ['lab','computer','equipment','projector','chair','room','fan','ac','power','broken'],
  'Library / Lab':  ['library','book','journal','reference'],
  'Fee Related':    ['fee','fine','payment','challan','refund','scholarship'],
  'Faculty Conduct':['faculty','teacher','professor','conduct','behav','language','rude','insult'],
  'Harassment':     ['harass','bully','abuse','discriminat','threat','unsafe'],
  'Facility':       ['hostel','canteen','bus','transport','toilet','water','wifi']
};

// ── State ────────────────────────────────────────────────────
let CU          = null;   // current user object
let selRole_    = '';     // selected role during register
let selPri_     = 'medium';
let curFilter_  = 'all';
let activeConv_ = null;

// ════════════════════════════════════════════════════════════
// SHA-256 (browser SubtleCrypto — works without any library)
// ════════════════════════════════════════════════════════════
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ════════════════════════════════════════════════════════════
// DEMO DATABASE (localStorage — used when no PHP server)
// ════════════════════════════════════════════════════════════
const DB = {
  get users()       { return JSON.parse(localStorage.getItem('bt_users')  || '[]'); },
  set users(v)      { localStorage.setItem('bt_users',  JSON.stringify(v)); },
  get complaints()  { return JSON.parse(localStorage.getItem('bt_compl')  || '[]'); },
  set complaints(v) { localStorage.setItem('bt_compl',  JSON.stringify(v)); },
  get messages()    { return JSON.parse(localStorage.getItem('bt_msgs')   || '[]'); },
  set messages(v)   { localStorage.setItem('bt_msgs',   JSON.stringify(v)); },
  get notifs()      { return JSON.parse(localStorage.getItem('bt_notifs') || '[]'); },
  set notifs(v)     { localStorage.setItem('bt_notifs', JSON.stringify(v)); }
};

function seedDemo() {
  if (DB.users.length > 0) return;   // already seeded

  // All passwords = SHA-256("tkrcet2024") = 07973ed6...
  const P = CORRECT_HASH;
  const now = Date.now();

  DB.users = [
    { user_id:1,  full_name:'Dr. D.V. Manohar Reddy', username:'PRI001@tkrcet.ac.in', password:P, role:'principal',    dept_code:'ADMIN', dept_name:'Administration',                     employee_id:'PRI001' },
    { user_id:2,  full_name:'G. L. N. Reddy',          username:'AO001@tkrcet.ac.in',  password:P, role:'ao',           dept_code:'ADMIN', dept_name:'Administration',                     employee_id:'AO001'  },
    { user_id:3,  full_name:'Dr. A. Suresh Rao',       username:'HOD001@tkrcet.ac.in', password:P, role:'hod',          dept_code:'CSE',   dept_name:'Computer Science & Engineering',     employee_id:'HOD001', dept_id:1 },
    { user_id:4,  full_name:'Dr. V. Krishna',          username:'HOD002@tkrcet.ac.in', password:P, role:'hod',          dept_code:'CSD',   dept_name:'Computer Science & Data Science',          employee_id:'HOD002', dept_id:2 },
    { user_id:5,  full_name:'Mrs. Jayalaxmi C',        username:'HOD003@tkrcet.ac.in', password:P, role:'hod',          dept_code:'CSM',   dept_name:'CS & Machine Learning',              employee_id:'HOD003', dept_id:3 },
    { user_id:6,  full_name:'Dr. Satya Narayana',      username:'HOD004@tkrcet.ac.in', password:P, role:'hod',          dept_code:'IT',    dept_name:'Information Technology',              employee_id:'HOD004', dept_id:4 },
    { user_id:7,  full_name:'KVR Satya Sai',           username:'HOD005@tkrcet.ac.in', password:P, role:'hod',          dept_code:'CIVIL', dept_name:'Civil Engineering',                   employee_id:'HOD005', dept_id:5 },
    { user_id:8,  full_name:'M. Mahesh',               username:'HOD006@tkrcet.ac.in', password:P, role:'hod',          dept_code:'ECE',   dept_name:'Electronics & Comm Engineering',     employee_id:'HOD006', dept_id:6 },
    { user_id:9,  full_name:'K. Raju',                 username:'HOD007@tkrcet.ac.in', password:P, role:'hod',          dept_code:'EEE',   dept_name:'Electrical & Electronics Engg',      employee_id:'HOD007', dept_id:7 },
    { user_id:10, full_name:'D.V. Ravi Dhankar',       username:'HOD008@tkrcet.ac.in', password:P, role:'hod',          dept_code:'MECH',  dept_name:'Mechanical Engineering',              employee_id:'HOD008', dept_id:8 },
    { user_id:11, full_name:'CH. Gayathri',            username:'CT001@tkrcet.ac.in',  password:P, role:'classteacher', dept_code:'CSD',   dept_name:'Computer Science & Data Science', section:'D', employee_id:'CT001', dept_id:2 },
    { user_id:12, full_name:'K. Uma Bharathi',         username:'CT002@tkrcet.ac.in',  password:P, role:'classteacher', dept_code:'CSD',   dept_name:'Computer Science & Data Science', section:'C', employee_id:'CT002', dept_id:2 },
    { user_id:13, full_name:'B. Tejaswini',            username:'CT003@tkrcet.ac.in',  password:P, role:'classteacher', dept_code:'CSD',   dept_name:'Computer Science & Data Science', section:'B', employee_id:'CT003', dept_id:2 },
    { user_id:14, full_name:'C. Jyothi',               username:'CT004@tkrcet.ac.in',  password:P, role:'classteacher', dept_code:'CSD',   dept_name:'Computer Science & Data Science', section:'A', employee_id:'CT004', dept_id:2 },
    { user_id:15, full_name:'Sample Student (CSD-D)',  username:'24K91A6701@tkrcet.ac.in', password:P, role:'student',  dept_code:'CSD',   dept_name:'Computer Science & Data Science', section:'D', year:3, employee_id:'24K91A6701', dept_id:2 }
  ];

  DB.complaints = [
    {
      complaint_id:1, title:'CSD Lab 2 Computers Non-Functional',
      description:'All 20 computers in CSD Lab 2 have been non-functional for over 3 weeks. Practical sessions are being cancelled and our exam preparation is being affected.',
      category:'Infrastructure', ai_category:'Infrastructure', priority:'high', status:'open',
      filed_by:15, filed_by_name:'Sample Student (CSD-D)', against_user:null, against_name:null,
      assigned_to:4, assigned_to_name:'Dr. V. Krishna', dept_code:'CSD', deadline_days:5,
      days_left:2, created_at:new Date(now-86400000*3).toISOString(),
      timeline:[
        { by_name:'Sample Student (CSD-D)', action_text:'Complaint filed', action_type:'filed', created_at:new Date(now-86400000*3).toISOString() },
        { by_name:'Dr. V. Krishna', action_text:'Received. Forwarding to Admin Officer for inspection.', action_type:'update', created_at:new Date(now-86400000*2).toISOString() }
      ]
    },
    {
      complaint_id:2, title:'Attendance Mismatch in Student Portal',
      description:'My attendance shown in the student portal is 62% but the physical register maintained by the class teacher shows 78%. This discrepancy is affecting my exam eligibility.',
      category:'Attendance', ai_category:'Attendance', priority:'medium', status:'in_progress',
      filed_by:15, filed_by_name:'Sample Student (CSD-D)', against_user:null, against_name:null,
      assigned_to:11, assigned_to_name:'CH. Gayathri', dept_code:'CSD', deadline_days:7,
      days_left:1, created_at:new Date(now-86400000*6).toISOString(),
      timeline:[
        { by_name:'Sample Student (CSD-D)', action_text:'Complaint filed', action_type:'filed', created_at:new Date(now-86400000*6).toISOString() },
        { by_name:'CH. Gayathri', action_text:'Attendance records are under review. Will update by end of week.', action_type:'update', created_at:new Date(now-86400000*1).toISOString() }
      ]
    },
    {
      complaint_id:3, title:'Library Reference Books Not Available',
      description:'The CLRS (Cormen) reference book for Data Structures is not available in the library. Multiple students need it before the semester exams.',
      category:'Library / Lab', ai_category:'Library / Lab', priority:'low', status:'resolved',
      filed_by:15, filed_by_name:'Sample Student (CSD-D)', against_user:null, against_name:null,
      assigned_to:2, assigned_to_name:'G. L. N. Reddy', dept_code:'CSD', deadline_days:14,
      days_left:99, created_at:new Date(now-86400000*12).toISOString(),
      timeline:[
        { by_name:'Sample Student (CSD-D)', action_text:'Complaint filed', action_type:'filed', created_at:new Date(now-86400000*12).toISOString() },
        { by_name:'G. L. N. Reddy', action_text:'Books have been procured and added to library shelves.', action_type:'resolved', created_at:new Date(now-86400000*3).toISOString() }
      ]
    },
    {
      complaint_id:4, title:'Faculty Using Inappropriate Language',
      description:'A faculty member used offensive and inappropriate language during the Monday lecture. Multiple students are witnesses. This is creating an uncomfortable learning environment.',
      category:'Faculty Conduct', ai_category:'Faculty Conduct', priority:'critical', status:'escalated',
      filed_by:15, filed_by_name:'Sample Student (CSD-D)', against_user:null, against_name:null,
      assigned_to:4, assigned_to_name:'Dr. V. Krishna', dept_code:'CSD', deadline_days:3,
      days_left:-2, created_at:new Date(now-86400000*5).toISOString(),
      timeline:[
        { by_name:'Sample Student (CSD-D)', action_text:'Complaint filed', action_type:'filed', created_at:new Date(now-86400000*5).toISOString() },
        { by_name:'System', action_text:'AUTO-ESCALATED: Deadline of 3 days exceeded. System escalated to next authority.', action_type:'escalated', created_at:new Date(now-86400000*2).toISOString() }
      ]
    }
  ];

  DB.messages = [
    { message_id:1, from_user:15, to_user:11, from_name:'Sample Student (CSD-D)', to_name:'CH. Gayathri', message:"Ma'am, can we discuss my attendance records privately?", sent_at:new Date(now-3600000*3).toISOString(), is_read:true },
    { message_id:2, from_user:11, to_user:15, from_name:'CH. Gayathri', to_name:'Sample Student (CSD-D)', message:'Sure, I will check the register and get back to you tomorrow morning.', sent_at:new Date(now-3600000*2).toISOString(), is_read:false },
    { message_id:3, from_user:4,  to_user:1,  from_name:'Dr. V. Krishna', to_name:'Dr. D.V. Manohar Reddy', message:'Principal sir, CSD infrastructure issues need urgent attention.', sent_at:new Date(now-3600000*5).toISOString(), is_read:true },
    { message_id:4, from_user:1,  to_user:4,  from_name:'Dr. D.V. Manohar Reddy', to_name:'Dr. V. Krishna', message:'Noted. Please schedule a meeting with AO this Friday.', sent_at:new Date(now-3600000*4).toISOString(), is_read:false }
  ];

  DB.notifs = [
    { notif_id:1, user_id:15, message:'Your complaint "Library Books" has been resolved.', type:'complaint', is_read:false, created_at:new Date(now-3600000*24).toISOString() },
    { notif_id:2, user_id:15, message:'Complaint #4 auto-escalated — deadline exceeded.', type:'escalation', is_read:false, created_at:new Date(now-3600000*12).toISOString() },
    { notif_id:3, user_id:15, message:'New message from CH. Gayathri.', type:'message', is_read:false, created_at:new Date(now-3600000*2).toISOString() }
  ];
}

// ════════════════════════════════════════════════════════════
// SEED COMPLAINTS FOR ANY LOGGED-IN USER
// Called after every login so every user always has sample
// complaints in all statuses (open, in_progress, resolved, escalated)
// Data is stored in localStorage — persists across re-logins
// ════════════════════════════════════════════════════════════
function seedUserComplaints(user) {
  if (!user) return;
  const existing = DB.complaints.filter(c => c.filed_by === user.user_id);
  if (existing.length > 0) return;   // already has complaints — never overwrite

  const now  = Date.now();
  const uid  = user.user_id;
  const uname = user.full_name;
  const dept  = user.dept_code || 'CSD';

  // Find appropriate authorities to assign to
  const users    = DB.users;
  const hod      = users.find(u => u.role === 'hod'          && u.dept_id === user.dept_id) || users.find(u => u.role === 'hod');
  const ct       = users.find(u => u.role === 'classteacher'  && u.dept_id === user.dept_id) || users.find(u => u.role === 'classteacher');
  const ao       = users.find(u => u.role === 'ao');
  const principal= users.find(u => u.role === 'principal');

  const assignHOD = hod ? { id: hod.user_id, name: hod.full_name } : { id: null, name: 'Auto-Assigned' };
  const assignCT  = ct  ? { id: ct.user_id,  name: ct.full_name  } : assignHOD;
  const assignAO  = ao  ? { id: ao.user_id,  name: ao.full_name  } : assignHOD;

  const newComplaints = [
    // 1. OPEN — Infrastructure
    {
      complaint_id: now + 1,
      title: `${dept} Lab Computers Non-Functional`,
      description: `Several computers in the ${dept} laboratory have been non-functional for the past two weeks. Practical sessions are being disrupted and our exam preparation is severely affected. Requesting urgent repair or replacement.`,
      category: 'Infrastructure', ai_category: 'Infrastructure', priority: 'high', status: 'open',
      filed_by: uid, filed_by_name: uname, against_user: null, against_name: null,
      assigned_to: assignHOD.id, assigned_to_name: assignHOD.name,
      dept_code: dept, deadline_days: 5, days_left: 3,
      created_at: new Date(now - 86400000 * 2).toISOString(),
      updated_at: new Date(now - 86400000 * 2).toISOString(),
      timeline: [
        { by_name: uname, action_text: `Complaint filed by ${uname}`, action_type: 'filed', created_at: new Date(now - 86400000 * 2).toISOString() },
        { by_name: assignHOD.name, action_text: 'Received. Investigating the issue with the lab technician.', action_type: 'update', created_at: new Date(now - 86400000 * 1).toISOString() }
      ]
    },
    // 2. IN PROGRESS — Attendance
    {
      complaint_id: now + 2,
      title: 'Attendance Mismatch in Student Portal',
      description: `My attendance shown in the student portal is 61% but the physical register shows 79%. This discrepancy is affecting my eligibility to write the semester examinations. I have cross-checked with classmates who have the same issue.`,
      category: 'Attendance', ai_category: 'Attendance', priority: 'medium', status: 'in_progress',
      filed_by: uid, filed_by_name: uname, against_user: null, against_name: null,
      assigned_to: assignCT.id, assigned_to_name: assignCT.name,
      dept_code: dept, deadline_days: 7, days_left: 4,
      created_at: new Date(now - 86400000 * 5).toISOString(),
      updated_at: new Date(now - 86400000 * 1).toISOString(),
      timeline: [
        { by_name: uname, action_text: `Complaint filed by ${uname}`, action_type: 'filed', created_at: new Date(now - 86400000 * 5).toISOString() },
        { by_name: assignCT.name, action_text: 'Attendance records are under review. Cross-referencing portal data with the physical register.', action_type: 'update', created_at: new Date(now - 86400000 * 3).toISOString() },
        { by_name: assignCT.name, action_text: 'Discrepancy confirmed. Rectification request sent to admin. Will be corrected within 2 days.', action_type: 'update', created_at: new Date(now - 86400000 * 1).toISOString() }
      ]
    },
    // 3. RESOLVED — Library
    {
      complaint_id: now + 3,
      title: 'Reference Books Not Available in Library',
      description: `Important reference books required for the Data Structures and Algorithms course (CLRS — Cormen) are not available in the library. Multiple students need these books urgently before the semester exams.`,
      category: 'Library / Lab', ai_category: 'Library / Lab', priority: 'low', status: 'resolved',
      filed_by: uid, filed_by_name: uname, against_user: null, against_name: null,
      assigned_to: assignAO.id, assigned_to_name: assignAO.name,
      dept_code: dept, deadline_days: 14, days_left: 99,
      created_at: new Date(now - 86400000 * 14).toISOString(),
      updated_at: new Date(now - 86400000 * 3).toISOString(),
      timeline: [
        { by_name: uname, action_text: `Complaint filed by ${uname}`, action_type: 'filed', created_at: new Date(now - 86400000 * 14).toISOString() },
        { by_name: assignAO.name, action_text: 'Acknowledged. Procurement request raised with the librarian.', action_type: 'update', created_at: new Date(now - 86400000 * 10).toISOString() },
        { by_name: assignAO.name, action_text: '5 copies of CLRS have been procured and added to library shelves. Issue is resolved.', action_type: 'resolved', created_at: new Date(now - 86400000 * 3).toISOString() }
      ]
    },
    // 4. RESOLVED — Examination
    {
      complaint_id: now + 4,
      title: 'Internal Marks Not Updated in Portal',
      description: `My internal marks for the mid-term examination conducted last month are still not updated in the student portal. This is creating uncertainty about my overall performance and semester results.`,
      category: 'Examination', ai_category: 'Examination', priority: 'medium', status: 'resolved',
      filed_by: uid, filed_by_name: uname, against_user: null, against_name: null,
      assigned_to: assignCT.id, assigned_to_name: assignCT.name,
      dept_code: dept, deadline_days: 7, days_left: 99,
      created_at: new Date(now - 86400000 * 10).toISOString(),
      updated_at: new Date(now - 86400000 * 4).toISOString(),
      timeline: [
        { by_name: uname, action_text: `Complaint filed by ${uname}`, action_type: 'filed', created_at: new Date(now - 86400000 * 10).toISOString() },
        { by_name: assignCT.name, action_text: 'Checking with the concerned faculty. Will escalate to exam section if needed.', action_type: 'update', created_at: new Date(now - 86400000 * 8).toISOString() },
        { by_name: assignCT.name, action_text: 'Marks have been updated in the portal by the exam section. Please verify.', action_type: 'resolved', created_at: new Date(now - 86400000 * 4).toISOString() }
      ]
    },
    // 5. ESCALATED — Critical
    {
      complaint_id: now + 5,
      title: 'Wi-Fi Not Working in Classrooms for 10 Days',
      description: `The college Wi-Fi has not been working in ${dept} classrooms and the lab for more than 10 days. This is severely affecting online assignments, e-learning, and submission deadlines. Despite repeated verbal complaints to the IT staff, no action has been taken.`,
      category: 'Facility', ai_category: 'Facility', priority: 'critical', status: 'escalated',
      filed_by: uid, filed_by_name: uname, against_user: null, against_name: null,
      assigned_to: assignAO.id, assigned_to_name: assignAO.name,
      dept_code: dept, deadline_days: 3, days_left: -2,
      created_at: new Date(now - 86400000 * 7).toISOString(),
      updated_at: new Date(now - 86400000 * 2).toISOString(),
      timeline: [
        { by_name: uname, action_text: `Complaint filed by ${uname}`, action_type: 'filed', created_at: new Date(now - 86400000 * 7).toISOString() },
        { by_name: assignHOD.name, action_text: 'Acknowledged. Forwarding to Admin Officer for infrastructure fix.', action_type: 'update', created_at: new Date(now - 86400000 * 5).toISOString() },
        { by_name: 'System', action_text: 'AUTO-ESCALATED: Deadline of 3 days exceeded. Complaint escalated to next authority automatically.', action_type: 'escalated', created_at: new Date(now - 86400000 * 2).toISOString() }
      ]
    }
  ];

  DB.complaints = [...DB.complaints, ...newComplaints];

  // Add welcome notifications for this user
  DB.notifs = [...DB.notifs,
    { notif_id: now+10, user_id: uid, message: `Welcome ${uname}! Your past complaints have been restored.`, type: 'complaint', is_read: false, created_at: new Date().toISOString() },
    { notif_id: now+11, user_id: uid, message: `Complaint "Internal Marks Not Updated" has been resolved.`, type: 'complaint', is_read: false, created_at: new Date(now - 86400000 * 4).toISOString() },
    { notif_id: now+12, user_id: uid, message: `Complaint "Reference Books" has been resolved.`, type: 'complaint', is_read: false, created_at: new Date(now - 86400000 * 3).toISOString() },
    { notif_id: now+13, user_id: uid, message: `Complaint "Wi-Fi Not Working" auto-escalated — deadline exceeded.`, type: 'escalation', is_read: false, created_at: new Date(now - 86400000 * 2).toISOString() }
  ];

  // Add a welcome message from class teacher / HOD to this user
  if (ct || hod) {
    const sender = ct || hod;
    DB.messages = [...DB.messages,
      {
        message_id: now+20, from_user: sender.user_id, to_user: uid,
        from_name: sender.full_name, to_name: uname,
        message: `Hello ${uname.split(' ')[0]}, your attendance complaint has been noted. I will review the records and get back to you by tomorrow.`,
        sent_at: new Date(now - 3600000 * 5).toISOString(), is_read: false
      }
    ];
    DB.notifs = [...DB.notifs,
      { notif_id: now+14, user_id: uid, message: `New message from ${sender.full_name}.`, type: 'message', is_read: false, created_at: new Date(now - 3600000 * 5).toISOString() }
    ];
  }
}

// Auto-escalate overdue complaints in demo mode
function demoAutoEscalate() {
  const comps = DB.complaints;
  let changed = false;
  comps.forEach(c => {
    if (['resolved','closed','escalated'].includes(c.status)) return;
    const deadline = new Date(c.created_at).getTime() + c.deadline_days * 86400000;
    if (Date.now() > deadline) {
      c.status = 'escalated';
      c.timeline = c.timeline || [];
      c.timeline.push({
        by_name:'System',
        action_text:'AUTO-ESCALATED: Deadline exceeded. System escalated this complaint.',
        action_type:'escalated',
        created_at: new Date().toISOString()
      });
      changed = true;
    }
  });
  if (changed) { DB.complaints = comps; toast('Auto-escalation ran — overdue complaints updated.','info'); }
}

// AI smart category (JS version — mirrors PHP backend logic)
function aiCategory(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  for (const [cat, kws] of Object.entries(AI_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) return cat;
  }
  return 'General';
}

// ════════════════════════════════════════════════════════════
// API — tries backend.php first; falls back to demo localStorage
// ════════════════════════════════════════════════════════════
async function api(action, data = {}) {
  try {
    const res = await fetch('backend.php?action=' + action, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, ...data }),
      // Short timeout so we fall back quickly when no server
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return json;
  } catch (_) {
    // No PHP server — use localStorage demo mode
    return await demoAPI(action, data);
  }
}

// ════════════════════════════════════════════════════════════
// DEMO API  (localStorage — no server needed)
// ════════════════════════════════════════════════════════════
async function demoAPI(action, data) {
  seedDemo();
  const ok   = (d, m='OK') => ({ success:true, message:m, data:d });
  const fail = m            => ({ success:false, message:m, data:null });

  switch (action) {

    case 'check_session': {
      const s = sessionStorage.getItem('bt_cur');
      if (!s) return fail('No session');
      const u = JSON.parse(s);
      seedUserComplaints(u);   // ← restore complaints on page refresh too
      return ok(u);
    }

    case 'login': {
      const hashed = await sha256(data.password || '');
      const u = DB.users.find(u => u.username === data.username && u.password === hashed);
      if (!u) return fail('Invalid username or password.');
      sessionStorage.setItem('bt_cur', JSON.stringify(u));
      seedUserComplaints(u);   // ← restore/seed complaints for this user
      if (['hod','ao','principal'].includes(u.role)) demoAutoEscalate();
      return ok(u, 'Login successful.');
    }

    case 'register': {
      if (!data.username?.endsWith('@tkrcet.ac.in'))
        return fail('Username must end with @tkrcet.ac.in (e.g. 24K91A6701@tkrcet.ac.in)');
      if (DB.users.find(u => u.username === data.username))
        return fail('This username is already registered.');
      if (!data.role)
        return fail('Please select a role.');
      if ((data.password || '').length < 6)
        return fail('Password must be at least 6 characters.');

      const hashed = await sha256(data.password);
      const dept   = DEPTS.find(d => d.id === parseInt(data.dept_id));
      const nu = {
        user_id:     Date.now(),
        full_name:   data.full_name,
        username:    data.username,
        password:    hashed,
        role:        data.role,
        dept_code:   dept?.code || '',
        dept_name:   dept?.name || '',
        dept_id:     parseInt(data.dept_id) || null,
        employee_id: data.employee_id || '',
        section:     data.section     || '',
        year:        data.year        || ''
      };
      DB.users = [...DB.users, nu];
      sessionStorage.setItem('bt_cur', JSON.stringify(nu));
      seedUserComplaints(nu);   // ← seed complaints for newly registered user
      return ok(nu, 'Account created successfully.');
    }

    case 'logout':
      sessionStorage.removeItem('bt_cur');
      return ok({}, 'Logged out.');

    case 'get_departments':
      return ok(DEPTS.map(d => ({ dept_id:d.id, dept_code:d.code, dept_name:d.name, hod_name:d.hod })));

    case 'get_users':
      return ok(DB.users.filter(u => u.user_id !== CU?.user_id));

    case 'admin_users':
      return ok(DB.users);

    case 'get_stats': {
      const high = ['principal','ao','hod'];
      const mine = high.includes(CU?.role)
        ? DB.complaints
        : DB.complaints.filter(c => c.filed_by===CU?.user_id || c.assigned_to===CU?.user_id);
      const s = { total:mine.length, open:0, in_progress:0, resolved:0, closed:0, escalated:0, critical:0, overdue:0 };
      mine.forEach(c => {
        s[c.status] = (s[c.status] || 0) + 1;
        if (c.priority === 'critical') s.critical++;
        if ((c.days_left || 0) < 0 && !['resolved','closed'].includes(c.status)) s.overdue++;
      });
      s.unread_messages = DB.messages.filter(m => m.to_user===CU?.user_id && !m.is_read).length;
      s.unread_notifs   = DB.notifs.filter(n => n.user_id===CU?.user_id && !n.is_read).length;
      const cats = {};
      mine.forEach(c => { cats[c.category] = (cats[c.category]||0) + 1; });
      s.by_category = Object.entries(cats).map(([category,cnt]) => ({category,cnt})).sort((a,b) => b.cnt-a.cnt);
      return ok(s);
    }

    case 'get_complaints': {
      const high = ['principal','ao','hod'];
      let list = high.includes(CU?.role)
        ? [...DB.complaints]
        : DB.complaints.filter(c => c.filed_by===CU?.user_id || c.assigned_to===CU?.user_id || c.against_user===CU?.user_id);
      const f = data.filter || 'all';
      const s = (data.search || '').toLowerCase();
      const valid = ['open','in_progress','resolved','closed','escalated'];
      if (f !== 'all') {
        if (f === 'critical') list = list.filter(c => c.priority === 'critical');
        else if (f === 'overdue') list = list.filter(c => (c.days_left||0) < 0 && !['resolved','closed'].includes(c.status));
        else if (valid.includes(f)) list = list.filter(c => c.status === f);
      }
      if (s) list = list.filter(c =>
        c.title.toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s) ||
        (c.description||'').toLowerCase().includes(s)
      );
      return ok([...list].reverse());
    }

    case 'complaint_detail': {
      const c = DB.complaints.find(x => x.complaint_id === data.complaint_id);
      if (!c) return fail('Complaint not found.');
      return ok({ complaint:c, timeline:c.timeline||[] });
    }

    case 'file_complaint': {
      const ai_cat   = aiCategory(data.title||'', data.description||'');
      const assignee = DB.users.find(u => u.user_id === parseInt(data.assigned_to))
                    || DB.users.find(u => u.role==='hod' && u.dept_id===parseInt(data.dept_id));
      const now = new Date();
      const nc  = {
        complaint_id:    Date.now(),
        title:           data.title,
        description:     data.description,
        category:        data.category,
        ai_category:     ai_cat,
        priority:        data.priority,
        status:          'open',
        filed_by:        CU.user_id,
        filed_by_name:   CU.full_name,
        against_user:    data.against_user || null,
        against_name:    null,
        assigned_to:     assignee?.user_id  || null,
        assigned_to_name:assignee?.full_name|| 'Auto-Assigned',
        dept_code:       CU.dept_code,
        deadline_days:   parseInt(data.deadline_days) || 7,
        days_left:       parseInt(data.deadline_days) || 7,
        created_at:      now.toISOString(),
        updated_at:      now.toISOString(),
        timeline: [{
          by_name:     CU.full_name,
          action_text: 'Complaint filed by ' + CU.full_name,
          action_type: 'filed',
          created_at:  now.toISOString()
        }]
      };
      DB.complaints = [...DB.complaints, nc];
      if (assignee) {
        DB.notifs = [...DB.notifs, {
          notif_id: Date.now(), user_id: assignee.user_id,
          message: 'New complaint assigned: ' + data.title,
          type: 'complaint', is_read: false, created_at: now.toISOString()
        }];
      }
      return ok({ complaint_id:nc.complaint_id, ai_category:ai_cat }, 'Complaint filed successfully.');
    }

    case 'update_status': {
      const comps = DB.complaints;
      const idx   = comps.findIndex(c => c.complaint_id === data.complaint_id);
      if (idx < 0) return fail('Complaint not found.');
      comps[idx].status     = data.status;
      comps[idx].updated_at = new Date().toISOString();
      comps[idx].timeline   = comps[idx].timeline || [];
      comps[idx].timeline.push({
        by_name: CU.full_name,
        action_text: `Status updated to "${data.status}" by ${CU.full_name}`,
        action_type: data.status,
        created_at:  new Date().toISOString()
      });
      DB.complaints = comps;
      const filer = comps[idx].filed_by;
      DB.notifs = [...DB.notifs, {
        notif_id:Date.now(), user_id:filer,
        message:`Your complaint "${comps[idx].title}" is now: ${data.status}`,
        type:'complaint', is_read:false, created_at:new Date().toISOString()
      }];
      return ok({}, 'Status updated to ' + data.status + '.');
    }

    case 'add_comment': {
      const comps = DB.complaints;
      const idx   = comps.findIndex(c => c.complaint_id === data.complaint_id);
      if (idx < 0) return fail('Not found.');
      comps[idx].timeline.push({
        by_name:     CU.full_name,
        action_text: data.comment + ' — ' + CU.full_name,
        action_type: 'comment',
        created_at:  new Date().toISOString()
      });
      DB.complaints = comps;
      return ok({}, 'Comment added.');
    }

    case 'escalate': {
      const comps  = DB.complaints;
      const idx    = comps.findIndex(c => c.complaint_id === data.complaint_id);
      if (idx < 0) return fail('Not found.');
      const myIdx  = HIERARCHY.indexOf(CU.role);
      if (myIdx >= HIERARCHY.length - 1) return fail('Already at top level — cannot escalate further.');
      const nextRole = HIERARCHY[myIdx + 1];
      const nextUser = DB.users.find(u => u.role === nextRole);
      comps[idx].status           = 'escalated';
      comps[idx].assigned_to      = nextUser?.user_id     || null;
      comps[idx].assigned_to_name = nextUser?.full_name   || nextRole;
      comps[idx].updated_at       = new Date().toISOString();
      comps[idx].timeline.push({
        by_name:     CU.full_name,
        action_text: `Escalated to ${ROLES[nextRole].label} (${nextUser?.full_name||''}) by ${CU.full_name}`,
        action_type: 'escalated',
        created_at:  new Date().toISOString()
      });
      DB.complaints = comps;
      if (nextUser) {
        DB.notifs = [...DB.notifs, {
          notif_id:Date.now(), user_id:nextUser.user_id,
          message:`Complaint #${data.complaint_id} escalated to you.`,
          type:'escalation', is_read:false, created_at:new Date().toISOString()
        }];
      }
      return ok({}, 'Escalated to ' + ROLES[nextRole].label + '.');
    }

    case 'get_inbox': {
      const msgs = DB.messages;
      const seen = new Set();
      const convs = [];
      [...msgs].reverse().forEach(m => {
        const mine = m.from_user===CU.user_id || m.to_user===CU.user_id;
        if (!mine) return;
        const oid  = m.from_user===CU.user_id ? m.to_user   : m.from_user;
        const on   = m.from_user===CU.user_id ? m.to_name   : m.from_name;
        const ou   = DB.users.find(u => u.user_id===oid);
        if (!seen.has(oid)) {
          seen.add(oid);
          const unread = msgs.filter(x => x.from_user===oid && x.to_user===CU.user_id && !x.is_read).length;
          convs.push({ other_id:oid, other_name:on||ou?.full_name||'Unknown', other_role:ou?.role||'', last_msg:m.message, last_time:m.sent_at, unread });
        }
      });
      return ok(convs);
    }

    case 'get_conversation': {
      const msgs = DB.messages;
      const conv = msgs.filter(m =>
        (m.from_user===CU.user_id && m.to_user===data.other_user) ||
        (m.from_user===data.other_user && m.to_user===CU.user_id)
      );
      // Mark as read
      msgs.forEach(m => { if (m.to_user===CU.user_id && m.from_user===data.other_user) m.is_read = true; });
      DB.messages = msgs;
      return ok(conv.map(m => ({ ...m, sender_name: m.from_name })));
    }

    case 'send_message': {
      const toUser = DB.users.find(u => u.user_id===data.to_user);
      const nm = {
        message_id: Date.now(),
        from_user:  CU.user_id,  to_user:   data.to_user,
        from_name:  CU.full_name,to_name:   toUser?.full_name||'',
        message:    data.message,
        sent_at:    new Date().toISOString(),
        is_read:    false
      };
      DB.messages = [...DB.messages, nm];
      DB.notifs   = [...DB.notifs, {
        notif_id:Date.now(), user_id:data.to_user,
        message:'New message from '+CU.full_name,
        type:'message', is_read:false, created_at:new Date().toISOString()
      }];
      return ok({ message_id:nm.message_id }, 'Message sent.');
    }

    case 'get_notifications':
      return ok([...DB.notifs].filter(n => n.user_id===CU?.user_id).reverse().slice(0,30));

    case 'mark_read': {
      const ns = DB.notifs;
      ns.forEach(n => { if (n.user_id===CU?.user_id) n.is_read = true; });
      DB.notifs = ns;
      return ok({}, 'Marked read.');
    }

    case 'generate_report':
      return ok({ data: DB.complaints, type: data.report_type||'all' }, 'Report ready.');

    default:
      return { success:false, message:'Unknown action: '+action, data:null };
  }
}

// ════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
}
function fTime(d) {
  return d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';
}
function fFull(d) {
  return d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
}
function initials(n) {
  return (n||'').split(' ').filter(Boolean).map(x=>x[0]).join('').toUpperCase().slice(0,2);
}
function emptyState(msg) {
  return `<div class="empty"><div class="ei">📋</div><h3>Nothing here</h3><p>${msg}</p></div>`;
}

// Toast notification
function toast(msg, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'•'}</span><span>${esc(msg)}</span>`;
  document.getElementById('toast-cnt').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ════════════════════════════════════════════════════════════
// PAGE ROUTING
// ════════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
}

function showSec(sec) {
  // Hide all sections by removing active class (CSS handles display:none)
  document.querySelectorAll('[data-sec]').forEach(e => {
    e.classList.remove('active');
    e.style.display = 'none';   // force hide any lingering inline style
  });
  document.querySelectorAll('.nav-lk').forEach(e => e.classList.remove('active'));

  const el  = document.querySelector(`[data-sec="${sec}"]`);
  const nav = document.querySelector(`.nav-lk[data-nav="${sec}"]`);

  if (el) {
    el.style.display = '';      // clear the inline style so CSS takes over
    el.classList.add('active'); // CSS: [data-sec].active { display:block }
  }
  if (nav) nav.classList.add('active');

  // Render the section content
  if      (sec === 'overview')    renderOverview();
  else if (sec === 'complaints')  renderComplaints();
  else if (sec === 'file')        renderFile();
  else if (sec === 'messages')    renderMessages();
  else if (sec === 'escalation')  renderEscalation();
  else if (sec === 'reports')     renderReports();
  else if (sec === 'admin')       renderAdmin();
}

// ════════════════════════════════════════════════════════════
// AUTH HANDLERS
// ════════════════════════════════════════════════════════════
function switchTab(t) {
  document.getElementById('lf').style.display = (t==='login')    ? 'block' : 'none';
  document.getElementById('rf').style.display = (t==='register') ? 'block' : 'none';
  document.getElementById('tl').classList.toggle('active', t==='login');
  document.getElementById('tr').classList.toggle('active', t==='register');
}

function selRoleUI(r) {
  selRole_ = r;
  document.querySelectorAll('.rt').forEach(e => e.classList.remove('sel'));
  document.getElementById('rt-'+r)?.classList.add('sel');
}

function selPriUI(p) {
  selPri_ = p;
  ['low','medium','high','critical'].forEach(x => {
    const e = document.getElementById('pt-'+x);
    if (e) { e.className = 'pt'; if (x===p) e.className += ' sel-'+x; }
  });
}

function updChar() {
  const v = document.getElementById('f-desc')?.value || '';
  const e = document.getElementById('char-ct');
  if (e) e.textContent = v.length + ' / 2000';
}

async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  document.getElementById('l-err').textContent = '';
  if (!username || !password) {
    document.getElementById('l-err').textContent = 'Please enter your username and password.';
    return;
  }
  const res = await api('login', { username, password });
  if (!res.success) {
    document.getElementById('l-err').textContent = res.message;
    return;
  }
  CU = res.data;
  loadDashboard();
}

async function doRegister() {
  const name     = document.getElementById('r-name').value.trim();
  const username = document.getElementById('r-user').value.trim();
  const password = document.getElementById('r-pass').value;
  const dept     = document.getElementById('r-dept').value;
  const empid    = document.getElementById('r-empid').value.trim();
  const section  = document.getElementById('r-sect').value;
  const year     = document.getElementById('r-year').value;
  const errEl    = document.getElementById('r-err');
  errEl.textContent = '';

  if (!selRole_) { errEl.textContent = 'Please select your role.'; return; }
  if (!name || !username || !password) { errEl.textContent = 'Please fill all required fields.'; return; }

  const res = await api('register', {
    full_name:name, username, password, role:selRole_,
    dept_id:dept, employee_id:empid, section, year
  });
  if (!res.success) { errEl.textContent = res.message; return; }
  CU = res.data;
  toast('Welcome, ' + name + '! Account created.', 'success');
  loadDashboard();
}

async function demoLogin() {
  seedDemo();
  const u = DB.users[14]; // Sample Student
  sessionStorage.setItem('bt_cur', JSON.stringify(u));
  CU = u;
  seedUserComplaints(u);   // ← ensure demo student also has complaints
  loadDashboard();
  toast('Demo login as ' + u.full_name, 'info');
}

async function doLogout() {
  await api('logout');
  CU = null;
  sessionStorage.removeItem('bt_cur');
  showPage('auth');
  toast('Logged out successfully.', 'info');
}

// ════════════════════════════════════════════════════════════
// DASHBOARD LOAD
// ════════════════════════════════════════════════════════════
function loadDashboard() {
  if (!CU) return;
  document.getElementById('tb-name').textContent = CU.full_name;
  document.getElementById('tb-role').textContent = ROLES[CU.role]?.label || CU.role;
  document.getElementById('tb-av').textContent   = initials(CU.full_name);
  document.getElementById('tb-av').style.background = ROLES[CU.role]?.color || '#1a3a5c';

  const isAdmin = ['hod','ao','principal'].includes(CU.role);
  document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';

  showPage('dash');
  startClock();
  showSec('overview');
}

function startClock() {
  const tick = () => {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleString('en-IN',{
      weekday:'short',day:'2-digit',month:'short',year:'numeric',
      hour:'2-digit',minute:'2-digit',second:'2-digit'
    });
  };
  tick();
  setInterval(tick, 1000);
}

// ════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════
async function renderOverview() {
  const s = (await api('get_stats')).data || {};

  document.getElementById('s-total').textContent = s.total       || 0;
  document.getElementById('s-open').textContent  = s.open        || 0;
  document.getElementById('s-prog').textContent  = s.in_progress || 0;
  document.getElementById('s-res').textContent   = s.resolved    || 0;
  document.getElementById('s-crit').textContent  = s.critical    || 0;

  const cnt = (s.open||0) + (s.in_progress||0);
  const nb  = document.getElementById('nav-badge');
  if (nb) { nb.textContent = cnt; nb.style.display = cnt > 0 ? '' : 'none'; }

  const mb = document.getElementById('tb-mb');
  if (mb) { mb.textContent = s.unread_messages||0; mb.style.display = (s.unread_messages||0)>0?'flex':'none'; }

  const nb2 = document.getElementById('tb-nb');
  if (nb2) { nb2.textContent = s.unread_notifs||0; nb2.style.display = (s.unread_notifs||0)>0?'flex':'none'; }

  buildCharts(s);

  const r2  = await api('get_complaints', { filter:'all', search:'' });
  const rec = document.getElementById('recent-list');
  const top4 = (r2.data||[]).slice(0,4);
  rec.innerHTML = top4.length ? top4.map(cardHTML).join('') : emptyState('No complaints yet. Use "File Complaint" in the sidebar.');
}

function buildCharts(s) {
  const total = s.total || 1;
  // Category chart
  const cats   = s.by_category || [];
  const catCol = ['#1a3a5c','#2563a8','#d97706','#16a34a','#dc2626','#7c3aed','#0891b2','#ea580c'];
  const catMax = cats.length ? cats[0].cnt : 1;
  document.getElementById('chart-cat').innerHTML = cats.length
    ? cats.map((c,i) => `<div class="bar-row">
        <div class="bar-lbl" title="${esc(c.category)}">${esc(c.category.split(' ')[0])}</div>
        <div class="bar-trk"><div class="bar-fl" style="width:${Math.round(c.cnt/catMax*100)}%;background:${catCol[i%catCol.length]}"></div></div>
        <div class="bar-val">${c.cnt}</div>
      </div>`).join('')
    : '<div style="color:var(--text3);font-size:12px">No data yet</div>';

  // Priority chart
  const pc = {critical:'#dc2626',high:'#d97706',medium:'#2563eb',low:'#16a34a'};
  document.getElementById('chart-pri').innerHTML = Object.entries(pc).map(([p,col]) => `
    <div class="bar-row">
      <div class="bar-lbl" style="color:${col}">${p.toUpperCase()}</div>
      <div class="bar-trk"><div class="bar-fl" style="width:${Math.round((s[p]||0)/total*100)}%;background:${col}"></div></div>
      <div class="bar-val">${s[p]||0}</div>
    </div>`).join('');

  // Status donut
  const sc = {open:'#2563eb',in_progress:'#d97706',resolved:'#16a34a',closed:'#6b7280',escalated:'#dc2626'};
  const sd = {open:s.open||0,in_progress:s.in_progress||0,resolved:s.resolved||0,closed:s.closed||0,escalated:s.escalated||0};
  document.getElementById('donut-svg').innerHTML = buildDonut(sd, sc);
  document.getElementById('donut-n').textContent  = s.total || 0;
  document.getElementById('donut-leg').innerHTML  = Object.entries(sc).map(([k,c]) =>
    `<div class="leg-row"><div class="leg-dot" style="background:${c}"></div>${k.replace('_',' ')} (${sd[k]})</div>`
  ).join('');

  // Resolution rate
  const rate = s.total > 0 ? Math.round((s.resolved||0) / s.total * 100) : 0;
  document.getElementById('rate-big').textContent = rate + '%';
  const rf = document.getElementById('rate-fl');
  if (rf) { rf.style.width = rate+'%'; rf.style.background = rate>=70?'#16a34a':rate>=40?'#d97706':'#dc2626'; }
}

function buildDonut(data, colors) {
  const total = Object.values(data).reduce((a,b) => a+b, 0) || 1;
  let offset = 0;
  const cx=60, cy=60, r=48, sw=16, circ=2*Math.PI*r;
  let paths = '';
  Object.entries(data).forEach(([k,v]) => {
    const pct  = v / total;
    const dash = pct * circ;
    const gap  = circ - dash;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[k]}"
      stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(-offset*circ).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += pct;
  });
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

// ════════════════════════════════════════════════════════════
// COMPLAINTS LIST
// ════════════════════════════════════════════════════════════
async function renderComplaints() {
  const search = document.getElementById('search-inp')?.value || '';
  const res    = await api('get_complaints', { filter:curFilter_, search });
  const list   = res.data || [];
  document.getElementById('clist').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : emptyState('No complaints found for this filter.');
}

function cardHTML(c) {
  const dl  = c.days_left;
  const res = ['resolved','closed'].includes(c.status);
  let tc='ok', tt=(dl||0)+'d left';
  if (res)               { tc='';       tt=''; }
  else if ((dl||0)<=0)   { tc='urgent'; tt='OVERDUE'; }
  else if ((dl||0)<=2)   { tc='urgent'; }
  else if ((dl||0)<=4)   { tc='warn'; }

  return `<div class="cc p-${c.priority}" onclick="openDetail(${c.complaint_id})">
    <div class="cc-hd">
      <div class="cc-title">${esc(c.title)}</div>
      <div class="cc-tags">
        <span class="badge b-${c.priority}">${c.priority}</span>
        <span class="badge b-${c.status}">${c.status.replace('_',' ')}</span>
        <span class="badge b-cat">${esc(c.category)}</span>
      </div>
    </div>
    <div class="cc-body">${esc((c.description||'').slice(0,140))}${(c.description||'').length>140?'...':''}</div>
    <div class="cc-meta">
      <span>👤 ${esc(c.filed_by_name||'—')}</span>
      <span>📌 ${esc(c.assigned_to_name||'Unassigned')}</span>
      <span>📅 ${fDate(c.created_at)}</span>
      ${c.ai_category ? `<span class="ai-tag">🤖 ${esc(c.ai_category)}</span>` : ''}
      ${!res && tt ? `<span class="timer ${tc}">⏱ ${tt}</span>` : ''}
      ${res ? '<span style="color:var(--success);font-size:11px">✅ Resolved</span>' : ''}
    </div>
  </div>`;
}

function filterBy(f, el) {
  curFilter_ = f;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderComplaints();
}

// ════════════════════════════════════════════════════════════
// COMPLAINT DETAIL MODAL
// ════════════════════════════════════════════════════════════
async function openDetail(id) {
  const res = await api('complaint_detail', { complaint_id:id });
  if (!res.success) { toast(res.message, 'error'); return; }
  const { complaint:c, timeline:tl } = res.data;

  const prog    = c.status==='resolved'||c.status==='closed' ? 100
                : c.status==='escalated' ? 75
                : c.status==='in_progress' ? 55 : 20;
  const canUpd  = ['hod','ao','principal','classteacher','faculty'].includes(CU.role) || CU.user_id===c.assigned_to;
  const canEsc  = CU.role !== 'principal' && !['resolved','closed'].includes(c.status);

  let acts = '';
  if (canUpd && !['resolved','closed'].includes(c.status)) {
    acts += `<button class="btn btn-success btn-sm" onclick="updateStat(${id},'resolved')">✅ Mark Resolved</button>`;
    if (c.status !== 'in_progress')
      acts += `<button class="btn btn-warning btn-sm" onclick="updateStat(${id},'in_progress')">🔄 In Progress</button>`;
  }
  if (canEsc) acts += `<button class="btn btn-danger btn-sm" onclick="doEscalate(${id})">🔺 Escalate</button>`;

  const tlHTML = (tl||[]).map(t => `
    <div class="tl-item ${t.action_type||''}">
      <div class="tl-time">${fFull(t.created_at)}</div>
      <div class="tl-text"><strong>${esc(t.by_name||'System')}</strong> — ${esc(t.action_text)}</div>
    </div>`).join('');

  document.getElementById('det-body').innerHTML = `
    <div style="background:var(--bg);padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
        <span class="badge b-${c.priority}">${c.priority}</span>
        <span class="badge b-${c.status}">${c.status.replace('_',' ')}</span>
        <span class="badge b-cat">${esc(c.category)}</span>
        ${c.ai_category?`<span class="ai-tag">🤖 AI: ${esc(c.ai_category)}</span>`:''}
        ${(c.days_left||0)<0&&!['resolved','closed'].includes(c.status)?'<span class="badge" style="background:#fef2f2;color:#dc2626;border-color:#fca5a5">⚠️ OVERDUE</span>':''}
      </div>
      <div style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:8px">${esc(c.title)}</div>
      <div style="font-size:11px;color:var(--text2);display:flex;gap:14px;flex-wrap:wrap">
        <span>👤 Filed by: <strong>${esc(c.filed_by_name||'—')}</strong></span>
        ${c.against_name?`<span>⚠️ Against: <strong>${esc(c.against_name)}</strong></span>`:''}
        <span>📌 Assigned: <strong>${esc(c.assigned_to_name||'Unassigned')}</strong></span>
        <span>📅 ${fDate(c.created_at)}</span>
      </div>
    </div>
    <div style="padding:18px 20px">
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:3px">
          <span>Resolution Progress</span><span>${prog}%</span>
        </div>
        <div class="prog-trk"><div class="prog-fl" style="width:${prog}%;background:${prog===100?'#16a34a':prog>=50?'#d97706':'#1a3a5c'}"></div></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">Description</div>
      <div style="font-size:13px;line-height:1.7;background:var(--bg);padding:11px;border-radius:var(--r);border:1px solid var(--border);margin-bottom:14px">${esc(c.description||'')}</div>
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">Timeline</div>
      <div class="timeline">${tlHTML||'<div style="color:var(--text3);font-size:12px">No timeline entries yet.</div>'}</div>
      ${canUpd ? `
      <div style="margin-top:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px">Add Remark</div>
        <div style="display:flex;gap:7px">
          <input type="text" id="cmt-${id}" placeholder="Add a remark or update..."
            style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:var(--r);font-size:12px;font-family:Poppins,sans-serif;outline:none">
          <button class="btn btn-outline btn-sm" onclick="addCmt(${id})">Add</button>
        </div>
      </div>` : ''}
      ${acts ? `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">${acts}</div>` : ''}
    </div>`;

  document.getElementById('det-modal').classList.add('open');
}

function closeDet() { document.getElementById('det-modal').classList.remove('open'); }

async function updateStat(id, st) {
  const r = await api('update_status', { complaint_id:id, status:st });
  if (!r.success) { toast(r.message,'error'); return; }
  closeDet();
  toast('Status updated to "' + st + '".', 'success');
  renderComplaints();
  renderOverview();
}

async function doEscalate(id) {
  const r = await api('escalate', { complaint_id:id });
  if (!r.success) { toast(r.message,'error'); return; }
  closeDet();
  toast(r.message, 'success');
  renderComplaints();
}

async function addCmt(id) {
  const el = document.getElementById('cmt-'+id);
  if (!el?.value.trim()) { toast('Comment cannot be empty.','error'); return; }
  const r  = await api('add_comment', { complaint_id:id, comment:el.value.trim() });
  if (!r.success) { toast(r.message,'error'); return; }
  toast('Comment added.', 'success');
  openDetail(id);
}

// ════════════════════════════════════════════════════════════
// FILE COMPLAINT
// ════════════════════════════════════════════════════════════
async function renderFile() {
  selPri_ = 'medium';
  selPriUI('medium');
  const res   = await api('get_users');
  const users = res.data || [];
  const targets = users.filter(u => ['hod','ao','principal','classteacher','faculty'].includes(u.role));

  const aEl  = document.getElementById('f-against');
  const asEl = document.getElementById('f-assignee');
  if (aEl)  aEl.innerHTML  = '<option value="">None / Not applicable</option>' + targets.map(u => `<option value="${u.user_id}">${esc(u.full_name)} (${ROLES[u.role]?.label||u.role})</option>`).join('');
  if (asEl) asEl.innerHTML = '<option value="">Auto-assign by hierarchy</option>'  + targets.map(u => `<option value="${u.user_id}">${esc(u.full_name)} (${ROLES[u.role]?.label||u.role})</option>`).join('');
}

async function submitComplaint() {
  const title    = document.getElementById('f-title')?.value.trim();
  const desc     = document.getElementById('f-desc')?.value.trim();
  const cat      = document.getElementById('f-cat')?.value;
  const deadline = document.getElementById('f-dead')?.value || '7';
  const assignee = document.getElementById('f-assignee')?.value || '';
  const against  = document.getElementById('f-against')?.value  || '';
  const dept     = DEPTS.find(d => d.code === CU?.dept_code);

  if (!title || !desc) { toast('Title and description are required.', 'error'); return; }
  if (desc.length < 20) { toast('Description too short — minimum 20 characters.', 'error'); return; }

  const res = await api('file_complaint', {
    title, description:desc, category:cat, priority:selPri_,
    against_user: against || null,
    assigned_to:  assignee || null,
    dept_id:      dept?.id || CU?.dept_id || null,
    deadline_days: parseInt(deadline)
  });
  if (!res.success) { toast(res.message,'error'); return; }

  toast(`Complaint filed! 🤖 AI detected: ${res.data?.ai_category||'General'}`, 'success');
  document.getElementById('f-title').value = '';
  document.getElementById('f-desc').value  = '';
  updChar();
  showSec('complaints');
}

// ════════════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════════════
async function renderMessages() {
  const res   = await api('get_inbox');
  const convs = res.data || [];
  const lEl   = document.getElementById('conv-list');

  if (!convs.length) {
    lEl.innerHTML = `<div style="padding:18px;text-align:center;font-size:12px;color:var(--text3)">
      No conversations yet.<br><br>
      <button class="btn btn-outline btn-sm" onclick="openNewMsg()">+ New Message</button>
    </div>`;
  } else {
    lEl.innerHTML = `<div style="padding:8px 9px;border-bottom:1px solid var(--border)">
      <button class="btn btn-outline btn-sm" style="width:100%" onclick="openNewMsg()">+ New Message</button>
    </div>` +
    convs.map(c => `
      <div class="conv-item ${activeConv_===c.other_id?'active':''}" onclick="openConv(${c.other_id})">
        <div class="conv-av" style="background:${ROLES[c.other_role]?.color||'#1a3a5c'}">${initials(c.other_name)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="conv-nm">${esc(c.other_name)}</div>
            <div class="conv-tm">${fTime(c.last_time)}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="conv-pv">${esc(c.last_msg)}</div>
            ${c.unread>0?`<div class="unread-dot">${c.unread}</div>`:''}
          </div>
        </div>
      </div>`).join('');
  }
  if (activeConv_) openConv(activeConv_);
}

async function openConv(uid) {
  activeConv_ = uid;
  const usersRes = await api('get_users'); const users = [...(usersRes.data||[]), ...(CU ? [CU] : [])];
  const other = users.find(u => u.user_id === uid) || { full_name:'Unknown', role:'student' };
  document.getElementById('msg-cname').textContent = other.full_name;
  document.getElementById('msg-crole').textContent = (ROLES[other.role]?.label||other.role) + (other.dept_code?' · '+other.dept_code:'');
  document.getElementById('msg-inp-row').style.display = 'flex';
  document.getElementById('msg-onl').style.display     = 'block';

  const res  = await api('get_conversation', { other_user:uid });
  const msgs = res.data || [];
  const body = document.getElementById('msg-body');

  if (!msgs.length) {
    body.innerHTML = `<div class="empty"><div class="ei">💬</div><h3>Start Conversation</h3><p>Send a private message to ${esc(other.full_name)}.</p></div>`;
  } else {
    body.innerHTML = msgs.map(m => `
      <div class="bw ${m.from_user===CU.user_id?'sent':'recv'}">
        <div class="bubble ${m.from_user===CU.user_id?'sent':'recv'}">${esc(m.message)}</div>
        <div class="btime">${fTime(m.sent_at)}</div>
      </div>`).join('');
  }
  body.scrollTop = body.scrollHeight;
  renderMessages();
}

async function sendMsg() {
  if (!activeConv_) return;
  const el   = document.getElementById('msg-inp');
  const text = el.value.trim();
  if (!text) return;
  const r = await api('send_message', { to_user:activeConv_, message:text });
  if (!r.success) { toast(r.message,'error'); return; }
  el.value = '';
  openConv(activeConv_);
}

async function openNewMsg() {
  const res   = await api('get_users');
  const users = res.data || [];
  document.getElementById('nm-to').innerHTML = users.map(u =>
    `<option value="${u.user_id}">${esc(u.full_name)} (${ROLES[u.role]?.label||u.role})</option>`
  ).join('');
  document.getElementById('nm-modal').classList.add('open');
}

async function sendNewMsg() {
  const to  = parseInt(document.getElementById('nm-to').value);
  const msg = document.getElementById('nm-text').value.trim();
  if (!msg) { toast('Message cannot be empty.','error'); return; }
  const r   = await api('send_message', { to_user:to, message:msg });
  if (!r.success) { toast(r.message,'error'); return; }
  document.getElementById('nm-modal').classList.remove('open');
  document.getElementById('nm-text').value = '';
  activeConv_ = to;
  toast('Message sent.','success');
  renderMessages();
}

// ════════════════════════════════════════════════════════════
// ESCALATION
// ════════════════════════════════════════════════════════════
async function renderEscalation() {
  const myIdx = HIERARCHY.indexOf(CU.role);
  const higher = HIERARCHY.slice(myIdx + 1);
  const usersRes = await api('get_users'); const users = [...(usersRes.data||[]), ...(CU ? [CU] : [])];
  const el     = document.getElementById('esc-tree');

  if (!higher.length) {
    el.innerHTML = '<div class="notice info">You are at the top of the hierarchy — no further escalation possible.</div>';
    return;
  }
  el.innerHTML = higher.map((role, i) => {
    const p = users.find(u => u.role === role);
    return `${i>0?'<div class="esc-arrow">↓</div>':''}
    <div class="esc-node" style="margin-left:${i*12}px">
      <div class="esc-icon">${ROLES[role]?.icon||'👤'}</div>
      <div class="esc-info">
        <div class="en">${p ? esc(p.full_name) : '(Position Vacant)'}</div>
        <div class="er">${ROLES[role]?.label||role}${p?.dept_code?' · '+p.dept_code:''}</div>
      </div>
      ${p?`<button class="btn btn-outline btn-sm" onclick="quickMsg(${p.user_id})" style="margin-left:auto">💬 Message</button>`:''}
    </div>`;
  }).join('');
}

function quickMsg(uid) { activeConv_ = uid; showSec('messages'); setTimeout(()=>openConv(uid),100); }

// ════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════
function renderReports() {
  const isAuth = ['hod','ao','principal'].includes(CU.role);
  document.getElementById('report-body').innerHTML = isAuth
    ? `<div class="report-info">
        <h3>📥 Export Complaint Reports (CSV)</h3>
        <p style="font-size:12px;color:var(--text2);margin-bottom:12px">Download data for official records, NAAC, and management review.</p>
        <div class="report-actions">
          <button class="btn btn-primary btn-sm" onclick="genReport('all')">📥 All Complaints</button>
          <button class="btn btn-outline btn-sm" onclick="genReport('open')">📥 Open Complaints</button>
          <button class="btn btn-outline btn-sm" onclick="genReport('resolved')">📥 Resolved</button>
          <button class="btn btn-danger btn-sm" onclick="genReport('critical')">📥 Critical</button>
        </div>
      </div>
      <div class="report-info" style="margin-top:14px">
        <h3>🔮 Future Scope</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:10px;font-size:12px;color:var(--text2)">
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">📱 <strong>Mobile App</strong><br>Android/iOS app for on-the-go use</div>
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">🤖 <strong>Full AI/ML</strong><br>Predict category & resolution time</div>
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">📧 <strong>SMS/Email</strong><br>Real-time alerts via PHPMailer/MSG91</div>
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">🏫 <strong>Multi-College</strong><br>Extend across entire TKRC Group</div>
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">📊 <strong>NAAC Reports</strong><br>Auto-generate PDF compliance reports</div>
          <div style="padding:10px;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">🔗 <strong>ERP Integration</strong><br>SSO with JNTUH portal credentials</div>
        </div>
      </div>`
    : '<div class="notice warning">⚠️ Reports are available for HOD, Admin Officer, and Principal only.</div>';
}

async function genReport(type) {
  const r = await api('generate_report', { report_type:type });
  if (!r.success) { toast(r.message,'error'); return; }
  let data = r.data?.data || [];
  if (type !== 'all') data = data.filter(c => {
    if (type==='open')     return c.status==='open';
    if (type==='resolved') return c.status==='resolved';
    if (type==='critical') return c.priority==='critical';
    return true;
  });
  if (!data.length) { toast('No data to export.','warning'); return; }
  const keys = ['complaint_id','title','category','priority','status','filed_by_name','assigned_to_name','deadline_days','created_at'];
  let csv = keys.join(',') + '\n';
  data.forEach(row => {
    csv += keys.map(k => '"'+(String(row[k]||'').replace(/"/g,'""'))+'"').join(',') + '\n';
  });
  const a  = document.createElement('a');
  a.href   = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `BETT_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('Report downloaded as CSV.','success');
}

// ════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════
function renderAdmin() { showAdminTab('users'); }

function showAdminTab(tab, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  const ct = document.getElementById('admin-ct');

  if (tab === 'users') {
    api('admin_users').then(r => {
      const users = r.data || [];
      ct.innerHTML = `<div class="table-w"><table>
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Dept</th><th>Emp. ID</th><th>Section</th></tr></thead>
        <tbody>${users.map(u=>`<tr>
          <td style="font-weight:500">${esc(u.full_name)}</td>
          <td style="font-size:11px;color:var(--text2);font-family:'Roboto Mono',monospace">${esc(u.username)}</td>
          <td><span class="badge b-cat">${ROLES[u.role]?.label||u.role}</span></td>
          <td style="font-size:11px">${esc(u.dept_code||'—')}</td>
          <td style="font-size:11px;font-family:'Roboto Mono',monospace;color:var(--text3)">${esc(u.employee_id||'—')}</td>
          <td>${esc(u.section||'—')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    });
  } else if (tab === 'complaints') {
    api('get_complaints',{filter:'all',search:''}).then(r => {
      const list = r.data || [];
      ct.innerHTML = `<div class="table-w"><table>
        <thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Filed By</th><th>Days Left</th><th>Actions</th></tr></thead>
        <tbody>${list.map(c=>`<tr>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="openDetail(${c.complaint_id})">${esc(c.title)}</td>
          <td style="font-size:11px">${esc(c.category)}</td>
          <td><span class="badge b-${c.priority}">${c.priority}</span></td>
          <td><span class="badge b-${c.status}">${c.status.replace('_',' ')}</span></td>
          <td style="font-size:11px">${esc(c.filed_by_name||'—')}</td>
          <td><span class="timer ${(c.days_left||0)<0?'urgent':'ok'}">${(c.days_left||0)<0?'Overdue':(c.days_left||0)+'d'}</span></td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="updateStat(${c.complaint_id},'resolved')">✅</button>
            <button class="btn btn-danger btn-sm" onclick="updateStat(${c.complaint_id},'closed')">🔒</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    });
  } else {
    renderReports();
    ct.innerHTML = document.getElementById('report-body')?.innerHTML || '';
  }
}

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════
async function showNotifications() {
  const res    = await api('get_notifications');
  const notifs = res.data || [];
  await api('mark_read');
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  panel.innerHTML = `
    <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--rlg);box-shadow:var(--shmd);min-width:280px;max-height:320px;overflow-y:auto">
      <div style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--navy);border-bottom:1px solid var(--border)">
        Notifications
      </div>
      ${notifs.length
        ? notifs.map(n=>`
          <div style="padding:9px 14px;border-bottom:1px solid var(--bg2)">
            <div style="font-size:12px;color:var(--text)">${esc(n.message)}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;font-family:'Roboto Mono',monospace">${fFull(n.created_at)}</div>
          </div>`).join('')
        : '<div style="padding:14px;font-size:12px;color:var(--text3)">No notifications</div>'}
    </div>`;
  // Update badge
  const nb2 = document.getElementById('tb-nb');
  if (nb2) { nb2.style.display = 'none'; }
}

// ════════════════════════════════════════════════════════════
// INIT — runs when page loads
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  seedDemo();  // Seed demo data into localStorage if empty

  // Check if already logged in (session or sessionStorage)
  const res = await api('check_session');
  if (res.success && res.data) {
    CU = res.data;
    loadDashboard();
  } else {
    showPage('auth');
  }

  // Keyboard shortcuts
  document.getElementById('l-pass')?.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
  document.getElementById('msg-inp')?.addEventListener('keydown', e => { if (e.key==='Enter') sendMsg(); });

  // Close notification panel on outside click
  document.addEventListener('click', e => {
    const panel = document.getElementById('notif-panel');
    if (panel && !e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) {
      panel.style.display = 'none';
    }
  });
});
