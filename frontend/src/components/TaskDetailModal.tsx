import {
  Button,
  Div,
  ModalPage,
  ModalPageHeader,
  ModalRoot,
  Spinner,
} from '@vkontakte/vkui';
import type { TaskItem } from '../api/tasks';
import { resolvePhotoUrl } from '../lib/mediaUrls';

function contactsRequired(task: TaskItem) {
  return task.contactsRequired ?? task.networkingContacts ?? 1;
}

function isMultiNetworking(task: TaskItem) {
  return !!task.isRandomDistribution && contactsRequired(task) > 1;
}

function NetworkingPartnersList({
  partners,
  title,
}: {
  partners?: TaskItem['partners'];
  title: string;
}) {
  if (!partners?.length) return null;
  return (
    <div style={{ marginTop: 12, padding: 10, background: '#f2f3f9', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {partners.map((p) => (
        <div key={p.id} style={{ marginBottom: 4 }}>
          {p.firstName} {p.lastName ?? ''}{p.track ? ` · ${p.track}` : ''}
        </div>
      ))}
    </div>
  );
}

export interface TaskDetailModalProps {
  task: TaskItem | null;
  loading: boolean;
  answer: string;
  photos: string[];
  uploading: boolean;
  submitting: boolean;
  networkingLoading: boolean;
  uploadError: string | null;
  onClose: () => void;
  onAnswerChange: (value: string) => void;
  onUploadPhoto: () => void;
  onSubmit: () => void;
  onApplyNetworking: (task: TaskItem) => void;
}

function TaskDetailContent({
  task,
  answer,
  photos,
  uploading,
  submitting,
  networkingLoading,
  uploadError,
  onAnswerChange,
  onUploadPhoto,
  onSubmit,
  onApplyNetworking,
}: Omit<TaskDetailModalProps, 'task' | 'loading' | 'onClose'> & { task: TaskItem }) {
  const blockedNetworking =
    task.isRandomDistribution &&
    task.networkingStatus !== 'paired' &&
    task.status !== 'approved';

  if (blockedNetworking) {
    return (
      <Div style={{ padding: '12px 16px 24px' }}>
        <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.4 }}>
          {task.description}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#f39c12', lineHeight: 1.45 }}>
          {!task.networkingStatus
            ? isMultiNetworking(task)
              ? `Подай заявку — назначим ${contactsRequired(task)} участников для знакомства.`
              : 'Сначала подай заявку на нетворкинг — после назначения партнёра откроется форма задания.'
            : isMultiNetworking(task)
              ? `Назначено ${task.partners?.length ?? 0} из ${contactsRequired(task)}. «Выполнить» откроется, когда все будут готовы.`
              : 'Ожидаем партнёра. Как только пара будет готова, нажми «Выполнить» в списке заданий.'}
        </div>
        {task.partners && task.partners.length > 0 && (
          <NetworkingPartnersList
            partners={task.partners}
            title={isMultiNetworking(task) ? 'Участники для знакомства:' : 'Твой партнёр:'}
          />
        )}
        {!task.networkingStatus && (
          <Button
            size="m"
            mode="primary"
            stretched
            style={{ marginTop: 16 }}
            loading={networkingLoading}
            onClick={() => onApplyNetworking(task)}
          >
            {isMultiNetworking(task) ? 'Получить участников' : 'Подать заявку на нетворкинг'}
          </Button>
        )}
      </Div>
    );
  }

  return (
    <div className="nfo-task-modal">
      <Div style={{ padding: '8px 16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.4 }}>
          {task.description}
        </div>
        {task.isRandomDistribution && (task.partners?.length || task.partner) && (
          <NetworkingPartnersList
            partners={task.partners?.length ? task.partners : task.partner ? [task.partner] : []}
            title={isMultiNetworking(task) ? 'Участники для знакомства:' : 'Твой партнёр:'}
          />
        )}
        <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
          Твой ответ
        </div>
        <textarea
          className="nfo-input"
          rows={4}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
        {(() => {
          const photoMode = task.photoMode ?? (task.requiresPhoto ? 'required' : 'none');
          if (photoMode === 'none') return null;
          return (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
                {photoMode === 'required' ? 'Фото (обязательно)' : 'Фото (можно приложить, но не обязательно)'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="m" mode="secondary" loading={uploading} disabled={photos.length >= 3} onClick={() => onUploadPhoto()}>
                  📷 Добавить фото ({photos.length}/3)
                </Button>
                {photos.map((stored, i) => (
                  <img
                    key={`${i}-${stored.slice(0, 32)}`}
                    src={resolvePhotoUrl(stored)}
                    alt={`Фото ${i + 1}`}
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
                  />
                ))}
              </div>
              {uploadError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#e74c3c' }}>{uploadError}</div>
              )}
            </>
          );
        })()}
      </Div>
      <div className="nfo-task-modal__footer">
        <Button size="l" mode="primary" stretched loading={submitting} onClick={() => onSubmit()}>
          Отправить
        </Button>
      </div>
    </div>
  );
}

export function TaskDetailModal({
  task,
  loading,
  onClose,
  ...contentProps
}: TaskDetailModalProps) {
  const activeModal = task || loading ? 'task-detail' : null;

  return (
    <ModalRoot activeModal={activeModal} onClose={onClose}>
      <ModalPage
        id="task-detail"
        height="100%"
        onClose={onClose}
        header={
          <ModalPageHeader>
            {task?.title ?? 'Задание'}
          </ModalPageHeader>
        }
      >
        {loading && !task ? (
          <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="l" />
          </Div>
        ) : task ? (
          <TaskDetailContent task={task} {...contentProps} />
        ) : null}
      </ModalPage>
    </ModalRoot>
  );
}
