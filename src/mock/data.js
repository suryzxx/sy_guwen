export const labels = {
  primaryTabs: [
    { value: 'lead', label: '线索资源' },
    { value: 'evaluation', label: '评测状态' },
    { value: 'student', label: '在读学员' }
  ],
  lead: [
    { value: 'to_add', label: '待添加' },
    { value: 'new_resource', label: '已添加' },
    { value: 'potential', label: '待激活' },
    { value: 'history', label: '历史学生' }
  ],
  evaluation: [
    { value: 'pending', label: '待到访' },
    { value: 'arrived', label: '已到访' },
    { value: 'tested', label: '已评测' },
    { value: 'cancelled', label: '已取消' }
  ],
  student: [
    { value: 'serving', label: '服务中' },
    { value: 'active', label: '在读学生' },
    { value: 'presale', label: '预售学生' }
  ]
}

export const students = [
  {
    id: 's001',
    name: '王小明',
    phone: '13800001111',
    gender: 'male',
    englishName: 'Tommy',
    currentGrade: '三年级',
    school: '南京市实验小学',
    city: '南京',
    campus: '五台山校区',
    primaryType: 'evaluation',
    status: 'pending',
    appointment: { date: '2026-06-20', time: '10:00', campus: '五台山校区', teacher: '张老师' }
  },
  {
    id: 's002',
    name: '李小红',
    phone: '13800002222',
    gender: 'female',
    englishName: 'Lucy',
    currentGrade: '四年级',
    school: '南京市第一小学',
    city: '南京',
    campus: '龙江校区',
    primaryType: 'evaluation',
    status: 'arrived',
    appointment: { date: '2026-06-19', time: '14:00', campus: '龙江校区', teacher: '李老师' }
  },
  {
    id: 's003',
    name: '张小强',
    phone: '13800003333',
    gender: 'male',
    englishName: 'Jack',
    currentGrade: '三年级',
    school: '深圳市育才小学',
    city: '深圳',
    campus: '南山校区',
    primaryType: 'evaluation',
    status: 'tested',
    reportSent: true,
    appointment: { date: '2026-06-18', time: '09:00', campus: '南山校区', teacher: '王老师' },
    evaluationScores: { totalScore: 85, fullScore: 100, part1: 18, part2: 22, part3: 20, part4: 25 },
    evaluationResult: { year: '2026', semester: '暑期', grade: 'G3', classType: '体系课' }
  },
  {
    id: 's004',
    name: '刘小芳',
    phone: '13800004444',
    gender: 'female',
    currentGrade: '五年级',
    school: '深圳市实验小学',
    city: '深圳',
    campus: '宝安校区',
    primaryType: 'evaluation',
    status: 'cancelled',
    appointment: { date: '2026-06-17', time: '15:00', campus: '宝安校区', teacher: '赵老师' }
  },
  {
    id: 'l001',
    name: '陈思涵',
    phone: '13800006666',
    gender: 'female',
    currentGrade: '四年级',
    school: '芳草园小学',
    city: '南京',
    campus: '鼓楼校区',
    primaryType: 'lead',
    leadStatus: 'to_add',
    source: '朋友推荐',
    lastContactTime: '2026-06-15 16:30',
    appointment: { date: '待预约', time: '-', campus: '鼓楼校区', teacher: '-' }
  },
  {
    id: 'l002',
    name: '周子轩',
    phone: '13700007777',
    gender: 'male',
    currentGrade: '五年级',
    school: '银城小学',
    city: '南京',
    campus: '五台山校区',
    primaryType: 'lead',
    leadStatus: 'potential',
    source: '公开课留资',
    lastContactTime: '2026-06-14 11:10',
    appointment: { date: '待预约', time: '-', campus: '五台山校区', teacher: '-' }
  },
  {
    id: 'a001',
    name: '吴佳琪',
    phone: '13400001010',
    gender: 'female',
    currentGrade: '三年级',
    school: '长江路小学',
    city: '南京',
    campus: '鼓楼校区',
    primaryType: 'student',
    studentStatus: 'serving',
    className: 'G3 暑期体系 A 班',
    classSchedule: '周六 09:00-11:00',
    lastActiveTime: '2026-06-16 09:30',
    appointment: { date: '-', time: '-', campus: '鼓楼校区', teacher: '陈老师' }
  },
  {
    id: 'a002',
    name: '黄浩然',
    phone: '13500009999',
    gender: 'male',
    currentGrade: '六年级',
    school: '北京东路小学',
    city: '南京',
    campus: '五台山校区',
    primaryType: 'student',
    studentStatus: 'presale',
    className: '小升初专项冲刺',
    classSchedule: '周日 14:00-16:00',
    lastActiveTime: '2026-06-12 18:20',
    appointment: { date: '-', time: '-', campus: '五台山校区', teacher: '李老师' }
  }
]

