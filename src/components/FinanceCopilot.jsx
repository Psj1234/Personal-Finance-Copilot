import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../services/api.js'

const exampleQuestions = [
  'How much did I spend on food this month?',
  'Where am I spending the most?',
  'What did I spend last month?',
]

function FinanceCopilot() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isSending])

  async function submitQuestion(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim()
    if (!trimmedQuestion || isSending) {
      if (!trimmedQuestion) {
        setError('Ask a question to start the conversation.')
      }
      return
    }

    setError('')
    setQuestion('')
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: `${Date.now()}-user`, role: 'user', content: trimmedQuestion },
    ])
    setIsSending(true)

    try {
      const result = await sendChatMessage(trimmedQuestion)
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: result.answer },
      ])
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach Finance Copilot right now.')
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitQuestion()
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitQuestion()
    }
  }

  return (
    <section className="panel copilot-panel" id="copilot" aria-labelledby="copilot-title">
      <div className="copilot-heading">
        <div className="copilot-title-lockup">
          <span className="copilot-icon" aria-hidden="true">✦</span>
          <div>
            <p className="eyebrow">YOUR FINANCE GUIDE</p>
            <h2 id="copilot-title">Finance Copilot</h2>
          </div>
        </div>
        <span className="copilot-status"><span className="live-dot" /> Ready to help</span>
      </div>

      <div className="chat-window" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-mark" aria-hidden="true">?</div>
            <h3>Ask me anything about your spending.</h3>
            <p>I&apos;ll look through your recorded transactions and keep the answer grounded in your ledger.</p>
            <div className="question-suggestions" aria-label="Example questions">
              {exampleQuestions.map((example) => (
                <button type="button" key={example} onClick={() => submitQuestion(example)} disabled={isSending}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message) => (
              <div className={`message-row ${message.role}`} key={message.id}>
                <div className="message-bubble">
                  <span className="message-label">{message.role === 'user' ? 'You' : 'Copilot'}</span>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="message-row assistant">
                <div className="message-bubble loading-bubble" role="status">
                  <span className="message-label">Copilot</span>
                  <span className="typing-dots"><i /><i /><i /></span>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error ? <p className="chat-error" role="alert">{error}</p> : null}
      <form className="chat-composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="copilot-question">Ask Finance Copilot</label>
        <input
          id="copilot-question"
          type="text"
          value={question}
          onChange={(event) => { setQuestion(event.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your money..."
          disabled={isSending}
          autoComplete="off"
        />
        <button type="submit" disabled={isSending || !question.trim()} aria-label="Send question">
          <span>{isSending ? 'Thinking...' : 'Send'}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p className="chat-disclaimer">Answers are based on the transactions in your ledger.</p>
    </section>
  )
}

export default FinanceCopilot
