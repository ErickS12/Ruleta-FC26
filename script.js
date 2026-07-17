(function(){
  const palette = ["#F4B740","#E94F4F","#3FBFAD","#7C6FD6","#F28C6B","#5FA8E0","#D6C24A","#C86FD6"];

  let options = [
    { id: 1, text: "Izquierda arriba", weight: 1 },
    { id: 2, text: "Izquierda medio",  weight: 1 },
    { id: 3, text: "Izquierda abajo",  weight: 1 },
    { id: 4, text: "Centro arriba",    weight: 1 },
    { id: 5, text: "Centro",           weight: 1 },
    { id: 6, text: "Centro abajo",     weight: 1 },
    { id: 7, text: "Centro picar",     weight: 1 },
    { id: 8, text: "Derecha arriba",   weight: 1 },
    { id: 9, text: "Derecha medio",    weight: 1 },
    { id: 10, text: "Derecha abajo",   weight: 1 }
    
  ];
  let nextId = 11;
  let totalRotation = 0;
  let spinning = false;

  const optList   = document.getElementById('optList');
  const wheelRot  = document.getElementById('wheelRotator');
  const hubBtn    = document.getElementById('hubBtn');
  const spinBtn   = document.getElementById('spinBtn');
  const addBtn    = document.getElementById('addBtn');
  const eqBtn     = document.getElementById('eqBtn');
  const statusLine= document.getElementById('statusLine');
  const overlay   = document.getElementById('overlay');
  const resultsList = document.getElementById('resultsList');
  const resultsSummary = document.getElementById('resultsSummary');
  const closeBtn  = document.getElementById('closeBtn');
  const againBtn  = document.getElementById('againBtn');
  const bulbRing  = document.getElementById('bulbRing');

  function totalWeight(){
    return options.reduce((s,o)=> s + (Number(o.weight)>0? Number(o.weight):0), 0);
  }

  function renderList(){
    optList.innerHTML = '';
    const tw = totalWeight();
    options.forEach((o, idx) => {
      const row = document.createElement('div');
      row.className = 'opt-row';

      const swatch = document.createElement('span');
      swatch.className = 'opt-swatch';
      swatch.style.background = palette[idx % palette.length];
      row.appendChild(swatch);

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = o.text;
      textInput.setAttribute('aria-label', 'Texto de la opción');
      textInput.maxLength = 40;
      textInput.addEventListener('input', e => {
        o.text = e.target.value;
        renderWheel();
      });
      row.appendChild(textInput);

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '1';
      weightInput.max = '100';
      weightInput.value = o.weight;
      weightInput.setAttribute('aria-label', 'Peso / probabilidad relativa');
      weightInput.addEventListener('input', e => {
        let v = parseInt(e.target.value, 10);
        if (!v || v < 1) v = 1;
        o.weight = v;
        renderList();
        renderWheel();
      });
      row.appendChild(weightInput);

      const pct = document.createElement('span');
      pct.className = 'opt-pct';
      const p = tw > 0 ? (Number(o.weight) / tw * 100) : 0;
      pct.textContent = p.toFixed(0) + '%';
      row.appendChild(pct);

      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Eliminar opción ' + o.text);
      del.addEventListener('click', () => {
        if (options.length <= 2){
          statusLine.textContent = 'Necesitas al menos 2 opciones.';
          return;
        }
        options = options.filter(x => x.id !== o.id);
        renderList();
        renderWheel();
        updateSpinAvailability();
      });
      row.appendChild(del);

      optList.appendChild(row);
    });
    updateSpinAvailability();
  }

  function updateSpinAvailability(){
    const canSpin = options.length >= 2 && totalWeight() > 0;
    spinBtn.disabled = !canSpin || spinning;
    hubBtn.setAttribute('aria-disabled', String(!canSpin || spinning));
    if (!spinning){
      statusLine.textContent = canSpin ? '' : 'Agrega al menos 2 opciones para girar.';
    }
  }

  function renderWheel(){
    // remove old labels
    wheelRot.querySelectorAll('.label-wrap').forEach(el => el.remove());

    const tw = totalWeight();
    if (tw <= 0 || options.length === 0){
      wheelRot.style.background = '#382A57';
      return;
    }

    let cumulative = 0; // degrees
    const stops = [];
    const fragment = document.createDocumentFragment();

    options.forEach((o, idx) => {
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      const angle = (w / tw) * 360;
      const start = cumulative;
      const end = cumulative + angle;
      const color = palette[idx % palette.length];
      stops.push(color + ' ' + start.toFixed(3) + 'deg ' + end.toFixed(3) + 'deg');

      const mid = start + angle / 2;
      const wrap = document.createElement('div');
      wrap.className = 'label-wrap';
      wrap.style.transform = 'rotate(' + (mid - 90).toFixed(2) + 'deg)';

      const span = document.createElement('span');
      span.className = 'label-text';
      span.textContent = o.text || '(sin texto)';
      const fontSize = angle < 25 ? 11 : angle < 45 ? 13 : 15;
      span.style.fontSize = fontSize + 'px';
      span.style.maxWidth = (angle < 30 ? 70 : 100) + 'px';
      wrap.appendChild(span);

      fragment.appendChild(wrap);
      cumulative = end;
    });

    wheelRot.appendChild(fragment);
    wheelRot.style.background = 'conic-gradient(' + stops.join(', ') + ')';
  }

  function buildBulbs(){
    bulbRing.innerHTML = '';
    const count = 20;
    for (let i = 0; i < count; i++){
      const b = document.createElement('span');
      const ang = (360 / count) * i;
      const radius = 50; // percent-ish via translate trick using vmin not needed; use JS to position with px after layout
      b.style.transform = 'rotate(' + ang + 'deg) translate(0, -50%)';
      b.style.animationDelay = (i * (2.4/count)).toFixed(2) + 's';
      bulbRing.appendChild(b);
    }
    positionBulbs();
  }

  function positionBulbs(){
    const rect = bulbRing.getBoundingClientRect();
    const r = rect.width / 2;
    bulbRing.querySelectorAll('span').forEach((b, i, arr) => {
      const ang = (360 / arr.length) * i;
      const rad = (ang - 90) * Math.PI / 180;
      const x = r + r * Math.cos(rad);
      const y = r + r * Math.sin(rad);
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      b.style.transform = '';
    });
  }

  function pickWinnerAngle(){
    // uniform random point on the circle; the segment containing it wins,
    // so probability of winning equals segment size (weight share).
    const tw = totalWeight();
    const r = Math.random() * tw;
    let cum = 0;
    let winner = options[0];
    let start = 0, end = 0;
    for (const o of options){
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      const segStart = cum;
      const segEnd = cum + w;
      if (r >= segStart && r < segEnd){
        winner = o;
        start = (segStart / tw) * 360;
        end = (segEnd / tw) * 360;
        break;
      }
      cum = segEnd;
    }
    // random point within the segment (avoid extreme edges)
    const margin = Math.min((end - start) * 0.15, 4);
    const angle = start + margin + Math.random() * Math.max((end - start) - margin * 2, 0.001);
    return { winner, angle, pct: ((end-start)/360*100) };
  }

  function pickWeightedOption(){
    const tw = totalWeight();
    const r = Math.random() * tw;
    let cum = 0;
    for (const o of options){
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      if (r < cum + w) return o;
      cum += w;
    }
    return options[options.length - 1];
  }

  const RESULT_COUNT = 15;

  function spin(){
    if (spinning) return;
    if (options.length < 2 || totalWeight() <= 0){
      statusLine.textContent = 'Agrega al menos 2 opciones para girar.';
      return;
    }
    spinning = true;
    updateSpinAvailability();
    statusLine.textContent = 'Girando…';

    const { winner, angle } = pickWinnerAngle();
    const targetEffective = (360 - angle) % 360;
    const currentEffective = ((totalRotation % 360) + 360) % 360;
    let delta = (targetEffective - currentEffective + 360) % 360;
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
    totalRotation += delta + extraSpins * 360;

    wheelRot.style.transform = 'rotate(' + totalRotation + 'deg)';

    // El resultado que marca el puntero es el primero de la lista;
    // los otros 14 se generan con la misma probabilidad ponderada.
    const results = [winner];
    for (let i = 1; i < RESULT_COUNT; i++){
      results.push(pickWeightedOption());
    }

    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      wheelRot.removeEventListener('transitionend', onEnd);
      spinning = false;
      updateSpinAvailability();
      statusLine.textContent = '';
      showResults(results);
    };
    wheelRot.addEventListener('transitionend', onEnd);
  }

  function showResults(results){
    resultsList.innerHTML = '';
    results.forEach((o, i) => {
      const li = document.createElement('li');
      if (i === 0) li.className = 'first';
      const num = document.createElement('span');
      num.className = 'rnum';
      num.textContent = String(i + 1);
      const text = document.createElement('span');
      text.className = 'rtext';
      text.textContent = o.text || '(sin texto)';
      li.appendChild(num);
      li.appendChild(text);
      resultsList.appendChild(li);
    });

    const counts = {};
    results.forEach(o => {
      const key = o.text || '(sin texto)';
      counts[key] = (counts[key] || 0) + 1;
    });
    resultsSummary.textContent = 'Conteo: ' + Object.entries(counts)
      .map(([k, v]) => k + ' ×' + v)
      .join('  ·  ');

    overlay.classList.add('show');
    againBtn.focus();
  }

  function closeResult(){
    overlay.classList.remove('show');
    hubBtn.focus();
  }

  addBtn.addEventListener('click', () => {
    options.push({ id: nextId++, text: 'Nueva opción', weight: 1 });
    renderList();
    renderWheel();
  });

  eqBtn.addEventListener('click', () => {
    options.forEach(o => o.weight = 1);
    renderList();
    renderWheel();
  });

  spinBtn.addEventListener('click', spin);
  hubBtn.addEventListener('click', spin);
  hubBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); spin(); }
  });

  closeBtn.addEventListener('click', closeResult);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResult(); });
  againBtn.addEventListener('click', () => { closeResult(); spin(); });

  window.addEventListener('resize', positionBulbs);

  renderList();
  renderWheel();
  buildBulbs();
})();
