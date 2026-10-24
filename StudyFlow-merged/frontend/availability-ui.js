/* Shared editable time dropdowns. Stored values are always local HH:MM. */
(function () {
  const parse = value => {
    const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;
    let hour = Number(match[1]), minute = Number(match[2] || 0);
    if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return null;
    if (match[3]) hour = hour % 12 + (match[3].toLowerCase() === 'pm' ? 12 : 0);
    return String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0');
  };
  const display = value => {
    const time = parse(value);
    if (!time) return value;
    const [h,m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  function attach(root) {
    root.querySelectorAll('input[type="time"]').forEach(input => {
      input.type = 'text'; input.classList.add('editable-time');
      input.autocomplete = 'off'; input.placeholder = 'e.g. 9:30 AM';
      input.value = display(input.value); input.defaultValue = input.value;
      input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','none');
      input.setAttribute('aria-expanded','false'); input.setAttribute('aria-haspopup','listbox');
      const wrap = document.createElement('div'); wrap.className='time-dropdown';
      input.before(wrap); wrap.append(input);
      const list = document.createElement('div'); list.className='time-options'; list.id=input.id+'-options';
      list.hidden=true; list.setAttribute('role','listbox'); list.setAttribute('aria-label','Suggested times');
      input.setAttribute('aria-controls',list.id); wrap.append(list);
      const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
      const open=()=>{
        if(input.disabled) return;
        document.querySelectorAll('.time-options').forEach(other=>{if(other!==list){other.hidden=true;other.previousElementSibling.setAttribute('aria-expanded','false');}});
        list.classList.toggle('opens-up',input.getBoundingClientRect().bottom + 220 > window.innerHeight - 80);
        list.hidden=false;input.setAttribute('aria-expanded','true');
        const value=parse(input.value);
        list.querySelectorAll('button').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.time===value)));
        const current=list.querySelector('[aria-selected="true"]');
        list.scrollTop=current ? current.offsetTop-list.clientHeight/2 : 0;
      };
      for(let minutes=0;minutes<1440;minutes+=30){
        const time=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
        const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.dataset.time=time;button.textContent=display(time);
        button.addEventListener('mousedown',event=>event.preventDefault());
        button.addEventListener('click',event=>{event.preventDefault();input.value=display(time);input.setCustomValidity('');close();input.focus();input.dispatchEvent(new Event('change',{bubbles:true}));});
        button.addEventListener('keydown',event=>{
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();(event.key==='ArrowDown'?button.nextElementSibling:button.previousElementSibling)?.focus();}
          if(event.key==='Escape'){event.preventDefault();close();input.focus();}
        });
        list.append(button);
      }
      input.addEventListener('click',open);
      input.addEventListener('input',()=>{input.setCustomValidity('');close();});
      input.addEventListener('keydown',event=>{
        if(event.key==='ArrowDown'){event.preventDefault();open();(list.querySelector('[aria-selected="true"]')||list.firstElementChild).focus();}
        if(event.key==='Escape') close();
      });
      input.addEventListener('blur',()=>{if(parse(input.value)) input.value=display(input.value);});
      wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget))close();});
      document.addEventListener('click',event=>{if(!wrap.contains(event.target))close();});
    });
  }
  function normalize(root){
    for(const input of root.querySelectorAll('.editable-time')){
      if(input.disabled) continue;
      const value=parse(input.value);
      input.setCustomValidity(value?'':'Enter a valid time, such as 9:30 AM or 14:30.');
      if(!value){input.reportValidity();return false;}
      input.value=value;
      input.parentElement.querySelector('.time-options').hidden=true;
      input.setAttribute('aria-expanded','false');
    }
    return true;
  }
  const format = root => root.querySelectorAll('.editable-time').forEach(input=>input.value=display(input.value));
  window.TimeControls={attach,normalize,format};
})();

