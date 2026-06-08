import React, { useState, useEffect, useRef } from 'react';

const TRIALS_PER_GAME = 20; // 每个模块 20 次，全套共 60 次连轴转

function CognitiveGame({ patientId = "patient_001", onGameComplete }) {
  const [gameState, setGameState] = useState('IDLE'); 
  const [severityInfo, setSeverityInfo] = useState('Loading...');
  
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0); 
  const [gameSequence, setGameSequence] = useState([]);           
  const [trialCount, setTrialCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);       
  
  // 核心刺激源状态
  const [currentColor, setCurrentColor] = useState(null);  
  const [currentPrompt, setCurrentPrompt] = useState("");  
  const [circleCount, setCircleCount] = useState(0);       

  // AI 闭环滴定自适应参数
  const aiStimulusDuration = useRef(1300); 
  const aiNogoProbability = useRef(0.3);   

  const currentTrialRef = useRef(0);
  const trialStartTime = useRef(0);
  const hasActionTaken = useRef(false);
  const allTrialLogs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchAIConfigAndStart = () => {
    setGameState('LOADING_CONFIG');
    fetch(`http://localhost:8000/api/patients/${patientId}/ai-config`)
      .then(res => res.json())
      .then(config => {
        setSeverityInfo(config.severity);
        setGameSequence(config.game_sequence);
        
        aiStimulusDuration.current = config.initial_stimulus_duration;
        aiNogoProbability.current = config.initial_nogo_probability;
        
        setCurrentModuleIndex(0);
        allTrialLogs.current = [];
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

    // 简化后的 prepareNextTrial 仅用于超时未点击时的平滑过渡
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
        
        aiStimulusDuration.current = Math.min(2000, aiStimulusDuration.current + 150);
        moveToNext(mode);
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

    if (currentMode === 'CLASSIC') {
      isCorrect = (currentColor === 'blue');
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
      logTrialData(currentMode, `Circles_${circleCount}`, reactionTime, isCorrect);
    }

    const recentLogs = allTrialLogs.current.slice(-3);
    if (recentLogs.length === 3) {
      const correctCount = recentLogs.filter(l => l.is_correct).length;
      if (correctCount === 3 && reactionTime < aiStimulusDuration.current * 0.6) {
        aiStimulusDuration.current = Math.max(500, aiStimulusDuration.current - 100);
      } else if (correctCount <= 1) {
        aiStimulusDuration.current = Math.min(2000, aiStimulusDuration.current + 100);
      }
    }

    moveToNext(currentMode);
  };

    const moveToNext = (mode) => {
    // 1. ⭐【核心修复】瞬间将所有刺激源状态物理熄灭，不留任何异步死角
    setCurrentColor(null);
    setCurrentPrompt("");
    setCircleCount(0);
    
    // 2. 强行把等待状态在这一微秒就拉起来，这样中央圆盘会强制锁定在十字架（+）状态
    setIsWaiting(true);

    // 3. 安全切断当前所有的定时器指针，防止残留触发
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 4. 缓冲 300ms 后，直接去计算 1~5 秒的随机等待，不再通过中间层延迟
    setTimeout(() => {
      // 检查是否已经打完 20 次
      if (currentTrialRef.current > TRIALS_PER_GAME) {
        handleModuleComplete();
        return;
      }

      // 生成 1 到 5 秒的完全随机延迟
      const randomDelay = 1000 + Math.random() * 4000;

      // 开启干净的等待期倒计时
      timerRef.current = setTimeout(() => {
        setIsWaiting(false); // 1~5秒到期，卸下十字架
        startSingleTrial(mode); // 堂堂正正亮起下一题的颜色
      }, randomDelay);

    }, 300);
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

  const logTrialData = (mode, type, reactionTime, isCorrect) => {
    const log = {
      patient_id: patientId,
      timestamp: new Date().toISOString(),
      target_type: `${mode}_${type}`,
      reaction_time_ms: reactionTime,
      is_correct: isCorrect
    };
    allTrialLogs.current.push(log);
    
    fetch('http://localhost:8000/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    }).catch(err => console.error(err));
  };

  const endWholeSet = () => {
    const timeoutCount = allTrialLogs.current.filter(log => log.reaction_time_ms === 0).length;
    if (timeoutCount >= 18) {
      setGameState('IDLE');
      allTrialLogs.current = [];
      alert(`异常提示：检测到当前测试中无响应频率过高 (${timeoutCount}次)。为确保临床数据准确性，本轮评估样本已自动拦截作废。请在状态稳定时重新进行。`);
      return;
    }
    setGameState('FINISHED');
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
    
    if (currentMode === 'CLASSIC') {
      return (
        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#1e293b', margin: '0 0 15px 0' }}>第一阶段：基础持续响应模式评估 (Classic Go/No-Go)</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>中央准星区域呈现 <strong>GO (蓝色)</strong> 信号：请快速触发响应（点击屏幕任意区域）。</li>
            <li>中央准星区域呈现 <strong>WAIT (红色)</strong> 信号：请抑制操作行为（不要触碰屏幕）。</li>
          </ul>
        </div>
      );
    } 
    else if (currentMode === 'INCONGRUENT') {
      return (
        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#1e293b', margin: '0 0 15px 0' }}>第二阶段：逆向思维执行功能评估 (Incongruent Conflict)</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>屏幕左侧按键映射为 <strong>🐒 Monkey</strong>，右侧按键映射为 <strong>🐘 Elephant</strong>。</li>
            <li>当前阶段执行逆向冲突规则，需触发与中央提示文字<strong>相反</strong>的响应区域：</li>
            <li>中央显示 <strong>🐒 Monkey</strong>：请点击<strong>右侧区间 (🐘 Elephant)</strong>。</li>
            <li>中央显示 <strong>🐘 Elephant</strong>：请点击<strong>左侧区间 (🐒 Monkey)</strong>。</li>
          </ul>
        </div>
      );
    } 
    else if (currentMode === 'SHAPE_COUNT') {
      return (
        <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#1e293b', margin: '0 0 15px 0' }}>第三阶段：高频数量辨识抑制评估 (Numerosity Discrimination)</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block', color: '#475569', lineHeight: '1.8', margin: '0 0 25px 0' }}>
            <li>中央准星区域呈现 <strong>1 个蓝色圆形</strong> 信号：请快速触发响应（点击屏幕任意区域）。</li>
            <li>中央准星区域呈现 <strong>并排 2 个蓝色圆形</strong> 信号：请抑制操作行为（不要触碰屏幕）。</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '420px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 🏡 A. 启动页 */}
      {gameState === 'IDLE' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>分布式认知神经反馈自适应评估系统</h2>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>B2B SaaS 临床患者控制台 | 个性化自适应数字疗法临床测定</p>
          <button onClick={fetchAIConfigAndStart} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
            同步临床处方并进入序列测试
          </button>
        </div>
      )}

      {/* 🔄 B. 数据同步页 */}
      {gameState === 'LOADING_CONFIG' && (
        <div style={{ textAlign: 'center' }}><h3 style={{ color: '#64748b' }}>正在同步云端基线处方并调配滴定参数...</h3></div>
      )}

      {/* 📋 C. 引导页 */}
      {gameState === 'MODULE_INTRO' && (
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {renderModuleIntroduction()}
          <button 
            onClick={handleStartCurrentModule} 
            style={{ 
              background: '#1e293b', color: '#fff', border: 'none', padding: '12px 30px', 
              borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' 
            }}
          >
            确认已知悉规则，开始测试
          </button>
        </div>
      )}

      {/* ⚔️ D. 核心战场（按最高指示：实施最严格的颜色和视觉隔离变量控制） */}
      {gameState === 'PLAYING' && (
        <div style={{ position: 'relative', width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
          
          {/* 【左半屏响应区：永久维持标准中立灰背景，绝对不使用颜色干扰】 */}
          <div 
            onClick={() => handleScreenSideClick('LEFT')}
            style={{
              position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
              backgroundColor: '#f1f5f9', // 永久锁定中立背景灰
              borderRight: '1px solid #cbd5e1', cursor: isWaiting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', // 垂直水平完美居中
              transition: 'background-color 0.1s ease', userSelect: 'none'
            }}
          >
            {/* 🌟 猴子大象模式下，Emoji 放大并绝对垂直水平居中砸在按键正中间 */}
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && (
              <span style={{ fontSize: '54px', filter: isWaiting ? 'grayscale(100%) opacity(30%)' : 'none', transition: 'all 0.2s' }}>
                🐒
              </span>
            )}
          </div>

          {/* 【右半屏响应区：永久维持标准中立灰背景，绝对不使用颜色干扰】 */}
          <div 
            onClick={() => handleScreenSideClick('RIGHT')}
            style={{
              position: 'absolute', right: 0, top: 0, width: '50%', height: '100%',
              backgroundColor: '#f1f5f9', // 永久锁定中立背景灰
              cursor: isWaiting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', // 垂直水平完美居中
              transition: 'background-color 0.1s ease', userSelect: 'none'
            }}
          >
            {/* 🌟 猴子大象模式下，Emoji 放大并绝对垂直水平居中砸在按键正中间 */}
            {gameSequence[currentModuleIndex] === 'INCONGRUENT' && (
              <span style={{ fontSize: '54px', filter: isWaiting ? 'grayscale(100%) opacity(30%)' : 'none', transition: 'all 0.2s' }}>
                🐘
              </span>
            )}
          </div>

          {/* 【中央悬浮刺激物呈现仓：十字准星控制区】 */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: '160px', height: '160px', borderRadius: '50%', 
            // 🌟 只有在经典红蓝模式下，中央圆盘(准星位置)才会切换红/蓝两色；其他时候或等待期固定为白色
            background: (!isWaiting && gameSequence[currentModuleIndex] === 'CLASSIC')
              ? (currentColor === 'blue' ? '#2563eb' : '#ef4444')
              : '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 6px rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10,
            transition: 'background-color 0.05s ease' // 准星颜色瞬间暴闪响应
          }}>
            {isWaiting ? (
              <span style={{ color: '#94a3b8', fontSize: '40px', fontWeight: 'light' }}>+</span>
            ) : (
              <>
                {/* 经典模式：因为中央圆盘已经变成了红/蓝色，所以文字直接用白色 GO / WAIT 凸显 */}
                {gameSequence[currentModuleIndex] === 'CLASSIC' && (
                  <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '28px', letterSpacing: '1px' }}>
                    {currentColor === 'blue' ? 'GO' : 'WAIT'}
                  </span>
                )}
                {/* 猴子大象模式：中央只显示平静的纯黑文本 */}
                {gameSequence[currentModuleIndex] === 'INCONGRUENT' && (
                  <span style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '24px', textAlign: 'center' }}>{currentPrompt}</span>
                )}
                {/* 数量辨识模式：中央渲染纯净蓝圆结构 */}
                {gameSequence[currentModuleIndex] === 'SHAPE_COUNT' && renderCircles()}
              </>
            )}
          </div>

          {/* 【顶部医疗状态监测数据栏】 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', background: 'rgba(15, 23, 42, 0.9)',
            color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between',
            fontSize: '12px', zIndex: 20, boxSizing: 'border-box', backdropFilter: 'blur(4px)'
          }}>
            <div>评估进程: <strong>{currentModuleIndex + 1}/3</strong> ({gameSequence[currentModuleIndex]}) | 样本数: <strong>{trialCount}/20</strong></div>
            <div>AI 动态响应阈值基线: <strong style={{color:'#f59e0b'}}>{aiStimulusDuration.current}ms</strong> ({severityInfo})</div>
          </div>

        </div>
      )}

      {/* 🏁 E. 序列测试完成收官页 */}
      {gameState === 'FINISHED' && (
        <div style={{ textAlign: 'center', background: '#ecfdf5', padding: '40px', borderRadius: '16px', border: '2px solid #10b981', margin: '0 20px' }}>
          <h2 style={{ color: '#065f46', marginBottom: '10px' }}>全套处方序列测试完成</h2>
          <p style={{ color: '#047857', maxWidth: '600px', margin: '0 auto 25px auto', fontSize: '14px', lineHeight: '1.6' }}>
            本轮收集的 60 组临床高精度决策时值样本已通过加密通道全量同步至 AWS 数据库集群。
            排除物理控制误差后的高纯度统计报告已同步下发至医生端控制台。
          </p>
          <button onClick={() => setGameState('IDLE')} style={{ padding: '12px 24px', cursor: 'pointer', background: '#fff', border: '2px solid #10b981', borderRadius: '8px', fontWeight: 'bold', color: '#065f46' }}>
            返回疗程大本营
          </button>
        </div>
      )}
    </div>
  );
}

export default CognitiveGame;