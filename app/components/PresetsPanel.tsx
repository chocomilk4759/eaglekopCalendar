'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Preset = { id:number; emoji:string|null; label:string; sort_order:number };

export default function PresetsPanel({
  canEdit,
  mode = 'inline', // 'inline' | 'section'
}:{
  canEdit: boolean;
  mode?: 'inline' | 'section';
}){
  const supabase = createClient();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [activeId,setActiveId]=useState<number|null>(null); // 삭제 버튼 노출 대상

  useEffect(()=>{
    supabase.from('presets').select('*').order('sort_order',{ascending:true})
      .then(({data,error})=>{
        if(error){ console.error(error); return; }
        setPresets((data||[]) as any);
      });
  },[]);

  async function addPresetInline(){
    // 한 줄 유지 위해 프롬프트 사용 (아이콘은 선택, 라벨은 필수)
    const emoji = window.prompt('아이콘(선택, 이모지 한 글자 또는 빈칸 가능)', '')?.trim() || '';
    const label = window.prompt('텍스트(필수)', '')?.trim() || '';
    if(!label){ alert('텍스트는 필수입니다.'); return; }
    const payload = { emoji: emoji || null, label, sort_order:(presets.at(-1)?.sort_order||0)+10 };
    const { data, error } = await supabase.from('presets').insert(payload).select().single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]);
  }

  async function deletePreset(id:number){
    const ok = window.confirm('해당 프리셋을 삭제할까요?');
    if(!ok) return;
    const { error } = await supabase.from('presets').delete().eq('id', id);
    if(error){ alert(error.message); return; }
    setPresets(p => p.filter(x => x.id !== id));
    setActiveId(null);
  }

  if (mode === 'inline'){
    // 하나의 행으로, 오른쪽 정렬 (테마 버튼 아래/요일 헤더 y-라인에 맞춤)
    return (
      <div className="presets-inline" role="toolbar" aria-label="프리셋">
        <span className="presets-label day-name">프리셋</span>
        <div className="preset-strip" title={canEdit ? '프리셋을 달력에 드래그해서 추가' : undefined}>
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
          {canEdit && (
            <button className="preset add" onClick={addPresetInline} title="프리셋 추가">＋</button>
          )}
        </div>
      </div>
    );
  }

  // (예비) 섹션 모드 — 현재는 사용하지 않지만 호환 유지
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
