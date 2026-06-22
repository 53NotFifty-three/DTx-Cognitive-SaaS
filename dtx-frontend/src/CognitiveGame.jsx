import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TRIALS_PER_GAME = 20;

const translations = {
  zh: {
    testIdentity: "测试身份:",
    defaultLabel: " (默认)",
    title: "分布式认知神经反馈自适应评估系统",
    subtitle: "临床测试模式 | 严格数据准入校验",
    syncPrescription: "同步临床处方并进入序列测试",
    syncing: "正在同步云端基线处方并调配参数...",
    confirmStart: "确认已知悉规则，开始测试",
    invalidSession: "当前评估局已判定为无效",
    errorLimitText: (limit) => `系统检测到您的异常放空（漏点）或逻辑错误累计已超过 ${limit} 次容错上限。数据已本地销毁。`,
    returnHome: "返回系统主页重试",
    progress: "评估进程: ",
    samples: "样本数: ",
    errorRemaining: "违规操作容错余量: ",
    times: " 次",
    completeTitle: "全套评估序列顺利完成",
    completeDesc: "患者数据已成功保存至 AWS 集群。",
    goBack: "返回首页",
    classicTitle: "第一阶段：基础持续响应模式评估",
    classicGo: "GO (蓝色)：快速响应（点击屏幕任意区域）。",
    classicWait: "WAIT (红色)：抑制行为（不要触碰屏幕）。",
    incongruentTitle: "第二阶段：逆向思维执行功能评估",
    incongruentLabels: "左侧：🐒 Monkey | 右侧：🐘 Elephant",
    incongruentRule: "规则：请点击中央文字相反的响应区域。",
    shapeTitle: "第三阶段：高频数量辨识抑制评估",
    shapeGo: "1 个蓝色圆形：快速响应（点击屏幕任意区域）。",
    shapeWait: "2 个蓝色圆形：抑制行为（不要触碰屏幕）。",
    waitPlus: "+",
    go: "GO",
    wait: "WAIT",
    uploadWarning: "⚠️ 警告：为了成功上传您的训练数据，您必须坐下并完成整个训练序列，中途离开会导致测试数据丢失。"
  },
  en: {
    testIdentity: "Test Identity:",
    defaultLabel: " (Default)",
    title: "Distributed Cognitive Neurofeedback Adaptive Assessment System",
    subtitle: "Clinical Testing Mode | Strict Data Access Validation",
    syncPrescription: "Sync Clinical Prescription & Start Testing",
    syncing: "Synchronizing cloud baseline prescription and adjusting parameters...",
    confirmStart: "I understand the rules, start test",
    invalidSession: "Current Session Evaluated as Invalid",
    errorLimitText: (limit) => `System detected that your abnormal omissions (missed trials) or logical errors have exceeded the threshold of ${limit} errors. Data has been destroyed locally.`,
    returnHome: "Return to main page and retry",
    progress: "Progress: ",
    samples: "Trials: ",
    errorRemaining: "Error tolerance remaining: ",
    times: " times",
    completeTitle: "Assessment Sequence Completed Successfully",
    completeDesc: "Patient data has been successfully saved to AWS cluster.",
    goBack: "Return to Main Page",
    classicTitle: "Phase 1: Sustained Attention Response Assessment",
    classicGo: "GO (Blue): React quickly (click anywhere on the screen).",
    classicWait: "WAIT (Red): Inhibit behavior (do NOT touch the screen).",
    incongruentTitle: "Phase 2: Cognitive Flexibility & Executive Control Assessment",
    incongruentLabels: "Left: 🐒 Monkey | Right: 🐘 Elephant",
    incongruentRule: "Rule: Please click the response area OPPOSITE to the center text.",
    shapeTitle: "Phase 3: Subitizing & Response Inhibition Assessment",
    shapeGo: "1 Blue Circle: React quickly (click anywhere on the screen).",
    shapeWait: "2 Blue Circles: Inhibit behavior (do NOT touch the screen).",
    waitPlus: "+",
    go: "GO",
    wait: "WAIT",
    uploadWarning: "⚠️ Warning: You have to sit for the entire training session to upload the data, otherwise it will cause the loss of training data."
  },
  ta: {
    testIdentity: "சோதனை அடையாளம்:",
    defaultLabel: " (இயல்புநிலை)",
    title: "பரவலாக்கப்பட்ட அறிவாற்றல் நியூரோஃபீட்பேக் தகவமைப்பு மதிப்பீட்டு முறைமை",
    subtitle: "மருத்துவ சோதனை முறை | கடுமையான தரவு அணுகல் சரிபார்ப்பு",
    syncPrescription: "மருத்துவ பரிந்துரையை ஒத்திசைத்து சோதனையைத் தொடங்கு",
    syncing: "கிளவுட் அடிப்படை பரிந்துரையை ஒத்திசைக்கிறது மற்றும் அளவுருக்களை சரிசெய்கிறது...",
    confirmStart: "விதிமுறைகளைப் புரிந்துகொண்டேன், சோதனையைத் தொடங்கு",
    invalidSession: "தற்போதைய அமர்வு செல்லாதது என மதிப்பிடப்பட்டது",
    errorLimitText: (limit) => `உங்கள் அசாதாரண விடுபடல்கள் அல்லது தர்க்கரீதியான பிழைகள் ${limit} பிழைகள் என்ற வரம்பை மீறியுள்ளதை கணினி கண்டறிந்துள்ளது. தரவு உள்நாட்டில் அழிக்கப்பட்டது.`,
    returnHome: "முதன்மைப் பக்கத்திற்குத் திரும்பி மீண்டும் முயற்சிக்கவும்",
    progress: "மதிப்பீட்டு செயல்முறை: ",
    samples: "சோதனைகள்: ",
    errorRemaining: "பிழை சகிப்புத்தன்மை மீதமுள்ளது: ",
    times: " முறை",
    completeTitle: "மதிப்பீட்டு வரிசை வெற்றிகரமாக முடிந்தது",
    completeDesc: "நோயாளி தரவு வெற்றிகரமாக AWS கிளஸ்டரில் சேமிக்கப்பட்டது.",
    goBack: "முதன்மை பக்கத்திற்கு திரும்பு",
    classicTitle: "கட்டம் 1: நிலையான கவன பதில் மதிப்பீடு",
    classicGo: "GO (நீலம்): விரைவாக பதிலளிக்கவும் (திரையின் எங்கும் கிளிக் செய்யவும்).",
    classicWait: "WAIT (சிகப்பு): செயலைத் தடுக்கவும் (திரையைத் தொட வேண்டாம்).",
    incongruentTitle: "கட்டம் 2: அறிவாற்றல் நெகிழ்வுத்தன்மை மற்றும் நிர்வாக கட்டுப்பாட்டு மதிப்பீடு",
    incongruentLabels: "இடது: 🐒 Monkey | வலது: 🐘 Elephant",
    incongruentRule: "விதி: மைய உரைக்கு எதிரான பதில் பகுதியில் கிளிக் செய்யவும்.",
    shapeTitle: "கட்டம் 3: அளவு கண்டறிதல் மற்றும் பதில் தடுப்பு மதிப்பீடு",
    shapeGo: "1 நீல வட்டம்: விரைவாக பதிலளிக்கவும் (திரையின் எங்கும் கிளிக் செய்யவும்).",
    shapeWait: "2 நீல வட்டங்கள்: செயலைத் தடுக்கவும் (திரையைத் தொட வேண்டாம்).",
    waitPlus: "+",
    go: "GO",
    wait: "WAIT",
    uploadWarning: "⚠️ எச்சரிக்கை: தரவைப் பதிவேற்ற நீங்கள் முழுப் பயிற்சி அமர்விலும் அமர வேண்டும், இல்லையெனில் பயிற்சித் தரவு இழக்கப்படும்."
  },
  ms: {
    testIdentity: "Identiti Ujian:",
    defaultLabel: " (Lalai)",
    title: "Sistem Penilaian Penyesuaian Maklum Balas Neuro Kognitif Teragih",
    subtitle: "Mod Ujian Klinikal | Pengesahan Kemasukan Data Ketat",
    syncPrescription: "Senkronisasi Preskripsi Klinikal & Mula Ujian",
    syncing: "Menyegerakkan preskripsi garis asas awan dan melaraskan parameter...",
    confirmStart: "Saya memahami peraturan, mulakan ujian",
    invalidSession: "Sesi Semasa Dinilai sebagai Tidak Sah",
    errorLimitText: (limit) => `Sistem mengesan bahawa kelalaian luar biasa anda (percubaan terlepas) atau ralat logik telah melebihi had bertoleransi sebanyak ${limit} kali. Data telah dimusnahkan secara tempatan.`,
    returnHome: "Kembali ke halaman utama dan cuba lagi",
    progress: "Proses Penilaian: ",
    samples: "Sampel: ",
    errorRemaining: "Had toleransi ralat: ",
    times: " kali",
    completeTitle: "Selesai Keseluruhan Jujukan Penilaian",
    completeDesc: "Data pesakit telah berjaya disimpan ke kluster AWS.",
    goBack: "Kembali ke Halaman Utama",
    classicTitle: "Fasa 1: Penilaian Respon Perhatian Berterusan",
    classicGo: "GO (Biru): Balas dengan cepat (klik mana-mana kawasan pada skrin).",
    classicWait: "WAIT (Merah): Hentikan tindakan (jangan sentuh skrin).",
    incongruentTitle: "Fasa 2: Penilaian Fungsi Eksekutif Pemikiran Songsang",
    incongruentLabels: "Kiri: 🐒 Monkey | Kanan: 🐘 Elephant",
    incongruentRule: "Peraturan: Sila klik kawasan tindak balas bertentangan dengan teks tengah.",
    shapeTitle: "Fasa 3: Penilaian Pengendalian Jumlah Kekerapan Tinggi",
    shapeGo: "1 Bulatan Biru: Balas dengan cepat (klik mana-mana kawasan pada skrin).",
    shapeWait: "2 Bulatan Biru: Hentikan tindakan (jangan sentuh skrin).",
    waitPlus: "+",
    go: "GO",
    wait: "WAIT",
    uploadWarning: "⚠️ Amaran: Anda mesti duduk sepanjang sesi latihan untuk memuat naik data, jika tidak ia akan menyebabkan kehilangan data latihan."
  }
};

