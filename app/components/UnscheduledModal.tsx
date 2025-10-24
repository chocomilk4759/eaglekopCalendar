'use client';

import { createClient } from '@/lib/supabaseClient';
import { useEffect, useRef, useState } from 'react';
import type { Item } from '@/types/note';
import ModifyChipInfoModal, { ChipPreset, ModifyChipMode } from './ModifyChipInfoModal';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

interface UndatedItems {
  id: number;
  items: Item[];
  updated_at?: string;
  updated_by?: string | null;
}

export default function UnscheduledModal({
  open,
  onClose,
  canEdit,
}: {
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const supabase = createClient();

  const [items, setItems] = useState<Item[]>([]);
  const [recordId, setRecordId] = useState<number | null>(null);

  const [chipModalOpen, setChipModalOpen] = useState(false);
  const [chipModalMode, setChipModalMode] = useState<ModifyChipMode>('add');
  const [chipModalPreset, setChipModalPreset] = useState<ChipPreset>({ emoji: '', label: '' });
  const [chipEditIndex, setChipEditIndex] = useState<number | null>(null);
  const [chipModalText, setChipModalText] = useState<string>('');
  const [chipModalStartTime, setChipModalStartTime] = useState<string>('');
  const [chipModalNextDay, setChipModalNextDay] = useState<boolean>(false);

  const [confirmChipDeleteOpen, setConfirmChipDeleteOpen] = useState(false);
  const [confirmChipDeleteAction, setConfirmChipDeleteAction] = useState<(() => Promise<void>) | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });

  // ── Drag & Drop 상태 ──────────────────────────────────────────────────
  const [draggedChipIndex, setDraggedChipIndex] = useState<number | null>(null);

  // ── 모달 이동 상태 ─────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 550, h: 400 });
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });

  const disabled = !canEdit;

  // ── 포커스 관리 ──────────────────────────────────────────────────────────
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── 데이터 로드 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('undated_items')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setRecordId(data.id);
          setItems(Array.isArray(data.items) ? data.items : []);
        } else {
          // 레코드가 없으면 생성
          if (canEdit) {
            const { data: newData, error: insertError } = await supabase
              .from('undated_items')
              .insert({ items: [] })
              .select()
              .single();

            if (insertError) throw insertError;
            setRecordId(newData.id);
            setItems([]);
          } else {
            setRecordId(null);
            setItems([]);
          }
        }
      } catch (e: any) {
        setAlertMessage({ title: '데이터 로드 실패', message: e?.message ?? '데이터 로드 중 오류가 발생했습니다.' });
        setAlertOpen(true);
      }
    }

    loadData();

    // 중앙 배치 (모바일 대응)
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    const modalWidth = isMobile ? Math.min(vw - 24, size.w) : size.w;
    const modalHeight = isMobile ? Math.min(vh - 24, size.h) : size.h;
    const x = Math.max(12, Math.floor((vw - modalWidth) / 2));
    const y = Math.max(12, Math.floor((vh - modalHeight) / 2));
    setPos({ x, y });
    setSize({ w: modalWidth, h: modalHeight });
  }, [open, canEdit, supabase]);

  // ── 포커스 관리 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 0);
    } else {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
  }, [open]);

  // Focus trap: Escape 키로 닫기
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // ── DB 저장 ──────────────────────────────────────────────────────────
  async function persist(newItems: Item[]): Promise<void> {
    if (!recordId) throw new Error('레코드 ID가 없습니다.');

    const { error } = await supabase
      .from('undated_items')
      .update({ items: newItems })
      .eq('id', recordId);

    if (error) throw new Error(error.message);
    setItems(newItems);
  }

  // ── Chip 추가/편집/삭제 ──────────────────────────────────────────────────
  function onClickAddChip() {
    if (!canEdit) return;
    setChipModalPreset({ emoji: '', label: '' });
    setChipModalMode('add');
    setChipEditIndex(null);
    setChipModalText('');
    setChipModalStartTime('');
    setChipModalNextDay(false);
    setChipModalOpen(true);
  }

  function onDoubleClickChip(idx: number) {
    if (!canEdit) return;
    const cur = items[idx];
    if (!cur) return;
    setChipModalPreset({ emoji: cur.emoji ?? '', label: cur.label });
    setChipModalMode('edit');
    setChipEditIndex(idx);
    setChipModalText(cur.text ?? '');
    setChipModalStartTime(cur.startTime ?? '');
    setChipModalNextDay(cur.nextDay ?? false);
    setChipModalOpen(true);
  }

  async function applyAddChip(text: string, startTime: string, nextDay: boolean, overridePreset?: ChipPreset) {
    if (!canEdit) return;
    const base = overridePreset ?? chipModalPreset;
    const newItem: Item = {
      emoji: base.emoji ?? null,
      label: base.label,
      text: text || undefined,
      emojiOnly: !text,
      startTime: startTime || undefined,
      nextDay: nextDay || undefined,
    };
    const newItems = [...items, newItem];
    try {
      await persist(newItems);
    } catch (e: any) {
      setAlertMessage({ title: '아이템 추가 실패', message: e?.message ?? '아이템 추가 중 오류가 발생했습니다.' });
      setAlertOpen(true);
    }
    setChipModalOpen(false);
  }

  async function applyEditChip(text: string, startTime: string, nextDay: boolean, overridePreset?: ChipPreset) {
    if (!canEdit || chipEditIndex == null) return;
    const newItems = [...items];
    const cur = newItems[chipEditIndex];
    if (!cur) return;
    newItems[chipEditIndex] = {
      ...cur,
      text: text || undefined,
      emojiOnly: !text,
      emoji: overridePreset?.emoji !== undefined ? (overridePreset?.emoji ?? null) : cur.emoji,
      startTime: startTime || undefined,
      nextDay: nextDay || undefined,
    };
    try {
      await persist(newItems);
    } catch (e: any) {
      setAlertMessage({ title: '아이템 수정 실패', message: e?.message ?? '아이템 수정 중 오류가 발생했습니다.' });
      setAlertOpen(true);
    }
    setChipModalOpen(false);
  }

  async function deleteChip() {
    if (!canEdit || chipEditIndex == null) return;

    setConfirmChipDeleteAction(() => async () => {
      const newItems = [...items];
      newItems.splice(chipEditIndex, 1);
      try {
        await persist(newItems);
        setChipModalOpen(false);
        setConfirmChipDeleteOpen(false);
      } catch (e: any) {
        setAlertMessage({ title: '아이템 삭제 실패', message: e?.message ?? '아이템 삭제 중 오류가 발생했습니다.' });
        setAlertOpen(true);
      }
    });
    setConfirmChipDeleteOpen(true);
  }

  // ── Drag & Drop 핸들러 ──────────────────────────────────────────────────
  function onDragStartChip(e: React.DragEvent<HTMLSpanElement>, idx: number) {
    if (!canEdit) return;
    setDraggedChipIndex(idx);
    const item = items[idx];
    if (item) {
      const payload = {
        type: 'chip',
        sourceType: 'unscheduled',
        chipIndex: idx,
        item,
      };
      const payloadStr = JSON.stringify(payload);
      e.dataTransfer.setData('application/json', payloadStr);
      e.dataTransfer.setData('text/plain', payloadStr);
      // 모바일 fallback용
      (window as any).__draggedUnscheduledChip = payload;
    }
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEndChip() {
    (window as any).__draggedUnscheduledChip = null;
    setDraggedChipIndex(null);
  }

  // ── Calendar에서 드롭된 chip 처리 ──────────────────────────────────────
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!canEdit) return;

    let payload: any = null;
    try {
      const json = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (json) payload = JSON.parse(json);
    } catch {}

    // Fallback: window 객체에서 가져오기
    if (!payload) {
      payload = (window as any).__draggedModalChip || (window as any).__draggedCellChip;
    }

    if (!payload || payload.type !== 'chip') return;

    // UnscheduledModal 내부 이동은 무시
    if (payload.sourceType === 'unscheduled') return;

    // Calendar 셀 또는 DateInfoModal에서 온 chip을 추가
    const newItem: Item = { ...payload.item };
    const newItems = [...items, newItem];

    try {
      await persist(newItems);
      setAlertMessage({ title: '칩 추가 완료', message: '미정 일정에 추가되었습니다.' });
      setAlertOpen(true);
    } catch (e: any) {
      setAlertMessage({ title: '칩 추가 실패', message: e?.message ?? '칩 추가 중 오류가 발생했습니다.' });
      setAlertOpen(true);
    }

    // Cleanup
    (window as any).__draggedModalChip = null;
    (window as any).__draggedCellChip = null;
  }

  // ── 드래그 이동 핸들러 ───────────────────────────────────────────────────
  function onDragDown(e: React.MouseEvent) {
    const target = sheetRef.current;
    if (!target) return;
    dragRef.current.active = true;
    dragRef.current.dx = e.clientX - pos.x;
    dragRef.current.dy = e.clientY - pos.y;
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragUp, { once: true });
  }

  function onDragMove(e: MouseEvent) {
    if (!dragRef.current.active) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(8, Math.min(e.clientX - dragRef.current.dx, vw - 40));
    const y = Math.max(8, Math.min(e.clientY - dragRef.current.dy, vh - 40));
    setPos({ x, y });
  }

  function onDragUp() {
    dragRef.current.active = false;
    window.removeEventListener('mousemove', onDragMove);
  }

  if (!open) return null;

  return (
    <div
      className="modal"
      onClick={onClose}
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        ref={(el) => {
          if (el) {
            (sheetRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        className="sheet modal-draggable"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          minWidth: 420,
          minHeight: 320,
          maxWidth: 800,
          maxHeight: 800,
          resize: 'both',
          overflow: 'auto',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단(드래그 핸들) */}
        <div
          className="date-head drag-handle"
          onMouseDown={onDragDown}
          style={{ cursor: 'move', userSelect: 'none', padding: '16px', borderBottom: '1px solid var(--border)' }}
        >
          <h3 style={{ margin: 0, textAlign: 'center' }}>미정</h3>
        </div>

        {/* + 버튼 영역 */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClickAddChip}
            disabled={disabled}
            style={{
              fontSize: '24px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="칩 추가"
          >
            +
          </button>
        </div>

        {/* Chip 목록 영역 */}
        <div
          style={{
            padding: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignContent: 'flex-start',
            overflowY: 'auto',
            flex: 1,
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {items.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
              미정 일정이 없습니다
            </div>
          ) : (
            items.map((item, idx) => {
              const displayText = item.emojiOnly
                ? item.emoji || item.label
                : `${item.emoji ?? ''} ${item.text ?? item.label}`.trim();
              const hasTime = item.startTime;
              const finalDisplay = hasTime
                ? `${displayText} ${item.startTime}${item.nextDay ? '+1' : ''}`
                : displayText;

              return (
                <span
                  key={idx}
                  className="chip"
                  draggable={canEdit}
                  onDragStart={(e) => onDragStartChip(e, idx)}
                  onDragEnd={onDragEndChip}
                  onDoubleClick={() => onDoubleClickChip(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: 'var(--chip-bg)',
                    color: 'var(--chip-text)',
                    fontSize: '14px',
                    cursor: canEdit ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    opacity: draggedChipIndex === idx ? 0.5 : 1,
                  }}
                >
                  {finalDisplay}
                </span>
              );
            })
          )}
        </div>

        {/* 닫기 버튼 */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              background: 'var(--button-bg)',
              color: 'var(--button-text)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>

      {/* ModifyChipInfoModal */}
      <ModifyChipInfoModal
        open={chipModalOpen}
        onClose={() => setChipModalOpen(false)}
        mode={chipModalMode}
        preset={chipModalPreset}
        initialText={chipModalText}
        initialStartTime={chipModalStartTime}
        initialNextDay={chipModalNextDay}
        onSave={chipModalMode === 'add' ? applyAddChip : applyEditChip}
        onDelete={deleteChip}
        canEdit={canEdit}
      />

      {/* ConfirmModal (Chip 삭제) */}
      <ConfirmModal
        open={confirmChipDeleteOpen}
        onClose={() => setConfirmChipDeleteOpen(false)}
        onConfirm={confirmChipDeleteAction ?? (() => {})}
        title="칩 삭제"
        message="이 칩을 삭제하시겠습니까?"
      />

      {/* AlertModal */}
      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertMessage.title}
        message={alertMessage.message}
      />
    </div>
  );
}
