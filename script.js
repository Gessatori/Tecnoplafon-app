const titles = {
    operaio:["Area operaio","Portale collaboratore: inserimento ore, richieste e riepilogo personale."],
    admin:["Area admin","Controllo giornaliero collaboratori, ore da approvare e anomalie."],
    ore:["Raccolta ore","Riepilogo admin filtrabile per collaboratore, cantiere, ID categoria e lavorazione."],
    raccoltaOperai:["Raccolta operai","Totali per collaboratore, cantiere e tipologia con stampa mensile, AVS e trasferte."],
    cantieri:["Cantieri","Gestione cantieri attivi, sospesi e terminati con ore previste e reali."],
    lavorazioni:["ID lavorazioni","Gestione lista unica ID + Categoria e lavorazioni collegate."],
    collaboratori:["Collaboratori","Gestione attivi, terminati, ruoli, permessi e password."],
    regole:["Regole e rimborsi","Regole ore, AVS e rimborsi giornalieri per tratta stradale."],
    calendari:["Calendari","Calendario annuale aziendale e calendario collaboratore lato admin."],
    economia:["Economia cantiere","Base futura per controllo economico dei cantieri."]
  };
  const lavorazioni = {
    "100":["Pareti in cartongesso","Controsoffitti","Velette","Botole","Contropareti","Rinforzi"],
    "200":["Rasatura pareti","Stabilitura","Ripristini","Intonaco interno"],
    "300":["Lana minerale","Isolamento acustico","Isolamento termico","Cappotto interno"],
    "400":["Fondo","Mano intermedia","Finitura","Ritocchi"],
    "500":["Protezioni","Demolizioni","Pulizia cantiere","Preparazione supporti"],
    "600":["Regia","Imprevisti","Assistenze","Lavori non previsti"]
  };
  const ADMIN_PASSWORD = "TP2026";
  let adminUnlocked = sessionStorage.getItem("tecnoplafonAdminUnlocked") === "1";
  let pendingAdminOreEditIndex = null;

  function openAdminAccess(){
    const panel = document.getElementById('adminAccessPanel');
    const input = document.getElementById('adminAccessPassword');
    const err = document.getElementById('adminAccessError');
    if(err) err.style.display = 'none';
    if(input) input.value = '';
    if(panel){
      panel.classList.add('open');
      panel.style.display = 'flex';
      setTimeout(()=>{ if(input) input.focus(); }, 80);
    }else{
      alert('Pannello admin non trovato. Ricarica il file aggiornato.');
    }
  }

  function closeAdminAccess(event){
    if(event && event.target && event.target.id !== 'adminAccessPanel') return;
    const panel = document.getElementById('adminAccessPanel');
    if(panel){
      panel.classList.remove('open');
      panel.style.display = 'none';
    }
  }

  function adminLoginSubmit(){
    const input = document.getElementById('adminAccessPassword');
    const err = document.getElementById('adminAccessError');
    const pass = input ? input.value.trim() : '';
    if(pass === ADMIN_PASSWORD){
      adminUnlocked = true;
      sessionStorage.setItem('tecnoplafonAdminUnlocked','1');
      if(err) err.style.display = 'none';
      closeAdminAccess();
      showSection('admin');
      if(pendingAdminOreEditIndex !== null && pendingAdminOreEditIndex !== undefined){
        const idx = pendingAdminOreEditIndex;
        pendingAdminOreEditIndex = null;
        setTimeout(()=>{
          vaiAModificaOreAdmin(idx);
        }, 120);
      }
    }else{
      if(err) err.style.display = 'block';
      if(input){ input.focus(); input.select(); }
    }
  }

  function logoutAdmin(){
    adminUnlocked = false;
    sessionStorage.removeItem("tecnoplafonAdminUnlocked");
    showSection('operaio');
  }

  function showSection(id){
    if(id !== 'operaio' && !adminUnlocked){
      openAdminAccess();
      return;
    }
    document.body.classList.toggle('worker-view', id === 'operaio');
    document.body.classList.toggle('admin-view', id !== 'operaio');
    document.querySelectorAll('.section').forEach(s=>s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
    [...document.querySelectorAll('nav button')].find(b=>b.getAttribute('onclick')?.includes("'" + id + "'"))?.classList.add('active');
    document.querySelectorAll('.role-switch button').forEach(b=>b.classList.remove('active'));
    if(id==="operaio") document.querySelectorAll('.role-switch button')[0].classList.add('active');
    if(id==="admin") document.querySelectorAll('.role-switch button')[1].classList.add('active');
    if(titles[id]){
      document.getElementById('pageTitle').textContent = titles[id][0];
      document.getElementById('pageSubtitle').textContent = titles[id][1];
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function aggiornaLavorazioni(){
    const id = document.getElementById('categoriaSelect').value;
    const select = document.getElementById('lavorazioneSelect');
    select.innerHTML = "";
    lavorazioni[id].forEach(v=>{
      const opt=document.createElement('option');
      opt.textContent=v;
      select.appendChild(opt);
    });
  }
  function demoSave(){
    alert("Demo: dato salvato. Nella versione collegata a database verrà registrato e controllato dalle regole admin.");
  }
  function scrollToBox(id){
    const el=document.getElementById(id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function buildCalendar(target, admin=false){
    const names=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
    const box=document.getElementById(target);
    box.innerHTML="";
    names.forEach(n=>{
      const d=document.createElement('div');
      d.className="dayname"; d.textContent=n; box.appendChild(d);
    });
    for(let i=1;i<=30;i++){
      const d=document.createElement('div');
      let cls="day";
      let txt="";
      if([1,2,3,4,8,9,10,11,15,16,17,18,22,23,24,25].includes(i)){cls+=" d-green";txt="8 ore approvate";}
      if([5,12,19].includes(i)){cls+=" d-yellow";txt="Da controllare";}
      if([6,7,13,14,20,21,27,28].includes(i)){cls+=" d-gray";txt="Non lavorativo";}
      if([26].includes(i)){cls+=" d-blue";txt="Vacanza";}
      if(admin && [29].includes(i)){cls+=" d-red";txt="Ore mancanti";}
      if(admin && [30].includes(i)){cls+=" d-orange";txt="Richiesta in attesa";}
      d.className=cls;
      d.innerHTML="<strong>"+i+"</strong><small>"+txt+"</small>";
      box.appendChild(d);
    }
  }
  function localTodayIso(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  const today = localTodayIso();
  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById('dataOre').value=today;
    const dataOreEl = document.getElementById('dataOre');
    if(dataOreEl){ dataOreEl.min = today; dataOreEl.max = today; dataOreEl.title = 'Le ore si possono segnare solo oggi.'; }
    aggiornaLavorazioni();
    buildCalendar("calendarOperaio", false);
    buildCalendar("calendarAdmin", true);
    popolaSelectEconomici();
    renderEconomia();
    renderAdminData();
    calcolaOreDesktop();
    renderWorkerTimesheet();
    popolaFiltriAndamento();
    renderAndamentoCantiere();
    popolaLinkedHoursFilters();
    renderLinkedHoursPanel();
    popolaRaccoltaOperaiSelect();
    renderRaccoltaOperai();
    initAdminMonthPanel();
  });

  const ECON_TIPI = [
    {key:"intonaco", label:"INTONACO", cls:"tipo-intonaco", ids:["700"], words:["intonaco","intonacatura"]},
    {key:"gesso", label:"Gesso", cls:"tipo-gesso", ids:["200"], words:["gesso","rasatura","stabilitura"]},
    {key:"isolazione", label:"ISOLAZIONE", cls:"tipo-isolazione", ids:["300"], words:["isolazione","isolamento","cappotto","lana","eps"]},
    {key:"cartongesso", label:"CARTONGESSO", cls:"tipo-cartongesso", ids:["100"], words:["cartongesso","lastre","parete","controsoffitto","soffitto"]},
    {key:"pittura", label:"PITTURA", cls:"tipo-pittura", ids:["400"], words:["pittura","imbiancatura","vernice","colore"]},
    {key:"artigiani", label:"Artigiani", cls:"tipo-artigiani", ids:["800"], words:["artigiani","subappalto","elettricista","idraulico"]},
    {key:"regia", label:"REGIA", cls:"tipo-regia", ids:["600"], words:["regia","extra","imprevisti","assistenze","lavori non previsti"]},
    {key:"dividere", label:"DIVIDERE", cls:"tipo-dividere", ids:["900"], words:["dividere","ripartire","generale"]},
    {key:"altro", label:"ALTRO", cls:"tipo-altro", ids:["500"], words:["altro","preparazione"]}
  ];

  let economia = JSON.parse(localStorage.getItem("tecnoplafon_economia_collegata_v2") || "null") || {
    ore: [
      {data:"03.06.2026", cantiere:"Lugano Centro", collaboratore:"Mario Rossi", idCat:"100 — Cartongesso", lavorazione:"Controsoffitto", tipo:"cartongesso", ore:8, assegnatoDa:"Admin"},
      {data:"03.06.2026", cantiere:"Paradiso Residenza", collaboratore:"Luca Bianchi", idCat:"200 — Rasatura / Intonaco", lavorazione:"Rasatura pareti", tipo:"gesso", ore:8.5, assegnatoDa:"Admin"},
      {data:"03.06.2026", cantiere:"Viganello Appartamenti", collaboratore:"Anna Gallo", idCat:"300 — Isolamento", lavorazione:"Isolamento acustico", tipo:"isolazione", ore:7.5, assegnatoDa:"Admin"}
    ],
    materiali: [
      {data:"03.06.2026", cantiere:"Lugano Centro", descrizione:"Lastre cartongesso", tipo:"cartongesso", costo:480},
      {data:"03.06.2026", cantiere:"Paradiso Residenza", descrizione:"Rasante", tipo:"gesso", costo:220}
    ],
    preventivi: {
      "Lugano Centro": {intonaco:0,gesso:0,isolazione:0,cartongesso:9000,pittura:0,artigiani:0,regia:0,dividere:0,altro:1000},
      "Paradiso Residenza": {intonaco:0,gesso:6000,isolazione:0,cartongesso:0,pittura:0,artigiani:0,regia:0,dividere:0,altro:0},
      "Viganello Appartamenti": {intonaco:0,gesso:0,isolazione:7500,cartongesso:0,pittura:0,artigiani:0,regia:0,dividere:0,altro:0}
    },
    preventiviGenerali: {
      "Lugano Centro": 10000,
      "Paradiso Residenza": 6000,
      "Viganello Appartamenti": 7500
    }
  };

  function econSave(){ localStorage.setItem("tecnoplafon_economia_collegata_v2", JSON.stringify(economia)); }
  function econFmt(n){ const x=Number(n)||0; return x.toLocaleString("it-CH",{maximumFractionDigits:2,minimumFractionDigits:x%1?2:0}); }
  function econToday(){ return localTodayIso(); }

  function tipoEconomicoDaIdCategoria(idCat, lavorazione){
    const s = String(idCat || "") + " " + String(lavorazione || "");
    const lower = s.toLowerCase();
    const id = (String(idCat || "").match(/\d+/)||[""])[0];
    for(const t of ECON_TIPI){
      if(t.ids.includes(id)) return t.key;
      if(t.words.some(w => lower.includes(w))) return t.key;
    }
    return "altro";
  }

  function popolaSelectEconomici(){
    ["econTipoMat","econTipoPrev"].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.innerHTML = ECON_TIPI.map(t=>`<option value="${t.key}">${t.label}</option>`).join("");
    });
    const dm = document.getElementById("econDataMat");
    if(dm && !dm.value) dm.value = econToday();
  }

  function cambiaCantiereEconomico(){ renderEconomia(); }

  function econCantiereAttivo(){
    const el = document.getElementById("econCantiere");
    return el ? el.value : "Lugano Centro";
  }

  function econSommaOre(c,tipo){
    return economia.ore.filter(r=>r.cantiere===c && r.tipo===tipo).reduce((s,r)=>s+Number(r.ore||0),0);
  }
  function econSommaMat(c,tipo){
    return economia.materiali.filter(r=>r.cantiere===c && r.tipo===tipo).reduce((s,r)=>s+Number(r.costo||0),0);
  }
  function econPreventivo(c,tipo){
    if(!economia.preventivi[c]) economia.preventivi[c] = {};
    return Number(economia.preventivi[c][tipo] || 0);
  }

  function syncEconomicPreview(){
    const cSel = document.getElementById("operaioCantiereSelect");
    const econSel = document.getElementById("econCantiere");
    if(!cSel || !econSel) return;
    const clean = cSel.value.replace(" - attivo","");
    [...econSel.options].forEach(o=>{
      if(clean.includes(o.value) || o.value.includes(clean)) econSel.value = o.value;
    });
  }

  function salvaOreCollegate(){
    const data = document.getElementById("dataOre")?.value || econToday();
    const cantiereText = document.getElementById("operaioCantiereSelect")?.value || "Lugano Centro";
    const cantiere = cantiereText.replace(" - attivo","");
    const idCatText = document.getElementById("categoriaSelect")?.selectedOptions[0]?.textContent || "100 — Cartongesso";
    const lavorazione = document.getElementById("lavorazioneSelect")?.value || "";
    const ore = Number(document.getElementById("oreDesktop")?.value || 0);
    const da = document.getElementById("oraDaDesktop")?.value || "";
    const a = document.getElementById("oraADesktop")?.value || "";
    const pausa = document.getElementById("pausaDesktop")?.value || "";
    const collaboratore = "Operaio demo";
    const tipo = tipoEconomicoDaIdCategoria(idCatText, lavorazione);
    if(!ore || ore <= 0){ alert("Inserisci le ore."); return; }
    if(!validaRegoleOrarieOperaio(data, ore, da, a, pausa, collaboratore)) return;
    economia.ore.push({data,cantiere,collaboratore,idCat:idCatText,lavorazione,tipo,ore,da,a,pausa,assegnatoDa:"Collaboratore / App"});
    updateWorkerTimesheetEntry(data, cantiere, ore, da, a, pausa, idCatText, lavorazione);
    econSave();
    const econSel = document.getElementById("econCantiere");
    if(econSel) econSel.value = cantiere;
    renderEconomia();
    renderRaccoltaOperai();
    renderAdminPresenzeOggi();
    alert("Ore salvate e collegate all’analisi economica del cantiere.");
  }

  function aggiungiMaterialeEconomico(){
    const c = econCantiereAttivo();
    const r = {
      data: document.getElementById("econDataMat")?.value || econToday(),
      cantiere:c,
      descrizione: document.getElementById("econMateriale")?.value.trim() || "",
      tipo: document.getElementById("econTipoMat")?.value || "altro",
      costo: Number(document.getElementById("econCostoMat")?.value || 0)
    };
    if(!r.descrizione || r.costo <= 0){ alert("Inserisci materiale e costo."); return; }
    economia.materiali.push(r);
    document.getElementById("econMateriale").value = "";
    document.getElementById("econCostoMat").value = "";
    econSave(); renderEconomia();
  }

  function salvaPreventivoEconomico(){
    const c = econCantiereAttivo();
    const tipo = document.getElementById("econTipoPrev")?.value || "altro";
    const val = Number(document.getElementById("econValorePrev")?.value || 0);
    if(!economia.preventivi[c]) economia.preventivi[c] = {};
    economia.preventivi[c][tipo] = val;
    document.getElementById("econValorePrev").value = "";
    econSave(); renderEconomia();
  }


  function ensurePreventivoCantiere(c){
    if(!economia.preventivi) economia.preventivi = {};
    if(!economia.preventiviGenerali) economia.preventiviGenerali = {};
    if(!economia.preventivi[c]) economia.preventivi[c] = {};
    ECON_TIPI.forEach(t=>{
      if(economia.preventivi[c][t.key] === undefined) economia.preventivi[c][t.key] = 0;
    });
    if(economia.preventiviGenerali[c] === undefined) {
      economia.preventiviGenerali[c] = ECON_TIPI.reduce((s,t)=>s+Number(economia.preventivi[c][t.key]||0),0);
    }
  }

  function sommaPreventiviTipologie(c){
    ensurePreventivoCantiere(c);
    return ECON_TIPI.reduce((s,t)=>s+Number(economia.preventivi[c][t.key]||0),0);
  }

  function renderBudgetEditor(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    const gen = document.getElementById("econPreventivoGenerale");
    const grid = document.getElementById("econBudgetGrid");
    if(!gen || !grid) return;

    if(document.activeElement !== gen) gen.value = economia.preventiviGenerali[c] || 0;

    grid.innerHTML = ECON_TIPI.map(t=>{
      const val = Number(economia.preventivi[c][t.key] || 0);
      return `<div class="budget-box">
        <label>${t.label}</label>
        <input data-budget-tipo="${t.key}" type="number" min="0" step="0.05" value="${val}" oninput="aggiornaPreventivoTipologiaLive()">
      </div>`;
    }).join("");

    aggiornaDiffPreventivo();
  }

  function aggiornaPreventivoTipologiaLive(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    document.querySelectorAll("[data-budget-tipo]").forEach(inp=>{
      economia.preventivi[c][inp.dataset.budgetTipo] = Number(inp.value || 0);
    });
    aggiornaDiffPreventivo();
    renderEconomia(false);
  }

  function aggiornaDiffPreventivo(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    const gen = Number(document.getElementById("econPreventivoGenerale")?.value || 0);
    economia.preventiviGenerali[c] = gen;
    const somma = sommaPreventiviTipologie(c);
    const diff = gen - somma;
    const el = document.getElementById("econDiffPreventivo");
    if(el){
      el.value = "CHF " + econFmt(diff);
      el.className = Math.abs(diff) < 0.01 ? "diff-ok" : "diff-bad";
    }
  }

  function salvaPreventiviTipologie(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    economia.preventiviGenerali[c] = Number(document.getElementById("econPreventivoGenerale")?.value || 0);
    document.querySelectorAll("[data-budget-tipo]").forEach(inp=>{
      economia.preventivi[c][inp.dataset.budgetTipo] = Number(inp.value || 0);
    });
    econSave();
    renderEconomia();
    alert("Preventivo generale e preventivi per tipologia salvati.");
  }

  function ripartisciPreventivoUguale(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    const totale = Number(document.getElementById("econPreventivoGenerale")?.value || 0);
    const quota = totale / ECON_TIPI.length;
    ECON_TIPI.forEach(t=>economia.preventivi[c][t.key] = Number(quota.toFixed(2)));
    econSave();
    renderEconomia();
  }

  function renderEconomia(updateBudgetEditor = true){
    popolaSelectEconomici();
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    const costoOra = Number(document.getElementById("econCostoOra")?.value || 60);
    const costoDividere = Number(document.getElementById("econCostoDividere")?.value || 20);

    const table = document.getElementById("econRiepilogo");
    if(table){
      const header = `<tr><th></th>${ECON_TIPI.map(t=>`<th class="${t.cls}">${t.label}</th>`).join("")}</tr>`;
      const oreRow = `<tr><td>Ore collaboratori</td>${ECON_TIPI.map(t=>`<td class="${t.cls}">${econFmt(econSommaOre(c,t.key))}</td>`).join("")}</tr>`;
      const costoRow = `<tr><td>Costo ora</td>${ECON_TIPI.map(t=>`<td class="${t.cls}">${econFmt(t.key==="dividere" ? costoDividere : costoOra)}</td>`).join("")}</tr>`;
      const totaleOre = `<tr class="total"><td>Totale ore CHF</td>${ECON_TIPI.map(t=>{
        const co = t.key==="dividere" ? costoDividere : costoOra;
        return `<td>${econFmt(econSommaOre(c,t.key)*co)}</td>`;
      }).join("")}</tr>`;
      const matRow = `<tr><td>Materiale CHF</td>${ECON_TIPI.map(t=>`<td class="${t.cls}">${econFmt(econSommaMat(c,t.key))}</td>`).join("")}</tr>`;
      const prevRow = `<tr><td>Preventivo tipologia CHF</td>${ECON_TIPI.map(t=>`<td class="${t.cls}">${econFmt(econPreventivo(c,t.key))}</td>`).join("")}</tr>`;
      const margineRow = `<tr><td>Margine CHF</td>${ECON_TIPI.map(t=>{
        const co = t.key==="dividere" ? costoDividere : costoOra;
        const spese = econSommaOre(c,t.key)*co + econSommaMat(c,t.key);
        return `<td class="${t.cls}">${econFmt(econPreventivo(c,t.key)-spese)}</td>`;
      }).join("")}</tr>`;
      table.innerHTML = header + oreRow + costoRow + totaleOre + matRow + prevRow + margineRow;
    }

    const detOre = document.getElementById("econDettaglioOre");
    if(detOre){
      detOre.innerHTML = `<tr><th>Data</th><th>Cantiere</th><th>Collaboratore</th><th>ID + Categoria</th><th>Lavorazione</th><th>Tipo economico</th><th>Ore</th></tr>` +
      economia.ore.filter(r=>r.cantiere===c).map(r=>{
        const tipo = ECON_TIPI.find(t=>t.key===r.tipo) || ECON_TIPI[ECON_TIPI.length-1];
        return `<tr><td>${r.data}</td><td>${r.cantiere}</td><td>${r.collaboratore}</td><td>${r.idCat||""}</td><td>${r.lavorazione||""}</td><td>${tipo.label}</td><td class="num">${econFmt(r.ore)}</td></tr>`;
      }).join("");
    }

    const detMat = document.getElementById("econDettaglioMat");
    if(detMat){
      detMat.innerHTML = `<tr><th>Data</th><th>Cantiere</th><th>Materiale</th><th>Tipo</th><th>Costo CHF</th></tr>` +
      economia.materiali.filter(r=>r.cantiere===c).map(r=>{
        const tipo = ECON_TIPI.find(t=>t.key===r.tipo) || ECON_TIPI[ECON_TIPI.length-1];
        return `<tr><td>${r.data}</td><td>${r.cantiere}</td><td>${r.descrizione}</td><td>${tipo.label}</td><td class="num">${econFmt(r.costo)}</td></tr>`;
      }).join("");
    }
    if(updateBudgetEditor) renderBudgetEditor();
    popolaFiltriAndamento();
    renderAndamentoCantiere();
    if(document.getElementById("linkedHoursPanel")) {
      popolaLinkedHoursFilters();
      renderLinkedHoursPanel();
    }
    econSave();
  }

  function esportaEconomiaCSV(){
    const c = econCantiereAttivo();
    ensurePreventivoCantiere(c);
    const costoOra = Number(document.getElementById("econCostoOra")?.value || 60);
    const costoDividere = Number(document.getElementById("econCostoDividere")?.value || 20);
    let rows = [["Cantiere",c],["Preventivo generale CHF", economia.preventiviGenerali?.[c] || 0],[],["Tipo","Ore","Costo ora","Totale ore CHF","Materiale CHF","Preventivo tipologia CHF","Margine CHF"]];
    ECON_TIPI.forEach(t=>{
      const co = t.key==="dividere" ? costoDividere : costoOra;
      const o = econSommaOre(c,t.key);
      const m = econSommaMat(c,t.key);
      const p = econPreventivo(c,t.key);
      rows.push([t.label,o,co,o*co,m,p,p-(o*co+m)]);
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "analisi_economica_" + c.replaceAll(" ","_") + ".csv"; a.click();
    URL.revokeObjectURL(url);
  }


  function openWorkerWindow(kind){
    const panel = document.getElementById("mobilePanel");
    const title = document.getElementById("sheetTitle");
    const subtitle = document.getElementById("sheetSubtitle");
    if(!panel) return;
    document.querySelectorAll(".sheet-content").forEach(x=>x.classList.add("hidden"));

    if(kind === "ore"){
      document.getElementById("sheetOre").classList.remove("hidden");
      title.textContent = "Inserisci ore";
      subtitle.textContent = "Campi in fila, pensati per iPhone e cantiere.";
      const mData = document.getElementById("mDataOre");
      if(mData){
        mData.value = today;
        mData.min = today;
        mData.max = today;
        mData.title = "Le ore si possono segnare solo oggi.";
      }
      document.getElementById("mCantiere").value = document.getElementById("operaioCantiereSelect")?.value || "Lugano Centro - attivo";
      document.getElementById("mCategoria").value = document.getElementById("categoriaSelect")?.value || "100";
      aggiornaLavorazioniMobile();
    }
    if(kind === "vacanze"){
      document.getElementById("sheetVacanze").classList.remove("hidden");
      title.textContent = "Vacanze / ore libere";
      subtitle.textContent = "Invia una richiesta all’admin.";
      document.getElementById("mVacDa").value = today;
      document.getElementById("mVacA").value = today;
    }
    if(kind === "calendario"){
      document.getElementById("sheetCalendario").classList.remove("hidden");
      title.textContent = "Riepilogo personale";
      subtitle.textContent = "Ore e richieste personali, senza dati economici.";
      buildCalendar("calendarMobileOperaio", false);
    }
    panel.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeWorkerWindow(event){
    if(event && event.target && event.target.id !== "mobilePanel") return;
    const panel = document.getElementById("mobilePanel");
    if(panel) panel.classList.remove("open");
    document.body.style.overflow = "";
  }

  function aggiornaLavorazioniMobile(){
    const id = document.getElementById("mCategoria").value;
    const select = document.getElementById("mLavorazione");
    if(!select) return;
    select.innerHTML = "";
    (lavorazioni[id] || []).forEach(v=>{
      const opt = document.createElement("option");
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  function syncMobileEconomicPreview(){
    const cSel = document.getElementById("mCantiere");
    const econSel = document.getElementById("econCantiere");
    if(!cSel || !econSel) return;
    const clean = cSel.value.replace(" - attivo","");
    [...econSel.options].forEach(o=>{
      if(clean.includes(o.value) || o.value.includes(clean)) econSel.value = o.value;
    });
  }

  function salvaOreMobileCollegate(){
    const data = document.getElementById("mDataOre")?.value || today;
    const cantiereText = document.getElementById("mCantiere")?.value || "Lugano Centro - attivo";
    const cantiere = cantiereText.replace(" - attivo","");
    const idCatText = document.getElementById("mCategoria")?.selectedOptions[0]?.textContent || "100 — Cartongesso";
    const lavorazione = document.getElementById("mLavorazione")?.value || "";
    const ore = Number(document.getElementById("mOre")?.value || 0);
    const da = "";
    const a = "";
    const pausa = "";
    const collaboratore = "Operaio demo";
    const tipo = tipoEconomicoDaIdCategoria(idCatText, lavorazione);
    if(!ore || ore <= 0){ alert("Inserisci le ore."); return; }
    if(!validaRegoleOrarieOperaio(data, ore, da, a, pausa, collaboratore)) return;

    // Sincronizza anche il form desktop, così la grafica resta coerente.
    const dData = document.getElementById("dataOre");
    const dCant = document.getElementById("operaioCantiereSelect");
    const dCat = document.getElementById("categoriaSelect");
    if(dData) dData.value = data;
    if(dCant) dCant.value = cantiereText;
    if(dCat) { dCat.value = document.getElementById("mCategoria").value; aggiornaLavorazioni(); }
    if(document.getElementById("oraDaDesktop")) document.getElementById("oraDaDesktop").value = da;
    if(document.getElementById("oraADesktop")) document.getElementById("oraADesktop").value = a;
    if(document.getElementById("pausaDesktop")) document.getElementById("pausaDesktop").value = pausa;
    if(document.getElementById("oreDesktop")) document.getElementById("oreDesktop").value = ore;

    economia.ore.push({data,cantiere,collaboratore,idCat:idCatText,lavorazione,tipo,ore,da,a,pausa,assegnatoDa:"Collaboratore / App"});
    updateWorkerTimesheetEntry(data, cantiere, ore, da, a, pausa, idCatText, lavorazione);
    econSave();
    const econSel = document.getElementById("econCantiere");
    if(econSel) econSel.value = cantiere;
    renderEconomia();
    renderRaccoltaOperai();
    closeWorkerWindow();
    alert("Ore salvate e collegate all’analisi economica del cantiere.");
  }



  let workerTimesheet = JSON.parse(localStorage.getItem("tecnoplafon_worker_timesheet_v2") || "null") || {
    workerName:"Stefano Pasini",
    monthLabel:"Juin 2026",
    plannedTotal:160,
    entries:{
      "1": {ore:8.5, da:"07:00", a:"16:30", pausa:"1.0", cantiere:"Lugano Centro", avs:"No", trasferta:"15.-"},
      "2": {ore:8.5, da:"07:00", a:"16:30", pausa:"1.0", cantiere:"Paradiso Residenza", avs:"No", trasferta:"20.-"},
      "3": {ore:8, da:"07:00", a:"16:00", pausa:"1.0", cantiere:"Centro vicino", avs:"Sì", trasferta:"15.-"},
      "29": {ore:0, da:"", a:"", pausa:"", cantiere:"", avs:"", trasferta:""},
      "30": {ore:0, da:"", a:"", pausa:"", cantiere:"", avs:"", trasferta:""}
    }
  };

  function saveWorkerTimesheet(){
    localStorage.setItem("tecnoplafon_worker_timesheet_v2", JSON.stringify(workerTimesheet));
  }

  function getCantiereRule(cantiere){
    const c = (adminData?.cantieri || []).find(x => x.nome.toLowerCase() === String(cantiere).toLowerCase());
    if(c){
      const r = calcolaRimborsoKm(c.km);
      return { km:c.km, avs:r.avs, trasferta:r.indennita, fascia:r.fascia };
    }
    return { km:0, avs:"Sì", trasferta:"15.-", fascia:"0–30 km" };
  }

  function calcolaOreDaOrari(da, a, pausa){
    if(!da || !a) return 0;
    const [dh, dm] = da.split(":").map(Number);
    const [ah, am] = a.split(":").map(Number);
    let start = dh * 60 + dm;
    let end = ah * 60 + am;
    let diff = (end - start) / 60 - (Number(pausa || 0));
    if(diff < 0) diff = 0;
    return Math.round(diff * 4) / 4;
  }

  function calcolaOreDesktop(){
    const da = document.getElementById("oraDaDesktop")?.value || "";
    const a = document.getElementById("oraADesktop")?.value || "";
    const pausa = document.getElementById("pausaDesktop")?.value || 0;
    const ore = calcolaOreDaOrari(da, a, pausa);
    const oreEl = document.getElementById("oreDesktop");
    if(oreEl) oreEl.value = ore || 0;
  }

  function calcolaOreMobile(){
    const da = document.getElementById("mOraDa")?.value || "";
    const a = document.getElementById("mOraA")?.value || "";
    const pausa = document.getElementById("mPausa")?.value || 0;
    const ore = calcolaOreDaOrari(da, a, pausa);
    const oreEl = document.getElementById("mOre");
    if(oreEl) oreEl.value = ore || 0;
  }

  function renderWorkerTimesheet(){
    const el = document.getElementById("operaioTimesheetTable");
    if(!el) return;
    document.getElementById("operaioNomeScheda").textContent = workerTimesheet.workerName;
    document.getElementById("operaioMeseScheda").textContent = workerTimesheet.monthLabel;

    const days = Array.from({length:30}, (_,i)=>i+1);
    const header = `<thead><tr><th class="left"></th>${days.map(d=>`<th>${d}</th>`).join("")}<th class="sumhead">Total</th><th class="sumhead">Prévues</th><th class="sumhead">Différence</th></tr></thead>`;

    const row = (label, getter, rowClass="")=>{
      const vals = days.map(d => getter(workerTimesheet.entries[String(d)] || {}, d));
      let total = "";
      let prev = "";
      let diff = "";
      if(label === "HEURES"){
        const sum = vals.reduce((s,v)=>s + (Number(v)||0), 0);
        total = sum.toFixed(2);
        prev = workerTimesheet.plannedTotal.toFixed(2);
        diff = (sum - workerTimesheet.plannedTotal).toFixed(2);
      } else if(label === "AVS"){
        const si = vals.filter(v=>v==="Sì").length;
        const no = vals.filter(v=>v==="No").length;
        total = `Sì ${si}`;
        prev = `No ${no}`;
        diff = "";
      } else if(label === "TRASFERTA"){
        const totalFr = vals.reduce((s,v)=>{
          const n = parseFloat(String(v).replace(/[^\d.]/g,'')) || 0;
          return s+n;
        },0);
        total = `CHF ${totalFr.toFixed(2)}`;
      }
      return `<tr class="${rowClass}"><td class="left">${label}</td>${vals.map(v=>`<td>${v ?? ""}</td>`).join("")}<td>${total}</td><td>${prev}</td><td>${diff}</td></tr>`;
    };

    el.innerHTML = header + `<tbody>` +
      row("HEURES", e => e.ore || "", "soft-green") +
      row("DALLE", e => e.da || "", "soft-gray") +
      row("ALLE", e => e.a || "", "soft-gray") +
      row("PAUSA", e => e.pausa || "", "soft-gray") +
      row("CANTIERE", e => e.cantiere ? e.cantiere.split(" ").slice(0,2).join(" ") : "", "soft-blue") +
      row("TIPOLOGIA", e => (ECON_TIPI.find(t=>t.key===e.tipo)?.label) || e.tipo || "", "soft-green") +
      row("AVS", e => e.avs || "", "soft-red") +
      row("TRASFERTA", e => e.trasferta || "", "soft-blue") +
      `</tbody>`;

    const allEntries = Object.values(workerTimesheet.entries);
    const totOre = allEntries.reduce((s,e)=>s+(Number(e.ore)||0),0);
    const avsSi = allEntries.filter(e=>e.avs==="Sì").length;
    const avsNo = allEntries.filter(e=>e.avs==="No").length;
    const totTr = allEntries.reduce((s,e)=>s + (parseFloat(String(e.trasferta||"").replace(/[^\d.]/g,'')) || 0), 0);

    document.getElementById("tsTotOre").textContent = totOre.toFixed(2);
    document.getElementById("tsAvsSi").textContent = avsSi;
    document.getElementById("tsAvsNo").textContent = avsNo;
    document.getElementById("tsTrasferte").textContent = "CHF " + totTr.toFixed(2);
    saveWorkerTimesheet();
  }

  function updateWorkerTimesheetEntry(data, cantiere, ore, da, a, pausa, idCat, lavorazione, oldData, tipo, stato){
    const day = String(Number(String(data).split("-").pop() || 1));
    const oldDay = oldData ? String(Number(String(oldData).split("-").pop() || 1)) : "";
    if(oldDay && oldDay !== day && workerTimesheet.entries && workerTimesheet.entries[oldDay]){
      delete workerTimesheet.entries[oldDay];
    }
    const reg = getCantiereRule(cantiere);
    workerTimesheet.entries[day] = {
      ...(workerTimesheet.entries[day] || {}),
      ore: Number(ore || 0),
      da: da || "",
      a: a || "",
      pausa: String(pausa || ""),
      cantiere,
      idCat: idCat || workerTimesheet.entries[day]?.idCat || "100 — Cartongesso",
      lavorazione: lavorazione || workerTimesheet.entries[day]?.lavorazione || "",
      tipo: tipo || workerTimesheet.entries[day]?.tipo || tipoEconomicoDaIdCategoria(idCat || workerTimesheet.entries[day]?.idCat || "100 — Cartongesso", lavorazione || workerTimesheet.entries[day]?.lavorazione || ""),
      stato: stato || workerTimesheet.entries[day]?.stato || "Approvato",
      avs: reg.avs,
      trasferta: reg.trasferta
    };
    saveWorkerTimesheet();
    renderWorkerTimesheet();
  }


  let adminViewState = {
    cantieri: "Attivo",
    operai: "Attivo"
  };

  function setAdminView(type, value){
    adminViewState[type] = value;
    renderAdminData();
  }

  function syncAdminViewButtons(){
    const map = [
      ["btnCantieriAttivi", adminViewState.cantieri === "Attivo"],
      ["btnCantieriTerminati", adminViewState.cantieri === "Terminato"],
      ["btnOperaiAttivi", adminViewState.operai === "Attivo"],
      ["btnOperaiTerminati", adminViewState.operai === "Terminato"],
    ];
    map.forEach(([id, active])=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle("active", active);
    });
  }

  let adminData = JSON.parse(localStorage.getItem("tecnoplafon_admin_cantieri_operai_v1") || "null") || {
    cantieri:[
      {nome:"Lugano Centro", cliente:"New Line", indirizzo:"", km:12, orePreviste:240, oreReali:118, stato:"Attivo"},
      {nome:"Paradiso Residenza", cliente:"Privato", indirizzo:"", km:35, orePreviste:160, oreReali:92, stato:"Attivo"},
      {nome:"Viganello Appartamenti", cliente:"Impresa", indirizzo:"", km:62, orePreviste:310, oreReali:289, stato:"Sospeso"}
    ],
    operai:[
      {nome:"Mario Rossi", email:"mario@tecnoplafon.ch", ruolo:"Operaio", stato:"Attivo", maxOre:10, password:""},
      {nome:"Luca Bianchi", email:"luca@tecnoplafon.ch", ruolo:"Caposquadra", stato:"Attivo", maxOre:11, password:""},
      {nome:"Gianni Verdi", email:"gianni@tecnoplafon.ch", ruolo:"Operaio", stato:"Attivo", maxOre:10, password:""},
      {nome:"Paolo Grigio", email:"paolo@tecnoplafon.ch", ruolo:"Operaio", stato:"Terminato", maxOre:0, password:""}
    ]
  };

  function adminSave(){
    localStorage.setItem("tecnoplafon_admin_cantieri_operai_v1", JSON.stringify(adminData));
  }

  function calcolaRimborsoKm(km){
    km = Number(km) || 0;
    let fascia = "0–30 km", indennita = "15.-", card = 1;
    if(km >= 31 && km <= 40){ fascia = "31–40 km"; indennita = "20.-"; card = 2; }
    else if(km >= 41 && km <= 60){ fascia = "41–60 km"; indennita = "27.-"; card = 3; }
    else if(km > 60){ fascia = "oltre 60 km"; indennita = "37.-"; card = 4; }
    const avs = km <= 10 ? "Sì" : "No";
    return {fascia, indennita, avs, card};
  }

  function previewRegolaKm(){
    const km = Number(document.getElementById("adminKmCantiere")?.value || 0);
    const r = calcolaRimborsoKm(km);
    ["kmCard1","kmCard2","kmCard3","kmCard4"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.classList.remove("active");
    });
    const active = document.getElementById("kmCard" + r.card);
    if(active) active.classList.add("active");
    const ind = document.getElementById("adminIndennitaCantiere");
    const avs = document.getElementById("adminAvsCantiere");
    const reg = document.getElementById("adminRegolaCantiere");
    if(ind) ind.value = r.indennita;
    if(avs) avs.value = r.avs;
    if(reg) reg.value = r.fascia;
  }

  function aggiungiCantiereAdmin(){
    const nome = document.getElementById("adminNomeCantiere")?.value.trim();
    if(!nome){ alert("Inserisci il nome del cantiere."); return; }
    const c = {
      nome,
      cliente: document.getElementById("adminClienteCantiere")?.value.trim() || "",
      indirizzo: document.getElementById("adminIndirizzoCantiere")?.value.trim() || "",
      km: Number(document.getElementById("adminKmCantiere")?.value || 0),
      orePreviste:0,
      oreReali:0,
      stato: document.getElementById("adminStatoCantiere")?.value || "Attivo"
    };
    const existing = adminData.cantieri.findIndex(x=>x.nome.toLowerCase()===nome.toLowerCase());
    if(existing >= 0) adminData.cantieri[existing] = c;
    else adminData.cantieri.push(c);
    adminSave(); renderAdminData(); renderWorkerTimesheet();
    document.getElementById("adminNomeCantiere").value = "";
    alert("Cantiere salvato con regole km.");
  }

  function aggiungiCantiereDaSezione(){
    const nome = document.getElementById("cantNome")?.value.trim();
    if(!nome){ alert("Inserisci il nome del cantiere."); return; }
    const c = {
      nome,
      cliente: document.getElementById("cantCliente")?.value.trim() || "",
      indirizzo: document.getElementById("cantIndirizzo")?.value.trim() || "",
      km: Number(document.getElementById("cantKm")?.value || 0),
      orePreviste:Number(document.getElementById("cantOrePreviste")?.value || 0),
      oreReali:0,
      stato: document.getElementById("cantStato")?.value || "Attivo"
    };
    const existing = adminData.cantieri.findIndex(x=>x.nome.toLowerCase()===nome.toLowerCase());
    if(existing >= 0) adminData.cantieri[existing] = c;
    else adminData.cantieri.push(c);
    adminSave(); renderAdminData(); renderWorkerTimesheet();
    document.getElementById("cantNome").value = "";
    alert("Cantiere salvato.");
  }

  function aggiungiOperaioAdmin(){
    const nome = document.getElementById("adminNomeOperaio")?.value.trim();
    if(!nome){ alert("Inserisci il nome dell’operaio."); return; }
    const o = {
      nome,
      email: document.getElementById("adminEmailOperaio")?.value.trim() || "",
      ruolo: document.getElementById("adminRuoloOperaio")?.value || "Operaio",
      stato: document.getElementById("adminStatoOperaio")?.value || "Attivo",
      password: document.getElementById("adminPasswordOperaio")?.value || "",
      maxOre: Number(document.getElementById("adminMaxOreOperaio")?.value || 10)
    };
    const existing = adminData.operai.findIndex(x=>x.nome.toLowerCase()===nome.toLowerCase());
    if(existing >= 0) adminData.operai[existing] = o;
    else adminData.operai.push(o);
    adminSave(); renderAdminData();
    document.getElementById("adminNomeOperaio").value = "";
    alert("Operaio salvato.");
  }

  function aggiungiOperaioDaSezione(){
    const nome = document.getElementById("collNome")?.value.trim();
    if(!nome){ alert("Inserisci il nome del collaboratore."); return; }
    const o = {
      nome,
      email: document.getElementById("collEmail")?.value.trim() || "",
      ruolo: document.getElementById("collRuolo")?.value || "Operaio",
      stato: document.getElementById("collStato")?.value || "Attivo",
      password: document.getElementById("collPassword")?.value || "",
      maxOre: Number(document.getElementById("collMaxOre")?.value || 10)
    };
    const existing = adminData.operai.findIndex(x=>x.nome.toLowerCase()===nome.toLowerCase());
    if(existing >= 0) adminData.operai[existing] = o;
    else adminData.operai.push(o);
    adminSave(); renderAdminData();
    document.getElementById("collNome").value = "";
    alert("Collaboratore salvato.");
  }

  function cambiaStatoOperaio(nome, stato){
    const o = adminData.operai.find(x=>x.nome===nome);
    if(o){ o.stato = stato; if(stato==="Terminato") o.maxOre = 0; adminSave(); renderAdminData(); }
  }

  function cambiaStatoCantiere(nome, stato){
    const c = adminData.cantieri.find(x=>x.nome===nome);
    if(c){ c.stato = stato; adminSave(); renderAdminData(); renderWorkerTimesheet(); }
  }

  let adminPresenceFilter = "tutti";

  function setAdminPresenceFilter(value){
    adminPresenceFilter = value || "tutti";
    renderAdminPresenzeOggi();
  }

  function getRowsOreOggiPerCollaboratore(nome){
    const oggiIso = new Date().toISOString().slice(0,10);
    return (economia.ore || []).filter(r =>
      normalizzaDataRaccolta(r.data) === oggiIso &&
      String(r.collaboratore || "").trim() === String(nome || "").trim()
    );
  }

  function renderAdminPresenzeOggi(){
    const body = document.getElementById("adminPresenzeBody");
    if(!body || !adminData || !adminData.operai) return;
    const operaiAttivi = adminData.operai.filter(o => o.stato === "Attivo");
    const oggiIso = localTodayIso();
    const orePrevisteOggi = oreGiornoPrevisteAdmin(oggiIso);
    const presenze = operaiAttivi.map(o => {
      const rows = getRowsOreOggiPerCollaboratore(o.nome);
      const ore = rows.reduce((s,r)=>s+Number(r.ore || 0), 0);
      const last = rows.slice().sort((a,b)=>String(b.a || b.da || "").localeCompare(String(a.a || a.da || "")))[0];
      const blocco = vacanzaORegolaBloccante(oggiIso, o.nome);
      const previste = blocco ? 0 : orePrevisteOggi;
      const mancanti = Math.max(0, previste - ore);
      return {
        nome:o.nome,
        segnate: !blocco && previste > 0 && mancanti <= 0.001,
        bloccato: !!blocco,
        blocco,
        previste,
        mancanti,
        ore,
        ultimo: last ? (last.a || last.da || "segnato") : "-"
      };
    });
    const segnate = presenze.filter(p=>p.segnate);
    const daSegnare = presenze.filter(p=>!p.segnate && !p.bloccato && p.previste > 0);
    const setText = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
    setText("countPresenzeTutti", presenze.length);
    setText("countPresenzeSegnate", segnate.length);
    setText("countPresenzeDaSegnare", daSegnare.length);
    [["btnPresenzeTutti","tutti"],["btnPresenzeSegnate","segnate"],["btnPresenzeDaSegnare","daSegnare"]].forEach(([id,val])=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle("active", adminPresenceFilter === val);
    });
    let visible = presenze;
    if(adminPresenceFilter === "segnate") visible = segnate;
    if(adminPresenceFilter === "daSegnare") visible = daSegnare;
    body.innerHTML = visible.map(p => {
      if(p.bloccato){
        return `<tr><td><span class="badge wait"><i class="status-dot dot-red"></i> Bloccato</span></td><td>${p.nome}</td><td>${econFmt(p.ore)} / 0</td><td>${p.ultimo}</td><td>${p.blocco?.tipo || "Giorno bloccato"}${p.blocco?.note ? " - " + p.blocco.note : ""}</td></tr>`;
      }
      if(p.segnate){
        return `<tr><td><span class="badge ok"><i class="status-dot dot-green"></i> Verde</span></td><td>${p.nome}</td><td>${econFmt(p.ore)} / ${econFmt(p.previste)}</td><td>${p.ultimo}</td><td>Ore oggi complete secondo regole admin</td></tr>`;
      }
      return `<tr><td><span class="badge bad"><i class="status-dot dot-red"></i> Rosso</span></td><td>${p.nome}</td><td>${econFmt(p.ore)} / ${econFmt(p.previste)}</td><td>${p.ultimo}</td><td>Da segnare: ${econFmt(p.mancanti)} h</td></tr>`;
    }).join("") || `<tr><td colspan="5">Nessun collaboratore attivo trovato.</td></tr>`;
  }

  function renderAdminData(){
    previewRegolaKm();

    const activeCount = adminData.cantieri.filter(c=>c.stato==="Attivo").length;
    const terminatedCantieriCount = adminData.cantieri.filter(c=>c.stato==="Terminato").length;
    const activeOperaiCount = adminData.operai.filter(o=>o.stato==="Attivo").length;
    const terminatedOperaiCount = adminData.operai.filter(o=>o.stato==="Terminato").length;

    const cnt = document.getElementById("adminCantieriAttivi");
    if(cnt) cnt.textContent = activeCount;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if(el) el.textContent = val;
    };
    setTxt("countCantieriAttivi", activeCount);
    setTxt("countCantieriTerminati", terminatedCantieriCount);
    setTxt("countOperaiAttivi", activeOperaiCount);
    setTxt("countOperaiTerminati", terminatedOperaiCount);
    syncAdminViewButtons();

    const cantieriVisibili = adminData.cantieri.filter(c => c.stato === adminViewState.cantieri);
    const cantRows = cantieriVisibili.map(c=>{
      const r = calcolaRimborsoKm(c.km);
      return `<tr>
        <td>${c.nome}</td><td>${c.cliente||""}</td><td>${c.km}</td><td>${r.indennita}</td>
        <td><span class="badge ${r.avs==="Sì"?"ok":"bad"}">${r.avs}</span></td>
        <td><span class="badge ${c.stato==="Attivo"?"ok":c.stato==="Terminato"?"bad":"wait"}">${c.stato}</span></td>
        <td><div class="admin-actions">
          <button class="tiny-btn green" onclick="cambiaStatoCantiere('${c.nome.replaceAll("'","\\'")}','Attivo')">Attiva</button>
          <button class="tiny-btn" onclick="cambiaStatoCantiere('${c.nome.replaceAll("'","\\'")}','Sospeso')">Sospendi</button>
          <button class="tiny-btn red" onclick="cambiaStatoCantiere('${c.nome.replaceAll("'","\\'")}','Terminato')">Termina</button>
        </div></td>
      </tr>`;
    }).join("");
    const adminCantieriBody = document.getElementById("adminCantieriBody");
    if(adminCantieriBody) adminCantieriBody.innerHTML = cantRows;

    const cantGestioneBody = document.getElementById("cantieriGestioneBody");
    if(cantGestioneBody){
      cantGestioneBody.innerHTML = adminData.cantieri.map(c=>{
        const r = calcolaRimborsoKm(c.km);
        return `<tr><td>${c.nome}</td><td>${c.cliente||""}</td><td>${c.km}</td><td>${r.indennita}</td><td>${r.avs}</td><td><span class="badge ${c.stato==="Attivo"?"ok":c.stato==="Terminato"?"bad":"wait"}">${c.stato}</span></td><td>${c.orePreviste||0}</td><td>${c.oreReali||0}</td></tr>`;
      }).join("");
    }

    const operaiVisibiliAdmin = adminData.operai.filter(o => o.stato === adminViewState.operai);
    const adminOperaiRows = operaiVisibiliAdmin.map(o=>`
      <tr>
        <td>${o.nome}</td><td>${o.email||""}</td><td>${o.ruolo}</td>
        <td><span class="badge ${o.stato==="Attivo"?"ok":"bad"}">${o.stato}</span></td>
        <td>${o.maxOre}</td><td><button class="tiny-btn">Modifica</button></td>
        <td><div class="admin-actions">
          <button class="tiny-btn green" onclick="cambiaStatoOperaio('${o.nome.replaceAll("'","\\'")}','Attivo')">Attiva</button>
          <button class="tiny-btn red" onclick="cambiaStatoOperaio('${o.nome.replaceAll("'","\\'")}','Terminato')">Termina</button>
        </div></td>
      </tr>
    `).join("");

    const collaboratoriRows = adminData.operai.map(o=>`
      <tr>
        <td>${o.nome}</td><td>${o.email||""}</td><td>${o.ruolo}</td>
        <td><span class="badge ${o.stato==="Attivo"?"ok":"bad"}">${o.stato}</span></td>
        <td>${o.maxOre}</td><td><button class="tiny-btn">Modifica</button></td>
        <td><div class="admin-actions">
          <button class="tiny-btn green" onclick="cambiaStatoOperaio('${o.nome.replaceAll("'","\\'")}','Attivo')">Attiva</button>
          <button class="tiny-btn red" onclick="cambiaStatoOperaio('${o.nome.replaceAll("'","\\'")}','Terminato')">Termina</button>
        </div></td>
      </tr>
    `).join("");

    const adminOperaiBody = document.getElementById("adminOperaiBody");
    if(adminOperaiBody) adminOperaiBody.innerHTML = adminOperaiRows;

    const collaboratoriBody = document.getElementById("collaboratoriBody");
    if(collaboratoriBody) collaboratoriBody.innerHTML = collaboratoriRows;
    renderAdminPresenzeOggi();
    popolaRaccoltaOperaiSelect();
  }


  function toggleCollapse(id){
    const el = document.getElementById(id);
    if(el) el.classList.toggle("open");
  }

  function getSelectedValues(id){
    const el = document.getElementById(id);
    if(!el) return [];
    return [...el.selectedOptions].map(o=>o.value);
  }

  function popolaFiltriAndamento(){
    const cBox = document.getElementById("trendCantieriBox");
    const tBox = document.getElementById("trendTipologieBox");
    const collBox = document.getElementById("trendCollaboratoriBox");
    if(!cBox || !tBox || !collBox || typeof economia === "undefined") return;

    const oldC = getCustomMultiValues("trendCantieriBox");
    const oldT = getCustomMultiValues("trendTipologieBox");
    const oldColl = getCustomMultiValues("trendCollaboratoriBox");

    const cantieri = Array.from(new Set((economia.ore || []).map(r=>r.cantiere).filter(Boolean))).sort()
      .map(c=>({value:c,label:c}));
    const tipologie = ECON_TIPI.map(t=>({value:t.key,label:t.label}));
    const collaboratori = Array.from(new Set((economia.ore || []).map(r=>r.collaboratore).filter(Boolean))).sort()
      .map(c=>({value:c,label:c}));

    renderCustomMulti("trendCantieriBox", cantieri, oldC, "renderAndamentoCantiere");
    renderCustomMulti("trendTipologieBox", tipologie, oldT, "renderAndamentoCantiere");
    renderCustomMulti("trendCollaboratoriBox", collaboratori, oldColl, "renderAndamentoCantiere");
  }

  function getCostoOraTrend(tipo){
    const costoOra = Number(document.getElementById("econCostoOra")?.value || 60);
    const costoDividere = Number(document.getElementById("econCostoDividere")?.value || 20);
    return tipo === "dividere" ? costoDividere : costoOra;
  }

  function righeTrendFiltrate(){
    const cs = getCustomMultiValues("trendCantieriBox");
    const ts = getCustomMultiValues("trendTipologieBox");
    const cols = getCustomMultiValues("trendCollaboratoriBox");
    return (economia.ore || []).filter(r =>
      (cs.length === 0 || cs.includes(r.cantiere)) &&
      (ts.length === 0 || ts.includes(r.tipo)) &&
      (cols.length === 0 || cols.includes(r.collaboratore))
    );
  }

  function renderAndamentoCantiere(){
    const barBox = document.getElementById("trendBarTipologie");
    if(!barBox || typeof economia === "undefined") return;

    const rows = righeTrendFiltrate();
    const totOre = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const costo = rows.reduce((s,r)=>s+Number(r.ore||0)*getCostoOraTrend(r.tipo),0);
    const collaboratori = new Set(rows.map(r=>r.collaboratore).filter(Boolean));
    const cantieri = new Set(rows.map(r=>r.cantiere).filter(Boolean));

    const setText = (id, txt) => { const el=document.getElementById(id); if(el) el.textContent=txt; };
    setText("trendTotOre", econFmt(totOre));
    setText("trendCosto", "CHF " + econFmt(costo));
    setText("trendCollaboratoriTot", collaboratori.size);
    setText("trendCantieriTot", cantieri.size);

    const byTipo = {};
    rows.forEach(r=>{ byTipo[r.tipo] = (byTipo[r.tipo] || 0) + Number(r.ore||0); });
    const maxTipo = Math.max(1, ...Object.values(byTipo));
    barBox.innerHTML = ECON_TIPI.map(t=>{
      const val = byTipo[t.key] || 0;
      const pct = Math.round((val / maxTipo) * 100);
      return `<div class="bar-row">
        <b>${t.label}</b>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span>${econFmt(val)} h</span>
      </div>`;
    }).join("");

    const byCantiere = {};
    rows.forEach(r=>{
      if(!byCantiere[r.cantiere]) byCantiere[r.cantiere] = {ore:0, costo:0, collaboratori:new Set()};
      byCantiere[r.cantiere].ore += Number(r.ore||0);
      byCantiere[r.cantiere].costo += Number(r.ore||0)*getCostoOraTrend(r.tipo);
      if(r.collaboratore) byCantiere[r.cantiere].collaboratori.add(r.collaboratore);
    });

    const table = document.getElementById("trendCollaboratoriCantiere");
    if(table){
      const body = Object.entries(byCantiere).map(([c,v])=>`
        <tr>
          <td>${c}</td>
          <td class="num">${v.collaboratori.size}</td>
          <td>${[...v.collaboratori].join(", ")}</td>
          <td class="num">${econFmt(v.ore)}</td>
          <td class="num">CHF ${econFmt(v.costo)}</td>
        </tr>
      `).join("");
      table.innerHTML = `<thead><tr><th>Cantiere</th><th class="num">Totale collaboratori</th><th>Nomi collaboratori</th><th class="num">Ore</th><th class="num">Costo</th></tr></thead><tbody>${body}</tbody>`;
    }

    const det = document.getElementById("trendDettaglio");
    if(det){
      det.innerHTML = `<thead><tr><th>Data</th><th>Cantiere</th><th>Collaboratore</th><th>Tipologia</th><th>Lavorazione</th><th class="num">Ore</th><th class="num">Costo</th></tr></thead><tbody>` +
      rows.map(r=>{
        const t = ECON_TIPI.find(x=>x.key===r.tipo);
        const costoR = Number(r.ore||0)*getCostoOraTrend(r.tipo);
        return `<tr><td>${r.data||""}</td><td>${r.cantiere||""}</td><td>${r.collaboratore||""}</td><td>${t?t.label:r.tipo}</td><td>${r.lavorazione||""}</td><td class="num">${econFmt(r.ore)}</td><td class="num">CHF ${econFmt(costoR)}</td></tr>`;
      }).join("") + `</tbody>`;
    }
  }


  function openLinkedHoursPanel(){
    const p = document.getElementById("linkedHoursPanel");
    if(p){
      p.classList.add("open");
      document.body.style.overflow = "hidden";
      popolaLinkedHoursFilters();
      renderLinkedHoursPanel();
    }
  }

  function closeLinkedHoursPanel(event){
    if(event && event.target && event.target.id !== "linkedHoursPanel") return;
    const p = document.getElementById("linkedHoursPanel");
    if(p) p.classList.remove("open");
    document.body.style.overflow = "";
  }

  function popolaLinkedHoursFilters(){
    if(!document.getElementById("linkedOreCantieriBox") || typeof economia === "undefined") return;

    const oldC = getCustomMultiValues("linkedOreCantieriBox");
    const oldColl = getCustomMultiValues("linkedOreCollaboratoriBox");
    const oldT = getCustomMultiValues("linkedOreTipologieBox");

    const cantieri = Array.from(new Set((economia.ore || []).map(r=>r.cantiere).filter(Boolean))).sort()
      .map(c=>({value:c,label:c}));
    const collaboratori = Array.from(new Set((economia.ore || []).map(r=>r.collaboratore).filter(Boolean))).sort()
      .map(c=>({value:c,label:c}));
    const tipologie = ECON_TIPI.map(t=>({value:t.key,label:t.label}));

    renderCustomMulti("linkedOreCantieriBox", cantieri, oldC, "renderLinkedHoursPanel");
    renderCustomMulti("linkedOreCollaboratoriBox", collaboratori, oldColl, "renderLinkedHoursPanel");
    renderCustomMulti("linkedOreTipologieBox", tipologie, oldT, "renderLinkedHoursPanel");
  }

  function linkedHoursRows(){
    const cs = getCustomMultiValues("linkedOreCantieriBox");
    const cols = getCustomMultiValues("linkedOreCollaboratoriBox");
    const ts = getCustomMultiValues("linkedOreTipologieBox");
    const sort = document.getElementById("linkedOreSort")?.value || "cantiere";
    const rows = (economia.ore || []).filter(r =>
      (cs.length === 0 || cs.includes(r.cantiere)) &&
      (cols.length === 0 || cols.includes(r.collaboratore)) &&
      (ts.length === 0 || ts.includes(r.tipo))
    );
    rows.sort((a,b)=>String(a[sort]||"").localeCompare(String(b[sort]||""), "it"));
    return rows;
  }

  function renderLinkedHoursPanel(){
    const rows = linkedHoursRows();
    const totOre = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const costo = rows.reduce((s,r)=>s+Number(r.ore||0)*getCostoOraTrend(r.tipo),0);
    const collSet = new Set(rows.map(r=>r.collaboratore).filter(Boolean));
    const cantSet = new Set(rows.map(r=>r.cantiere).filter(Boolean));

    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    set("linkedOreTotali", econFmt(totOre));
    set("linkedOreCosto", "CHF " + econFmt(costo));
    set("linkedOreNumColl", collSet.size);
    set("linkedOreNumCant", cantSet.size);

    const perColl = {};
    rows.forEach(r=>{
      if(!perColl[r.collaboratore]) perColl[r.collaboratore] = {ore:0,costo:0,cantieri:new Set(),tipologie:new Set()};
      perColl[r.collaboratore].ore += Number(r.ore||0);
      perColl[r.collaboratore].costo += Number(r.ore||0)*getCostoOraTrend(r.tipo);
      perColl[r.collaboratore].cantieri.add(r.cantiere);
      const t = ECON_TIPI.find(x=>x.key===r.tipo);
      perColl[r.collaboratore].tipologie.add(t?t.label:r.tipo);
    });

    const perCollTable = document.getElementById("linkedOrePerCollaboratore");
    if(perCollTable){
      perCollTable.innerHTML = `<thead><tr><th>Collaboratore</th><th class="num">Ore</th><th class="num">Costo</th><th>Cantieri</th><th>Tipologie</th></tr></thead><tbody>` +
      Object.entries(perColl).map(([name,v])=>`<tr>
        <td>${name}</td>
        <td class="num">${econFmt(v.ore)}</td>
        <td class="num">CHF ${econFmt(v.costo)}</td>
        <td>${[...v.cantieri].join(", ")}</td>
        <td>${[...v.tipologie].join(", ")}</td>
      </tr>`).join("") + `</tbody>`;
    }

    const det = document.getElementById("econDettaglioOre");
    if(det){
      det.innerHTML = `<thead><tr><th>Data</th><th>Cantiere</th><th>Collaboratore</th><th>ID + Categoria</th><th>Tipologia</th><th>Lavorazione</th><th class="num">Ore</th><th class="num">Costo</th></tr></thead><tbody>` +
      rows.map(r=>{
        const t = ECON_TIPI.find(x=>x.key===r.tipo);
        const costoR = Number(r.ore||0)*getCostoOraTrend(r.tipo);
        return `<tr>
          <td>${r.data||""}</td>
          <td>${r.cantiere||""}</td>
          <td>${r.collaboratore||""}</td>
          <td>${r.idCat||""}</td>
          <td>${t?t.label:r.tipo}</td>
          <td>${r.lavorazione||""}</td>
          <td class="num">${econFmt(r.ore)}</td>
          <td class="num">CHF ${econFmt(costoR)}</td>
        </tr>`;
      }).join("") + `</tbody>`;
    }
  }


  function findAndScrollOption(selectId, inputId){
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if(!select || !input) return;
    const query = String(input.value || "").trim().toLowerCase();
    if(!query){
      alert("Scrivi prima cosa vuoi trovare.");
      input.focus();
      return;
    }

    // Reset previous highlight
    [...select.options].forEach(opt => opt.classList.remove("option-found-hint"));

    const match = [...select.options].find(opt =>
      opt.textContent.toLowerCase().includes(query)
    );

    if(!match){
      alert("Nessuna voce trovata.");
      return;
    }

    match.selected = true;
    match.classList.add("option-found-hint");

    // Scroll selected option into view
    const idx = [...select.options].indexOf(match);
    const optionHeight = 24;
    select.scrollTop = Math.max(0, idx * optionHeight - 30);

    // Trigger related rendering if needed
    if(select.onchange) select.onchange();
    select.focus();
  }


  function renderCustomMulti(boxId, items, selectedValues, onChangeName){
    const box = document.getElementById(boxId);
    if(!box) return;
    const selected = new Set(selectedValues && selectedValues.length ? selectedValues : items.map(x=>x.value));
    box.innerHTML = items.map(item => {
      const checked = selected.has(item.value) ? "checked" : "";
      return `<label data-text="${String(item.label).toLowerCase()}">
        <input type="checkbox" value="${item.value}" ${checked} onchange="${onChangeName}()">
        <span>${item.label}</span>
      </label>`;
    }).join("");
  }

  function getCustomMultiValues(boxId){
    const box = document.getElementById(boxId);
    if(!box) return [];
    return [...box.querySelectorAll('input[type="checkbox"]:checked')].map(i=>i.value);
  }

  function setCustomMultiAll(boxId, checked){
    const box = document.getElementById(boxId);
    if(!box) return;
    box.querySelectorAll('input[type="checkbox"]').forEach(i=>i.checked = checked);
  }

  function filterCustomMulti(boxId, inputId){
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    if(!box || !input) return;
    const q = String(input.value || "").trim().toLowerCase();
    let first = null;
    box.querySelectorAll("label").forEach(label=>{
      const ok = !q || label.dataset.text.includes(q);
      label.style.display = ok ? "flex" : "none";
      if(ok && !first) first = label;
    });
    if(first) first.scrollIntoView({block:"nearest"});
    if(q && !first) alert("Nessuna voce trovata.");
  }


  function normalizzaDataRaccolta(data){
    const s = String(data || "").trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s;
  }

  function meseDaInputRaccolta(){
    return document.getElementById("raccoltaMese")?.value || new Date().toISOString().slice(0,7);
  }

  function raccoltaRowsMese(){
    const mese = meseDaInputRaccolta();
    return (economia.ore || []).map(r=>{
      const dataIso = normalizzaDataRaccolta(r.data);
      const reg = getCantiereRule(r.cantiere);
      const tipoObj = ECON_TIPI.find(t=>t.key===r.tipo);
      return {...r, dataIso, tipoLabel: tipoObj ? tipoObj.label : (r.tipo || ""), avs: reg.avs, trasferta: reg.trasferta, fasciaTrasferta: reg.fascia || ""};
    }).filter(r => !mese || String(r.dataIso).slice(0,7) === mese);
  }

  function popolaRaccoltaOperaiSelect(){
    const sel = document.getElementById("raccoltaOperaioSelect");
    if(!sel) return;
    const old = sel.value;
    const names = Array.from(new Set([
      ...(adminData?.operai || []).map(o=>o.nome),
      ...(economia.ore || []).map(r=>r.collaboratore)
    ].filter(Boolean))).sort((a,b)=>a.localeCompare(b,"it"));
    sel.innerHTML = `<option value="__ALL__">Tutti i collaboratori</option>` + names.map(n=>`<option value="${n}">${n}</option>`).join("");
    if([...sel.options].some(o=>o.value===old)) sel.value = old;
  }


  function popolaSelectRaccolta(id, allLabel, values){
    const sel = document.getElementById(id);
    if(!sel) return;
    const old = sel.value || "__ALL__";
    const opts = Array.from(new Set((values || []).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),"it"));
    sel.innerHTML = `<option value="__ALL__">${allLabel}</option>` + opts.map(v=>`<option value="${escapeHtmlOre(v)}">${escapeHtmlOre(v)}</option>`).join("");
    if([...sel.options].some(o=>o.value === old)) sel.value = old;
    else sel.value = "__ALL__";
  }

  function popolaRaccoltaFiltri(){
    const base = raccoltaRowsMese();
    const coll = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const baseColl = base.filter(r => coll === "__ALL__" || r.collaboratore === coll);
    popolaSelectRaccolta("raccoltaCantiereSelect", "Tutti i cantieri", baseColl.map(r=>r.cantiere || "Senza cantiere"));
    const cantiere = document.getElementById("raccoltaCantiereSelect")?.value || "__ALL__";
    const baseCant = baseColl.filter(r => cantiere === "__ALL__" || (r.cantiere || "Senza cantiere") === cantiere);
    popolaSelectRaccolta("raccoltaLavorazioneSelect", "Tutte le lavorazioni", baseCant.map(r=>r.lavorazione || "Senza lavorazione"));
  }

  function righeRaccoltaFiltrate(){
    const coll = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const cantiere = document.getElementById("raccoltaCantiereSelect")?.value || "__ALL__";
    const lavorazione = document.getElementById("raccoltaLavorazioneSelect")?.value || "__ALL__";
    return raccoltaRowsMese()
      .filter(r => coll === "__ALL__" || r.collaboratore === coll)
      .filter(r => cantiere === "__ALL__" || (r.cantiere || "Senza cantiere") === cantiere)
      .filter(r => lavorazione === "__ALL__" || (r.lavorazione || "Senza lavorazione") === lavorazione);
  }

  function testoFiltroRaccolta(){
    const coll = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const cantiere = document.getElementById("raccoltaCantiereSelect")?.value || "__ALL__";
    const lavorazione = document.getElementById("raccoltaLavorazioneSelect")?.value || "__ALL__";
    const parti = [];
    parti.push(coll === "__ALL__" ? "Tutti i collaboratori" : coll);
    if(cantiere !== "__ALL__") parti.push("Cantiere: " + cantiere);
    if(lavorazione !== "__ALL__") parti.push("Lavorazione: " + lavorazione);
    return parti.join(" | ");
  }

  function valoreTrasfertaNum(v){
    return parseFloat(String(v || "").replace(/[^\d.]/g,"")) || 0;
  }

  function trasfertaLabelPulita(v){
    const n = valoreTrasfertaNum(v);
    return n ? "CHF " + econFmt(n) : "CHF 0";
  }

  function giornoSettimanaDaIso(dataIso){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || ""))) return "";
    const d = new Date(dataIso + "T00:00:00");
    return d.toLocaleDateString("it-CH", {weekday:"short"});
  }

  function dataPrintRaccolta(r){
    const iso = r.dataIso || normalizzaDataRaccolta(r.data);
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))){
      const [y,m,d] = iso.split("-");
      return `${d}.${m}.${y}`;
    }
    return r.data || iso || "";
  }

  function renderRaccoltaOperai(){
    popolaRaccoltaOperaiSelect();
    popolaRaccoltaFiltri();
    const rows = righeRaccoltaFiltrate();
    const grouped = {};
    rows.forEach(r=>{
      const key = [r.collaboratore || "-", r.cantiere || "-", r.tipoLabel || "-"].join("||");
      if(!grouped[key]) grouped[key] = {collaboratore:r.collaboratore || "-", cantiere:r.cantiere || "-", tipo:r.tipoLabel || "-", ore:0, giorni:new Set(), trasferta:0, avsSi:0, avsNo:0};
      grouped[key].ore += Number(r.ore || 0);
      grouped[key].giorni.add(r.dataIso || r.data || "");
      grouped[key].trasferta += valoreTrasfertaNum(r.trasferta);
      if(r.avs === "Sì") grouped[key].avsSi += 1;
      if(r.avs === "No") grouped[key].avsNo += 1;
    });
    const vals = Object.values(grouped).sort((a,b)=>
      a.collaboratore.localeCompare(b.collaboratore,"it") || a.cantiere.localeCompare(b.cantiere,"it") || a.tipo.localeCompare(b.tipo,"it")
    );
    const totOre = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const totTrasf = rows.reduce((s,r)=>s+valoreTrasfertaNum(r.trasferta),0);
    const avsSi = rows.filter(r=>r.avs === "Sì").length;
    const avsNo = rows.filter(r=>r.avs === "No").length;
    const set = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent = txt; };
    set("raccoltaTotOre", econFmt(totOre));
    set("raccoltaTotTrasferte", "CHF " + econFmt(totTrasf));
    set("raccoltaAvsSi", avsSi);
    set("raccoltaAvsNo", avsNo);

    const table = document.getElementById("raccoltaOperaiTable");
    if(table){
      table.innerHTML = `<thead><tr><th>Collaboratore / applicazione</th><th>Cantiere</th><th>Tipologia</th><th class="num">Giorni</th><th class="num">Ore totali</th><th class="num">Trasferte CHF</th><th class="num">AVS sì</th><th class="num">AVS no</th></tr></thead><tbody>` +
        vals.map(v=>`<tr><td>${v.collaboratore}</td><td>${v.cantiere}</td><td>${v.tipo}</td><td class="num">${v.giorni.size}</td><td class="num">${econFmt(v.ore)}</td><td class="num">CHF ${econFmt(v.trasferta)}</td><td class="num">${v.avsSi}</td><td class="num">${v.avsNo}</td></tr>`).join("") +
        `<tr class="total"><td colspan="4">Totale</td><td class="num">${econFmt(totOre)}</td><td class="num">CHF ${econFmt(totTrasf)}</td><td class="num">${avsSi}</td><td class="num">${avsNo}</td></tr></tbody>`;
    }
    renderRaccoltaOreDettaglio();
    renderStampaMensileCollaboratore();
    renderStampaRegie();
  }

  function meseLabelRaccolta(){
    const mese = meseDaInputRaccolta();
    if(!mese) return "-";
    const [y,m] = mese.split("-").map(Number);
    return new Date(y, m-1, 1).toLocaleDateString("it-CH", {month:"long", year:"numeric"});
  }


  function scrollToRigheModificaOre(){
    renderRaccoltaOperai();
    const card = document.getElementById("raccoltaOreDettaglioCard");
    if(card) card.scrollIntoView({behavior:"smooth", block:"start"});
  }

  function escapeHtmlOre(v){
    return String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch));
  }

  function meseIsoDaWorkerTimesheet(){
    const mese = meseDaInputRaccolta();
    if(/^\d{4}-\d{2}$/.test(mese)) return mese;
    return "2026-06";
  }

  function workerRowsPerModifica(mese, selected){
    const wt = workerTimesheet || {entries:{}, workerName:"Operaio demo"};
    const nome = wt.workerName || "Operaio demo";
    if(selected !== "__ALL__" && selected !== nome && selected !== "Operaio demo") return [];
    return Object.entries(wt.entries || {})
      .filter(([day,e]) => Number(e?.ore || 0) > 0)
      .map(([day,e])=>{
        const dd = String(Number(day)).padStart(2,"0");
        const dataIso = `${mese}-${dd}`;
        const tipo = e.tipo || tipoEconomicoDaIdCategoria(e.idCat || "100 — Cartongesso", e.lavorazione || "");
        return {
          __idx:`worker:${day}`,
          __workerDay:day,
          __source:"Scheda operaio",
          data:dataIso,
          dataIso,
          collaboratore:nome,
          cantiere:e.cantiere || "",
          idCat:e.idCat || "100 — Cartongesso",
          lavorazione:e.lavorazione || "",
          tipo,
          ore:Number(e.ore || 0),
          da:e.da || "",
          pausa:e.pausa || "",
          a:e.a || "",
          stato:e.stato || "Approvato"
        };
      });
  }

  function creaRigaEconomiaDaWorkerDay(day){
    const wt = workerTimesheet || {entries:{}, workerName:"Operaio demo"};
    const e = (wt.entries || {})[String(day)];
    if(!e || !Number(e.ore || 0)) return null;
    const mese = meseIsoDaWorkerTimesheet();
    const data = `${mese}-${String(Number(day)).padStart(2,"0")}`;
    const idCat = e.idCat || "100 — Cartongesso";
    const lavorazione = e.lavorazione || "";
    const nuovo = {
      data,
      cantiere:e.cantiere || "",
      collaboratore:wt.workerName || "Operaio demo",
      idCat,
      lavorazione,
      tipo:e.tipo || tipoEconomicoDaIdCategoria(idCat, lavorazione),
      ore:Number(e.ore || 0),
      stato:e.stato || "Approvato",
      da:e.da || "",
      a:e.a || "",
      pausa:e.pausa || ""
    };
    economia.ore = economia.ore || [];
    const existing = economia.ore.findIndex(r => normalizzaDataRaccolta(r.data) === data && String(r.collaboratore || "") === String(nuovo.collaboratore || "") && String(r.cantiere || "") === String(nuovo.cantiere || ""));
    if(existing >= 0){
      economia.ore[existing] = {...economia.ore[existing], ...nuovo};
      econSave();
      return existing;
    }
    economia.ore.push(nuovo);
    econSave();
    return economia.ore.length - 1;
  }

  function righeModificaOreVisibili(){
    const selected = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const mese = meseDaInputRaccolta();
    const all = (economia.ore || []).map((r, idx)=>({...r, __idx: idx, __source:"Ore admin", dataIso: normalizzaDataRaccolta(r.data)}));
    const cantiereFiltro = document.getElementById("raccoltaCantiereSelect")?.value || "__ALL__";
    const lavorazioneFiltro = document.getElementById("raccoltaLavorazioneSelect")?.value || "__ALL__";
    let rows = all
      .filter(r => !mese || String(r.dataIso).slice(0,7) === mese)
      .filter(r => selected === "__ALL__" || r.collaboratore === selected)
      .filter(r => cantiereFiltro === "__ALL__" || (r.cantiere || "Senza cantiere") === cantiereFiltro)
      .filter(r => lavorazioneFiltro === "__ALL__" || (r.lavorazione || "Senza lavorazione") === lavorazioneFiltro);
    let note = "";

    if(!rows.length && all.length){
      rows = all
        .filter(r => selected === "__ALL__" || r.collaboratore === selected)
        .filter(r => cantiereFiltro === "__ALL__" || (r.cantiere || "Senza cantiere") === cantiereFiltro)
        .filter(r => lavorazioneFiltro === "__ALL__" || (r.lavorazione || "Senza lavorazione") === lavorazioneFiltro);
      note = "Non ci sono righe nel mese selezionato: sotto mostro tutte le righe ore disponibili.";
    }

    if(!rows.length){
      rows = workerRowsPerModifica(mese || meseIsoDaWorkerTimesheet(), selected);
      if(rows.length) note = "Le righe sotto arrivano dalla scheda operaio. Quando premi Modifica vengono agganciate automaticamente all'area admin.";
    }

    return {rows: rows.sort((a,b)=>String(a.dataIso).localeCompare(String(b.dataIso)) || String(a.collaboratore).localeCompare(String(b.collaboratore),"it")), note};
  }

  function renderRaccoltaOreDettaglio(){
    const table = document.getElementById("raccoltaOreDettaglioTable");
    if(!table) return;
    const {rows, note} = righeModificaOreVisibili();
    if(!rows.length){
      table.innerHTML = `<tbody><tr><td>
        <div class="edit-visible-callout" style="margin:0">
          <b>Nessuna riga ore trovata.</b><br>
          Devi prima inserire almeno una giornata ore. Vai in <b>Area operaio</b> oppure in <b>Area admin → Inserisci ore</b>, poi torna qui e troverai la riga con il pulsante <b>Modifica</b>.
        </div>
      </td></tr></tbody>`;
      return;
    }
    const noteHtml = note ? `<caption style="caption-side:top;text-align:left;padding:10px 0;color:#1e3a8a;font-weight:900">${escapeHtmlOre(note)}</caption>` : "";
    table.innerHTML = noteHtml + `<thead><tr><th>Data</th><th>Collaboratore</th><th>Cantiere</th><th>Tipologia lavoro</th><th>Lavorazione</th><th>Inizio</th><th>Pausa</th><th>Fine</th><th class="num">Ore</th><th>Stato</th><th>Origine</th><th>Modifica</th></tr></thead><tbody>` +
      rows.map(r=>`<tr><td>${escapeHtmlOre(dataPrintRaccolta(r))}</td><td>${escapeHtmlOre(r.collaboratore||"")}</td><td>${escapeHtmlOre(r.cantiere||"")}</td><td>${escapeHtmlOre(r.idCat||"")}<div style="margin-top:6px;color:#64748b;font-size:12px;font-weight:900">${escapeHtmlOre((ECON_TIPI.find(t=>t.key===r.tipo)?.label)||r.tipo||"")}</div></td><td>${escapeHtmlOre(r.lavorazione||"")}</td><td>${escapeHtmlOre(r.da||"")}</td><td>${escapeHtmlOre(r.pausa||"")}</td><td>${escapeHtmlOre(r.a||"")}</td><td class="num">${econFmt(r.ore)}</td><td>${escapeHtmlOre(r.stato||"Approvato")}</td><td>${escapeHtmlOre(r.__source||"")}</td><td><button class="primary edit-quick-btn" onclick="vaiAModificaOreAdmin('${escapeHtmlOre(r.__idx)}')">✏️ Modifica</button></td></tr>`).join("") +
      `</tbody>`;
  }

  function vaiAModificaOreAdmin(index){
    if(!adminUnlocked){
      pendingAdminOreEditIndex = index;
      openAdminAccess();
      return;
    }
    let realIndex = index;
    if(String(index).startsWith("worker:")){
      realIndex = creaRigaEconomiaDaWorkerDay(String(index).split(":")[1]);
      renderRaccoltaOperai();
    }
    const r = (economia.ore || [])[Number(realIndex)];
    if(!r){ alert("Riga ore non trovata. Inserisci prima una riga ore oppure aggiorna la pagina."); return; }
    const dataIso = normalizzaDataRaccolta(r.data);
    if(dataIso && dataIso.length >= 7){
      adminMonthState.activeMonth = dataIso.slice(0,7);
      const meseInput = document.getElementById("raccoltaMese");
      if(meseInput) meseInput.value = dataIso.slice(0,7);
    }
    showSection('admin');
    setAdminMonthTab('ore', false);
    renderAdminMonthPanel();
    adminEditaOreMese(Number(realIndex));
    setTimeout(()=>{
      const panel = document.getElementById("panelOreMese");
      if(panel) panel.scrollIntoView({behavior:"smooth", block:"start"});
    }, 160);
  }

  function renderStampaMensileCollaboratore(){
    const selected = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const allRows = raccoltaRowsMese();
    const nome = selected === "__ALL__" ? (allRows[0]?.collaboratore || "-") : selected;
    const rows = allRows.filter(r => r.collaboratore === nome).sort((a,b)=>String(a.dataIso).localeCompare(String(b.dataIso)));
    const totOre = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const totTrasf = rows.reduce((s,r)=>s+valoreTrasfertaNum(r.trasferta),0);
    const avsSi = rows.filter(r=>r.avs === "Sì").length;
    const avsNo = rows.filter(r=>r.avs === "No").length;
    const set = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent = txt; };
    set("printCollaboratoreInfo", "Collaboratore: " + nome);
    set("printMeseInfo", meseLabelRaccolta());
    set("printTotOre", econFmt(totOre));
    set("printTotTrasferte", "CHF " + econFmt(totTrasf));
    set("printAvsSi", avsSi);
    set("printAvsNo", avsNo);

    const det = document.getElementById("printDettaglioMensile");
    if(det){
      det.innerHTML = `<thead><tr><th>Data</th><th>Inizio</th><th>Pausa</th><th>Fine</th><th>Cantiere</th><th>ID + Categoria</th><th>Lavorazione</th><th class="num">Ore</th><th>AVS</th><th class="num">Trasferta</th><th>Fascia</th></tr></thead><tbody>` +
        rows.map(r=>`<tr><td>${dataPrintRaccolta(r)}</td><td>${r.da || ""}</td><td>${r.pausa || ""}</td><td>${r.a || ""}</td><td>${r.cantiere || ""}</td><td>${r.idCat || ""}</td><td>${r.lavorazione || ""}</td><td class="num">${econFmt(r.ore)}</td><td>${r.avs || ""}</td><td class="num">${trasfertaLabelPulita(r.trasferta)}</td><td>${r.fasciaTrasferta || ""}</td></tr>`).join("") +
        `<tr class="total"><td colspan="7">Totale mese</td><td class="num">${econFmt(totOre)}</td><td>${avsSi} sì / ${avsNo} no</td><td class="num">CHF ${econFmt(totTrasf)}</td><td></td></tr></tbody>`;
    }

    const trasfGrouped = {};
    rows.forEach(r=>{
      const importo = valoreTrasfertaNum(r.trasferta);
      if(!importo) return;
      const key = [importo, r.fasciaTrasferta || "", r.avs || ""].join("||");
      if(!trasfGrouped[key]) trasfGrouped[key] = {importo, fascia:r.fasciaTrasferta || "-", avs:r.avs || "-", giorni:0, totale:0, date:[]};
      trasfGrouped[key].giorni += 1;
      trasfGrouped[key].totale += importo;
      trasfGrouped[key].date.push(dataPrintRaccolta(r));
    });
    const trasfTable = document.getElementById("printRiepilogoTrasferte");
    if(trasfTable){
      const vals = Object.values(trasfGrouped).sort((a,b)=>a.importo-b.importo || a.avs.localeCompare(b.avs,"it"));
      trasfTable.innerHTML = `<thead><tr><th>Tipologia / fascia</th><th class="num">Giorni</th><th class="num">Importo giorno</th><th>AVS</th><th>Giorni compresi</th><th class="num">Totale CHF</th></tr></thead><tbody>` +
        vals.map(v=>`<tr><td>${v.fascia}</td><td class="num">${v.giorni}</td><td class="num">CHF ${econFmt(v.importo)}</td><td>${v.avs}</td><td>${v.date.join(", ")}</td><td class="num">CHF ${econFmt(v.totale)}</td></tr>`).join("") +
        `<tr class="total"><td>Totale trasferte</td><td class="num">${vals.reduce((s,v)=>s+v.giorni,0)}</td><td></td><td>${avsSi} sì / ${avsNo} no</td><td></td><td class="num">CHF ${econFmt(totTrasf)}</td></tr></tbody>`;
    }

    const avsTable = document.getElementById("printRiepilogoAvs");
    if(avsTable){
      const avsSiTrasf = rows.filter(r=>r.avs === "Sì").reduce((s,r)=>s+valoreTrasfertaNum(r.trasferta),0);
      const avsNoTrasf = rows.filter(r=>r.avs === "No").reduce((s,r)=>s+valoreTrasfertaNum(r.trasferta),0);
      avsTable.innerHTML = `<thead><tr><th>Stato AVS</th><th class="num">Giorni</th><th class="num">Trasferte CHF</th></tr></thead><tbody>` +
        `<tr><td>AVS sì</td><td class="num">${avsSi}</td><td class="num">CHF ${econFmt(avsSiTrasf)}</td></tr>` +
        `<tr><td>AVS no</td><td class="num">${avsNo}</td><td class="num">CHF ${econFmt(avsNoTrasf)}</td></tr>` +
        `<tr class="total"><td>Totale</td><td class="num">${avsSi + avsNo}</td><td class="num">CHF ${econFmt(totTrasf)}</td></tr></tbody>`;
    }

    const grouped = {};
    rows.forEach(r=>{
      const key = [r.cantiere || "-", r.tipoLabel || "-"].join("||");
      if(!grouped[key]) grouped[key] = {cantiere:r.cantiere || "-", tipo:r.tipoLabel || "-", ore:0, trasferta:0, avsSi:0, avsNo:0};
      grouped[key].ore += Number(r.ore || 0);
      grouped[key].trasferta += valoreTrasfertaNum(r.trasferta);
      if(r.avs === "Sì") grouped[key].avsSi += 1;
      if(r.avs === "No") grouped[key].avsNo += 1;
    });
    const rie = document.getElementById("printRiepilogoMensile");
    if(rie){
      rie.innerHTML = `<thead><tr><th>Cantiere</th><th>Tipologia</th><th class="num">Ore totali</th><th class="num">Trasferte CHF</th><th class="num">AVS sì</th><th class="num">AVS no</th></tr></thead><tbody>` +
        Object.values(grouped).map(v=>`<tr><td>${v.cantiere}</td><td>${v.tipo}</td><td class="num">${econFmt(v.ore)}</td><td class="num">CHF ${econFmt(v.trasferta)}</td><td class="num">${v.avsSi}</td><td class="num">${v.avsNo}</td></tr>`).join("") +
        `</tbody>`;
    }
  }

  function isRegiaRaccoltaRow(r){
    const tipo = String(r?.tipo || "").toLowerCase();
    const idCat = String(r?.idCat || "").toLowerCase();
    const label = String(r?.tipoLabel || "").toLowerCase();
    const lav = String(r?.lavorazione || "").toLowerCase();
    return tipo === "regia" || idCat.startsWith("600") || label.includes("regia") || label.includes("extra") || lav.includes("regia");
  }

  function righeRegieRaccolta(){
    return righeRaccoltaFiltrate()
      .filter(isRegiaRaccoltaRow)
      .sort((a,b)=>String(a.dataIso).localeCompare(String(b.dataIso)) || String(a.cantiere||"").localeCompare(String(b.cantiere||""), "it"));
  }

  function renderStampaRegie(){
    const selected = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
    const rows = righeRegieRaccolta();
    const totOre = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const giorni = new Set(rows.map(r=>r.dataIso || r.data || "").filter(Boolean)).size;
    const cantieri = new Set(rows.map(r=>r.cantiere || "-")).size;
    const set = (id, txt)=>{ const el=document.getElementById(id); if(el) el.textContent = txt; };
    set("printRegieInfo", "Regia stampabile: " + (rows.length ? `${rows.length} righe / ${econFmt(totOre)} ore` : "nessuna regia nel filtro scelto"));
    set("printRegieMeseInfo", meseLabelRaccolta());
    set("printRegieFiltroInfo", testoFiltroRaccolta());
    set("printRegieTotOre", econFmt(totOre));
    set("printRegieGiorni", giorni);
    set("printRegieCantieri", cantieri);
    set("printRegieRighe", rows.length);

    const det = document.getElementById("printRegieDettaglio");
    if(det){
      det.innerHTML = `<thead><tr><th>Data</th><th>Collaboratore</th><th>Cantiere</th><th>Lavorazione</th><th>Tipo regia</th><th>Inizio</th><th>Pausa</th><th>Fine</th><th class="num">Ore</th></tr></thead><tbody>` +
        (rows.length ? rows.map(r=>`<tr><td>${dataPrintRaccolta(r)}</td><td>${escapeHtmlOre(r.collaboratore||"")}</td><td>${escapeHtmlOre(r.cantiere||"")}</td><td>${escapeHtmlOre(r.lavorazione||"")}</td><td>${escapeHtmlOre(r.idCat||r.tipoLabel||"Regia")}</td><td>${escapeHtmlOre(r.da||"")}</td><td>${escapeHtmlOre(r.pausa||"")}</td><td>${escapeHtmlOre(r.a||"")}</td><td class="num">${econFmt(r.ore)}</td></tr>`).join("") : `<tr><td colspan="9">Nessuna regia trovata per il mese e filtro scelto.</td></tr>`) +
        `<tr class="total"><td colspan="8">Totale ore regie</td><td class="num">${econFmt(totOre)}</td></tr></tbody>`;
    }

    const grouped = {};
    rows.forEach(r=>{
      const key = r.cantiere || "-";
      if(!grouped[key]) grouped[key] = {cantiere:key, ore:0, giorni:new Set(), collaboratori:new Set(), lavorazioni:new Set()};
      grouped[key].ore += Number(r.ore || 0);
      grouped[key].giorni.add(r.dataIso || r.data || "");
      grouped[key].collaboratori.add(r.collaboratore || "-");
      grouped[key].lavorazioni.add(r.lavorazione || "Regia");
    });
    const vals = Object.values(grouped).sort((a,b)=>a.cantiere.localeCompare(b.cantiere,"it"));
    const rie = document.getElementById("printRegieRiepilogo");
    if(rie){
      rie.innerHTML = `<thead><tr><th>Cantiere</th><th>Collaboratori</th><th>Lavorazioni</th><th class="num">Giorni</th><th class="num">Ore regie</th></tr></thead><tbody>` +
        (vals.length ? vals.map(v=>`<tr><td>${escapeHtmlOre(v.cantiere)}</td><td>${escapeHtmlOre(Array.from(v.collaboratori).join(", "))}</td><td>${escapeHtmlOre(Array.from(v.lavorazioni).join(", "))}</td><td class="num">${v.giorni.size}</td><td class="num">${econFmt(v.ore)}</td></tr>`).join("") : `<tr><td colspan="5">Nessun riepilogo regie disponibile.</td></tr>`) +
        `<tr class="total"><td colspan="4">Totale</td><td class="num">${econFmt(totOre)}</td></tr></tbody>`;
    }
  }

  function preparaStampa(tipo){
    document.body.classList.remove("print-mensile", "print-regie");
    document.body.classList.add(tipo === "regie" ? "print-regie" : "print-mensile");
    window.onafterprint = function(){
      document.body.classList.remove("print-mensile", "print-regie");
      window.onafterprint = null;
    };
  }

  function stampaMensileCollaboratore(){
    renderRaccoltaOperai();
    preparaStampa("mensile");
    window.print();
  }

  function stampaRegie(){
    renderRaccoltaOperai();
    renderStampaRegie();
    preparaStampa("regie");
    setTimeout(()=>window.print(), 80);
  }





  /* v21 - Gestione mesi admin, vacanze e regole orarie */
  const ADMIN_MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  let adminMonthState = JSON.parse(localStorage.getItem("tecnoplafon_admin_month_state_v1") || "null") || {
    activeMonth: new Date().toISOString().slice(0,7),
    tab: "ore",
    vacanze: [],
    fixedTotals: {},
    rules: {oraMin:"06:00", oraMax:"19:00", pausaMin:0.5, maxOre:10, oreInverno:8, oreEstate:8.5, estateDa:4, estateA:10, soloOggi:"si", weekend:"blocca", nota:"Orario standard controllato dall'admin."}
  };
  adminMonthState.fixedTotals = adminMonthState.fixedTotals || {};
  adminMonthState.rules = Object.assign({oraMin:"06:00", oraMax:"19:00", pausaMin:0.5, maxOre:10, oreInverno:8, oreEstate:8.5, estateDa:4, estateA:10, soloOggi:"si", weekend:"blocca", nota:"Orario standard controllato dall'admin."}, adminMonthState.rules || {});
  let adminOreEditIndex = null;

  function saveAdminMonthState(){ localStorage.setItem("tecnoplafon_admin_month_state_v1", JSON.stringify(adminMonthState)); }
  function adminActiveYear(){ return Number((adminMonthState.activeMonth || new Date().toISOString().slice(0,7)).slice(0,4)); }
  function adminActiveMonthNum(){ return Number((adminMonthState.activeMonth || new Date().toISOString().slice(0,7)).slice(5,7)); }
  function adminMonthIso(day=1){ return `${adminActiveYear()}-${String(adminActiveMonthNum()).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }

  /* v26 - Calcolo automatico festivi ufficiali Ticino, solo infrasettimanali */
  function isoDateLocal(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function addDaysLocal(d, days){
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }

  function easterSunday(year){
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function ticinoFestiviUfficialiAnno(year){
    const easter = easterSunday(year);
    const fixed = [
      [1,1,"Capodanno"],
      [1,6,"Epifania"],
      [3,19,"San Giuseppe"],
      [5,1,"Festa del lavoro"],
      [6,29,"San Pietro e Paolo"],
      [8,1,"Festa Nazionale Svizzera"],
      [8,15,"Assunzione"],
      [11,1,"Ognissanti"],
      [12,8,"Immacolata"],
      [12,25,"Natale"],
      [12,26,"Santo Stefano"]
    ].map(([m,d,nome]) => ({data: isoDateLocal(new Date(year, m - 1, d)), nome}));
    const mobili = [
      {data: isoDateLocal(addDaysLocal(easter, 1)), nome:"Lunedì di Pasqua"},
      {data: isoDateLocal(addDaysLocal(easter, 39)), nome:"Ascensione"},
      {data: isoDateLocal(addDaysLocal(easter, 50)), nome:"Lunedì di Pentecoste"},
      {data: isoDateLocal(addDaysLocal(easter, 60)), nome:"Corpus Domini"}
    ];
    return fixed.concat(mobili).sort((a,b)=>a.data.localeCompare(b.data));
  }

  function ticinoFestiviInfrasettimanaliAnno(year){
    return ticinoFestiviUfficialiAnno(year).filter(f => {
      const day = new Date(f.data + "T12:00:00").getDay();
      return day >= 1 && day <= 5;
    });
  }

  function adminInserisciFestiviTicinoAnno(showAlert=false){
    const year = adminActiveYear();
    adminMonthState.vacanze = adminMonthState.vacanze || [];
    const festivi = ticinoFestiviInfrasettimanaliAnno(year);
    let added = 0;
    festivi.forEach(f => {
      const exists = adminMonthState.vacanze.some(v => v.festivoTicino && v.da === f.data);
      if(!exists){
        adminMonthState.vacanze.push({
          collaboratore:"Generale / tutti",
          tipo:"Giorno festivo Ticino",
          da:f.data,
          a:f.data,
          note:f.nome,
          mese:f.data.slice(0,7),
          generale:true,
          auto:true,
          festivoTicino:true
        });
        added++;
      }
    });
    adminMonthState.festiviTicinoAutoYears = adminMonthState.festiviTicinoAutoYears || {};
    adminMonthState.festiviTicinoAutoYears[year] = true;
    saveAdminMonthState();
    renderTicinoHolidayList();
    renderAdminMonthPanel();
    if(showAlert) alert(added ? `Inseriti ${added} festivi infrasettimanali Ticino per il ${year}.` : `Festivi Ticino ${year} già presenti e aggiornati.`);
  }

  function adminRimuoviFestiviTicinoAnno(){
    const year = adminActiveYear();
    if(!confirm(`Rimuovere i festivi Ticino automatici del ${year}?`)) return;
    adminMonthState.vacanze = (adminMonthState.vacanze || []).filter(v => !(v.festivoTicino && String(v.da).slice(0,4) === String(year)));
    if(adminMonthState.festiviTicinoAutoYears) delete adminMonthState.festiviTicinoAutoYears[year];
    saveAdminMonthState();
    renderTicinoHolidayList();
    renderAdminMonthPanel();
    alert(`Festivi automatici Ticino ${year} rimossi.`);
  }

  function renderTicinoHolidayList(){
    const box = document.getElementById("ticinoHolidayList");
    const status = document.getElementById("ticinoHolidayStatus");
    if(!box && !status) return;
    const year = adminActiveYear();
    const festivi = ticinoFestiviInfrasettimanaliAnno(year);
    const inseriti = (adminMonthState.vacanze || []).filter(v => v.festivoTicino && String(v.da).slice(0,4) === String(year)).length;
    if(status) status.textContent = `${year}: ${festivi.length} festivi infrasettimanali calcolati, ${inseriti} inseriti come generali.`;
    if(box){
      box.innerHTML = festivi.map(f => {
        const giorno = new Date(f.data + "T12:00:00").toLocaleDateString("it-CH", {weekday:"long", day:"2-digit", month:"2-digit", year:"numeric"});
        return `<div class="holiday-chip">${f.nome}<span>${giorno}</span></div>`;
      }).join("");
    }
  }

  function initAdminMonthPanel(){
    renderAdminMonthGrid();
    fillAdminMonthSelects();
    loadRulesIntoForm();
    setAdminMonthTab(adminMonthState.tab || "ore", false);
    adminAggiornaLavorazioniMese();
    adminCalcolaOreMese();
    adminInserisciFestiviTicinoAnno(false);
    renderTicinoHolidayList();
    renderAdminMonthPanel();
  }

  function renderAdminMonthGrid(){
    const box = document.getElementById("adminMonthGrid");
    if(!box) return;
    const y = adminActiveYear();
    box.innerHTML = ADMIN_MONTHS.map((m,i)=>{
      const val = `${y}-${String(i+1).padStart(2,"0")}`;
      const locked = adminMonthState.fixedTotals && Object.prototype.hasOwnProperty.call(adminMonthState.fixedTotals, val);
      return `<button class="month-btn ${adminMonthState.activeMonth===val?"active":""}" onclick="selectAdminMonth('${val}')">${m}${locked ? " 🔒" : ""}</button>`;
    }).join("");
  }

  function selectAdminMonth(month){
    adminMonthState.activeMonth = month;
    saveAdminMonthState();
    renderAdminMonthGrid();
    setDefaultAdminMonthDates();
    adminInserisciFestiviTicinoAnno(false);
    renderTicinoHolidayList();
    renderAdminMonthPanel();
  }

  function setDefaultAdminMonthDates(){
    const d = document.getElementById("adminOreData");
    const vd = document.getElementById("adminVacDa");
    const va = document.getElementById("adminVacA");
    const first = adminMonthIso(1);
    if(d) d.value = first;
    if(vd) vd.value = first;
    if(va) va.value = first;
  }

  function fillAdminMonthSelects(){
    const operai = (adminData?.operai || []).filter(o=>o.stato !== "Terminato");
    const cantieri = (adminData?.cantieri || []).filter(c=>c.stato !== "Terminato");
    ["adminOreCollaboratore"].forEach(id=>{
      const el = document.getElementById(id); if(!el) return;
      const old = el.value;
      el.innerHTML = operai.map(o=>`<option value="${o.nome}">${o.nome}</option>`).join("");
      if([...el.options].some(o=>o.value===old)) el.value = old;
    });
    const csel = document.getElementById("adminOreCantiere");
    if(csel){
      const old = csel.value;
      csel.innerHTML = cantieri.map(c=>`<option value="${c.nome}">${c.nome}</option>`).join("");
      if([...csel.options].some(o=>o.value===old)) csel.value = old;
    }
    const tipoSel = document.getElementById("adminOreTipoEconomico");
    if(tipoSel){
      const old = tipoSel.value;
      tipoSel.innerHTML = ECON_TIPI.map(t=>`<option value="${t.key}">${t.label}</option>`).join("");
      if([...tipoSel.options].some(o=>o.value===old)) tipoSel.value = old;
      else adminAggiornaTipoEconomicoMese(true);
    }
    setDefaultAdminMonthDates();
  }

  function setAdminMonthTab(tab, save=true){
    adminMonthState.tab = tab;
    if(save) saveAdminMonthState();
    [["ore","tabOreMese","panelOreMese"],["vacanze","tabVacanzeMese","panelVacanzeMese"],["regole","tabRegoleMese","panelRegoleMese"]].forEach(([key,btn,panel])=>{
      document.getElementById(btn)?.classList.toggle("active", tab===key);
      document.getElementById(panel)?.classList.toggle("open", tab===key);
    });
  }

  function adminAggiornaLavorazioniMese(){
    const id = document.getElementById("adminOreCategoria")?.value || "100";
    const sel = document.getElementById("adminOreLavorazione");
    if(!sel) return;
    const old = sel.value;
    sel.innerHTML = (lavorazioni[id] || []).map(v=>`<option>${v}</option>`).join("");
    if([...sel.options].some(o=>o.value===old)) sel.value = old;
    adminAggiornaTipoEconomicoMese(true);
  }

  function adminAggiornaTipoEconomicoMese(force=false){
    const tipoSel = document.getElementById("adminOreTipoEconomico");
    if(!tipoSel) return;
    if(!tipoSel.options.length){
      tipoSel.innerHTML = ECON_TIPI.map(t=>`<option value="${t.key}">${t.label}</option>`).join("");
    }
    if(!force && tipoSel.value) return;
    const idCatText = document.getElementById("adminOreCategoria")?.selectedOptions[0]?.textContent || "100 — Cartongesso";
    const lavorazione = document.getElementById("adminOreLavorazione")?.value || "";
    const tipo = tipoEconomicoDaIdCategoria(idCatText, lavorazione);
    if([...tipoSel.options].some(o=>o.value===tipo)) tipoSel.value = tipo;
  }

  function adminEliminaWorkerTimesheetEntry(data){
    const day = String(Number(String(data || "").split("-").pop() || 0));
    if(day && workerTimesheet?.entries && workerTimesheet.entries[day]){
      delete workerTimesheet.entries[day];
      saveWorkerTimesheet();
      renderWorkerTimesheet();
    }
  }

  function adminCalcolaOreMese(){
    const da = document.getElementById("adminOreDa")?.value || "";
    const a = document.getElementById("adminOreA")?.value || "";
    const pausa = document.getElementById("adminOrePausa")?.value || 0;
    const ore = calcolaOreDaOrari(da,a,pausa);
    const el = document.getElementById("adminOreTotale");
    if(el) el.value = ore || 0;
  }

  function adminHasTotaleOreFisso(mese){
    return !!adminMonthState.fixedTotals && Object.prototype.hasOwnProperty.call(adminMonthState.fixedTotals, mese);
  }

  function adminSalvaTotaleOreFisso(){
    const mese = adminMonthState.activeMonth;
    const input = document.getElementById("adminOreTotaleFisso");
    const valore = Number(input?.value || 0);
    if(!mese){ alert("Seleziona prima un mese."); return; }
    if(!Number.isFinite(valore) || valore < 0){ alert("Inserisci un totale ore valido."); return; }
    adminMonthState.fixedTotals = adminMonthState.fixedTotals || {};
    adminMonthState.fixedTotals[mese] = valore;
    saveAdminMonthState();
    renderAdminMonthPanel();
    alert("Totale ore del mese fissato. Rimane salvato e non viene modificato dal calcolo automatico.");
  }

  function adminSbloccaTotaleOreFisso(){
    const mese = adminMonthState.activeMonth;
    adminMonthState.fixedTotals = adminMonthState.fixedTotals || {};
    if(adminHasTotaleOreFisso(mese)) delete adminMonthState.fixedTotals[mese];
    saveAdminMonthState();
    renderAdminMonthPanel();
    alert("Totale ore sbloccato. Ora il mese torna al calcolo automatico dalle righe ore.");
  }

  function setSelectValueByTextOrValue(selectId, wanted){
    const sel = document.getElementById(selectId);
    if(!sel) return;
    const s = String(wanted || "").trim();
    const opt = [...sel.options].find(o => o.value === s || o.textContent.trim() === s || o.textContent.trim().startsWith(s));
    if(opt) sel.value = opt.value;
  }

  function setSelectValueByTextOrValueOrCreate(selectId, wanted){
    const sel = document.getElementById(selectId);
    if(!sel) return;
    const s = String(wanted || "").trim();
    if(!s) return;
    const opt = [...sel.options].find(o => o.value === s || o.textContent.trim() === s || o.textContent.trim().startsWith(s));
    if(opt){
      sel.value = opt.value;
      return;
    }
    const extra = document.createElement("option");
    extra.value = s;
    extra.textContent = s;
    sel.appendChild(extra);
    sel.value = s;
  }

  function adminSetEditModeOre(index){
    adminOreEditIndex = (index === null || index === undefined || index === "") ? null : Number(index);
    const hidden = document.getElementById("adminOreEditIndex");
    if(hidden) hidden.value = adminOreEditIndex === null ? "" : String(adminOreEditIndex);
    const banner = document.getElementById("adminOreEditBanner");
    if(banner) banner.classList.toggle("open", adminOreEditIndex !== null);
    const saveBtn = document.getElementById("adminOreSaveBtn");
    if(saveBtn) saveBtn.textContent = adminOreEditIndex !== null ? "Aggiorna ore collaboratore" : "Salva ore nel mese";
    const cancelBtn = document.getElementById("adminOreCancelBtn");
    if(cancelBtn) cancelBtn.style.display = adminOreEditIndex !== null ? "block" : "none";
    ["adminOreCollaboratore","adminOreData","adminOreCantiere","adminOreCategoria","adminOreTipoEconomico","adminOreLavorazione","adminOreDa","adminOreA","adminOrePausa","adminOreTotale","adminOreStato"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.classList.toggle("admin-edit-active-field", adminOreEditIndex !== null);
    });
  }

  function adminAnnullaModificaOreMese(){
    adminSetEditModeOre(null);
    adminCalcolaOreMese();
  }

  function adminEditaOreMese(index){
    if(!adminUnlocked){
      pendingAdminOreEditIndex = index;
      openAdminAccess();
      return;
    }
    const r = (economia.ore || [])[Number(index)];
    if(!r){ alert("Riga ore non trovata."); return; }
    setAdminMonthTab("ore", false);
    const dataIso = normalizzaDataRaccolta(r.data);
    const dataEl = document.getElementById("adminOreData"); if(dataEl) dataEl.value = dataIso;
    setSelectValueByTextOrValueOrCreate("adminOreCollaboratore", r.collaboratore || "");
    setSelectValueByTextOrValueOrCreate("adminOreCantiere", r.cantiere || "");
    const catPrefix = String(r.idCat || "100").match(/^(\d+)/)?.[1] || "100";
    const catEl = document.getElementById("adminOreCategoria"); if(catEl) catEl.value = catPrefix;
    adminAggiornaLavorazioniMese();
    const lavEl = document.getElementById("adminOreLavorazione");
    if(lavEl){
      const wanted = String(r.lavorazione || "").trim();
      const opt = [...lavEl.options].find(o => o.textContent.trim() === wanted || o.value === wanted);
      if(opt) lavEl.value = opt.value;
      else if(wanted){
        const extra = document.createElement("option");
        extra.value = wanted;
        extra.textContent = wanted;
        lavEl.appendChild(extra);
        lavEl.value = wanted;
      }
    }
    const tipoSel = document.getElementById("adminOreTipoEconomico");
    if(tipoSel){
      if(!tipoSel.options.length) tipoSel.innerHTML = ECON_TIPI.map(t=>`<option value="${t.key}">${t.label}</option>`).join("");
      const tipo = r.tipo || tipoEconomicoDaIdCategoria(r.idCat || catEl?.selectedOptions?.[0]?.textContent || "100 — Cartongesso", r.lavorazione || "");
      if([...tipoSel.options].some(o=>o.value===tipo)) tipoSel.value = tipo;
    }
    const daEl = document.getElementById("adminOreDa"); if(daEl) daEl.value = r.da || "07:00";
    const aEl = document.getElementById("adminOreA"); if(aEl) aEl.value = r.a || "16:00";
    const pausaEl = document.getElementById("adminOrePausa"); if(pausaEl) pausaEl.value = r.pausa ?? "1";
    const oreEl = document.getElementById("adminOreTotale"); if(oreEl) oreEl.value = Number(r.ore || 0);
    setSelectValueByTextOrValue("adminOreStato", r.stato || "Approvato");
    adminSetEditModeOre(index);
    document.getElementById("panelOreMese")?.scrollIntoView({behavior:"smooth", block:"start"});
    setTimeout(()=>document.getElementById("adminOreCollaboratore")?.focus(), 250);
  }

  function adminEliminaOreMese(index){
    const r = (economia.ore || [])[Number(index)];
    if(!r){ alert("Riga ore non trovata."); return; }
    if(!confirm(`Eliminare l'inserimento ore di ${r.collaboratore || "collaboratore"} del ${r.data || "giorno selezionato"}?`)) return;
    economia.ore.splice(Number(index), 1);
    if(adminOreEditIndex === Number(index)) adminSetEditModeOre(null);
    econSave();
    renderEconomia(false); renderRaccoltaOperai(); renderAdminMonthPanel(); renderAdminPresenzeOggi();
    alert("Inserimento ore eliminato.");
  }

  function adminSalvaOreMese(){
    const data = document.getElementById("adminOreData")?.value || adminMonthIso(1);
    const collaboratore = document.getElementById("adminOreCollaboratore")?.value || "";
    const cantiere = document.getElementById("adminOreCantiere")?.value || "";
    const idCatText = document.getElementById("adminOreCategoria")?.selectedOptions[0]?.textContent || "100 — Cartongesso";
    const lavorazione = document.getElementById("adminOreLavorazione")?.value || "";
    const ore = Number(document.getElementById("adminOreTotale")?.value || 0);
    const da = document.getElementById("adminOreDa")?.value || "";
    const a = document.getElementById("adminOreA")?.value || "";
    const pausa = document.getElementById("adminOrePausa")?.value || "";
    if(!data || !collaboratore || !cantiere || !ore){ alert("Completa giornata, collaboratore, cantiere e ore lavorative."); return; }
    const tipoManuale = document.getElementById("adminOreTipoEconomico")?.value || "";
    const tipo = tipoManuale || tipoEconomicoDaIdCategoria(idCatText, lavorazione);
    const stato = document.getElementById("adminOreStato")?.value || "Approvato";
    const nuovo = {data,cantiere,collaboratore,idCat:idCatText,lavorazione,tipo,ore,stato,da,a,pausa,assegnatoDa:"Admin", aggiornatoDaModifica:true, updatedAt:new Date().toISOString()};
    const editIndex = adminOreEditIndex !== null ? Number(adminOreEditIndex) : Number(document.getElementById("adminOreEditIndex")?.value);
    const oldRow = (Number.isFinite(editIndex) && editIndex >= 0) ? (economia.ore || [])[editIndex] : null;
    const oldData = oldRow ? normalizzaDataRaccolta(oldRow.data) : "";
    const workerNames = [workerTimesheet?.workerName, "Operaio demo"].filter(Boolean);
    if(Number.isFinite(editIndex) && editIndex >= 0 && economia.ore[editIndex]){
      economia.ore[editIndex] = {...economia.ore[editIndex], ...nuovo};
      adminSetEditModeOre(null);
      alert("Modifica salvata: l\'inserimento ore è stato aggiornato con ore, cantiere, lavorazione e tipologia del lavoro.");
    } else {
      economia.ore.push(nuovo);
      alert("Ore salvate nel mese selezionato.");
    }
    if(workerNames.includes(collaboratore)){
      updateWorkerTimesheetEntry(data,cantiere,ore,da,a,pausa,idCatText,lavorazione,oldData,tipo,stato);
    } else if(oldRow && workerNames.includes(oldRow.collaboratore)){
      adminEliminaWorkerTimesheetEntry(oldData);
    }
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(data || ""))){
      adminMonthState.activeMonth = data.slice(0,7);
      saveAdminMonthState();
      const meseInput = document.getElementById("raccoltaMese");
      if(meseInput) meseInput.value = data.slice(0,7);
    }
    econSave();
    renderEconomia(false); renderRaccoltaOperai(); renderAdminMonthPanel(); renderAdminPresenzeOggi();
  }

  function adminSalvaVacanzaMese(){
    const collaboratore = "Generale / tutti";
    const tipo = document.getElementById("adminVacTipo")?.value || "Vacanze generali";
    const da = document.getElementById("adminVacDa")?.value || adminMonthIso(1);
    const a = document.getElementById("adminVacA")?.value || da;
    const note = document.getElementById("adminVacNote")?.value || "";
    if(String(da).slice(0,7) !== adminMonthState.activeMonth){ alert("La data inizio non appartiene al mese selezionato."); return; }
    adminMonthState.vacanze.push({collaboratore,tipo,da,a,note,mese:adminMonthState.activeMonth,generale:true});
    saveAdminMonthState(); renderAdminMonthPanel();
    alert("Vacanza generale salvata nel mese selezionato. Vale per tutti i collaboratori.");
  }

  function loadRulesIntoForm(){
    const r = adminMonthState.rules || {};
    [["ruleOraMin",r.oraMin],["ruleOraMax",r.oraMax],["rulePausaMin",r.pausaMin],["ruleMaxOre",r.maxOre],["ruleOreInverno",r.oreInverno],["ruleOreEstate",r.oreEstate],["ruleEstateDa",r.estateDa],["ruleEstateA",r.estateA],["ruleSoloOggi",r.soloOggi],["ruleWeekend",r.weekend],["ruleNota",r.nota]].forEach(([id,val])=>{
      const el=document.getElementById(id); if(el && val !== undefined) el.value = val;
    });
    renderRulesPreview();
  }

  function salvaRegoleOrariAdmin(){
    adminMonthState.rules = {
      oraMin:document.getElementById("ruleOraMin")?.value || "06:00",
      oraMax:document.getElementById("ruleOraMax")?.value || "19:00",
      pausaMin:Number(document.getElementById("rulePausaMin")?.value || 0),
      maxOre:Number(document.getElementById("ruleMaxOre")?.value || 10),
      oreInverno:Number(document.getElementById("ruleOreInverno")?.value || 8),
      oreEstate:Number(document.getElementById("ruleOreEstate")?.value || 8.5),
      estateDa:Number(document.getElementById("ruleEstateDa")?.value || 4),
      estateA:Number(document.getElementById("ruleEstateA")?.value || 10),
      soloOggi:document.getElementById("ruleSoloOggi")?.value || "si",
      weekend:document.getElementById("ruleWeekend")?.value || "blocca",
      nota:document.getElementById("ruleNota")?.value || ""
    };
    saveAdminMonthState(); renderRulesPreview(); renderAdminMonthPanel();
    alert("Regole orari salvate. Verranno applicate quando il collaboratore segna le ore.");
  }

  function renderRulesPreview(){
    const r = adminMonthState.rules || {};
    const box = document.getElementById("rulePreviewLine");
    if(!box) return;
    const oggi = localTodayIso();
    const prev = oreGiornoPrevisteAdmin(oggi);
    const stagione = stagioneAdminPerData(oggi);
    box.innerHTML = `<span>Entrata da ${r.oraMin}</span><span>Uscita max ${r.oraMax}</span><span>Pausa min ${r.pausaMin} h</span><span>Max ${r.maxOre} h/giorno</span><span>Totale oggi admin: ${econFmt(prev)} h (${stagione})</span><span>Inverno ${r.oreInverno || 0} h</span><span>Estate ${r.oreEstate || 0} h</span><span>Solo oggi: ${r.soloOggi === "si" ? "Sì" : "No"}</span><span>Weekend: ${r.weekend}</span>`;
  }

  function meseInIntervalloAdmin(mese, da, a){
    mese = Number(mese); da = Number(da || 4); a = Number(a || 10);
    if(da <= a) return mese >= da && mese <= a;
    return mese >= da || mese <= a;
  }

  function stagioneAdminPerData(data){
    const r = adminMonthState.rules || {};
    const d = isoDateOnly(data) || localTodayIso();
    const mese = Number(String(d).slice(5,7));
    return meseInIntervalloAdmin(mese, r.estateDa, r.estateA) ? "estivo" : "invernale";
  }

  function oreGiornoPrevisteAdmin(data){
    const r = adminMonthState.rules || {};
    const stagione = stagioneAdminPerData(data);
    const val = stagione === "estivo" ? Number(r.oreEstate || 0) : Number(r.oreInverno || 0);
    return Number.isFinite(val) && val > 0 ? val : Number(r.maxOre || 0);
  }

  function oreGiaSegnateCollaboratoreGiorno(collaboratore, data){
    const d = isoDateOnly(data);
    const nome = String(collaboratore || "").trim();
    return (economia.ore || []).filter(r => normalizzaDataRaccolta(r.data) === d && String(r.collaboratore || "").trim() === nome)
      .reduce((s,r)=>s + Number(r.ore || 0), 0);
  }

  function timeToMin(t){ if(!t) return null; const [h,m]=String(t).split(":").map(Number); return h*60 + (m||0); }

  function isoDateOnly(v){
    const n = normalizzaDataRaccolta(v || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : "";
  }

  function dateInRangeIso(data, da, a){
    const d = isoDateOnly(data);
    const start = isoDateOnly(da);
    const end = isoDateOnly(a || da);
    if(!d || !start) return false;
    return d >= start && d <= (end || start);
  }

  function vacanzaORegolaBloccante(data, collaboratore){
    const d = isoDateOnly(data);
    if(!d) return null;
    const nome = String(collaboratore || "").trim().toLowerCase();
    const vacanze = Array.isArray(adminMonthState.vacanze) ? adminMonthState.vacanze : [];
    for(const v of vacanze){
      if(!dateInRangeIso(d, v.da, v.a)) continue;
      const app = String(v.collaboratore || v.applicazione || "Generale / tutti").trim().toLowerCase();
      const generale = v.generale === true || !app || app.includes("generale") || app.includes("tutti");
      const assegnata = generale || (nome && app === nome);
      if(!assegnata) continue;
      const tipo = String(v.tipo || "Giorno bloccato");
      const note = String(v.note || "").trim();
      return {tipo, note, festivo: !!v.festivoTicino || /festiv/i.test(tipo)};
    }
    return null;
  }

  function validaRegoleOrarieOperaio(data, ore, da, a, pausa, collaboratore){
    const r = adminMonthState.rules || {maxOre:10, pausaMin:0, soloOggi:"si", weekend:"blocca"};
    const msg = [];
    const dataIso = isoDateOnly(data);
    const oggiIso = localTodayIso();

    if(!dataIso){
      msg.push("Inserisci una data valida.");
    } else if((r.soloOggi || "si") === "si" && dataIso !== oggiIso){
      if(dataIso < oggiIso) msg.push("Non puoi segnare ore di ieri o di giorni passati: le ore si segnano lo stesso giorno secondo le regole admin.");
      if(dataIso > oggiIso) msg.push("Non puoi segnare ore di domani o di giorni futuri: le ore si segnano lo stesso giorno secondo le regole admin.");
    }

    const blocco = vacanzaORegolaBloccante(dataIso, collaboratore || "Operaio demo");
    if(blocco){
      msg.push(`${blocco.festivo ? "Giorno festivo" : "Vacanza / assenza assegnata"} bloccata: ${blocco.tipo}${blocco.note ? " - " + blocco.note : ""}. Nessun inserimento ore consentito.`);
    }

    const orePrevisteAdmin = oreGiornoPrevisteAdmin(dataIso || oggiIso);
    const giaSegnate = oreGiaSegnateCollaboratoreGiorno(collaboratore || "Operaio demo", dataIso);
    const totaleDopoInserimento = giaSegnate + Number(ore || 0);
    if(orePrevisteAdmin > 0 && totaleDopoInserimento > orePrevisteAdmin + 0.001) msg.push(`Totale ore del giorno superato: regola admin ${econFmt(orePrevisteAdmin)} h (${stagioneAdminPerData(dataIso || oggiIso)}), già segnate ${econFmt(giaSegnate)} h, stai inserendo ${econFmt(ore)} h.`);
    if(Number(ore||0) > Number(r.maxOre||99)) msg.push(`Massimo ore giornaliere consentito: ${r.maxOre}.`);
    if(da && r.oraMin && timeToMin(da) < timeToMin(r.oraMin)) msg.push(`Entrata prima dell'orario minimo (${r.oraMin}).`);
    if(a && r.oraMax && timeToMin(a) > timeToMin(r.oraMax)) msg.push(`Uscita oltre l'orario massimo (${r.oraMax}).`);
    if((da || a) && Number(pausa||0) < Number(r.pausaMin||0)) msg.push(`Pausa minima richiesta: ${r.pausaMin} ore.`);
    if(dataIso && r.weekend === "blocca"){
      const d = new Date(dataIso + "T12:00:00");
      if(d.getDay() === 0 || d.getDay() === 6) msg.push("Sabato e domenica sono bloccati dalle regole admin.");
    }
    if(msg.length){ alert("Inserimento ore bloccato:\n- " + msg.join("\n- ")); return false; }
    return true;
  }

  function adminAssegnazioneInfo(r){
    const dataIso = normalizzaDataRaccolta(r?.data || "");
    const oggiIso = new Date().toISOString().slice(0,10);
    if(dataIso === oggiIso){
      return {cls:"assign-admin", label:"Ore segnate oggi", short:"OGGI"};
    }
    return {cls:"assign-worker", label:"Ore non segnate oggi", short:"NO OGGI"};
  }

  function adminAssegnazioneBadge(r){
    const info = adminAssegnazioneInfo(r);
    return `<span class="assign-badge ${info.cls}" title="${info.label}">${info.label}</span>`;
  }

  function renderAdminMonthPanel(){
    fillAdminMonthSelects();
    renderAdminMonthGrid();
    renderRulesPreview();
    renderTicinoHolidayList();
    const mese = adminMonthState.activeMonth;
    const label = new Date(Number(mese.slice(0,4)), Number(mese.slice(5,7))-1, 1).toLocaleDateString("it-CH", {month:"long", year:"numeric"});
    const rows = (economia.ore || []).map((r,idx)=>({...r,__idx:idx})).filter(r => String(normalizzaDataRaccolta(r.data)).slice(0,7) === mese);
    const vacs = (adminMonthState.vacanze || []).filter(v => (v.mese || String(v.da).slice(0,7)) === mese);
    const totOreCalcolato = rows.reduce((s,r)=>s+Number(r.ore||0),0);
    const hasFisso = adminHasTotaleOreFisso(mese);
    const totOre = hasFisso ? Number(adminMonthState.fixedTotals[mese] || 0) : totOreCalcolato;
    const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent=v;};
    set("adminMeseAttivoLabel", label);
    set("adminMeseOreTotali", `${hasFisso ? "🔒 " : ""}${econFmt(totOre)}`);
    set("adminMeseVacanzeTotali", `${vacs.length} generali`);
    set("adminMeseMaxOre", adminMonthState.rules?.maxOre || 10);
    const fixedInput = document.getElementById("adminOreTotaleFisso");
    if(fixedInput) fixedInput.value = hasFisso ? Number(adminMonthState.fixedTotals[mese] || 0) : econFmt(totOreCalcolato);
    const fixedStatus = document.getElementById("adminOreFissoStato");
    if(fixedStatus){
      fixedStatus.textContent = hasFisso ? `🔒 Fisso: ${econFmt(totOre)} ore` : `Automatico: ${econFmt(totOreCalcolato)} ore`;
      fixedStatus.style.background = hasFisso ? "#ecfdf5" : "#eff6ff";
      fixedStatus.style.borderColor = hasFisso ? "#bbf7d0" : "#bfdbfe";
      fixedStatus.style.color = hasFisso ? "#166534" : "#1e3a8a";
    }
    const table = document.getElementById("adminMonthTable");
    if(table){
      const legendHtml = `<div class="assign-legend"><span class="assign-badge assign-admin">Ore segnate oggi</span><span class="assign-badge assign-worker">Ore non segnate oggi</span><span class="assign-mini-note">Verde = ore segnate oggi · Rosso = ore non segnate oggi</span></div>`;
      const oreHtml = rows.map(r=>`<tr><td>Ore</td><td>${r.data||""}</td><td>${r.collaboratore||""}<div style="margin-top:6px">${adminAssegnazioneBadge(r)}</div></td><td>${r.cantiere||""}</td><td>${r.idCat||""}<div style="margin-top:6px;color:#64748b;font-size:12px;font-weight:900">${(ECON_TIPI.find(t=>t.key===r.tipo)?.label)||r.tipo||""}</div></td><td>${r.lavorazione||""}</td><td>${r.da||""}</td><td>${r.pausa||""}</td><td>${r.a||""}</td><td class="num">${econFmt(r.ore)}</td><td>${r.stato||"Approvato"}</td><td><div class="action-mini-row"><button class="primary edit-quick-btn" onclick="adminEditaOreMese(${r.__idx})">✏️ Modifica</button><button class="tiny-btn red" onclick="adminEliminaOreMese(${r.__idx})">Elimina</button></div></td></tr>`).join("");
      const vacHtml = vacs.map(v=>`<tr><td>${v.tipo}</td><td>${v.da} - ${v.a}</td><td>${v.generale ? "Generale / tutti" : (v.collaboratore || "Generale / tutti")}</td><td colspan="6">${v.note||""}</td><td class="num">-</td><td>${v.festivoTicino ? "Festivo automatico" : "Registrato generale"}</td><td></td></tr>`).join("");
      const totaleLabel = hasFisso ? `Totale ore mese FISSO 🔒 (calcolato: ${econFmt(totOreCalcolato)})` : "Totale ore mese automatico";
      table.innerHTML = `${legendHtml}<thead><tr><th>Tipo</th><th>Data / periodo</th><th>Collaboratore / applicazione</th><th>Cantiere</th><th>Tipologia lavoro</th><th>Lavorazione / note</th><th>Inizio</th><th>Pausa</th><th>Fine</th><th class="num">Ore</th><th>Stato</th><th>Azioni admin</th></tr></thead><tbody>${oreHtml}${vacHtml || ""}<tr class="total"><td colspan="9">${totaleLabel}</td><td class="num">${econFmt(totOre)}</td><td>${vacs.length} vacanze generali</td><td></td></tr></tbody>`;
    }
  }


  /* Fix v20: listener diretto per accesso admin, evita problemi di overlay/click su alcuni browser */
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('adminAccessBtn');
    var panel = document.getElementById('adminAccessPanel');
    if(btn){
      btn.style.pointerEvents = 'auto';
      btn.style.position = 'relative';
      btn.style.zIndex = '999';
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof openAdminAccess === 'function'){
          openAdminAccess();
        }else if(panel){
          panel.classList.add('open');
          panel.style.display = 'flex';
        }else{
          alert('Pannello accesso admin non trovato.');
        }
        return false;
      }, true);
    }
  });

  /* v22: doppio pulsante fisso, sempre raggiungibile anche se l'header viene tagliato */
  document.addEventListener('DOMContentLoaded', function(){
    var fbtn = document.getElementById('adminFloatingBtn');
    if(fbtn){
      fbtn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof openAdminAccess === 'function'){ openAdminAccess(); }
        return false;
      }, true);
    }
  });

