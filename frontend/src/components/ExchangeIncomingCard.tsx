import { useState } from 'react';
import {
  createExchangeAnswer,
  deferExchangeQuestion,
  formatExchangeAuthorName,
  formatExchangeAuthorTrack,
  type IncomingQuestion,
} from '../api/exchange';

interface Props {
  question: IncomingQuestion;
  onDone: () => void;
}

export function ExchangeIncomingCard({ question, onDone }: Props) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDefer = async () => {
    setSubmitting(true);
    try {
      await deferExchangeQuestion(question.assignmentId);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      await createExchangeAnswer(question.questionId, answer.trim());
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nfo-ex-incoming-block">
      <div className="nfo-ex-notify">
        <div className="nfo-ex-notify-lbl">{formatExchangeAuthorName(question.authorFirstName, question.authorLastName)}</div>
        {question.authorTrack ? (
          <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginBottom: 4 }}>
            {formatExchangeAuthorTrack(question.authorTrack)}
          </div>
        ) : null}
        <div className="nfo-ex-notify-q">{question.text}</div>
      </div>

      <div className="nfo-ex-card" style={{ marginTop: 10 }}>
        <div className="nfo-ex-lbl">Твой ответ</div>
        <textarea
          className="nfo-input"
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Напиши ответ..."
        />
        <button
          type="button"
          className="nfo-ex-send"
          disabled={submitting || !answer.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Отправка…' : 'Отправить ответ'}
        </button>
        <button
          type="button"
          className="nfo-ex-skip"
          disabled={submitting}
          onClick={() => void handleDefer()}
        >
          Ответить позже
        </button>
      </div>
    </div>
  );
}
