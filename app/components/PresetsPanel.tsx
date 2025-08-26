'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Preset = { id:number; emoji:string; label:string; sort_order:number };

export default function PresetsPanel({ canEdit }:{ canEdit:boolean }){
  const supabase = createClient();
  const [presets,setPresets]=useState<Preset[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [emoji,setEmoji]=useState(''); const [label,setLabel]=useState('');

  useEffect(()=>{ supabase.from('presets').select('*').order('sort_order',{ascending:true}).then(({data})=> setPresets(data||[])); },[]);

  async function addPreset(){
    if(!emoji || !label){ alert('아이콘/텍스트 입력'); return; }
    const { data, error } = await supabase.from('presets').insert({ emoji, label, sort_order:(presets.at(-1)?.sort_order||0)+10 }).select().single();
    if(error){ alert(error.message); return; }
    setPresets(p=>[...p, data as any]); setEmoji(''); setLabel(''); setShowAdd(false);
  }

  return (
    <section>
      <h3 style={{margin:'8px 0'}}>프리셋</h3>
      <div className="preset-list">
        {presets.map(p=>(
          <div key={p.id}
               className="preset"
               draggable={canEdit}
               onDragStart={(e)=>{ if(!canEdit) return; e.dataTransfer.setData('application/json', JSON.stringify({ type:'preset', preset:p })); }}>
            <span aria-hidden>{p.emoji}</span><span style={{fontSize:13}}>{p.label}</span>
          </div>
        ))}
        {canEdit && (
          <button className="preset add" title="프리셋 추가" onClick={()=>setShowAdd(v=>!v)}>＋</button>
        )}
      </div>
      {canEdit && showAdd && (
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <input placeholder="아이콘(이모지)" value={emoji} onChange={e=>setEmoji(e.target.value)} style={{width:100}} />
          <input placeholder="텍스트" value={label} onChange={e=>setLabel(e.target.value)} style={{flex:'1 1 220px'}} />
          <button onClick={addPreset}>추가</button>
        </div>
      )}
    </section>
  );
}