/* ===== Blocco JavaScript estratto dal file originale ===== */

const SUPABASE_URL = "https://sgdmrramdemwxqdmjgna.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_TRDxM5otfvd2GxMTOFpc6g_Ogybejd5";
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = supabaseClient;

  let supabaseProfiloCorrente = null;

  function tpShowLogin(){
    document.body.classList.remove("tp-auth-ok");
    document.body.classList.remove("admin-view");
    document.body.classList.remove("worker-view");
    try { sessionStorage.removeItem("tecnoplafonAdminUnlocked"); } catch(e){}
  }

  function tpShowApp(){
    document.body.classList.add("tp-auth-ok");
  }

  function tpLoginError(msg){
    const el = document.getElementById("tpFullLoginError");
    if(el){
      el.textContent = msg;
      el.style.display = "block";
    } else {
      alert(msg);
    }
  }

  async function tpCaricaProfilo(){
    const userRes = await supabaseClient.auth.getUser();
    const user = userRes && userRes.data ? userRes.data.user : null;
    if(!user) return null;

    const profRes = await supabaseClient
      .from("profili")
      .select("id,nome,email,ruolo,stato,max_ore_giorno")
      .eq("id", user.id)
      .maybeSingle();

    if(profRes.error){
      throw new Error(profRes.error.message);
    }

    supabaseProfiloCorrente = profRes.data;
    return profRes.data;
  }

  window.tpFullLoginSubmit = async function(){
    const emailEl = document.getElementById("tpFullEmail");
    const passEl = document.getElementById("tpFullPassword");
    const btn = document.getElementById("tpFullLoginBtn");
    const err = document.getElementById("tpFullLoginError");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passEl ? passEl.value : "";

    if(!email || !password){
      tpLoginError("Inserisci email e password.");
      return;
    }

    if(err){
      err.textContent = "Accesso in corso...";
      err.style.display = "block";
    }
    if(btn) btn.disabled = true;

    try{
      await supabaseClient.auth.signOut();

      const login = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if(login.error){
        tpLoginError("Login fallito: " + login.error.message);
        if(btn) btn.disabled = false;
        return;
      }

      const profilo = await tpCaricaProfilo();

      if(!profilo){
        tpLoginError("Login OK, ma manca il profilo nella tabella profili.");
        if(btn) btn.disabled = false;
        return;
      }

      if(profilo.stato !== "Attivo"){
        tpLoginError("Accesso bloccato: profilo non Attivo.");
        if(btn) btn.disabled = false;
        return;
      }

      if(err) err.style.display = "none";
      tpShowApp();

      // Admin / caposquadra: app completa
      if(profilo.ruolo === "admin" || profilo.ruolo === "caposquadra"){
        document.body.classList.add("admin-view");
        document.body.classList.remove("worker-view");
        try {
          adminUnlocked = true;
          sessionStorage.setItem("tecnoplafonAdminUnlocked","1");
        } catch(e){}
        if(typeof showSection === "function") showSection("admin");
      } else {
        // Collaboratore: vista operaio
        document.body.classList.add("worker-view");
        document.body.classList.remove("admin-view");
        try {
          adminUnlocked = false;
          sessionStorage.removeItem("tecnoplafonAdminUnlocked");
        } catch(e){}
        if(typeof showSection === "function") showSection("operaio");
      }

    }catch(ex){
      tpLoginError("Errore: " + (ex.message || ex));
    }

    if(btn) btn.disabled = false;
  };

  window.logoutSupabaseTotale = async function(){
    try { await supabaseClient.auth.signOut(); } catch(e){}
    tpShowLogin();
  };

  // All'apertura mostra sempre il login, così non usa vecchie sessioni/browser.
  document.addEventListener("DOMContentLoaded", function(){
    tpShowLogin();
  });

