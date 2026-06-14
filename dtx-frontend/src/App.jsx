import React, { useState } from 'react';
import CognitiveGame from './CognitiveGame';
import DoctorDashboard from './DoctorDashboard';

const translations = {
  zh: {
    exitPatient: "← 安全退出患者端 (返回身份网关)",
    exitDoctor: "← 安全退出控制台 (返回身份网关)",
    title: "分布式认知数字疗法平台",
    subtitle: "AWS Aurora 驱动 · 医疗级双端隔离架构",
    patientTerminal: "患者训练终端",
    patientDesc: "执行今日处方测试",
    doctorConsole: "医生管理后台",
    doctorDesc: "调取 AWS 隔离多维数据\n查看智能分析报告",
    clickToEnter: "点击进入 →",
    footer: "HIPAA-Compliant Architecture | Encrypted Data Pipeline",
    langLabel: "🌐 语言 / Language"
  },
  en: {
    exitPatient: "← Exit Patient Terminal (Return to Gateway)",
    exitDoctor: "← Exit Control Console (Return to Gateway)",
    title: "Distributed Cognitive Digital Therapeutics Platform",
    subtitle: "Powered by AWS Aurora · Clinical Dual-Port Isolation Architecture",
    patientTerminal: "Patient Training Terminal",
    patientDesc: "Execute today's prescription",
    doctorConsole: "Clinician Dashboard",
    doctorDesc: "Query AWS isolated multi-dimensional data\nView smart clinical reports",
    clickToEnter: "Click to Enter →",
    footer: "HIPAA-Compliant Architecture | Encrypted Data Pipeline",
    langLabel: "🌐 Language / 语言"
  },
  ta: {
    exitPatient: "← நோயாளி முனையத்திலிருந்து வெளியேறு (வலைவாசல் திரும்பு)",
    exitDoctor: "← கட்டுப்பாட்டு மையத்திலிருந்து வெளியேறு (வலைவாசல் திரும்பு)",
    title: "பரவலாக்கப்பட்ட அறிவாற்றல் டிஜிட்டல் சிகிச்சை தளம்",
    subtitle: "AWS Aurora மூலம் இயக்கப்படுகிறது · மருத்துவ இரட்டை போர்ட் தனிமைப்படுத்தல் கட்டமைப்பு",
    patientTerminal: "நோயாளி பயிற்சி முனையம்",
    patientDesc: "இன்றைய மருந்து சீட்டை செயல்படுத்தவும்",
    doctorConsole: "மருத்துவர் மேலாண்மை பின்நிலை",
    doctorDesc: "AWS தனிமைப்படுத்தப்பட்ட பரிமாணத் தரவை வினவவும்\nபுத்தியான பகுப்பாய்வு அறிக்கையைப் பார்க்கவும்",
    clickToEnter: "உள்ளிட கிளிக் செய்க →",
    footer: "HIPAA-Compliant Architecture | Encrypted Data Pipeline",
    langLabel: "🌐 மொழி / Language"
  },
  ms: {
    exitPatient: "← Keluar Terminal Pesakit (Kembali ke Gateway)",
    exitDoctor: "← Keluar Konsol Kawalan (Kembali ke Gateway)",
    title: "Platform Terapi Digital Kognitif Teragih",
    subtitle: "Dikuasakan oleh AWS Aurora · Seni Bina Pengasingan Dwi-Port Klinikal",
    patientTerminal: "Terminal Latihan Pesakit",
    patientDesc: "Laksanakan preskripsi ujian hari ini",
    doctorConsole: "Portal Pengurusan Doktor",
    doctorDesc: "Dapatkan data berbilang dimensi terpencil AWS\nLihat laporan analisis pintar",
    clickToEnter: "Klik untuk Masuk →",
    footer: "HIPAA-Compliant Architecture | Encrypted Data Pipeline",
    langLabel: "🌐 Bahasa / Language"
  }
};

function LanguageSelector({ lang, setLang, theme = 'dark' }) {
  const isDark = theme === 'dark';
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
      padding: '6px 12px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontFamily: 'sans-serif'
    }}>
      <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#475569', fontWeight: 'bold' }}>
        {translations[lang].langLabel}:
      </span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          cursor: 'pointer',
          color: isDark ? '#f8fafc' : '#0f172a',
          fontWeight: 'bold',
          fontSize: '12px',
        }}
      >
        <option value="en" style={{ background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }}>English</option>
        <option value="zh" style={{ background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }}>中文 (Chinese)</option>
        <option value="ms" style={{ background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }}>Melayu (Malay)</option>
        <option value="ta" style={{ background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }}>தமிழ் (Tamil)</option>
      </select>
    </div>
  );
}

function App() {
  // Global language state
  const [lang, setLang] = useState('en');
  // Role switcher: null | 'PATIENT' | 'DOCTOR'
  const [currentRole, setCurrentRole] = useState(null);

  const t = translations[lang];

  // Render Patient Portal
  if (currentRole === 'PATIENT') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px', position: 'relative' }}>
        <LanguageSelector lang={lang} setLang={setLang} theme="light" />
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Safe exit button */}
          <button 
            onClick={() => setCurrentRole(null)}
            style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {t.exitPatient}
          </button>
          
          {/* Patient Test Cabin Component */}
          <CognitiveGame patientId="patient_001" lang={lang} />
        </div>
      </div>
    );
  }

  // Render Doctor Console
  if (currentRole === 'DOCTOR') {
    return (
      <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px', position: 'relative' }}>
        <LanguageSelector lang={lang} setLang={setLang} theme="light" />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Safe exit button */}
          <button 
            onClick={() => setCurrentRole(null)}
            style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {t.exitDoctor}
          </button>
          
          {/* Doctor Analytics Dashboard Component */}
          <DoctorDashboard patientId="patient_001" lang={lang} />
        </div>
      </div>
    );
  }

  // Render Default Identity Gateway (Landing Page)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'sans-serif', position: 'relative' }}>
      <LanguageSelector lang={lang} setLang={setLang} theme="dark" />
      
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '36px', marginBottom: '10px', letterSpacing: '1px' }}>{t.title}</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>{t.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* Patient card */}
        <div 
          onClick={() => setCurrentRole('PATIENT')}
          style={{ width: '280px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.border = '1px solid #3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.border = '1px solid #334155'}
        >
          <div style={{ fontSize: '50px', marginBottom: '20px' }}>🧑‍💻</div>
          <h3 style={{ color: '#e0e7ff', margin: '0 0 10px 0', fontSize: '22px' }}>{t.patientTerminal}</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
            {t.patientDesc}
          </p>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>{t.clickToEnter}</div>
        </div>

        {/* Doctor card */}
        <div 
          onClick={() => setCurrentRole('DOCTOR')}
          style={{ width: '280px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.border = '1px solid #10b981'}
          onMouseLeave={(e) => e.currentTarget.style.border = '1px solid #334155'}
        >
          <div style={{ fontSize: '50px', marginBottom: '20px' }}>👨‍⚕️</div>
          <h3 style={{ color: '#d1fae5', margin: '0 0 10px 0', fontSize: '22px' }}>{t.doctorConsole}</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
            {t.doctorDesc}
          </p>
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>{t.clickToEnter}</div>
        </div>

      </div>

      <div style={{ marginTop: '60px', color: '#475569', fontSize: '12px' }}>
        {t.footer}
      </div>
    </div>
  );
}

export default App;