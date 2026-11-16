// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 alibaba/open-code-review Contributors

import { useEffect, useState } from 'preact/hooks';
import { useT } from '../I18nProvider';
import { LogLine } from '../../shared/types';
import { LogViewer } from '../components/LogViewer';

interface Props { logs: LogLine[]; onCancel: () => void; }

type ReviewStage = 'starting' | 'scope' | 'reviewing' | 'finalizing';

function getReviewStage(logs: LogLine[]): ReviewStage {
  let stage: ReviewStage = 'starting';
  for (const { text } of logs) {
    if (/file\(s\) changed, reviewing/i.test(text)) stage = 'scope';
    if (/Skipping plan phase|\b(file_read|code_search|file_find)\b/i.test(text) && /[▶✔]/.test(text)) {
      stage = 'reviewing';
    }
    if (/\btask_done\b|\bcode_comment\b/.test(text)) stage = 'finalizing';
  }
  return stage;
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function RunningView({ logs, onCancel }: Props) {
  const t = useT();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stage = getReviewStage(logs);

  useEffect(() => {
    const startedAt = Date.now();
    console.debug('[RunningView] progress timer started');
    const updateElapsed = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div class="action-running" style="display:block">
      <div class="review-progress" role="status" aria-live="polite">
        <div class="review-progress-stage">
          <span class="review-progress-dot"></span>
          <strong>{t(`view.running.stage.${stage}`)}</strong>
        </div>
        <span class="review-progress-elapsed">{t('view.running.elapsed')} {formatElapsed(elapsedSeconds)}</span>
      </div>
      <div class="files-label">{t('view.running.reviewLog')}</div>
      <LogViewer logs={logs} />
      <button class="cancel-pill" onClick={onCancel}>{t('view.running.cancel')}</button>
      <div style="clear:both"></div>
    </div>
  );
}
