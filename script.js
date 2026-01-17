/* ===================== STATE ===================== */
const CLM_CONFIG = { light:25*60, medium:45*60, heavy:90*60 };

let appState = {
    task:"",
    clmLevel:"light",
    session:{ plannedTime:0, elapsedTime:0, isRunning:false },
    focusDebt:0,
    history:[],
    streak:0,
    dailyGoal:60*60,
    todayFocus:0,
    lastSessionDate:null
};

let intervalId=null;

/* ===================== DOM ELEMENTS ===================== */
const taskInput=document.getElementById("taskInput");
const timerDisplay=document.getElementById("timerDisplay");
const startBtn=document.getElementById("startBtn");
const stopBtn=document.getElementById("stopBtn");
const debtDisplay=document.getElementById("debtDisplay");
const streakCount=document.getElementById("streakCount");
const dailyProgress=document.getElementById("dailyProgress");
const todayFocus=document.getElementById("todayFocus");
const dailyGoalEl=document.getElementById("dailyGoal");
const greeting=document.getElementById("greeting");
const clmSelect=document.getElementById("clmSelect");
const historyList=document.getElementById("historyList");

/* ===================== ONBOARDING PAGE & CARD FUNCTIONS ===================== */
function nextScreen(n){
    document.querySelectorAll("#onboarding .card").forEach(c=>c.classList.add("hidden"));
    document.getElementById(`screen${n}`).classList.remove("hidden");
}

function finishOnboarding(){
    localStorage.setItem("deepstate_onboarded","true");
    document.getElementById("onboarding").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
}

function selectCLM(el){
    document.querySelectorAll('.clm').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    appState.clmLevel = el.innerText.toLowerCase();
}

if(localStorage.getItem("deepstate_onboarded")){
    document.getElementById("onboarding").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
}

/* ===================== UI UPDATE CARD ===================== */
function updateUI(){
    timerDisplay.textContent = formatTime(appState.session.plannedTime - appState.session.elapsedTime);
    debtDisplay.textContent = `Focus Debt: ${Math.ceil(appState.focusDebt/60)} min`;
    streakCount.textContent = appState.streak;
    todayFocus.textContent = Math.ceil(appState.todayFocus/60);
    dailyGoalEl.textContent = Math.ceil(appState.dailyGoal/60);
    dailyProgress.style.width = Math.min(appState.todayFocus / appState.dailyGoal * 100, 100) + "%";
    greeting.textContent = appState.focusDebt>0 ? "Let's clear some focus debt!" : "Ready to focus in DeepState!";
}

/* =====================THE FUNCTIONS 4 THE TIMER ===================== */
function startSession(){
    if(appState.session.isRunning) return;

    appState.task = taskInput.value || "Untitled";
    appState.clmLevel = clmSelect.value;

    appState.session.plannedTime = CLM_CONFIG[appState.clmLevel];
    appState.session.elapsedTime = 0;
    appState.session.isRunning = true;

    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    updateUI();

    intervalId = setInterval(()=>{
        appState.session.elapsedTime++;
        updateUI();
        if(appState.session.elapsedTime >= appState.session.plannedTime) completeSession();
    },1000);
}

function completeSession(){
    clearInterval(intervalId);
    if(appState.focusDebt>0){
        appState.focusDebt -= appState.session.elapsedTime;
        if(appState.focusDebt<0) appState.focusDebt=0;
    }
    logSession(false);
    updateStreak();
    resetSession();
    renderHistory();
}

function abandonSession(){
    clearInterval(intervalId);
    const remaining = appState.session.plannedTime - appState.session.elapsedTime;
    appState.focusDebt += remaining;
    logSession(true);
    resetSession();
    renderHistory();
    }

function resetSession(){
    appState.session.isRunning=false;
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    saveState();
    updateUI();
}

/* ===================== THE HISTORY TAB ===================== */
function logSession(abandoned){
    appState.history.push({
        task: appState.task,
        clmLevel: appState.clmLevel,
        plannedTime: appState.session.plannedTime,
        actualTime: appState.session.elapsedTime,
        abandoned,
        timestamp: Date.now()
    });
}

function renderHistory(){
    historyList.innerHTML = "";
    appState.history.slice().reverse().forEach(s=>{
        const div=document.createElement("div");
        div.classList.add("history-item");
        const status = s.abandoned ? "❌ Abandoned" : "✅ Completed";
        div.innerHTML=`
        <div><strong>${s.task}</strong></div>
        <div>Mode: ${s.clmLevel}</div>
        <div>Time: ${Math.ceil(s.actualTime/60)} / ${Math.ceil(s.plannedTime/60)} min</div>
        <div>Status: ${status}</div>
        `;
        historyList.appendChild(div);
    });
}

/* ===================== STREAK ANd DAILY GOAL Functions ===================== */
function updateStreak(){
    const today = new Date().toDateString();
    if(appState.lastSessionDate===today){
        appState.todayFocus += appState.session.elapsedTime;
    } else {
        appState.streak = (appState.lastSessionDate===getYesterday()) ? appState.streak+1 : 1;
        appState.todayFocus = appState.session.elapsedTime;
    }
    appState.lastSessionDate = today;
}

function getYesterday(){
    const d = new Date();
    d.setDate(d.getDate()-1);
    return d.toDateString();
}

/* ===================== STORAGE(where the user's progress is saved "Locally") ===================== */
function saveState(){ localStorage.setItem("deepstate_state", JSON.stringify(appState)); }
function loadState(){ const data = localStorage.getItem("deepstate_state"); if(data) appState = JSON.parse(data); }

/* ===================== RESETS THE APP(optional but can be removed for further notice) ===================== */
function resetApp(){
    if(confirm("Are you sure you want to reset all progress?")){
        localStorage.removeItem("deepstate_state");
        localStorage.removeItem("deepstate_onboarded");
        location.reload();
}
}

startBtn.onclick = startSession;
stopBtn.onclick = abandonSession;

loadState();
updateUI();
renderHistory();

function formatTime(s){
    const m=Math.floor(s/60), sec=s%60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
}

timerDisplay.textContent = "00:00";
