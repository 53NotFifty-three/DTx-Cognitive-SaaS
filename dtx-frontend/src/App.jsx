import React, { useState } from 'react';
import CognitiveGame from './CognitiveGame';
import DoctorDashboard from './DoctorDashboard';

function App() {
  // 核心状态：控制当前进入的是哪个端
  // null (主页) | 'PATIENT' (患者端) | 'DOCTOR' (医生端)
  const [currentRole, setCurrentRole] = useState(null);

  // 渲染患者端
  if (currentRole === 'PATIENT') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* 安全退出按钮 */}
          <button 
            onClick={() => setCurrentRole(null)}
            style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            ← 安全退出患者端 (返回身份网关)
          </button>
          
          {/* 挂载患者全屏测试舱 */}
          <CognitiveGame patientId="patient_001" />
        </div>
      </div>
    );
  }

  // 渲染医生端
  if (currentRole === 'DOCTOR') {
    return (
      <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 安全退出按钮 */}
          <button 
            onClick={() => setCurrentRole(null)}
            style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            ← 安全退出控制台 (返回身份网关)
          </button>
          
          {/* 挂载医生高纯度分析看板 */}
          <DoctorDashboard patientId="patient_001" />
        </div>
      </div>
    );
  }

  // 渲染默认身份网关 (Landing Page)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '36px', marginBottom: '10px', letterSpacing: '1px' }}>分布式认知数字疗法平台</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>AWS Aurora 驱动 · 医疗级双端隔离架构</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* 患者入口卡片 */}
        <div 
          onClick={() => setCurrentRole('PATIENT')}
          style={{ width: '280px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.border = '1px solid #3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.border = '1px solid #334155'}
        >
          <div style={{ fontSize: '50px', marginBottom: '20px' }}>🧑‍💻</div>
          <h3 style={{ color: '#e0e7ff', margin: '0 0 10px 0', fontSize: '22px' }}>患者训练终端</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            进入自适应全屏盲操舱<br/>执行今日处方测试
          </p>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>点击进入 →</div>
        </div>

        {/* 医生入口卡片 */}
        <div 
          onClick={() => setCurrentRole('DOCTOR')}
          style={{ width: '280px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.border = '1px solid #10b981'}
          onMouseLeave={(e) => e.currentTarget.style.border = '1px solid #334155'}
        >
          <div style={{ fontSize: '50px', marginBottom: '20px' }}>👨‍⚕️</div>
          <h3 style={{ color: '#d1fae5', margin: '0 0 10px 0', fontSize: '22px' }}>医生管理后台</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            调取 AWS 隔离多维数据<br/>查看 LLM 智能分析报告
          </p>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>点击进入 →</div>
        </div>

      </div>

      <div style={{ marginTop: '60px', color: '#475569', fontSize: '12px' }}>
        HIPAA-Compliant Architecture | Encrypted Data Pipeline
      </div>
    </div>
  );
}

export default App;