function CognitiveGame({ onGameComplete, lang = 'zh' }) {
  const [gameState, setGameState] = useState('IDLE'); 
  const [severityInfo, setSeverityInfo] = useState('Loading...');
  const [patientReport, setPatientReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [patientsList, setPatientsList] = useState([]);
  const [activePatientId, setActivePatientId] = useState("patient_001");
  
  // Resolve localized report values directly from translations payload to avoid network requests on language toggle
  const currentReport = patientReport ? (patientReport.translations?.[lang] || patientReport) : null;

  const [currentModuleIndex, setCurrentModuleIndex] = useState(0); 
  const [gameSequence, setGameSequence] = useState([]);           
  const [trialCount, setTrialCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);       
  
  const [currentColor, setCurrentColor] = useState(null);  
  const [currentPrompt, setCurrentPrompt] = useState("");  
  const [circleCount, setCircleCount] = useState(0);       

  const aiStimulusDuration = useRef(2000); 
  const aiNogoProbability = useRef(0.3);   
  const trialIntervalRange = useRef([1500, 4500]); // 出现间隔 [min, max]
  const maxErrors = useRef(5);                     // 熔断最大错误次数上限

  const currentTrialRef = useRef(0);
  const trialStartTime = useRef(0);
  const hasActionTaken = useRef(false);
  const allTrialLogs = useRef([]);
  const timerRef = useRef(null);
  const transitionTimerRef = useRef(null); // 追踪300ms过渡定时器，防卸载后内存泄漏
  const invalidCountRef = useRef(0);

  const text = translations[lang] || translations.zh;

  // 挂载时加载动态患者名录
  useEffect(() => {
    fetch(`${API_BASE}/api/patients`)
      .then(res => res.json())
      .then(list => {
        setPatientsList(list);
        if (list.length > 0 && !list.includes(activePatientId)) {
          setActivePatientId(list[0]);
        }
      })
      .catch(err => console.error("游戏端拉取患者列表失败:", err));
  }, [gameState]); // 每次回到主页或切换状态时更新名录

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'FINISHED') {
      setLoadingReport(true);
      fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: activePatientId, lang: lang })
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch analysis");
          return res.json();
        })
        .then(data => {
          setPatientReport(data);
          setLoadingReport(false);
        })
        .catch(err => {
          console.error("Failed to load patient report:", err);
          setLoadingReport(false);
        });
    }
  }, [gameState, activePatientId]);

  const fetchAIConfigAndStart = () => {
    setGameState('LOADING_CONFIG');
    // 安全起见，在开始同步前强制销毁所有可能残存的定时器
    if (timerRef.current) clearTimeout(timerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    
    fetch(`${API_BASE}/api/patients/${activePatientId}/ai-config`)
      .then(res => res.json())
      .then(config => {
        setSeverityInfo(config.severity);
        setGameSequence(config.game_sequence);
        
        aiStimulusDuration.current = config.initial_stimulus_duration; // 判断容错时间由后端自适应控制
        aiNogoProbability.current = config.initial_nogo_probability;
        trialIntervalRange.current = config.trial_interval_range || [1500, 4500]; // 出现间隔由后端配置决定
        maxErrors.current = config.max_errors || 5; // 判定容错次数由后端决定
        
        setCurrentModuleIndex(0);
        allTrialLogs.current = [];
        invalidCountRef.current = 0; 
        
        setGameState('MODULE_INTRO');
      })
      .catch(err => console.error("无法调取 AI 处方:", err));
  };

  const handleStartCurrentModule = () => {
    setGameState('PLAYING');
    currentTrialRef.current = 1;
    setTrialCount(1);
    prepareNextTrial(gameSequence[currentModuleIndex]);
  };

  const prepareNextTrial = (mode) => {
    if (currentTrialRef.current > TRIALS_PER_GAME) {
      handleModuleComplete();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentColor(null);
    setCurrentPrompt("");
    setCircleCount(0);
    setIsWaiting(true);
    // 使用后端自适应下发的出现间隔范围计算延迟
    const [minDelay, maxDelay] = trialIntervalRange.current;
    const randomDelay = minDelay + Math.random() * (maxDelay - minDelay);
    timerRef.current = setTimeout(() => {
      setIsWaiting(false);
      startSingleTrial(mode);
    }, randomDelay);
  };

  const startSingleTrial = (mode) => {
    hasActionTaken.current = false;
    trialStartTime.current = Date.now();

    if (mode === 'CLASSIC') {
      const nextColor = Math.random() < (1 - aiNogoProbability.current) ? 'blue' : 'red';
      setCurrentColor(nextColor);
      setupTimeoutTimer(nextColor, mode);
    } 
    else if (mode === 'INCONGRUENT') {
      let promptLabel = '';
      if (lang === 'zh') {
        promptLabel = Math.random() < 0.5 ? '🐒 猴子 (Monkey)' : '🐘 大象 (Elephant)';
      } else if (lang === 'ta') {
        promptLabel = Math.random() < 0.5 ? '🐒 குரங்கு (Monkey)' : '🐘 யானை (Elephant)';
      } else if (lang === 'ms') {
        promptLabel = Math.random() < 0.5 ? '🐒 Monyet (Monkey)' : '🐘 Gajah (Elephant)';
      } else {
        promptLabel = Math.random() < 0.5 ? '🐒 Monkey' : '🐘 Elephant';
      }
      setCurrentPrompt(promptLabel);
      setupTimeoutTimer(promptLabel, mode);
    }
    else if (mode === 'SHAPE_COUNT') {
      const count = Math.random() < (1 - aiNogoProbability.current) ? 1 : 2;
      setCircleCount(count);
      setupTimeoutTimer(count, mode);
    }
  };

  const setupTimeoutTimer = (stimulus, mode) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      if (!hasActionTaken.current) {
        hasActionTaken.current = true;
        let isCorrect = false;
        
        if (mode === 'CLASSIC') isCorrect = (stimulus === 'red');
        else if (mode === 'SHAPE_COUNT') isCorrect = (stimulus === 2);
        else isCorrect = false; 

        logTrialData(mode, mode === 'CLASSIC' || mode === 'SHAPE_COUNT' ? stimulus : `Timeout_${stimulus}`, 0, isCorrect);
        
        if (!isCorrect) {
          invalidCountRef.current += 1;
        }

        if (invalidCountRef.current >= maxErrors.current) {
          terminateOnFailure();
        } else {
          moveToNext(mode);
        }
      }
    }, aiStimulusDuration.current);
  };

  const handleScreenSideClick = (side) => {
    const currentMode = gameSequence[currentModuleIndex];
    if (gameState !== 'PLAYING' || isWaiting || hasActionTaken.current) return;
    
    hasActionTaken.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    const reactionTime = Date.now() - trialStartTime.current;
    let isCorrect = false;
    let isNoGoImpulse = false; 

    if (currentMode === 'CLASSIC') {
      isCorrect = (currentColor === 'blue');
      if (currentColor === 'red') isNoGoImpulse = true; 
      logTrialData(currentMode, currentColor, reactionTime, isCorrect);
    } 
    else if (currentMode === 'INCONGRUENT') {
      const playerChoice = side === 'LEFT' ? 'Monkey' : 'Elephant';
      if (currentPrompt.includes('Monkey') && playerChoice === 'Elephant') isCorrect = true;
      if (currentPrompt.includes('Elephant') && playerChoice === 'Monkey') isCorrect = true;
      logTrialData(currentMode, `Choice_${playerChoice}`, reactionTime, isCorrect);
    }
    else if (currentMode === 'SHAPE_COUNT') {
      isCorrect = (circleCount === 1);
      if (circleCount === 2) isNoGoImpulse = true; 
      logTrialData(currentMode, `Circles_${circleCount}`, reactionTime, isCorrect);
    }

    if (!isCorrect && !isNoGoImpulse) {
      invalidCountRef.current += 1;
    }

    if (invalidCountRef.current >= maxErrors.current) {
      terminateOnFailure();
    } else {
      moveToNext(currentMode);
    }
  };

  const moveToNext = (mode) => {
    setCurrentColor(null);
    setCurrentPrompt("");
    setCircleCount(0);
    setIsWaiting(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    transitionTimerRef.current = setTimeout(() => {
      currentTrialRef.current += 1;
      setTrialCount(currentTrialRef.current);
      if (currentTrialRef.current > TRIALS_PER_GAME) {
        handleModuleComplete();
        return;
      }
      // 使用后端自适应下发的出现间隔范围计算延迟
      const [minDelay, maxDelay] = trialIntervalRange.current;
      const randomDelay = minDelay + Math.random() * (maxDelay - minDelay);
      timerRef.current = setTimeout(() => {
        setIsWaiting(false); 
        startSingleTrial(mode); 
      }, randomDelay);
    }, 300);
  };

  const logTrialData = (mode, type, reactionTime, isCorrect) => {
    const log = {
      patient_id: activePatientId, 
      timestamp: new Date().toISOString(),
      target_type: `${mode}_${type}`,
      reaction_time_ms: reactionTime,
      is_correct: isCorrect
    };
    allTrialLogs.current.push(log);
  };

  const terminateOnFailure = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setGameState('FAILED');
  };

  const handleModuleComplete = () => {
    const nextIndex = currentModuleIndex + 1;
    if (nextIndex < gameSequence.length) {
      setCurrentModuleIndex(nextIndex);
      setGameState('MODULE_INTRO');
    } else {
      endWholeSet();
    }
  };

  const endWholeSet = () => {
    setGameState('FINISHED');
    // 使用新增的批量上传接口，避免对 AWS 数据库集群引发高并发连接池消耗
    fetch(`${API_BASE}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allTrialLogs.current)
    })
      .then(res => {
        if (!res.ok) throw new Error("Bulk log sync failed");
        return res.json();
      })
      .then(data => console.log("✅ 批量数据上传成功:", data.message))
      .catch(err => console.error("数据同步失败:", err));
      
    if (onGameComplete) onGameComplete(allTrialLogs.current);
  };

  const renderCircles = () => {
    const circleStyle = { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#2563eb' };
    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        {circleCount >= 1 && <div style={circleStyle} />}
        {circleCount === 2 && <div style={circleStyle} />}
      </div>
    );
  };

  const renderModuleIntroduction = () => {
    const currentMode = gameSequence[currentModuleIndex];
    const introStyle = { background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' };
    const commonTitle = { color: '#1e293b', margin: '0 0 15px 0' };
    
    if (currentMode === 'CLASSIC') {
      return (
         <div style={introStyle}>
           <h3 style={commonTitle}>{text.classicTitle}</h3>
           <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
             <li>{text.classicGo}</li>
             <li>{text.classicWait}</li>
           </ul>
         </div>
      );
    } 
    else if (currentMode === 'INCONGRUENT') {
      return (
         <div style={introStyle}>
           <h3 style={commonTitle}>{text.incongruentTitle}</h3>
           <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
             <li><strong>{text.incongruentLabels}</strong></li>
             <li><strong>{text.incongruentRule}</strong></li>
           </ul>
         </div>
      );
    } 
    else if (currentMode === 'SHAPE_COUNT') {
      return (
         <div style={introStyle}>
           <h3 style={commonTitle}>{text.shapeTitle}</h3>
           <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
             <li>{text.shapeGo}</li>
             <li>{text.shapeWait}</li>
           </ul>
         </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'sans-serif', minHeight: '420px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 🏡 A. 启动页 */}
      {gameState === 'IDLE' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          
          {/* 轻量化选人组件 */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <span style={{ color: '#64748b', fontWeight: 'bold' }}>{text.testIdentity}</span>
            <select 
              value={activePatientId}
              onChange={(e) => setActivePatientId(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}
            >
              {patientsList.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
              {patientsList.length === 0 && <option value="patient_001">patient_001{text.defaultLabel}</option>}
            </select>
          </div>

          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>{text.title}</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>{text.subtitle}</p>

          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '8px', color: '#92400e', fontSize: '13px', margin: '0 auto 25px auto', maxWidth: '500px', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', fontWeight: '500' }}>
            <span>{text.uploadWarning}</span>
          </div>

          <button onClick={fetchAIConfigAndStart} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {text.syncPrescription}
          </button>
        </div>
      )}

      {/* 🔄 B. 加载页 */}
      {gameState === 'LOADING_CONFIG' && (
        <div style={{ textAlign: 'center' }}><h3 style={{ color: '#64748b' }}>{text.syncing}</h3></div>
      )}

      {/* 📋 C. 引导页 */}
      {gameState === 'MODULE_INTRO' && (
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {renderModuleIntroduction()}

          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '8px', color: '#92400e', fontSize: '12px', margin: '15px 0', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', fontWeight: '500' }}>
            <span>{text.uploadWarning}</span>
          </div>

          <button onClick={handleStartCurrentModule} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
            {text.confirmStart}
          </button>
        </div>
      )}

      {/* 📋 D. 熔断页 */}
      {gameState === 'FAILED' && (
        <div style={{ textAlign: 'center', background: '#fef2f2', padding: '40px', borderRadius: '16px', border: '2px solid #ef4444', margin: '0 20px' }}>
          <h2 style={{ color: '#991b1b', marginBottom: '10px' }}>{text.invalidSession}</h2>
          <p style={{ color: '#b91c1c', maxWidth: '600px', margin: '0 auto 25px auto', fontSize: '14px', lineHeight: '1.6' }}>
            {text.errorLimitText(maxErrors.current)}
          </p>
          <button onClick={() => setGameState('IDLE')} style={{ padding: '12px 24px', cursor: 'pointer', background: '#fff', border: '2px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', color: '#991b1b' }}>
            {text.returnHome}
          </button>
        </div>
      )}

      {/* ⚔️ E. 游戏核心战场 */}
      {gameState === 'PLAYING' && (
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 140px)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
          <div onClick={() => handleScreenSideClick('LEFT')} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1', cursor: isWaiting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ fontSize: '54px', opacity: isWaiting ? 0.3 : 1 }}>🐒</span>}
          </div>
          <div onClick={() => handleScreenSideClick('RIGHT')} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', backgroundColor: '#f1f5f9', cursor: isWaiting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ fontSize: '54px', opacity: isWaiting ? 0.3 : 1 }}>🐘</span>}
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '160px', height: '160px', borderRadius: '50%', background: (!isWaiting && gameSequence[currentModuleIndex] === 'CLASSIC') ? (currentColor === 'blue' ? '#2563eb' : '#ef4444') : '#ffffff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 6px rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
            {isWaiting ? <span style={{ color: '#94a3b8', fontSize: '40px' }}>{text.waitPlus}</span> : (
              <>
                {gameSequence[currentModuleIndex] === 'CLASSIC' && <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px' }}>{currentColor === 'blue' ? text.go : text.wait}</span>}
                {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '24px' }}>{currentPrompt}</span>}
                {gameSequence[currentModuleIndex] === 'SHAPE_COUNT' && renderCircles()}
              </>
            )}
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', zIndex: 20, boxSizing: 'border-box' }}>
            <div>{text.progress}<strong>{currentModuleIndex + 1}/3</strong> | {text.samples}<strong>{trialCount}/20</strong></div>
            <div>{text.errorRemaining}<strong style={{color:'#ef4444'}}>{maxErrors.current - invalidCountRef.current}{text.times}</strong></div>
          </div>
        </div>
      )}

      {/* 🏁 F. 顺利通关页 */}
      {gameState === 'FINISHED' && (
        <div style={{ textAlign: 'center', background: '#ecfdf5', padding: '40px', borderRadius: '16px', border: '2px solid #10b981', margin: '0 20px', overflowY: 'auto', maxHeight: '85vh' }}>
          <h2 style={{ color: '#065f46', marginBottom: '10px' }}>{text.completeTitle}</h2>
          <p style={{ color: '#047857', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>{text.completeDesc}</p>

          <div style={{ background: '#ffffff', border: '1px solid #d1fae5', borderRadius: '12px', padding: '20px', textAlign: 'left', margin: '20px auto', maxWidth: '600px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#065f46', fontSize: '16px', borderBottom: '1px solid #e8f5e9', paddingBottom: '8px', fontWeight: 'bold' }}>
              🧠 {lang === 'zh' ? '脑力训练个人评估报告' : lang === 'ta' ? 'அறிவாற்றal பயிற்சி அறிக்கை' : lang === 'ms' ? 'Laporan Prestasi Minda' : 'AI Brain Performance Report'}
            </h3>
            
            {loadingReport ? (
              <div style={{ color: '#047857', fontSize: '13px', fontStyle: 'italic', display: 'flex', items: 'center', gap: '8px' }}>
                <span>{lang === 'zh' ? '正在分析反应速度与历史对比...' : 'Analyzing reaction speed and progress...'}</span>
              </div>
            ) : patientReport ? (
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                  <strong style={{ color: '#166534' }}>📈 {lang === 'zh' ? '对比上次测试进展：' : 'Progress compared to last time: '}</strong>
                  <span style={{ color: '#14532d' }}>{currentReport?.comparison}</span>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#065f46' }}>📋 {lang === 'zh' ? '神经表现意见：' : 'Neurological Performance: '}</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontStyle: 'italic' }}>"{currentReport?.clinicianSummary}"</p>
                </div>
                
              </div>
            ) : (
              <div style={{ color: '#dc2626', fontSize: '13px' }}>
                Failed to sync detailed AI performance analysis.
              </div>
            )}
          </div>

          <button onClick={() => setGameState('IDLE')} style={{ padding: '12px 24px', cursor: 'pointer', background: '#fff', border: '2px solid #10b981', borderRadius: '8px', fontWeight: 'bold', color: '#065f46', marginTop: '10px' }}>{text.goBack}</button>
        </div>
      )}
    </div>
  );
}

export default CognitiveGame;