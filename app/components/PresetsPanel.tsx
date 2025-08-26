'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Preset = { id:number; emoji:string|null; label:string; sort_order:number };

export default function PresetsPanel({
  canEdit,
  mode = 'inline', // 'inline' | 'section' | 'vertical'
}:{
  canEdit: boolean;
  mode?: 'inline' | 'section' | 'vertical';
}){
  const supabase = createClient();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [activeId,setActiveId]=useState<number|null>(null); // 삭제 버튼 노출 대상
  const [showAdd,setShowAdd]=useState(false);
  const [emoji,setEmoji]=useState('');  // vertical 모드 입력
  const [label,setLabel]=useState('');

  useEffect(()=>{
    supabase.from('presets').select('*').order('sort_order',{ascending:true})
      .then(({data,error})=>{
        if(error){ console.error(error); return; }
        setPresets((data||[]) as any);
      });
  },[]);

  async function addPresetInline(){
    const e = window.prompt('아이콘(선택, 이모지 한 글자 또는 빈칸 가능)', '')?.trim() || '';
    const l = window.prompt('텍스트(필수)', '')?.trim() || '';
    if(!l){ alert('텍스트는 필수입니다.'); return; }
    const payload = { emoji: e || null, label: l, sort_order:(presets.at(-1)?.sort_order||0)+10 };
    const { data, error } = await supabase.from('presets').insert(payload).select().single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]);
  }

  async function addPresetVertical(){
    if(!label.trim()){ alert('텍스트는 필수입니다.'); return; }
    const payload = { emoji: (emoji.trim()||null), label: label.trim(), sort_order:(presets.at(-1)?.sort_order||0)+10 };
    const { data, error } = await supabase.from('presets').insert(payload).select().single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]);
    setEmoji(''); setLabel(''); setShowAdd(false);
  }

  async function deletePreset(id:number){
    const ok = window.confirm('해당 프리셋을 삭제할까요?');
    if(!ok) return;
    const { error } = await supabase.from('presets').delete().eq('id', id);
    if(error){ alert(error.message); return; }
    setPresets(p => p.filter(x => x.id !== id));
    setActiveId(null);
  }

  /* ---------- INLINE (가로 한 줄) ---------- */
  if (mode === 'inline'){
    return (
      <div className="presets-inline" role="toolbar" aria-label="프리셋">
        <span className="presets-label day-name">프리셋</span>
        <div className="preset-strip">
          {presets.map(p=>(
            <div
              key={p.id}
              className="preset"
              draggable={canEdit}
              onDragStart={(e)=>{ if(!canEdit) return; e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p })); setActiveId(null); }}
              onClick={()=>{ if(!canEdit) return; setActiveId(a => a===p.id ? null : p.id); }}
            >
              {p.emoji ? <span aria-hidden>{p.emoji}</span> : null}
              <span style={{fontSize:13}}>{p.label}</span>
              {canEdit && activeId===p.id && (
                <button className="trash" onClick={(e)=>{ e.stopPropagation(); deletePreset(p.id); }}>🗑</button>
              )}
            </div>
          ))}
          {canEdit && <button className="preset add" onClick={addPresetInline} title="프리셋 추가">＋</button>}
        </div>
      </div>
    );
  }

  /* ---------- VERTICAL (세로 리스트) ---------- */
  if (mode === 'vertical'){
    return (
      <div className="preset-vertical-list">
        {presets.map(p=>(
          <div
            key={p.id}
            className="preset-v"
            draggable={canEdit}
            onDragStart={(e)=>{ if(!canEdit) return; e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p })); setActiveId(null); }}
            onClick={()=>{ if(!canEdit) return; setActiveId(a => a===p.id ? null : p.id); }}
            title={canEdit ? '달력으로 드래그하여 배치 / 클릭하면 삭제 버튼 표시' : undefined}
          >
            <div className="pv-left">
              {p.emoji ? <span aria-hidden>{p.emoji}</span> : <span style={{opacity:.35}}>□</span>}
              <span className="pv-label">{p.label}</span>
            </div>
            {canEdit && activeId===p.id && (
              <button className="trash" onClick={(e)=>{ e.stopPropagation(); deletePreset(p.id); }}>🗑</button>
            )}
          </div>
        ))}

        {canEdit && (
          <div className="preset-v add-block">
            <div className="pv-left" style={{gap:6}}>
              <input placeholder="아이콘(선택)" value={emoji} onChange={e=>setEmoji(e.target.value)} style={{width:90}} />
              <input placeholder="텍스트(필수)" value={label} onChange={e=>setLabel(e.target.value)} style={{flex:'1 1 auto'}} />
            </div>
            <button onClick={addPresetVertical} className="add-btn">추가</button>
          </div>
        )}
      </div>
    );
  }

  /* ---------- SECTION (예비) ---------- */
  return (
    <section>
      <h3 style={{margin:'8px 0'}}>프리셋</h3>
      <div className="preset-list">
        {presets.map(p=>(
          <div key={p.id} className="preset"
               draggable={canEdit}
               onDragStart={(e)=>{ if(!canEdit) return; e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p })); setActiveId(null); }}
               onClick={()=>{ if(!canEdit) return; setActiveId(a => a===p.id ? null : p.id); }}>
            {p.emoji ? <span aria-hidden>{p.emoji}</span> : null}
            <span style={{fontSize:13}}>{p.label}</span>
            {canEdit && activeId===p.id && (
              <button className="trash" onClick={(e)=>{ e.stopPropagation(); deletePreset(p.id); }}>🗑</button>
            )}
          </div>
        ))}
        {canEdit && <button className="preset add" onClick={addPresetInline}>＋</button>}
      </div>
    </section>
  );
}
