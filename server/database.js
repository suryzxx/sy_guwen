import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import {
  LEGACY_STAGE_MAP,
  SERVICE_STATUSES,
  STAGE_META,
  STUDENT_STAGES,
  SYSTEM_CONTROLLED_STAGES,
  canTransitionStage,
  isStudentStage,
  normalizeStudentStage
} from '../shared/student-workflow.js'

const serverDir = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.SQLITE_PATH || resolve(serverDir, 'data/app.sqlite')
mkdirSync(dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS planners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE,
    wecom_userid TEXT UNIQUE,
    unionid TEXT UNIQUE,
    campus TEXT,
    role_name TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    planner_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    primary_type TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    planner_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS track_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    content TEXT NOT NULL,
    time TEXT NOT NULL,
    operator TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    planner_id TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS student_stage_history (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    reason TEXT,
    operator TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS student_tasks (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    due_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    operator TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS external_contact_mappings (
    corp_id TEXT NOT NULL,
    external_userid TEXT NOT NULL,
    student_id TEXT NOT NULL,
    display_name TEXT,
    bound_at TEXT NOT NULL,
    PRIMARY KEY (corp_id, external_userid)
  );
`)

function ensureColumn(table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}

ensureColumn('students', 'stage', 'TEXT')
ensureColumn('students', 'service_status', "TEXT NOT NULL DEFAULT 'not_started'")
ensureColumn('students', 'stage_entered_at', 'TEXT')
ensureColumn('students', 'cancellation_reason', 'TEXT')

function nowText() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function parse(row) {
  return row ? JSON.parse(row.data) : null
}

function demoAvatarFor(index) {
  const avatarIndex = (index * 7) % 20 + 1
  return `avatars/student-${String(avatarIndex).padStart(2, '0')}.png`
}

function addHoursText(hours) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function appointmentDue(student) {
  const date = student.appointment?.date
  const time = student.appointment?.time
  return date && time ? `${date} ${time}` : null
}

function studentFromRow(row) {
  if (!row) return null
  const student = parse(row)
  return {
    ...student,
    stage: row.stage || student.stage,
    serviceStatus: row.service_status || student.serviceStatus || SERVICE_STATUSES.NOT_STARTED,
    stageEnteredAt: row.stage_entered_at || student.stageEnteredAt,
    cancellationReason: row.cancellation_reason || student.cancellationReason || ''
  }
}

function createStageTask(studentId, stage, student, operator, createdAt = nowText()) {
  const meta = STAGE_META[stage]
  if (!meta?.taskTitle) return null
  const dueAt = meta.useAppointmentDue ? appointmentDue(student) || addHoursText(meta.dueHours) : addHoursText(meta.dueHours)
  const task = {
    id: `task_${randomUUID()}`,
    studentId,
    taskType: stage,
    title: meta.taskTitle,
    status: 'pending',
    dueAt,
    completedAt: null,
    createdAt,
    operator
  }
  db.prepare('INSERT INTO student_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    task.id, task.studentId, task.taskType, task.title, task.status, task.dueAt,
    task.completedAt, task.createdAt, task.operator
  )
  return task
}

function seed() {
  if (!db.prepare('SELECT 1 FROM planners LIMIT 1').get()) {
    db.prepare(`INSERT INTO planners VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'p001', '规划师Ella', '18756093437', 'demo_planner', 'demo_unionid', '辰龙尚悦中心', '学习规划师'
    )
  }

  if (!db.prepare('SELECT 1 FROM classes LIMIT 1').get()) {
    const rows = [
      ['3784', '秋G2-A+ | Angelina周五18:00', '体系课', 'G2', '周五 18:00', '南京校区 A301', 'Angelina丁宇', 16, 3680, 280, ['2026', '秋季', 'G2', 'A+']],
      ['3783', '秋G4-A+ | Sonya周日14:50', '体系课', 'G4', '周日 14:50', '南京校区 B203', 'Sonya孙苏云', 16, 3880, 280, ['2026', '秋季', 'G4', 'A+']],
      ['3782', '暑G4-A+ | Sonya二期14:50', '体系课', 'G4', '二期 14:50', '南京校区 B203', 'Sonya孙苏云', 15, 3680, 260, ['2026', '暑期', 'G4', 'A+']],
      ['3781', '暑KET-6次综合冲刺班 | Kim三期14:50', '专项课', 'MSE考辅', '三期 14:50', '南京校区 C105', 'Kim周美岐', 6, 2380, 160, ['2026', '暑期', 'KET', '冲刺']],
      ['3780', '秋K2-进阶 | Jojo周五18:00', '体系课', 'K2', '周五 18:00', '深圳校区 A208', 'Jojo张梦洁', 16, 3480, 260, ['2026', '秋季', 'K2', '进阶']],
      ['3779', '暑K2-进阶 | Jojo二期14:50', '体系课', 'K2', '二期 14:50', '深圳校区 A208', 'Jojo张梦洁', 10, 2680, 180, ['2026', '暑期', 'K2', '进阶']],
      ['3778', '秋K3-启蒙 | Ella周四18:00', '体系课', 'K3', '周四 18:00', '深圳校区 B302', 'Ella张颖', 16, 3480, 260, ['2026', '秋季', 'K3', '启蒙']],
      ['3777', '暑K3-启蒙 | Ella三期18:00', '体系课', 'K3', '三期 18:00', '深圳校区 B302', 'Ella张颖', 10, 2680, 180, ['2026', '暑期', 'K3', '启蒙']],
      ['3776', '秋G4-S | Yves周五18:00', '体系课', 'G4', '周五 18:00', '南京校区 C302', 'Yves孙中祥', 16, 3880, 280, ['2026', '秋季', 'G4', 'S']],
      ['3775', '暑G4-S | Yves三期08:30', '体系课', 'G4', '三期 08:30', '南京校区 C302', 'Yves孙中祥', 15, 3680, 260, ['2026', '暑期', 'G4', 'S']],
      ['3774', '暑苍锦小子短期班 | Derek二期12:00', '专项课', '阅读专项', '二期 12:00', '南京校区 D201', 'Derek柳纪强', 8, 2180, 120, ['2026', '暑期', '阅读专项', '短期']]
    ]
    const insert = db.prepare('INSERT INTO classes (id, data) VALUES (?, ?)')
    for (const [id, name, courseType, grade, schedule, location, teacher, totalLectures, coursePrice, materialPrice, matchTags] of rows) {
      insert.run(id, JSON.stringify({ id, name, courseType, grade, schedule, location, teacher, totalLectures, coursePrice, materialPrice, matchTags }))
    }
  }

  if (!db.prepare('SELECT 1 FROM students LIMIT 1').get()) {
    const names = ['陈思涵', '马晨曦', '宋嘉木', '唐心怡', '许亦辰', '程安然', '周子轩', '陆芷晴', '高景行', '叶知秋', '任书瑶', '薛子墨', '王小明', '赵一诺', '孙睿哲', '李小红', '钱雨桐', '郑宇航', '张小强', '冯若曦', '蒋文博', '刘小芳', '曹语晨', '何明远', '吴佳琪', '邵明轩', '梁可欣', '邹雨萌', '白子骞', '潘奕辰', '黄浩然', '范思齐', '顾嘉言']
    const stages = [
      STUDENT_STAGES.PENDING_ADD,
      STUDENT_STAGES.ADDED,
      STUDENT_STAGES.PENDING_ACTIVATION,
      STUDENT_STAGES.HISTORICAL_STUDENT,
      STUDENT_STAGES.PENDING_VISIT,
      STUDENT_STAGES.VISITED,
      STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
      STUDENT_STAGES.CANCELLED,
      STUDENT_STAGES.ENROLLED_STUDENT,
      STUDENT_STAGES.ENROLLED_STUDENT,
      STUDENT_STAGES.NOT_ADAPTED
    ]
    const classRows = db.prepare('SELECT data FROM classes ORDER BY id DESC').all().map(parse)
    const insert = db.prepare(`
      INSERT INTO students (id, primary_type, status, data, stage, service_status, stage_entered_at, cancellation_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    let index = 0
    for (const stage of stages) {
      for (let offset = 0; offset < 3; offset += 1) {
        const id = `s${String(index + 1).padStart(3, '0')}`
        const currentClass = classRows[index % classRows.length]
        const serviceStatus = stage === STUDENT_STAGES.ENROLLED_STUDENT ? SERVICE_STATUSES.ACTIVE : SERVICE_STATUSES.NOT_STARTED
        const student = {
          id,
          name: names[index],
          avatar: demoAvatarFor(index),
          phone: `138${String(10000000 + index).padStart(8, '0')}`,
          gender: index % 2 ? 'female' : 'male',
          englishName: `Student${index + 1}`,
          currentGrade: ['二年级', '三年级', '四年级', '五年级', '六年级'][index % 5],
          school: ['南京市实验小学', '芳草园小学', '深圳市育才小学'][index % 3],
          city: index % 3 === 2 ? '深圳' : '南京',
          campus: index % 3 === 2 ? '深圳校区' : '南京校区',
          stage,
          serviceStatus,
          stageEnteredAt: nowText(),
          appointment: { date: '2026-06-20', time: '14:00', campus: '南京校区', teacher: 'Ella老师' }
        }
        if (stage === STUDENT_STAGES.ENROLLED_STUDENT) {
          student.className = currentClass.name
          student.classSchedule = currentClass.schedule
        }
        if ([STUDENT_STAGES.ASSESSED, STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED, STUDENT_STAGES.ENROLLED_STUDENT].includes(stage)) {
          student.evaluationScores = { totalScore: 80 + offset * 5, fullScore: 100 }
          student.evaluationResult = { year: '2026', semester: '暑期', grade: currentClass.grade, classType: currentClass.courseType, level: 'A+' }
        }
        insert.run(id, STAGE_META[stage].group, stage, JSON.stringify(student), stage, serviceStatus, student.stageEnteredAt, '')
        db.prepare('INSERT INTO student_stage_history VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          `history_${randomUUID()}`, id, null, stage, '初始化学生阶段', '系统', student.stageEnteredAt
        )
        createStageTask(id, stage, student, '系统', student.stageEnteredAt)
        index += 1
      }
    }
  }

  ensureExternalContactStudent()

  const legacyRows = db.prepare('SELECT * FROM students').all()
  for (const row of legacyRows) {
    const student = parse(row)
    const legacyStatus = row.stage || student.stage || student.status || student.leadStatus || student.studentStatus || row.status
    const stage = normalizeStudentStage(legacyStatus)
    if (row.stage === stage && student.stage === stage) continue
    const serviceStatus = stage === STUDENT_STAGES.ENROLLED_STUDENT ? SERVICE_STATUSES.ACTIVE : SERVICE_STATUSES.NOT_STARTED
    const stageEnteredAt = row.stage_entered_at || student.stageEnteredAt || nowText()
    const cancellationReason = stage === STUDENT_STAGES.CANCELLED ? (row.cancellation_reason || student.cancellationReason || '未填写') : ''
    delete student.primaryType
    delete student.status
    delete student.leadStatus
    delete student.studentStatus
    Object.assign(student, { stage, serviceStatus, stageEnteredAt, cancellationReason })
    db.prepare(`
      UPDATE students
      SET primary_type = ?, status = ?, data = ?, stage = ?, service_status = ?, stage_entered_at = ?, cancellation_reason = ?
      WHERE id = ?
    `).run(STAGE_META[stage].group, stage, JSON.stringify(student), stage, serviceStatus, stageEnteredAt, cancellationReason, row.id)
    db.prepare('INSERT INTO student_stage_history VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      `history_${randomUUID()}`, row.id, row.stage || null, stage, `由旧状态 ${legacyStatus || 'unknown'} 迁移`, '系统', stageEnteredAt
    )
    if (!db.prepare('SELECT 1 FROM student_tasks WHERE student_id = ? AND status = ?').get(row.id, 'pending')) {
      createStageTask(row.id, stage, student, '系统', stageEnteredAt)
    }
  }

  const avatarRows = db.prepare('SELECT id, data FROM students ORDER BY id').all()
  avatarRows.forEach((row, index) => {
    const student = parse(row)
    if (student.avatar) return
    student.avatar = demoAvatarFor(index)
    db.prepare('UPDATE students SET data = ? WHERE id = ?').run(JSON.stringify(student), row.id)
  })

  for (const task of db.prepare('SELECT * FROM student_tasks').all()) {
    const normalizedTaskType = normalizeStudentStage(task.task_type, task.task_type)
    const meta = STAGE_META[normalizedTaskType]
    if (normalizedTaskType !== task.task_type || (meta?.taskTitle && task.status === 'pending' && task.title !== meta.taskTitle)) {
      db.prepare('UPDATE student_tasks SET task_type = ?, title = ? WHERE id = ?').run(
        normalizedTaskType,
        meta?.taskTitle || task.title,
        task.id
      )
    }
  }

  if (!db.prepare('SELECT 1 FROM orders LIMIT 1').get()) {
    const student = studentFromRow(db.prepare('SELECT * FROM students WHERE stage = ? LIMIT 1').get(STUDENT_STAGES.ADAPTED_NOT_CONVERTED))
    const classInfo = parse(db.prepare('SELECT data FROM classes LIMIT 1').get())
    const order = {
      id: 'o001', orderNo: 'SY202606180001', studentId: student.id, studentName: student.name,
      classId: classInfo.id, className: classInfo.name, courseType: classInfo.courseType,
      schedule: classInfo.schedule, location: classInfo.location, teacher: classInfo.teacher,
      totalLectures: classInfo.totalLectures, coursePrice: classInfo.coursePrice,
      materialPrice: classInfo.materialPrice, totalPrice: classInfo.coursePrice + classInfo.materialPrice,
      status: 'pushed', createTime: '2026-06-18 10:15', pushTime: '2026-06-18 10:18'
    }
    db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)').run(order.id, 'p001', order.studentId, order.classId, order.status, JSON.stringify(order))
    const notice = { id: 'n001', type: 'payment', title: '家长已完成支付', content: `${student.name}的${classInfo.name}订单已支付成功。`, time: '2026-06-18 11:03', orderId: order.id, read: false }
    db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?)').run(notice.id, 'p001', 0, JSON.stringify(notice))
  }
}

function ensureExternalContactStudent() {
  const id = 's_external_001'
  const enteredAt = '2026-06-24 15:30'
  const existing = studentFromRow(db.prepare('SELECT * FROM students WHERE id = ?').get(id))
  const student = {
    ...(existing || {}),
    id,
    name: '一只猪',
    avatar: existing?.avatar || 'avatars/student-10.png',
    phone: '13926860001',
    gender: 'male',
    englishName: 'Peter',
    currentGrade: '四年级',
    school: '南京市实验小学',
    city: '南京',
    campus: '南京校区',
    source: '企微外部联系人',
    guardian: {
      name: '朱女士',
      relation: '母亲',
      phone: '13926860001',
      wechatStatus: 'added'
    },
    stage: STUDENT_STAGES.PENDING_LEVEL,
    serviceStatus: SERVICE_STATUSES.NOT_STARTED,
    stageEnteredAt: enteredAt,
    appointment: {
      date: '2026-06-23',
      time: '15:30',
      campus: '南京校区',
      teacher: 'Lily老师'
    },
    evaluationScores: {
      totalScore: 76,
      fullScore: 100,
      listening: 18,
      reading: 24,
      grammar: 16,
      speaking: 18
    },
    assessmentSummary: {
      paper: '英语基础诊断卷 B',
      strengths: ['听力反应快', '课堂配合度高', '词汇量基础较好'],
      weaknesses: ['长篇阅读定位偏慢', '语法稳定性不足', '口语表达完整度需要提升'],
      teacherComment: '学生已完成现场评测，整体配合度较好，适合先完成定级后匹配秋季体系课。'
    },
    interests: ['动画', '自然科学', '英语绘本'],
    learningGoal: '希望暑期后进入体系课，重点提升阅读理解和口语表达。',
    cancellationReason: ''
  }

  db.prepare(`
    INSERT INTO students (id, primary_type, status, data, stage, service_status, stage_entered_at, cancellation_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      primary_type = excluded.primary_type,
      status = excluded.status,
      data = excluded.data,
      stage = excluded.stage,
      service_status = excluded.service_status,
      stage_entered_at = excluded.stage_entered_at,
      cancellation_reason = excluded.cancellation_reason
  `).run(
    id,
    STAGE_META[STUDENT_STAGES.PENDING_LEVEL].group,
    STUDENT_STAGES.PENDING_LEVEL,
    JSON.stringify(student),
    STUDENT_STAGES.PENDING_LEVEL,
    SERVICE_STATUSES.NOT_STARTED,
    enteredAt,
    ''
  )

  ensureHistory('history_s_external_001_added', id, null, STUDENT_STAGES.ADDED, '已添加企微并完成初步沟通', '系统', '2026-06-23 12:00')
  ensureHistory('history_s_external_001_pending_visit', id, STUDENT_STAGES.ADDED, STUDENT_STAGES.PENDING_VISIT, '已预约到访评测', '规划师Ella', '2026-06-23 20:10')
  ensureHistory('history_s_external_001_visited', id, STUDENT_STAGES.PENDING_VISIT, STUDENT_STAGES.VISITED, '学生已到访签到', '规划师Ella', '2026-06-24 15:20')
  ensureHistory('history_s_external_001_pending_level', id, STUDENT_STAGES.VISITED, STUDENT_STAGES.PENDING_LEVEL, '已完成测试，等待录入评测等级', '测评老师Lily', enteredAt)

  db.prepare("UPDATE student_tasks SET status = 'completed', completed_at = ? WHERE student_id = ? AND status = 'pending' AND task_type <> ?")
    .run(enteredAt, id, STUDENT_STAGES.PENDING_LEVEL)
  db.prepare(`
    INSERT INTO student_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      task_type = excluded.task_type,
      title = excluded.title,
      status = excluded.status,
      due_at = excluded.due_at,
      completed_at = excluded.completed_at,
      created_at = excluded.created_at,
      operator = excluded.operator
  `).run(
      'task_s_external_001_pending_level',
      id,
      STUDENT_STAGES.PENDING_LEVEL,
      STAGE_META[STUDENT_STAGES.PENDING_LEVEL].taskTitle,
      'pending',
      '2026-06-25 15:30',
      null,
      enteredAt,
      '系统'
  )

  ensureTrackRecord('record_s_external_001_1', id, '家长表示孩子平时接触英语绘本较多，希望系统评估后进入合适班型。', '2026-06-23 12:08', '规划师Ella')
  ensureTrackRecord('record_s_external_001_2', id, '已预约 6 月 23 日 15:30 到南京校区做英语基础诊断。家长更偏好周末班。', '2026-06-23 20:12', '规划师Ella')
  ensureTrackRecord('record_s_external_001_3', id, '学生到访后状态放松，听力和互动反应较好；阅读题需要提醒后才能稳定定位关键信息。', '2026-06-24 15:28', '测评老师Lily')
  ensureTrackRecord('record_s_external_001_4', id, '诊断卷已完成，总分 76/100，建议定级时重点参考 G4 体系课，后续确认阅读和口语提升目标。', '2026-06-24 15:40', '测评老师Lily')

  const corpId = process.env.WECOM_CORP_ID || 'wwed01457450ced6f6'
  if (!db.prepare('SELECT 1 FROM external_contact_mappings WHERE corp_id = ? AND external_userid = ?').get(corpId, 'debug_external_yizhizhu')) {
    db.prepare('INSERT INTO external_contact_mappings VALUES (?, ?, ?, ?, ?)').run(
      corpId,
      'debug_external_yizhizhu',
      id,
      '一只猪',
      '2026-06-23 21:34'
    )
  }
}

function ensureHistory(id, studentId, fromStage, toStage, reason, operator, changedAt) {
  if (db.prepare('SELECT 1 FROM student_stage_history WHERE id = ?').get(id)) return
  db.prepare('INSERT INTO student_stage_history VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, studentId, fromStage, toStage, reason, operator, changedAt
  )
}

function ensureTrackRecord(id, studentId, content, time, operator) {
  if (db.prepare('SELECT 1 FROM track_records WHERE id = ?').get(id)) return
  db.prepare('INSERT INTO track_records VALUES (?, ?, ?, ?, ?)').run(
    id, studentId, content, time, operator
  )
}

seed()

function plannerFromRow(row) {
  return row && { id: row.id, name: row.name, phone: row.mobile, userid: row.wecom_userid, unionid: row.unionid, campus: row.campus, roleName: row.role_name }
}

export function findOrCreatePlanner(identity = {}) {
  let row
  if (identity.userid) row = db.prepare('SELECT * FROM planners WHERE wecom_userid = ?').get(identity.userid)
  if (!row && identity.unionid) row = db.prepare('SELECT * FROM planners WHERE unionid = ?').get(identity.unionid)
  if (!row && identity.mobile) row = db.prepare('SELECT * FROM planners WHERE mobile = ?').get(identity.mobile)
  if (!row && !identity.userid && !identity.unionid && !identity.mobile) row = db.prepare('SELECT * FROM planners LIMIT 1').get()
  if (!row) {
    const id = `p_${Date.now()}`
    db.prepare('INSERT INTO planners VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, identity.name || identity.userid || identity.mobile || '新规划师', identity.mobile || null,
      identity.userid || null, identity.unionid || null, identity.campus || '企微登录', '学习规划师'
    )
    row = db.prepare('SELECT * FROM planners WHERE id = ?').get(id)
  }
  return plannerFromRow(row)
}

export function createSession(plannerId) {
  const token = randomUUID()
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(token, plannerId, nowText())
  return token
}

export function getPlannerByToken(token) {
  const row = db.prepare('SELECT p.* FROM sessions s JOIN planners p ON p.id = s.planner_id WHERE s.token = ?').get(token)
  return plannerFromRow(row)
}

export function getWorkbench(plannerId) {
  const students = db.prepare('SELECT * FROM students ORDER BY id').all().map(studentFromRow)
  const classes = db.prepare('SELECT data FROM classes ORDER BY id DESC').all().map(parse)
  const orders = db.prepare('SELECT data FROM orders WHERE planner_id = ? ORDER BY rowid DESC').all(plannerId).map(parse)
  const notifications = db.prepare('SELECT data FROM notifications WHERE planner_id = ? ORDER BY rowid DESC').all(plannerId).map(parse)
  const trackRecords = {}
  for (const row of db.prepare('SELECT * FROM track_records ORDER BY rowid DESC').all()) {
    ;(trackRecords[row.student_id] ||= []).push({ id: row.id, content: row.content, time: row.time, operator: row.operator })
  }
  const studentTasks = {}
  for (const row of db.prepare('SELECT * FROM student_tasks ORDER BY rowid DESC').all()) {
    ;(studentTasks[row.student_id] ||= []).push(taskFromRow(row))
  }
  return { students, classes, orders, notifications, trackRecords, studentTasks }
}

export function getStudent(id) {
  return studentFromRow(db.prepare('SELECT * FROM students WHERE id = ?').get(id))
}

export function findStudentByName(name) {
  const target = String(name || '').trim()
  if (!target) return null
  const rows = db.prepare('SELECT * FROM students').all()
  const matches = rows
    .map(studentFromRow)
    .filter((student) => student?.name?.trim() === target)
  return matches.length === 1 ? matches[0] : null
}

export function bindExternalContact({ corpId, externalUserid, studentId, displayName }) {
  const student = getStudent(studentId)
  if (!student || !corpId || !externalUserid) return null
  db.prepare(`
    INSERT INTO external_contact_mappings (corp_id, external_userid, student_id, display_name, bound_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(corp_id, external_userid) DO UPDATE SET
      student_id = excluded.student_id,
      display_name = excluded.display_name,
      bound_at = excluded.bound_at
  `).run(corpId, externalUserid, studentId, displayName || student.name, nowText())
  return { corpId, externalUserid, studentId, displayName: displayName || student.name, student }
}

export function getStudentByExternalUserid(corpId, externalUserid) {
  const row = db.prepare(`
    SELECT student_id, display_name
    FROM external_contact_mappings
    WHERE corp_id = ? AND external_userid = ?
  `).get(corpId, externalUserid)
  if (!row) return null
  const student = getStudent(row.student_id)
  return student && { externalUserid, studentId: row.student_id, displayName: row.display_name, student }
}

export function getTrackRecords(studentId) {
  return db.prepare('SELECT id, content, time, operator FROM track_records WHERE student_id = ? ORDER BY rowid DESC').all(studentId)
}

export function addTrackRecord(studentId, content, operator) {
  const record = { id: `tr_${Date.now()}`, content, time: nowText(), operator }
  db.prepare('INSERT INTO track_records VALUES (?, ?, ?, ?, ?)').run(record.id, studentId, content, record.time, operator)
  return record
}

function taskFromRow(row) {
  return row && {
    id: row.id,
    studentId: row.student_id,
    taskType: row.task_type,
    title: row.title,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    operator: row.operator
  }
}

function historyFromRow(row) {
  return row && {
    id: row.id,
    studentId: row.student_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    reason: row.reason,
    operator: row.operator,
    changedAt: row.changed_at
  }
}

export function getStudentTasks(studentId) {
  return db.prepare('SELECT * FROM student_tasks WHERE student_id = ? ORDER BY rowid DESC').all(studentId).map(taskFromRow)
}

export function getStageHistory(studentId) {
  return db.prepare('SELECT * FROM student_stage_history WHERE student_id = ? ORDER BY rowid DESC').all(studentId).map(historyFromRow)
}

export function updateStudentStage(id, nextStage, details = {}, operator = '系统') {
  const student = getStudent(id)
  if (!student) return { error: 'Student not found', status: 404 }
  if (!isStudentStage(nextStage)) return { error: 'Invalid student stage', status: 400 }
  if (!canTransitionStage(student.stage, nextStage)) {
    return { error: `Cannot transition from ${student.stage} to ${nextStage}`, status: 409 }
  }
  if (SYSTEM_CONTROLLED_STAGES.has(nextStage) && details.systemAction !== 'system_stage_update') {
    return { error: 'This stage is controlled by a business event', status: 409 }
  }
  if (nextStage === STUDENT_STAGES.CANCELLED && !details.cancellationReason?.trim()) {
    return { error: 'Cancellation reason is required', status: 400 }
  }
  if (nextStage === STUDENT_STAGES.PENDING_VISIT) {
    const appointment = details.appointment || student.appointment
    if (!appointment?.date || !appointment?.time || !appointment?.campus) {
      return { error: 'Appointment date, time and campus are required', status: 400 }
    }
    student.appointment = appointment
  }

  const fromStage = student.stage
  const changedAt = nowText()
  const serviceStatus = nextStage === STUDENT_STAGES.ENROLLED_STUDENT
    ? SERVICE_STATUSES.ACTIVE
    : nextStage === STUDENT_STAGES.HISTORICAL_STUDENT
      ? (details.serviceStatus || SERVICE_STATUSES.COMPLETED)
      : student.serviceStatus || SERVICE_STATUSES.NOT_STARTED
  student.stage = nextStage
  student.serviceStatus = serviceStatus
  student.stageEnteredAt = changedAt
  if (nextStage === STUDENT_STAGES.CANCELLED) {
    student.cancellationReason = details.cancellationReason.trim()
  } else if (fromStage === STUDENT_STAGES.CANCELLED) {
    student.cancellationReason = ''
  }

  db.prepare(`
    UPDATE students
    SET primary_type = ?, status = ?, data = ?, stage = ?, service_status = ?, stage_entered_at = ?, cancellation_reason = ?
    WHERE id = ?
  `).run(
    STAGE_META[nextStage].group, nextStage, JSON.stringify(student), nextStage,
    serviceStatus, changedAt, student.cancellationReason || '', id
  )
  db.prepare(`
    UPDATE student_tasks SET status = 'completed', completed_at = ?
    WHERE student_id = ? AND status = 'pending'
  `).run(changedAt, id)
  db.prepare('INSERT INTO student_stage_history VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    `history_${randomUUID()}`, id, fromStage, nextStage, details.reason?.trim() || null, operator, changedAt
  )
  createStageTask(id, nextStage, student, operator, changedAt)
  return { student: getStudent(id), tasks: getStudentTasks(id), stageHistory: getStageHistory(id) }
}

export function updateStudentEvaluation(id, evaluation = {}, operator = '系统') {
  const student = getStudent(id)
  if (!student) return { error: 'Student not found', status: 404 }
  if (![STUDENT_STAGES.PENDING_LEVEL, STUDENT_STAGES.ASSESSED, STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED].includes(student.stage)) {
    return { error: 'Evaluation can only be entered after the visit', status: 409 }
  }
  if (!evaluation.level?.trim()) return { error: 'Evaluation level is required', status: 400 }
  if (!['adapted', 'not_adapted'].includes(evaluation.fitResult)) return { error: 'Fit result is required', status: 400 }
  const totalScore = Number(evaluation.totalScore)
  const fullScore = Number(evaluation.fullScore)
  if (evaluation.totalScore !== undefined && (!Number.isFinite(totalScore) || totalScore < 0)) {
    return { error: 'Invalid evaluation score', status: 400 }
  }
  if (evaluation.fullScore !== undefined && (!Number.isFinite(fullScore) || fullScore <= 0)) {
    return { error: 'Invalid full score', status: 400 }
  }
  if (Number.isFinite(totalScore) && Number.isFinite(fullScore) && totalScore > fullScore) {
    return { error: 'Evaluation score cannot exceed full score', status: 400 }
  }

  if (evaluation.totalScore !== undefined || evaluation.fullScore !== undefined) {
    student.evaluationScores = {
      totalScore: evaluation.totalScore === undefined ? student.evaluationScores?.totalScore : totalScore,
      fullScore: evaluation.fullScore === undefined ? student.evaluationScores?.fullScore : fullScore
    }
  }
  student.evaluationResult = {
    ...student.evaluationResult,
    year: evaluation.year || student.evaluationResult?.year || String(new Date().getFullYear()),
    semester: evaluation.semester || student.evaluationResult?.semester || '',
    grade: evaluation.grade || student.currentGrade,
    classType: evaluation.classType || student.evaluationResult?.classType || '',
    level: evaluation.level.trim(),
    conclusion: evaluation.conclusion?.trim() || ''
  }
  db.prepare('UPDATE students SET data = ? WHERE id = ?').run(JSON.stringify(student), id)
  if (student.stage === STUDENT_STAGES.PENDING_LEVEL) {
    const assessedResult = updateStudentStage(id, STUDENT_STAGES.ASSESSED, { reason: '评测结果和等级已录入', systemAction: 'system_stage_update' }, operator)
    if (assessedResult.error) return assessedResult
  }
  const targetStage = evaluation.fitResult === 'adapted' ? STUDENT_STAGES.ADAPTED_NOT_CONVERTED : STUDENT_STAGES.NOT_ADAPTED
  return updateStudentStage(id, targetStage, {
    reason: evaluation.fitResult === 'adapted' ? '评测达标，进入适配未转化' : '评测不达标，暂无适配班级'
  }, operator)
}

export function completeStudentTask(id, operator = '系统') {
  const row = db.prepare('SELECT * FROM student_tasks WHERE id = ?').get(id)
  if (!row) return null
  const completedAt = nowText()
  db.prepare(`UPDATE student_tasks SET status = 'completed', completed_at = ?, operator = ? WHERE id = ?`).run(completedAt, operator, id)
  return taskFromRow(db.prepare('SELECT * FROM student_tasks WHERE id = ?').get(id))
}

export function createOrder(plannerId, studentId, classId, operator = '系统') {
  const student = getStudent(studentId)
  const classInfo = parse(db.prepare('SELECT data FROM classes WHERE id = ?').get(classId))
  if (!student || !classInfo) return null
  if (student.stage !== STUDENT_STAGES.ADAPTED_NOT_CONVERTED || !student.evaluationResult?.level) return null
  const stamp = Date.now()
  const order = {
    id: `o_${stamp}`, orderNo: `SY${stamp}`, studentId, studentName: student.name,
    classId, className: classInfo.name, courseType: classInfo.courseType, schedule: classInfo.schedule,
    location: classInfo.location, teacher: classInfo.teacher, totalLectures: classInfo.totalLectures,
    coursePrice: classInfo.coursePrice, materialPrice: classInfo.materialPrice,
    totalPrice: classInfo.coursePrice + classInfo.materialPrice, status: 'pending', createTime: nowText()
  }
  db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)').run(order.id, plannerId, studentId, classId, order.status, JSON.stringify(order))
  addTrackRecord(studentId, `已创建报名订单 ${order.orderNo}，等待确认并推送家长。`, operator)
  return order
}

export function pushOrder(plannerId, id, operator = '系统') {
  const row = db.prepare('SELECT data FROM orders WHERE id = ? AND planner_id = ?').get(id, plannerId)
  const order = parse(row)
  if (!order) return null
  order.status = 'pushed'
  order.pushTime = nowText()
  db.prepare('UPDATE orders SET status = ?, data = ? WHERE id = ?').run(order.status, JSON.stringify(order), id)
  const notice = { id: `n_${Date.now()}`, type: 'order', title: '订单已推送给家长', content: `${order.studentName}的${order.className}订单已发送到家长小程序。`, time: nowText(), orderId: id, read: false }
  db.prepare('INSERT INTO notifications VALUES (?, ?, ?, ?)').run(notice.id, plannerId, 0, JSON.stringify(notice))
  addTrackRecord(order.studentId, `报名订单 ${order.orderNo} 已推送给家长，等待支付。`, operator)
  return order
}

export { dbPath }
