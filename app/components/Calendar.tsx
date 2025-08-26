'use client';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import DateInfoModal from './DateInfoModal';

type Item = { emoji: string | null; label: string; text?: string };
type Note = { id?: number; y: number; m: number; d: number; content: string; items: Item[]; is_rest: boolean };

function daysInMonth(y:number,m:number){ return new Date(y, m+1, 0).getDate(); }
function startWeekday(y:number,m:number){ return new Date(y, m, 1).getDay(); } // 0=Sun

export default function Calendar({ canEdit }:{ canEdit:boolean }){
  const supabase = createClient();

  const today = new Date();
  const [ym, setYM] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [modalOpen, setModalOpen]=useState(false);
  const [modalDate, setModalDate]=useState<{y:number;m:number;d:number}|null>(null);

  // fetch month notes
  useEffect(()=>{
    supabase.from('notes')
      .select('*')
      .gte('y', ym.y).lte('y', ym.y)
      .gte('m', ym.m).lte('m', ym.m)
      .then(({data})=>{
        const map:Record<string,Note>={}
        ;(data||[]).forEach((n:any)=>{ map[`${n.y}-${n.m}-${n.d}`]=n; });
        setNotes(map);
      });
  },[ym.y, ym.m]);

  function key(y:number,m:number,d:number){ return `${y}-${m}-${d}`; }
  function openInfo(y:number,m:number,d:number){
    setModalDate({y,m,d});
    setModalOpen(true);
  }
  function onSaved(note:Note){
    setNotes(prev=> ({ ...prev, [key(note.y,note.m,note.d)]: note }));
  }

  async function dropPreset(y:number,m:number,d:number, dataStr:string){
    if(!canEdit) return;
    let payload:any; try{ payload = JSON.parse(dataStr); } catch{ return; }
    if(payload?.type!=='preset') return;
    const preset = payload.preset as { emoji:string|null; label:string };

    // ▼ 드롭 시 상세 내용 입력
    const detail = window.prompt(
      `세부 내용을 입력하세요 (예: "${preset.emoji ?? ''} 맨시티 vs 리버풀 09:00")`,
      preset.emoji ? `${preset.emoji} ` : ''
    );

    const newItem: Item = {
      emoji: preset.emoji ?? null,
      label: preset.label,
      text: (detail ?? '').trim() || undefined,
    };

    const k = key(y,m,d);
    const cur = notes[k] || { y, m, d, content:'', items:[], is_rest:false };
    const next:Note = { ...cur, items:[...(cur.items||[]), newItem] };

    const { data, error } = await supabase.from('notes').upsert(next, { onConflict:'y,m,d' }).select().single();
    if(error){ alert(error.message); return; }
    onSaved(data as any);

    // 드롭 후 해당 날짜 정보창 열기
    openInfo(y,m,d);
  }

  const dim = daysInMonth(ym.y, ym.m);
  const start = startWeekday(ym.y, ym.m);
  const cells = useMemo(()=>{
    const list: {y:number;m:number;d:number|null; w:number}[] = [];
    const total = Math.ceil((start + dim)/7)*7;
    for(let i=0;i<total;i++){
      const d = i - start + 1;
      list.push({ y:ym.y, m:ym.m, d: (d>=1 && d<=dim) ? d : null, w: i%7 });
    }
    return list;
  }, [ym, dim, start]);

  const monthLabel = `${ym.y}.${(ym.m+1).toString().padStart(2,'0')}`;

  return (
    <>
      {/* 상단 프로필 & 타이틀 */}
      <div style={{display:'flex', alignItems:'center', gap:12, margin:'8px 0 4px'}}>
        <Image
        src="/images/channel-profile.png"
        alt="채널 프로필"
        width={36}
        height={36}
        priority
        style={{borderRadius:12, objectFit:'cover', border:'1px solid var(--border)'}}
        />
        <h2 style={{margin:0}}>이글콥의 스케쥴표</h2>
      </div>

      {/* 월 변경 헤더 (읽기/편집 표시 제거) */}
      <div className="cal-header">
        <div style={{display:'flex', gap:10, alignItems:'center', fontSize:16}}>
          <button onClick={()=>setYM(({y,m})=> m?({y,m:m-1}):({y:y-1,m:11}))}>◀</button>
          <strong style={{fontSize:18}}>{monthLabel}</strong>
          <button onClick={()=>setYM(({y,m})=> m<11?({y,m:m+1}):({y:y+1,m:0}))}>▶</button>
        </div>
        {/* 오른쪽엔 아무것도 노출 안 함 */}
        <div />
      </div>

      <div className="grid grid-lg">
        {['일','월','화','수','목','금','토'].map((n,i)=>(
          <div key={n} className={`day-name ${i===0?'sun':''} ${i===6?'sat':''}`}>{n}</div>
        ))}
        {cells.map((c,idx)=>{
          const k = key(c.y,c.m,c.d??-1);
          const note = c.d? notes[k] : null;
          const cn = `cell cell-lg ${c.w===0?'sun':''} ${c.w===6?'sat':''} ${note?.is_rest?'rest':''}`;
          return (
            <div key={idx}
                 className={cn}
                 onClick={()=> c.d && openInfo(c.y,c.m,c.d)}
                 onDragOver={(e)=>{ if(canEdit && c.d){ e.preventDefault(); }}}
                 onDrop={(e)=>{ if(canEdit && c.d){ e.preventDefault(); dropPreset(c.y,c.m,c.d, e.dataTransfer.getData('application/json')); }}}
            >
              {c.d && <div className="date date-lg">{c.d}</div>}
              {note?.is_rest && <div className="rest-banner">휴방</div>}

              {note?.items?.length ? (
                <div className="chips">
                  {note.items.map((it:Item,i:number)=>(
                    <span key={i} className="chip">
                      {it.text?.length ? it.text : `${it.emoji ? it.emoji+' ' : ''}${it.label}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {modalDate && (
        <DateInfoModal
          open={modalOpen}
          onClose={()=>setModalOpen(false)}
          date={modalDate}
          note={notes[key(modalDate.y,modalDate.m,modalDate.d)] || null}
          canEdit={canEdit}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
