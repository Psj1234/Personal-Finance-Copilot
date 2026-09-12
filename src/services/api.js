const API_BASE_URL = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }

  return data
}

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
