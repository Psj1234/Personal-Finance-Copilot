const API_BASE_URL = '/api'
const TOKEN_KEY = 'finance_copilot_token'

let currentToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
let unauthorizedCallback = null

export function setAuthToken(token) {
  currentToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }
}

export function getAuthToken() {
  return currentToken
}

export function onUnauthorized(callback) {
  unauthorizedCallback = callback
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // If 401 on a protected endpoint (not login/register), notify auth layer
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      if (typeof unauthorizedCallback === 'function') {
        unauthorizedCallback()
      }
    }

    const error = new Error(data?.error || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }

  return data
}

// Authentication endpoints
export function loginUser(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function registerUser(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export function getMe() {
  return request('/auth/me')
}

// Protected dashboard & analytics endpoints
export function getAnalyticsSummary() {
  return request('/analytics/summary')
}

export function createTransaction(transaction) {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  })
}

export function sendChatMessage(question) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

export function getBudgets() {
  return request('/budgets')
}

export function createBudget(budget) {
  return request('/budgets', {
    method: 'POST',
    body: JSON.stringify(budget),
  })
}

export function updateBudget(id, budget) {
  return request(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(budget),
  })
}

export function deleteBudget(id) {
  return request(`/budgets/${id}`, {
    method: 'DELETE',
  })
}
