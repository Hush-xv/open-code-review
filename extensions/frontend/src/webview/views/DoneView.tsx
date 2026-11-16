// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 alibaba/open-code-review Contributors

import { useState } from 'preact/hooks';
import { CliResult, CommentStatus, LogLine, ReviewSeverity } from '../../shared/types';
import { CommentCard } from '../components/CommentCard';
import { LogViewer } from '../components/LogViewer';
import { useT } from '../I18nProvider';

interface Props {
  result: CliResult;
  commentStatus: Record<number, CommentStatus>;
  commentJumpable: Record<number, boolean>;
  logs: LogLine[];
  canApply: boolean;
  onOpen: (index: number) => void;
  onAction: (index: number, action: 'apply' | 'discard' | 'falsePositive') => void;
}

type SeverityFilter = 'all' | ReviewSeverity;

export function DoneView({ result, commentStatus, commentJumpable, logs, canApply, onOpen, onAction }: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const t = useT();
  const s = result.summary;
  const comments = result.comments.map((comment, index) => ({
    comment,
    index,
    status: commentStatus[index] ?? 'pending' as CommentStatus,
  }));
  const visibleComments = comments.filter(({ comment }) =>
    severityFilter === 'all' || comment.severity === severityFilter);

  return (
    <div class="action-done" style="display:block">
      <div class="done-summary">
        <span class="ds-dot"></span>
        <span>{result.comments.length} {t('view.done.comments')} · {s?.filesReviewed ?? 0} {t('view.done.files')} · {s?.elapsed ?? ''}</span>
      </div>

      <div class="severity-filters" role="group" aria-label={t('view.done.filterSeverity')}>
        <span class="severity-filter-label">{t('view.done.filterSeverity')}</span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((value) => {
          const count = value === 'all'
            ? comments.length
            : comments.filter(({ comment }) => comment.severity === value).length;
          return (
            <button type="button" key={value}
              class={`severity-filter ${value}${severityFilter === value ? ' active' : ''}`}
              aria-pressed={severityFilter === value}
              onClick={() => {
                console.debug('[DoneView] severity filter', { severity: value, count });
                setSeverityFilter(value);
              }}>
              {value === 'all' ? t('view.done.filterAll') : t(`cmp.comment.severity.${value}`)} <span>{count}</span>
            </button>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div class="logs-disclosure">
          <button class="logs-toggle" onClick={() => setShowLogs(!showLogs)}>
            <span class={`logs-toggle-arrow${showLogs ? ' open' : ''}`}></span>
            {t('view.done.processLog')}
          </button>
          {showLogs && <LogViewer logs={logs} />}
        </div>
      )}

      {visibleComments.map(({ comment, index, status }) => (
        <CommentCard key={index} comment={comment} index={index}
          canJump={commentJumpable[index] !== false} canApply={canApply}
          status={status} onOpen={onOpen} onAction={onAction} />
      ))}
      {visibleComments.length === 0 && (
        <div class="severity-empty" role="status">{t('view.done.noSeverityIssues')}</div>
      )}
    </div>
  );
}
