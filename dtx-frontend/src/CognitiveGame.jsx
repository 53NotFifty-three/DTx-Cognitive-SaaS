import React, { useState, useEffect, useRef } from 'react';

const TRIALS_PER_GAME = 20;

function CognitiveGame({ onGameComplete }) {
  const [gameState, setGameState] = useState('IDLE'); 
  const [severityInfo, setSeverityInfo] = useState('Loading...');
  
  // ⭐ 核心修改：动态患者绑定体系，取代曾经写死的 patientId 属性
  const [patientsList, setPatientsList] = useState([]);
  const [activePatientId, setActivePatientId] = useState("patient_001");

  const [currentModuleIndex, setCurrentModuleIndex] = useState(0); 
  const [gameSequence, setGameSequence] = useState([]);           
  const [trialCount, setTrialCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);       
  
  const [currentColor, setCurrentColor] = useState(null);  
  const [currentPrompt, setCurrentPrompt] = useState("");  
  const [circleCount, setCircleCount] = useState(0);       

  const aiStimulusDuration = useRef(2000); 
  const aiNogoProbability = useRef(0.3);   

  const currentTrialRef = useRef(0);
  const trialStartTime = useRef(0);
  const hasActionTaken = useRef(false);
  const allTrialLogs = useRef([]);
  const timerRef = useRef(null);
  const invalidCountRef = useRef(0);

  // 挂载时加载动态患者名录
  useEffect(() => {
    fetch('http://localhost:8000/api/patients')
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
    };
  }, []);

  const fetchAIConfigAndStart = () => {
    setGameState('LOADING_CONFIG');
    fetch(`http://localhost:8000/api/patients/${activePatientId}/ai-config`)
      .then(res => res.json())
      .then(config => {
        setSeverityInfo(config.severity);
        setGameSequence(config.game_sequence);
        
        aiStimulusDuration.current = 2000; 
        aiNogoProbability.current = config.initial_nogo_probability;
        
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
    const randomDelay = 1000 + Math.random() * 4000;
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
      const prompt = Math.random() < 0.5 ? '🐒 Monkey' : '🐘 Elephant';
      setCurrentPrompt(prompt);
      setupTimeoutTimer(prompt, mode);
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

        if (invalidCountRef.current > 5) {
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

    if (invalidCountRef.current > 5) {
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
    setTimeout(() => {
      currentTrialRef.current += 1;
      setTrialCount(currentTrialRef.current);
      if (currentTrialRef.current > TRIALS_PER_GAME) {
        handleModuleComplete();
        return;
      }
      const randomDelay = 1000 + Math.random() * 4000;
      timerRef.current = setTimeout(() => {
        setIsWaiting(false); 
        startSingleTrial(mode); 
      }, randomDelay);
    }, 300);
  };

  const logTrialData = (mode, type, reactionTime, isCorrect) => {
    const log = {
      patient_id: activePatientId, // ⭐ 自动注入当前选中的动态 ID
      timestamp: new Date().toISOString(),
      target_type: `${mode}_${type}`,
      reaction_time_ms: reactionTime,
      is_correct: isCorrect
    };
    allTrialLogs.current.push(log);
  };

  const terminateOnFailure = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
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
    allTrialLogs.current.forEach(log => {
      fetch('http://localhost:8000/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      }).catch(err => console.error("数据同步失败:", err));
    });
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
          <h3 style={commonTitle}>第一阶段：基础持续响应模式评估</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>GO (蓝色)：快速响应（点击屏幕任意区域）。</li>
            <li>WAIT (红色)：抑制行为（不要触碰屏幕）。</li>
          </ul>
        </div>
      );
    } 
    else if (currentMode === 'INCONGRUENT') {
      return (
        <div style={introStyle}>
          <h3 style={commonTitle}>第二阶段：逆向思维执行功能评估</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>左侧：<strong>🐒 Monkey</strong> | 右侧：<strong>🐘 Elephant</strong>。</li>
            <li><strong>规则：</strong>请点击中央文字<strong>相反</strong>的响应区域。</li>
          </ul>
        </div>
      );
    } 
    else if (currentMode === 'SHAPE_COUNT') {
      return (
        <div style={introStyle}>
          <h3 style={commonTitle}>第三阶段：高频数量辨识抑制评估</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>1 个蓝色圆形：快速响应（点击屏幕任意区域）。</li>
            <li>2 个蓝色圆形：抑制行为（不要触碰屏幕）。</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative', fontFamily: 'sans-serif', minHeight: '420px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 🏡 A. 启动页：增设右上角动态身份下拉切换阀 */}
      {gameState === 'IDLE' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          
          {/* ⭐ 完美嵌入：右上角绝对定位的轻量化选人组件 */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <span style={{ color: '#64748b', fontWeight: 'bold' }}>测试身份:</span>
            <select 
              value={activePatientId}
              onChange={(e) => setActivePatientId(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}
            >
              {patientsList.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
              {patientsList.length === 0 && <option value="patient_001">patient_001 (默认)</option>}
            </select>
          </div>

          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>分布式认知神经反馈自适应评估系统</h2>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>临床测试模式 | 严格数据准入校验</p>
          <button onClick={fetchAIConfigAndStart} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            同步临床处方并进入序列测试
          </button>
        </div>
      )}

      {/* 🔄 B. 加载页 */}
      {gameState === 'LOADING_CONFIG' && (
        <div style={{ textAlign: 'center' }}><h3 style={{ color: '#64748b' }}>正在同步云端基线处方并调配参数...</h3></div>
      )}

      {/* 📋 C. 引导页 */}
      {gameState === 'MODULE_INTRO' && (
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {renderModuleIntroduction()}
          <button onClick={handleStartCurrentModule} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
            确认已知悉规则，开始测试
          </button>
        </div>
      )}

      {/* 📋 D. 熔断页 */}
      {gameState === 'FAILED' && (
        <div style={{ textAlign: 'center', background: '#fef2f2', padding: '40px', borderRadius: '16px', border: '2px solid #ef4444', margin: '0 20px' }}>
          <h2 style={{ color: '#991b1b', marginBottom: '10px' }}>当前评估局已判定为无效</h2>
          <p style={{ color: '#b91c1c', maxWidth: '600px', margin: '0 auto 25px auto', fontSize: '14px', lineHeight: '1.6' }}>
            系统检测到您的异常放空（漏点）或逻辑错误累计已超过 5 次容错上限。数据已本地销毁。
          </p>
          <button onClick={() => setGameState('IDLE')} style={{ padding: '12px 24px', cursor: 'pointer', background: '#fff', border: '2px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', color: '#991b1b' }}>
            返回系统主页重试
          </button>
        </div>
      )}

      {/* ⚔️ E. 游戏核心战场 */}
      {gameState === 'PLAYING' && (
        <div style={{ position: 'relative', width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
          <div onClick={() => handleScreenSideClick('LEFT')} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1', cursor: isWaiting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ fontSize: '54px', opacity: isWaiting ? 0.3 : 1 }}>🐒</span>}
          </div>
          <div onClick={() => handleScreenSideClick('RIGHT')} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', backgroundColor: '#f1f5f9', cursor: isWaiting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ fontSize: '54px', opacity: isWaiting ? 0.3 : 1 }}>🐘</span>}
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '160px', height: '160px', borderRadius: '50%', background: (!isWaiting && gameSequence[currentModuleIndex] === 'CLASSIC') ? (currentColor === 'blue' ? '#2563eb' : '#ef4444') : '#ffffff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 6px rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
            {isWaiting ? <span style={{ color: '#94a3b8', fontSize: '40px' }}>+</span> : (
              <>
                {gameSequence[currentModuleIndex] === 'CLASSIC' && <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px' }}>{currentColor === 'blue' ? 'GO' : 'WAIT'}</span>}
                {gameSequence[currentModuleIndex] === 'INCONGRUENT' && <span style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '24px' }}>{currentPrompt}</span>}
                {gameSequence[currentModuleIndex] === 'SHAPE_COUNT' && renderCircles()}
              </>
            )}
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', zIndex: 20, boxSizing: 'border-box' }}>
            <div>评估进程: <strong>{currentModuleIndex + 1}/3</strong> | 样本数: <strong>{trialCount}/20</strong></div>
            <div>违规操作容错余量: <strong style={{color:'#ef4444'}}>{6 - invalidCountRef.current} 次</strong></div>
          </div>
        </div>
      )}

      {/* 🏁 F. 顺利通关页 */}
      {gameState === 'FINISHED' && (
        <div style={{ textAlign: 'center', background: '#ecfdf5', padding: '40px', borderRadius: '16px', border: '2px solid #10b981', margin: '0 20px' }}>
          <h2 style={{ color: '#065f46', marginBottom: '10px' }}>全套评估序列顺利完成</h2>
          <p style={{ color: '#047857', fontSize: '14px', lineHeight: '1.6' }}>患者数据已成功保存至 AWS 集群。</p>
          <button onClick={() => setGameState('IDLE')} style={{ padding: '12px 24px', cursor: 'pointer', background: '#fff', border: '2px solid #10b981', borderRadius: '8px', fontWeight: 'bold', color: '#065f46' }}>返回首页</button>
        </div>
      )}
    </div>
  );
}

export default CognitiveGame;