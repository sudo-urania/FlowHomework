/* Calendar editing: recurring commitments, imported events, and task deadlines. */
(function () {
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const $ = s => document.querySelector(s);
  function init({getTerm, save, refresh, notify, getDefaultDate}) {
    const dialog = document.createElement('dialog');
    dialog.id = 'calendar-editor';
    dialog.setAttribute('aria-labelledby', 'ce-heading');
    dialog.innerHTML = `<form id="ce-form">
      <span class="availability-eyebrow">MAKE YOUR WEEK WORK</span>
      <h2 id="ce-heading">Edit calendar event</h2>
      <p id="ce-context" class="ce-context"></p>
      <label>Title<input id="ce-title" required maxlength="120"></label>
      <label id="ce-scope-field">Apply changes to<select id="ce-scope"><option value="one">Only this occurrence</option><option value="all">Entire weekly commitment</option></select></label>
      <div id="ce-repeat" hidden><fieldset><legend>Repeat on</legend><div class="ce-weekdays">${DAYS.map(d=>`<label><input type="checkbox" value="${d}">${d}</label>`).join('')}</div></fieldset></div>
      <label id="ce-date-field">Date<input id="ce-date" type="date" required></label>
      <label id="ce-event-type-field">Category<select id="ce-event-type"><option value="personal">Personal time</option><option value="work">Work</option><option value="school">Class</option></select></label>
      <label id="ce-all-day-field" class="ce-all-day"><input type="checkbox" id="ce-all-day" checked> All-day event</label>
      <div id="ce-time-fields" class="two"><label>Start time<input id="ce-start" type="time" required></label><label>End time<input id="ce-end" type="time" required></label></div>
      <p id="ce-error" class="err" role="alert"></p>
      <p id="ce-removal-note" class="ce-context"></p>
      <div class="ce-actions"><button type="button" id="ce-remove" class="btn ce-danger">Remove</button><button type="button" id="ce-cancel" class="btn">Cancel</button><button class="btn pri" type="submit">Save changes</button></div>
    </form>`;
    document.body.append(dialog);
    TimeControls.attach(dialog);
    let current = null;
    const form = $('#ce-form');
    function scope() {
      const recurring = current.kind === 'block';
      const event = current.kind === 'event';
      const timed = recurring || (event && !$('#ce-all-day').checked);
      $('#ce-event-type-field').hidden = !event;
      $('#ce-all-day-field').hidden = !event;
      $('#ce-time-fields').hidden = !timed;
      $('#ce-start').disabled = $('#ce-end').disabled = !timed;
      const all = recurring && $('#ce-scope').value === 'all';
      $('#ce-repeat').hidden = !all;
      $('#ce-date-field').hidden = all;
      $('#ce-date').disabled = all;
      $('#ce-title').disabled = recurring && !all;
      $('#ce-removal-note').textContent = current.kind === 'task'
        ? 'Mark complete to check off this assignment in Calendar and Tasks. You can mark it incomplete later.'
        : all ? 'Changes or removal apply to the whole recurring commitment.'
        : recurring ? 'Changes or removal affect only this occurrence. Other weeks stay the same.' : '';
    }
    $('#ce-scope').onchange = scope;
    $('#ce-all-day').onchange = scope;
    $('#btn-event').onclick = () => {
      form.reset();
      current={kind:'event',id:null,isNew:true};
      $('#ce-heading').textContent='Add event';
      $('#ce-context').textContent='Add a one-time event to your calendar.';
      $('#ce-title').value='';
      $('#ce-date').value=getDefaultDate();
      $('#ce-start').value='09:00';$('#ce-end').value='10:00';
      $('#ce-scope-field').hidden=true;
      $('#ce-remove').hidden=true;
      form.querySelector('[type=submit]').textContent='Add event';
      $('#ce-error').textContent='';
      TimeControls.format(form);scope();dialog.showModal();
    };
    $('#ce-cancel').onclick = () => dialog.close();
    $('#grid').addEventListener('click', event => {
      const button = event.target.closest('[data-cal-kind]');
      if (!button) return;
      const {calKind:kind, calId:id, calDate:date} = button.dataset;
      const data = getTerm();
      const item = (kind === 'block' ? Availability.getBlocks() : kind === 'task' ? data.tasks : data.events).find(x=>x.id===id);
      if (!item) return;
      current = {kind, id, date, item};
      $('#ce-remove').hidden=false;
      form.querySelector('[type=submit]').textContent='Save changes';
      form.reset();
      $('#ce-error').textContent = '';
      $('#ce-heading').textContent = kind === 'task' ? 'Edit assignment deadline' : 'Edit calendar event';
      $('#ce-context').textContent = kind === 'block' ? 'A recurring weekly commitment' : kind === 'task' ? 'Keep your assignment and calendar in sync.' : (item.sourceId ? 'An event from your syllabus' : 'A one-time calendar event');
      $('#ce-title').value = item.name || item.title;
      $('#ce-remove').textContent = kind === 'task' ? (item.done ? 'Mark incomplete' : '✓ Mark complete') : 'Remove';
      $('#ce-remove').classList.toggle('ce-danger', kind !== 'task');
      $('#ce-scope-field').hidden = kind !== 'block';

      const exception = (item.exceptions || []).find(x=>x.originalDate===date);
      $('#ce-date').value = exception?.date || date;
      $('#ce-event-type').value=item.type || 'personal';
      $('#ce-all-day').checked=!item.start;
      $('#ce-start').value = exception?.start || item.start || '09:00';
      $('#ce-end').value = exception?.end || item.end || '10:00';
      document.querySelectorAll('.ce-weekdays input').forEach(input=>input.checked=(item.days||[]).includes(input.value));
      TimeControls.format(form);
      scope();
      dialog.showModal();
    });
    function commit(remove) {
      const {kind,id,date} = current;
      const data = getTerm();
      const all = kind === 'block' && $('#ce-scope').value === 'all';
      if (!remove && !TimeControls.normalize(form)) return;
      if (!remove && !form.reportValidity()) return;
      const title = $('#ce-title').value.trim();
      const selected = [...document.querySelectorAll('.ce-weekdays input:checked')].map(x=>x.value);
      if (!remove && (!title || (all && !selected.length))) {
        $('#ce-error').textContent = !title ? 'Please enter a title.' : 'Choose at least one weekday.'; return;
      }
      if (!remove && !$('#ce-start').disabled && $('#ce-start').value >= $('#ce-end').value) {
        $('#ce-error').textContent = 'End time must be later than start time.'; return;
      }
      try {
        if (kind === 'block') {
          if (all && remove) Availability.deleteBlock(id);
          else if (all) Availability.updateBlock(id,{name:title,days:selected,start:$('#ce-start').value,end:$('#ce-end').value});
          else {
            const block = Availability.getBlocks().find(x=>x.id===id);
            const exceptions = (block.exceptions||[]).filter(x=>x.originalDate!==date);
            exceptions.push({originalDate:date,date:remove?null:$('#ce-date').value,start:$('#ce-start').value,end:$('#ce-end').value});
            Availability.updateBlock(id,{exceptions});
          }
          data.availabilityBlocks = Availability.getBlocks();
          AvailabilityUI.render();
        } else if (kind === 'task') {
          const task = data.tasks.find(x=>x.id===id);
          if (remove) {
            if (!task.done) task.previousProgress = task.progress || 0;
            task.done = !task.done;
            task.completedAt = task.done ? Date.now() : null;
            task.progress = task.done ? 100 : Math.min(99, task.previousProgress || 0);
          }
          else { task.title=title; task.due=$('#ce-date').value; }
        } else if (current.isNew) {
          data.events.push({id:crypto.randomUUID(),title,date:$('#ce-date').value,type:$('#ce-event-type').value,start:$('#ce-all-day').checked?'':$('#ce-start').value,end:$('#ce-all-day').checked?'':$('#ce-end').value});
        } else if (remove) data.events = data.events.filter(x=>x.id!==id);
        else {
          const item=data.events.find(x=>x.id===id);
          item.title=title; item.date=$('#ce-date').value;item.type=$('#ce-event-type').value;
          item.start=$('#ce-all-day').checked?'':$('#ce-start').value;item.end=$('#ce-all-day').checked?'':$('#ce-end').value;
        }
        save(); dialog.close(); refresh(!remove && !$('#ce-date').disabled ? $('#ce-date').value : null); notify(current.isNew ? 'Event added' : remove ? (kind === 'task' ? 'Assignment status updated' : 'Removed from calendar') : 'Calendar updated');
      } catch(error) { $('#ce-error').textContent = error.message; }
    }
    form.onsubmit = event => {event.preventDefault();commit(false);};
    $('#ce-remove').onclick = () => commit(true);
  }
  window.CalendarEditor = {init};
})();