/* ===== Blocco JavaScript estratto dal file originale ===== */

(function(){
  function getSupabaseClient(){
    return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  }

  async function upsertClienteSupabase(nomeCliente){
    const sb = getSupabaseClient();
    if (!sb) throw new Error("Supabase non collegato");

    const nome = String(nomeCliente || "").trim();
    if (!nome) return null;

    const { data: existing, error: selErr } = await sb
      .from("clienti")
      .select("id,nome")
      .eq("nome", nome)
      .maybeSingle();

    if (selErr) throw selErr;
    if (existing) return existing.id;

    const { data, error } = await sb
      .from("clienti")
      .insert({ nome })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function salvaCantiereSupabase(c){
    const sb = getSupabaseClient();
    if (!sb) throw new Error("Supabase non collegato");

    const { data: userData } = await sb.auth.getUser();
    if (!userData || !userData.user) {
      throw new Error("Devi essere loggato per salvare il cantiere");
    }

    const clienteId = await upsertClienteSupabase(c.cliente);

    const payload = {
      cliente_id: clienteId,
      nome: c.nome,
      indirizzo: c.indirizzo || "",
      km: Number(c.km || 0),
      ore_previste: Number(c.orePreviste || 0),
      ore_reali: Number(c.oreReali || 0),
      stato: c.stato || "Attivo"
    };

    const { data: existing, error: findErr } = await sb
      .from("cantieri")
      .select("id")
      .eq("nome", c.nome)
      .maybeSingle();

    if (findErr) throw findErr;

    let result;
    if (existing) {
      result = await sb
        .from("cantieri")
        .update(payload)
        .eq("id", existing.id)
        .select("id,nome")
        .single();
    } else {
      result = await sb
        .from("cantieri")
        .insert(payload)
        .select("id,nome")
        .single();
    }

    if (result.error) throw result.error;
    return result.data;
  }

  window.caricaCantieriDaSupabase = async function(){
    const sb = getSupabaseClient();
    if (!sb) return;

    const { data, error } = await sb
      .from("cantieri")
      .select("id,nome,indirizzo,km,ore_previste,ore_reali,stato,clienti(nome)")
      .order("nome", { ascending: true });

    if (error) {
      console.warn("Errore caricamento cantieri Supabase:", error.message);
      return;
    }

    if (!window.adminData) window.adminData = {};
    window.adminData.cantieri = (data || []).map(row => ({
      id: row.id,
      nome: row.nome,
      cliente: row.clienti && row.clienti.nome ? row.clienti.nome : "",
      indirizzo: row.indirizzo || "",
      km: Number(row.km || 0),
      orePreviste: Number(row.ore_previste || 0),
      oreReali: Number(row.ore_reali || 0),
      stato: row.stato || "Attivo"
    }));

    if (typeof adminSave === "function") adminSave();
    if (typeof renderAdminData === "function") renderAdminData();
    if (typeof renderWorkerTimesheet === "function") renderWorkerTimesheet();
    if (typeof popolaLinkedHoursFilters === "function") popolaLinkedHoursFilters();
  };

  window.aggiungiCantiereAdmin = async function(){
    const nome = document.getElementById("adminNomeCantiere")?.value.trim();
    if(!nome){ alert("Inserisci il nome del cantiere."); return; }

    const c = {
      nome,
      cliente: document.getElementById("adminClienteCantiere")?.value.trim() || "",
      indirizzo: document.getElementById("adminIndirizzoCantiere")?.value.trim() || "",
      km: Number(document.getElementById("adminKmCantiere")?.value || 0),
      orePreviste: 0,
      oreReali: 0,
      stato: document.getElementById("adminStatoCantiere")?.value || "Attivo"
    };

    try {
      await salvaCantiereSupabase(c);
      await window.caricaCantieriDaSupabase();

      document.getElementById("adminNomeCantiere").value = "";
      document.getElementById("adminClienteCantiere").value = "";
      document.getElementById("adminIndirizzoCantiere").value = "";

      alert("Cantiere salvato in Supabase.");
    } catch (err) {
      alert("Errore salvataggio cantiere Supabase: " + (err.message || err));
      console.error(err);
    }
  };

  window.aggiungiCantiereDaSezione = async function(){
    const nome = document.getElementById("cantNome")?.value.trim();
    if(!nome){ alert("Inserisci il nome del cantiere."); return; }

    const c = {
      nome,
      cliente: document.getElementById("cantCliente")?.value.trim() || "",
      indirizzo: document.getElementById("cantIndirizzo")?.value.trim() || "",
      km: Number(document.getElementById("cantKm")?.value || 0),
      orePreviste: Number(document.getElementById("cantOrePreviste")?.value || 0),
      oreReali: 0,
      stato: document.getElementById("cantStato")?.value || "Attivo"
    };

    try {
      await salvaCantiereSupabase(c);
      await window.caricaCantieriDaSupabase();

      document.getElementById("cantNome").value = "";
      alert("Cantiere salvato in Supabase.");
    } catch (err) {
      alert("Errore salvataggio cantiere Supabase: " + (err.message || err));
      console.error(err);
    }
  };

  // Carica i cantieri dopo login admin
  const oldTpFullLoginSubmit = window.tpFullLoginSubmit;
  if (typeof oldTpFullLoginSubmit === "function") {
    window.tpFullLoginSubmit = async function(){
      await oldTpFullLoginSubmit.apply(this, arguments);
      setTimeout(function(){
        if (document.body.classList.contains("tp-auth-ok")) {
          window.caricaCantieriDaSupabase();
        }
      }, 700);
    };
  }

  window.addEventListener("load", function(){
    setTimeout(function(){
      const sb = getSupabaseClient();
      if (sb && document.body.classList.contains("tp-auth-ok")) {
        window.caricaCantieriDaSupabase();
      }
    }, 1500);
  });
})();

/* ===== Blocco JavaScript estratto dal file originale ===== */

(function(){
  function getSB(){
    return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  }

  function normalizzaCantiere(row){
    return {
      id: row.id,
      nome: row.nome,
      cliente: row.clienti && row.clienti.nome ? row.clienti.nome : "",
      indirizzo: row.indirizzo || "",
      km: Number(row.km || 0),
      orePreviste: Number(row.ore_previste || 0),
      oreReali: Number(row.ore_reali || 0),
      stato: row.stato || "Attivo"
    };
  }

  function riempiSelectCantieriDaLista(cantieri){
    const possibiliSelect = Array.from(document.querySelectorAll("select")).filter(sel => {
      const id = (sel.id || "").toLowerCase();
      const name = (sel.name || "").toLowerCase();
      const label = sel.closest(".f12,.f6,.f4,.f3,div")?.querySelector("label")?.textContent?.toLowerCase() || "";
      return id.includes("cant") || id.includes("cantiere") || name.includes("cant") || label.includes("cantiere");
    });

    possibiliSelect.forEach(sel => {
      const valorePrima = sel.value;
      const primaOpzioneVuota = sel.querySelector("option[value='']") ? true : false;

      sel.innerHTML = "";

      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Seleziona cantiere";
      sel.appendChild(opt0);

      cantieri
        .filter(c => String(c.stato || "").toLowerCase() === "attivo")
        .forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.nome;
          opt.textContent = c.nome;
          opt.dataset.id = c.id || "";
          opt.dataset.km = c.km || 0;
          opt.dataset.cliente = c.cliente || "";
          sel.appendChild(opt);
        });

      if (valorePrima && Array.from(sel.options).some(o => o.value === valorePrima)) {
        sel.value = valorePrima;
      }
    });
  }

  window.caricaCantieriPerTuttiDaSupabase = async function(){
    const sb = getSB();
    if (!sb) {
      console.warn("Supabase non pronto per caricare i cantieri.");
      return;
    }

    const { data, error } = await sb
      .from("cantieri")
      .select("id,nome,indirizzo,km,ore_previste,ore_reali,stato,clienti(nome)")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore lettura cantieri Supabase:", error);
      alert("Errore lettura cantieri Supabase: " + error.message);
      return;
    }

    const lista = (data || []).map(normalizzaCantiere);

    window.adminData = window.adminData || {};
    window.adminData.cantieri = lista;

    if (typeof adminSave === "function") {
      try { adminSave(); } catch(e){}
    }

    riempiSelectCantieriDaLista(lista);

    [
      "renderAdminData",
      "renderWorkerTimesheet",
      "popolaLinkedHoursFilters",
      "popolaRaccoltaOperaiSelect",
      "renderRaccoltaOperai",
      "renderAndamentoCantiere"
    ].forEach(fn => {
      if (typeof window[fn] === "function") {
        try { window[fn](); } catch(e){}
      }
    });

    // Alcune funzioni vecchie ricostruiscono i select dopo il render: riempi di nuovo.
    setTimeout(() => riempiSelectCantieriDaLista(lista), 300);
    setTimeout(() => riempiSelectCantieriDaLista(lista), 900);

    console.log("Cantieri caricati per admin/collaboratore:", lista);
  };

  // aggancia il caricamento dopo il login
  function avviaCaricamentoCantieri(){
    setTimeout(function(){
      if (
        document.body.classList.contains("tp-auth-ok") ||
        document.body.classList.contains("tp-login-ok") ||
        document.body.classList.contains("tp-ok") ||
        document.body.classList.contains("app-ready")
      ) {
        window.caricaCantieriPerTuttiDaSupabase();
      }
    }, 600);
  }

  const oldFull = window.tpFullLoginSubmit;
  if (typeof oldFull === "function") {
    window.tpFullLoginSubmit = async function(){
      await oldFull.apply(this, arguments);
      avviaCaricamentoCantieri();
    };
  }

  const oldFinal = window.tpFinalLogin;
  if (typeof oldFinal === "function") {
    window.tpFinalLogin = async function(){
      await oldFinal.apply(this, arguments);
      avviaCaricamentoCantieri();
    };
  }

  window.addEventListener("load", function(){
    setTimeout(avviaCaricamentoCantieri, 1200);
  });

  document.addEventListener("click", function(){
    // Se un render cambia i select, li ricarichiamo leggermente dopo.
    if (window.adminData && Array.isArray(window.adminData.cantieri)) {
      setTimeout(() => riempiSelectCantieriDaLista(window.adminData.cantieri), 250);
    }
  });
})();

