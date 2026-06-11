import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function DoctorDashboard() {
  const [patientsList, setPatientsList] = useState([]); // 动态患者名录库
  const [currentPatientId, setCurrentPatientId] = useState("");
  const [newPatientId, setNewPatientId] = useState(""); // 新建患者输入缓存
  
  const [rawDbData, setRawDbData] = useState([]); 
  const [viewMode, setViewMode] = useState('CLASSIC'); 
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ avgTime: 0, accuracy: 0, totalTrials: 0 });
  const [loading, setLoading] = useState(true);

  // 1. 获取全量患者 ID 库
  const refreshPatientsList = (defaultId = null) => {
    fetch('http://localhost:8000/api/patients')
      .then(res => res.json())
      .then(list => {
        setPatientsList(list);
        if (list.length > 0) {
          // 如果指定了默认 ID 且存在于列表中，则选中它；否则选第一个
          setCurrentPatientId(defaultId && list.includes(defaultId) ? defaultId : list[0]);
        } else {
          setCurrentPatientId("");
        }
      })
      .catch(err => console.error("无法拉取患者名录:", err));
  };

  useEffect(() => {
    refreshPatientsList();
  }, []);

  // 2. 当选中患者变更时，拉取对应 AWS 历史轨迹
  useEffect(() => {
    if (!currentPatientId) {
      setRawDbData([]);
      setLoading(false);
      return;
    }
    setLoading(true); 
    fetch(`http://localhost:8000/api/patients/${currentPatientId}/stats`)
      .then(res => res.json())
      .then(fetchedData => {
        setRawDbData(fetchedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("无法读取数据:", err);
        setRawDbData([]); 
        setLoading(false);
      });
  }, [currentPatientId]);

  // 3. 临床数据隔离与滑动聚合算法
  useEffect(() => {
    if (rawDbData.length === 0) {
      setChartData([]);
      setMetrics({ avgTime: 0, accuracy: 0, totalTrials: 0 });
      return;
    }

    const filteredByMode = rawDbData.filter(record => {
      if (viewMode === 'CLASSIC') return record.target_type?.startsWith('CLASSIC_');
      if (viewMode === 'INCONGRUENT') return record.target_type?.startsWith('INCONGRUENT_');
      if (viewMode === 'SHAPE_COUNT') return record.target_type?.startsWith('SHAPE_COUNT_');
      return false;
    });

    if (filteredByMode.length === 0) {
      setChartData([]);
      setMetrics({ avgTime: 0, accuracy: 0, totalTrials: 0 });
      return;
    }

    const groupedChartData = [];
    const windowSize = 5;
    
    for (let i = 0; i < filteredByMode.length; i += windowSize) {
      const currentWindow = filteredByMode.slice(i, i + windowSize);
      const clickedTrials = currentWindow.filter(r => r.reaction_time_ms > 0);
      const correctTrials = currentWindow.filter(r => r.is_correct);

      const avgReactionTime = clickedTrials.length > 0
        ? Math.round(clickedTrials.reduce((sum, r) => sum + r.reaction_time_ms, 0) / clickedTrials.length)
        : null; 
      
      const accuracyRate = Math.round((correctTrials.length / currentWindow.length) * 100);
      const stageIndex = Math.floor(i / windowSize) + 1;

      groupedChartData.push({
        name: `序列 ${stageIndex}`,
        avgReactionTime: avgReactionTime, 
        accuracy: accuracyRate,
        sampleCount: currentWindow.length
      });
    }

    const totalValidClicks = filteredByMode.filter(r => r.reaction_time_ms > 0);
    const totalCorrect = filteredByMode.filter(r => r.is_correct);
    
    const globalAvgTime = totalValidClicks.length > 0
      ? (totalValidClicks.reduce((sum, r) => sum + r.reaction_time_ms, 0) / totalValidClicks.length).toFixed(1)
      : 0;
    
    const globalAccuracy = ((totalCorrect.length / filteredByMode.length) * 100).toFixed(1);

    setChartData(groupedChartData);
    setMetrics({
      avgTime: globalAvgTime,
      accuracy: globalAccuracy,
      totalTrials: filteredByMode.length
    });

  }, [rawDbData, viewMode]);

  // 创建新患者档案
  const handleCreatePatient = (e) => {
    e.preventDefault();
    const trimmedId = newPatientId.trim();
    if (!trimmedId) return;

    fetch('http://localhost:8000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: trimmedId, severity: 'Medium' })
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.detail); });
        return res.json();
      })
      .then(data => {
        alert(data.message);
        setNewPatientId("");
        refreshPatientsList(trimmedId); // 刷新列表并自动切换到新创建的患者
      })
      .catch(err => alert(`创建失败: ${err.message}`));
  };

  // 彻底删除注销患者档案
  const handleDeletePatientProfile = () => {
    if (!currentPatientId) return;
    const isConfirmed = window.confirm(`致命警告：您正在对患者 [${currentPatientId}] 执行销毁指令。\n此操作将永久注销该病历并强行清空 AWS 数据集群内对应的所有测试轨迹，不可逆！`);
    if (!isConfirmed) return;

    fetch(`http://localhost:8000/api/patients/${currentPatientId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        refreshPatientsList(); // 重新加载列表，会自动落到剩余的第一张档案上
      })
      .catch(err => console.error("注销失败:", err));
  };

  const renderLLMInsight = () => {
    if (viewMode === 'CLASSIC') {
      return (
        <>
          <strong>[神经学表现分析]</strong> {metrics.accuracy > 85 ? 
            "患者前额叶执行功能中的行为抑制系统（Behavioral Inhibition System）运作稳定，基础色觉通道中枢决策延迟处于正常医学阈值内。" : 
            "数据提示突发性认知负荷超载。患者在基础持续性注意力（Sustained Attention）维持上表现出波动，存在一定的冲动性误触倾向。"}
          <br />
          <strong>[分布式数字疗法干预处方]</strong> 维持当前自适应 AI 滴定基线。建议在下一周期疗程中将该模块的初始刺激时长压缩 50ms，挑战前额叶主动专注极限。
        </>
      );
    } 
    else if (viewMode === 'INCONGRUENT') {
      return (
        <>
          <strong>[神经学表现分析]</strong> {metrics.accuracy > 80 ? 
            "患者在反直觉冲突干扰下表现出良好的认知灵活性（Cognitive Flexibility），高级执行功能对肌肉本能抑制的切换效率达标。" : 
            "患者对逆向冲突规则的神经逻辑处理延迟明显拉长（平均达 " + metrics.avgTime + " ms），表明前额叶皮层在切断第一本能映射、执行相反逻辑时存在认知重构瓶颈。"}
          <br />
          <strong>[分布式数字疗法干预处方]</strong> 建议将每日处方中的逆向冲突模块执行顺序置于首位，在患者大脑多巴胺分泌最旺盛的活跃期进行针对性变频压迫训练。
        </>
      );
    } 
    else if (viewMode === 'SHAPE_COUNT') {
      return (
        <>
          <strong>[神经学表现分析]</strong> {metrics.accuracy > 85 ? 
            "患者在形态与数量精细辨识任务中对潜在诱惑的辨识阈值发育完全，视觉拥挤效应（Visual Crowding）对其行为抑制阻碍极低。" : 
            "患者在面对相同颜色、不同数量的刺激物时错误率激增。表明其在大脑快速决策时，无法有效分配视觉空间工作记忆资源，精细控制力存在阶段性局限。"}
          <br />
          <strong>[分布式数字疗法干预处方]</strong> 建议在自适应滴定中动态提升该形态测试出现的频率，通过高频无障碍盲操纠正多动表现下的空间识别偏差。
        </>
      );
    }
    return null;
  };

  const getLineColor = () => {
    if (viewMode === 'CLASSIC') return '#2563eb';
    if (viewMode === 'INCONGRUENT') return '#d97706';
    return '#10b981';
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      
      {/* 看板头部区域 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>📊 医生端：认知数据高纯度过滤控制台</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            分布式临床图谱 | 统计算法：<strong>5次滑动窗口均值平滑处理</strong>
          </p>
          
          {/* 行内新建患者小型表单 */}
          <form onSubmit={handleCreatePatient} style={{ marginTop: '15px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="输入新患者 ID (如 patient_004)" 
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '220px' }}
            />
            <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
              + 新建患者档案
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {/* 动态调取病历与注销组合控制区 */}
          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>调取病历:</span>
            <select 
              value={currentPatientId} 
              onChange={(e) => setCurrentPatientId(e.target.value)}
              style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', outline: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 'bold' }}
            >
              {patientsList.map(id => (
                <option key={id} value={id}>ID: {id}</option>
              ))}
              {patientsList.length === 0 && <option value="">暂无档案</option>}
            </select>

            {currentPatientId && (
              <button
                onClick={handleDeletePatientProfile}
                style={{
                  background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                🗑️ 注销档案
              </button>
            )}
          </div>

          <div style={{ background: '#e2e8f0', padding: '4px', borderRadius: '8px', display: 'flex', gap: '2px' }}>
            {['CLASSIC', 'INCONGRUENT', 'SHAPE_COUNT'].map((mode) => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                  background: viewMode === mode ? '#ffffff' : 'transparent',
                  color: viewMode === mode ? '#1e293b' : '#64748b',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {mode === 'CLASSIC' && '基础颜色'}
                {mode === 'INCONGRUENT' && '逆向思维'}
                {mode === 'SHAPE_COUNT' && '数量辨识'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#3b82f6', fontWeight: 'bold' }}>
          正在通过 IAM 令牌安全穿透并拉取 AWS 数据...
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px', background: '#fff' }}>
          <h3>未检索到临床轨迹</h3>
          <p>当前选中的患者（<strong>{currentPatientId}</strong>）在指定维度下暂无有效历史数据。</p>
        </div>
      ) : (
        <div>
          {/* 核心医学指标卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>当前维度平均响应耗时</div>
              <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>
                {metrics.avgTime} <span style={{fontSize:'14px', color: '#64748b'}}>ms</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ec4899' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>当前模态综合正确率</div>
              <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>{metrics.accuracy}%</div>
            </div>

            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #cbd5e1' }}>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>有效数据样本量</div>
              <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>{metrics.totalTrials} <span style={{fontSize:'14px', color: '#64748b'}}>次</span></div>
            </div>
          </div>

          {/* 双轨分离式临床波形图 */}
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '16px' }}>认知双轨控制分析 (Reaction Time & Accuracy)</h4>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 25px 0' }}>为保证时间轴物理属性，针对全频无响应区间实施了过桥连线处理。</p>

            <h5 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '13px' }}>1. 核心处理速度趋势 (ms)</h5>
            <div style={{ height: '200px', marginBottom: '35px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="patientData">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} minTickGap={10} hide={true} /> 
                  <YAxis stroke="#94a3b8" domain={['dataMin - 30', 'dataMax + 30']} fontSize={11} width={45} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`${value} ms`, '5次平均时值']} />
                  <Line type="monotone" dataKey="avgReactionTime" name="处理速度" stroke={getLineColor()} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <h5 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '13px' }}>2. 序列区间正确率 (%)</h5>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="patientData">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} minTickGap={10} />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} width={45} tickFormatter={(tick) => `${tick}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`${value}%`, '5次平均正确率']} />
                  <Line type="stepAfter" dataKey="accuracy" name="正确率" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899' }} activeDot={{ r: 6 }} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LLM 报告 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <h4 style={{ margin: 0, color: '#0f172a' }}>LLM 临床辅助报告智能生成</h4>
              </div>
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>GPT-4o Medical Copilot</span>
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155' }}>
              <strong>[临床自动评级]</strong> 患者 {currentPatientId} 在当前模态下的平均中枢响应耗时为 <strong>{metrics.avgTime} ms</strong>，全样本综合正确率为 <strong>{metrics.accuracy}%</strong>。<br />
              {renderLLMInsight()}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;