/* StudyFlow — Main Application */

(() => {
  const $ = s => document.querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = s => String(s).replace(/[&<>"]/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const iso = d => d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
  const nice = s => new Date(s+'T00:00').toLocaleDateString(
    [], {weekday:'short',month:'short',day:'numeric'});

  const store = (k,v) => v === undefined
    ? JSON.parse(localStorage.getItem(k) || 'null')
    : localStorage.setItem(k,JSON.stringify(v));

  let toastTimer;
  const toast = m => {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'),3500);
  };

  let mode = 'in', me = null, D = null;
  let view = 'home', cur = new Date();
  cur.setDate(1);

  /* ---------- Authentication ---------- */
  // Local prototype only — not production authentication.

  const sha = async s => crypto.subtle
    ? [...new Uint8Array(await crypto.subtle.digest(
        'SHA-256',new TextEncoder().encode(s)
      ))].map(b=>b.toString(16).padStart(2,'0')).join('')
    : btoa(s);

  function setMode(m) {
    mode = m;
    $('#name-row').hidden = m === 'in';
    $('#auth-err').textContent = '';
    $('#auth-sub').textContent = m === 'in'
      ? 'Welcome back. Sign in to continue.'
      : 'Create your account to get started.';
    $('#auth-go').textContent = m === 'in'
      ? 'Sign in' : 'Create account';
    $('#auth-switch').textContent = m === 'in'
      ? 'New here? Create an account'
      : 'Already have an account? Sign in';
  }

  $('#auth-switch').onclick =
    () => setMode(mode === 'in' ? 'up' : 'in');

  $('#auth-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target.elements;
    const email = f.email.value.trim().toLowerCase();
    const h = await sha(f.pw.value);
    const U = store('sf-users') || {};

    if (mode === 'up') {
      if (U[email]) {
        $('#auth-err').textContent = 'Account already exists.';
        return;
      }
      U[email] = {
        name:f.name.value.trim() || email.split('@')[0],h
      };
      store('sf-users',U);
    } else if (!U[email] || U[email].h !== h) {
      $('#auth-err').textContent = 'Incorrect email or password.';
      return;
    }

    store('sf-session',email);
    e.target.reset();
    boot();
  };

  $('#out').onclick = () => {
    localStorage.removeItem('sf-session');
    boot();
  };

  /* ---------- Data ---------- */

  const save = () => store('sf-data-' + me,D);
  const T = () => D.by[D.term];

  const blank = () => ({
    courses:[],
    tasks:[],
    events:[],
    syllabi:[],
    availabilityBlocks:[],
    studySessions:[]
  });

  function load() {
    D = store('sf-data-' + me);

    if (!D) {
      const id = uid();
      D = {
        terms:[{id,name:'Term 1 · '+new Date().getFullYear()}],
        term:id,
        by:{[id]:blank()}
      };
    }

    Object.values(D.by).forEach(t => {
      t.availabilityBlocks ??= [];
      t.studySessions ??= [];
      t.syllabi.forEach((source,index)=>{source.id ??= uid(); source.colorIndex ??= index;});
      [...t.tasks,...t.events].forEach(item=>{
        if(item.sourceId) return;
        const candidates=t.syllabi.filter(source=>source.course===item.course);
        if(candidates.length===1) item.sourceId=candidates[0].id;
      });
    });

    save();
  }

  const cIdx = id =>
    Math.max(0,T().courses.findIndex(c=>c.id===id))%6+1;

  const cName = id =>
    T().courses.find(c=>c.id===id)?.name || 'General';

  function course(name) {
    name = (name||'').trim() || 'General';
    let c = T().courses.find(
      x=>x.name.toLowerCase()===name.toLowerCase()
    );
    if (!c) {
      c = {id:uid(),name};
      T().courses.push(c);
    }
    return c;
  }

  const sourceFor = item => T().syllabi.find(source=>source.id===item.sourceId);
  const courseLabel = item => {
    const fullName=cName(item.course);
    const source=sourceFor(item);
    const code=(source?.name || '').match(/\b([A-Z]{2,})[_\s-]*(\d{3,})(?!\d)/) || fullName.match(/\b([A-Z]{2,})[_\s-]*(\d{3,})(?!\d)/);
    if(code && !/^(FALL|SPRING|SUMMER|WINTER|YEAR|TERM)$/.test(code[1])) return code[1]+' '+code[2];
    const seen=new Set();
    const parts=fullName.split(/\s*\|\s*/).map(part=>part.trim()).filter(part=>{const key=part.toLowerCase();if(!key || seen.has(key)) return false;seen.add(key);return true;});
    return (parts.join(' · ') || 'General').slice(0,65);
  };
  const sourceColor = source => 'hsl(' + Math.round((source.colorIndex * 137.508 + 210) % 360) + ' 65% var(--source-lightness,42%))';
  const itemColor = item => sourceFor(item) ? sourceColor(sourceFor(item)) : 'var(--c1)';
  function renderSourceKey() {
    const key = $('#calendar-key');
    key.replaceChildren();
    const heading=document.createElement('strong');heading.textContent='Calendar key';key.append(heading);
    const makeSection = label => {
      const section=document.createElement('div');section.className='calendar-key-section';
      const title=document.createElement('span');title.className='calendar-key-label';title.textContent=label;
      const entries=document.createElement('div');entries.className='calendar-key-entries';section.append(title,entries);key.append(section);return entries;
    };
    if(T().syllabi.length){
      const documents=makeSection('Uploaded documents');
      T().syllabi.forEach((source,index)=>{
        const entry=document.createElement('span');entry.className='calendar-key-entry document-key';entry.title=source.name;
        const dot=document.createElement('i');dot.style.background=sourceColor(source);dot.setAttribute('aria-hidden','true');
        const number=document.createElement('b');number.textContent=index+1;number.className='source-number';
        const label=document.createElement('span');
        label.textContent=source.name.replace(/\.[^.]+$/,'').replace(/_/g,' ').replace(/\s*[-–]\s*Copy$/i,'').replace(/\s+/g,' ').trim();
        entry.append(dot,number,label);documents.append(entry);
      });
    }
    const commitments=makeSection('Time & commitments');
    for(const [name,color] of [['Work','var(--c4)'],['Personal time','var(--c3)'],['Class','var(--c2)'],['Other assignments','var(--c1)']]){
      if(name === 'Other assignments' && ![...T().tasks,...T().events].some(item=>!sourceFor(item) && !item.type)) continue;
      const entry=document.createElement('span');entry.className='calendar-key-entry';
      if(name === 'Other assignments') entry.title='Assignments added manually or without a linked upload.';
      const dot=document.createElement('i');dot.style.background=color;dot.setAttribute('aria-hidden','true');
      entry.append(dot,document.createTextNode(name));commitments.append(entry);
      if(name === 'Other assignments'){
        const note=document.createElement('small');note.className='calendar-key-note';note.textContent='Other assignments were added manually or have no linked upload.';
        key.append(note);
      }
    }
  }

  function renderTerms() {
    $('#term').innerHTML = D.terms.map(t =>
      `<option value="${t.id}" ${t.id===D.term?'selected':''}>
        ${esc(t.name)}
      </option>`
    ).join('') + '<option value="__new">＋ New term…</option>';
  }

  $('#term').onchange = e => {
    if (e.target.value === '__new') {
      const name = (prompt('New term name:')||'').trim();
      if (name) {
        const id = uid();
        D.terms.push({id,name});
        D.by[id] = blank();
        D.term = id;
      }
    } else {
      D.term = e.target.value;
    }

    Availability.setBlocks(T().availabilityBlocks);
    save();
    render();
  };

  /* ---------- Availability Integration ---------- */

  const nav = document.createElement('button');
  nav.className = 'nav';
  nav.dataset.view = 'availability';
  nav.type = 'button';
  nav.innerHTML = '<span>◷</span>Availability';

  document.querySelector('.nav[data-view="tasks"]').after(nav);

  // Called whenever a commitment is added or removed.
  AvailabilityUI.init(() => {
    T().availabilityBlocks = Availability.getBlocks();
    save();
    toast('Availability updated');
    if (view === 'cal') renderCal();
  });

  /* ---------- Navigation ---------- */

  function go(v) {
    view = v;
    ['home','cal','tasks','availability'].forEach(x => {
      $('#v-'+x).hidden = x !== v;
    });
    document.querySelectorAll('.nav').forEach(b =>
      b.classList.toggle('on',b.dataset.view===v)
    );
    render();
  }

  document.querySelectorAll('.nav').forEach(b => {
    b.onclick = () => go(b.dataset.view);
  });

  /* ---------- Chat ---------- */

  function say(t,who='') {
    const log = $('#log');
    if(t && typeof t === 'object' && t.kind === 'deadlines') {
      const message=document.createElement('div');message.className='msg schedule-message';
      const eyebrow=document.createElement('span');eyebrow.className='chat-eyebrow';eyebrow.textContent='YOUR UPCOMING WORK';
      const heading=document.createElement('h3');heading.textContent=t.heading;
      const summary=document.createElement('p');summary.className='chat-summary';summary.textContent=t.tasks.length+' '+(t.tasks.length===1?'assignment':'assignments')+' · Completed and past assignments are excluded';
      message.append(eyebrow,heading,summary);
      const dates=[...new Set(t.tasks.map(task=>task.due))];
      dates.forEach(date=>{
        const section=document.createElement('section');section.className='chat-date-group';
        const label=document.createElement('h4');label.textContent=nice(date);section.append(label);
        const list=document.createElement('ul');list.className='chat-assignment-list';
        t.tasks.filter(task=>task.due===date).forEach(task=>{
          const row=document.createElement('li');row.className='chat-assignment';row.style.setProperty('--assignment-color',itemColor(task));
          const dot=document.createElement('span');dot.className='chat-source-dot';dot.setAttribute('aria-hidden','true');
          const details=document.createElement('div');
          const title=document.createElement('strong');title.textContent=task.title;
          const course=document.createElement('small');
          const source=sourceFor(task);const fullName=cName(task.course);
          course.textContent=courseLabel(task);
          course.title=fullName;
          details.append(title,course);row.append(dot,details);list.append(row);
        });
        section.append(list);message.append(section);
      });
      log.append(message);log.scrollTop=log.scrollHeight-message.offsetHeight;return;
    }
    log.insertAdjacentHTML('beforeend',
      `<div class="msg ${who}">${esc(t)}</div>`);
    log.scrollTop = log.scrollHeight;
  }

  function bot(q) {
    const open = T().tasks.filter(k=>!k.done && (!k.due || k.due>=iso(new Date())));
    const s = q.toLowerCase();
    const today = iso(new Date());
    const end = new Date(); end.setDate(end.getDate()+6);
    const formatTasks = tasks => tasks.map(k=>'• '+k.title+' ('+courseLabel(k)+') · '+nice(k.due)).join('\n');
    const byDeadline = (a,b)=>(a.due||'9').localeCompare(b.due||'9');
    if (/overdue|past due|missed/.test(s)) return 'This planner focuses on assignments due today and later. Ask what is coming up to see your current work.';

    if (/\b(plan|study|adjust|move|reschedule|replan)\b/.test(s)) {
      if (!open.length)
        return 'Add tasks first to generate a study plan.';

      const plannable = open.filter(k=>k.due && k.due>=today).sort(byDeadline);
      if (!plannable.length) return 'No upcoming dated assignments to plan. Add an assignment with a deadline today or later.';
      const last = plannable.map(k=>k.due).filter(Boolean)
        .sort().pop() || iso(new Date(Date.now()+7*864e5));

      const subs = T().courses.map(c => ({
        id:c.id,
        name:c.name,
        topics:plannable.filter(k=>k.course===c.id).map(k=>({
          id:k.id,
          name:k.title,
          minutes:Math.max(5,Math.round(
            k.min*(1-k.progress/100)
          ))
        }))
      })).filter(x=>x.topics.length);

      const P = Scheduler.plan({
        exam:last+'T23:00',
        sleep:'23:00',
        wake:'07:00',
        session:50,
        maxHours:4
      },subs);

      if (!P.sessions.length)
        return P.note || 'No study time available.';

      const fmt = d => d.toLocaleTimeString([],{
        hour:'numeric',minute:'2-digit'
      });

      return 'Suggested study sessions:\n' +
        P.sessions.slice(0,4).map(x =>
          '• '+nice(iso(x.start))+' '+fmt(x.start)+
          '–'+fmt(x.end)+': '+
          x.items.map(i=>i.label).join(', ')
        ).join('\n') + (P.note?'\n'+P.note:'');
    }

    if (/due|week|soon|upcoming|homework|task|assignment|schedule|today|tomorrow/.test(s)) {
      let from=today, until=iso(end), label='Due in the next 7 days';
      if (/tomorrow/.test(s)) {const day=new Date();day.setDate(day.getDate()+1);from=until=iso(day);label='Due tomorrow';}
      else if (/today/.test(s)) {until=today;label='Due today';}
      else if (/next week/.test(s)) {const day=new Date();day.setDate(day.getDate()+7);from=iso(day);day.setDate(day.getDate()+6);until=iso(day);label='Due 7–13 days from today';}
      const upcoming=open.filter(k=>k.due && k.due>=from && k.due<=until).sort(byDeadline);
      return upcoming.length ? {kind:'deadlines',heading:label,tasks:upcoming} : 'No incomplete assignments '+label.toLowerCase()+'.';
    }

    return 'I can list deadlines or suggest a study plan.';
  }

  $('#chips').innerHTML = [
    'Make me a study plan',
    'What is due soon?',
    'Adjust my schedule'
  ].map(x=>`<button type="button">${x}</button>`).join('');

  const ask = q => {say(q,'me');say(bot(q));};

  $('#chips').onclick = e => {
    if (e.target.tagName==='BUTTON')
      ask(e.target.textContent);
  };

  $('#chat-form').onsubmit = e => {
    e.preventDefault();
    const m = $('#msg').value.trim();
    if (m) {
      $('#msg').value = '';
      ask(m);
    }
  };

  /* ---------- Calendar ---------- */

  CalendarEditor.init({getTerm:T, save, refresh:date=>{if(date){cur=new Date(date+'T12:00');cur.setDate(1);}renderCal();}, notify:toast, getDefaultDate:()=>iso(new Date())});

  function renderCal() {
    renderSourceKey();
    $('#cal-title').textContent =
      cur.toLocaleDateString([],{month:'long',year:'numeric'});

    const by = {};
    const add = (date,title,color,kind,id,sourceDate=date,done=false,source=null) => {
      (by[date]??=[]).push({title,color,kind,id,sourceDate,done,source});
    };

    T().events.forEach(e =>
      add(e.date,(e.start ? e.start+'–'+e.end+' · ' : '')+e.title,({work:4,personal:3,school:2})[e.type] || 1,'event',e.id,e.date,false,sourceFor(e))
    );

    T().tasks.forEach(k => {
      if (k.due)
        add(k.due,(k.done ? '✓ Completed: ' : 'Due: ')+k.title,1,'task',k.id,k.due,!!k.done,sourceFor(k));
    });

    // Add recurring unavailable blocks.
    const rangeStart = new Date(
      cur.getFullYear(),cur.getMonth(),1
    );
    const rangeEnd = new Date(
      cur.getFullYear(),cur.getMonth()+1,1
    );

    Availability.getBlockedIntervals(
      rangeStart,rangeEnd
    ).forEach(b => {
      add(
        iso(b.start),
        'Busy: '+b.name+' ('+
          b.start.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+
          '–'+
          b.end.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+
          ')',
        ({work:4,personal:3,school:2})[b.type] || 4, 'block', b.id, b.originalDate || iso(b.start)
      );
    });

    const start = new Date(cur);
    start.setDate(1-cur.getDay());

    let html = 'Su Mo Tu We Th Fr Sa'.split(' ')
      .map(d=>`<div class="dow">${d}</div>`).join('');

    for (let i=0;i<42;i++) {
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      const key = iso(d);
      const items = by[key]||[];

      html += `<div class="day
        ${d.getMonth()!==cur.getMonth()?'out':''}
        ${key===iso(new Date())?'now':''}">
        <b>${d.getDate()}</b>
        ${items.map(x=>
          `<button type="button" class="chip calendar-event ${x.done ? 'calendar-complete' : ''}"
            data-cal-kind="${x.kind}" data-cal-id="${esc(x.id)}" data-cal-date="${esc(x.sourceDate)}"
            style="--k:${x.source ? sourceColor(x.source) : 'var(--c'+x.color+')'}"
            title="${esc(x.title + (x.source ? ' · Source: ' + x.source.name : ''))}">
            ${x.source ? '['+(T().syllabi.indexOf(x.source)+1)+'] ' : ''}${esc(x.title)}
          </button>`
        ).join('')}
      </div>`;
    }

    $('#grid').innerHTML = html;
  }

  $('#prev').onclick = () => {
    cur.setMonth(cur.getMonth()-1);
    renderCal();
  };

  $('#next').onclick = () => {
    cur.setMonth(cur.getMonth()+1);
    renderCal();
  };

  $('#btn-syl').onclick = () => $('#syl').click();
  /* ---------- Syllabus import: FastAPI parses PDF/DOCX/TXT and returns a review list ---------- */
  const API_BASE = window.STUDYFLOW_API_BASE || 'http://127.0.0.1:8000';
  let pendingImport = [], pendingFilename = "";
  const uploadStatus = message => { $("#upload-status").textContent = message; };
  const uploadError = payload => typeof payload.detail === "string" ? payload.detail : Array.isArray(payload.detail) ? payload.detail.map(x=>x.msg).join("; ") : "Please check the file and try again.";
  const reviewDlg = $('#reviewdlg');
  const reviewEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  $('#syl').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const btns = [$('#btn-syl'), $('#btn-syl2')]; btns.forEach(b => { if (b) b.disabled = true; });
    pendingFilename = f.name;
    uploadStatus('Reading ' + f.name + '…');
    toast('Uploading and analyzing syllabus…');
    try {
      const body = new FormData(); body.append('file', f);
      const response = await fetch(API_BASE + '/syllabus/upload', { method: 'POST', body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(uploadError(payload) || `Upload failed (${response.status})`);
      pendingImport = payload.assignments || [];
      $('#import-warnings').innerHTML = (payload.warnings || []).map(w => `<p>${reviewEsc(w)}</p>`).join('');
      if (!pendingImport.length) {
        uploadStatus('No assignments were detected. Try a text-based PDF, DOCX, or a document with clear assignment dates.');
        return;
      }
      uploadStatus(`Found ${pendingImport.length} assignments in ${pendingFilename}. Review before saving.`);
      renderReviewRows();
      reviewDlg.showModal();
      toast(`Found ${pendingImport.length} possible assignment(s). Review before saving.`);
    } catch (err) {
      const message = err instanceof TypeError ? 'Could not reach the upload service. Start the backend on port 8000 and try again.' : err.message;
      uploadStatus(message); toast(message);
      console.error(err);
    } finally {
      e.target.value = ''; btns.forEach(b => { if (b) b.disabled = false; });
    }
  };
  function renderReviewRows() {
    $('#review-rows').innerHTML = pendingImport.map((a, i) => {
      const review = a.needsReview || !a.dueDate || (a.confidence ?? 0) < .7;
      return `<tr class="${review ? 'needs-review' : ''}" data-index="${i}">
        <td>${review ? '<strong class="review-flag">Review</strong>' : 'Looks OK'}<small>${Math.round((a.confidence ?? 0)*100)}% confidence</small></td>
        <td><input aria-label="Course name" data-field="courseName" value="${reviewEsc(a.courseName)}"></td>
        <td><input aria-label="Assignment title" data-field="title" value="${reviewEsc(a.title)}"><small>${reviewEsc(a.assignmentType || 'assignment')}${a.weightPercent != null ? ' · ' + a.weightPercent + '%' : ''}</small></td>
        <td><input aria-label="Due date" type="date" data-field="dueDate" value="${reviewEsc(a.dueDate || '')}"></td>
        <td><select aria-label="Difficulty" data-field="difficulty">${[1,2,3,4,5].map(n => `<option value="${n}" ${Number(a.difficulty || 3)===n?'selected':''}>${n}</option>`).join('')}</select></td>
        <td><input aria-label="Estimated minutes" type="number" min="5" max="10080" step="5" data-field="estimatedMinutes" value="${Number(a.estimatedMinutes || 60)}"></td>
        <td><textarea aria-label="Instructions and source evidence" data-field="instructions">${reviewEsc((a.instructions || '') + (a.sourceQuote ? '\nSource: ' + a.sourceQuote : ''))}</textarea></td>
      </tr>`;
    }).join('');
  }
  $('#review-cancel').onclick = () => reviewDlg.close('cancel');
  $('#review-confirm').onclick = async () => {
    if (!$('#review-form').reportValidity()) return;
    const rows = [...$('#review-rows').querySelectorAll('tr')];
    const confirmed = rows.map((row, i) => {
      const a = { ...pendingImport[i] };
      row.querySelectorAll('[data-field]').forEach(el => {
        const key = el.dataset.field;
        a[key] = key === 'difficulty' || key === 'estimatedMinutes' ? Number(el.value) : el.value.trim();
      });
      a.dueDate = a.dueDate || null;
      a.needsReview = !a.dueDate || !a.title || !a.courseName || !Number.isFinite(a.estimatedMinutes) || a.estimatedMinutes <= 0;
      return a;
    });
    const invalid = confirmed.find(a => !a.title || !a.courseName || !a.dueDate || !a.estimatedMinutes || a.estimatedMinutes <= 0);
    if (invalid) return toast('Please fill in every title, course, due date, and positive time estimate before confirming.');
    const confirmBtn = $('#review-confirm'); confirmBtn.disabled = true; confirmBtn.textContent = 'Saving…';
    try {
      const response = await fetch(API_BASE + '/assignments/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ termId:D.term, assignments:confirmed }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(uploadError(payload) || `Save failed (${response.status})`);
      let imported = 0;
      const source = {id:uid(),name:pendingFilename || 'Uploaded syllabus',colorIndex:T().syllabi.reduce((max,s)=>Math.max(max,s.colorIndex ?? -1),-1)+1};
      for (const a of (payload.assignments || [])) {
        const c = course(a.courseName);
        const already = T().tasks.find(k => k.externalId && k.externalId === a.id);
        if (already) continue;
        T().tasks.push({ id:uid(), sourceId:source.id, externalId:a.id, title:a.title, instructions:a.instructions || '', course:c.id, due:a.dueDate || '', diff:Math.max(1,Math.min(3,Math.ceil((a.difficulty || 3)*3/5))), min:a.estimatedMinutes || 60, progress:0, done:false,
          parts:[], suggestedSubtasks:(a.subtasks || []) });
        imported++;
      }
      const filename = pendingFilename || 'Uploaded syllabus';
      if(imported) T().syllabi.push({...source,course:T().tasks[T().tasks.length-1]?.course || ''});
      save(); reviewDlg.close('save'); render(); go('tasks');
      toast(`Confirmed and added ${imported} assignment(s).`);
      pendingImport = [];
      uploadStatus(`Imported ${imported} assignments from ${filename}.`);
    } catch (err) { toast(err.message || 'Could not save assignments.'); console.error(err); }
    finally { confirmBtn.disabled = false; confirmBtn.textContent = 'Add to calendar'; }
  };

  /* ---------- Tasks ---------- */

  const DIFF = ['','Easy','Medium','Hard'];

  function taskHtml(k) {
    const soon = !k.done && k.diff===3 &&
      k.progress<50 && k.due &&
      new Date(k.due+'T00:00')-Date.now()<3*864e5;

    return `<div class="task ${k.done?'done':''}"
      style="--k:${itemColor(k)}">
      <input type="checkbox" data-done="${k.id}"
        ${k.done?'checked':''} aria-label="Mark done">
      <div>
        <b>${esc(k.title)}</b>
        <small class="task-context"><span class="task-course">${esc(courseLabel(k))}</span>${sourceFor(k) ? '<span>Document '+(T().syllabi.indexOf(sourceFor(k))+1)+'</span>' : ''}
          ${k.due?'<span>Due '+nice(k.due)+'</span>':''}</small>
        <div class="meta">
          <span class="diff d${k.diff}">
            ${'●'.repeat(k.diff)}${'○'.repeat(3-k.diff)}
            ${DIFF[k.diff]}
          </span>
          <span>~${k.min} min</span>
          ${soon?'<span class="flag">Start early</span>':''}
        </div>
        <div class="prog">
          <input type="range" min="0" max="100"
            step="25" value="${k.progress}"
            data-prog="${k.id}" aria-label="Progress">
          <span>${k.progress}%</span>
        </div>
      </div>
      <button class="ib" data-del="${k.id}"
        aria-label="Delete task">🗑</button>
    </div>`;
  }

  function renderTasks() {
    const today = iso(new Date());
    const wk = iso(new Date(Date.now()+7*864e5));
    const groups = {
      Done:[],Overdue:[],Today:[],'This week':[],Later:[]
    };

    T().tasks.slice().sort((a,b)=>
      (a.due||'9').localeCompare(b.due||'9')
    ).forEach(k => {
      const group = k.done?'Done':
        !k.due?'Later':
        k.due<today?'Overdue':
        k.due===today?'Today':
        k.due<=wk?'This week':'Later';
      groups[group].push(k);
    });

    groups.Done.sort((a,b)=>(b.completedAt || 0)-(a.completedAt || 0));

    $('#tasks').innerHTML = T().tasks.length
      ? Object.keys(groups).filter(g=>groups[g].length)
        .map(g=>'<div class="tgroup">'+g+'</div>'+
          groups[g].map(taskHtml).join('')
        ).join('')
      : '<div class="card empty">No tasks yet.</div>';
  }

  $('#tasks').onchange = e => {
    const d = e.target.dataset;
    const id = d.done||d.prog;
    const k = T().tasks.find(x=>x.id===id);
    if (!k) return;

    if (d.done) {
      if (e.target.checked && !k.done) k.previousProgress = k.progress || 0;
      k.done = e.target.checked;
      k.progress = k.done ? 100 : Math.min(99, k.previousProgress || 0);
    } else {
      k.progress = +e.target.value;
      k.done = k.progress===100;
    }

    k.completedAt = k.done ? Date.now() : null;
    save();
    renderTasks();
    if (k.done) $('#v-tasks').scrollIntoView({block:'start'});
    toast(k.done ? 'Task completed' : 'Task updated');
  };

  $('#tasks').onclick = e => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    T().tasks = T().tasks.filter(x=>x.id!==btn.dataset.del);
    save();
    renderTasks();
  };

  const tdlg = $('#tdlg');

  $('#btn-task').onclick = () => {
    $('#clist').innerHTML = T().courses.map(c =>
      `<option value="${esc(c.name)}">`
    ).join('');
    tdlg.querySelector('form').reset();
    tdlg.showModal();
  };

  tdlg.addEventListener('close',()=>{
    if (tdlg.returnValue!=='save') return;

    const f = tdlg.querySelector('form').elements;
    T().tasks.push({
      id:uid(),
      title:f.title.value.trim(),
      course:course(f.course.value).id,
      due:f.due.value,
      diff:+f.diff.value,
      min:+f.min.value||45,
      progress:0,
      done:false
    });

    save();
    render();
    toast('Task added');
  });

  /* ---------- Render & Startup ---------- */

  function render() {
    const name = (store('sf-users')||{})[me]?.name||'Student';
    const h = new Date().getHours();

    $('#greet').textContent =
      (h<12?'Good morning':h<18?'Good afternoon':'Good evening')
      +', '+name;

    $('#who').textContent = name;
    renderTerms();

    if (view==='cal') renderCal();
    if (view==='tasks') renderTasks();
    if (view==='availability') AvailabilityUI.render();
  }

  function boot() {
    me = store('sf-session');
    $('#auth').hidden = !!me;
    $('#app').hidden = !me;

    if (!me) {
      setMode('in');
      return;
    }

    load();
    Availability.setBlocks(T().availabilityBlocks);

    $('#log').innerHTML = '';
    say('Hi! I can build a study plan, tell you what is due, or re-plan your week.');

    go('home');
  }

  boot();
})();






