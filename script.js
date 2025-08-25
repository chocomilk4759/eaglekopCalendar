(function(){
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));

  const monthSelect = $('#monthSelect');
  const yearInput = $('#yearInput');
  const calendarBody = $('#calendarBody');
  const todayBtn = $('#todayBtn');
  const clearBtn = $('#clearBtn');
  const exportBtn = $('#exportBtn');
  const importBtn = $('#importBtn');
  const importFile = $('#importFile');

  const dialog = $('#noteDialog');
  const noteText = $('#noteText');
  const noteDateLabel = $('#noteDateLabel');
  const deleteNoteBtn = $('#deleteNoteBtn');
  const saveBtn = $('#saveBtn');

  function pad(n){ return String(n).padStart(2,'0'); }
  function keyFor(y,m,d){ return `planner:${y}-${pad(m+1)}-${pad(d)}`; }
  function monthKey(y,m){ return `planner:month:${y}-${pad(m+1)}`; }

  function firstWeekday(y,m){
    return new Date(y,m,1).getDay();
  }
  function daysInMonth(y,m){
    return new Date(y, m+1, 0).getDate();
  }

  function render(){
    const y = Number(yearInput.value);
    const m = Number(monthSelect.value);
    const first = firstWeekday(y,m);
    const dim = daysInMonth(y,m);
    const prevDim = daysInMonth(y, (m+11)%12 === 11 ? y-1 : (m===0? y-1: y), (m+11)%12); // not used but keep
    // compute previous month days to show
    const prevMonth = (m+11) % 12;
    const prevYear = m===0 ? y-1 : y;
    const prevDays = daysInMonth(prevYear, prevMonth);

    calendarBody.innerHTML = '';
    const totalCells = 42; // 6 rows * 7
    const today = new Date();
    for(let idx=0; idx<totalCells; idx++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      const dayIndex = idx - first + 1;

      let showDay, showMonth = m, showYear = y, out=false;
      if(dayIndex < 1){
        showDay = prevDays + dayIndex;
        showMonth = prevMonth;
        showYear = prevYear;
        out = true;
      } else if(dayIndex > dim){
        const nextMonth = (m+1)%12;
        const nextYear = m===11 ? y+1 : y;
        showDay = dayIndex - dim;
        showMonth = nextMonth;
        showYear = nextYear;
        out = true;
      } else {
        showDay = dayIndex;
      }

      const header = document.createElement('div');
      header.className = 'date';
      header.textContent = showDay;

      const notes = document.createElement('div');
      notes.className = 'notes';

      const k = keyFor(showYear, showMonth, showDay);
      const saved = localStorage.getItem(k);
      if(saved){ notes.textContent = saved; }

      if(out){ cell.classList.add('out'); }
      if(showYear===today.getFullYear() && showMonth===today.getMonth() && showDay===today.getDate()){
        cell.classList.add('today');
      }

      cell.addEventListener('click', ()=> openNote(showYear, showMonth, showDay));

      cell.appendChild(header);
      cell.appendChild(notes);
      calendarBody.appendChild(cell);
    }
  }

  function openNote(y,m,d){
    dialog.dataset.y = y;
    dialog.dataset.m = m;
    dialog.dataset.d = d;
    noteDateLabel.textContent = `${y}년 ${m+1}월 ${d}일`;
    const k = keyFor(y,m,d);
    noteText.value = localStorage.getItem(k) || '';
    dialog.showModal();
    noteText.focus();
  }

  function saveNote(){
    const y = Number(dialog.dataset.y);
    const m = Number(dialog.dataset.m);
    const d = Number(dialog.dataset.d);
    const k = keyFor(y,m,d);
    const val = noteText.value.trim();
    if(val) localStorage.setItem(k, val); else localStorage.removeItem(k);
    dialog.close();
    render();
  }

  function deleteNote(){
    const y = Number(dialog.dataset.y);
    const m = Number(dialog.dataset.m);
    const d = Number(dialog.dataset.d);
    const k = keyFor(y,m,d);
    localStorage.removeItem(k);
    dialog.close();
    render();
  }

  function clearMonth(){
    const y = Number(yearInput.value);
    const m = Number(monthSelect.value);
    const prefix = `planner:${y}-${pad(m+1)}-`;
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith(prefix)) localStorage.removeItem(k);
    });
    render();
  }

  function exportData(){
    const data = {};
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith('planner:') && !k.startsWith('planner:month:')){
        data[k] = localStorage.getItem(k);
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-backup-${Date.now()}.json`; 
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file){
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const obj = JSON.parse(e.target.result);
        Object.entries(obj).forEach(([k,v])=>{
          if(typeof v === 'string' && k.startsWith('planner:')){
            localStorage.setItem(k, v);
          }
        });
        render();
        alert('복원이 완료되었습니다.');
      }catch(err){
        alert('가져오기 실패: 올바른 JSON이 아닙니다.');
      }
    };
    reader.readAsText(file);
  }

  function goToday(){
    const t = new Date();
    monthSelect.value = String(t.getMonth());
    yearInput.value = String(t.getFullYear());
    render();
  }

  // Events
  monthSelect.addEventListener('change', render);
  yearInput.addEventListener('change', render);
  todayBtn.addEventListener('click', goToday);
  clearBtn.addEventListener('click', clearMonth);
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', ()=>{
    if(importFile.files && importFile.files[0]) importData(importFile.files[0]);
  });
  saveBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    saveNote();
  });
  deleteNoteBtn.addEventListener('click', deleteNote);

  // Init
  const now = new Date();
  monthSelect.value = String(now.getMonth());
  yearInput.value = String(now.getFullYear());
  render();
})();