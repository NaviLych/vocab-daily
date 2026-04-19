import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL;
const TOTAL_STEPS = 4;
const STEP_LABELS = ["场景", "翻译", "词汇", "拓展"];

// ─── Data Loading ────────────────────────────────────────────
async function fetchIndex() {
  const res = await fetch(`${BASE}data/index.json`);
  return res.json();
}

async function fetchDayData(file) {
  const res = await fetch(`${BASE}data/${file}`);
  return res.json();
}

// ─── Sub-components ──────────────────────────────────────────
function HighlightText({ text, highlight }) {
  if (!highlight) return <span>{text}</span>;
  const idx = text.indexOf(highlight);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="hl">{highlight}</span>
      {text.slice(idx + highlight.length)}
    </span>
  );
}

function StepScenario({ data }) {
  return (
    <div className="card-inner fade-up">
      <div className="card-label">用英语说出这段话</div>
      <div className="title-row">
        <span className="day-tag">DAY{data.day}</span>
        <span className="theme-tag">{data.theme}</span>
      </div>
      <div className="dialogue">
        {data.dialogue.zh.map((l, i) => (
          <div key={i} className="line" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="spk">{l.speaker}:</span>
            <HighlightText text={l.text} highlight={l.highlight} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepTranslation({ data }) {
  return (
    <div className="card-inner fade-up">
      <div className="card-label">口语积累 Day {data.day}</div>
      <div className="dialogue">
        {data.dialogue.zh.map((l, i) => (
          <div key={i} className="line" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="spk">{l.speaker}:</span>
            <HighlightText text={l.text} highlight={l.highlight} />
          </div>
        ))}
      </div>
      <div className="divider"><span>↓</span></div>
      <div className="dialogue">
        {data.dialogue.en.map((l, i) => (
          <div key={i} className="line en" style={{ animationDelay: `${(i + 6) * 60}ms` }}>
            <span className="spk">{l.speaker}:</span>
            <HighlightText text={l.text} highlight={l.highlight} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepVocab({ data }) {
  return (
    <div className="card-inner fade-up">
      <div className="card-label">口语积累 Day {data.day}</div>
      <div className="vocab-hero">
        <span className="vocab-word">{data.word}</span>
        <span className="vocab-ph">{data.phonetic}</span>
        <span className="vocab-pos">{data.pos}</span>
      </div>
      <div className="defs">
        {data.definitions.map((d, i) => (
          <div key={i} className="def-item fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <p className="def-en">{d.en}</p>
            <p className="def-zh">{d.zh}</p>
          </div>
        ))}
      </div>
      <div className="examples">
        {data.examples.map((ex, i) => (
          <div key={i} className="ex-item fade-up" style={{ animationDelay: `${(i + 2) * 100}ms` }}>
            <p className="ex-en">{ex.en}</p>
            <p className="ex-zh">{ex.zh}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepExtended({ data }) {
  const sections = [
    { title: "近义词", items: data.synonyms, key: "word" },
    { title: "反义词", items: data.antonyms, key: "word" },
    { title: "常见搭配", items: data.collocations, key: "phrase" },
  ];
  return (
    <div className="card-inner fade-up">
      <div className="card-label">口语积累 Day {data.day}</div>
      {sections.map((sec, si) => (
        <div key={si} className="ext-section">
          <h3 className="ext-title">{sec.title}</h3>
          {sec.items.map((item, i) => (
            <div key={i} className="ext-row fade-up" style={{ animationDelay: `${(si * 3 + i) * 60}ms` }}>
              <span className="ext-word">{item[sec.key]}</span>
              <span className="ext-zh">{item.zh}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [index, setIndex] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [currentDayIdx, setCurrentDayIdx] = useState(-1);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);
  const touchX = useRef({ start: 0, end: 0 });

  // Load index on mount
  useEffect(() => {
    fetchIndex()
      .then((idx) => {
        setIndex(idx);
        if (idx.days.length > 0) {
          const lastIdx = idx.days.length - 1;
          setCurrentDayIdx(lastIdx);
          return fetchDayData(idx.days[lastIdx].file);
        }
        setLoading(false);
        return null;
      })
      .then((data) => {
        if (data) setDayData(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Load day data when switching days
  const loadDay = useCallback(async (dayIdx) => {
    if (!index || dayIdx === currentDayIdx) return;
    setDirection(dayIdx > currentDayIdx ? 1 : -1);
    setAnimating(true);
    try {
      const data = await fetchDayData(index.days[dayIdx].file);
      setTimeout(() => {
        setDayData(data);
        setCurrentDayIdx(dayIdx);
        setStep(0);
        setAnimating(false);
      }, 250);
    } catch (e) {
      setError(e.message);
      setAnimating(false);
    }
  }, [index, currentDayIdx]);

  const goStep = (s) => {
    if (animating || s === step) return;
    setDirection(s > step ? 1 : -1);
    setAnimating(true);
    setTimeout(() => { setStep(s); setAnimating(false); }, 250);
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) goStep(step + 1);
    else if (index && currentDayIdx < index.days.length - 1) loadDay(currentDayIdx + 1);
  };
  const prev = () => {
    if (step > 0) goStep(step - 1);
    else if (currentDayIdx > 0) {
      const prevIdx = currentDayIdx - 1;
      setDirection(-1);
      setAnimating(true);
      fetchDayData(index.days[prevIdx].file).then((data) => {
        setTimeout(() => {
          setDayData(data);
          setCurrentDayIdx(prevIdx);
          setStep(TOTAL_STEPS - 1);
          setAnimating(false);
        }, 250);
      });
    }
  };

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Touch
  const onTouchStart = (e) => { touchX.current.start = e.touches[0].clientX; };
  const onTouchMove = (e) => { touchX.current.end = e.touches[0].clientX; };
  const onTouchEnd = () => {
    const d = touchX.current.start - touchX.current.end;
    if (Math.abs(d) > 50) d > 0 ? next() : prev();
  };

  const renderStep = () => {
    if (!dayData) return null;
    switch (step) {
      case 0: return <StepScenario data={dayData} />;
      case 1: return <StepTranslation data={dayData} />;
      case 2: return <StepVocab data={dayData} />;
      case 3: return <StepExtended data={dayData} />;
    }
  };

  const accent = dayData?.themeColor || "#E85D75";

  // ─── Loading / Error / Empty ───────────────────────────────
  if (loading) return (
    <div className="app-container">
      <div className="loading">加载中...</div>
      <AppStyles accent={accent} />
    </div>
  );
  if (error) return (
    <div className="app-container">
      <div className="loading">加载失败: {error}</div>
      <AppStyles accent={accent} />
    </div>
  );
  if (!index || index.days.length === 0) return (
    <div className="app-container">
      <div className="loading">
        <p style={{ fontSize: 48, marginBottom: 16 }}>📚</p>
        <p>还没有卡片数据</p>
        <p style={{ fontSize: 13, color: "#8A8580", marginTop: 8 }}>
          运行 <code>python scripts/generate.py</code> 生成第一张
        </p>
      </div>
      <AppStyles accent={accent} />
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────
  return (
    <>
      <AppStyles accent={accent} />
      <div className="app-container">
        {/* Header */}
        <div className="app-header">
          <h1>每日口语卡片</h1>
          <p>那些很日常但是不会说的地道口语</p>
        </div>

        {/* Day picker - compact */}
        <div className="day-picker">
          <button className="picker-btn" onClick={() => loadDay(Math.max(0, currentDayIdx - 1))}
            disabled={currentDayIdx <= 0}>‹</button>
          <button className="picker-label" onClick={() => setShowList(!showList)}>
            Day {dayData?.day}
            <span className="picker-word">{dayData?.word}</span>
            <span className="picker-arrow">{showList ? "▲" : "▼"}</span>
          </button>
          <button className="picker-btn" onClick={() => loadDay(Math.min(index.days.length - 1, currentDayIdx + 1))}
            disabled={currentDayIdx >= index.days.length - 1}>›</button>
        </div>

        {/* Day list dropdown */}
        {showList && (
          <div className="day-list">
            {[...index.days].reverse().map((d, i) => {
              const realIdx = index.days.length - 1 - i;
              return (
                <button key={d.day}
                  className={`day-list-item ${realIdx === currentDayIdx ? "active" : ""}`}
                  onClick={() => { loadDay(realIdx); setShowList(false); }}>
                  <span className="dli-day">Day {d.day}</span>
                  <span className="dli-word">{d.word}</span>
                  <span className="dli-theme">{d.theme}</span>
                  <span className="dli-date">{d.date}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="card-wrapper">
          <div
            className={`card ${animating ? (direction > 0 ? "out-l" : "out-r") : "in"}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="step-badge">{step + 1}/{TOTAL_STEPS}</div>
            <div className="tap-zones">
              <div className="tap-zone" onClick={prev} />
              <div className="tap-zone" onClick={next} />
            </div>
            {renderStep()}
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-bar">
          <button className="nav-btn" onClick={prev}
            disabled={step === 0 && currentDayIdx === 0}>‹</button>
          <div className="nav-center">
            <div className="dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`dot ${step === i ? "active" : ""}`}
                  onClick={() => goStep(i)} />
              ))}
            </div>
            <div className="step-labels">
              {STEP_LABELS.map((l, i) => (
                <span key={i} className={`slbl ${step === i ? "active" : ""}`}
                  onClick={() => goStep(i)}>{l}</span>
              ))}
            </div>
          </div>
          <button className="nav-btn" onClick={next}
            disabled={step === TOTAL_STEPS - 1 && currentDayIdx === index.days.length - 1}>›</button>
        </div>

        <p className="hint">← 滑动或点击卡片翻页 →</p>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────
function AppStyles({ accent }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');

      :root {
        --bg: #FAF7F2; --card: #fff; --text: #2D2A26;
        --muted: #8A8580; --border: #EDE8E1;
        --accent: ${accent}; --r: 20px;
      }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:var(--bg); font-family:'DM Sans','Noto Serif SC',sans-serif; color:var(--text); -webkit-font-smoothing:antialiased; }

      .app-container {
        min-height:100vh; display:flex; flex-direction:column; align-items:center;
        justify-content:center; padding:20px;
        background: radial-gradient(ellipse at 20% 0%, rgba(232,93,117,.05) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 100%, rgba(124,92,252,.04) 0%, transparent 50%),
                    var(--bg);
      }

      .loading { text-align:center; font-size:15px; color:var(--muted); }
      .loading code { background:var(--border); padding:2px 8px; border-radius:4px; font-size:12px; }

      .app-header { text-align:center; margin-bottom:20px; }
      .app-header h1 { font-family:'Fraunces','Noto Serif SC',serif; font-size:22px; font-weight:600; letter-spacing:-.02em; }
      .app-header p { font-size:13px; color:var(--muted); margin-top:4px; }

      /* Day Picker */
      .day-picker { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
      .picker-btn {
        width:36px; height:36px; border-radius:50%; border:1.5px solid var(--border);
        background:var(--card); font-size:16px; cursor:pointer; color:var(--text);
        display:flex; align-items:center; justify-content:center;
        transition: all .2s;
      }
      .picker-btn:hover:not(:disabled) { background:var(--text); color:var(--card); border-color:var(--text); }
      .picker-btn:disabled { opacity:.3; cursor:default; }
      .picker-label {
        padding:8px 18px; border-radius:100px; border:1.5px solid var(--border);
        background:var(--card); font-family:'DM Sans',sans-serif; font-size:14px;
        font-weight:600; cursor:pointer; display:flex; align-items:center; gap:10px;
        transition: all .2s;
      }
      .picker-label:hover { border-color:var(--muted); }
      .picker-word { font-weight:400; color:var(--muted); font-size:13px; }
      .picker-arrow { font-size:10px; color:var(--muted); }

      /* Day list */
      .day-list {
        width:100%; max-width:420px; max-height:300px; overflow-y:auto;
        background:var(--card); border:1px solid var(--border); border-radius:12px;
        margin-bottom:16px; box-shadow:0 4px 20px rgba(0,0,0,.06);
      }
      .day-list-item {
        display:flex; align-items:center; gap:10px; width:100%;
        padding:12px 16px; border:none; background:none; cursor:pointer;
        font-family:'DM Sans',sans-serif; font-size:13px; text-align:left;
        border-bottom:1px solid var(--border); transition: background .15s;
      }
      .day-list-item:last-child { border-bottom:none; }
      .day-list-item:hover { background:var(--bg); }
      .day-list-item.active { background:rgba(232,93,117,.06); }
      .dli-day { font-weight:600; min-width:52px; }
      .dli-word { font-weight:500; }
      .dli-theme { color:var(--accent); font-family:'Noto Serif SC',serif; font-size:12px; }
      .dli-date { color:var(--muted); font-size:11px; margin-left:auto; }

      /* Card */
      .card-wrapper { width:100%; max-width:420px; }
      .card {
        background:var(--card); border-radius:var(--r); padding:32px 28px;
        min-height:440px; position:relative; overflow:hidden;
        box-shadow: 0 1px 3px rgba(45,42,38,.08), 0 8px 32px rgba(45,42,38,.06);
        transition: transform .25s cubic-bezier(.4,0,.2,1), opacity .25s ease;
      }
      .card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px;
        background:linear-gradient(90deg, var(--accent), #7C5CFC); opacity:.7; }
      .card.out-l { transform:translateX(-30px) scale(.97); opacity:0; }
      .card.out-r { transform:translateX(30px) scale(.97); opacity:0; }
      .card.in { animation: cardIn .25s cubic-bezier(.4,0,.2,1) forwards; }
      @keyframes cardIn { from{transform:translateX(20px) scale(.97);opacity:0} to{transform:none;opacity:1} }

      .step-badge {
        position:absolute; top:16px; right:18px; font-size:11px; color:var(--muted);
        background:var(--bg); padding:3px 10px; border-radius:100px; font-weight:500;
      }

      .tap-zones { position:absolute; inset:0; display:flex; z-index:2; }
      .tap-zone { flex:1; cursor:pointer; }

      /* Card content */
      .card-inner { position:relative; z-index:1; }
      .fade-up { animation: fadeUp .35s ease both; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

      .card-label { font-size:13px; color:var(--muted); margin-bottom:14px; }
      .title-row { display:flex; align-items:baseline; gap:14px; margin-bottom:24px; }
      .day-tag { font-family:'Fraunces',serif; font-size:30px; font-weight:700; letter-spacing:-.03em; }
      .theme-tag { font-family:'Noto Serif SC',serif; font-size:30px; font-weight:700; color:var(--accent); }

      .dialogue { display:flex; flex-direction:column; gap:10px; }
      .line { font-size:15px; line-height:1.7; font-family:'Noto Serif SC',serif; animation:fadeUp .3s ease both; }
      .line.en { font-family:'DM Sans',sans-serif; font-size:14px; }
      .spk { color:var(--muted); margin-right:6px; font-weight:500; font-family:'DM Sans',sans-serif; font-size:13px; }
      .hl { font-weight:700; color:var(--accent); }

      .divider { height:1px; background:var(--border); margin:18px 0; position:relative; text-align:center; }
      .divider span { background:var(--card); padding:0 10px; color:var(--muted); font-size:13px; position:relative; top:-9px; }

      .vocab-hero { display:flex; align-items:baseline; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
      .vocab-word { font-family:'Fraunces',serif; font-size:34px; font-weight:700; color:var(--accent); letter-spacing:-.02em; }
      .vocab-ph { font-size:15px; color:var(--muted); }
      .vocab-pos { font-size:12px; color:var(--muted); background:var(--bg); padding:3px 10px; border-radius:6px; }

      .defs { margin-bottom:20px; display:flex; flex-direction:column; gap:10px; }
      .def-en { font-size:13.5px; line-height:1.6; }
      .def-zh { font-size:12.5px; color:var(--muted); font-family:'Noto Serif SC',serif; margin-top:1px; }

      .examples { display:flex; flex-direction:column; gap:12px; padding-top:14px; border-top:1px solid var(--border); }
      .ex-en { font-size:13.5px; line-height:1.6; }
      .ex-zh { font-size:12.5px; color:var(--muted); font-family:'Noto Serif SC',serif; margin-top:1px; }

      .ext-section { margin-bottom:22px; }
      .ext-section:last-child { margin-bottom:0; }
      .ext-title { font-family:'Noto Serif SC',serif; font-size:14px; font-weight:600; color:var(--accent); margin-bottom:10px; }
      .ext-row { display:flex; align-items:center; gap:12px; padding:7px 0; border-bottom:1px solid var(--border); }
      .ext-row:last-child { border-bottom:none; }
      .ext-word { font-size:14px; font-weight:600; min-width:110px; }
      .ext-zh { font-size:12.5px; color:var(--muted); font-family:'Noto Serif SC',serif; }

      /* Nav */
      .nav-bar { display:flex; align-items:center; gap:20px; margin-top:20px; width:100%; max-width:420px; justify-content:center; }
      .nav-btn {
        width:42px; height:42px; border-radius:50%; border:1.5px solid var(--border);
        background:var(--card); display:flex; align-items:center; justify-content:center;
        cursor:pointer; font-size:18px; color:var(--text); flex-shrink:0; transition: all .2s;
      }
      .nav-btn:hover:not(:disabled) { background:var(--text); color:var(--card); border-color:var(--text); }
      .nav-btn:disabled { opacity:.3; cursor:default; }

      .nav-center { display:flex; flex-direction:column; align-items:center; gap:7px; }
      .dots { display:flex; gap:5px; }
      .dot { width:8px; height:8px; border-radius:50%; background:var(--border); cursor:pointer; transition: all .25s; }
      .dot.active { background:var(--accent); width:22px; border-radius:4px; }
      .step-labels { display:flex; gap:14px; }
      .slbl { font-size:11px; color:var(--muted); cursor:pointer; font-weight:500; transition: color .2s; }
      .slbl.active { color:var(--text); }

      .hint { margin-top:18px; font-size:11px; color:var(--muted); opacity:.5; }

      @media (max-width:480px) {
        .app-container { padding:16px; }
        .card { padding:24px 20px; min-height:380px; }
        .day-tag,.theme-tag { font-size:24px; }
        .vocab-word { font-size:28px; }
        .ext-word { min-width:90px; }
      }
    `}</style>
  );
}
