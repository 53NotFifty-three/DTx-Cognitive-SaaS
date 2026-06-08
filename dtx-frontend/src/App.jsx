import React, { useState } from 'react';
import CognitiveGame from './CognitiveGame';
import DoctorDashboard from './DoctorDashboard';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGameComplete = () => {
    // 游戏结束时，更新 key，强制让底下的医生看板重新触发 useEffect 去 AWS 拉取最新数据
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ textAlign: 'center', color: '#1e293b' }}>DTx 认知神经反馈数字疗法平台</h1>
      <p style={{ textAlign: 'center', color: '#64748b' }}>Track 2: 医疗机构分布式 SaaS 临床控制台</p>
      <hr style={{ border: '0', height: '1px', background: '#cbd5e1', margin: '20px 0' }} />
      
      {/* 1. 患者端核心：20次自动化高频游戏循环 */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CognitiveGame patientId="patient_001" onGameComplete={handleGameComplete} />
      </div>
      
      <div style={{ margin: '40px 0' }} />
      
      {/* 2. 医生端核心：实时医学看板 */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <DoctorDashboard key={refreshKey} patientId="patient_001" />
      </div>
    </div>
  );
}

export default App;