'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Note = { y:number; m:number; d:number; content:string };
type Preset = { id:number; emoji:string; label:string; sort_order:number };

const days = ['일','월','화','수','목','금','토'];

export default function Page(){
  const supabase = useMemo(()=>createClient(),[]);
  const [y, setY] = useState<number>(new Date().getFullYear());
  const [m, setM] = useState<number>(new Date().getMonth());
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isEditor, setIsEditor] = useState(false);
  const [toast, setToast] = useState<string>('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<{y:number,m:number,d:number}|null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function key(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  function firstWeekday(y:number,m:number){ return new Date(y,m,1).getDay(); }
  function dim(y:number,m:number){ return new Date(y,m+1,0).getDate(); }

  function showToast(msg:string){ setToast(msg); setTimeout(()=> setToast(''), 1500); }

  async function fetchNotes(){
    const from = { y, m };
    const to = { y: m===11? y+1 : y, m: (m+1)%12 };
    const { data, error } = await supabase
      .from('notes')
      .select('y,m,d,content')
      .gte('y', y).lte('y', y)  // narrow by year
      .gte('m', m).lte('m', m); // narrow by month
    if(!error && data){
      const map: Record<string,string> = {};
      data.forEach((n:Note)=>{ map[key(n.y,n.m,n.d)] = n.content; });
      setNotes(map);
    }
  }

  async function fetchPresets(){
    const { data } = await supabase.from('presets').select('*').order('sort_order', {ascending:true});
    if(data) setPresets(data as Preset[]);
  }

  async function fetchRole(){
    const { data: { user } } = await supabase.auth.getUser();
    if(!user){ setIsEditor(false); return; }
    const { data } = await supabase.from('user_roles').select('*').eq('role','editor').or(`user_id.eq.${user.id},email.eq.${user.email}`);
    setIsEditor(!!(data && data.length>0));
  }

  useEffect(()=>{ fetchNotes(); }, [y,m]);
  useEffect(()=>{ fetchPresets(); fetchRole(); }, []);

  function openNote(y:number,m:number,d:number){
    setDialogDate({y,m,d});
    setDialogOpen(true);
    setTimeout(()=> dialogRef.current?.showModal(), 0);
  }
  function closeNote(){ setDialogOpen(false); dialogRef.current?.close(); }

  async function saveNote(){
    if(!dialogDate) return;
    if(!isEditor){ showToast('권한 없음: 읽기 전용'); return; }
    const content = noteRef.current?.value?.trim() ?? '';
    const { error } = await supabase.from('notes').upsert({ y: dialogDate.y, m: dialogDate.m, d: dialogDate.d, content });
    if(!error){ showToast('저장됨'); closeNote(); fetchNotes(); }
    else showToast('저장 실패');
  }
  async function deleteNote(){
    if(!dialogDate) return;
    if(!isEditor){ showToast('권한 없음'); return; }
    const { error } = await supabase.from('notes').delete().eq('y', dialogDate.y).eq('m', dialogDate.m).eq('d', dialogDate.d);
    if(!error){ showToast('삭제됨'); closeNote(); fetchNotes(); }
    else showToast('삭제 실패');
  }

  // calendar render helpers
  const first = firstWeekday(y,m);
  const daysIn = dim(y,m);
  const prevMonth = (m+11)%12;
  const prevYear = m===0? y-1 : y;
  const prevDim = dim(prevYear, prevMonth);
  const cells = Array.from({length:42}).map((_,idx)=>{
    const dayIndex = idx - first + 1;
    let showDay:number, showMonth=m, showYear=y, out=false;
    if(dayIndex < 1){ showDay = prevDim + dayIndex; showMonth = prevMonth; showYear = prevYear; out=true; }
    else if(dayIndex > daysIn){ const nextMonth = (m+1)%12; const nextYear = m===11? y+1 : y; showDay = dayIndex - daysIn; showMonth = nextMonth; showYear = nextYear; out=true; }
    else { showDay = dayIndex; }
    const k = key(showYear, showMonth, showDay);
    const content = notes[k];
    const isToday = (()=>{
      const t = new Date();
      return t.getFullYear()===showYear && t.getMonth()===showMonth && t.getDate()===showDay;
    })();
    return { showDay, showMonth, showYear, out, content, isToday };
  });

  return (
    <main className="container">
      <div className="controls">
        <label>월
          <select value={m} onChange={e=> setM(Number(e.target.value))}>
            {Array.from({length:12}).map((_,i)=> <option value={i} key={i}>{i+1}월</option>)}
          </select>
        </label>
        <label>년도
          <input type="number" value={y} min={1900} max={2100} step={1} onChange={e=> setY(Number(e.target.value))}/>
        </label>
        <button onClick={()=>{ const t=new Date(); setM(t.getMonth()); setY(t.getFullYear()); }}>오늘로 이동</button>
        {!isEditor && <small style={{opacity:.7}}>현재 상태: 읽기 전용</small>}
        {isEditor && <small style={{opacity:.7}}>편집 권한 보유</small>}
      </div>

      <section className="layout">
        <section className="calendar" role="grid" aria-label="달력">
          <div className="grid header" role="row">
            {days.map(d=> <div className="cell head" role="columnheader" key={d}>{d}</div>)}
          </div>
          <div className="grid body" role="rowgroup">
            {cells.map((c,idx)=>(
              <div key={idx} className={'cell'+(c.out?' out':'')+(c.isToday?' today':'')} onClick={()=> openNote(c.showYear,c.showMonth,c.showDay)}>
                <div className="date">{c.showDay}</div>
                <div className="notes">{c.content}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidebar" aria-label="프리셋 아이콘">
          <div className="sidebar-inner">
            <h2>프리셋 아이콘</h2>
            <ul className="preset-list">
              {presets.map(p=> (
                <li key={p.id} className="preset-item">
                  <button onClick={async ()=>{
                    if(dialogRef.current?.open && noteRef.current){
                      const cur = noteRef.current.value;
                      noteRef.current.value = (cur? cur + '\n' : '') + `${p.emoji} `;
                      showToast('메모에 삽입되었습니다.');
                    } else {
                      await navigator.clipboard.writeText(p.emoji);
                      showToast('클립보드에 복사됨');
                    }
                  }}><span>{p.emoji}</span> <span>{p.label}</span></button>
                  {isEditor && (
                    <span className="preset-actions">
                      <button onClick={async ()=>{
                        const emoji = prompt('이모지 수정', p.emoji) ?? p.emoji;
                        const label = prompt('라벨 수정', p.label) ?? p.label;
                        const sort = Number(prompt('정렬(숫자, 오름차순)', String(p.sort_order)) ?? p.sort_order);
                        const { error } = await supabase.from('presets').update({ emoji, label, sort_order: sort }).eq('id', p.id);
                        if(!error){ showToast('수정됨'); fetchPresets(); }
                      }}>수정</button>
                      <button onClick={async ()=>{
                        if(!confirm('삭제하시겠습니까?')) return;
                        const { error } = await supabase.from('presets').delete().eq('id', p.id);
                        if(!error){ showToast('삭제됨'); fetchPresets(); }
                      }}>삭제</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {isEditor && (
              <div className="preset-form">
                <div className="row">
                  <input id="newEmoji" placeholder="이모지 (예: 📢)" />
                  <input id="newLabel" placeholder="라벨 (예: 공지사항)" />
                  <input id="newSort" type="number" placeholder="정렬(숫자)" />
                </div>
                <button onClick={async ()=>{
                  // @ts-ignore
                  const emoji = (document.getElementById('newEmoji') as HTMLInputElement).value.trim();
                  // @ts-ignore
                  const label = (document.getElementById('newLabel') as HTMLInputElement).value.trim();
                  // @ts-ignore
                  const sort = Number((document.getElementById('newSort') as HTMLInputElement).value || 0);
                  if(!emoji || !label){ showToast('이모지와 라벨을 입력하세요'); return; }
                  const { error } = await supabase.from('presets').insert({ emoji, label, sort_order: sort });
                  if(!error){ showToast('추가됨'); fetchPresets(); }
                }}>프리셋 추가</button>
              </div>
            )}
          </div>
        </aside>
      </section>

      <dialog id="noteDialog" ref={dialogRef}>
        <form method="dialog" className="note-form" onSubmit={(e)=>{e.preventDefault();saveNote();}}>
          <header className="note-header">
            <div id="noteDateLabel">
              {dialogDate ? `${dialogDate.y}년 ${dialogDate.m+1}월 ${dialogDate.d}일` : ''}
            </div>
            <menu style={{display:'flex', gap:8}}>
              <button value="cancel" onClick={closeNote}>닫기</button>
              {isEditor && <button type="button" onClick={deleteNote}>삭제</button>}
              {isEditor && <button type="submit">저장</button>}
            </menu>
          </header>
          <textarea id="noteText" ref={noteRef} placeholder="메모를 입력하세요" rows={10}
            defaultValue={dialogDate? notes[key(dialogDate.y,dialogDate.m,dialogDate.d)] : ''}
          />
        </form>
      </dialog>

      {toast && <div className="toast show">{toast}</div>}
    </main>
  );
}