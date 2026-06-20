import { Div, FormItem, Input, Textarea } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { DatetimeLocalMskInput } from '../components/DatetimeLocalMskInput';
import { AdminListCard } from '../components/AdminListCard';
import { datetimeLocalMskToIso, isoToDatetimeLocalMsk } from '../lib/datetimeMsk';
import {
  fetchAdminDilemmas,
  createAdminDilemma,
  updateAdminDilemma,
  deleteAdminDilemma,
  publishAdminDilemma,
  unpublishAdminDilemma,
  notifyAdminDilemma,
  type AdminDilemma,
} from '../api/dilemmas';

export function AdminDilemmasTab() {
  const [dilemmas, setDilemmas] = useState<AdminDilemma[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [newText, setNewText] = useState('');
  const [newOptionA, setNewOptionA] = useState('');
  const [newOptionB, setNewOptionB] = useState('');
  const [newPublishedAt, setNewPublishedAt] = useState('');
  const [newPoints, setNewPoints] = useState('3');

  const [editText, setEditText] = useState('');
  const [editOptionA, setEditOptionA] = useState('');
  const [editOptionB, setEditOptionB] = useState('');
  const [editPublishedAt, setEditPublishedAt] = useState('');
  const [editPoints, setEditPoints] = useState('3');

  const load = () => {
    setLoading(true);
    fetchAdminDilemmas()
      .then((r) => setDilemmas(r.dilemmas))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newText.trim() || !newOptionA.trim() || !newOptionB.trim() || !newPublishedAt) {
      alert('Заполните все поля: текст дилеммы, вариант А, вариант Б и дату');
      return;
    }
    try {
      await createAdminDilemma({
        text: newText.trim(),
        optionA: newOptionA.trim(),
        optionB: newOptionB.trim(),
        publishedAt: datetimeLocalMskToIso(newPublishedAt),
        pointsPerVote: Number(newPoints) || 3,
      });
      setNewText('');
      setNewOptionA('');
      setNewOptionB('');
      setNewPublishedAt('');
      setNewPoints('3');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка создания');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateAdminDilemma(id, {
        text: editText.trim(),
        optionA: editOptionA.trim(),
        optionB: editOptionB.trim(),
        publishedAt: editPublishedAt ? datetimeLocalMskToIso(editPublishedAt) : undefined,
        pointsPerVote: Number(editPoints) || 3,
      });
      setEditingId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Удалить дилемму? Все голоса будут удалены.')) return;
    deleteAdminDilemma(id)
      .then(load)
      .catch((e) => alert(e instanceof Error ? e.message : 'Ошибка удаления'));
  };

  const handlePublish = async (id: number) => {
    setBusyId(id);
    try {
      await publishAdminDilemma(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка публикации');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublish = async (id: number) => {
    if (!window.confirm('Снять с публикации? Участники больше не увидят дилемму.')) return;
    setBusyId(id);
    try {
      await unpublishAdminDilemma(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusyId(null);
    }
  };

  const handleNotify = async (id: number) => {
    if (!window.confirm('Отправить push-уведомление всем участникам?')) return;
    setBusyId(id);
    try {
      const result = await notifyAdminDilemma(id);
      alert(`Уведомление отправлено: ${result.sent} получателей`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Новая дилемма</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Текст дилеммы">
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Например: «Результат важнее процесса» / «Процесс важнее результата»"
            rows={3}
          />
        </FormItem>
        <FormItem top="Вариант А">
          <Input value={newOptionA} onChange={(e) => setNewOptionA(e.target.value)} placeholder="Первый тезис" />
        </FormItem>
        <FormItem top="Вариант Б">
          <Input value={newOptionB} onChange={(e) => setNewOptionB(e.target.value)} placeholder="Второй тезис" />
        </FormItem>
        <DatetimeLocalMskInput top="Дата автопубликации (МСК)" value={newPublishedAt} onChange={setNewPublishedAt} />
        <FormItem top="Баллы за голос">
          <Input type="number" value={newPoints} onChange={(e) => setNewPoints(e.target.value)} />
        </FormItem>
        <button
          type="button"
          className="nfo-admin-btn-primary"
          onClick={() => void handleCreate()}
        >
          Сохранить дилемму
        </button>
        <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 6 }}>
          Дилемма сохраняется без публикации. Используй кнопку «Опубликовать» чтобы показать участникам.
        </div>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 8 }}>
        Список дилемм ({dilemmas.length})
      </div>
      {loading && <div className="nfo-admin-empty">Загрузка...</div>}
      {!loading && dilemmas.length === 0 && <div className="nfo-admin-empty">Дилемм пока нет</div>}
      {dilemmas.map((d) => (
        <AdminListCard
          key={d.id}
          title={editingId === d.id ? 'Редактирование' : d.text}
          meta={
            editingId !== d.id
              ? `${d.isPublished ? '✓ Опубликовано' : '⏱ Не опубликовано'} · Авто: ${new Date(d.publishedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${d.votesTotal} голосов${d.votesTotal > 0 ? ` (А: ${d.percentA}% / Б: ${d.percentB}%)` : ''}`
              : undefined
          }
          actions={
            editingId !== d.id ? (
              <>
                {!d.isPublished && (
                  <button
                    type="button"
                    className="nfo-admin-btn-primary"
                    disabled={busyId === d.id}
                    onClick={() => void handlePublish(d.id)}
                  >
                    Опубликовать
                  </button>
                )}
                {d.isPublished && (
                  <>
                    <button
                      type="button"
                      className="nfo-admin-btn-outline"
                      disabled={busyId === d.id}
                      onClick={() => void handleNotify(d.id)}
                    >
                      Послать уведомление
                    </button>
                    <button
                      type="button"
                      className="nfo-admin-btn-secondary"
                      disabled={busyId === d.id}
                      onClick={() => void handleUnpublish(d.id)}
                    >
                      Снять с публикации
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="nfo-admin-btn-outline"
                  onClick={() => {
                    setEditingId(d.id);
                    setEditText(d.text);
                    setEditOptionA(d.optionA);
                    setEditOptionB(d.optionB);
                    setEditPublishedAt(isoToDatetimeLocalMsk(d.publishedAt));
                    setEditPoints(String(d.pointsPerVote));
                  }}
                >
                  Изменить
                </button>
                <button type="button" className="nfo-admin-btn-danger" onClick={() => handleDelete(d.id)}>
                  Удалить
                </button>
              </>
            ) : undefined
          }
        >
          {editingId === d.id ? (
            <div>
              <FormItem top="Текст дилеммы">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
              </FormItem>
              <FormItem top="Вариант А">
                <Input value={editOptionA} onChange={(e) => setEditOptionA(e.target.value)} />
              </FormItem>
              <FormItem top="Вариант Б">
                <Input value={editOptionB} onChange={(e) => setEditOptionB(e.target.value)} />
              </FormItem>
              <DatetimeLocalMskInput top="Дата автопубликации (МСК)" value={editPublishedAt} onChange={setEditPublishedAt} />
              <FormItem top="Баллы за голос">
                <Input type="number" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} />
              </FormItem>
              <div className="nfo-admin-actions">
                <button type="button" className="nfo-admin-btn-primary" onClick={() => void handleUpdate(d.id)}>
                  Сохранить
                </button>
                <button type="button" className="nfo-admin-btn-secondary" onClick={() => setEditingId(null)}>
                  Отмена
                </button>
              </div>
              {d.votesTotal > 0 && (
                <Div style={{ marginTop: 8, fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>
                  Голоса: {d.votesTotal} · А: {d.percentA}% · Б: {d.percentB}%
                </Div>
              )}
            </div>
          ) : null}
        </AdminListCard>
      ))}
    </div>
  );
}
