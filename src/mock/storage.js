import { classes, notifications, orders, students, trackRecords } from './data'

const STORAGE_KEY = 'sy_guwen_mock_state'

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function initialState() {
  return {
    students: clone(students),
    classes: clone(classes),
    trackRecords: clone(trackRecords),
    orders: clone(orders),
    notifications: clone(notifications)
  }
}

export function getMockState() {
  const cached = localStorage.getItem(STORAGE_KEY)
  if (!cached) {
    const state = initialState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }

  try {
    return JSON.parse(cached)
  } catch {
    const state = initialState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }
}

export function setMockState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  return nextState
}

export function updateMockState(updater) {
  const state = getMockState()
  const nextState = updater(state) || state
  return setMockState(nextState)
}
