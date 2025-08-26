'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Preset = { id:number; emoji:string|null; label:string; sort_order:number };

export default function PresetsPanel({ canEdit }:{ canEdit:boolean }){
  const supabase = createClient();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [showAdd,setShowAdd]=useState(false);

  // 입력값: 이모지는 선택(빈 값 가능), 라벨은 필수
  const [emoji,setEmoji]=useState('');
  const [label,setLabel]=useState('');

  // 클릭한 프리셋에만 휴지통 버튼 노출
  const [activeId,setActiveId]=useState<number|null>(null);

  useEffect(()=>{
    supabase
      .from('presets')
      .select('*')
      .order('sort_order',{ascending:true})
      .then(({data,error})=>{
        if(error){ console.error(error); return; }
        setPresets((data||[]) as any);
      });
  },[]);

  async function addPreset(){
    if(!label.trim()){ alert('텍스트를 입력하세요.'); return; } // 아이콘 없어도 등록 가능
    const payload = {
      emoji: emoji.trim() || null,
      label: label.trim(),
      sort_order: (presets.at(-1)?.sort_order || 0) + 10
    };
    const { data, error } = await supabase
      .from('presets')
      .insert(payload)
      .select()
      .single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]);
    setEmoji(''); setLabel(''); setShowAdd(false);
  }

  async function deletePreset(id:number){
    const { error } = await supabase.from('presets').delete().eq('id', id);
    if(error){ alert(error.message); return; }
    setPresets(p => p.filter(x => x.id !== id));
    setActiveId(null);
  }

  return (
    <section>
      <h3 style={{margin:'8px 0'}}>프리셋</h3>

      <div className="preset-list">
        {presets.map(p=>(
          <div
            key={p.id}
            className="preset"
            draggable={canEdit}
            onDragStart={(e)=>{ 
              if(!canEdit) return;
              e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p }));
              setActiveId(null); // 드래그 시작 시 삭제버튼 닫음
            }}
            onClick={()=>{ if(!canEdit) return; setActiveId(a => a===p.id ? null : p.id); }}
            title={canEdit ? '드래그하여 달력에 추가 / 클릭하면 삭제버튼 표시' : undefined}
          >
            {/* 아이콘은 선택 사항 */}
            {p.emoji ? <span aria-hidden>{p.emoji}</span> : null}
            <span style={{fontSize:13}}>{p.label}</span>

            {canEdit && activeId===p.id && (
              <button
                className="trash"
                onClick={(e)=>{ e.stopPropagation(); deletePreset(p.id); }}
                title="프리셋 삭제"
              >🗑 삭제</button>
            )}
          </div>
        ))}

        {canEdit && (
          <button className="preset add" title="프리셋 추가" onClick={()=>{ setShowAdd(v=>!v); setActiveId(null); }}>
            ＋
          </button>
        )}
      </div>

      {canEdit && showAdd && (
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginTop:8}}>
          <input placeholder="아이콘(선택, 이모지)" value={emoji} onChange={e=>setEmoji(e.target.value)} style={{width:130}} />
          <input placeholder="텍스트(필수)" value={label} onChange={e=>setLabel(e.target.value)} style={{flex:'1 1 240px'}} />
          <button onClick={addPreset}>추가</button>
        </div>
      )}
    </section>
  );
}