/* ===== Blocco JavaScript estratto dal file originale ===== */

(function(){
  const ADMIN_EMAIL_RICHIESTE = "info@tecnoplafon.ch";

  function getProfiloLocale(){
    // Non facciamo await qui, così Safari/iPhone non blocca l'apertura mailto.
    const p = window.supabaseProfiloCorrente || {};
    return {
      nome: p.nome || "Collaboratore",
      email: p.email || ""
    };
  }

  function formatDataSvizzera(value){
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y,m,d] = v.split("-");
      return `${d}.${m}.${y}`;
    }
    return v;
  }

  function oggiIso(){
    return new Date().toISOString().slice(0,10);
  }

  window.tpAggiornaLabelQuantita = function(){
    const conteggio = document.getElementById("tpReqConteggio")?.value || "giorni";
    const label = document.getElementById("tpReqQuantitaLabel");
    const input = document.getElementById("tpReqQuantita");
    if (!label || !input) return;

    if (conteggio === "ore") {
      label.textContent = "Numero ore";
      input.placeholder = "Es. 4 oppure 8.5";
      input.step = "0.25";
    } else {
      label.textContent = "Numero giorni";
      input.placeholder = "Es. 1";
      input.step = "0.5";
    }
  };

  window.tpApriRichiestaModal = function(){
    const modal = document.getElementById("tpRequestModal");
    const dataDa = document.getElementById("tpReqDataDa");
    const dataA = document.getElementById("tpReqDataA");
    const qta = document.getElementById("tpReqQuantita");
    const note = document.getElementById("tpReqNote");
    const help = document.getElementById("tpReqHelp");

    if (dataDa && !dataDa.value) dataDa.value = oggiIso();
    if (dataA && !dataA.value) dataA.value = dataDa?.value || oggiIso();
    if (qta && !qta.value) qta.value = "1";
    if (note) note.value = "";
    if (help) help.style.display = "none";

    tpAggiornaLabelQuantita();

    if (modal) modal.classList.add("open");
  };

  window.tpChiudiRichiestaModal = function(){
    const modal = document.getElementById("tpRequestModal");
    if (modal) modal.classList.remove("open");
  };

  function creaMailtoRichiesta(){
    const profilo = getProfiloLocale();

    const nome = profilo.nome || "Collaboratore";
    const email = profilo.email || "";

    const tipo = document.getElementById("tpReqTipo")?.value || "Richiesta";
    const conteggio = document.getElementById("tpReqConteggio")?.value || "giorni";
    const quantita = document.getElementById("tpReqQuantita")?.value || "";
    const dataDa = document.getElementById("tpReqDataDa")?.value || "";
    const dataA = document.getElementById("tpReqDataA")?.value || "";
    const note = document.getElementById("tpReqNote")?.value || "";

    if (!quantita) {
      alert("Inserisci il numero di " + (conteggio === "ore" ? "ore." : "giorni."));
      return null;
    }

    const periodo = dataA && dataA !== dataDa
      ? `Dal ${formatDataSvizzera(dataDa)} al ${formatDataSvizzera(dataA)}`
      : (dataDa ? formatDataSvizzera(dataDa) : "-");

    const quantitaLabel = conteggio === "ore"
      ? `${quantita} ore`
      : `${quantita} giorni`;

    const inviatoIl = new Date().toLocaleString("it-CH");
    const subject = `Tecnoplafon - Richiesta ${tipo} - ${nome}`;

    const body = [
      "NUOVA RICHIESTA COLLABORATORE",
      "Tecnoplafon - Gestione Ore",
      "",
      "----------------------------------------",
      "DATI COLLABORATORE",
      "----------------------------------------",
      `Nome: ${nome}`,
      email ? `Email: ${email}` : "",
      "",
      "----------------------------------------",
      "DETTAGLIO RICHIESTA",
      "----------------------------------------",
      `Tipo richiesta: ${tipo}`,
      `Conteggio: ${conteggio === "ore" ? "Ore" : "Giorni"}`,
      `Quantità richiesta: ${quantitaLabel}`,
      `Data / periodo: ${periodo}`,
      note ? `Note: ${note}` : "Note: -",
      "",
      "----------------------------------------",
      "GESTIONE ADMIN",
      "----------------------------------------",
      "Stato: DA CONTROLLARE",
      "",
      `Richiesta inviata il: ${inviatoIl}`,
      "",
      "Aprire l'area admin dell'app Tecnoplafon per approvare o rifiutare la richiesta."
    ].filter(Boolean).join("\n");

    return `mailto:${encodeURIComponent(ADMIN_EMAIL_RICHIESTE)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  window.tpApriEmailRichiestaSubito = function(){
    const mailto = creaMailtoRichiesta();
    if (!mailto) return;

    const help = document.getElementById("tpReqHelp");

    // Metodo più compatibile con iPhone/Safari: click diretto su link mailto creato al momento del click utente.
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(function(){
      try { document.body.removeChild(a); } catch(e){}
    }, 300);

    // Fallback ulteriore
    setTimeout(function(){
      if (help) help.style.display = "block";
    }, 900);

    tpChiudiRichiestaModal();
  };

  // Non apriamo la email quando si toccano campi/select.
  // L'email parte solo dal pulsante "Apri email".

  function collegaBottoneVacanzeAllaRichiesta(){
    // Rimuove il bottone separato se era stato creato da versioni precedenti.
    document.querySelectorAll(".tp-email-richiesta-btn").forEach(btn => btn.remove());

    const elementi = Array.from(document.querySelectorAll("button, a, .tab, .nav-btn, [role='button']"));

    elementi.forEach(el => {
      const testo = [
        el.innerText || "",
        el.textContent || "",
        el.id || "",
        el.className || "",
        el.getAttribute("aria-label") || "",
        el.getAttribute("title") || ""
      ].join(" ").toLowerCase();

      const eBottoneVacanze =
        testo.includes("vacanz") ||
        testo.includes("ferie") ||
        testo.includes("permess") ||
        testo.includes("ore libere") ||
        testo.includes("assen");

      // Evita di collegare il bottone interno "Apri email", annulla, ecc.
      const eBottoneInternoModal =
        el.closest("#tpRequestModal") ||
        testo.includes("apri email") ||
        testo.includes("prepara email") ||
        testo.includes("annulla");

      if (eBottoneVacanze && !eBottoneInternoModal && !el.dataset.tpRichiestaCollegata) {
        el.dataset.tpRichiestaCollegata = "1";

        el.addEventListener("click", function(ev){
          // Lascia cambiare schermata/tab e poi apre la finestra richiesta.
          setTimeout(function(){
            tpApriRichiestaModal();
          }, 250);
        });
      }
    });
  }

  window.addEventListener("load", function(){
    setTimeout(collegaBottoneVacanzeAllaRichiesta, 800);
    setTimeout(collegaBottoneVacanzeAllaRichiesta, 1800);
  });

  document.addEventListener("click", function(){
    // Se l'app ricostruisce i menu, ricollega dopo il click.
    setTimeout(collegaBottoneVacanzeAllaRichiesta, 300);
  });
})();

/* ===== Blocco JavaScript estratto dal file originale ===== */

/* LOGOUT DEFINITIVO TECNOPLAFON */
window.tpLogoutTecnoplafonFinale = async function(){
  try {
    const sb = window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
    if (sb && sb.auth) {
      await sb.auth.signOut();
    }
  } catch(e) {
    console.warn("Errore durante logout Supabase:", e);
  }

  try { sessionStorage.clear(); } catch(e) {}

  // Tolgo tutte le classi che tengono aperta l'app.
  document.body.classList.remove("tp-auth-ok");
  document.body.classList.remove("tp-login-ok");
  document.body.classList.remove("tp-ok");
  document.body.classList.remove("tp-logged-in");
  document.body.classList.remove("app-ready");
  document.body.classList.remove("admin-view");
  document.body.classList.remove("worker-view");

  // Ricarico la pagina così torna sicuramente alla schermata login pulita.
  setTimeout(function(){
    window.location.reload();
  }, 150);
};

/* ===== Blocco JavaScript estratto dal file originale ===== */

(function(){
  function tpSb(){
    return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  }

  function tpEsc(v){
    return String(v == null ? "" : v)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  function tpNormCantiere(row){
    return {
      id: row.id,
      nome: row.nome || "",
      cliente: row.clienti && row.clienti.nome ? row.clienti.nome : (row.cliente || ""),
      indirizzo: row.indirizzo || "",
      km: Number(row.km || 0),
      orePreviste: Number(row.ore_previste || row.orePreviste || 0),
      oreReali: Number(row.ore_reali || row.oreReali || 0),
      stato: row.stato || "Attivo"
    };
  }

  function tpListaCantieri(){
    try{
      if (typeof adminData !== "undefined" && adminData && Array.isArray(adminData.cantieri)) return adminData.cantieri;
    }catch(e){}
    return [];
  }

  function tpSetSelect(id, lista, opts){
    const sel = document.getElementById(id);
    if(!sel) return;
    opts = opts || {};
    const old = sel.value;
    let html = "";
    if(opts.allLabel){
      html += `<option value="__ALL__">${tpEsc(opts.allLabel)}</option>`;
    }else if(opts.emptyLabel){
      html += `<option value="">${tpEsc(opts.emptyLabel)}</option>`;
    }
    html += lista.map(c => {
      const label = opts.withStatus ? `${c.nome}${c.stato === "Attivo" ? " - attivo" : " - " + c.stato}` : c.nome;
      const value = opts.valueWithStatus ? label : c.nome;
      return `<option value="${tpEsc(value)}" data-id="${tpEsc(c.id||"")}" data-km="${tpEsc(c.km||0)}" data-cliente="${tpEsc(c.cliente||"")}">${tpEsc(label)}</option>`;
    }).join("");
    sel.innerHTML = html;
    if([...sel.options].some(o => o.value === old)) sel.value = old;
    else if(opts.allLabel) sel.value = "__ALL__";
  }

  function tpRenderCustomBox(boxId, lista, onChangeName){
    const box = document.getElementById(boxId);
    if(!box) return;
    const old = new Set([...box.querySelectorAll('input[type="checkbox"]:checked')].map(i => i.value));
    const selected = old.size ? old : new Set(lista.map(c => c.nome));
    box.innerHTML = lista.map(c => {
      const checked = selected.has(c.nome) ? "checked" : "";
      return `<label data-text="${tpEsc(c.nome.toLowerCase())}">
        <input type="checkbox" value="${tpEsc(c.nome)}" ${checked} onchange="${onChangeName}()">
        <span>${tpEsc(c.nome)}</span>
      </label>`;
    }).join("");
  }

  function tpAggiornaCantieriOvunque(){
    const tutti = tpListaCantieri().filter(c => c && c.nome).sort((a,b)=>String(a.nome).localeCompare(String(b.nome), "it"));
    const attivi = tutti.filter(c => String(c.stato || "").toLowerCase() === "attivo");

    // Solo campi cantiere veri: non tocca Stato, Categoria o altri select.
    tpSetSelect("operaioCantiereSelect", attivi, {emptyLabel:"Seleziona cantiere"});
    tpSetSelect("mCantiere", attivi, {emptyLabel:"Seleziona cantiere"});
    tpSetSelect("adminOreCantiere", tutti, {emptyLabel:"Seleziona cantiere"});
    tpSetSelect("econCantiere", tutti, {emptyLabel:"Seleziona cantiere"});
    tpSetSelect("raccoltaCantiereSelect", tutti, {allLabel:"Tutti i cantieri"});

    tpRenderCustomBox("trendCantieriBox", tutti, "renderAndamentoCantiere");
    tpRenderCustomBox("linkedOreCantieriBox", tutti, "renderLinkedHoursPanel");

    [
      "renderAdminData",
      "renderWorkerTimesheet",
      "renderEconomia",
      "renderRaccoltaOperai",
      "renderAndamentoCantiere",
      "renderLinkedHoursPanel",
      "renderAdminPresenzeOggi"
    ].forEach(fn => {
      if(typeof window[fn] === "function"){
        try{ window[fn](); }catch(e){ console.warn("Errore render", fn, e); }
      }
    });

    // Alcuni render ricostruiscono filtri/select: reinserisco subito dopo, ma sempre solo sui campi cantiere veri.
    setTimeout(function(){
      tpSetSelect("operaioCantiereSelect", attivi, {emptyLabel:"Seleziona cantiere"});
      tpSetSelect("mCantiere", attivi, {emptyLabel:"Seleziona cantiere"});
      tpSetSelect("adminOreCantiere", tutti, {emptyLabel:"Seleziona cantiere"});
      tpSetSelect("econCantiere", tutti, {emptyLabel:"Seleziona cantiere"});
      tpSetSelect("raccoltaCantiereSelect", tutti, {allLabel:"Tutti i cantieri"});
      tpRenderCustomBox("trendCantieriBox", tutti, "renderAndamentoCantiere");
      tpRenderCustomBox("linkedOreCantieriBox", tutti, "renderLinkedHoursPanel");
    }, 250);
  }

  async function tpCaricaCantieriSupabaseCompleto(){
    const sb = tpSb();
    if(!sb) return [];

    const { data, error } = await sb
      .from("cantieri")
      .select("id,nome,indirizzo,km,ore_previste,ore_reali,stato,clienti(nome)")
      .order("nome", { ascending:true });

    if(error){
      console.error("Errore lettura cantieri Supabase:", error);
      alert("Errore lettura cantieri Supabase: " + error.message);
      return [];
    }

    const lista = (data || []).map(tpNormCantiere);

    // FIX principale: aggiorna la variabile usata dalla tabella Cantieri e dalle regole km.
    try{
      if(typeof adminData !== "undefined"){
        adminData.cantieri = lista;
        if(typeof adminSave === "function") adminSave();
      }
    }catch(e){ console.warn("Impossibile aggiornare adminData.cantieri", e); }

    // Disattiva il vecchio listener che riempiva qualunque select con 'cant' nell'id, compreso Stato.
    try{ window.adminData = null; }catch(e){}

    tpAggiornaCantieriOvunque();
    console.log("Cantieri Supabase aggiornati in tutta l'app:", lista);
    return lista;
  }

  window.tpCaricaCantieriSupabaseCompleto = tpCaricaCantieriSupabaseCompleto;
  window.caricaCantieriDaSupabase = tpCaricaCantieriSupabaseCompleto;
  window.caricaCantieriPerTuttiDaSupabase = tpCaricaCantieriSupabaseCompleto;
  window.tpAggiornaCantieriOvunque = tpAggiornaCantieriOvunque;

  const oldLogin = window.tpFullLoginSubmit;
  if(typeof oldLogin === "function" && !oldLogin.__tpCantieriV48){
    const patched = async function(){
      const out = await oldLogin.apply(this, arguments);
      setTimeout(tpCaricaCantieriSupabaseCompleto, 500);
      setTimeout(tpCaricaCantieriSupabaseCompleto, 1500);
      return out;
    };
    patched.__tpCantieriV48 = true;
    window.tpFullLoginSubmit = patched;
  }

  window.addEventListener("load", function(){
    setTimeout(function(){
      if(document.body.classList.contains("tp-auth-ok")) tpCaricaCantieriSupabaseCompleto();
    }, 900);
  });
})();

/* ===== Blocco JavaScript estratto dal file originale ===== */

(function(){
  function tpRacEsc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function tpUniqSorted(values){
    return Array.from(new Set((values || []).map(v => String(v || "").trim()).filter(Boolean)))
      .sort(function(a,b){ return a.localeCompare(b, "it"); });
  }
  function tpRowsOre(){
    try{ return Array.isArray(economia && economia.ore) ? economia.ore : []; }catch(e){ return []; }
  }
  function tpWorkerEntries(){
    try{ return Object.values((workerTimesheet && workerTimesheet.entries) || {}); }catch(e){ return []; }
  }
  function tpCantieriRaccoltaCompleti(){
    var daAdmin = [];
    try{ daAdmin = Array.isArray(adminData && adminData.cantieri) ? adminData.cantieri.map(function(c){ return c.nome; }) : []; }catch(e){}
    var daOre = tpRowsOre().map(function(r){ return r.cantiere || ""; });
    var daWorker = tpWorkerEntries().map(function(e){ return e.cantiere || ""; });
    return tpUniqSorted([].concat(daAdmin, daOre, daWorker));
  }
  function tpLavorazioniRaccoltaComplete(){
    var daMappa = [];
    try{
      if(typeof lavorazioni !== "undefined" && lavorazioni){
        Object.keys(lavorazioni).forEach(function(k){ daMappa = daMappa.concat(lavorazioni[k] || []); });
      }
    }catch(e){}
    var daOre = tpRowsOre().map(function(r){ return r.lavorazione || ""; });
    var daWorker = tpWorkerEntries().map(function(e){ return e.lavorazione || ""; });
    var daSelect = [];
    ["lavorazioneSelect","mLavorazione"].forEach(function(id){
      var sel = document.getElementById(id);
      if(sel) daSelect = daSelect.concat(Array.from(sel.options).map(function(o){ return o.value || o.textContent || ""; }));
    });
    return tpUniqSorted([].concat(daMappa, daOre, daWorker, daSelect));
  }
  function tpRiempiSelect(id, allLabel, values){
    var sel = document.getElementById(id);
    if(!sel) return;
    var old = sel.value || "__ALL__";
    var opts = tpUniqSorted(values);
    sel.innerHTML = '<option value="__ALL__">' + tpRacEsc(allLabel) + '</option>' +
      opts.map(function(v){ return '<option value="' + tpRacEsc(v) + '">' + tpRacEsc(v) + '</option>'; }).join("");
    if(Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    else sel.value = "__ALL__";
  }

  var oldPopolaRaccoltaFiltri = window.popolaRaccoltaFiltri;
  window.popolaRaccoltaFiltri = function(){
    var cantieriCompleti = tpCantieriRaccoltaCompleti();
    var lavorazioniComplete = tpLavorazioniRaccoltaComplete();

    // Se ci sono righe ore nel mese/collaboratore scelto, le aggiungo comunque, ma non limito piu' il filtro solo a quelle.
    try{
      var base = (typeof raccoltaRowsMese === "function") ? raccoltaRowsMese() : [];
      var coll = document.getElementById("raccoltaOperaioSelect")?.value || "__ALL__";
      var baseColl = base.filter(function(r){ return coll === "__ALL__" || r.collaboratore === coll; });
      cantieriCompleti = tpUniqSorted(cantieriCompleti.concat(baseColl.map(function(r){ return r.cantiere || "Senza cantiere"; })));
      lavorazioniComplete = tpUniqSorted(lavorazioniComplete.concat(baseColl.map(function(r){ return r.lavorazione || "Senza lavorazione"; })));
    }catch(e){}

    tpRiempiSelect("raccoltaCantiereSelect", "Tutti i cantieri", cantieriCompleti);
    tpRiempiSelect("raccoltaLavorazioneSelect", "Tutte le lavorazioni", lavorazioniComplete);
  };

  function tpFixRaccoltaDopoRender(){
    try{
      if(typeof window.popolaRaccoltaFiltri === "function") window.popolaRaccoltaFiltri();
    }catch(e){}
  }

  var oldRenderRaccolta = window.renderRaccoltaOperai;
  if(typeof oldRenderRaccolta === "function" && !oldRenderRaccolta.__tpV49Raccolta){
    var patched = function(){
      var out = oldRenderRaccolta.apply(this, arguments);
      tpFixRaccoltaDopoRender();
      setTimeout(tpFixRaccoltaDopoRender, 100);
      return out;
    };
    patched.__tpV49Raccolta = true;
    window.renderRaccoltaOperai = patched;
  }

  var oldAggiornaCantieri = window.tpAggiornaCantieriOvunque;
  if(typeof oldAggiornaCantieri === "function" && !oldAggiornaCantieri.__tpV49Raccolta){
    var patchedAgg = function(){
      var out = oldAggiornaCantieri.apply(this, arguments);
      tpFixRaccoltaDopoRender();
      setTimeout(tpFixRaccoltaDopoRender, 250);
      return out;
    };
    patchedAgg.__tpV49Raccolta = true;
    window.tpAggiornaCantieriOvunque = patchedAgg;
  }

  window.tpFixRaccoltaOperaiFiltri = tpFixRaccoltaDopoRender;
  window.addEventListener("load", function(){
    setTimeout(tpFixRaccoltaDopoRender, 800);
    setTimeout(tpFixRaccoltaDopoRender, 1800);
  });
})();

/* ===== v50 - Collaboratori salvati e ricaricati da Supabase ===== */
(function(){
  function tpCollSb(){
    return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  }

  function tpCollRuoloDb(ruolo){
    var r = String(ruolo || "").toLowerCase().trim();
    if(r.indexOf("capo") >= 0) return "caposquadra";
    if(r.indexOf("admin") >= 0) return "admin";
    return "operaio";
  }

  function tpCollRuoloApp(ruolo){
    var r = String(ruolo || "").toLowerCase().trim();
    if(r === "caposquadra" || r.indexOf("capo") >= 0) return "Caposquadra";
    if(r === "admin") return "Admin";
    return "Operaio";
  }

  function tpCollNorm(row){
    return {
      id: row.id || "",
      nome: row.nome || "",
      email: row.email || "",
      ruolo: tpCollRuoloApp(row.ruolo),
      stato: row.stato || "Attivo",
      password: "",
      maxOre: Number(row.max_ore_giorno || row.maxOre || 10)
    };
  }

  async function tpSalvaCollaboratoreSupabase(o){
    var sb = tpCollSb();
    if(!sb) throw new Error("Supabase non collegato");

    var payload = {
      nome: o.nome || "",
      email: o.email || null,
      ruolo: tpCollRuoloDb(o.ruolo),
      stato: o.stato || "Attivo",
      max_ore_giorno: Number(o.maxOre || 10)
    };

    var existing = null;
    if(o.email){
      var byEmail = await sb.from("profili").select("id").eq("email", o.email).maybeSingle();
      if(byEmail.error) throw byEmail.error;
      existing = byEmail.data;
    }
    if(!existing && o.nome){
      var byName = await sb.from("profili").select("id").eq("nome", o.nome).maybeSingle();
      if(byName.error) throw byName.error;
      existing = byName.data;
    }

    var res;
    if(existing && existing.id){
      res = await sb.from("profili").update(payload).eq("id", existing.id).select("id,nome,email,ruolo,stato,max_ore_giorno").single();
    }else{
      res = await sb.from("profili").insert(payload).select("id,nome,email,ruolo,stato,max_ore_giorno").single();
    }
    if(res.error) throw res.error;
    return res.data;
  }

  async function tpCaricaCollaboratoriSupabaseCompleto(){
    var sb = tpCollSb();
    if(!sb) return [];
    var res = await sb
      .from("profili")
      .select("id,nome,email,ruolo,stato,max_ore_giorno")
      .order("nome", { ascending:true });

    if(res.error){
      console.warn("Errore lettura collaboratori Supabase:", res.error.message);
      return [];
    }

    var lista = (res.data || []).map(tpCollNorm).filter(function(o){ return o.nome; });
    try{
      if(typeof adminData !== "undefined" && adminData){
        adminData.operai = lista;
        if(typeof adminSave === "function") adminSave();
      }
    }catch(e){ console.warn("Impossibile aggiornare adminData.operai", e); }

    try{ if(typeof renderAdminData === "function") renderAdminData(); }catch(e){}
    try{ if(typeof renderWorkerTimesheet === "function") renderWorkerTimesheet(); }catch(e){}
    try{ if(typeof popolaRaccoltaOperaiSelect === "function") popolaRaccoltaOperaiSelect(); }catch(e){}
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
    return lista;
  }

  function tpUpsertCollaboratoreLocale(o){
    if(typeof adminData === "undefined" || !adminData) return;
    if(!Array.isArray(adminData.operai)) adminData.operai = [];
    var idx = adminData.operai.findIndex(function(x){
      return String(x.nome || "").toLowerCase() === String(o.nome || "").toLowerCase();
    });
    if(idx >= 0) adminData.operai[idx] = Object.assign({}, adminData.operai[idx], o);
    else adminData.operai.push(o);
    if(typeof adminSave === "function") adminSave();
  }

  async function tpCreaCollaboratoreComune(o, nomeFieldId, label){
    tpUpsertCollaboratoreLocale(o);
    try{ if(typeof renderAdminData === "function") renderAdminData(); }catch(e){}

    try{
      await tpSalvaCollaboratoreSupabase(o);
      await tpCaricaCollaboratoriSupabaseCompleto();
      var f = document.getElementById(nomeFieldId);
      if(f) f.value = "";
      alert(label + " salvato anche su Supabase.");
    }catch(e){
      console.error("Errore salvataggio collaboratore Supabase:", e);
      alert(label + " salvato solo localmente. Errore Supabase: " + (e.message || e));
    }
  }

  window.aggiungiOperaioAdmin = async function(){
    var nome = document.getElementById("adminNomeOperaio")?.value.trim();
    if(!nome){ alert("Inserisci il nome dell'operaio."); return; }
    var o = {
      nome: nome,
      email: document.getElementById("adminEmailOperaio")?.value.trim() || "",
      ruolo: document.getElementById("adminRuoloOperaio")?.value || "Operaio",
      stato: document.getElementById("adminStatoOperaio")?.value || "Attivo",
      password: document.getElementById("adminPasswordOperaio")?.value || "",
      maxOre: Number(document.getElementById("adminMaxOreOperaio")?.value || 10)
    };
    await tpCreaCollaboratoreComune(o, "adminNomeOperaio", "Operaio");
  };

  window.aggiungiOperaioDaSezione = async function(){
    var nome = document.getElementById("collNome")?.value.trim();
    if(!nome){ alert("Inserisci il nome del collaboratore."); return; }
    var o = {
      nome: nome,
      email: document.getElementById("collEmail")?.value.trim() || "",
      ruolo: document.getElementById("collRuolo")?.value || "Operaio",
      stato: document.getElementById("collStato")?.value || "Attivo",
      password: document.getElementById("collPassword")?.value || "",
      maxOre: Number(document.getElementById("collMaxOre")?.value || 10)
    };
    await tpCreaCollaboratoreComune(o, "collNome", "Collaboratore");
  };

  var oldCambiaStatoOperaio = window.cambiaStatoOperaio;
  window.cambiaStatoOperaio = async function(nome, stato){
    var o = null;
    try{
      o = (adminData.operai || []).find(function(x){ return x.nome === nome; });
      if(o){ o.stato = stato; if(stato === "Terminato") o.maxOre = 0; adminSave(); renderAdminData(); }
    }catch(e){ if(typeof oldCambiaStatoOperaio === "function") oldCambiaStatoOperaio(nome, stato); }
    if(o){
      try{
        await tpSalvaCollaboratoreSupabase(o);
        await tpCaricaCollaboratoriSupabaseCompleto();
      }catch(e){
        console.warn("Stato collaboratore aggiornato solo localmente:", e.message || e);
      }
    }
  };

  var oldLogin = window.tpFullLoginSubmit;
  if(typeof oldLogin === "function" && !oldLogin.__tpCollaboratoriV50){
    var patchedLogin = async function(){
      var out = await oldLogin.apply(this, arguments);
      setTimeout(tpCaricaCollaboratoriSupabaseCompleto, 700);
      setTimeout(tpCaricaCollaboratoriSupabaseCompleto, 1700);
      return out;
    };
    patchedLogin.__tpCollaboratoriV50 = true;
    window.tpFullLoginSubmit = patchedLogin;
  }

  window.tpSalvaCollaboratoreSupabase = tpSalvaCollaboratoreSupabase;
  window.tpCaricaCollaboratoriSupabaseCompleto = tpCaricaCollaboratoriSupabaseCompleto;
  window.caricaCollaboratoriDaSupabase = tpCaricaCollaboratoriSupabaseCompleto;

  window.addEventListener("load", function(){
    setTimeout(function(){
      if(document.body.classList.contains("tp-auth-ok")) tpCaricaCollaboratoriSupabaseCompleto();
    }, 1200);
  });
})();

/* ===== v51 - Salvataggio operai Supabase robusto + diagnostica reale ===== */
(function(){
  function tpSbV51(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function tpSafeTrim(v){ return String(v == null ? "" : v).trim(); }
  function tpRoleDbV51(ruolo){
    var r = tpSafeTrim(ruolo).toLowerCase();
    if(r.indexOf("capo") >= 0) return "caposquadra";
    if(r.indexOf("admin") >= 0) return "admin";
    return "operaio";
  }
  function tpRoleAppV51(ruolo){
    var r = tpSafeTrim(ruolo).toLowerCase();
    if(r === "caposquadra" || r.indexOf("capo") >= 0) return "Caposquadra";
    if(r === "admin") return "Admin";
    return "Operaio";
  }
  function tpErrTextV51(err){
    if(!err) return "Errore sconosciuto.";
    var parts = [];
    if(err.message) parts.push(err.message);
    if(err.code) parts.push("codice: " + err.code);
    if(err.details) parts.push("dettagli: " + err.details);
    if(err.hint) parts.push("suggerimento: " + err.hint);
    return parts.join(" | ") || String(err);
  }
  function tpUuidV51(){
    try{ if(window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){
      var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
  function tpNormProfV51(row){
    row = row || {};
    return {
      id: row.id || "",
      nome: row.nome || row.name || "",
      email: row.email || "",
      ruolo: tpRoleAppV51(row.ruolo || row.role),
      stato: row.stato || row.status || "Attivo",
      password: "",
      maxOre: Number(row.max_ore_giorno || row.maxOre || row.max_ore || 10)
    };
  }
  function tpUpsertLocaleV51(o){
    try{
      if(typeof adminData === "undefined" || !adminData) return;
      if(!Array.isArray(adminData.operai)) adminData.operai = [];
      var nomeLow = tpSafeTrim(o.nome).toLowerCase();
      var emailLow = tpSafeTrim(o.email).toLowerCase();
      var idx = adminData.operai.findIndex(function(x){
        return tpSafeTrim(x.nome).toLowerCase() === nomeLow || (emailLow && tpSafeTrim(x.email).toLowerCase() === emailLow);
      });
      if(idx >= 0) adminData.operai[idx] = Object.assign({}, adminData.operai[idx], o);
      else adminData.operai.push(o);
      if(typeof adminSave === "function") adminSave();
      if(typeof renderAdminData === "function") renderAdminData();
      if(typeof renderWorkerTimesheet === "function") renderWorkerTimesheet();
    }catch(e){ console.warn("Locale collaboratore non aggiornato", e); }
  }
  async function tpFindExistingProfV51(sb, o){
    var cols = "id,nome,email,ruolo,stato,max_ore_giorno";
    var email = tpSafeTrim(o.email);
    var nome = tpSafeTrim(o.nome);
    if(email){
      var rEmail = await sb.from("profili").select(cols).eq("email", email).maybeSingle();
      if(!rEmail.error && rEmail.data) return rEmail.data;
    }
    if(nome){
      var rNome = await sb.from("profili").select(cols).eq("nome", nome).maybeSingle();
      if(!rNome.error && rNome.data) return rNome.data;
    }
    return null;
  }
  async function tpInsertOrUpdateProfV51(sb, o){
    var existing = await tpFindExistingProfV51(sb, o);
    var base = {
      nome: tpSafeTrim(o.nome),
      email: tpSafeTrim(o.email) || null,
      ruolo: tpRoleDbV51(o.ruolo),
      stato: tpSafeTrim(o.stato) || "Attivo",
      max_ore_giorno: Number(o.maxOre || 10)
    };
    var selectCols = "id,nome,email,ruolo,stato,max_ore_giorno";
    if(existing && existing.id){
      var upd = await sb.from("profili").update(base).eq("id", existing.id).select(selectCols).single();
      if(upd.error) throw upd.error;
      return upd.data;
    }

    var candidates = [
      base,
      Object.assign({id: tpUuidV51()}, base),
      {nome: base.nome, email: base.email, ruolo: base.ruolo, stato: base.stato},
      Object.assign({id: tpUuidV51()}, {nome: base.nome, email: base.email, ruolo: base.ruolo, stato: base.stato})
    ];
    var lastErr = null;
    for(var i=0;i<candidates.length;i++){
      var ins = await sb.from("profili").insert(candidates[i]).select(selectCols).single();
      if(!ins.error) return ins.data;
      lastErr = ins.error;
      console.warn("Tentativo salvataggio profili fallito", i+1, candidates[i], ins.error);
      var m = String(ins.error.message || "").toLowerCase();
      var d = String(ins.error.details || "").toLowerCase();
      if(m.indexOf("row-level security") >= 0 || m.indexOf("permission denied") >= 0) break;
      if(m.indexOf("foreign key") >= 0 || d.indexOf("foreign key") >= 0) break;
    }
    throw lastErr || new Error("Inserimento profilo non riuscito.");
  }
  async function tpReloadProfiliV51(){
    var sb = tpSbV51();
    if(!sb) return [];
    var res = await sb.from("profili").select("id,nome,email,ruolo,stato,max_ore_giorno").order("nome", {ascending:true});
    if(res.error) throw res.error;
    var lista = (res.data || []).map(tpNormProfV51).filter(function(x){ return x.nome; });
    try{
      if(typeof adminData !== "undefined" && adminData){
        var byKey = {};
        (adminData.operai || []).forEach(function(o){ byKey[(o.email || o.nome || "").toLowerCase()] = o; });
        lista.forEach(function(o){ byKey[(o.email || o.nome || "").toLowerCase()] = o; });
        adminData.operai = Object.keys(byKey).map(function(k){ return byKey[k]; }).filter(function(o){ return o && o.nome; });
        if(typeof adminSave === "function") adminSave();
      }
      if(typeof renderAdminData === "function") renderAdminData();
      if(typeof popolaRaccoltaOperaiSelect === "function") popolaRaccoltaOperaiSelect();
      if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai();
    }catch(e){ console.warn("Refresh profili UI fallito", e); }
    return lista;
  }
  async function tpSaveOperaioDirettoV51(o, fieldId, label){
    var sb = tpSbV51();
    tpUpsertLocaleV51(o);
    if(!sb){ alert(label + " salvato solo localmente: Supabase non collegato."); return; }
    try{
      await tpInsertOrUpdateProfV51(sb, o);
      await tpReloadProfiliV51();
      var f = document.getElementById(fieldId); if(f) f.value = "";
      alert(label + " salvato su Supabase.");
    }catch(err){
      var txt = tpErrTextV51(err);
      console.error("ERRORE SUPABASE PROFILI COMPLETO:", err);
      alert(label + " salvato solo localmente. Supabase ha risposto: " + txt + "\n\nSe vedi 'foreign key' oppure 'auth.users', devi creare prima l'utente Auth oppure usare una tabella collaboratori separata. Se vedi RLS, manca la policy INSERT/UPDATE sulla tabella profili.");
    }
  }
  window.aggiungiOperaioAdmin = async function(){
    var nome = tpSafeTrim(document.getElementById("adminNomeOperaio")?.value);
    if(!nome){ alert("Inserisci il nome dell'operaio."); return; }
    await tpSaveOperaioDirettoV51({
      nome:nome,
      email: tpSafeTrim(document.getElementById("adminEmailOperaio")?.value),
      ruolo: document.getElementById("adminRuoloOperaio")?.value || "Operaio",
      stato: document.getElementById("adminStatoOperaio")?.value || "Attivo",
      password: document.getElementById("adminPasswordOperaio")?.value || "",
      maxOre: Number(document.getElementById("adminMaxOreOperaio")?.value || 10)
    }, "adminNomeOperaio", "Operaio");
  };
  window.aggiungiOperaioDaSezione = async function(){
    var nome = tpSafeTrim(document.getElementById("collNome")?.value);
    if(!nome){ alert("Inserisci il nome del collaboratore."); return; }
    await tpSaveOperaioDirettoV51({
      nome:nome,
      email: tpSafeTrim(document.getElementById("collEmail")?.value),
      ruolo: document.getElementById("collRuolo")?.value || "Operaio",
      stato: document.getElementById("collStato")?.value || "Attivo",
      password: document.getElementById("collPassword")?.value || "",
      maxOre: Number(document.getElementById("collMaxOre")?.value || 10)
    }, "collNome", "Collaboratore");
  };
  window.tpTestSalvataggioOperaioSupabase = async function(){
    await tpSaveOperaioDirettoV51({nome:"Test Supabase " + new Date().toLocaleTimeString("it-CH"), email:"", ruolo:"Operaio", stato:"Attivo", maxOre:10}, "", "Test operaio");
  };
  window.tpReloadProfiliV51 = tpReloadProfiliV51;
})();

/* ===== v52 - Operai su tabella separata collaboratori (senza foreign key auth.users) =====
   Motivo: public.profili.id è collegato ad auth.users(id), quindi non può creare operai normali.
   Questa versione salva/legge gli operai da public.collaboratori.
*/
(function(){
  function tpSbV52(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function tpTrimV52(v){ return String(v == null ? "" : v).trim(); }
  function tpRoleDbV52(ruolo){
    var r = tpTrimV52(ruolo).toLowerCase();
    if(r.indexOf("capo") >= 0) return "Caposquadra";
    if(r.indexOf("admin") >= 0) return "Admin";
    return "Operaio";
  }
  function tpNormCollV52(row){
    row = row || {};
    return {
      id: row.id || "",
      nome: row.nome || "",
      email: row.email || "",
      ruolo: row.ruolo || "Operaio",
      stato: row.stato || "Attivo",
      password: row.password_app || row.password || "",
      maxOre: Number(row.max_ore_giorno || row.maxOre || 10)
    };
  }
  function tpErrV52(err){
    if(!err) return "Errore sconosciuto";
    var p = [];
    if(err.message) p.push(err.message);
    if(err.code) p.push("codice: " + err.code);
    if(err.details) p.push("dettagli: " + err.details);
    if(err.hint) p.push("suggerimento: " + err.hint);
    return p.join(" | ") || String(err);
  }
  function tpRefreshUiV52(){
    try{ if(typeof adminSave === "function") adminSave(); }catch(e){}
    try{ if(typeof renderAdminData === "function") renderAdminData(); }catch(e){}
    try{ if(typeof renderWorkerTimesheet === "function") renderWorkerTimesheet(); }catch(e){}
    try{ if(typeof popolaRaccoltaOperaiSelect === "function") popolaRaccoltaOperaiSelect(); }catch(e){}
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
  }
  function tpUpsertLocaleV52(o){
    try{
      if(typeof adminData === "undefined" || !adminData) return;
      if(!Array.isArray(adminData.operai)) adminData.operai = [];
      var nome = tpTrimV52(o.nome).toLowerCase();
      var email = tpTrimV52(o.email).toLowerCase();
      var idx = adminData.operai.findIndex(function(x){
        return tpTrimV52(x.nome).toLowerCase() === nome || (email && tpTrimV52(x.email).toLowerCase() === email);
      });
      if(idx >= 0) adminData.operai[idx] = Object.assign({}, adminData.operai[idx], o);
      else adminData.operai.push(o);
      tpRefreshUiV52();
    }catch(e){ console.warn("Collaboratore locale non aggiornato", e); }
  }
  async function tpFindCollaboratoreV52(sb, o){
    var cols = "id,nome,email,ruolo,stato,password_app,max_ore_giorno";
    var email = tpTrimV52(o.email);
    var nome = tpTrimV52(o.nome);
    if(email){
      var rEmail = await sb.from("collaboratori").select(cols).eq("email", email).maybeSingle();
      if(rEmail.error && rEmail.error.code !== "PGRST116") throw rEmail.error;
      if(rEmail.data) return rEmail.data;
    }
    if(nome){
      var rNome = await sb.from("collaboratori").select(cols).eq("nome", nome).maybeSingle();
      if(rNome.error && rNome.error.code !== "PGRST116") throw rNome.error;
      if(rNome.data) return rNome.data;
    }
    return null;
  }
  async function tpSalvaCollaboratoreSupabaseV52(o){
    var sb = tpSbV52();
    if(!sb) throw new Error("Supabase non collegato");
    var payload = {
      nome: tpTrimV52(o.nome),
      email: tpTrimV52(o.email) || null,
      ruolo: tpRoleDbV52(o.ruolo),
      stato: tpTrimV52(o.stato) || "Attivo",
      password_app: tpTrimV52(o.password) || null,
      max_ore_giorno: Number(o.maxOre || 10)
    };
    var cols = "id,nome,email,ruolo,stato,password_app,max_ore_giorno";
    var existing = await tpFindCollaboratoreV52(sb, o);
    var res;
    if(existing && existing.id){
      res = await sb.from("collaboratori").update(payload).eq("id", existing.id).select(cols).single();
    }else{
      res = await sb.from("collaboratori").insert(payload).select(cols).single();
    }
    if(res.error) throw res.error;
    return tpNormCollV52(res.data);
  }
  async function tpCaricaCollaboratoriSupabaseV52(){
    var sb = tpSbV52();
    if(!sb) return [];
    var res = await sb
      .from("collaboratori")
      .select("id,nome,email,ruolo,stato,password_app,max_ore_giorno")
      .order("nome", {ascending:true});
    if(res.error) throw res.error;
    var lista = (res.data || []).map(tpNormCollV52).filter(function(x){ return x.nome; });
    try{
      if(typeof adminData !== "undefined" && adminData){
        adminData.operai = lista;
      }
    }catch(e){ console.warn("adminData operai non aggiornato", e); }
    tpRefreshUiV52();
    return lista;
  }
  async function tpCreaCollV52(o, fieldId, label){
    tpUpsertLocaleV52(o);
    try{
      await tpSalvaCollaboratoreSupabaseV52(o);
      await tpCaricaCollaboratoriSupabaseV52();
      var f = document.getElementById(fieldId); if(f) f.value = "";
      alert(label + " salvato su Supabase nella tabella collaboratori.");
    }catch(err){
      console.error("Errore Supabase collaboratori v52:", err);
      alert(label + " salvato solo localmente. Supabase ha risposto: " + tpErrV52(err) + "\n\nControlla di aver creato la tabella public.collaboratori e le policy RLS indicate nel file SQL incluso.");
    }
  }

  window.aggiungiOperaioAdmin = async function(){
    var nome = tpTrimV52(document.getElementById("adminNomeOperaio")?.value);
    if(!nome){ alert("Inserisci il nome dell'operaio."); return; }
    await tpCreaCollV52({
      nome:nome,
      email: tpTrimV52(document.getElementById("adminEmailOperaio")?.value),
      ruolo: document.getElementById("adminRuoloOperaio")?.value || "Operaio",
      stato: document.getElementById("adminStatoOperaio")?.value || "Attivo",
      password: document.getElementById("adminPasswordOperaio")?.value || "",
      maxOre: Number(document.getElementById("adminMaxOreOperaio")?.value || 10)
    }, "adminNomeOperaio", "Operaio");
  };
  window.aggiungiOperaioDaSezione = async function(){
    var nome = tpTrimV52(document.getElementById("collNome")?.value);
    if(!nome){ alert("Inserisci il nome del collaboratore."); return; }
    await tpCreaCollV52({
      nome:nome,
      email: tpTrimV52(document.getElementById("collEmail")?.value),
      ruolo: document.getElementById("collRuolo")?.value || "Operaio",
      stato: document.getElementById("collStato")?.value || "Attivo",
      password: document.getElementById("collPassword")?.value || "",
      maxOre: Number(document.getElementById("collMaxOre")?.value || 10)
    }, "collNome", "Collaboratore");
  };

  var oldCambiaStatoV52 = window.cambiaStatoOperaio;
  window.cambiaStatoOperaio = async function(nome, stato){
    var o = null;
    try{
      o = (adminData.operai || []).find(function(x){ return x.nome === nome; });
      if(o){ o.stato = stato; if(stato === "Terminato") o.maxOre = 0; tpUpsertLocaleV52(o); }
    }catch(e){ if(typeof oldCambiaStatoV52 === "function") oldCambiaStatoV52(nome, stato); }
    if(o){ try{ await tpSalvaCollaboratoreSupabaseV52(o); await tpCaricaCollaboratoriSupabaseV52(); }catch(e){ console.warn("Stato collaboratore solo locale", e); } }
  };

  window.tpSalvaCollaboratoreSupabase = tpSalvaCollaboratoreSupabaseV52;
  window.tpCaricaCollaboratoriSupabaseCompleto = tpCaricaCollaboratoriSupabaseV52;
  window.caricaCollaboratoriDaSupabase = tpCaricaCollaboratoriSupabaseV52;
  window.tpTestSalvataggioOperaioSupabase = async function(){
    await tpCreaCollV52({nome:"Test Supabase " + new Date().toLocaleTimeString("it-CH"), email:"", ruolo:"Operaio", stato:"Attivo", password:"", maxOre:10}, "", "Test operaio");
  };

  window.addEventListener("load", function(){
    setTimeout(function(){
      if(document.body.classList.contains("tp-auth-ok")){
        tpCaricaCollaboratoriSupabaseV52().catch(function(e){ console.warn("Caricamento collaboratori v52 fallito", e); });
      }
    }, 1600);
  });
})();

/* ===== v53 - Copia collaboratori locali su Supabase + login collaboratori con password_app ===== */
(function(){
  function tpSbV53(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function tpTrimV53(v){ return String(v == null ? "" : v).trim(); }
  function tpRoleIsAdminV53(ruolo){
    var r = tpTrimV53(ruolo).toLowerCase();
    return r === "admin" || r === "caposquadra" || r.indexOf("capo") >= 0;
  }
  function tpNormRoleV53(ruolo){
    var r = tpTrimV53(ruolo).toLowerCase();
    if(r === "admin") return "admin";
    if(r === "caposquadra" || r.indexOf("capo") >= 0) return "caposquadra";
    return "operaio";
  }
  function tpGetLocalOperaiV53(){
    var out = [];
    try{
      if(typeof adminData !== "undefined" && adminData && Array.isArray(adminData.operai)) out = out.concat(adminData.operai);
    }catch(e){}
    try{
      var raw = localStorage.getItem("tecnoplafon_admin_cantieri_operai_v1");
      if(raw){
        var parsed = JSON.parse(raw);
        if(parsed && Array.isArray(parsed.operai)) out = out.concat(parsed.operai);
      }
    }catch(e){}
    var byKey = {};
    out.forEach(function(o){
      if(!o || !tpTrimV53(o.nome)) return;
      var key = (tpTrimV53(o.email) || tpTrimV53(o.nome)).toLowerCase();
      byKey[key] = Object.assign({}, byKey[key] || {}, o);
    });
    return Object.keys(byKey).map(function(k){ return byKey[k]; });
  }

  window.tpCopiaCollaboratoriLocaliSuSupabase = async function(){
    var sb = tpSbV53();
    if(!sb){ alert("Supabase non collegato."); return; }
    var lista = tpGetLocalOperaiV53();
    if(!lista.length){ alert("Non ho trovato collaboratori locali da copiare."); return; }
    if(!confirm("Copiare " + lista.length + " collaboratori locali nella tabella Supabase collaboratori?")) return;

    var ok = 0;
    var err = [];
    for(var i=0;i<lista.length;i++){
      var o = lista[i];
      try{
        if(typeof window.tpSalvaCollaboratoreSupabase === "function"){
          await window.tpSalvaCollaboratoreSupabase(o);
        }else{
          throw new Error("Funzione tpSalvaCollaboratoreSupabase non trovata.");
        }
        ok++;
      }catch(e){
        err.push((o.nome || "Senza nome") + ": " + (e.message || e));
      }
    }
    try{ if(typeof window.caricaCollaboratoriDaSupabase === "function") await window.caricaCollaboratoriDaSupabase(); }catch(e){}
    if(err.length){
      alert("Copia terminata con errori. Salvati: " + ok + "/" + lista.length + "\n\nErrori:\n" + err.slice(0,8).join("\n"));
    }else{
      alert("Copia completata: " + ok + " collaboratori salvati su Supabase.");
    }
  };

  function tpAddCopyButtonV53(){
    if(document.getElementById("tpCopyCollaboratoriSupabaseBtn")) return;
    var card = document.querySelector("#collaboratori .card.span-4 .form-grid");
    if(!card) return;
    var div = document.createElement("div");
    div.className = "f12";
    div.innerHTML = '<button id="tpCopyCollaboratoriSupabaseBtn" class="secondary" type="button" onclick="tpCopiaCollaboratoriLocaliSuSupabase()">Copia collaboratori locali su Supabase</button><p class="mini-note">Usalo una volta per trasferire i collaboratori gia presenti in locale nella tabella Supabase collaboratori.</p>';
    card.appendChild(div);
  }

  async function tpLoginCollaboratoreTabellaV53(emailOrUser, password){
    var sb = tpSbV53();
    if(!sb) throw new Error("Supabase non collegato.");
    var cols = "id,nome,email,ruolo,stato,password_app,max_ore_giorno";
    var user = tpTrimV53(emailOrUser);
    var row = null;

    if(user.indexOf("@") >= 0){
      var byEmail = await sb.from("collaboratori").select(cols).eq("email", user).maybeSingle();
      if(byEmail.error && byEmail.error.code !== "PGRST116") throw byEmail.error;
      row = byEmail.data;
    }
    if(!row){
      var byNome = await sb.from("collaboratori").select(cols).ilike("nome", user).maybeSingle();
      if(byNome.error && byNome.error.code !== "PGRST116") throw byNome.error;
      row = byNome.data;
    }
    if(!row) throw new Error("Collaboratore non trovato nella tabella collaboratori.");
    if(tpTrimV53(row.stato).toLowerCase() !== "attivo") throw new Error("Accesso bloccato: collaboratore non Attivo.");
    if(tpTrimV53(row.password_app) !== String(password || "")) throw new Error("Password collaboratore non corretta.");

    window.supabaseProfiloCorrente = {
      id: row.id,
      nome: row.nome,
      email: row.email || "",
      ruolo: tpNormRoleV53(row.ruolo),
      stato: row.stato || "Attivo",
      max_ore_giorno: row.max_ore_giorno || 10,
      sorgente: "collaboratori"
    };

    document.body.classList.add("tp-auth-ok");
    var err = document.getElementById("tpFullLoginError");
    if(err) err.style.display = "none";

    if(tpRoleIsAdminV53(row.ruolo)){
      document.body.classList.add("admin-view");
      document.body.classList.remove("worker-view");
      try{ adminUnlocked = true; sessionStorage.setItem("tecnoplafonAdminUnlocked","1"); }catch(e){}
      if(typeof showSection === "function") showSection("admin");
    }else{
      document.body.classList.add("worker-view");
      document.body.classList.remove("admin-view");
      try{ adminUnlocked = false; sessionStorage.removeItem("tecnoplafonAdminUnlocked"); }catch(e){}
      if(typeof showSection === "function") showSection("operaio");
    }

    try{ if(typeof window.tpCaricaCantieriSupabaseCompleto === "function") window.tpCaricaCantieriSupabaseCompleto(); }catch(e){}
    try{ if(typeof window.caricaCollaboratoriDaSupabase === "function") window.caricaCollaboratoriDaSupabase(); }catch(e){}
    return row;
  }

  var oldLoginV53 = window.tpFullLoginSubmit;
  if(typeof oldLoginV53 === "function" && !oldLoginV53.__tpV53CollaboratoriLogin){
    var patched = async function(){
      var emailEl = document.getElementById("tpFullEmail");
      var passEl = document.getElementById("tpFullPassword");
      var btn = document.getElementById("tpFullLoginBtn");
      var err = document.getElementById("tpFullLoginError");
      var email = emailEl ? emailEl.value.trim() : "";
      var password = passEl ? passEl.value : "";
      if(!email || !password){
        if(typeof oldLoginV53 === "function") return oldLoginV53.apply(this, arguments);
        return;
      }

      await oldLoginV53.apply(this, arguments);
      if(document.body.classList.contains("tp-auth-ok")) return;

      if(err){ err.textContent = "Controllo accesso collaboratore..."; err.style.display = "block"; }
      try{
        await tpLoginCollaboratoreTabellaV53(email, password);
      }catch(e){
        if(err){
          err.textContent = "Login fallito: " + (e.message || e);
          err.style.display = "block";
        }else{
          alert("Login fallito: " + (e.message || e));
        }
      }
      if(btn) btn.disabled = false;
    };
    patched.__tpV53CollaboratoriLogin = true;
    window.tpFullLoginSubmit = patched;
  }

  window.addEventListener("load", function(){
    setTimeout(tpAddCopyButtonV53, 800);
    setTimeout(tpAddCopyButtonV53, 1800);
  });
  document.addEventListener("click", function(){ setTimeout(tpAddCopyButtonV53, 150); });
})();

/* ===== v54 - Collaboratore creato da app: carica cantieri e lavorazioni quando segna ore ===== */
(function(){
  function tpSbV54(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function tpEscV54(v){ return String(v == null ? "" : v).replace(/[&<>\"']/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch; }); }
  function tpNormCantV54(row){
    return {
      id: row.id || "",
      nome: row.nome || "",
      cliente: (row.clienti && row.clienti.nome) ? row.clienti.nome : (row.cliente || ""),
      indirizzo: row.indirizzo || "",
      km: Number(row.km || 0),
      orePreviste: Number(row.ore_previste || row.orePreviste || 0),
      oreReali: Number(row.ore_reali || row.oreReali || 0),
      stato: row.stato || "Attivo"
    };
  }
  function tpLocalCantieriV54(){
    var out = [];
    try{ if(typeof adminData !== "undefined" && adminData && Array.isArray(adminData.cantieri)) out = out.concat(adminData.cantieri); }catch(e){}
    try{
      var raw = localStorage.getItem("tecnoplafon_admin_cantieri_operai_v1");
      if(raw){
        var parsed = JSON.parse(raw);
        if(parsed && Array.isArray(parsed.cantieri)) out = out.concat(parsed.cantieri);
      }
    }catch(e){}
    try{ if(Array.isArray(window.__tpCantieriCacheV54)) out = out.concat(window.__tpCantieriCacheV54); }catch(e){}
    var byName = {};
    out.forEach(function(c){
      if(!c || !String(c.nome || "").trim()) return;
      byName[String(c.nome).trim().toLowerCase()] = Object.assign({}, byName[String(c.nome).trim().toLowerCase()] || {}, c);
    });
    return Object.keys(byName).map(function(k){ return byName[k]; }).sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome), "it"); });
  }
  function tpWriteCantieriV54(lista){
    lista = (lista || []).filter(function(c){ return c && c.nome; });
    window.__tpCantieriCacheV54 = lista;
    try{
      if(typeof adminData !== "undefined" && adminData){
        adminData.cantieri = lista;
        if(typeof adminSave === "function") adminSave();
      }
    }catch(e){ console.warn("v54: adminData cantieri non aggiornato", e); }
    try{
      var raw = localStorage.getItem("tecnoplafon_admin_cantieri_operai_v1");
      var parsed = raw ? JSON.parse(raw) : {};
      parsed.cantieri = lista;
      localStorage.setItem("tecnoplafon_admin_cantieri_operai_v1", JSON.stringify(parsed));
    }catch(e){}
  }
  async function tpLeggiCantieriSupabaseV54(){
    var sb = tpSbV54();
    if(!sb) throw new Error("Supabase non collegato.");

    var res = await sb
      .from("cantieri")
      .select("id,nome,indirizzo,km,ore_previste,ore_reali,stato,clienti(nome)")
      .order("nome", {ascending:true});

    // Se la relazione clienti e bloccata o non esiste, rilegge i cantieri senza join.
    if(res.error){
      console.warn("v54: lettura cantieri con clienti fallita, provo senza clienti:", res.error.message || res.error);
      res = await sb
        .from("cantieri")
        .select("id,nome,indirizzo,km,ore_previste,ore_reali,stato")
        .order("nome", {ascending:true});
    }
    if(res.error) throw res.error;
    var lista = (res.data || []).map(tpNormCantV54).filter(function(c){ return c.nome; });
    tpWriteCantieriV54(lista);
    return lista;
  }
  function tpSetCantieriSelectV54(id, lista, allLabel){
    var sel = document.getElementById(id);
    if(!sel) return;
    var old = sel.value;
    var html = "";
    if(allLabel) html += '<option value="__ALL__">' + tpEscV54(allLabel) + '</option>';
    else html += '<option value="">Seleziona cantiere</option>';
    if(!lista.length){
      html += '<option value="" disabled>Nessun cantiere caricato</option>';
    }else{
      html += lista.map(function(c){ return '<option value="' + tpEscV54(c.nome) + '" data-id="' + tpEscV54(c.id || "") + '" data-km="' + tpEscV54(c.km || 0) + '">' + tpEscV54(c.nome) + '</option>'; }).join("");
    }
    sel.innerHTML = html;
    if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    else if(allLabel) sel.value = "__ALL__";
    else if(lista.length) sel.value = lista[0].nome;
  }
  function tpRiempiLavorazioniV54(){
    try{ if(typeof aggiornaLavorazioni === "function") aggiornaLavorazioni(); }catch(e){}
    try{ if(typeof aggiornaLavorazioniMobile === "function") aggiornaLavorazioniMobile(); }catch(e){}
    ["lavorazioneSelect","mLavorazione"].forEach(function(id){
      var sel = document.getElementById(id);
      if(!sel || sel.options.length) return;
      var vals = [];
      try{
        if(typeof lavorazioni !== "undefined" && lavorazioni){
          Object.keys(lavorazioni).forEach(function(k){ vals = vals.concat(lavorazioni[k] || []); });
        }
      }catch(e){}
      var seen = {};
      vals = vals.filter(function(v){ var k = String(v || "").trim(); if(!k || seen[k]) return false; seen[k] = true; return true; });
      sel.innerHTML = vals.map(function(v){ return '<option>' + tpEscV54(v) + '</option>'; }).join("");
    });
  }
  function tpRiempiCantieriOreV54(lista){
    lista = (lista && lista.length ? lista : tpLocalCantieriV54()).filter(function(c){ return c && c.nome; }).sort(function(a,b){ return String(a.nome).localeCompare(String(b.nome), "it"); });
    var attivi = lista.filter(function(c){ return String(c.stato || "Attivo").toLowerCase() !== "terminato"; });
    if(!attivi.length) attivi = lista;
    tpSetCantieriSelectV54("operaioCantiereSelect", attivi, null);
    tpSetCantieriSelectV54("mCantiere", attivi, null);
    tpSetCantieriSelectV54("adminOreCantiere", lista, null);
    tpSetCantieriSelectV54("econCantiere", lista, null);
    tpSetCantieriSelectV54("raccoltaCantiereSelect", lista, "Tutti i cantieri");
    tpRiempiLavorazioniV54();
    try{ if(typeof renderWorkerTimesheet === "function") renderWorkerTimesheet(); }catch(e){}
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
  }
  async function tpAssicuraCantieriOperaioV54(silenzioso){
    var lista = [];
    try{
      lista = await tpLeggiCantieriSupabaseV54();
    }catch(e){
      console.warn("v54: non riesco a leggere i cantieri da Supabase", e);
      lista = tpLocalCantieriV54();
      if(!lista.length && !silenzioso){
        alert("Non riesco a caricare i cantieri per il collaboratore. Controlla in Supabase che la tabella cantieri abbia una policy SELECT per anon/authenticated. Ho incluso il file SQL nella cartella aggiornata.");
      }
    }
    tpRiempiCantieriOreV54(lista);
    setTimeout(function(){ tpRiempiCantieriOreV54(lista); }, 250);
    setTimeout(function(){ tpRiempiCantieriOreV54(lista); }, 900);
    return lista;
  }

  var oldOpenWorkerV54 = window.openWorkerWindow;
  if(typeof oldOpenWorkerV54 === "function" && !oldOpenWorkerV54.__tpV54CantieriOperaio){
    var patchedOpen = async function(kind){
      if(kind === "ore"){
        await tpAssicuraCantieriOperaioV54(true);
      }
      var out = oldOpenWorkerV54.apply(this, arguments);
      if(kind === "ore"){
        tpRiempiCantieriOreV54(tpLocalCantieriV54());
        setTimeout(function(){ tpAssicuraCantieriOperaioV54(true); }, 300);
      }
      return out;
    };
    patchedOpen.__tpV54CantieriOperaio = true;
    window.openWorkerWindow = patchedOpen;
  }

  var oldLoginV54 = window.tpFullLoginSubmit;
  if(typeof oldLoginV54 === "function" && !oldLoginV54.__tpV54CantieriOperaioLogin){
    var patchedLogin = async function(){
      var out = await oldLoginV54.apply(this, arguments);
      if(document.body.classList.contains("tp-auth-ok")){
        setTimeout(function(){ tpAssicuraCantieriOperaioV54(true); }, 300);
        setTimeout(function(){ tpAssicuraCantieriOperaioV54(true); }, 1200);
      }
      return out;
    };
    patchedLogin.__tpV54CantieriOperaioLogin = true;
    window.tpFullLoginSubmit = patchedLogin;
  }

  window.tpAssicuraCantieriOperaioV54 = tpAssicuraCantieriOperaioV54;
  window.tpRiempiCantieriOreV54 = tpRiempiCantieriOreV54;

  window.addEventListener("load", function(){
    setTimeout(function(){
      if(document.body.classList.contains("tp-auth-ok")) tpAssicuraCantieriOperaioV54(true);
      else tpRiempiCantieriOreV54(tpLocalCantieriV54());
    }, 1200);
  });
  document.addEventListener("click", function(ev){
    var t = ev.target;
    if(t && (String(t.textContent || "").toLowerCase().indexOf("ore") >= 0 || t.closest && t.closest("#mobilePanel"))){
      setTimeout(function(){ tpRiempiCantieriOreV54(tpLocalCantieriV54()); }, 120);
    }
  });
})();

/* ===== v55 - Lavorazioni gestite da app e Supabase ===== */
(function(){
  var TABLE = "lavorazioni";
  window.__tpLavorazioniSupabaseV55 = window.__tpLavorazioniSupabaseV55 || [];

  function sb(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function esc(v){ return String(v == null ? "" : v).replace(/[&<>\"']/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch; }); }
  function norm(v){ return String(v == null ? "" : v).trim(); }
  function uniq(arr){ var s={}; return (arr||[]).map(norm).filter(function(v){ if(!v || s[v]) return false; s[v]=1; return true; }); }
  function sortIt(a,b){ return String(a).localeCompare(String(b), "it", {numeric:true, sensitivity:"base"}); }
  function rowNorm(r){
    return {
      id: r.id || "",
      categoria_codice: norm(r.categoria_codice || r.codice || r.id_categoria || ""),
      categoria_nome: norm(r.categoria_nome || r.categoria || r.nome_categoria || ""),
      lavorazione: norm(r.lavorazione || r.nome || r.descrizione || ""),
      stato: norm(r.stato || "Attivo"),
      ordine: Number(r.ordine || 0)
    };
  }
  function fallbackRows(){
    var out = [];
    var names = {"100":"Cartongesso","200":"Rasatura / Intonaco","300":"Isolamento","400":"Pittura","500":"Preparazione cantiere","600":"Extra / Regia"};
    try{
      if(typeof lavorazioni !== "undefined" && lavorazioni){
        Object.keys(lavorazioni).forEach(function(cod){
          (lavorazioni[cod] || []).forEach(function(lav,idx){ out.push({categoria_codice:cod,categoria_nome:names[cod]||cod,lavorazione:lav,stato:"Attivo",ordine:idx+1}); });
        });
      }
    }catch(e){}
    return out;
  }
  function currentRows(){
    var rows = Array.isArray(window.__tpLavorazioniSupabaseV55) ? window.__tpLavorazioniSupabaseV55 : [];
    return rows.length ? rows : fallbackRows();
  }
  function grouped(rows){
    var g = {};
    (rows || []).forEach(function(r){
      r = rowNorm(r);
      if(!r.categoria_codice || !r.lavorazione) return;
      var key = r.categoria_codice;
      if(!g[key]) g[key] = {codice:r.categoria_codice, nome:r.categoria_nome || r.categoria_codice, stato:r.stato || "Attivo", rows:[]};
      if(r.categoria_nome) g[key].nome = r.categoria_nome;
      g[key].rows.push(r);
    });
    Object.keys(g).forEach(function(k){ g[k].rows.sort(function(a,b){ return (a.ordine-b.ordine) || sortIt(a.lavorazione,b.lavorazione); }); });
    return g;
  }
  function categoryLabel(g){ return g.codice + " — " + (g.nome || g.codice); }

  async function loadFromSupabase(showErrors){
    var client = sb();
    if(!client){ if(showErrors) alert("Supabase non collegato."); return currentRows(); }
    var res = await client.from(TABLE).select("id,categoria_codice,categoria_nome,lavorazione,stato,ordine").order("categoria_codice", {ascending:true}).order("ordine", {ascending:true});
    if(res.error){
      console.warn("v55: lettura lavorazioni fallita", res.error);
      if(showErrors) alert("Non riesco a leggere le lavorazioni da Supabase: " + (res.error.message || res.error));
      return currentRows();
    }
    window.__tpLavorazioniSupabaseV55 = (res.data || []).map(rowNorm).filter(function(r){ return r.categoria_codice && r.lavorazione; });
    try{ localStorage.setItem("tecnoplafon_lavorazioni_supabase_cache_v55", JSON.stringify(window.__tpLavorazioniSupabaseV55)); }catch(e){}
    refreshAll();
    return window.__tpLavorazioniSupabaseV55;
  }

  async function saveCategoria(){
    var codice = norm(document.getElementById("lavCodiceV55")?.value);
    var nome = norm(document.getElementById("lavCategoriaV55")?.value);
    var stato = norm(document.getElementById("lavStatoV55")?.value) || "Attivo";
    var righe = uniq(String(document.getElementById("lavListaV55")?.value || "").split(/\n|,/));
    if(!codice || !nome || !righe.length){ alert("Inserisci ID, categoria e almeno una lavorazione."); return; }
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var btn = document.getElementById("lavSaveBtnV55");
    if(btn) btn.disabled = true;
    try{
      var del = await client.from(TABLE).delete().eq("categoria_codice", codice);
      if(del.error) throw del.error;
      var payload = righe.map(function(lav, idx){ return {categoria_codice:codice,categoria_nome:nome,lavorazione:lav,stato:stato,ordine:idx+1}; });
      var ins = await client.from(TABLE).insert(payload).select("id");
      if(ins.error) throw ins.error;
      alert("Lavorazioni salvate su Supabase.");
      document.getElementById("lavListaV55").value = "";
      await loadFromSupabase(true);
    }catch(e){
      alert("Errore Supabase lavorazioni: " + (e.message || JSON.stringify(e)));
    }
    if(btn) btn.disabled = false;
  }

  async function deleteCategoria(codice){
    codice = norm(codice);
    if(!codice) return;
    if(!confirm("Cancellare tutte le lavorazioni della categoria " + codice + "?")) return;
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var res = await client.from(TABLE).delete().eq("categoria_codice", codice);
    if(res.error){ alert("Errore cancellazione: " + res.error.message); return; }
    await loadFromSupabase(true);
  }

  async function deleteAll(){
    if(!confirm("Vuoi cancellare TUTTE le lavorazioni da Supabase? I cantieri e i collaboratori non vengono toccati.")) return;
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var res = await client.from(TABLE).delete().not("id", "is", null);
    if(res.error){ alert("Errore cancellazione: " + res.error.message); return; }
    window.__tpLavorazioniSupabaseV55 = [];
    refreshAll();
    alert("Tutte le lavorazioni sono state cancellate. Ora puoi ricrearle dall'app.");
  }

  function editCategoria(codice){
    var g = grouped(currentRows())[codice];
    if(!g) return;
    var cod = document.getElementById("lavCodiceV55");
    var nom = document.getElementById("lavCategoriaV55");
    var sta = document.getElementById("lavStatoV55");
    var lis = document.getElementById("lavListaV55");
    if(cod) cod.value = g.codice;
    if(nom) nom.value = g.nome;
    if(sta) sta.value = g.stato || "Attivo";
    if(lis) lis.value = g.rows.map(function(r){ return r.lavorazione; }).join("\n");
    var sec = document.getElementById("lavorazioni");
    if(sec) sec.scrollIntoView({behavior:"smooth", block:"start"});
  }

  function renderManager(){
    var sec = document.getElementById("lavorazioni");
    if(!sec || sec.__tpV55Rendered) return;
    sec.__tpV55Rendered = true;
    sec.innerHTML = '<div class="grid">' +
      '<div class="card span-7"><h3>Lavorazioni Supabase</h3><p>Qui gestisci le lavorazioni che vedono collaboratori e admin quando segnano le ore.</p>' +
      '<div class="admin-actions" style="margin-bottom:12px"><button class="primary" onclick="tpLoadLavorazioniSupabaseV55(true)">Ricarica da Supabase</button><button class="secondary" onclick="tpCancellaTutteLavorazioniV55()">Cancella tutte</button></div>' +
      '<table><thead><tr><th>ID</th><th>Categoria</th><th>Lavorazioni collegate</th><th>Stato</th><th>Azioni</th></tr></thead><tbody id="lavBodyV55"><tr><td colspan="5">Caricamento...</td></tr></tbody></table></div>' +
      '<div class="card span-5"><h3>Crea / modifica lavorazioni</h3><div class="form-grid">' +
      '<div class="f4"><label>ID</label><input id="lavCodiceV55" placeholder="100"></div>' +
      '<div class="f8"><label>Categoria</label><input id="lavCategoriaV55" placeholder="Cartongesso"></div>' +
      '<div class="f12"><label>Lavorazioni collegate</label><textarea id="lavListaV55" placeholder="Una nuova lavorazione per riga"></textarea></div>' +
      '<div class="f6"><label>Stato</label><select id="lavStatoV55"><option>Attivo</option><option>Non attivo</option></select></div>' +
      '<div class="f6"><label>Collegamento costo</label><input id="lavCostoV55" placeholder="opzionale" disabled></div>' +
      '<div class="f12"><button id="lavSaveBtnV55" class="primary" onclick="tpSalvaLavorazioniV55()">Salva lavorazioni su Supabase</button></div>' +
      '<div class="f12"><div class="alert">Dopo il salvataggio, i collaboratori vedono subito queste lavorazioni in Segna ore.</div></div>' +
      '</div></div></div>';
  }
  function renderTable(){
    var body = document.getElementById("lavBodyV55");
    if(!body) return;
    var g = grouped(currentRows());
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length){ body.innerHTML = '<tr><td colspan="5">Nessuna lavorazione. Creale dal modulo a destra.</td></tr>'; return; }
    body.innerHTML = keys.map(function(k){
      var x = g[k];
      var badge = String(x.stato).toLowerCase() === "attivo" ? '<span class="badge ok">Attivo</span>' : '<span class="badge wait">Non attivo</span>';
      return '<tr><td>' + esc(x.codice) + '</td><td>' + esc(x.nome) + '</td><td>' + esc(x.rows.map(function(r){ return r.lavorazione; }).join(", ")) + '</td><td>' + badge + '</td><td><div class="action-mini-row"><button class="tiny-btn" onclick="tpModificaCategoriaLavorazioniV55(\'' + esc(x.codice) + '\')">Modifica</button><button class="tiny-btn red" onclick="tpCancellaCategoriaLavorazioniV55(\'' + esc(x.codice) + '\')">Elimina</button></div></td></tr>';
    }).join("");
  }
  function populateCategorySelect(id){
    var sel = document.getElementById(id);
    if(!sel) return;
    var old = sel.value;
    var g = grouped(currentRows());
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length) return;
    sel.innerHTML = keys.map(function(k){ return '<option value="' + esc(g[k].codice) + '">' + esc(categoryLabel(g[k])) + '</option>'; }).join("");
    if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    else sel.value = keys[0];
  }
  function populateLavSelect(categoryId, targetId){
    var sel = document.getElementById(targetId);
    if(!sel) return;
    var old = sel.value;
    var g = grouped(currentRows())[categoryId];
    var vals = g ? g.rows.filter(function(r){ return String(r.stato || "Attivo").toLowerCase() === "attivo"; }).map(function(r){ return r.lavorazione; }) : [];
    if(!vals.length && g) vals = g.rows.map(function(r){ return r.lavorazione; });
    sel.innerHTML = vals.map(function(v){ return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join("");
    if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
  }
  function refreshSelects(){
    ["categoriaSelect","mCategoria","adminOreCategoria"].forEach(populateCategorySelect);
    var c1 = document.getElementById("categoriaSelect")?.value; if(c1) populateLavSelect(c1, "lavorazioneSelect");
    var c2 = document.getElementById("mCategoria")?.value; if(c2) populateLavSelect(c2, "mLavorazione");
    var c3 = document.getElementById("adminOreCategoria")?.value; if(c3) populateLavSelect(c3, "adminOreLavorazione");
  }
  function refreshAll(){ renderManager(); renderTable(); refreshSelects(); try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){} }

  window.aggiornaLavorazioni = function(){ var c = document.getElementById("categoriaSelect")?.value; if(c) populateLavSelect(c, "lavorazioneSelect"); };
  window.aggiornaLavorazioniMobile = function(){ var c = document.getElementById("mCategoria")?.value; if(c) populateLavSelect(c, "mLavorazione"); };
  window.adminAggiornaLavorazioniMese = function(){ var c = document.getElementById("adminOreCategoria")?.value; if(c) populateLavSelect(c, "adminOreLavorazione"); };
  window.tpLoadLavorazioniSupabaseV55 = loadFromSupabase;
  window.tpSalvaLavorazioniV55 = saveCategoria;
  window.tpCancellaTutteLavorazioniV55 = deleteAll;
  window.tpModificaCategoriaLavorazioniV55 = editCategoria;
  window.tpCancellaCategoriaLavorazioniV55 = deleteCategoria;

  try{
    var cache = JSON.parse(localStorage.getItem("tecnoplafon_lavorazioni_supabase_cache_v55") || "[]");
    if(Array.isArray(cache) && cache.length) window.__tpLavorazioniSupabaseV55 = cache.map(rowNorm);
  }catch(e){}
  window.addEventListener("load", function(){
    setTimeout(function(){ renderManager(); refreshAll(); loadFromSupabase(false); }, 900);
    setTimeout(function(){ refreshAll(); }, 2200);
  });
  document.addEventListener("click", function(){ setTimeout(refreshSelects, 150); });
})();

/* ===== v56 - Fix salvataggio lavorazioni su Supabase (no demo, colonne compatibili) ===== */
(function(){
  var TABLE = "lavorazioni";
  function client(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function norm(v){ return String(v == null ? "" : v).trim(); }
  function esc(v){ return String(v == null ? "" : v).replace(/[&<>\"']/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch; }); }
  function uniq(arr){ var seen={}; return (arr||[]).map(norm).filter(function(v){ if(!v || seen[v]) return false; seen[v]=1; return true; }); }
  function sortIt(a,b){ return String(a).localeCompare(String(b), "it", {numeric:true, sensitivity:"base"}); }
  function rowNorm(r){
    return {
      id: r.id || "",
      categoria_codice: norm(r.categoria_codice || r.codice || r.id_categoria || ""),
      categoria_nome: norm(r.categoria_nome || r.categoria || r.nome_categoria || ""),
      lavorazione: norm(r.lavorazione || r.nome || r.descrizione || ""),
      stato: (r.attivo === false ? "Non attivo" : norm(r.stato || "Attivo")),
      ordine: Number(r.ordinamento || r.ordine || 0)
    };
  }
  function rows(){ return Array.isArray(window.__tpLavorazioniSupabaseV55) ? window.__tpLavorazioniSupabaseV55 : []; }
  function grouped(){
    var g = {};
    rows().forEach(function(x){
      x = rowNorm(x);
      if(!x.categoria_codice || !x.lavorazione) return;
      if(!g[x.categoria_codice]) g[x.categoria_codice] = {codice:x.categoria_codice,nome:x.categoria_nome || x.categoria_codice,stato:x.stato || "Attivo",rows:[]};
      if(x.categoria_nome) g[x.categoria_codice].nome = x.categoria_nome;
      g[x.categoria_codice].rows.push(x);
    });
    Object.keys(g).forEach(function(k){ g[k].rows.sort(function(a,b){ return (a.ordine-b.ordine) || sortIt(a.lavorazione,b.lavorazione); }); });
    return g;
  }
  function ensureManager(){
    var sec = document.getElementById("lavorazioni");
    if(!sec) return;
    if(sec.getAttribute("data-tp-v56") === "1") return;
    sec.setAttribute("data-tp-v56", "1");
    sec.innerHTML = '<div class="grid">' +
      '<div class="card span-7"><h3>Lavorazioni Supabase</h3><p>Qui gestisci le lavorazioni che vedono collaboratori e admin quando segnano le ore.</p>' +
      '<div class="admin-actions" style="margin-bottom:12px"><button class="primary" onclick="tpLoadLavorazioniSupabaseV56(true)">Ricarica da Supabase</button><button class="secondary" onclick="tpCancellaTutteLavorazioniV56()">Cancella tutte</button></div>' +
      '<table><thead><tr><th>ID</th><th>Categoria</th><th>Lavorazioni collegate</th><th>Stato</th><th>Azioni</th></tr></thead><tbody id="lavBodyV56"><tr><td colspan="5">Caricamento...</td></tr></tbody></table></div>' +
      '<div class="card span-5"><h3>Crea / modifica lavorazioni</h3><div class="form-grid">' +
      '<div class="f4"><label>ID</label><input id="lavCodiceV56" placeholder="100"></div>' +
      '<div class="f8"><label>Categoria</label><input id="lavCategoriaV56" placeholder="Cartongesso"></div>' +
      '<div class="f12"><label>Lavorazioni collegate</label><textarea id="lavListaV56" placeholder="Una nuova lavorazione per riga"></textarea></div>' +
      '<div class="f6"><label>Stato</label><select id="lavStatoV56"><option>Attivo</option><option>Non attivo</option></select></div>' +
      '<div class="f6"><label>Database</label><input value="Supabase lavorazioni" disabled></div>' +
      '<div class="f12"><button id="lavSaveBtnV56" class="primary" onclick="tpSalvaLavorazioniV56()">Salva lavorazioni su Supabase</button></div>' +
      '<div class="f12"><div class="alert">Questo bottone salva davvero nel database Supabase, non in demo.</div></div>' +
      '</div></div></div>';
  }
  function renderTable(){
    ensureManager();
    var body = document.getElementById("lavBodyV56");
    if(!body) return;
    var g = grouped();
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length){ body.innerHTML = '<tr><td colspan="5">Nessuna lavorazione nel database. Creale dal modulo a destra.</td></tr>'; return; }
    body.innerHTML = keys.map(function(k){
      var x = g[k];
      var badge = String(x.stato).toLowerCase() === "attivo" ? '<span class="badge ok">Attivo</span>' : '<span class="badge wait">Non attivo</span>';
      return '<tr><td>' + esc(x.codice) + '</td><td>' + esc(x.nome) + '</td><td>' + esc(x.rows.map(function(r){ return r.lavorazione; }).join(", ")) + '</td><td>' + badge + '</td><td><div class="action-mini-row"><button class="tiny-btn" onclick="tpModificaCategoriaLavorazioniV56(\'' + esc(x.codice) + '\')">Modifica</button><button class="tiny-btn red" onclick="tpCancellaCategoriaLavorazioniV56(\'' + esc(x.codice) + '\')">Elimina</button></div></td></tr>';
    }).join("");
  }
  async function load(showErrors){
    ensureManager();
    var sb = client();
    if(!sb){ if(showErrors) alert("Supabase non collegato."); renderTable(); return rows(); }
    var res = await sb.from(TABLE).select("*").order("categoria_codice", {ascending:true});
    if(res.error){ if(showErrors) alert("Errore lettura lavorazioni: " + res.error.message); renderTable(); return rows(); }
    window.__tpLavorazioniSupabaseV55 = (res.data || []).map(rowNorm).filter(function(r){ return r.categoria_codice && r.lavorazione; });
    try{ localStorage.setItem("tecnoplafon_lavorazioni_supabase_cache_v55", JSON.stringify(window.__tpLavorazioniSupabaseV55)); }catch(e){}
    refreshSelects();
    renderTable();
    return rows();
  }
  async function save(){
    var codice = norm(document.getElementById("lavCodiceV56")?.value || document.getElementById("lavCodiceV55")?.value);
    var nome = norm(document.getElementById("lavCategoriaV56")?.value || document.getElementById("lavCategoriaV55")?.value);
    var stato = norm(document.getElementById("lavStatoV56")?.value || document.getElementById("lavStatoV55")?.value || "Attivo");
    var lista = String(document.getElementById("lavListaV56")?.value || document.getElementById("lavListaV55")?.value || "");
    var righe = uniq(lista.split(/\n|,/));
    if(!codice || !nome || !righe.length){ alert("Inserisci ID, categoria e almeno una lavorazione."); return; }
    var sb = client();
    if(!sb){ alert("Supabase non collegato."); return; }
    var btn = document.getElementById("lavSaveBtnV56") || document.getElementById("lavSaveBtnV55");
    if(btn) btn.disabled = true;
    try{
      var del = await sb.from(TABLE).delete().eq("categoria_codice", codice);
      if(del.error) throw del.error;
      var payload = righe.map(function(lav, idx){ return {categoria_codice:codice,categoria_nome:nome,nome:lav,attivo:(stato.toLowerCase()==="attivo"),ordinamento:idx+1}; });
      var ins = await sb.from(TABLE).insert(payload).select("*");
      if(ins.error){
        // fallback per vecchie tabelle che hanno colonne lavorazione/stato/ordine
        payload = righe.map(function(lav, idx){ return {categoria_codice:codice,categoria_nome:nome,lavorazione:lav,stato:stato,ordine:idx+1}; });
        ins = await sb.from(TABLE).insert(payload).select("*");
        if(ins.error) throw ins.error;
      }
      if(document.getElementById("lavListaV56")) document.getElementById("lavListaV56").value = "";
      if(document.getElementById("lavListaV55")) document.getElementById("lavListaV55").value = "";
      alert("Lavorazioni salvate su Supabase.");
      await load(false);
    }catch(e){
      alert("Errore Supabase lavorazioni: " + (e.message || JSON.stringify(e)) + (e.details ? " | dettagli: " + e.details : "") + (e.hint ? " | hint: " + e.hint : ""));
    }
    if(btn) btn.disabled = false;
  }
  async function delCat(codice){
    if(!confirm("Cancellare tutte le lavorazioni della categoria " + codice + "?")) return;
    var sb = client(); if(!sb){ alert("Supabase non collegato."); return; }
    var res = await sb.from(TABLE).delete().eq("categoria_codice", codice);
    if(res.error){ alert("Errore cancellazione: " + res.error.message); return; }
    await load(false);
  }
  async function delAll(){
    if(!confirm("Vuoi cancellare TUTTE le lavorazioni da Supabase?")) return;
    var sb = client(); if(!sb){ alert("Supabase non collegato."); return; }
    var res = await sb.from(TABLE).delete().not("categoria_codice", "is", null);
    if(res.error){ alert("Errore cancellazione: " + res.error.message); return; }
    window.__tpLavorazioniSupabaseV55 = [];
    renderTable(); refreshSelects();
    alert("Lavorazioni cancellate. Ora puoi ricrearle dall'app.");
  }
  function edit(codice){
    var g = grouped()[codice]; if(!g) return;
    ensureManager();
    var cod = document.getElementById("lavCodiceV56");
    var nom = document.getElementById("lavCategoriaV56");
    var sta = document.getElementById("lavStatoV56");
    var lis = document.getElementById("lavListaV56");
    if(cod) cod.value = g.codice;
    if(nom) nom.value = g.nome;
    if(sta) sta.value = g.stato || "Attivo";
    if(lis) lis.value = g.rows.map(function(r){ return r.lavorazione; }).join("\n");
  }
  function refreshSelects(){
    var g = grouped();
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length) return;
    ["categoriaSelect","mCategoria","adminOreCategoria"].forEach(function(id){
      var sel = document.getElementById(id); if(!sel) return;
      var old = sel.value;
      sel.innerHTML = keys.map(function(k){ return '<option value="' + esc(g[k].codice) + '">' + esc(g[k].codice + ' — ' + g[k].nome) + '</option>'; }).join("");
      if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    });
    function fill(catId, targetId){
      var sel = document.getElementById(targetId); if(!sel) return;
      var old = sel.value;
      var grp = g[catId];
      var vals = grp ? grp.rows.filter(function(r){ return String(r.stato).toLowerCase()==="attivo"; }).map(function(r){ return r.lavorazione; }) : [];
      if(!vals.length && grp) vals = grp.rows.map(function(r){ return r.lavorazione; });
      sel.innerHTML = vals.map(function(v){ return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join("");
      if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    }
    fill(document.getElementById("categoriaSelect")?.value, "lavorazioneSelect");
    fill(document.getElementById("mCategoria")?.value, "mLavorazione");
    fill(document.getElementById("adminOreCategoria")?.value, "adminOreLavorazione");
  }
  window.tpLoadLavorazioniSupabaseV56 = load;
  window.tpSalvaLavorazioniV56 = save;
  window.tpCancellaTutteLavorazioniV56 = delAll;
  window.tpModificaCategoriaLavorazioniV56 = edit;
  window.tpCancellaCategoriaLavorazioniV56 = delCat;
  window.tpSalvaLavorazioniV55 = save;
  window.tpLoadLavorazioniSupabaseV55 = load;
  window.aggiornaLavorazioni = function(){ refreshSelects(); };
  window.aggiornaLavorazioniMobile = function(){ refreshSelects(); };
  window.adminAggiornaLavorazioniMese = function(){ refreshSelects(); };
  var oldShow = window.showSection;
  if(typeof oldShow === "function" && !oldShow.__tpV56Lav){
    window.showSection = function(id){
      var r = oldShow.apply(this, arguments);
      if(id === "lavorazioni") setTimeout(function(){ ensureManager(); renderTable(); load(false); }, 80);
      return r;
    };
    window.showSection.__tpV56Lav = true;
  }
  window.addEventListener("load", function(){ setTimeout(function(){ ensureManager(); renderTable(); load(false); }, 700); setTimeout(function(){ ensureManager(); renderTable(); }, 1800); });
})();

/* ===== v57 - Fix definitivo lavorazioni: usa solo colonne reali Supabase (nome, non lavorazione) ===== */
(function(){
  var TABLE = "lavorazioni";
  function sb(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function norm(v){ return String(v == null ? "" : v).trim(); }
  function msg(e){ return (e && e.message ? e.message : JSON.stringify(e || {})) + (e && e.details ? " | dettagli: " + e.details : "") + (e && e.hint ? " | hint: " + e.hint : ""); }
  function uniq(arr){ var seen={}; return (arr||[]).map(norm).filter(function(v){ if(!v || seen[v]) return false; seen[v]=1; return true; }); }
  function rowNorm(r){
    return {
      id: r.id || "",
      categoria_codice: norm(r.categoria_codice || r.codice || r.id_categoria || ""),
      categoria_nome: norm(r.categoria_nome || r.categoria || r.nome_categoria || ""),
      lavorazione: norm(r.nome || r.lavorazione || r.descrizione || ""),
      stato: (r.attivo === false ? "Non attivo" : norm(r.stato || "Attivo")),
      ordine: Number(r.ordinamento || r.ordine || 0)
    };
  }
  async function loadSilent(){
    var client = sb();
    if(!client) return [];
    var res = await client.from(TABLE).select("id,categoria_codice,categoria_nome,nome,attivo,ordinamento,created_at,updated_at").order("categoria_codice", {ascending:true}).order("ordinamento", {ascending:true});
    if(res.error) throw res.error;
    window.__tpLavorazioniSupabaseV55 = (res.data || []).map(rowNorm).filter(function(r){ return r.categoria_codice && r.lavorazione; });
    try{ localStorage.setItem("tecnoplafon_lavorazioni_supabase_cache_v55", JSON.stringify(window.__tpLavorazioniSupabaseV55)); }catch(e){}
    try{ if(typeof window.tpLoadLavorazioniSupabaseV56 === "function") setTimeout(function(){},0); }catch(e){}
    try{ if(typeof aggiornaLavorazioni === "function") aggiornaLavorazioni(); }catch(e){}
    try{ if(typeof aggiornaLavorazioniMobile === "function") aggiornaLavorazioniMobile(); }catch(e){}
    try{ if(typeof adminAggiornaLavorazioniMese === "function") adminAggiornaLavorazioniMese(); }catch(e){}
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
    return window.__tpLavorazioniSupabaseV55;
  }
  async function saveV57(){
    var codice = norm(document.getElementById("lavCodiceV56")?.value || document.getElementById("lavCodiceV55")?.value);
    var categoria = norm(document.getElementById("lavCategoriaV56")?.value || document.getElementById("lavCategoriaV55")?.value);
    var stato = norm(document.getElementById("lavStatoV56")?.value || document.getElementById("lavStatoV55")?.value || "Attivo");
    var lista = String(document.getElementById("lavListaV56")?.value || document.getElementById("lavListaV55")?.value || "");
    var righe = uniq(lista.split(/\n|,/));
    if(!codice || !categoria || !righe.length){ alert("Inserisci ID, categoria e almeno una lavorazione."); return; }
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var btn = document.getElementById("lavSaveBtnV56") || document.getElementById("lavSaveBtnV55");
    if(btn){ btn.disabled = true; btn.textContent = "Salvataggio..."; }
    try{
      var del = await client.from(TABLE).delete().eq("categoria_codice", codice);
      if(del.error) throw del.error;
      var payload = righe.map(function(nome, idx){
        return {
          categoria_codice: codice,
          categoria_nome: categoria,
          nome: nome,
          attivo: (stato.toLowerCase() === "attivo"),
          ordinamento: idx + 1,
          updated_at: new Date().toISOString()
        };
      });
      var ins = await client.from(TABLE).insert(payload).select("id,categoria_codice,categoria_nome,nome,attivo,ordinamento");
      if(ins.error) throw ins.error;
      if(document.getElementById("lavListaV56")) document.getElementById("lavListaV56").value = "";
      if(document.getElementById("lavListaV55")) document.getElementById("lavListaV55").value = "";
      await loadSilent();
      alert("Lavorazioni salvate su Supabase.");
    }catch(e){
      alert("Errore Supabase lavorazioni V57: " + msg(e) + "\n\nControlla di avere eseguito SUPABASE_LAVORAZIONI_V57_SQL.sql e poi fai Refresh schema cache in Supabase API settings se l'errore continua.");
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = "Aggiungi lavorazioni su Supabase"; }
    }
  }
  async function loadV57(showErrors){
    try{ return await loadSilent(); }
    catch(e){ if(showErrors) alert("Errore lettura lavorazioni V57: " + msg(e)); return window.__tpLavorazioniSupabaseV55 || []; }
  }
  window.tpSalvaLavorazioniV57 = saveV57;
  window.tpSalvaLavorazioniV56 = saveV57;
  window.tpSalvaLavorazioniV55 = saveV57;
  window.tpLoadLavorazioniSupabaseV57 = loadV57;
  window.tpLoadLavorazioniSupabaseV56 = loadV57;
  window.tpLoadLavorazioniSupabaseV55 = loadV57;
  window.addEventListener("load", function(){ setTimeout(function(){ loadV57(false); }, 1200); });
})();


/* ===== v58 - Lavorazioni Supabase definitivo: tabella reale con colonna nome ===== */
(function(){
  var TABLE = "lavorazioni";
  window.__tpLavV58 = window.__tpLavV58 || [];

  function sb(){
    return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  }
  function norm(v){
    return String(v == null ? "" : v).trim();
  }
  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch] || ch;
    });
  }
  function sortIt(a,b){
    return String(a).localeCompare(String(b), "it", {numeric:true, sensitivity:"base"});
  }
  function uniq(arr){
    var seen = {};
    return (arr || []).map(norm).filter(function(v){
      if(!v || seen[v]) return false;
      seen[v] = 1;
      return true;
    });
  }
  function msg(e){
    return (e && e.message ? e.message : JSON.stringify(e || {})) +
      (e && e.code ? " | codice: " + e.code : "") +
      (e && e.details ? " | dettagli: " + e.details : "") +
      (e && e.hint ? " | hint: " + e.hint : "");
  }
  function toOldRow(r){
    return {
      id: r.id || "",
      categoria_codice: norm(r.categoria_codice || ""),
      categoria_nome: norm(r.categoria_nome || ""),
      lavorazione: norm(r.nome || ""),
      stato: r.attivo === false ? "Non attivo" : "Attivo",
      ordine: Number(r.ordinamento || 0)
    };
  }
  function groupRows(){
    var g = {};
    (window.__tpLavV58 || []).forEach(function(r){
      var codice = norm(r.categoria_codice);
      var nomeCat = norm(r.categoria_nome) || codice;
      var lav = norm(r.nome);
      if(!codice || !lav) return;
      if(!g[codice]) g[codice] = {codice:codice, nome:nomeCat, rows:[]};
      g[codice].nome = nomeCat;
      g[codice].rows.push(r);
    });
    Object.keys(g).forEach(function(k){
      g[k].rows.sort(function(a,b){
        return (Number(a.ordinamento || 0) - Number(b.ordinamento || 0)) || sortIt(a.nome, b.nome);
      });
    });
    return g;
  }
  function syncOldCache(){
    var oldRows = (window.__tpLavV58 || []).map(toOldRow);
    window.__tpLavorazioniSupabaseV55 = oldRows;
    try{
      localStorage.setItem("tecnoplafon_lavorazioni_supabase_cache_v55", JSON.stringify(oldRows));
    }catch(e){}
  }
  function updateCategorySelect(selectId){
    var sel = document.getElementById(selectId);
    if(!sel) return;
    var old = sel.value;
    var g = groupRows();
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length) return;
    sel.innerHTML = keys.map(function(k){
      return '<option value="' + esc(k) + '">' + esc(k + " — " + g[k].nome) + '</option>';
    }).join("");
    if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
    else sel.value = keys[0];
  }
  function updateLavSelect(categoryId, selectId){
    var sel = document.getElementById(selectId);
    if(!sel) return;
    var old = sel.value;
    var g = groupRows()[categoryId];
    var vals = g ? g.rows.filter(function(r){ return r.attivo !== false; }).map(function(r){ return r.nome; }) : [];
    if(!vals.length && g) vals = g.rows.map(function(r){ return r.nome; });
    sel.innerHTML = vals.map(function(v){
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join("");
    if(old && Array.from(sel.options).some(function(o){ return o.value === old; })) sel.value = old;
  }
  function refreshSelects(){
    syncOldCache();
    ["categoriaSelect","mCategoria","adminOreCategoria"].forEach(updateCategorySelect);
    var c1 = document.getElementById("categoriaSelect")?.value;
    var c2 = document.getElementById("mCategoria")?.value;
    var c3 = document.getElementById("adminOreCategoria")?.value;
    if(c1) updateLavSelect(c1, "lavorazioneSelect");
    if(c2) updateLavSelect(c2, "mLavorazione");
    if(c3) updateLavSelect(c3, "adminOreLavorazione");
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
  }
  function renderPanel(){
    var sec = document.getElementById("lavorazioni");
    if(!sec) return;
    sec.setAttribute("data-tp-v58", "1");
    sec.innerHTML =
      '<div class="grid">' +
        '<div class="card span-7">' +
          '<h3>Lavorazioni Supabase</h3>' +
          '<p>Gestione lavorazioni salvate nella tabella <b>lavorazioni</b> usando la colonna reale <b>nome</b>.</p>' +
          '<div class="admin-actions" style="margin-bottom:12px">' +
            '<button class="primary" onclick="tpLoadLavorazioniSupabaseV58(true)">Ricarica da Supabase</button>' +
            '<button class="secondary" onclick="tpCancellaTutteLavorazioniV58()">Cancella tutte</button>' +
          '</div>' +
          '<table><thead><tr><th>ID</th><th>Categoria</th><th>Lavorazioni collegate</th><th>Azioni</th></tr></thead><tbody id="lavBodyV58"><tr><td colspan="4">Caricamento...</td></tr></tbody></table>' +
        '</div>' +
        '<div class="card span-5">' +
          '<h3>Crea / modifica lavorazioni</h3>' +
          '<div class="form-grid">' +
            '<div class="f4"><label>ID</label><input id="lavCodiceV58" placeholder="100"></div>' +
            '<div class="f8"><label>Categoria</label><input id="lavCategoriaV58" placeholder="Cartongesso"></div>' +
            '<div class="f12"><label>Lavorazioni collegate</label><textarea id="lavListaV58" placeholder="Una nuova lavorazione per riga"></textarea></div>' +
            '<div class="f6"><label>Stato</label><select id="lavStatoV58"><option>Attivo</option><option>Non attivo</option></select></div>' +
            '<div class="f6"><label>Database</label><input value="Supabase: lavorazioni.nome" disabled></div>' +
            '<div class="f12"><button id="lavSaveBtnV58" class="primary" onclick="tpSalvaLavorazioniV58()">Aggiungi lavorazioni su Supabase</button></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    renderTable();
  }
  function renderTable(){
    var body = document.getElementById("lavBodyV58");
    if(!body) return;
    var g = groupRows();
    var keys = Object.keys(g).sort(sortIt);
    if(!keys.length){
      body.innerHTML = '<tr><td colspan="4">Nessuna lavorazione nel database. Creale dal modulo a destra.</td></tr>';
      return;
    }
    body.innerHTML = keys.map(function(k){
      var x = g[k];
      return '<tr>' +
        '<td>' + esc(x.codice) + '</td>' +
        '<td>' + esc(x.nome) + '</td>' +
        '<td>' + esc(x.rows.map(function(r){ return r.nome; }).join(", ")) + '</td>' +
        '<td><div class="action-mini-row">' +
          '<button class="tiny-btn" onclick="tpModificaCategoriaLavorazioniV58(\'' + esc(x.codice) + '\')">Modifica</button>' +
          '<button class="tiny-btn red" onclick="tpCancellaCategoriaLavorazioniV58(\'' + esc(x.codice) + '\')">Elimina</button>' +
        '</div></td>' +
      '</tr>';
    }).join("");
  }
  async function load(showErrors){
    var client = sb();
    if(!client){
      if(showErrors) alert("Supabase non collegato. Controlla SUPABASE_URL e SUPABASE_ANON_KEY.");
      return window.__tpLavV58 || [];
    }
    try{
      var res = await client
        .from(TABLE)
        .select("id,categoria_codice,categoria_nome,nome,attivo,ordinamento")
        .order("categoria_codice", {ascending:true})
        .order("ordinamento", {ascending:true});
      if(res.error) throw res.error;
      window.__tpLavV58 = res.data || [];
      syncOldCache();
      renderTable();
      refreshSelects();
      return window.__tpLavV58;
    }catch(e){
      if(showErrors) alert("Errore lettura lavorazioni V58: " + msg(e));
      return window.__tpLavV58 || [];
    }
  }
  async function save(){
    var codice = norm(document.getElementById("lavCodiceV58")?.value || document.getElementById("lavCodiceV56")?.value || document.getElementById("lavCodiceV55")?.value);
    var categoria = norm(document.getElementById("lavCategoriaV58")?.value || document.getElementById("lavCategoriaV56")?.value || document.getElementById("lavCategoriaV55")?.value);
    var stato = norm(document.getElementById("lavStatoV58")?.value || document.getElementById("lavStatoV56")?.value || document.getElementById("lavStatoV55")?.value || "Attivo");
    var lista = String(document.getElementById("lavListaV58")?.value || document.getElementById("lavListaV56")?.value || document.getElementById("lavListaV55")?.value || "");
    var righe = uniq(lista.split(/\n|,/));
    if(!codice || !categoria || !righe.length){
      alert("Inserisci ID, categoria e almeno una lavorazione.");
      return;
    }
    var client = sb();
    if(!client){
      alert("Supabase non collegato. Controlla la Publishable key nel file script.js.");
      return;
    }
    var btn = document.getElementById("lavSaveBtnV58") || document.getElementById("lavSaveBtnV56") || document.getElementById("lavSaveBtnV55");
    if(btn){ btn.disabled = true; btn.textContent = "Salvataggio..."; }
    try{
      // V59: non cancellare piu tutta la categoria prima del salvataggio.
      // In questo modo le nuove lavorazioni si sommano a quelle gia presenti.
      var exist = await client
        .from(TABLE)
        .select("id,categoria_codice,categoria_nome,nome,attivo,ordinamento")
        .eq("categoria_codice", codice)
        .order("ordinamento", {ascending:true});
      if(exist.error) throw exist.error;

      var esistenti = exist.data || [];
      var nomiEsistenti = {};
      var maxOrdine = 0;
      esistenti.forEach(function(r){
        var key = norm(r.nome).toLowerCase();
        if(key) nomiEsistenti[key] = true;
        maxOrdine = Math.max(maxOrdine, Number(r.ordinamento || 0));
      });

      var nuove = righe.filter(function(nome){
        return !nomiEsistenti[norm(nome).toLowerCase()];
      });

      // Aggiorna categoria_nome e stato delle righe gia presenti nella categoria.
      if(esistenti.length){
        var upd = await client
          .from(TABLE)
          .update({
            categoria_nome: categoria,
            attivo: stato.toLowerCase() === "attivo",
            updated_at: new Date().toISOString()
          })
          .eq("categoria_codice", codice);
        if(upd.error) throw upd.error;
      }

      if(nuove.length){
        var payload = nuove.map(function(nome, idx){
          return {
            categoria_codice: codice,
            categoria_nome: categoria,
            nome: nome,
            attivo: stato.toLowerCase() === "attivo",
            ordinamento: maxOrdine + idx + 1,
            updated_at: new Date().toISOString()
          };
        });
        var ins = await client.from(TABLE).insert(payload).select("id,categoria_codice,categoria_nome,nome,attivo,ordinamento");
        if(ins.error) throw ins.error;
      }

      if(document.getElementById("lavListaV58")) document.getElementById("lavListaV58").value = "";
      if(document.getElementById("lavListaV56")) document.getElementById("lavListaV56").value = "";
      if(document.getElementById("lavListaV55")) document.getElementById("lavListaV55").value = "";
      await load(false);
      alert(nuove.length ? ("Aggiunte " + nuove.length + " lavorazioni su Supabase.") : "Nessuna nuova lavorazione: erano gia presenti. Categoria aggiornata.");
    }catch(e){
      alert("Errore Supabase lavorazioni V59: " + msg(e));
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = "Aggiungi lavorazioni su Supabase"; }
    }
  }
  async function deleteCategory(codice){
    codice = norm(codice);
    if(!codice) return;
    if(!confirm("Cancellare tutte le lavorazioni della categoria " + codice + "?")) return;
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var res = await client.from(TABLE).delete().eq("categoria_codice", codice);
    if(res.error){ alert("Errore cancellazione: " + msg(res.error)); return; }
    await load(false);
    alert("Categoria cancellata.");
  }
  async function deleteAll(){
    if(!confirm("Vuoi cancellare TUTTE le lavorazioni da Supabase?")) return;
    var client = sb();
    if(!client){ alert("Supabase non collegato."); return; }
    var res = await client.from(TABLE).delete().not("id", "is", null);
    if(res.error){ alert("Errore cancellazione: " + msg(res.error)); return; }
    window.__tpLavV58 = [];
    syncOldCache();
    renderTable();
    refreshSelects();
    alert("Tutte le lavorazioni sono state cancellate.");
  }
  function editCategory(codice){
    var g = groupRows()[codice];
    if(!g) return;
    var cod = document.getElementById("lavCodiceV58");
    var cat = document.getElementById("lavCategoriaV58");
    var lis = document.getElementById("lavListaV58");
    var sta = document.getElementById("lavStatoV58");
    if(cod) cod.value = g.codice;
    if(cat) cat.value = g.nome;
    if(lis) lis.value = g.rows.map(function(r){ return r.nome; }).join("\n");
    if(sta) sta.value = "Attivo";
  }

  window.tpLoadLavorazioniSupabaseV58 = load;
  window.tpSalvaLavorazioniV58 = save;
  window.tpCancellaTutteLavorazioniV58 = deleteAll;
  window.tpModificaCategoriaLavorazioniV58 = editCategory;
  window.tpCancellaCategoriaLavorazioniV58 = deleteCategory;

  window.tpLoadLavorazioniSupabaseV57 = load;
  window.tpLoadLavorazioniSupabaseV56 = load;
  window.tpLoadLavorazioniSupabaseV55 = load;
  window.tpSalvaLavorazioniV57 = save;
  window.tpSalvaLavorazioniV56 = save;
  window.tpSalvaLavorazioniV55 = save;
  window.tpCancellaTutteLavorazioniV57 = deleteAll;
  window.tpCancellaTutteLavorazioniV56 = deleteAll;
  window.tpCancellaTutteLavorazioniV55 = deleteAll;

  window.aggiornaLavorazioni = function(){
    var c = document.getElementById("categoriaSelect")?.value;
    if(c) updateLavSelect(c, "lavorazioneSelect");
  };
  window.aggiornaLavorazioniMobile = function(){
    var c = document.getElementById("mCategoria")?.value;
    if(c) updateLavSelect(c, "mLavorazione");
  };
  window.adminAggiornaLavorazioniMese = function(){
    var c = document.getElementById("adminOreCategoria")?.value;
    if(c) updateLavSelect(c, "adminOreLavorazione");
  };

  window.addEventListener("load", function(){
    setTimeout(function(){ renderPanel(); load(false); }, 300);
    setTimeout(function(){ renderPanel(); load(false); }, 1500);
  });
})();


/* ===== v60 - Caricamento collaboratori Supabase sempre attivo online ===== */
(function(){
  function tpSbV60(){ return window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null); }
  function tpTrimV60(v){ return String(v == null ? "" : v).trim(); }
  function tpNormCollV60(row){
    row = row || {};
    return {
      id: row.id || "",
      nome: row.nome || "",
      email: row.email || "",
      ruolo: row.ruolo || "Operaio",
      stato: row.stato || "Attivo",
      password: row.password_app || row.password || "",
      maxOre: Number(row.max_ore_giorno || row.maxOre || 10)
    };
  }
  function tpRefreshCollUiV60(){
    try{ if(typeof adminSave === "function") adminSave(); }catch(e){}
    try{ if(typeof renderAdminData === "function") renderAdminData(); }catch(e){}
    try{ if(typeof fillAdminMonthSelects === "function") fillAdminMonthSelects(); }catch(e){}
    try{ if(typeof popolaRaccoltaOperaiSelect === "function") popolaRaccoltaOperaiSelect(); }catch(e){}
    try{ if(typeof renderRaccoltaOperai === "function") renderRaccoltaOperai(); }catch(e){}
    try{ if(typeof renderAdminPresenzeOggi === "function") renderAdminPresenzeOggi(); }catch(e){}
  }
  async function tpCaricaCollaboratoriSempreV60(showAlert){
    var sb = tpSbV60();
    if(!sb){ if(showAlert) alert("Supabase non collegato."); return []; }
    var res = await sb
      .from("collaboratori")
      .select("id,nome,email,ruolo,stato,password_app,max_ore_giorno")
      .order("nome", {ascending:true});
    if(res.error){
      console.error("Errore caricamento collaboratori V60:", res.error);
      if(showAlert) alert("Errore caricamento collaboratori Supabase: " + (res.error.message || res.error));
      return [];
    }
    var lista = (res.data || []).map(tpNormCollV60).filter(function(x){ return tpTrimV60(x.nome); });
    try{
      window.adminData = window.adminData || {};
      window.adminData.operai = lista;
      if(typeof adminData !== "undefined" && adminData) adminData.operai = lista;
    }catch(e){ console.warn("Impossibile impostare adminData.operai V60", e); }
    tpRefreshCollUiV60();
    if(showAlert) alert("Collaboratori caricati da Supabase: " + lista.length);
    return lista;
  }
  window.caricaCollaboratoriDaSupabase = tpCaricaCollaboratoriSempreV60;
  window.tpCaricaCollaboratoriSupabaseCompleto = tpCaricaCollaboratoriSempreV60;
  window.tpRicaricaCollaboratoriSupabaseV60 = function(){ return tpCaricaCollaboratoriSempreV60(true); };

  function tpAddReloadCollButtonV60(){
    if(document.getElementById("tpReloadCollaboratoriSupabaseBtn")) return;
    var card = document.querySelector("#collaboratori .card.span-4 .form-grid") || document.querySelector("#collaboratori .form-grid");
    if(!card) return;
    var div = document.createElement("div");
    div.className = "f12";
    div.innerHTML = '<button id="tpReloadCollaboratoriSupabaseBtn" class="secondary" type="button" onclick="tpRicaricaCollaboratoriSupabaseV60()">Ricarica collaboratori da Supabase</button><p class="mini-note">Usalo se online vedi ancora una lista vecchia.</p>';
    card.appendChild(div);
  }

  var oldShowSectionV60 = window.showSection;
  if(typeof oldShowSectionV60 === "function" && !oldShowSectionV60.__tpV60Coll){
    var patchedShowV60 = function(id){
      var out = oldShowSectionV60.apply(this, arguments);
      if(["admin","collaboratori","raccoltaOperai","ore"].indexOf(id) >= 0){
        setTimeout(function(){ tpCaricaCollaboratoriSempreV60(false); }, 250);
        setTimeout(tpAddReloadCollButtonV60, 500);
      }
      return out;
    };
    patchedShowV60.__tpV60Coll = true;
    window.showSection = patchedShowV60;
  }

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(function(){ tpCaricaCollaboratoriSempreV60(false); }, 800);
    setTimeout(tpAddReloadCollButtonV60, 1200);
  });
  window.addEventListener("load", function(){
    setTimeout(function(){ tpCaricaCollaboratoriSempreV60(false); }, 1200);
    setTimeout(function(){ tpCaricaCollaboratoriSempreV60(false); }, 3000);
    setTimeout(tpAddReloadCollButtonV60, 1600);
  });
})();

/* ===== V61 - blocco definitivo: collaboratore vede solo area operaio ===== */
(function(){
  function tpV61Norm(v){ return String(v || '').trim().toLowerCase(); }
  function tpV61Role(){
    try{
      var p = window.supabaseProfiloCorrente || (typeof supabaseProfiloCorrente !== 'undefined' ? supabaseProfiloCorrente : null);
      return tpV61Norm(p && p.ruolo);
    }catch(e){ return ''; }
  }
  function tpV61IsAdmin(){
    var r = tpV61Role();
    var unlocked = false;
    try{ unlocked = !!adminUnlocked || sessionStorage.getItem('tecnoplafonAdminUnlocked') === '1'; }catch(e){}
    return unlocked || r === 'admin' || r === 'caposquadra' || r === 'amministratore';
  }
  function tpV61Logged(){
    return document.body.classList.contains('tp-auth-ok') || document.body.classList.contains('tp-login-ok');
  }
  function tpV61CurrentVisibleAdminSection(){
    var ids = ['admin','ore','raccoltaOperai','cantieri','lavorazioni','collaboratori','regole','calendari','economia'];
    return ids.some(function(id){
      var el = document.getElementById(id);
      return el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
    });
  }
  function tpV61ForceWorker(){
    if(!tpV61Logged() || tpV61IsAdmin()) return;
    try{ adminUnlocked = false; sessionStorage.removeItem('tecnoplafonAdminUnlocked'); }catch(e){}
    document.body.classList.add('worker-view');
    document.body.classList.remove('admin-view');
    var operaio = document.getElementById('operaio');
    document.querySelectorAll('.section').forEach(function(s){
      if(s.id === 'operaio') s.classList.remove('hidden');
      else s.classList.add('hidden');
    });
    if(operaio) operaio.style.display = '';
    var title = document.getElementById('pageTitle');
    var subtitle = document.getElementById('pageSubtitle');
    if(title) title.textContent = 'Area operaio';
    if(subtitle) subtitle.textContent = 'Portale collaboratore: inserimento ore, richieste e riepilogo personale.';
  }

  var oldShow = window.showSection;
  if(typeof oldShow === 'function' && !oldShow.__tpV61WorkerGuard){
    window.showSection = function(id){
      if(id !== 'operaio' && tpV61Logged() && !tpV61IsAdmin()){
        id = 'operaio';
      }
      var out = oldShow.apply(this, arguments.length ? [id] : arguments);
      setTimeout(tpV61ForceWorker, 0);
      return out;
    };
    window.showSection.__tpV61WorkerGuard = true;
  }

  document.addEventListener('click', function(ev){
    if(!tpV61Logged() || tpV61IsAdmin()) return;
    var target = ev.target && ev.target.closest ? ev.target.closest('button,a') : null;
    if(!target) return;
    var txt = (target.textContent || '').toLowerCase();
    var attr = (target.getAttribute('onclick') || '') + ' ' + (target.getAttribute('href') || '');
    if(/cantieri|admin|raccolta|lavorazioni|collaboratori|regole|calendari|economia/.test(txt + ' ' + attr)){
      ev.preventDefault();
      ev.stopPropagation();
      tpV61ForceWorker();
      return false;
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(tpV61ForceWorker, 300);
    setTimeout(tpV61ForceWorker, 1000);
    setTimeout(tpV61ForceWorker, 2000);
  });
  window.addEventListener('load', function(){
    setTimeout(tpV61ForceWorker, 300);
    setTimeout(tpV61ForceWorker, 1500);
  });
  setInterval(function(){
    if(tpV61CurrentVisibleAdminSection()) tpV61ForceWorker();
  }, 700);
})();
