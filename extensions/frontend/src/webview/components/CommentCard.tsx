// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 alibaba/open-code-review Contributors

import { useT } from '../I18nProvider';
import { useState } from 'preact/hooks';
import { ReviewComment, CommentStatus } from '../../shared/types';

interface Props {
  comment: ReviewComment;
  index: number;
  status: CommentStatus;
  canJump: boolean;
  canApply: boolean;
  onOpen: (index: number) => void;
  onAction: (index: number, action: 'apply' | 'discard' | 'falsePositive') => void;
}

function renderCommentContent(content: string) {
  return content.split(/(```[^\n]*\n[\s\S]*?```)/g).map((part, partIndex) => {
    const block = part.match(/^```([^\n]*)\n([\s\S]*?)```$/);
    if (block) {
      return (
        <pre class="comment-code" key={partIndex}>
          {block[1].trim() && <span class="comment-code-language">{block[1].trim()}</span>}
          <code>{block[2]}</code>
        </pre>
      );
    }

    return (
      <span key={partIndex}>
        {part.split(/(`[^`\n]+`)/g).map((text, textIndex) => {
          const inlineCode = text.match(/^`([^`]+)`$/);
          return inlineCode
            ? <code class="comment-inline-code" key={textIndex}>{inlineCode[1]}</code>
            : text;
        })}
      </span>
    );
  });
}

export function CommentCard({ comment, index, status, canJump, canApply, onOpen, onAction }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const collapsible = comment.content.length > 420 || comment.content.split('\n').length > 8;
  const open = () => onOpen(index);
  const act = (action: 'apply' | 'discard' | 'falsePositive') => {
    console.debug('[CommentCard] action', { index, action });
    onAction(index, action);
  };
  return (
    <div class={`comment-card${status !== 'pending' ? ` status-${status}` : ''}`}>
      <div
        class={`comment-header${canJump ? ' jumpable' : ''}`}
        onClick={canJump ? open : undefined}
        onKeyDown={canJump ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
        role={canJump ? 'button' : undefined}
        tabIndex={canJump ? 0 : undefined}
        title={canJump ? t('cmp.comment.view') : undefined}
      >
        {comment.severity && (
          <span class={`severity-pill ${comment.severity}`}>{t(`cmp.comment.severity.${comment.severity}`)}</span>
        )}
        <span class="comment-location">
          <span class="comment-file" title={comment.path}>{comment.path}</span>
          <span class="comment-line">L{comment.startLine}</span>
        </span>
      </div>
      <div class={`comment-body${collapsible && !expanded ? ' collapsed' : ''}`}>{renderCommentContent(comment.content)}</div>
      {collapsible && (
        <button type="button" class="comment-expand" aria-expanded={expanded} onClick={() => {
          console.debug('[CommentCard] toggle comment', { index, expanded: !expanded, path: comment.path });
          setExpanded(!expanded);
        }}>
          {t(expanded ? 'cmp.comment.collapse' : 'cmp.comment.expand')}
        </button>
      )}
      <div class="comment-footer">
        {status !== 'pending' && <span class={`comment-status ${status}`}>{t(`cmp.comment.status.${status}`)}</span>}
        <div class="comment-actions">
          {canJump && <button type="button" onClick={open}>{t('cmp.comment.view')}</button>}
          {status === 'pending' && canApply && !!comment.suggestionCode?.trim() && (
            <button type="button" class="apply" onClick={() => act('apply')}>{t('cmp.comment.apply')}</button>
          )}
          {status === 'pending' && <>
            <button type="button" onClick={() => act('falsePositive')}>{t('cmp.comment.falsePositive')}</button>
            <button type="button" onClick={() => act('discard')}>{t('cmp.comment.discard')}</button>
          </>}
        </div>
      </div>
    </div>
  );
}
