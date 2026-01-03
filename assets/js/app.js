const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ---------- Arredondamento clássico ----------
function roundClassico(x, dec) {
  const f = Math.pow(10, dec);
  return Math.round(x * f) / f;
}
function formatar(x, dec) {
  if (!Number.isFinite(x)) return "—";
  return roundClassico(x, dec).toFixed(dec);
}

// ---------- Helpers ----------
function tabela(el, headers, rows){
  el.innerHTML = `<table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function parseNumeros(txt){
  if(!txt) return [];
  return txt.replace(/[;\t\n]/g," ").trim().split(/\s+/)
    .map(t=>t.replace(",",".")).map(Number).filter(v=>Number.isFinite(v));
}
async function lerCSV(file){
  const t = await file.text();
  return t.split(/\r?\n/).filter(Boolean).map(l=>l.split(/[;,]/)[0].trim())
    .map(x=>x.replace(",",".")).map(Number).filter(v=>Number.isFinite(v));
}

// ---------- Estatística (discreto) ----------
function tabelaFrequencia(valores, rotulo){
  const m=new Map(); valores.forEach(v=>m.set(v,(m.get(v)||0)+1));
  const keys=[...m.keys()].sort((a,b)=>a-b);
  let N=valores.length, Fac=0, Frac=0; const rows=[];
  for(const k of keys){ const fi=m.get(k), fr = fi/N; Fac+=fi; Frac+=fr; rows.push({[rotulo]:k,fi,Fac,fr,Frac}); }
  return {rows,N};
}
function posicoes(rows){ let p=0; return rows.map(r=>{ const a=p+1, b=r.Fac; p=b; return a===b?`${a}ª`:`${a}ª a ${b}ª`; }); }
function media(rows,rotulo){ let s=0,n=0; rows.forEach(r=>{ s+=r[rotulo]*r.fi; n+=r.fi; }); return {media: s/n}; }
function mediana(rows,N,rotulo){ const em=(N+1)/2, at=q=>rows.find(r=>r.Fac>=q)[rotulo]; return N%2? at(Math.ceil(em)) : (at(N/2)+at(N/2+1))/2; }
function moda(rows,rotulo){ const mx = Math.max(...rows.map(r=>r.fi)); if(new Set(rows.map(r=>r.fi)).size===1) return []; return rows.filter(r=>r.fi===mx).map(r=>r[rotulo]); }
function classificacaoModa(mo){
  if(!mo || mo.length===0) return "Amodal";
  if(mo.length===1) return "Unimodal";
  if(mo.length===2) return "Bimodal";
  return "Multimodal";
}
function variancia(rows,tipo,rotulo){ const {media:mu}=media(rows,rotulo); const N=rows.reduce((a,r)=>a+r.fi,0); let S=0; rows.forEach(r=>{ const d=r[rotulo]-mu; S+=d*d*r.fi; }); const div = tipo.startsWith("Amostral") ? (N-1 || 1) : (N || 1); const v=S/div; return {v, dp: Math.sqrt(v), mu}; }

// ---------- Agrupamento em classes (automático) ----------
function tabelaClasses(valores, k){
  if(!valores || valores.length===0) return {rows: [], N: 0};
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min;
  const h = (amplitude === 0) ? 1 : amplitude / k;

  const rows = [];
  let Fac = 0, Frac = 0;
  const N = valores.length;

  for(let i=0; i<k; i++){
    const li = (amplitude === 0) ? min : (min + i*h);
    const ls = (i === k-1 || amplitude === 0) ? max : (li + h);
    const fi = valores.filter(v => {
      if(amplitude === 0) return true;
      if(i===k-1) return v >= li && v <= ls;
      return v >= li && v < ls;
    }).length;
    const fr = fi / N;
    Fac += fi;
    Frac += fr;
    rows.push({
      classe: `${formatar(li,2)} |— ${formatar(ls,2)}`,
      li, ls, fi, Fac, fr, Frac
    });
  }
  return {rows, N};
}
function renderClasses(valores, k){
  const {rows,N} = tabelaClasses(valores,k);
  tabela($("#tabelaClasses"),["Classe","fi","Fac","fr","Frac"], rows.map(r=>[r.classe, r.fi, r.Fac, formatar(r.fr,4), formatar(r.Frac,4)]));
  $("#nInfoClasses").textContent = `N = ${N}`;
}

// ---------- Entrada manual de classes (Li Ls fi) ----------
function parseTabelaClasses(txt){
  if(!txt) return [];
  return txt.trim().split(/\r?\n/).map(linha=>{
    const partes = linha.trim().split(/[\s,;]+/);
    if(partes.length < 3) return null;
    const li = Number(partes[0]), ls = Number(partes[1]), fi = Number(partes[2]);
    if(!Number.isFinite(li) || !Number.isFinite(ls) || !Number.isFinite(fi)) return null;
    return {li, ls, fi};
  }).filter(x=>x !== null);
}
function renderTabelaClassesManual(){
  const txt = $("#entradaTabelaClasses").value || "";
  const rows = parseTabelaClasses(txt);
  if(!rows.length) { alert("Tabela inválida — verifique o formato Li Ls fi por linha."); return; }

  if (rows.length > 7) {
    alert(`Erro: A entrada manual não pode ter mais que 7 linhas (classes). Você inseriu ${rows.length} linhas.`);
    return; // Para a execução
  }

  let Fac = 0, totalFi = rows.reduce((a,r)=>a + r.fi, 0);
  rows.forEach(r => {
    Fac += r.fi;
    r.Fac = Fac;
    r.H = r.ls - r.li;
    r.Pmi = 0.5 * (r.li + r.ls);
    r.fr = totalFi ? (r.fi / totalFi) : 0;
  });

  tabela($("#tabelaAmplitude"), ["Li","Ls","H","fi"], rows.map(r=>[formatar(r.li,2), formatar(r.ls,2), formatar(r.H,2), r.fi]));
  tabela($("#tabelaPontoMedio"), ["Li","Ls","Pmi"], rows.map(r=>[formatar(r.li,2), formatar(r.ls,2), formatar(r.Pmi,2)]));
}

// ---------- Funções da Distribuição Normal (Z) ----------
// Esta é a 'Tabela Z' em forma de código (Função de Distribuição Cumulativa)
function zCumulativeProbability(z) {
  // Esta é uma aproximação matemática padrão (fórmula de Abramowitz e Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  // Se z for positivo, retorna 1 - probabilidade; se for negativo, retorna a probabilidade
  if (z > 0) return 1 - prob;
  return prob;
}

// ---------- Abas ----------
function bindTabs(){
  $$(".tab").forEach(t => {
    t.onclick = () => {
      $$(".tab").forEach(x=>x.classList.remove("active"));
      $$(".tabpanel").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      const target = document.getElementById(t.dataset.tab);
      if(target) target.classList.add("active");
    };
  });
}
bindTabs();

// ---------- Render ----------
function kpi(label,valor,suf=""){ return `<div class="kpi"><div class="label">${label}</div><div class="value">${valor}${suf}</div></div>`; }
function render(valores){
  valores = valores || [];
  const rotulo = $("#rotuloVar") ? $("#rotuloVar").value.trim() || "Valor" : "Valor";
  const unidade = $("#unidadeVar") ? $("#unidadeVar").value.trim() : "";
  const tipo = $("#tipoVar") ? $("#tipoVar").value : "Amostral (÷ N-1)";
  const dec = 2;

  if(!valores.length){
    $("#dadosOrdenados") && ($("#dadosOrdenados").textContent = "—");
    $("#nInfo") && ($("#nInfo").textContent = "");
    return;
  }

  const ordenados = [...valores].sort((a,b)=>a-b);
  $("#dadosOrdenados").textContent = JSON.stringify(ordenados);

  const {rows, N} = tabelaFrequencia(ordenados, rotulo);
  $("#nInfo").textContent = `N = ${N}`;

  const m = media(rows,rotulo);
  const med = mediana(rows,N,rotulo);
  const mo = moda(rows,rotulo);
  const v = variancia(rows,tipo,rotulo);
  const cv = v.mu ? v.dp / v.mu * 100 : NaN;

  $("#kpiMedia").innerHTML   = kpi("Média", formatar(m.media,dec), ` ${unidade}`);
  $("#kpiMediana").innerHTML = kpi("Mediana", formatar(med,dec), ` ${unidade}`);
  $("#kpiModa").innerHTML    = kpi("Moda", mo.length ? mo.join(", ") : "—") + kpi("Classificação", classificacaoModa(mo));
  $("#kpiDisp").innerHTML    = kpi("DP", formatar(v.dp,dec), ` ${unidade}`) + kpi("Var", formatar(v.v,dec)) + kpi("CV", isNaN(cv) ? "—" : formatar(cv,dec)+"%") + kpi("N", N);

  $("#tabelaBase") && tabela($("#tabelaBase"), [rotulo,"fi","Fac","fr","Frac"], rows.map(r=>[r[rotulo], r.fi, r.Fac, formatar(r.fr,2), formatar(r.Frac,2)]));
  $("#tabelaFreq") && tabela($("#tabelaFreq"), [rotulo,"fi","Fac","fr","Frac"], rows.map(r=>[r[rotulo], r.fi, r.Fac, formatar(r.fr,2), formatar(r.Frac,2)]));
  $("#tabelaPosicoes") && tabela($("#tabelaPosicoes"), [rotulo,"Fac","Posição"], rows.map((r,i)=>[r[rotulo], r.Fac, posicoes(rows)[i]]));
}

function limparTudoDiscreto() {
  // Limpa entradas
  $("#entradaBruta").value = "";
  $("#csvPreview").textContent = "Nenhum arquivo selecionado.";
  $("#arquivoCSV").value = "";
  $("#nInfo").textContent = "";

  // Limpa dados e tabelas
  $("#dadosOrdenados").textContent = "—";
  $("#tabelaBase").innerHTML = "";
  $("#tabelaFreq").innerHTML = "";
  $("#tabelaPosicoes").innerHTML = "";

  // Limpa os KPIs
  $("#kpiMedia").innerHTML = "";
  $("#kpiMediana").innerHTML = "";
  $("#kpiModa").innerHTML = "";
  $("#kpiDisp").innerHTML = "";
}
function limparTudoClasses() {
  // Limpa a caixa de texto manual
  $("#entradaTabelaClasses").value = "";

  // ADICIONE ESTAS DUAS LINHAS:
  $("#arquivoClassesCSV").value = "";
  $("#csvClassesPreview").textContent = "Nenhum arquivo selecionado.";

  // Limpa as tabelas de resultado
  $("#tabelaAmplitude").innerHTML = "";
  $("#tabelaPontoMedio").innerHTML = "";
}

function limparTudoNormal() {
  // 1. Limpar os 5 inputs
  $("#zInputX").value = "";
  $("#zInputX2").value = "";
  $("#zInputMedia").value = "";
  $("#zInputDesvioPadrao").value = "";
  $("#zInputAmostra").value = "";

  // 2. Limpar os KPIs de resultado das abas
  $("#kpiZScore").innerHTML = "";
  $("#kpiCaso1").innerHTML = "";
  $("#kpiCaso2").innerHTML = "";
  $("#kpiCaso3").innerHTML = "";
  $("#kpiCaso4").innerHTML = "";
  $("#kpiCaso5").innerHTML = "";
  $("#kpiCaso6").innerHTML = "";
  $("#kpiCaso7").innerHTML = "";
  
  // 3. Limpar a aba "Consultar Tabela Z"
  $("#zConsultaInput").value = "";
  $("#kpiConsultaZ").innerHTML = "";
}

function limparTudoVAD() {
  // 1. Limpar inputs
  $("#binInputN").value = "";
  $("#binInputP").value = "";
  $("#binInputA").value = ""; // ID ANTIGO: binInputX
  $("#binInputB").value = ""; // ID ANTIGO: binInputX2
  $("#binTipoCalculo").value = "igual"; // Reseta o dropdown
  $("#binHolderB").style.display = "none"; // Esconde o campo 'b'

  // 2. Limpar KPIs (painéis das abas)
  $("#kpiBinProb").innerHTML = "";
  $("#kpiBinMedia").innerHTML = "";
  $("#kpiBinVar").innerHTML = "";
  $("#kpiBinDesvio").innerHTML = "";
  $("#kpiBinCV").innerHTML = "";

  // 3. Esconder a seção de abas
  $("#tabsVAD").style.display = "none";
}

function limparTudoExponencial() {
  // 1. Limpar inputs
  $("#expInputLambda").value = "";
  $("#expInputX").value = "";
  $("#expInputX2").value = ""; // <-- ADICIONADO

  // 2. Limpar KPIs (painéis das abas)
  $("#kpiExpProbs").innerHTML = "";
  $("#kpiExpMedidas").innerHTML = "";
  
  // 3. Limpar valores dos títulos
  $("#expValX").textContent = "—";
  $("#expValLambda").textContent = "—";

  // 4. Esconder a seção de abas
  $("#tabsExponencial").style.display = "none";
}

function limparTudoUniforme() {
  // 1. Limpar inputs
  $("#uniInputA").value = "";
  $("#uniInputB").value = "";
  $("#uniInputX1").value = "";
  $("#uniInputX2").value = "";

  // 2. Limpar KPIs (painéis das abas)
  $("#kpiUniProb").innerHTML = "";
  $("#kpiUniMedidas").innerHTML = "";

  // 3. Esconder a seção de abas
  $("#tabsUniforme").style.display = "none";
}

function limparTudoPoisson() {
  // 1. Limpar inputs
  $("#poiInputLambda").value = "";
  $("#poiInputA").value = "";
  $("#poiInputB").value = "";
  $("#poiTipoCalculo").value = "igual"; // Reseta o dropdown
  $("#poiHolderB").style.display = "none"; // Esconde o campo 'b'

  // 2. Limpar KPIs (painéis das abas)
  $("#kpiPoiProbs").innerHTML = "";
  $("#kpiPoiMedidas").innerHTML = "";
  
  // 3. Limpar valores dos títulos
  $("#poiValK").textContent = "—";
  $("#poiValLambda").textContent = "—";

  // 4. Esconder a seção de abas
  $("#tabsPoisson").style.display = "none";
}

// --- Nova Função ---
// Apenas lê o conteúdo de um arquivo CSV/TXT como texto puro
async function lerCSVcomoTexto(file) {
  return await file.text();
}
// ---------- Funções da Distribuição Binomial ----------

// Função auxiliar para calcular "Combinações" (nCr)
// nCr = n! / (r! * (n-r)!)
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k; // Otimização
  
  let res = 1;
  for (let i = 1; i <= k; ++i) {
    res = res * (n - i + 1) / i;
  }
  return res;
}

// --- Nova Função ---
// Converte texto "Xi Fi" (um por linha) em uma lista de dados brutos
function parseTabelaXiFi(txt) {
  const valoresBrutos = [];
  const linhas = txt.trim().split(/\r?\n/); // Divide por linha
  
  for (const linha of linhas) {
    // Tenta extrair os dois números da linha
    const partes = linha.trim().split(/\s+/); // Divide por espaço ou tab
    if (partes.length >= 2) {
      const xi = parseFloat(partes[0].replace(",","."));
      const fi = parseInt(partes[1]);
      
      // Se forem números válidos, repete o 'xi' 'fi' vezes
      if (Number.isFinite(xi) && Number.isFinite(fi) && fi > 0) {
        for (let i = 0; i < fi; i++) {
          valoresBrutos.push(xi);
        }
      }
    }
  }
  return valoresBrutos;
}

// ---------- Funções da Distribuição de Poisson ----------

// Função auxiliar para calcular Fatorial (n!)
// (Usada para a fórmula de Poisson)
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// ---------- Eventos ----------
// Escolha inicial
$("#btnEscolherDiscreto") && ($("#btnEscolherDiscreto").onclick = ()=> {
  $("#telaInicial").style.display = "none";
  $("#conteudoDiscreto").style.display = "block";
  $("#conteudoClasses").style.display = "none";
  $("#botoesHeader").style.display = "flex";
  $("#btnLimpar").style.display = "block"; //
  $("#headerSubtitulo").style.display = "none";
});

$("#btnEscolherClasses") && ($("#btnEscolherClasses").onclick = ()=> {
  $("#telaInicial").style.display = "none";
  $("#conteudoClasses").style.display = "block";
  $("#conteudoDiscreto").style.display = "none";
  $("#botoesHeader").style.display = "flex";
  $("#btnLimpar").style.display = "block"; //
  $("#headerSubtitulo").style.display = "none";
});

// ---------- Theme toggle (initial screen button) ----------
document.addEventListener('DOMContentLoaded', ()=>{
  const storageKey = 'appvf_theme';
  const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
  const sunIcon = `<img src="assets/Icons/sun.png" alt="Sun" width="16" height="16">`;
  const moonIcon = `<img src="assets/Icons/moon.png" alt="Moon" width="16" height="16">`;

  function applyTheme(theme){
    if(theme === 'dark') document.body.classList.add('theme-dark');
    else document.body.classList.remove('theme-dark');
    toggleButtons.forEach(b => {
      b.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
      b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      b.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    });
  }

  // Init theme: saved > system preference > light
  try{
    const saved = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }catch(e){ applyTheme('light'); }

  toggleButtons.forEach(btn=> btn.addEventListener('click', ()=>{
    const isDark = document.body.classList.toggle('theme-dark');
    const theme = isDark ? 'dark' : 'light';
    try{ localStorage.setItem(storageKey, theme); }catch(e){}
    toggleButtons.forEach(b => {
      b.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
      b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      b.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    });
  }));
});

// Discreto
// NOVO CÓDIGO MODIFICADO
$("#btnProcessar") && ($("#btnProcessar").onclick = ()=> {
  const txt = $("#entradaBruta").value;
  const isTabela = $("#isTabelaFreq").checked; // Verifica o novo checkbox
  
  let vals; // Declara a variável de valores

  if (isTabela) {
    // Se o checkbox estiver marcado, usa a NOVA função
    vals = parseTabelaXiFi(txt);
  } else {
    // Se não, usa a função ORIGINAL
    vals = parseNumeros(txt);
  }

  // O resto do código funciona igual!
  if(!vals.length) return alert("Dados inválidos");
  render(vals);
});

// Classes manuais
$("#btnTabelaManual") && ($("#btnTabelaManual").onclick = ()=> {
  renderTabelaClassesManual();
});

// ---------- Eventos das Variáveis Contínuas ----------

// 1. Botão do MENU PRINCIPAL (O que você clicou)
$("#btnEscolherContinuas") && ($("#btnEscolherContinuas").onclick = () => {
  $("#telaInicial").style.display = "none";
  $("#conteudoContinuas").style.display = "block"; // Mostra o sub-menu
  
  // Esconde todas as outras telas
  $("#conteudoDiscreto").style.display = "none";
  $("#conteudoClasses").style.display = "none";
  $("#conteudoVAD").style.display = "none";
  $("#conteudoNormalCalc").style.display = "none"; 
  $("#conteudoExponencial").style.display = "none";
  $("#conteudoUniforme").style.display = "none";

  $("#botoesHeader").style.display = "flex";
  $("#btnHome").style.display = "block";       // 2. Garante que o Home apareça
  $("#btnLimpar").style.display = "none";      // 3. Esconde o Limpar
  $("#headerSubtitulo").style.display = "none";
});

// 2. Botões do SUB-MENU

// Botão para "Distribuição Normal"
$("#btnEscolherNormalCalc") && ($("#btnEscolherNormalCalc").onclick = () => {
  $("#conteudoContinuas").style.display = "none"; // Esconde o sub-menu
  $("#conteudoNormalCalc").style.display = "block"; // Mostra a calculadora
  $("#btnLimpar").style.display = "block"; //
});

// Botão para "Exponencial"
$("#btnEscolherExponencial") && ($("#btnEscolherExponencial").onclick = () => {
  $("#conteudoContinuas").style.display = "none";
  $("#conteudoExponencial").style.display = "block"; // Mostra "Em breve..."
  $("#btnLimpar").style.display = "block"; //
});

// Botão para "Uniforme"
$("#btnEscolherUniforme") && ($("#btnEscolherUniforme").onclick = () => {
  $("#conteudoContinuas").style.display = "none";
  $("#conteudoUniforme").style.display = "block"; // Mostra "Em breve..."
  $("#btnLimpar").style.display = "block"; //
});

// Evento para o botão principal "Processar Dados" da Distribuição Z (VERSÃO CORRIGIDA)
$("#btnProcessarZ") && ($("#btnProcessarZ").onclick = () => {
  // --- 1. LER OS INPUTS ---
  const x_a = parseFloat($("#zInputX").value);
  const x_b = parseFloat($("#zInputX2").value); // O campo opcional
  const media = parseFloat($("#zInputMedia").value);
  const desvio = parseFloat($("#zInputDesvioPadrao").value);
  const n = parseFloat($("#zInputAmostra").value);

  // --- 2. VALIDAR OS INPUTS OBRIGATÓRIOS ---
  if (!Number.isFinite(x_a) || !Number.isFinite(media) || !Number.isFinite(desvio) || !Number.isFinite(n)) {
    alert("Preencha os campos (x) ou (a), Média, Desvio Padrão e Tamanho da Amostra com números válidos.");
    return;
  }
  if (n <= 0 || desvio <= 0) {
    alert("O Tamanho da Amostra (N) e o Desvio Padrão (s) devem ser maiores que zero.");
    return;
  }

  // --- 3. CALCULAR Z-SCORE DE 'a' E PROBS BÁSICAS ---
  const erroPadrao = desvio / Math.sqrt(n);
  const z_a = (x_a - media) / erroPadrao;
  
  const probMenorQueA = zCumulativeProbability(z_a);        // P(Z < a)
  const probMenorQueNegA = zCumulativeProbability(-Math.abs(z_a)); // P(Z < -a)

  // --- 4. EXIBIR RESULTADOS DE VALOR ÚNICO ---
  $("#kpiZScore").innerHTML = kpi("Z-Score de (a)", formatar(z_a, 2));

  // Caso 1: P(Z >= a)
  const probCaso1 = 1 - probMenorQueA;
  $("#kpiCaso1").innerHTML = kpi("Probabilidade", formatar(probCaso1 * 100, 2), "%");

  // Caso 2: P(Z <= a)
  const probCaso2 = probMenorQueA;
  $("#kpiCaso2").innerHTML = kpi("Probabilidade", formatar(probCaso2 * 100, 2), "%");
  
  // Caso 4: P(Z <= -a)
  const probCaso4 = probMenorQueNegA;
  $("#kpiCaso4").innerHTML = kpi("Probabilidade", formatar(probCaso4 * 100, 2), "%");

  // Caso 5: P(Z > -a)
  const probCaso5 = 1 - probMenorQueNegA;
  $("#kpiCaso5").innerHTML = kpi("Probabilidade", formatar(probCaso5 * 100, 2), "%");

  // --- 5. EXIBIR RESULTADOS DE INTERVALO (CASOS 3, 6, 7) ---
  // Verificamos se o segundo valor (b) foi preenchido
  if (Number.isFinite(x_b)) {
    // 'b' foi preenchido, calculamos suas probabilidades
    const z_b = (x_b - media) / erroPadrao;
    const probMenorQueB = zCumulativeProbability(z_b);        // P(Z < b)
    const probMenorQueNegB = zCumulativeProbability(-Math.abs(z_b)); // P(Z < -b)

    // Atualiza o KPI de Z-Score para mostrar ambos
    $("#kpiZScore").innerHTML = kpi("Z-Score (a)", formatar(z_a, 2)) + kpi("Z-Score (b)", formatar(z_b, 4));

    // Caso 3: P(a < Z < b) = P(Z < b) - P(Z < a)
    // (Usamos max e min para garantir que b > a)
    const z_min = Math.min(z_a, z_b);
    const z_max = Math.max(z_a, z_b);
    const probCaso3 = zCumulativeProbability(z_max) - zCumulativeProbability(z_min);
    $("#kpiCaso3").innerHTML = kpi("Probabilidade", formatar(probCaso3 * 100, 2), "%");
    
    // Caso 6: P(-b < z < -a) (Corrigido para usar as variáveis certas)
    // (Lembre-se: probMenorQueNegA = P(Z < -a))
    const probCaso6 = probMenorQueNegA - probMenorQueNegB; 
    $("#kpiCaso6").innerHTML = kpi("Probabilidade", formatar(probCaso6 * 100, 2), "%");
    
    // Caso 7: P(-a < z < b) (Corrigido para usar as variáveis certas)
    // (Lembre-se: probMenorQueB = P(Z < b))
    const probCaso7 = probMenorQueB - probMenorQueNegA; 
    $("#kpiCaso7").innerHTML = kpi("Probabilidade", formatar(probCaso7 * 100, 2), "%");

  } else {
    // Se o campo (b) estiver vazio, mostra uma mensagem de aviso
    const msgAviso = "<p class='muted'>Este caso requer o preenchimento do campo 'Valor (b)'.</p>";
    $("#kpiCaso3").innerHTML = msgAviso;
    $("#kpiCaso6").innerHTML = msgAviso;
    $("#kpiCaso7").innerHTML = msgAviso;
  }
});

// Evento para o MENU de Variáveis Discretas
$("#btnEscolherVAD") && ($("#btnEscolherVAD").onclick = () => {
  $("#telaInicial").style.display = "none";
  $("#conteudoDiscretasMenu").style.display = "block"; // Mostra o novo sub-menu

  // Esconde todas as outras telas principais
  $("#conteudoDiscreto").style.display = "none";
  $("#conteudoClasses").style.display = "none";
  $("#conteudoContinuas").style.display = "none"; 

  $("#botoesHeader").style.display = "flex";
  $("#btnHome").style.display = "block";       // 2. Garante que o Home apareça
  $("#btnLimpar").style.display = "none";      // 3. Esconde o Limpar
  $("#headerSubtitulo").style.display = "none";
});

// Evento para o SUB-MENU -> Binomial
$("#btnEscolherBinomial") && ($("#btnEscolherBinomial").onclick = () => {
  $("#conteudoDiscretasMenu").style.display = "none"; // Esconde o sub-menu
  $("#conteudoVAD").style.display = "block"; // Mostra a calculadora Binomial
  $("#btnLimpar").style.display = "block"; //
});

// Evento para o SUB-MENU -> Poisson
$("#btnEscolherPoissonMenu") && ($("#btnEscolherPoissonMenu").onclick = () => {
  $("#conteudoDiscretasMenu").style.display = "none"; // Esconde o sub-menu
  $("#conteudoPoisson").style.display = "block"; // Mostra a calculadora Poisson
  $("#btnLimpar").style.display = "block"; //
});

// Evento para o MENU de Regrassão Linear
$("#btnEscolherRG") && ($("#btnEscolherRG").onclick = () => {
  $("#telaInicial").style.display = "none";
  $("#conteudoDiscretasMenu").style.display = "none";
  $("#conteudoRegressao").style.display = "block"; // Mostra o novo sub-menu

  // Esconde todas as outras telas principais
  $("#conteudoDiscreto").style.display = "none";
  $("#conteudoClasses").style.display = "none";
  $("#conteudoContinuas").style.display = "none"; 

  $("#botoesHeader").style.display = "flex";
  $("#btnHome").style.display = "block";       // 2. Garante que o Home apareça
  $("#btnLimpar").style.display = "block";      // 3. Esconde o Limpar
  $("#headerSubtitulo").style.display = "none";
});

// Evento para processar a Distribuição Exponencial (ATUALIZADO)
$("#btnProcessarExp") && ($("#btnProcessarExp").onclick = () => {
  // --- 1. LER OS INPUTS ---
  const lambda = parseFloat($("#expInputLambda").value);
  const x_a = parseFloat($("#expInputX").value); // Opcional 'a'
  const x_b = parseFloat($("#expInputX2").value); // Opcional 'b'

  // --- 2. VALIDAR OS INPUTS ---
  // Apenas Lambda (λ) é obrigatório
  if (!Number.isFinite(lambda) || lambda <= 0) {
    alert("A Taxa Média de Ocorrência (λ) é obrigatória e deve ser um número positivo.");
    return;
  }

  // --- 3. CALCULAR AS MEDIDAS (Sempre) ---
  const media = 1 / lambda;
  const desvio = 1 / lambda;
  const variancia = 1 / (lambda * lambda);

  // Preenche a aba "Medidas"
  $("#kpiExpMedidas").innerHTML = 
    kpi("Média (μ)", formatar(media, 2)) + 
    kpi("Desvio Padrão (σ)", formatar(desvio, 2)) +
    kpi("Variância (σ²)", formatar(variancia, 2));
  
  // Atualiza o título da aba
  $("#expValLambda").textContent = formatar(lambda, 2);

  // --- 4. CALCULAR PROBABILIDADES (Se 'a' ou 'b' existirem) ---
  const temValorA = Number.isFinite(x_a);
  const temValorB = Number.isFinite(x_b);
  let kpiProbsHTML = ""; // Começa o HTML das probabilidades vazio

  // Se o usuário preencheu o Valor (a)
  if (temValorA) {
    // P(X <= a) = 1 - e^(-λ * a)
    const probMenorA = 1 - Math.exp(-lambda * x_a);
    // P(X >= a) = e^(-λ * a)
    const probMaiorA = Math.exp(-lambda * x_a);
    
    // Adiciona os KPIs de 'a'
    kpiProbsHTML += kpi(`P(X ≤ ${x_a})`, formatar(probMenorA * 100, 2), "%");
    kpiProbsHTML += kpi(`P(X ≥ ${x_a})`, formatar(probMaiorA * 100, 2), "%");
    
    // Atualiza o título da aba com o valor 'a'
    $("#expValX").textContent = formatar(x_a, 2);
  }

  // Se o usuário preencheu 'a' E 'b'
  if (temValorA && temValorB) {
    // P(a < X <= b) = P(X <= b) - P(X <= a)
    // Garante que 'a' é o menor e 'b' é o maior
    const a = Math.min(x_a, x_b);
    const b = Math.max(x_a, x_b);
    
    const probMenorA_Intervalo = 1 - Math.exp(-lambda * a);
    const probMenorB_Intervalo = 1 - Math.exp(-lambda * b);
    
    const probIntervalo = probMenorB_Intervalo - probMenorA_Intervalo;
    
    // Adiciona o KPI do intervalo
    kpiProbsHTML += kpi(`P(${a} < X ≤ ${b})`, formatar(probIntervalo * 100, 2), "%");
    
    // Atualiza o título da aba com os dois valores
    $("#expValX").textContent = `a=${a}, b=${b}`;
  }

  // Insere todos os KPIs de Probabilidade calculados
  $("#kpiExpProbs").innerHTML = kpiProbsHTML || "<p class='muted'>Preencha o 'Valor (x) ou (a)' para calcular as probabilidades.</p>";

  // --- 5. MOSTRAR A SEÇÃO DE ABAS ---
  $("#tabsExponencial").style.display = "block";
});

// Evento para processar a Distribuição Uniforme
$("#btnProcessarUni") && ($("#btnProcessarUni").onclick = () => {
  // --- 1. LER OS INPUTS ---
  const a = parseFloat($("#uniInputA").value);
  const b = parseFloat($("#uniInputB").value);
  const x1 = parseFloat($("#uniInputX1").value);
  const x2 = parseFloat($("#uniInputX2").value);

  // --- 2. VALIDAR OS INPUTS ---
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(x1) || !Number.isFinite(x2)) {
    alert("Por favor, preencha todos os 4 campos (a, b, x1, x2) com números válidos.");
    return;
  }
  if (b <= a) {
    alert("O Limite Superior (b) deve ser maior que o Limite Inferior (a).");
    return;
  }
  if (x2 < x1) {
    alert("O Fim do Intervalo (x2) deve ser maior ou igual ao Início (x1).");
    return;
  }

  // --- 3. CALCULAR MEDIDAS DA DISTRIBUIÇÃO ---
  // Média (μ) = (a + b) / 2
  const media = (a + b) / 2;
  
  // Variância (σ²) = (b - a)² / 12
  const variancia = Math.pow(b - a, 2) / 12;
  
  // Desvio Padrão (σ) = √(Variância)
  const desvio = Math.sqrt(variancia);

  // --- 4. CALCULAR PROBABILIDADE P(x1 < X < x2) ---
  // Fórmula: (x2 - x1) / (b - a)
  
  // Garantir que x1 e x2 estejam DENTRO dos limites [a, b]
  const x1_calc = Math.max(a, x1);
  const x2_calc = Math.min(b, x2);
  
  let probIntervalo = 0;
  if (x2_calc > x1_calc) { // Só calcula se o intervalo for válido
    probIntervalo = (x2_calc - x1_calc) / (b - a);
  }

  // --- 5. EXIBIR OS RESULTADOS NAS ABAS ---
  
  // Preenche a aba "Probabilidade"
  $("#kpiUniProb").innerHTML = 
    kpi(`P(${x1} < X < ${x2})`, formatar(probIntervalo * 100, 2), "%");
    
  // Preenche a aba "Medidas"
  $("#kpiUniMedidas").innerHTML = 
    kpi("Média (μ)", formatar(media, 2)) + 
    kpi("Desvio Padrão (σ)", formatar(desvio, 2)) +
    kpi("Variância (σ²)", formatar(variancia, 2));

  // --- 6. MOSTRAR A SEÇÃO DE ABAS ---
  $("#tabsUniforme").style.display = "block";
});

// Evento para processar a Distribuição de Poisson (VERSÃO ATUALIZADA)
$("#btnProcessarPoi") && ($("#btnProcessarPoi").onclick = () => {
  // --- 1. LER OS INPUTS ---
  const lambda = parseFloat($("#poiInputLambda").value);
  const tipo = $("#poiTipoCalculo").value;
  const a = parseInt($("#poiInputA").value);
  const b = parseInt($("#poiInputB").value); // Pode ser NaN se estiver escondido

  // --- 2. VALIDAR OS INPUTS ---
  if (!Number.isFinite(lambda) || !Number.isFinite(a)) {
    alert("Por favor, preencha os campos (λ e a) com números válidos.");
    return;
  }
  if (lambda <= 0 || a < 0) {
    alert("A Média (λ) deve ser positiva e 'a' não pode ser negativo.");
    return;
  }
  // Validação para os intervalos
  const bEstaVisivel = (tipo === "intervalo_fechado" || tipo === "intervalo_aberto" || tipo === "intervalo_aberto_fechado" || tipo === "intervalo_fechado_aberto");
  if (bEstaVisivel && !Number.isFinite(b)) {
     alert("Por favor, preencha o Valor (b) para este tipo de cálculo.");
     return;
  }
  if (bEstaVisivel && (b < a)) {
    alert("O Valor (b) deve ser maior ou igual ao Valor (a).");
    return;
  }

  // --- 3. CALCULAR MEDIDAS (Baseado nas suas fórmulas) ---
  const media = lambda;
  const variancia = lambda;
  const desvio = Math.sqrt(lambda);
  
  // --- 4. CALCULAR PROBABILIDADE ---
  // Esta função interna calcula P(x=k) para Poisson
  const prob_de_k_poi = (k) => {
    // (λ^k * e^-λ) / k!
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  };

  let probSoma = 0;
  let kpiLabel = "";
  
  // Poisson não tem um 'N' (limite superior), 
  // então somamos até um ponto razoável (ex: k=100) para P(x >= a)
  // Para outros casos, o 'k' é limitado por 'a' ou 'b'
  const limiteLoop = (tipo === "maior_igual" || tipo === "maior") ? 100 : (bEstaVisivel ? b : a);

  for (let k = 0; k <= limiteLoop; k++) {
    switch (tipo) {
      case "igual": // P(x = a)
        if (k === a) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(x = ${a})`;
        break;
      case "menor_igual": // P(x ≤ a)
        if (k <= a) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(x ≤ ${a})`;
        break;
      case "menor": // P(x < a)
        if (k < a) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(x < ${a})`;
        break;
      case "maior_igual": // P(x ≥ a)
        if (k >= a) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(x ≥ ${a})`;
        break;
      case "maior": // P(x > a)
        if (k > a) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(x > ${a})`;
        break;
      case "intervalo_fechado": // P(a ≤ x ≤ b)
        if (k >= a && k <= b) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(${a} ≤ x ≤ ${b})`;
        break;
      case "intervalo_aberto": // P(a < x < b)
        if (k > a && k < b) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(${a} < x < ${b})`;
        break;
      case "intervalo_aberto_fechado": // P(a < x ≤ b)
        if (k > a && k <= b) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(${a} < x ≤ ${b})`;
        break;
      case "intervalo_fechado_aberto": // P(a ≤ x < b)
        if (k >= a && k < b) probSoma += prob_de_k_poi(k);
        kpiLabel = `P(${a} ≤ x < ${b})`;
        break;
    }
  }

  // --- 5. EXIBIR OS RESULTADOS NAS ABAS ---
  $("#kpiPoiProbs").innerHTML = kpi(kpiLabel, formatar(probSoma * 100, 2), "%") + kpi("Valor Decimal", formatar(probSoma, 6));
  
  $("#kpiPoiMedidas").innerHTML = 
    kpi("Média (μ)", formatar(media, 2)) + 
    kpi("Variância (σ²)", formatar(variancia, 2)) +
    kpi("Desvio Padrão (σ)", formatar(desvio, 2));
    
  // Atualiza os títulos das abas
  $("#poiValK").textContent = `${a}` + (bEstaVisivel ? ` a ${b}` : "");
  $("#poiValLambda").textContent = formatar(lambda, 2);

  // --- 6. MOSTRAR A SEÇÃO DE ABAS ---
  $("#tabsPoisson").style.display = "block";
});

// Inicialização
window.addEventListener("DOMContentLoaded", ()=>{
  const entrada = $("#entradaBruta") ? parseNumeros($("#entradaBruta").value) : [];
  if(entrada && entrada.length) render(entrada);
  renderizarTabelaZ();
});

// Evento "Home" (VERSÃO FINAL)
$("#btnHome") && ($("#btnHome").onclick = () => {

  // 1. O usuário está em uma calculadora Contínua?
  if ($("#conteudoNormalCalc").style.display === "block" ||
      $("#conteudoExponencial").style.display === "block" ||
      $("#conteudoUniforme").style.display === "block") {
    
    $("#conteudoContinuas").style.display = "block";
    $("#conteudoNormalCalc").style.display = "none";
    $("#conteudoExponencial").style.display = "none";
    $("#conteudoUniforme").style.display = "none";
    $("#btnLimpar").style.display = "none";

  // 2. O usuário está em uma calculadora Discreta?
  } else if ($("#conteudoVAD").style.display === "block" ||
             $("#conteudoPoisson").style.display === "block") {
    
    $("#conteudoDiscretasMenu").style.display = "block";
    $("#conteudoVAD").style.display = "none";
    $("#conteudoPoisson").style.display = "none";
    $("#btnLimpar").style.display = "none";

  // 3. Senão (volta para o menu Principal)
  } else {
    
    $("#telaInicial").style.display = "block";
    $("#headerSubtitulo").style.display = "block";
    
    // Esconde todas as telas
    $("#conteudoDiscreto").style.display = "none";
    $("#conteudoClasses").style.display = "none";
    $("#conteudoVAD").style.display = "none";
    $("#conteudoPoisson").style.display = "none";
    $("#conteudoContinuas").style.display = "none"; 
    $("#conteudoNormalCalc").style.display = "none"; 
    $("#conteudoExponencial").style.display = "none"; 
    $("#conteudoUniforme").style.display = "none"; 
    $("#conteudoDiscretasMenu").style.display = "none";
    $("#conteudoRegressao").style.display = "none"; // <-- ADICIONADO

    $("#botoesHeader").style.display = "none";
  }
});

// Evento para mostrar/esconder o campo "Valor (b)" na Binomial
$("#binTipoCalculo") && ($("#binTipoCalculo").onchange = () => {
  const tipo = $("#binTipoCalculo").value;
  const holderB = $("#binHolderB");

  if (tipo === "intervalo_fechado" || tipo === "intervalo_aberto" || tipo ==="intervalo_aberto_fechado" || tipo ==="intervalo_fechado_aberto") {
    holderB.style.display = "block"; // Mostra o campo 'b'
  } else {
    holderB.style.display = "none"; // Esconde o campo 'b'
  }
});

$("#poiTipoCalculo") && ($("#poiTipoCalculo").onchange = () => {
  const tipo = $("#poiTipoCalculo").value;
  const holderB = $("#poiHolderB");

  if (tipo === "intervalo_fechado" || tipo === "intervalo_aberto" || tipo ==="intervalo_aberto_fechado" || tipo ==="intervalo_fechado_aberto") {
    holderB.style.display = "block"; // Mostra o campo 'b'
  } else {
    holderB.style.display = "none"; // Esconde o campo 'b'
  }
});

// Evento para o upload de CSV das Classes Manuais (COM VALIDAÇÃO)
$("#arquivoClassesCSV") && ($("#arquivoClassesCSV").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;

  // 1. Pega o número de classes do dropdown
  const k = +$("#numClasses").value || 5; // Pega 3, 5 ou 7
  
  // 2. Lê o arquivo como texto
  const textoPuro = await lerCSVcomoTexto(f);
  if (!textoPuro) {
    $("#csvClassesPreview").textContent = "Arquivo vazio.";
    $("#arquivoClassesCSV").value = ""; // Limpa o input
    return;
  }
  
  // 3. Processa o texto e CONTA as linhas
  const linhas = textoPuro.trim().split(/\r?\n/);
  const numLinhasPlanilha = linhas.length;

  // 4. NOVA VALIDAÇÃO: Verifica se o número de linhas bate com 'k'
  if (numLinhasPlanilha !== k) {
    // AVISO que você pediu
    alert(`Erro: O número de classes selecionado (${k}) não é igual ao número de linhas da planilha (${numLinhasPlanilha}). Ajuste a planilha ou a seleção.`);
    
    // Limpa o que o usuário tentou carregar
    $("#arquivoClassesCSV").value = ""; 
    $("#csvClassesPreview").textContent = "Nenhum arquivo selecionado.";
    $("#entradaTabelaClasses").value = ""; // Limpa a textarea
    return; // Para a execução
  }
  
  // 5. Formata e cola na textarea (só se a validação passar)
  const textoParaTextarea = linhas
    .map(linha => linha.replace(/,/g, ' ')) // Troca "10,20,5" por "10 20 5"
    .join('\n'); // Junta as linhas com quebra de linha
    
  $("#entradaTabelaClasses").value = textoParaTextarea;
  $("#csvClassesPreview").textContent = `Planilha de ${k} linhas carregada com sucesso.`;
});

// Evento para processar a Distribuição Binomial (VERSÃO ATUALIZADA)
$("#btnProcessarBin") && ($("#btnProcessarBin").onclick = () => {
  // --- 1. LER OS INPUTS ---
  const N = parseInt($("#binInputN").value);
  const p = parseFloat($("#binInputP").value);
  const tipo = $("#binTipoCalculo").value;
  const a = parseInt($("#binInputA").value);
  const b = parseInt($("#binInputB").value); // Pode ser NaN se estiver escondido

  // --- 2. VALIDAR OS INPUTS ---
  if (!Number.isFinite(N) || !Number.isFinite(p) || !Number.isFinite(a)) {
    alert("Por favor, preencha os campos (N, p, a) com números válidos.");
    return;
  }
  if (p < 0 || p > 1) {
    alert("A Probabilidade (p) deve ser um número entre 0 e 1.");
    return;
  }
  // Validação mais complexa para os intervalos
  const bEstaVisivel = (tipo === "intervalo_fechado" || tipo === "intervalo_aberto");
  if (bEstaVisivel && !Number.isFinite(b)) {
     alert("Por favor, preencha o Valor (b) para este tipo de cálculo.");
     return;
  }
  if (N <= 0 || a < 0 || a > N || (bEstaVisivel && (b < a || b > N))) {
    alert("Verifique os valores: N deve ser positivo, e 'a'/'b' devem estar entre 0 e N.");
    return;
  }

  // --- 3. CALCULAR VALORES BASE (Média, Var, etc.) ---
  const q = 1 - p;
  const media = N * p;
  const variancia = N * p * q;
  const desvio = Math.sqrt(variancia);
  const cv = (media === 0) ? NaN : (desvio / media) * 100;

  // --- 4. CALCULAR PROBABILIDADE ---
  // Esta função interna calcula P(x=k)
  const prob_de_k = (k) => {
    const nCr = combinations(N, k);
    const p_k = Math.pow(p, k);
    const q_Nk = Math.pow(q, (N - k));
    return nCr * p_k * q_Nk;
  };

  let probSoma = 0;
  let kpiLabel = "";

  // Loop para somar probabilidades
  for (let k = 0; k <= N; k++) {
    switch (tipo) {
      case "igual": // P(x = a)
        if (k === a) probSoma += prob_de_k(k);
        kpiLabel = `P(x = ${a})`;
        break;
      case "menor_igual": // P(x ≤ a)
        if (k <= a) probSoma += prob_de_k(k);
        kpiLabel = `P(x ≤ ${a})`;
        break;
      case "menor": // P(x < a)
        if (k < a) probSoma += prob_de_k(k);
        kpiLabel = `P(x < ${a})`;
        break;
      case "maior_igual": // P(x ≥ a)
        if (k >= a) probSoma += prob_de_k(k);
        kpiLabel = `P(x ≥ ${a})`;
        break;
      case "maior": // P(x > a)
        if (k > a) probSoma += prob_de_k(k);
        kpiLabel = `P(x > ${a})`;
        break;
      case "intervalo_fechado": // P(a ≤ x ≤ b)
        if (k >= a && k <= b) probSoma += prob_de_k(k);
        kpiLabel = `P(${a} ≤ x ≤ ${b})`;
        break;
      case "intervalo_aberto": // P(a < x < b)
        if (k > a && k < b) probSoma += prob_de_k(k);
        kpiLabel = `P(${a} < x < ${b})`;
        break;
      case "intervalo_aberto_fechado": // P(a < x ≤ b)
        if (k < a && k <= b) probSoma += prob_de_k(k);
        kpiLabel = `P(${a} < x ≤ ${b})`;
        break;
      case "intervalo_fechado_aberto": // P(a ≤ x < b)
        if (k <= a && k < b) probSoma += prob_de_k(k);
        kpiLabel = `P(${a} ≤ x < ${b})`;
        break;
    }
  }

  // --- 5. EXIBIR OS RESULTADOS NAS ABAS ---
  $("#kpiBinProb").innerHTML = kpi(kpiLabel, formatar(probSoma * 100, 2), "%") + kpi("Valor Decimal", formatar(probSoma, 2));
  $("#kpiBinMedia").innerHTML = kpi("Média (μ)", formatar(media, 2));
  $("#kpiBinVar").innerHTML = kpi("Variância (σ²)", formatar(variancia, 2));
  $("#kpiBinDesvio").innerHTML = kpi("Desvio Padrão (σ)", formatar(desvio, 2));
  $("#kpiBinCV").innerHTML = kpi("Coef. Variação (CV)", formatar(cv, 2), "%");

  // --- 6. MOSTRAR A SEÇÃO DE ABAS ---
  $("#tabsVAD").style.display = "block";
});

// Evento para processar a Regressão Linear
$("#btnProcessarReg") && ($("#btnProcessarReg").onclick = () => {
  // 1. Ler os dados de X
  const valoresX = parseNumeros($("#regInputX").value);
  // 2. Ler os dados de Y
  const valoresY = parseNumeros($("#regInputY").value);
  // 3. Verificar se as listas têm o mesmo tamanho
  if (valoresX.length !== valoresY.length) {
    alert("Erro: As listas de X e Y não tem o mesmo número de itens Verifique os dados.")
    return;
  }
  // 4. Calcular as somas (Σx, Σy, Σx², Σxy, ...)
  const N = valoresX.length;
  let somaX = 0;
  let somaY = 0;
  let somaX2 = 0; // Para a soma de X²
  let somaXY = 0; // Para a soma de X*Y

  for (let i = 0; i < N; i++) {
    const x = valoresX[i];
    const y = valoresY[i];
    
    somaX += x;      // Adiciona a Σx
    somaY += y;      // Adiciona a Σy
    somaX2 += x * x; // Adiciona a Σx²
    somaXY += x * y; // Adiciona a Σxy
  }
  // 5. Calcular 'a' e 'b'
  // A fórmula é: b = (N * Σxy - Σx * Σy) / (N * Σx² - (Σx)²)
  const numeradorB = (N * somaXY) - (somaX * somaY);
  const denominadorB = (N * somaX2) - (somaX * somaX); // (Σx)² é o mesmo que somaX * somaX
  // Coeficiente 'b' (angular)
  const b = numeradorB / denominadorB;
  // Coeficiente 'a' (intercepto)
  const a = (somaY / N) - (b * (somaX / N));
  // 6. Calcular r²
  const mediaY = somaY / N;
  let somaVE = 0;
  let somaVNE = 0;

  for (let i = 0; i < N; i++) {
    const x = valoresX[i];
    const y = valoresY[i];

    // Esta é a fórmula que você perguntou: y_hat = a + b*x
    const y_hat = a + (b * x); 

    // Calcula VE = Σ(ŷ - ȳ)²
    somaVE += Math.pow(y_hat - mediaY, 2);
    
    // Calcula VNE = Σ(y - ŷ)²
    somaVNE += Math.pow(y - y_hat, 2);
  }
  // Nomes de variáveis baseados nas suas anotações
  const VE = somaVE;
  const VNE = somaVNE;
  // 7. Calcular r² e VT (Variação Total)
  const VT = VE + VNE;
  // r² = VE / VT (e multiplicamos por 100 para percentual)
  // Adicionamos (VT === 0 ? 0 : ...) para evitar divisão por zero
  const r2 = (VT === 0) ? 0 : (VE / VT) * 100;
  // --- 8. PREENCHER AS ABAS DE RESULTADO ---
  // Preenche a Aba 1: Equação e Coeficientes
  $("#kpiRegEquacao").innerHTML = 
    kpi("Coeficiente 'a' (Intercepto)", formatar(a, 2)) +
    kpi("Coeficiente 'b' (Angular)", formatar(b, 2)) +
    kpi("Coeficiente r²", formatar(r2, 2), "%");

  // Preenche a Aba 3: Valores da Variação
  $("#kpiRegVariacao").innerHTML = 
    kpi("Variação Explicada (VE)", formatar(VE, 2)) +
    kpi("Variação Não Explicada (VNE)", formatar(VNE, 2)) +
    kpi("Variação Total (VT)", formatar(VT, 2));

  // --- 9. MOSTRAR A SEÇÃO DE ABAS ---
  // A linha mais importante: torna os resultados visíveis!
  $("#tabsREG").style.display = "block";
});

// Evento "Limpar" inteligente (VERSÃO FINAL)
$("#btnLimpar") && ($("#btnLimpar").onclick = ()=> {

  if ($("#conteudoDiscreto").style.display === "block") {
    limparTudoDiscreto();
  } else if ($("#conteudoClasses").style.display === "block") {
    limparTudoClasses();
  } else if ($("#conteudoNormalCalc").style.display === "block") { 
    limparTudoNormal(); 
  } else if ($("#conteudoVAD").style.display === "block") { 
    limparTudoVAD();
  } else if ($("#conteudoExponencial").style.display === "block") { 
    limparTudoExponencial();
  } else if ($("#conteudoUniforme").style.display === "block") { 
    limparTudoUniforme();
  } else if ($("#conteudoPoisson").style.display === "block") { 
    limparTudoPoisson();
  } else if ($("#conteudoRegressao").style.display === "block") { // <-- ADICIONADO
    limparTudoRegressao();
  }
});

// NOVO CÓDIGO MODIFICADO - Lida com os dois tipos de importação
$("#arquivoCSV") && ($("#arquivoCSV").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;

  const isTabela = $("#isTabelaFreq").checked; // Verifica o checkbox

  if (isTabela) {
    // MODO "Xi Fi": Lê o texto puro e coloca na caixa
    const textoPuro = await lerCSVcomoTexto(f);
    if (textoPuro) {
      $("#entradaBruta").value = textoPuro;
      // Conta as linhas para dar um feedback útil
      const numLinhas = textoPuro.trim().split(/\r?\n/).length;
      $("#csvPreview").textContent = `Detectadas ${numLinhas} linhas (Formato Xi Fi).`;
    } else {
      $("#csvPreview").textContent = "Arquivo vazio.";
    }
  } else {
    // MODO "Coluna Única" (comportamento original)
    const vals = await lerCSV(f);
    $("#csvPreview").textContent = vals.length ? `Detectados ${vals.length} valores (Coluna Única).` : "Nenhum valor.";
    if (vals.length) $("#entradaBruta").value = vals.join(" ");
  }
});

// ---------- Lógica do Modal da Tabela Z ----------

// Dados da Tabela Z (extraídos do PDF)
// Isso evita ter que carregar um arquivo, a tabela fica embutida no app.
const dadosTabelaZ = {
  // Cabeçalho [cite: 8]
  headers: ["Z", "0.00", "0.01", "0.02", "0.03", "0.04", "0.05", "0.06", "0.07", "0.08", "0.09"],
  // Dados Negativos [cite: 8]
  negativos: [
    ["-3.9", "0.0000", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001"],
    ["-3.8", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001"],
    ["-3.7", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0001", "0.0002"],
    ["-3.6", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002", "0.0002"],
    ["-3.5", "0.0002", "0.0002", "0.0003", "0.0003", "0.0003", "0.0003", "0.0003", "0.0003", "0.0003", "0.0003"],
    ["-3.4", "0.0003", "0.0003", "0.0004", "0.0004", "0.0004", "0.0004", "0.0004", "0.0004", "0.0005", "0.0005"],
    ["-3.3", "0.0005", "0.0005", "0.0005", "0.0005", "0.0006", "0.0006", "0.0006", "0.0006", "0.0006", "0.0007"],
    ["-3.2", "0.0007", "0.0007", "0.0007", "0.0008", "0.0008", "0.0008", "0.0008", "0.0009", "0.0009", "0.0009"],
    ["-3.1", "0.0010", "0.0010", "0.0010", "0.0011", "0.0011", "0.0011", "0.0012", "0.0012", "0.0013", "0.0013"],
    ["-3.0", "0.0013", "0.0014", "0.0014", "0.0015", "0.0015", "0.0016", "0.0016", "0.0017", "0.0018", "0.0018"],
    ["-2.9", "0.0019", "0.0019", "0.0020", "0.0021", "0.0021", "0.0022", "0.0023", "0.0023", "0.0024", "0.0025"],
    ["-2.8", "0.0026", "0.0027", "0.0028", "0.0029", "0.0030", "0.0031", "0.0032", "0.0033", "0.0034", "0.0034"],
    ["-2.7", "0.0035", "0.0036", "0.0037", "0.0038", "0.0039", "0.0040", "0.0041", "0.0043", "0.0044", "0.0045"],
    ["-2.6", "0.0047", "0.0048", "0.0049", "0.0051", "0.0052", "0.0054", "0.0055", "0.0057", "0.0059", "0.0060"],
    ["-2.5", "0.0062", "0.0064", "0.0066", "0.0068", "0.0069", "0.0071", "0.0073", "0.0075", "0.0078", "0.0080"],
    ["-2.4", "0.0082", "0.0084", "0.0087", "0.0089", "0.0091", "0.0094", "0.0096", "0.0099", "0.0102", "0.0104"],
    ["-2.3", "0.0107", "0.0110", "0.0113", "0.0116", "0.0119", "0.0122", "0.0125", "0.0129", "0.0132", "0.0136"],
    ["-2.2", "0.0139", "0.0143", "0.0146", "0.0150", "0.0154", "0.0158", "0.0162", "0.0166", "0.0170", "0.0174"],
    ["-2.1", "0.0179", "0.0183", "0.0188", "0.0192", "0.0197", "0.0202", "0.0207", "0.0212", "0.0217", "0.0222"],
    ["-2.0", "0.0228", "0.0233", "0.0239", "0.0244", "0.0250", "0.0256", "0.0262", "0.0268", "0.0274", "0.0281"],
    ["-1.9", "0.0287", "0.0294", "0.0301", "0.0307", "0.0314", "0.0322", "0.0329", "0.0336", "0.0344", "0.0351"],
    ["-1.8", "0.0359", "0.0367", "0.0375", "0.0384", "0.0392", "0.0401", "0.0409", "0.0418", "0.0427", "0.0436"],
    ["-1.7", "0.0446", "0.0455", "0.0465", "0.0475", "0.0485", "0.0495", "0.0505", "0.0516", "0.0526", "0.0537"],
    ["-1.6", "0.0548", "0.0559", "0.0571", "0.0582", "0.0594", "0.0606", "0.0618", "0.0630", "0.0643", "0.0655"],
    ["-1.5", "0.0668", "0.0681", "0.0694", "0.0708", "0.0721", "0.0735", "0.0749", "0.0764", "0.0778", "0.0793"],
    ["-1.4", "0.0808", "0.0823", "0.0838", "0.0853", "0.0869", "0.0885", "0.0901", "0.0918", "0.0934", "0.0951"],
    ["-1.3", "0.0968", "0.0985", "0.1003", "0.1020", "0.1038", "0.1056", "0.1075", "0.1093", "0.1112", "0.1131"],
    ["-1.2", "0.1151", "0.1170", "0.1190", "0.1210", "0.1230", "0.1251", "0.1271", "0.1292", "0.1314", "0.1335"],
    ["-1.1", "0.1357", "0.1379", "0.1401", "0.1423", "0.1446", "0.1469", "0.1492", "0.1515", "0.1539", "0.1562"],
    ["-1.0", "0.1587", "0.1611", "0.1635", "0.1660", "0.1685", "0.1711", "0.1736", "0.1762", "0.1788", "0.1814"],
    ["-0.9", "0.1841", "0.1867", "0.1894", "0.1922", "0.1949", "0.1977", "0.2005", "0.2033", "0.2061", "0.2090"],
    ["-0.8", "0.2119", "0.2148", "0.2177", "0.2206", "0.2236", "0.2266", "0.2296", "0.2327", "0.2358", "0.2389"],
    ["-0.7", "0.2420", "0.2451", "0.2483", "0.2514", "0.2546", "0.2578", "0.2611", "0.2643", "0.2676", "0.2709"],
    ["-0.6", "0.2743", "0.2776", "0.2810", "0.2843", "0.2877", "0.2912", "0.2946", "0.2981", "0.3015", "0.3050"],
    ["-0.5", "0.3085", "0.3121", "0.3156", "0.3192", "0.3228", "0.3264", "0.3300", "0.3336", "0.3372", "0.3409"],
    ["-0.4", "0.3446", "0.3483", "0.3520", "0.3557", "0.3594", "0.3632", "0.3669", "0.3707", "0.3745", "0.3783"],
    ["-0.3", "0.3821", "0.3859", "0.3897", "0.3936", "0.3974", "0.4013", "0.4052", "0.4090", "0.4129", "0.4168"],
    ["-0.2", "0.4207", "0.4247", "0.4286", "0.4325", "0.4364", "0.4404", "0.4443", "0.4483", "0.4522", "0.4562"],
    ["-0.1", "0.4602", "0.4641", "0.4681", "0.4721", "0.4761", "0.4801", "0.4840", "0.4880", "0.4920", "0.4960"]
  ],
  // Dados Positivos [cite: 16]
  positivos: [
    ["0.0", "0.5000", "0.5040", "0.5080", "0.5120", "0.5160", "0.5199", "0.5239", "0.5279", "0.5319", "0.5359"],
    ["0.1", "0.5398", "0.5438", "0.5478", "0.5517", "0.5557", "0.5596", "0.5636", "0.5675", "0.5714", "0.5753"],
    ["0.2", "0.5793", "0.5832", "0.5871", "0.5910", "0.5948", "0.5987", "0.6026", "0.6064", "0.6103", "0.6141"],
    ["0.3", "0.6179", "0.6217", "0.6255", "0.6293", "0.6331", "0.6368", "0.6406", "0.6443", "0.6480", "0.6517"],
    ["0.4", "0.6554", "0.6591", "0.6628", "0.6664", "0.6700", "0.6736", "0.6772", "0.6808", "0.6844", "0.6879"],
    ["0.5", "0.6915", "0.6950", "0.6985", "0.7019", "0.7054", "0.7088", "0.7123", "0.7157", "0.7190", "0.7224"],
    ["0.6", "0.7257", "0.7291", "0.7324", "0.7357", "0.7389", "0.7422", "0.7454", "0.7486", "0.7517", "0.7549"],
    ["0.7", "0.7580", "0.7611", "0.7642", "0.7673", "0.7704", "0.7734", "0.7764", "0.7794", "0.7823", "0.7852"],
    ["0.8", "0.7881", "0.7910", "0.7939", "0.7967", "0.7995", "0.8023", "0.8051", "0.8078", "0.8106", "0.8133"],
    ["0.9", "0.8159", "0.8186", "0.8212", "0.8238", "0.8264", "0.8289", "0.8315", "0.8340", "0.8365", "0.8389"],
    ["1.0", "0.8413", "0.8438", "0.8461", "0.8485", "0.8508", "0.8531", "0.8554", "0.8577", "0.8599", "0.8621"],
    ["1.1", "0.8643", "0.8665", "0.8686", "0.8708", "0.8729", "0.8749", "0.8770", "0.8790", "0.8810", "0.8830"],
    ["1.2", "0.8849", "0.8869", "0.8888", "0.8907", "0.8925", "0.8944", "0.8962", "0.8980", "0.8997", "0.9015"],
    ["1.3", "0.9032", "0.9049", "0.9066", "0.9082", "0.9099", "0.9115", "0.9131", "0.9147", "0.9162", "0.9177"],
    ["1.4", "0.9192", "0.9207", "0.9222", "0.9236", "0.9251", "0.9265", "0.9279", "0.9292", "0.9306", "0.9319"],
    ["1.5", "0.9332", "0.9345", "0.9357", "0.9370", "0.9382", "0.9394", "0.9406", "0.9418", "0.9429", "0.9441"],
    ["1.6", "0.9452", "0.9463", "0.9474", "0.9484", "0.9495", "0.9505", "0.9515", "0.9525", "0.9535", "0.9545"],
    ["1.7", "0.9554", "0.9564", "0.9573", "0.9582", "0.9591", "0.9599", "0.9608", "0.9616", "0.9625", "0.9633"],
    ["1.8", "0.9641", "0.9649", "0.9656", "0.9671", "0.9678", "0.9686", "0.9693", "0.9699", "0.9706", "0.9706"],
    ["1.9", "0.9713", "0.9719", "0.9726", "0.9732", "0.9738", "0.9744", "0.9750", "0.9756", "0.9761", "0.9767"],
    ["2.0", "0.9772", "0.9778", "0.9783", "0.9788", "0.9793", "0.9798", "0.9803", "0.9808", "0.9812", "0.9817"],
    ["2.1", "0.9821", "0.9826", "0.9830", "0.9834", "0.9838", "0.9842", "0.9846", "0.9850", "0.9854", "0.9857"],
    ["2.2", "0.9861", "0.9864", "0.9868", "0.9871", "0.9875", "0.9878", "0.9881", "0.9884", "0.9887", "0.9890"],
    ["2.3", "0.9893", "0.9896", "0.9898", "0.9901", "0.9904", "0.9906", "0.9909", "0.9911", "0.9913", "0.9916"],
    ["2.4", "0.9918", "0.9920", "0.9922", "0.9925", "0.9927", "0.9929", "0.9931", "0.9932", "0.9934", "0.9936"],
    ["2.5", "0.9938", "0.9940", "0.9941", "0.9943", "0.9945", "0.9946", "0.9948", "0.9949", "0.9951", "0.9952"],
    ["2.6", "0.9953", "0.9955", "0.9956", "0.9957", "0.9959", "0.9960", "0.9961", "0.9962", "0.9963", "0.9964"],
    ["2.7", "0.9965", "0.9966", "0.9967", "0.9968", "0.9969", "0.9970", "0.9971", "0.9972", "0.9973", "0.9974"],
    ["2.8", "0.9974", "0.9975", "0.9976", "0.9977", "0.9977", "0.9978", "0.9979", "0.9979", "0.9980", "0.9981"],
    ["2.9", "0.9981", "0.9982", "0.9982", "0.9983", "0.9984", "0.9984", "0.9985", "0.9985", "0.9986", "0.9986"],
    ["3.0", "0.9987", "0.9987", "0.9987", "0.9988", "0.9988", "0.9989", "0.9989", "0.9989", "0.9990", "0.9990"],
    ["3.1", "0.9990", "0.9991", "0.9991", "0.9991", "0.9992", "0.9992", "0.9992", "0.9992", "0.9993", "0.9993"],
    ["3.2", "0.9993", "0.9993", "0.9994", "0.9994", "0.9994", "0.9994", "0.9994", "0.9995", "0.9995", "0.9995"],
    ["3.3", "0.9995", "0.9995", "0.9995", "0.9996", "0.9996", "0.9996", "0.9996", "0.9996", "0.9996", "0.9997"],
    ["3.4", "0.9997", "0.9997", "0.9997", "0.9997", "0.9997", "0.9997", "0.9997", "0.9997", "0.9997", "0.9998"],
    ["3.5", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998", "0.9998"],
    ["3.6", "0.9998", "0.9998", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999"],
    ["3.7", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999"],
    ["3.8", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999", "0.9999"],
    ["3.9", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000", "1.0000"]
  ]
};

// Esta função vai construir o HTML da tabela Z (do PDF)
function renderizarTabelaZ() {
  const container = $("#tabelaZContainer");
  if (!container) return;

  // Re-usa a sua função "tabela" para criar as duas tabelas
  // 1. Tabela Negativa
  tabela(container, dadosTabelaZ.headers, dadosTabelaZ.negativos);
  
  // 2. Tabela Positiva (adiciona o HTML, não substitui)
  container.innerHTML += `<br><h3 style="text-align:center">Valores Positivos de Z</h3>`;
  const tempDivPos = document.createElement('div');
  tabela(tempDivPos, dadosTabelaZ.headers, dadosTabelaZ.positivos);
  container.innerHTML += tempDivPos.innerHTML;
}

function limparTudoRegressao() {
  // 1. Limpar as caixas de texto
  $("#regInputX").value = "";
  $("#regInputY").value = "";

  // 2. Limpar os KPIs (painéis das abas)
  $("#kpiRegEquacao").innerHTML = "";
  $("#kpiRegVariacao").innerHTML = "";
  
  // 3. Destruir o gráfico (se ele existir)
  if (chartRegressao) chartRegressao.destroy();

  // 4. Esconder a seção de abas
  $("#tabsRegressao").style.display = "none";
}

// Ligar os eventos do Modal (Mostrar/Esconder)
$("#btnVerTabela") && ($("#btnVerTabela").onclick = () => {
  $("#modalTabelaZ").style.display = "flex";
});
$("#modalClose") && ($("#modalClose").onclick = () => {
  $("#modalTabelaZ").style.display = "none";
});
// Clicar fora do conteúdo para fechar
$("#modalTabelaZ") && ($("#modalTabelaZ").onclick = (e) => {
  if (e.target === $("#modalTabelaZ")) {
    $("#modalTabelaZ").style.display = "none";
  }
});

