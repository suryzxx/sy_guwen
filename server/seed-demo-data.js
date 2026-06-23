import { DatabaseSync } from 'node:sqlite'
import { dbPath } from './database.js'
import { SERVICE_STATUSES, STAGE_META, STUDENT_STAGES } from '../shared/student-workflow.js'

const db = new DatabaseSync(dbPath)
const existing = db.prepare("SELECT COUNT(*) AS count FROM students WHERE id LIKE 'demo2_%'").get().count

if (existing) {
  console.log(`模拟数据已存在：${existing} 名学生，未重复写入。`)
  process.exit(0)
}

const now = new Date()
const names = [
  '林知夏', '沈星遥', '顾言溪', '苏景辰', '江予安', '温以宁', '陆星野', '许清欢',
  '周慕白', '程南乔', '叶初晴', '宋云舟', '唐可昕', '陈嘉树', '梁书瑶', '何沐阳',
  '谢安然', '蒋思源', '邵雨桐', '方予墨', '韩若溪', '郑嘉禾', '冯语晨', '曹明轩',
  '潘芷宁', '白景行', '范思远', '黄嘉言', '吴佳音', '刘宇辰', '钱书宁', '赵亦航',
  '孙若彤', '王嘉佑'
]

function demoAvatarFor(index) {
  const avatarIndex = (index * 7) % 20 + 1
  return `avatars/student-${String(avatarIndex).padStart(2, '0')}.png`
}

const scenarios = [
  ...makeScenarios(STUDENT_STAGES.PENDING_ADD, [-2, 4, 18, 24]),
  ...makeScenarios(STUDENT_STAGES.ADDED, [-3, 2, 8, 60]),
  ...makeScenarios(STUDENT_STAGES.PENDING_ACTIVATION, [-8, 12, 48]),
  ...makeScenarios(STUDENT_STAGES.PENDING_VISIT, [-1, 2, 5, 26], { appointment: true }),
  ...makeScenarios(STUDENT_STAGES.CANCELLED, [-5, 12, 30]),
  ...makeScenarios(STUDENT_STAGES.VISITED, [-10, 4, 20]),
  ...makeScenarios(STUDENT_STAGES.PENDING_LEVEL, [-7, 6, 18]),
  ...makeScenarios(STUDENT_STAGES.ADAPTED_NOT_CONVERTED, [-6, 5, 28, 46]),
  ...makeScenarios(STUDENT_STAGES.NOT_ADAPTED, [null, null]),
  ...makeScenarios(STUDENT_STAGES.ENROLLED_STUDENT, [null, null, null, null]),
  ...makeScenarios(STUDENT_STAGES.HISTORICAL_STUDENT, [null, null, null])
]

