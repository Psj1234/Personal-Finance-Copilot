import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sendChatMessage } from '../services/api.js'

function FinanceCopilot() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const exampleQuestions = t('copilot.exampleQuestions', { returnObjects: true }) || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, isSending])

  async function submitQuestion(nextQuestion = question) {
    const trimmedQuestion = nextQuestion.trim()
    if (!trimmedQuestion || isSending) {
      if (!trimmedQuestion) {
        setError({ key: 'copilot.emptyQuestionError' })
      }
      return
    }

    setError(null)
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
      setError({ message: requestError.message || t('copilot.requestError') })
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
            <p className="eyebrow">{t('copilot.eyebrow')}</p>
            <h2 id="copilot-title">{t('copilot.heading')}</h2>
          </div>
        </div>
        <span className="copilot-status"><span className="live-dot" /> {t('copilot.statusReady')}</span>
      </div>

      <div className="chat-window" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-mark" aria-hidden="true">?</div>
            <h3>{t('copilot.emptyTitle')}</h3>
            <p>{t('copilot.emptyDesc')}</p>
            <div className="question-suggestions" aria-label="Example questions">
              {Array.isArray(exampleQuestions) && exampleQuestions.map((example) => (
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
                  <span className="message-label">{message.role === 'user' ? t('copilot.you') : t('copilot.copilot')}</span>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="message-row assistant">
                <div className="message-bubble loading-bubble" role="status">
                  <span className="message-label">{t('copilot.copilot')}</span>
                  <span className="typing-dots"><i /><i /><i /></span>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error ? (
        <p className="chat-error" role="alert">
          {error.key ? t(error.key) : error.message}
        </p>
      ) : null}
      <form className="chat-composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="copilot-question">{t('copilot.srLabel')}</label>
        <input
          id="copilot-question"
          type="text"
          value={question}
          onChange={(event) => { setQuestion(event.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          placeholder={t('copilot.inputPlaceholder')}
          disabled={isSending}
          autoComplete="off"
        />
        <button type="submit" disabled={isSending || !question.trim()} aria-label={t('copilot.sendQuestionAria')}>
          <span>{isSending ? t('copilot.thinking') : t('copilot.send')}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p className="chat-disclaimer">{t('copilot.disclaimer')}</p>
    </section>
  )
}

export default FinanceCopilot
