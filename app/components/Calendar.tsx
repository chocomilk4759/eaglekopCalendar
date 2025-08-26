'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import DateInfoModal from './DateInfoModal';

type Note = { id?:number; y:number; m:number; d:number; content:string; items:any[]; is_rest:boolean };

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
    let payload:any; try{ payload = JSON.parse(dataStr); } catch{ return; }
    if(payload?.type!=='preset') return;
    const preset = payload.preset;
    const k = key(y,m,d);
    const cur = notes[k] || { y, m, d, content:'', items:[], is_rest:false };
    const next:Note = { ...cur, items:[...(cur.items||[]), {emoji:preset.emoji, label:preset.label}] };
    // upsert
    const { data, error } = await supabase.from('notes').upsert(next, { onConflict:'y,m,d' }).select().single();
    if(error){ alert(error.message); return; }
    onSaved(data as any);
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
      <div className="cal-header">
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={()=>setYM(({y,m})=> m?({y,m:m-1}):({y:y-1,m:11}))}>◀</button>
          <strong>{monthLabel}</strong>
          <button onClick={()=>setYM(({y,m})=> m<11?({y,m:m+1}):({y:y+1,m:0}))}>▶</button>
        </div>
        <div style={{fontSize:12, color:'var(--muted)'}}>
          {canEdit ? '편집 모드' : '읽기 모드'}
        </div>
      </div>

      <div className="grid">
        {['일','월','화','수','목','금','토'].map((n,i)=>(
          <div key={n} className={`day-name ${i===0?'sun':''} ${i===6?'sat':''}`}>{n}</div>
        ))}
        {cells.map((c,idx)=>{
          const k = key(c.y,c.m,c.d??-1);
          const note = c.d? notes[k] : null;
          const cn = `cell ${c.w===0?'sun':''} ${c.w===6?'sat':''} ${note?.is_rest?'rest':''}`;
          return (
            <div key={idx}
                 className={cn}
                 onClick={()=> c.d && openInfo(c.y,c.m,c.d)}
                 onDragOver={(e)=>{ if(canEdit && c.d){ e.preventDefault(); }}}
                 onDrop={(e)=>{ if(canEdit && c.d){ e.preventDefault(); dropPreset(c.y,c.m,c.d, e.dataTransfer.getData('application/json')); }}}
            >
              {c.d && <div className="date">{c.d}</div>}
              {note?.is_rest && <div className="rest-banner">휴방</div>}

              {note?.items?.length ? (
                <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
                  {note.items.map((it:any,i:number)=>(
                    <span key={i} style={{fontSize:13}}>{it.emoji} {it.label}</span>
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
