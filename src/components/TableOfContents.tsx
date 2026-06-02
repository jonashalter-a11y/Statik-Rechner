import React from 'react';
import { Chapter } from '../types';
import { useStore } from '../store/useStore';
// Chapter imported for ChapterNode prop type

function ChapterNode({ chapter, depth = 0 }: { chapter: Chapter; depth: number }) {
  const { toggleChapter, setActiveChapter, activeChapterId, activeVerificationId, verifications, setActiveVerification } = useStore();
  const hasChildren = !!(chapter.children && chapter.children.length > 0);
  const hasVerifications = !!(chapter.verifications && chapter.verifications.length > 0);
  const expandable = hasChildren || hasVerifications;
  const isActive = activeChapterId === chapter.id;

  const chapterVerifications = hasVerifications
    ? chapter.verifications!.map(vId =>
        verifications.find(v => v.id === vId)
      ).filter(Boolean)
    : [];

  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          cursor: 'pointer',
          borderRadius: 4,
          background: isActive ? '#dbeafe' : 'transparent',
          borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
          userSelect: 'none',
        }}
        onClick={() => {
          if (expandable) toggleChapter(chapter.id);
          setActiveChapter(chapter.id);
        }}
      >
        {expandable ? (
          <span style={{ fontSize: 9, color: hasVerifications && !hasChildren ? '#2563eb' : '#6b7280', width: 10 }}>
            {chapter.expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: 10 }} />
        )}
        <span style={{
          fontSize: 12,
          color: '#374151',
          fontWeight: depth === 0 ? 600 : 400,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {chapter.number} {chapter.title}
        </span>
        {hasVerifications && (
          <span style={{
            fontSize: 9, background: '#dbeafe', color: '#1e40af',
            padding: '1px 5px', borderRadius: 8, fontWeight: 600,
          }}>{chapter.verifications!.length}</span>
        )}
      </div>

      {chapter.expanded && hasChildren && (
        <div>
          {chapter.children!.map(child => (
            <ChapterNode key={child.id} chapter={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {chapter.expanded && chapterVerifications.length > 0 && (
        <div>
          {chapterVerifications.map(v => v && (
            <div
              key={v.id}
              style={{
                marginLeft: (depth + 1) * 10 + 8,
                padding: '3px 8px',
                fontSize: 11,
                color: activeVerificationId === v.id ? '#fff' : '#1e40af',
                background: activeVerificationId === v.id ? '#2563eb' : 'transparent',
                cursor: 'pointer',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={e => { e.stopPropagation(); setActiveVerification(v.id); }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: v.passed === undefined ? '#9ca3af' : v.passed ? '#10b981' : '#ef4444',
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TableOfContents() {
  const chapters = useStore(s => s.chapters);

  return (
    <div style={{ padding: '8px 0' }}>
      {chapters.map(ch => (
        <ChapterNode key={ch.id} chapter={ch} depth={0} />
      ))}
    </div>
  );
}