/* StudyFlow — Availability UI */
(function () {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const $ = selector => document.querySelector(selector);
    let selectedDays = new Set();
    let initialized = false;

    function createPage() {
        if ($('#v-availability')) return;
        const page = document.createElement('section');
        page.id = 'v-availability';
        page.hidden = true;
        page.innerHTML = `
            <header class="availability-header">
                <span class="availability-eyebrow">YOUR WEEK, YOUR WAY</span>
                <h1>Weekly Availability</h1>
                <p>Add the times you’re busy. Keep your week in balance.</p>
            </header>
            <div class="availability-card">
                <form id="availability-form" class="availability-form">
                    <div class="availability-card-heading">
                        <span class="availability-icon" aria-hidden="true">◷</span>
                        <div><h2>Add a commitment</h2><p>Repeats weekly during this term.</p></div>
                    </div>
                    <div class="availability-basics">
                        <div class="availability-field">
                            <label for="av-name">Activity</label>
                            <input id="av-name" name="name" placeholder="e.g. Chemistry class or work" required maxlength="120">
                        </div>
                        <div class="availability-field">
                            <label for="av-type">Type</label>
                            <select id="av-type" name="type">
                                <option value="school">Class</option>
                                <option value="work">Work</option>
                                <option value="personal">Personal time</option>
                            </select>
                        </div>
                    </div>
                    <fieldset class="availability-day-group">
                        <legend>Which days?</legend>
                        <p class="availability-help" id="av-day-help">Select all the days this activity repeats.</p>
                        <div id="av-days" class="availability-days" aria-describedby="av-day-help">
                            ${DAYS.map(day => `<button type="button" class="availability-day" data-day="${day}" aria-pressed="false"><span>${day}</span><span class="availability-check" aria-hidden="true">✓</span></button>`).join('')}
                        </div>
                        <div class="availability-presets" aria-label="Day shortcuts">
                            <button type="button" data-preset="weekdays">Weekdays</button>
                            <button type="button" data-preset="weekends">Weekends</button>
                            <button type="button" data-preset="everyday">Every day</button>
                            <button type="button" data-preset="clear">Clear</button>
                        </div>
                        <p id="av-selection" class="availability-selection" role="status">No days selected yet</p>
                    </fieldset>
                    <div class="availability-times">
                        <div class="availability-field"><label for="av-start">Start time</label><input type="time" id="av-start" name="start" value="09:00" required></div>
                        <span class="availability-time-arrow" aria-hidden="true">→</span>
                        <div class="availability-field"><label for="av-end">End time</label><input type="time" id="av-end" name="end" value="10:00" required></div>
                    </div>
                    <p id="av-error" class="err" role="alert"></p>
                    <button type="submit" class="btn pri availability-save">+ Add commitment</button>
                </form>
            </div>
            <div class="availability-list-heading"><h2>Your weekly commitments</h2><span id="av-count"></span></div>
            <div id="availability-list" class="availability-list"></div>`;
        const card = page.querySelector('.availability-card');
        page.insertBefore(page.querySelector('.availability-list-heading'), card);
        page.insertBefore(page.querySelector('#availability-list'), card);
        $('.main').append(page);
        TimeControls.attach(page);
    }

    function updateDays() {
        document.querySelectorAll('#av-days [data-day]').forEach(btn => {
            const selected = selectedDays.has(btn.dataset.day);
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        const days = DAYS.filter(day => selectedDays.has(day));
        $('#av-selection').textContent = days.length
            ? `Repeats ${days.join(', ')} · ${days.length} ${days.length === 1 ? 'day' : 'days'} a week`
            : 'No days selected yet';
        $('#av-error').textContent = '';
    }

    function render() {
        const list = $('#availability-list');
        if (!list) return;
        const blocks = Availability.getBlocks().reverse().sort((a,b)=>(b.updatedAt || 0)-(a.updatedAt || 0));
        $('#av-count').textContent = `${blocks.length} ${blocks.length === 1 ? 'commitment' : 'commitments'}`;
        list.replaceChildren();
        if (!blocks.length) {
            const empty = document.createElement('div');
            empty.className = 'availability-empty';
            empty.textContent = 'Your week is a blank canvas. Add a class, shift, or personal commitment above to get started.';
            list.append(empty);
            return;
        }
        const formatTime = time => new Date(`2000-01-01T${time}`).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
        blocks.forEach(block => {
            const item = document.createElement('div');
            item.className = 'availability-item';
            if (['school', 'work', 'personal'].includes(block.type)) item.classList.add(block.type);
            const info = document.createElement('div');
            info.className = 'availability-item-info';
            const title = document.createElement('strong');
            title.textContent = block.name;
            const details = document.createElement('small');
            details.textContent = `${DAYS.filter(day => block.days.includes(day)).join(', ')} · ${formatTime(block.start)}–${formatTime(block.end)}`;
            info.append(title, details);
            const category = document.createElement('span');
            category.className = 'availability-category';
            category.textContent = ['school', 'work', 'personal'].includes(block.type) ? ({school:'Class',work:'Work',personal:'Personal time'})[block.type] : 'Commitment';
            const remove = document.createElement('button');
            remove.className = 'availability-delete';
            remove.type = 'button';
            remove.textContent = 'Remove';
            remove.dataset.remove = block.id;
            remove.setAttribute('aria-label', `Remove ${block.name} from your weekly schedule`);
            item.append(info, category, remove);
            list.append(item);
        });
    }

    function init(onChange) {
        createPage();
        if (initialized) return;
        initialized = true;
        $('.availability-presets').addEventListener('click', event => {
            const button = event.target.closest('[data-preset]');
            if (!button) return;
            const presets = {weekdays: DAYS.slice(1, 6), weekends: ['Sun', 'Sat'], everyday: DAYS, clear: []};
            selectedDays = new Set(presets[button.dataset.preset]);
            updateDays();
        });
        $('#av-days').addEventListener('click', event => {
            const button = event.target.closest('[data-day]');
            if (!button) return;
            const day = button.dataset.day;
            if (selectedDays.has(day)) selectedDays.delete(day);
            else selectedDays.add(day);
            updateDays();
        });
        $('#availability-form').addEventListener('submit', event => {
            event.preventDefault();
            const form = event.currentTarget;
            const fields = form.elements;
            const error = $('#av-error');
            error.textContent = '';
            if (!fields.name.value.trim()) {
                error.textContent = 'Give this commitment a name, such as Work or Chemistry.';
                fields.name.focus();
                return;
            }
            if (!selectedDays.size) {
                error.textContent = 'Choose at least one day for this commitment.';
                $('#av-days button').focus();
                return;
            }
            if (!TimeControls.normalize(form)) return;
            if (fields.start.value >= fields.end.value) {
                error.textContent = 'End time must be later than start time. For an overnight activity, add two separate commitments.';
                fields.end.focus();
                return;
            }
            try {
                Availability.addBlock({name: fields.name.value.trim(), type: fields.type.value,
                    days: DAYS.filter(day => selectedDays.has(day)), start: fields.start.value, end: fields.end.value});
                onChange();
                form.reset();
                selectedDays.clear();
                updateDays();
                render();
                $('#availability-list').scrollIntoView({block:'nearest'});
            } catch (err) { error.textContent = err.message; }
        });
        $('#availability-list').addEventListener('click', event => {
            const button = event.target.closest('[data-remove]');
            if (!button) return;
            const buttons = [...document.querySelectorAll('#availability-list [data-remove]')];
            const index = buttons.indexOf(button);
            Availability.deleteBlock(button.dataset.remove);
            onChange();
            render();
            const remaining = document.querySelectorAll('#availability-list [data-remove]');
            (remaining[Math.min(index, remaining.length - 1)] || document.querySelector('#av-name')).focus();
        });
    }
    window.AvailabilityUI = {init, render};
})();




