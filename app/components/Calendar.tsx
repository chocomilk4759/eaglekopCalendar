'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import DateInfoModal from './DateInfoModal';
import TopRibbon from './TopRibbon';

type Item = { emoji: string | null; label: string; text?: string };
type Note = {
  id?: number;
  y: number; m: number; d: number;
  content: string;
  items: Item[];
  color: 'red' | 'blue' | null;   // ✅ 플래그 컬러
};

function daysInMonth(y:number,m:number){ return new Date(y, m+1, 0).getDate(); }
function startWeekday(y:number,m:number){ return new Date(y, m, 1).getDay(); } // 0=Sun
const pad = (n:number)=> String(n).padStart(2,'0');
const fmt = (y:number,m:number,d:number)=> `${y}-${pad(m+1)}-${pad(d)}`;

export default function Calendar({ canEdit }:{ canEdit:boolean }){
  const supabase = createClient();

  const today = new Date();
  const todayLabel = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
  const [ym, setYM] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [jump, setJump] = useState<string>(() => fmt(today.getFullYear(), today.getMonth(), today.getDate()));
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [modalOpen, setModalOpen]=useState(false);
  const [modalDate, setModalDate]=useState<{y:number;m:number;d:number}|null>(null);

  // fetch month notes
  useEffect(()=>{
    supabase.from('notes')
      .select('*')
      .gte('y', ym.y).lte('y', ym.y)
      .gte('m', ym.m).lte('m', ym.m)
      .then(({data, error})=>{
        if(error){ console.error(error.message); return; }
        const map:Record<string,Note>={}
        ;(data||[]).forEach((n:any)=>{ map[`${n.y}-${n.m}-${n.d}`]={
          y:n.y, m:n.m, d:n.d,
          id:n.id, content:n.content||'',
          items:n.items||[],
          color:n.color ?? null
        }; });
        setNotes(map);
      });
  },[ym.y, ym.m]);

  function key(y:number,m:number,d:number){ return `${y}-${m}-${d}`; }
  function openInfo(y:number,m:number,d:number){
    setModalDate({y,m,d}); setModalOpen(true);
  }
  function onSaved(note:Note){
    setNotes(prev=> ({ ...prev, [key(note.y,note.m,note.d)]: note }));
  }

  async function dropPreset(y:number,m:number,d:number, dataStr:string){
    if(!canEdit) return;
    let payload:any; try{ payload = JSON.parse(dataStr); } catch{ return; }
    if(payload?.type!=='preset') return;
    const preset = payload.preset as { emoji:string|null; label:string };

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
    const cur = notes[k] || { y, m, d, content:'', items:[], color:null };
    const next:Note = { ...cur, items:[...(cur.items||[]), newItem] };

    const { data, error } = await supabase.from('notes')
      .upsert(next, { onConflict:'y,m,d' })
      .select().single();
    if(error){ alert(error.message); return; }
    onSaved(data as any);
    openInfo(y,m,d);
  }

  // month grid
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

  const ribbonButtons = [
    { id:'b1', src:'/ribbon/btn_chzzk.png', alt:'치지직', href:'https://chzzk.naver.com/eaf7b569c9992d0e57db0059eb5c0eeb' },
    { id:'b2', src:'/ribbon/btn_youtube.png', alt:'유튜브', href:'https://www.youtube.com/channel/UC-711LHT7B6Lb1Xy5m_cjPw' },
    { id:'b3', src:'/ribbon/btn_replay.png', alt:'다시보기', href:'https://www.youtube.com/@eaglekopFulltime' },
    { id:'b4', src:'/ribbon/btn_X.png', alt:'X', href:'https://x.com/eagle_kop' },
    { id:'b5', src:'/ribbon/btn_discord.png', alt:'디스코드', href:'https://discord.gg/sBSwch78bP' },
    { id:'b6', src:'/ribbon/btn_fanCafe.png', alt:'팬카페', href:'https://cafe.naver.com/eaglekoplockerroom' },
    { id:'b7', src:'/ribbon/btn_fancim.png', alt:'팬심', href:'https://fancim.me/celeb/profile.aspx?cu_id=eaglekop' },
    { id:'b8', src:'/ribbon/btn_replay.png', alt:'인스타', href:'https://www.instagram.com/eaglekop/' },
  ];

  function jumpGo(){
    const d = new Date(jump);
    if (Number.isNaN(d.getTime())) { alert('유효한 날짜를 선택하세요.'); return; }
    setYM({ y: d.getFullYear(), m: d.getMonth() });
    openInfo(d.getFullYear(), d.getMonth(), d.getDate());
  }
  
  return (
    <>
      {/* 상단 프로필 & 타이틀 */}
      <div style={{display:'flex', alignItems:'center', gap:12, margin:'8px 0 4px'}}>
        <img
          src="/images/channel-profile.png"
          alt="채널 프로필"
          width={40}
          height={40}
          style={{borderRadius:12, objectFit:'cover', border:'1px solid var(--border)'}}
        />
        <h2 style={{margin:0}}>이글콥의 스케쥴표</h2>
      </div>

      {/* 월 변경 + 날짜 점프 */}
      <div className="cal-header">
        <div style={{display:'flex', gap:10, alignItems:'center', fontSize:16}}>
          <button onClick={()=>setYM(({y,m})=> m?({y,m:m-1}):({y:y-1,m:11}))}>◀</button>
          <strong style={{fontSize:18}}>{monthLabel}</strong>
          <button onClick={()=>setYM(({y,m})=> m<11?({y,m:m+1}):({y:y+1,m:0}))}>▶</button>

          {/* 우측 버튼 오른쪽에 날짜 이동 */}
          <div className="jump">
            <input type="date" value={jump} onChange={(e)=>setJump(e.target.value)} aria-label="날짜 선택" />
            <button onClick={jumpGo}>이동</button>
          </div>
        </div>
        <div />
      </div>

      <TopRibbon
        buttons={ribbonButtons}
        extraText={<span className="ribbon-date">TODAY : {todayLabel}</span>}
      />

      <div className="grid grid-lg">
        {['일','월','화','수','목','금','토'].map((n,i)=>(
          <div key={n} className={`day-name ${i===0?'sun':''} ${i===6?'sat':''}`}>{n}</div>
        ))}
        {cells.map((c,idx)=>{
          const k = key(c.y,c.m,c.d??-1);
          const note = c.d? notes[k] : null;

          const isToday = c.d
            && c.y===today.getFullYear()
            && c.m===today.getMonth()
            && c.d===today.getDate();

          const flagClass = note?.color ? `flag-${note.color}` : '';
          const cn = `cell ${isToday?'today':''} ${c.w===0?'sun':''} ${c.w===6?'sat':''} ${flagClass}`.trim();

          return (
            <div key={idx}
                 className={cn}
                 onClick={()=> c.d && openInfo(c.y,c.m,c.d)}
                 onDragOver={(e)=>{ if(canEdit && c.d){ e.preventDefault(); }}}
                 onDrop={(e)=>{ if(canEdit && c.d){ e.preventDefault(); dropPreset(c.y,c.m,c.d, e.dataTransfer.getData('application/json')); }}}
            >
              {c.d && <div className="date date-lg">{c.d}</div>}

              {/* 메모 큰 텍스트 오버레이: 플래그 설정 + 메모 있을 때만 */}
              {note?.color && (note.content?.trim()?.length>0) && (
                <div className="flag-banner">{note.content}</div>
              )}

              {/* 일반 칩 목록 */}
              {!note?.color && note?.items?.length ? (
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