const classes = db.prepare('SELECT data FROM classes ORDER BY id').all().map((row) => JSON.parse(row.data))
const insertStudent = db.prepare(`
  INSERT INTO students (
    id, primary_type, status, data, stage, service_status, stage_entered_at, cancellation_reason
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const insertHistory = db.prepare('INSERT INTO student_stage_history VALUES (?, ?, ?, ?, ?, ?, ?)')
const insertTask = db.prepare('INSERT INTO student_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
const insertRecord = db.prepare('INSERT INTO track_records VALUES (?, ?, ?, ?, ?)')
const insertOrder = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)')

db.exec('BEGIN')
try {
  scenarios.forEach((scenario, index) => {
    const id = `demo2_${String(index + 1).padStart(3, '0')}`
    const stage = scenario.stage
    const currentClass = classes[index % classes.length]
    const enteredAt = formatDate(addHours(now, -(index % 5 + 1) * 12))
    const serviceStatus = serviceStatusFor(stage)
    const appointment = appointmentFor(scenario, index)
    const student = {
      id,
      name: names[index],
      avatar: demoAvatarFor(index),
      englishName: `Demo${index + 1}`,
      phone: `139${String(26000000 + index).padStart(8, '0')}`,
      gender: index % 2 ? 'female' : 'male',
      currentGrade: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'][index % 6],
      school: ['南京市实验小学', '芳草园小学', '拉萨路小学', '深圳市育才小学'][index % 4],
      city: index % 4 === 3 ? '深圳' : '南京',
      campus: index % 4 === 3 ? '深圳校区' : '南京校区',
      guardian: {
        name: `${names[index][0]}女士`,
        relation: index % 3 === 0 ? '父亲' : '母亲',
        wechatStatus: stage === STUDENT_STAGES.PENDING_ADD ? 'pending' : 'added'
      },
      stage,
      serviceStatus,
      stageEnteredAt: enteredAt,
      appointment,
      cancellationReason: stage === STUDENT_STAGES.CANCELLED ? '近期时间安排冲突，希望下月再约' : ''
    }

    if (hasEvaluation(stage)) {
      student.evaluationScores = { totalScore: 72 + index % 24, fullScore: 100 }
      student.evaluationResult = {
        year: String(now.getFullYear()),
        semester: '暑期',
        grade: currentClass.grade,
        classType: stage === STUDENT_STAGES.NOT_ADAPTED ? '暂无适配' : currentClass.courseType,
        level: stage === STUDENT_STAGES.NOT_ADAPTED ? '暂不达标' : ['A', 'A+', 'S1'][index % 3],
        conclusion: stage === STUDENT_STAGES.NOT_ADAPTED
          ? '当前基础暂未达到现有班级要求，建议先做基础巩固后再次评测。'
          : '基础知识较扎实，建议结合阅读和表达能力继续提升。'
      }
    }

    if (stage === STUDENT_STAGES.ENROLLED_STUDENT) {
      student.className = currentClass.name
      student.classSchedule = currentClass.schedule
    }

    insertStudent.run(
      id, STAGE_META[stage].group, stage, JSON.stringify(student), stage,
      serviceStatus, enteredAt, student.cancellationReason
    )
    insertStageHistory(id, stage, enteredAt, index)
    insertStageTask(id, stage, scenario.dueOffsetHours, appointment, enteredAt)
    insertTrackRecords(id, stage, index, enteredAt)
    insertStageOrder(id, student, currentClass, stage, index, enteredAt)
  })
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}

const summary = db.prepare("SELECT stage, COUNT(*) AS count FROM students WHERE id LIKE 'demo2_%' GROUP BY stage ORDER BY stage").all()
const orderCount = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE id LIKE 'demo2_%'").get().count
const recordCount = db.prepare("SELECT COUNT(*) AS count FROM track_records WHERE student_id LIKE 'demo2_%'").get().count
const taskCount = db.prepare("SELECT COUNT(*) AS count FROM student_tasks WHERE student_id LIKE 'demo2_%'").get().count

console.log(JSON.stringify({ database: dbPath, students: scenarios.length, orders: orderCount, records: recordCount, tasks: taskCount, stages: summary }, null, 2))

function makeScenarios(stage, dueOffsets, extra = {}) {
  return dueOffsets.map((dueOffsetHours) => ({ stage, dueOffsetHours, ...extra }))
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function serviceStatusFor(stage) {
  if (stage === STUDENT_STAGES.ENROLLED_STUDENT) return SERVICE_STATUSES.ACTIVE
  if (stage === STUDENT_STAGES.HISTORICAL_STUDENT) return SERVICE_STATUSES.COMPLETED
  return SERVICE_STATUSES.NOT_STARTED
}

function appointmentFor(scenario, index) {
  if (scenario.appointment) {
    const time = addHours(now, scenario.dueOffsetHours)
    return {
      date: formatDate(time).slice(0, 10),
      time: formatDate(time).slice(11),
      campus: index % 4 === 3 ? '深圳校区' : '南京校区',
      teacher: ['Lily老师', 'Ella老师', 'Mia老师'][index % 3]
    }
  }
  const past = addHours(now, -(index % 4 + 1) * 24)
  return {
    date: formatDate(past).slice(0, 10),
    time: ['10:00', '14:00', '16:30'][index % 3],
    campus: index % 4 === 3 ? '深圳校区' : '南京校区',
    teacher: ['Lily老师', 'Ella老师', 'Mia老师'][index % 3]
  }
}

function previousStageFor(stage) {
  return {
    [STUDENT_STAGES.ADDED]: STUDENT_STAGES.PENDING_ADD,
    [STUDENT_STAGES.PENDING_ACTIVATION]: STUDENT_STAGES.ADDED,
    [STUDENT_STAGES.PENDING_VISIT]: STUDENT_STAGES.ADDED,
    [STUDENT_STAGES.CANCELLED]: STUDENT_STAGES.PENDING_VISIT,
    [STUDENT_STAGES.VISITED]: STUDENT_STAGES.PENDING_VISIT,
    [STUDENT_STAGES.PENDING_LEVEL]: STUDENT_STAGES.VISITED,
    [STUDENT_STAGES.ASSESSED]: STUDENT_STAGES.PENDING_LEVEL,
    [STUDENT_STAGES.ADAPTED_NOT_CONVERTED]: STUDENT_STAGES.ASSESSED,
    [STUDENT_STAGES.NOT_ADAPTED]: STUDENT_STAGES.ASSESSED,
    [STUDENT_STAGES.ENROLLED_STUDENT]: STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
    [STUDENT_STAGES.HISTORICAL_STUDENT]: STUDENT_STAGES.ENROLLED_STUDENT
  }[stage] || null
}

function insertStageHistory(studentId, stage, enteredAt, index) {
  const previousStage = previousStageFor(stage)
  if (previousStage) {
    insertHistory.run(
      `history_${studentId}_previous`, studentId, null, previousStage,
      '模拟历史阶段', '系统', formatDate(addHours(new Date(enteredAt.replace(' ', 'T')), -24))
    )
  }
  insertHistory.run(
    `history_${studentId}_current`, studentId, previousStage, stage,
    index % 2 ? '规划师更新学生进度' : '业务事件自动更新', index % 2 ? '规划师Ella' : '系统', enteredAt
  )
}

function insertStageTask(studentId, stage, dueOffsetHours, appointment, enteredAt) {
  const meta = STAGE_META[stage]
  if (!meta.taskTitle || dueOffsetHours === null) return
  const dueAt = meta.useAppointmentDue && appointment?.date
    ? `${appointment.date} ${appointment.time}`
    : formatDate(addHours(now, dueOffsetHours))
  insertTask.run(
    `task_${studentId}`, studentId, stage, meta.taskTitle, 'pending', dueAt,
    null, enteredAt, '系统'
  )
}

function insertTrackRecords(studentId, stage, index, enteredAt) {
  const records = recordTemplates(stage, index)
  records.forEach((record, recordIndex) => {
    insertRecord.run(
      `record_${studentId}_${recordIndex + 1}`,
      studentId,
      record.content,
      formatDate(addHours(new Date(enteredAt.replace(' ', 'T')), recordIndex * 3)),
      record.operator
    )
  })
}

function recordTemplates(stage, index) {
  const common = [
    { content: '家长关注孩子目前的英语基础，希望了解适合的学习路径和时间安排。', operator: '规划师Ella' },
    { content: index % 2 ? '家长更方便周末沟通，工作日晚上回复较慢。' : '家长希望优先安排离家较近的校区。', operator: '规划师Ella' }
  ]
  if ([STUDENT_STAGES.VISITED, STUDENT_STAGES.PENDING_LEVEL, STUDENT_STAGES.ADAPTED_NOT_CONVERTED, STUDENT_STAGES.NOT_ADAPTED].includes(stage)) {
    common.push({ content: '学生已完成现场评测，课堂配合度良好，阅读部分需要进一步加强。', operator: '测评老师Lily' })
  }
  if (stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED) {
    common.push({ content: '已向家长说明适配班级时间、课次和费用，家长需要与家人确认。', operator: '规划师Ella' })
  }
  if (stage === STUDENT_STAGES.ENROLLED_STUDENT) {
    common.push({ content: '近期出勤稳定，课堂参与积极，建议继续加强课后阅读练习。', operator: '班主任Anna' })
    common.push({ content: '家长反馈孩子学习意愿有所提升，希望定期了解阶段进展。', operator: '服务老师Mia' })
  }
  return common
}

function hasEvaluation(stage) {
  return [
    STUDENT_STAGES.ASSESSED,
    STUDENT_STAGES.PENDING_LEVEL,
    STUDENT_STAGES.ADAPTED_NOT_CONVERTED,
    STUDENT_STAGES.NOT_ADAPTED,
    STUDENT_STAGES.ENROLLED_STUDENT
  ].includes(stage)
}

function insertStageOrder(studentId, student, classInfo, stage, index, enteredAt) {
  const status = stage === STUDENT_STAGES.ADAPTED_NOT_CONVERTED
    ? (index % 2 ? 'pushed' : 'pending')
    : stage === STUDENT_STAGES.ENROLLED_STUDENT
      ? 'paid'
      : null
  if (!status) return
  const order = {
    id: `demo2_order_${studentId}`,
    orderNo: `DEMO${String(index + 1).padStart(6, '0')}`,
    studentId,
    studentName: student.name,
    classId: classInfo.id,
    className: classInfo.name,
    courseType: classInfo.courseType,
    schedule: classInfo.schedule,
    location: classInfo.location,
    teacher: classInfo.teacher,
    totalLectures: classInfo.totalLectures,
    coursePrice: classInfo.coursePrice,
    materialPrice: classInfo.materialPrice,
    totalPrice: classInfo.coursePrice + classInfo.materialPrice,
    status,
    createTime: enteredAt
  }
  if (['pushed', 'paid'].includes(status)) order.pushTime = formatDate(addHours(new Date(enteredAt.replace(' ', 'T')), 1))
  if (status === 'paid') order.payTime = formatDate(addHours(new Date(enteredAt.replace(' ', 'T')), 3))
  insertOrder.run(order.id, 'p001', studentId, classInfo.id, status, JSON.stringify(order))
}