export const classes = [
  {
    id: 'c001',
    name: 'G3 暑期体系 A 班',
    courseType: '体系课',
    grade: '三年级',
    schedule: '周六 09:00-11:00',
    location: '五台山校区 302 教室',
    teacher: '李老师',
    totalLectures: 16,
    coursePrice: 3680,
    materialPrice: 280,
    matchTags: ['三年级', '体系课', '暑期']
  },
  {
    id: 'c002',
    name: 'G4 阅读写作专项班',
    courseType: '专项课',
    grade: '四年级',
    schedule: '周日 14:00-16:00',
    location: '鼓楼校区 205 教室',
    teacher: '王老师',
    totalLectures: 12,
    coursePrice: 2980,
    materialPrice: 220,
    matchTags: ['四年级', '专项课']
  },
  {
    id: 'c003',
    name: '小升初冲刺精品班',
    courseType: '冲刺课',
    grade: '六年级',
    schedule: '周五 18:30-20:30',
    location: '五台山校区 401 教室',
    teacher: '陈老师',
    totalLectures: 10,
    coursePrice: 3280,
    materialPrice: 180,
    matchTags: ['六年级', '升学']
  }
]

export const trackRecords = {
  s003: [
    { id: 'tr001', content: '家长认可测评结果，重点关注暑期上课时间和班级人数。', time: '2026-06-15 14:30', operator: '张顾问' },
    { id: 'tr002', content: '电话回访，孩子对英语学习有兴趣，计划本周确认报名。', time: '2026-06-12 10:20', operator: '张顾问' },
    { id: 'tr003', content: '首次联系，家长通过朋友推荐了解课程。', time: '2026-06-09 16:45', operator: '李顾问' }
  ],
  l001: [
    { id: 'tr004', content: '已添加家长微信，家长希望先看课程介绍。', time: '2026-06-15 16:30', operator: '张顾问' }
  ]
}

export const orders = [
  {
    id: 'o001',
    orderNo: 'SY202606160001',
    studentId: 's003',
    studentName: '张小强',
    classId: 'c001',
    className: 'G3 暑期体系 A 班',
    courseType: '体系课',
    schedule: '周六 09:00-11:00',
    location: '五台山校区 302 教室',
    teacher: '李老师',
    totalLectures: 16,
    coursePrice: 3680,
    materialPrice: 280,
    totalPrice: 3960,
    status: 'pushed',
    createTime: '2026-06-16 10:15',
    pushTime: '2026-06-16 10:18'
  }
]

export const notifications = [
  {
    id: 'n001',
    type: 'payment',
    title: '家长已完成支付',
    content: '张小强的 G3 暑期体系 A 班订单已支付成功。',
    time: '2026-06-16 11:03',
    orderId: 'o001',
    read: false
  },
  {
    id: 'n002',
    type: 'follow',
    title: '今日待跟进',
    content: '陈思涵超过 24 小时未更新跟进记录。',
    time: '2026-06-16 09:00',
    studentId: 'l001',
    read: true
  }
]
