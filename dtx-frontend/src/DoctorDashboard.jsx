import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const translations = {
  zh: {
    dashboardTitle: "📊 医生端：认知数据高纯度过滤控制台",
    dashboardSub: "分布式临床图谱 | 统计算法：5次滑动窗口均值平滑处理",
    addNewPatient: "➕ 新增临床患者档案",
    selectPatient: "调取病历:",
    noProfiles: "暂无档案",
    deleteProfile: "🗑️ 注销档案",
    modeClassic: "基础颜色",
    modeIncongruent: "逆向思维",
    modeShapeCount: "数量辨识",
    loadingData: "正在通过 IAM 令牌安全穿透并拉取 AWS 数据...",
    profileName: "患者姓名",
    profileAgeGender: "年龄 / 性别",
    profileAgeUnit: " 岁",
    profilePresentation: "ADHD 表现分型",
    profileSeverity: "严重程度分级",
    genderMale: "男",
    genderFemale: "女",
    presInattentive: "注意力不集中型 (Inattentive)",
    presHyperactive: "多动/冲动型 (Hyperactive-Impulsive)",
    presCombined: "混合型 (Combined)",
    sevMild: "🟢 轻度 (Mild)",
    sevModerate: "🟡 中度 (Moderate)",
    sevSevere: "🔴 重度 (Severe)",
    noTrajectoryTitle: "未检索到临床轨迹",
    noTrajectoryDesc: (id) => `当前选中的患者（${id}）在指定维度下暂无有效历史数据。`,
    metricAvgTime: "当前维度平均响应耗时",
    metricAccuracy: "当前模态综合正确率",
    metricSampleCount: "有效数据样本量",
    unitMs: " ms",
    unitPercent: "%",
    unitTrials: " 次",
    chartTitle: "认知双轨控制分析 (Reaction Time & Accuracy)",
    chartSub: "为保证时间轴物理属性，针对全频无响应区间实施了过桥连线处理。",
    chartRTTitle: "1. 核心处理速度趋势 (ms)",
    chartAccTitle: "2. 序列区间正确率 (%)",
    chartSeqLabel: (idx) => `序列 ${idx}`,
    chartRTLegend: "处理速度",
    chartRTTooltip: "5次平均时值",
    chartAccLegend: "正确率",
    chartAccTooltip: "5次平均正确率",
    reportTitle: "智能临床辅助报告",
    reportCopilot: "Medical Copilot",
    reportAutoRating: (id, time, acc) => `[临床自动评级] 患者 ${id} 在当前模态下的平均中枢响应耗时为 ${time} ms，全样本综合正确率为 ${acc}%。`,
    modalTitle: "📝 新增临床患者档案",
    modalPatientId: "患者 ID (英文/数字唯一标识)",
    modalPatientIdPlh: "如: patient_003",
    modalName: "姓名",
    modalNamePlh: "张小华",
    modalAge: "年龄",
    modalGender: "性别",
    modalSeverity: "严重程度分级 (Severity)",
    modalPresentation: "ADHD 核心表现分型 (Presentation)",
    modalCancel: "取消",
    modalConfirm: "确认创建",
    alertInputRequired: "请输入患者 ID 与姓名！",
    alertCreateFailed: "创建失败: ",
    alertConfirmDelete: (id) => `致命警告：您正在对患者 [${id}] 执行销毁指令。\n此操作将永久注销该病历并强行清空 AWS 数据集群内对应的所有测试轨迹，不可逆！`,
    alertDeleteFailed: "注销失败: ",
    alertSeverityRequired: "请选择严重程度分级！",
    
    // Insights details
    reportNeuroLabel: "神经学表现分析",
    reportTrendLabel: "治疗成果趋势评估",
    reportPresLabel: "分布式数字疗法干预处方",
    insightNeuroClassicGood: "患者前额叶执行功能中的行为抑制系统（Behavioral Inhibition System）运作稳定，基础色觉通道中枢决策延迟处于正常医学阈值内。",
    insightNeuroClassicBad: "数据提示突发性认知负荷超载。患者在基础持续性注意力（Sustained Attention）维持上表现出波动，存在一定的冲动性误触倾向。",
    insightPresClassic: "维持当前自适应 AI 滴定基线。建议在下一周期疗程中将该模块的初始刺激时长压缩 50ms，挑战前额叶主动专注极限。",
    
    insightNeuroIncongruentGood: "患者在反直觉冲突干扰下表现出良好的认知灵活性（Cognitive Flexibility），高级执行功能对肌肉本能抑制的切换效率达标。",
    insightNeuroIncongruentBad: (time) => `患者对逆向冲突规则的神经逻辑处理延迟明显拉长（平均达 ${time} ms），表明前额叶皮层在切断第一本能映射、执行相反逻辑时存在认知重构瓶颈。`,
    insightPresIncongruent: "建议将每日处方中的逆向冲突模块执行顺序置于首位，在患者大脑多巴胺分泌最旺盛的活跃期进行针对性变频压迫训练。",
    
    insightNeuroShapeGood: "患者在形态与数量精细辨识任务中对潜在诱惑的辨识阈值发育完全，视觉拥挤效应（Visual Crowding）对其行为抑制阻碍极低。",
    insightNeuroShapeBad: "患者在面对相同颜色、不同数量的刺激物时错误率激增。表明其在大脑快速决策时，无法有效分配视觉空间工作记忆资源，精细控制力存在阶段性局限。",
    insightPresShape: "建议在自适应滴定中动态提升该形态测试出现的频率，通过高频无障碍盲操纠正多动表现下的空间识别偏差。",
    
    insightTrendNone: "由于当前有效样本序列不足，暂无法生成治疗趋势对比。请在继续测试积累数据后查看。",
    insightTrendSummary: (rtText, accText, statusText) => `较测试初始阶段，患者的${rtText}，且${accText}。综合趋势表明，当前数字疗法对患者前额叶执行功能的激活与重构[${statusText}]。`,
    
    rtTrendDecreased: (val) => `核心反应速度缩短了 ${val} ms（表现出显著的大脑中枢处理灵敏度改善与突触传导效率提升）`,
    rtTrendIncreased: (val) => `核心反应速度延长了 ${val} ms（提示随着测试周期推进，前额叶皮层在持续性认知负荷下存在资源消耗与注意力疲劳倾向）`,
    rtTrendStable: "反应速度维持稳定（表现出高度的自适应中枢稳定性）",
    
    accTrendIncreased: (val) => `正确率提升了 ${val}%（表明患者通过行为神经反馈调节，主动学习并强化了执行抑制机制）`,
    accTrendDecreased: (val) => `正确率衰退了 ${val}%（反映了冲动控制能力衰减与漏点脱靶概率上升）`,
    accTrendStable: "正确率持平（控制力稳定在基准水平）",
    
    statusSignificant: "成果显著",
    statusModerate: "效果温和",
    statusFluctuating: "处于波动调整期"
  },
  en: {
    dashboardTitle: "📊 Clinician Dashboard: Cognitive Data Filtration Console",
    dashboardSub: "Distributed Clinical Charting | Statistics: 5-trial moving window average smoothing",
    addNewPatient: "➕ Add New Patient Profile",
    selectPatient: "Select Patient:",
    noProfiles: "No profile",
    deleteProfile: "🗑️ Delete Profile",
    modeClassic: "Color Go/No-Go",
    modeIncongruent: "Cognitive Flexibility",
    modeShapeCount: "Quantity Subitizing",
    loadingData: "Securely connecting via IAM token to fetch AWS data...",
    profileName: "Patient Name",
    profileAgeGender: "Age / Gender",
    profileAgeUnit: " Y/O",
    profilePresentation: "ADHD Presentation",
    profileSeverity: "Severity Level",
    genderMale: "Male",
    genderFemale: "Female",
    presInattentive: "Inattentive",
    presHyperactive: "Hyperactive-Impulsive",
    presCombined: "Combined",
    sevMild: "🟢 Mild",
    sevModerate: "🟡 Moderate",
    sevSevere: "🔴 Severe",
    noTrajectoryTitle: "No Clinical Trajectory Found",
    noTrajectoryDesc: (id) => `The selected patient (${id}) has no valid history data in the current dimension.`,
    metricAvgTime: "Average Reaction Time (Current Mode)",
    metricAccuracy: "Overall Accuracy (Current Mode)",
    metricSampleCount: "Valid Sample Count",
    unitMs: " ms",
    unitPercent: "%",
    unitTrials: " trials",
    chartTitle: "Cognitive Dual-Track Analysis (Reaction Time & Accuracy)",
    chartSub: "Line connection applied across non-response intervals to maintain physical time-series integrity.",
    chartRTTitle: "1. Core Processing Speed Trend (ms)",
    chartAccTitle: "2. Sequence Interval Accuracy (%)",
    chartSeqLabel: (idx) => `Seq ${idx}`,
    chartRTLegend: "Reaction Time",
    chartRTTooltip: "5-Trial Avg RT",
    chartAccLegend: "Accuracy",
    chartAccTooltip: "5-Trial Avg Acc",
    reportTitle: "AI Clinical Consultation Report",
    reportCopilot: "Medical Copilot",
    reportAutoRating: (id, time, acc) => `[Clinical Auto-Rating] Patient ${id}'s average reaction time in the current mode is ${time} ms, with an overall accuracy of ${acc}%.`,
    modalTitle: "📝 Add New Patient Profile",
    modalPatientId: "Patient ID (Unique alphanumeric identifier)",
    modalPatientIdPlh: "e.g. patient_003",
    modalName: "Name",
    modalNamePlh: "John Doe",
    modalAge: "Age",
    modalGender: "Gender",
    modalSeverity: "Severity Level",
    modalPresentation: "ADHD Core Presentation",
    modalCancel: "Cancel",
    modalConfirm: "Create Profile",
    alertInputRequired: "Please enter Patient ID and Name!",
    alertCreateFailed: "Creation failed: ",
    alertConfirmDelete: (id) => `CRITICAL WARNING: You are executing a destruction command for patient [${id}].\nThis will permanently delete the profile and clear all test trajectories in the AWS database cluster. This action is irreversible!`,
    alertDeleteFailed: "Deletion failed: ",
    alertSeverityRequired: "Please select a Severity Level!",
    
    // Insights details
    reportNeuroLabel: "Neurological Performance Analysis",
    reportTrendLabel: "Treatment Outcome Trend Evaluation",
    reportPresLabel: "Distributed Digital Therapeutics Intervention Prescription",
    insightNeuroClassicGood: "The patient's Behavioral Inhibition System in prefrontal executive control functions is stable. The central decision latency for basic color pathways is within the normal clinical threshold.",
    insightNeuroClassicBad: "Data suggests sudden cognitive overload. The patient shows fluctuations in maintaining Sustained Attention, with a tendency toward impulsive touches.",
    insightPresClassic: "Maintain the current adaptive AI titration baseline. It is recommended to compress the initial stimulus duration of this module by 50ms in the next cycle to challenge the prefrontal focus limit.",
    
    insightNeuroIncongruentGood: "The patient demonstrates good Cognitive Flexibility under counter-intuitive conflict interference, showing standard efficiency in prefrontal switching over muscle instincts.",
    insightNeuroIncongruentBad: (time) => `The patient's neural processing latency for reverse conflict rules is significantly prolonged (averaging ${time} ms), indicating a cognitive restructuring bottleneck when the prefrontal cortex overrides the primary instinct mapping to execute opposite logic.`,
    insightPresIncongruent: "It is recommended to prioritize the reverse conflict module at the beginning of the daily prescription, performing target-frequency training during the patient's peak dopamine secretion period.",
    
    insightNeuroShapeGood: "The patient's discrimination threshold for potential distractors in fine shape-and-quantity discrimination tasks is fully developed, showing minimal visual crowding interference in response inhibition.",
    insightNeuroShapeBad: "The patient's error rate spikes when facing visual stimuli with the same color but different quantities. This indicates an inability to allocate visuospatial working memory resources effectively during rapid decision-making, showing limitations in fine motor control.",
    insightPresShape: "It is recommended to dynamically increase the frequency of this subitizing task in the adaptive titration, using high-frequency error-free training to correct spatial recognition biases associated with hyperactive behaviors.",
    
    insightTrendNone: "Insufficient sample sequences to generate a treatment trend comparison. Please compile more testing data.",
    insightTrendSummary: (rtText, accText, statusText) => `Compared with the initial stage, the patient's ${rtText}, and ${accText}. The overall trend indicates that the current digital therapeutics has achieved [${statusText}] in activating and reconstructing the patient's prefrontal executive functions.`,
    
    rtTrendDecreased: (val) => `core response time decreased by ${val} ms (showing significant improvement in central processing sensitivity and synaptic transmission efficiency)`,
    rtTrendIncreased: (val) => `core response time increased by ${val} ms (suggesting resource depletion and attention fatigue in the prefrontal cortex under sustained cognitive load as sessions progress)`,
    rtTrendStable: "response time remained stable (showing a high degree of adaptive central stability)",
    
    accTrendIncreased: (val) => `accuracy increased by ${val}% (indicating that the patient actively learned and strengthened executive inhibition mechanisms through behavioral neurofeedback regulation)`,
    accTrendDecreased: (val) => `accuracy decreased by ${val}% (reflecting a decline in impulse control and an increased rate of omissions)`,
    accTrendStable: "accuracy remained flat (impulse control stabilized at the baseline level)",
    
    statusSignificant: "significant outcomes",
    statusModerate: "moderate effects",
    statusFluctuating: "a fluctuating adjustment phase"
  },
  ta: {
    dashboardTitle: "📊 மருத்துவர் மேலாண்மை பின்நிலை: அறிவாற்றல் தரவு வடிகட்டுதல் பணியகம்",
    dashboardSub: "விநியோகிக்கப்பட்ட மருத்துவ வரைபடம் | புள்ளிவிவரங்கள்: 5-சோதனை நகரும் சாளர சராசரி மென்மையாக்குதல்",
    addNewPatient: "➕ புதிய நோயாளி சுயவிவரத்தை சேர்",
    selectPatient: "நோயாளி தேர்வு:",
    noProfiles: "சுயவிவரம் இல்லை",
    deleteProfile: "🗑️ சுயவிவரத்தை நீக்கு",
    modeClassic: "வண்ண பதில் சோதனை",
    modeIncongruent: "தலைகீழ் சிந்தனை சோதனை",
    modeShapeCount: "அளவு கண்டறிதல் சோதனை",
    loadingData: "AWS தரவைப் பெற IAM டோக்கன் மூலம் பாதுகாப்பாக இணைக்கிறது...",
    profileName: "நோயாளி பெயர்",
    profileAgeGender: "வயது / பாலினம்",
    profileAgeUnit: " வயது",
    profilePresentation: "ADHD வகைப்பாடு",
    profileSeverity: "தீவிர நிலை",
    genderMale: "ஆண்",
    genderFemale: "பெண்",
    presInattentive: "கவனம் குறைபாடு வகை (Inattentive)",
    presHyperactive: "அதிவேக/உணர்ச்சிவசப்படும் வகை (Hyperactive-Impulsive)",
    presCombined: "கூட்டு வகை (Combined)",
    sevMild: "🟢 லேசானது (Mild)",
    sevModerate: "🟡 மிதமானது (Moderate)",
    sevSevere: "🔴 தீவிரமானது (Severe)",
    noTrajectoryTitle: "மருத்துவ தடம் எதுவும் கிடைக்கவில்லை",
    noTrajectoryDesc: (id) => `தேர்ந்தெடுக்கப்பட்ட நோயாளிக்கு (${id}) தற்போதைய பரிமாணத்தில் செல்லுபடியாகும் வரலாற்று தரவு எதுவும் இல்லை.`,
    metricAvgTime: "தற்போதைய பயன்முறையின் சராசரி எதிர்வினை நேரம்",
    metricAccuracy: "தற்போதைய பயன்முறையின் ஒட்டுமொத்த துல்லியம்",
    metricSampleCount: "செல்லுபடியாகும் மாதிரி எண்ணிக்கை",
    unitMs: " ms",
    unitPercent: "%",
    unitTrials: " சோதனைகள்",
    chartTitle: "இருமுனை அறிவாற்றல் கட்டுப்பாடு பகுப்பாய்வு (Reaction Time & Accuracy)",
    chartSub: "இயற்பியல் நேர-தொடர் ஒருமைப்பாட்டை பராமரிக்க பதிலளிக்காத இடைவெளிகளில் கோடு இணைப்பு பயன்படுத்தப்படுகிறது.",
    chartRTTitle: "1. செயலாக்க வேக போக்கு (ms)",
    chartAccTitle: "2. வரிசை துல்லிய போக்கு (%)",
    chartSeqLabel: (idx) => `வரிசை ${idx}`,
    chartRTLegend: "செயலாக்க வேகம்",
    chartRTTooltip: "5-சோதனை சராசரி RT",
    chartAccLegend: "துல்லியம்",
    chartAccTooltip: "5-சோதனை சராசரி துல்லியம்",
    reportTitle: "செயற்கை நுண்ணறிவு மருத்துவ ஆலோசனை அறிக்கை",
    reportCopilot: "Medical Copilot",
    reportAutoRating: (id, time, acc) => `[தானியங்கி மருத்துவ மதிப்பீடு] நோயாளி ${id}-ன் சராசரி எதிர்வினை நேரம் ${time} ms, ஒட்டுமொத்த துல்லியம் ${acc}%.`,
    modalTitle: "📝 புதிய நோயாளி சுயவிவரத்தை சேர்",
    modalPatientId: "நோயாளி ID (தனித்துவமான எழுத்து/எண் அடையாளம்)",
    modalPatientIdPlh: "எ.கா: patient_003",
    modalName: "பெயர்",
    modalNamePlh: "ஜான் டோ",
    modalAge: "வயது",
    modalGender: "பாலினம்",
    modalSeverity: "தீவிர நிலை (Severity)",
    modalPresentation: "ADHD முக்கிய வகை (Presentation)",
    modalCancel: "ரத்து செய்",
    modalConfirm: "சுயவிவரத்தை உருவாக்கு",
    alertInputRequired: "நோயாளி ID மற்றும் பெயரை உள்ளிடவும்!",
    alertCreateFailed: "உருவாக்கம் தோல்வியடைந்தது: ",
    alertConfirmDelete: (id) => `தீவிர எச்சரிக்கை: நோயாளிக்கு [${id}] அழிப்பு கட்டளையை இயக்குகிறீர்கள்.\nஇது சுயவிவரத்தை நிரந்தரமாக நீக்கி, AWS தரவுத்தளத்தில் உள்ள அனைத்து சோதனைத் தடங்களையும் அழிக்கும். இந்த நடவடிக்கை மாற்ற முடியாதது!`,
    alertDeleteFailed: "நீக்கம் தோல்வியடைந்தது: ",
    alertSeverityRequired: "தயவுசெய்து தீவிர நிலையைத் தேர்ந்தெடுக்கவும்!",
    
    // Insights details
    reportNeuroLabel: "நரம்பியல் செயல்திறன் பகுப்பாய்வு",
    reportTrendLabel: "சிகிச்சை போக்கு ஒப்பீடு",
    reportPresLabel: "டிஜிட்டல் சிகிச்சை பரிந்துரை",
    insightNeuroClassicGood: "நோயாளிக்கு முன்நெற்றிக் கட்டுப்பாட்டு செயல்பாடுகளில் உள்ள நடத்தை தடுப்பு அமைப்பு நிலையாக இயங்குகிறது. அடிப்படை வண்ண செயலாக்கத்தின் முடிவெடுக்கும் தாமதம் சாதாரண வரம்பிற்குள் உள்ளது.",
    insightNeuroClassicBad: "தரவு திடீர் அறிவாற்றல் சுமையைக் குறிக்கிறது. நோயாளி தொடர்ச்சியான கவனத்தை பராமரிப்பதில் ஏற்ற இறக்கங்களைக் காட்டுகிறார், மேலும் சில அவசர தொடுதல்களை மேற்கொள்கிறார்.",
    insightPresClassic: "தற்போதைய தகவமைப்பு AI அளவை பராமரிக்கவும். அடுத்த சுழற்சியில் இந்த தொகுதியின் ஆரம்ப தூண்டுதல் கால அளவை 50ms குறைக்க பரிந்துரைக்கப்படுகிறது.",
    
    insightNeuroIncongruentGood: "நோயாளி எதிர்-உள்ளுணர்வு மோதல் குறுக்கீட்டின் கீழ் நல்ல அறிவாற்றல் நெகிழ்வுத்தன்மையைக் காட்டுகிறார், தசை உள்ளுணர்வுகளைத் தடுப்பதில் நிலையான செயல்திறனை வெளிப்படுத்துகிறார்.",
    insightNeuroIncongruentBad: (time) => `தலைகீழ் மோதல் விதிகளுக்கான நோயாளியின் நரம்பியல் செயலாக்க தாமதம் கணிசமாக நீட்டிக்கப்பட்டுள்ளது (சராசரியாக ${time} ms), இது முன்நெற்றி புறணி மாற்று தர்க்கத்தை செயல்படுத்துவதில் உள்ள சிக்கலை காட்டுகிறது.`,
    insightPresIncongruent: "தினசரி பரிந்துரையின் தொடக்கத்தில் தலைகீழ் மோதல் தொகுதியை முதன்மைப்படுத்த பரிந்துரைக்கப்படுகிறது, நோயாளியின் உச்ச டோபமைன் சுரப்பு காலத்தில் பயிற்சி அளிக்கப்பட வேண்டும்.",
    
    insightNeuroShapeGood: "நுண்ணிய வடிவம் மற்றும் அளவு கண்டறிதல் பணிகளில் சாத்தியமான திசைதிருப்பல்களுக்கான நோயாளியின் பாகுபாடு வரம்பு முழுமையாக உருவாக்கப்பட்டுள்ளது, இது குறைந்தபட்ச காட்சி குறுக்கீட்டைக் காட்டுகிறது.",
    insightNeuroShapeBad: "ஒரே வண்ணம் ஆனால் வெவ்வேறு அளவுள்ள தூண்டுதல்களை எதிர்கொள்ளும்போது நோயாளியின் பிழை விகிதம் அதிகரிக்கிறது. இது விரைவான முடிவெடுக்கும் போது காட்சி-இடஞ்சார்ந்த நினைவக வளங்களை திறம்பட ஒதுக்க இயலாமையைக் குறிக்கிறது.",
    insightPresShape: "தகவமைப்பு மதிப்பீட்டில் இந்த சோதனையின் அதிர்வெண்ணை மாறும் வகையில் அதிகரிக்க பரிந்துரைக்கப்படுகிறது, இது அதிவேக பிழையற்ற பயிற்சி மூலம் இடஞ்சார்ந்த அங்கீகார பிழைகளை சரிசெய்ய உதவும்.",
    
    insightTrendNone: "சிகிச்சை போக்கு ஒப்பீட்டை உருவாக்க போதுமான மாதிரி வரிசைகள் இல்லை. தயவுசெய்து கூடுதல் சோதனை தரவுகளை சேகரிக்கவும்.",
    insightTrendSummary: (rtText, accText, statusText) => `சோதனையின் ஆரம்ப கட்டத்துடன் ஒப்பிடும்போது, நோயாளியின் ${rtText}, மற்றும் ${accText}. ஒட்டுமொத்த போக்கு தற்போதைய டிஜிட்டல் சிகிச்சை நோயாளியின் முன்நெற்றி செயல்பாடுகளை செயல்படுத்துவதில் [${statusText}] அடைந்துள்ளது என்பதைக் காட்டுகிறது.`,
    
    rtTrendDecreased: (val) => `சராசரி எதிர்வினை நேரம் ${val} ms குறைந்துள்ளது (செயலாக்க உணர்திறன் மற்றும் சினாப்டிக் கடத்துதல் செயல்திறனில் குறிப்பிடத்தக்க முன்னேற்றத்தைக் காட்டுகிறது)`,
    rtTrendIncreased: (val) => `சராசரி எதிர்வினை நேரம் ${val} ms அதிகரித்துள்ளது (தொடர்ச்சியான அறிவாற்றல் சுமையின் கீழ் முன்நெற்றி புறணி சோர்வடைவதை குறிக்கிறது)`,
    rtTrendStable: "எதிர்வினை நேரம் நிலையாக உள்ளது (உயர்ந்த தகவமைப்பு நிலைத்தன்மையைக் காட்டுகிறது)",
    
    accTrendIncreased: (val) => `துல்லியம் ${val}% அதிகரித்துள்ளது (நடத்தை நரம்பியல் பின்னூட்ட ஒழுங்குமுறை மூலம் நோயாளி செயல்களைத் தடுக்கும் வழிமுறைகளைக் கற்று வலுப்படுத்தியுள்ளார் என்பதைக் காட்டுகிறது)`,
    accTrendDecreased: (val) => `துல்லியம் ${val}% குறைந்துள்ளது (தடுப்பு கட்டுப்பாட்டில் குறைவு மற்றும் பிழைகள் அதிகரிப்பதை பிரதிபலிக்கிறது)`,
    accTrendStable: "துல்லியம் மாறாமல் உள்ளது (அடிப்படை மட்டத்தில் கட்டுப்பாடு நிலையானது)",
    
    statusSignificant: "குறிப்பிடத்தக்க முடிவுகள்",
    statusModerate: "மிதமான விளைவுகள்",
    statusFluctuating: "மாற்றங்களுக்கு உட்பட்ட கட்டம்"
  },
  ms: {
    dashboardTitle: "📊 Portal Pengurusan Doktor: Konsol Penapisan Data Kognitif Ketulenan Tinggi",
    dashboardSub: "Carta Klinikal Teragih | Algoritma Statistik: Pemusatan Purata Gelongsor Windows Ujian 5 Kali",
    addNewPatient: "➕ Tambah Profil Pesakit Klinikal Baru",
    selectPatient: "Dapatkan Rekod:",
    noProfiles: "Tiada rekod",
    deleteProfile: "🗑️ Padam Profil",
    modeClassic: "Warna Asas",
    modeIncongruent: "Minda Songsang",
    modeShapeCount: "Cari Kuantiti",
    loadingData: "Selamat menyambung melalui token IAM untuk mengambil data AWS...",
    profileName: "Nama Pesakit",
    profileAgeGender: "Umur / Jantina",
    profileAgeUnit: " Umur",
    profilePresentation: "Jenis Persembahan ADHD",
    profileSeverity: "Tahap Keterukan",
    genderMale: "Lelaki",
    genderFemale: "Perempuan",
    presInattentive: "Jenis Kurang Perhatian (Inattentive)",
    presHyperactive: "Jenis Hiperaktif/Impulsif (Hyperactive-Impulsive)",
    presCombined: "Jenis Gabungan (Combined)",
    sevMild: "🟢 Ringan (Mild)",
    sevModerate: "🟡 Sederhana (Moderate)",
    sevSevere: "🔴 Teruk (Severe)",
    noTrajectoryTitle: "Tiada Trajektori Klinikal Dijumpai",
    noTrajectoryDesc: (id) => `Pesakit yang dipilih (${id}) tidak mempunyai data sejarah yang sah dalam dimensi yang ditentukan.`,
    metricAvgTime: "Purata Masa Tindak Balas Dimensi Semasa",
    metricAccuracy: "Kadar Ketepatan Komprehensif Mod Semasa",
    metricSampleCount: "Jumlah Sampel Data Sah",
    unitMs: " ms",
    unitPercent: "%",
    unitTrials: " kali",
    chartTitle: "Analisis Kognitif Dwi-Trek (Reaction Time & Accuracy)",
    chartSub: "Sambungan garis digunakan merentas selang tiada tindak balas untuk mengekalkan integriti siri masa fizikal.",
    chartRTTitle: "1. Trend Kelajuan Pemprosesan Teras (ms)",
    chartAccTitle: "2. Kadar Ketepatan Selang Jujukan (%)",
    chartSeqLabel: (idx) => `Jujukan ${idx}`,
    chartRTLegend: "Kelajuan Proses",
    chartRTTooltip: "Purata RT Ujian 5",
    chartAccLegend: "Ketepatan",
    chartAccTooltip: "Purata Ketepatan Ujian 5",
    reportTitle: "Laporan Bantuan Klinikal Pintar",
    reportCopilot: "Medical Copilot",
    reportAutoRating: (id, time, acc) => `[Penilaian Automatik Klinikal] Purata masa tindak balas pesakit ${id} dalam mod semasa ialah ${time} ms, dengan kadar ketepatan komprehensif sebanyak ${acc}%.`,
    modalTitle: "📝 Tambah Profil Pesakit Klinikal Baru",
    modalPatientId: "ID Pesakit (Pengenal pasti unik bahasa Inggeris/angka)",
    modalPatientIdPlh: "cth: patient_003",
    modalName: "Nama",
    modalNamePlh: "John Doe",
    modalAge: "Umur",
    modalGender: "Jantina",
    modalSeverity: "Tahap Keterukan (Severity)",
    modalPresentation: "Jenis Persembahan Teras ADHD (Presentation)",
    modalCancel: "Batal",
    modalConfirm: "Sahkan Cipta",
    alertInputRequired: "Sila masukkan ID Pesakit dan Nama!",
    alertCreateFailed: "Ciptaan gagal: ",
    alertConfirmDelete: (id) => `AMARAN KRITIKAL: Anda sedang melaksanakan arahan pemusnahan untuk pesakit [${id}].\nTindakan ini akan memadamkan rekod profil secara kekal dan mengosongkan semua trajektori siri ujian dalam kluster pangkalan data AWS. Tindakan ini tidak boleh diubah!`,
    alertDeleteFailed: "Pemadaman gagal: ",
    alertSeverityRequired: "Sila pilih tahap keterukan!",
    
    // Insights details
    reportNeuroLabel: "Analisis Prestasi Neurologikal",
    reportTrendLabel: "Penilaian Trend Rawatan",
    reportPresLabel: "Preskripsi Rawatan Terapi Digital",
    insightNeuroClassicGood: "Sistem Perencatan Tingkah Laku (Behavioral Inhibition System) dalam fungsi kawalan eksekutif prefrontal pesakit adalah stabil, kelewatan keputusan pusat berada dalam ambang perubatan normal.",
    insightNeuroClassicBad: "Data menunjukkan beban kognitif berlebihan secara tiba-tiba. Pesakit menunjukkan turun naik dalam mengekalkan Perhatian Berterusan (Sustained Attention), terdapat kecenderungan sentuhan impulsif.",
    insightPresClassic: "Kekalkan garis dasar titrasi AI penyesuaian semasa. Disyorkan untuk memampatkan tempoh rangsangan awal modul ini sebanyak 50ms dalam kitaran seterusnya untuk mencabar had fokus prefrontal.",
    
    insightNeuroIncongruentGood: "Pesakit menunjukkan fleksibiliti kognitif (Cognitive Flexibility) yang baik di bawah gangguan konflik kontra-intuisi, menunjukkan kecekapan penukaran eksekutif yang standard ke atas refleks otot.",
    insightNeuroIncongruentBad: (time) => `Kelewatan pemprosesan neural pesakit untuk peraturan konflik songsang dipanjangkan dengan ketara (purata ${time} ms), menunjukkan sekatan pembinaan semula kognitif apabila korteks prefrontal mengatasi pemetaan refleks primer untuk melaksanakan logik bertentangan.`,
    insightPresIncongruent: "Disyorkan untuk mengutamakan modul konflik songsang pada permulaan preskripsi harian, melakukan latihan kekerapan sasaran semasa tempoh rembesan dopamin puncak pesakit.",
    
    insightNeuroShapeGood: "Ambang diskriminasi pesakit untuk potensi gangguan dalam tugas diskriminasi bentuk-dan-kuantiti halus berkembang sepenuhnya, menunjukkan gangguan kesesakan visual (Visual Crowding) yang minimum dalam perencatan tindak balas.",
    insightNeuroShapeBad: "Kadar ralat pesakit meningkat apabila menghadapi rangsangan warna yang sama tetapi kuantiti yang berbeza. Ini menunjukkan ketidakupayaan untuk memperuntukkan sumber memori kerja ruang visual secara berkesan semasa membuat keputusan cepat, menunjukkan had kawalan motor halus.",
    insightPresShape: "Disyorkan untuk meningkatkan kekerapan tugas subitizing bentuk ini dalam titrasi penyesuaian, menggunakan latihan bebas ralat frekuensi tinggi untuk membetulkan sisihan pengiktirafan ruang berkaitan tingkah laku hiperaktif.",
    
    insightTrendNone: "Kekurangan sampel jujukan yang sah untuk menjana perbandingan trend rawatan. Sila kumpulkan lebih banyak data ujian.",
    insightTrendSummary: (rtText, accText, statusText) => `Berbanding dengan peringkat awal ujian, ${rtText} pesakit, dan ${accText}. Trend keseluruhan menunjukkan bahawa terapi digital semasa telah mencapai [${statusText}] dalam mengaktifkan dan membina semula fungsi eksekutif prefrontal pesakit.`,
    
    rtTrendDecreased: (val) => `kelajuan tindak balas teras dikurangkan sebanyak ${val} ms (menunjukkan peningkatan ketara dalam kepekaan pemprosesan pusat otak dan kecekapan penghantaran sinaptik)`,
    rtTrendIncreased: (val) => `kelajuan tindak balas teras dipanjangkan sebanyak ${val} ms (menunjukkan keletihan perhatian dan penggunaan sumber korteks prefrontal di bawah beban kognitif berterusan seiring kemajuan ujian)`,
    rtTrendStable: "kelajuan tindak balas kekal stabil (menunjukkan tahap kestabilan pusat penyesuaian yang tinggi)",
    
    accTrendIncreased: (val) => `kadar ketepatan meningkat sebanyak ${val}% (menunjukkan pesakit aktif belajar dan menguatkan mekanisme perencatan eksekutif melalui maklum balas neuro tingkah laku)`,
    accTrendDecreased: (val) => `kadar ketepatan menurun sebanyak ${val}% (mencerminkan penurunan kawalan impulsif dan peningkatan kadar keciciran)`,
    accTrendStable: "kadar ketepatan kekal rata (kawalan impuls stabil pada tahap garis dasar)",
    
    statusSignificant: "hasil yang ketara",
    statusModerate: "kesan sederhana",
    statusFluctuating: "fasa pelarasan turun naik"
  }
};

function DoctorDashboard({ lang = 'zh' }) {
  const [patientsList, setPatientsList] = useState([]); // 动态患者名录库
  const [currentPatientId, setCurrentPatientId] = useState("");
  const [patientProfile, setPatientProfile] = useState(null); // 当前选中的患者基本资料
  const [showCreateModal, setShowCreateModal] = useState(false); // 控制新建档案弹窗显隐
  
  // 新建患者表单状态
  const [createFormData, setCreateFormData] = useState({
    patient_id: "",
    name: "",
    age: 8,
    gender: "男",
    presentation: "Combined",
    severity: ""
  });

  const [rawDbData, setRawDbData] = useState([]);
  const [viewMode, setViewMode] = useState('CLASSIC');
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState({ avgTime: 0, accuracy: 0, totalTrials: 0, rtTrend: 0, accTrend: 0, hasTrend: false });
  const [loading, setLoading] = useState(true);

  const t = translations[lang] || translations.zh;

  const getGenderText = (gender) => {
    if (gender === '男' || gender === 'Male' || gender === 'Lelaki' || gender === 'ஆண்') {
      return t.genderMale;
    }
    if (gender === '女' || gender === 'Female' || gender === 'Perempuan' || gender === 'பெண்') {
      return t.genderFemale;
    }
    return gender;
  };

  const getPresentationText = (presentation) => {
    if (presentation === 'Inattentive') return t.presInattentive;
    if (presentation === 'Hyperactive-Impulsive') return t.presHyperactive;
    if (presentation === 'Combined') return t.presCombined;
    return presentation;
  };

  const getSeverityText = (severity) => {
    if (severity === 'Mild') return t.sevMild;
    if (severity === 'Moderate') return t.sevModerate;
    if (severity === 'Severe') return t.sevSevere;
    return severity;
  };

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

  // 2. 当选中患者变更时，拉取对应 AWS 历史轨迹 (通过 active 标记规避异步竞态问题)
  useEffect(() => {
    let active = true;
    if (!currentPatientId) {
      setRawDbData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`http://localhost:8000/api/patients/${currentPatientId}/stats`)
      .then(res => res.json())
      .then(fetchedData => {
        if (active) {
          setRawDbData(fetchedData);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("无法读取数据:", err);
        if (active) {
          setRawDbData([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentPatientId]);

  // 2.5 当选中患者变更时，拉取对应患者的基本个人档案 (用于医生端看板的信息显示)
  useEffect(() => {
    let active = true;
    if (!currentPatientId) {
      setPatientProfile(null);
      return;
    }
    fetch(`http://localhost:8000/api/patients/${currentPatientId}/ai-config`)
      .then(res => res.json())
      .then(profile => {
        if (active) {
          setPatientProfile(profile);
        }
      })
      .catch(err => {
        console.error("无法加载患者个人病历详情:", err);
        if (active) setPatientProfile(null);
      });
      
    return () => {
      active = false;
    };
  }, [currentPatientId]);

  // 3. 临床数据隔离与滑动聚合算法
  useEffect(() => {
    if (rawDbData.length === 0) {
      setChartData([]);
      setMetrics({ avgTime: 0, accuracy: 0, totalTrials: 0, rtTrend: 0, accTrend: 0, hasTrend: false });
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
      setMetrics({ avgTime: 0, accuracy: 0, totalTrials: 0, rtTrend: 0, accTrend: 0, hasTrend: false });
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
        name: t.chartSeqLabel(stageIndex),
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

    // 计算早期和晚期数据对比，评估数字治疗成果
    const validRTs = groupedChartData.filter(d => d.avgReactionTime !== null);
    let rtTrend = 0;
    let accTrend = 0;
    let hasTrend = false;

    if (validRTs.length >= 2) {
      const firstValid = validRTs[0];
      const lastValid = validRTs[validRTs.length - 1];
      rtTrend = lastValid.avgReactionTime - firstValid.avgReactionTime;
      accTrend = lastValid.accuracy - firstValid.accuracy;
      hasTrend = true;
    } else if (groupedChartData.length >= 2) {
      const firstSeq = groupedChartData[0];
      const lastSeq = groupedChartData[groupedChartData.length - 1];
      rtTrend = 0;
      accTrend = lastSeq.accuracy - firstSeq.accuracy;
      hasTrend = true;
    }

    setChartData(groupedChartData);
    setMetrics({
      avgTime: globalAvgTime,
      accuracy: globalAccuracy,
      totalTrials: filteredByMode.length,
      rtTrend: rtTrend,
      accTrend: accTrend,
      hasTrend: hasTrend
    });

  }, [rawDbData, viewMode, lang]);

  // 创建新患者档案
  const handleCreatePatientSubmit = (e) => {
    e.preventDefault();
    const trimmedId = createFormData.patient_id.trim();
    const trimmedName = createFormData.name.trim();
    if (!trimmedId || !trimmedName) {
      alert(t.alertInputRequired);
      return;
    }
    if (!createFormData.severity) {
      alert(t.alertSeverityRequired);
      return;
    }

    fetch('http://localhost:8000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createFormData)
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.detail); });
        return res.json();
      })
      .then(data => {
        alert(data.message);
        setCreateFormData({
          patient_id: "",
          name: "",
          age: 8,
          gender: "男",
          presentation: "Combined",
          severity: ""
        });
        setShowCreateModal(false);
        refreshPatientsList(trimmedId); // 刷新列表并自动切换到新创建的患者
      })
      .catch(err => alert(`${t.alertCreateFailed}${err.message}`));
  };

  // 彻底删除注销患者档案
  const handleDeletePatientProfile = () => {
    if (!currentPatientId) return;
    const isConfirmed = window.confirm(t.alertConfirmDelete(currentPatientId));
    if (!isConfirmed) return;

    fetch(`http://localhost:8000/api/patients/${currentPatientId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        refreshPatientsList(); // 重新加载列表，会自动落到剩余的第一张档案上
      })
      .catch(err => console.error(t.alertDeleteFailed, err));
  };

  const renderAIInsight = () => {
    // 基础神经学表现分析
    let neuroAnalysis = "";
    let prescription = "";

    if (viewMode === 'CLASSIC') {
      neuroAnalysis = metrics.accuracy > 85 ? t.insightNeuroClassicGood : t.insightNeuroClassicBad;
      prescription = t.insightPresClassic;
    }
    else if (viewMode === 'INCONGRUENT') {
      neuroAnalysis = metrics.accuracy > 80 ? t.insightNeuroIncongruentGood : t.insightNeuroIncongruentBad(metrics.avgTime);
      prescription = t.insightPresIncongruent;
    }
    else if (viewMode === 'SHAPE_COUNT') {
      neuroAnalysis = metrics.accuracy > 85 ? t.insightNeuroShapeGood : t.insightNeuroShapeBad;
      prescription = t.insightPresShape;
    }

    // 趋势变化分析 (治疗成果评估)
    let trendAnalysis = t.insightTrendNone;
    if (metrics.hasTrend) {
      const rtText = metrics.rtTrend < 0
        ? t.rtTrendDecreased(Math.abs(metrics.rtTrend))
        : metrics.rtTrend > 0
          ? t.rtTrendIncreased(metrics.rtTrend)
          : t.rtTrendStable;

      const accText = metrics.accTrend > 0
        ? t.accTrendIncreased(metrics.accTrend)
        : metrics.accTrend < 0
          ? t.accTrendDecreased(Math.abs(metrics.accTrend))
          : t.accTrendStable;

      const statusText = metrics.accTrend > 0 && metrics.rtTrend <= 0
        ? t.statusSignificant
        : (metrics.accTrend >= 0 ? t.statusModerate : t.statusFluctuating);

      trendAnalysis = t.insightTrendSummary(rtText, accText, statusText);
    }

    return (
      <>
        <strong>[{t.reportNeuroLabel}]</strong> {neuroAnalysis}
        <br />
        <strong>[{t.reportTrendLabel}]</strong> {trendAnalysis}
        <br />
        <strong>[{t.reportPresLabel}]</strong> {prescription}
      </>
    );
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
          <h2 style={{ color: '#0f172a', margin: '0 0 5px 0' }}>{t.dashboardTitle}</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {t.dashboardSub}
          </p>

          {/* 新建患者按钮，点击弹出模态对话框 */}
          <button 
            onClick={() => setShowCreateModal(true)} 
            style={{ 
              marginTop: '15px', background: '#2563eb', color: '#fff', border: 'none', 
              padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            {t.addNewPatient}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {/* 动态调取病历与注销组合控制区 */}
          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>{t.selectPatient}</span>
            <select
              value={currentPatientId}
              onChange={(e) => setCurrentPatientId(e.target.value)}
              style={{ border: 'none', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', outline: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 'bold' }}
            >
              {patientsList.map(id => (
                <option key={id} value={id}>ID: {id}</option>
              ))}
              {patientsList.length === 0 && <option value="">{t.noProfiles}</option>}
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
                {t.deleteProfile}
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
                {mode === 'CLASSIC' && t.modeClassic}
                {mode === 'INCONGRUENT' && t.modeIncongruent}
                {mode === 'SHAPE_COUNT' && t.modeShapeCount}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#3b82f6', fontWeight: 'bold' }}>
          {t.loadingData}
        </div>
      ) : (
        <div>
          {/* 患者基本资料与诊断标签卡片 */}
          {patientProfile && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{t.profileName}</span>
                <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>{patientProfile.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{t.profileAgeGender}</span>
                <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>
                  {patientProfile.age}{t.profileAgeUnit} / {getGenderText(patientProfile.gender)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{t.profilePresentation}</span>
                <div style={{ color: '#2563eb', fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>
                  {getPresentationText(patientProfile.presentation)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{t.profileSeverity}</span>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', color: patientProfile.severity === 'Severe' ? '#ef4444' : (patientProfile.severity === 'Moderate' ? '#d97706' : '#10b981') }}>
                  {getSeverityText(patientProfile.severity)}
                </div>
              </div>
            </div>
          )}

          {chartData.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px', background: '#fff' }}>
              <h3>{t.noTrajectoryTitle}</h3>
              <p>{t.noTrajectoryDesc(currentPatientId)}</p>
            </div>
          ) : (
            <div>
              {/* 核心医学指标卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>{t.metricAvgTime}</div>
                  <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>
                    {metrics.avgTime} <span style={{ fontSize: '14px', color: '#64748b' }}>{t.unitMs}</span>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ec4899' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>{t.metricAccuracy}</div>
                  <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>{metrics.accuracy}{t.unitPercent}</div>
                </div>

                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #cbd5e1' }}>
                  <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>{t.metricSampleCount}</div>
                  <div style={{ color: '#1e293b', fontSize: '26px', fontWeight: 'bold', marginTop: '5px' }}>{metrics.totalTrials} <span style={{ fontSize: '14px', color: '#64748b' }}>{t.unitTrials}</span></div>
                </div>
              </div>

              {/* 双轨分离式临床波形图 */}
              <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '16px' }}>{t.chartTitle}</h4>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 25px 0' }}>{t.chartSub}</p>

                <h5 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '13px' }}>{t.chartRTTitle}</h5>
                <div style={{ height: '200px', marginBottom: '35px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} syncId="patientData">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} minTickGap={10} hide={true} />
                      <YAxis stroke="#94a3b8" domain={['dataMin - 30', 'dataMax + 30']} fontSize={11} width={45} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`${value} ms`, t.chartRTTooltip]} />
                      <Line type="monotone" dataKey="avgReactionTime" name={t.chartRTLegend} stroke={getLineColor()} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <h5 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '13px' }}>{t.chartAccTitle}</h5>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} syncId="patientData">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} minTickGap={10} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} width={45} tickFormatter={(tick) => `${tick}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`${value}%`, t.chartAccTooltip]} />
                      <Line type="stepAfter" dataKey="accuracy" name={t.chartAccLegend} stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899' }} activeDot={{ r: 6 }} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI 报告 */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, color: '#0f172a' }}>{t.reportTitle}</h4>
                  </div>
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold' }}>{t.reportCopilot}</span>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155' }}>
                  {t.reportAutoRating(currentPatientId, metrics.avgTime, metrics.accuracy)}
                  <br />
                  {renderAIInsight()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ➕ 新建患者个人档案 Modal 弹窗 */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', width: '450px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            {/* Modal 头部 */}
            <div style={{ background: '#f8fafc', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: 'bold' }}>{t.modalTitle}</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>&times;</button>
            </div>
            {/* Modal 表单 */}
            <form onSubmit={handleCreatePatientSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalPatientId}</label>
                <input 
                  type="text" 
                  placeholder={t.modalPatientIdPlh} 
                  value={createFormData.patient_id}
                  onChange={(e) => setCreateFormData({ ...createFormData, patient_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalName}</label>
                  <input 
                    type="text" 
                    placeholder={t.modalNamePlh} 
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalAge}</label>
                  <input 
                    type="number" 
                    value={createFormData.age}
                    onChange={(e) => setCreateFormData({ ...createFormData, age: parseInt(e.target.value) || 8 })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    min="2"
                    max="99"
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalGender}</label>
                  <select 
                    value={createFormData.gender}
                    onChange={(e) => setCreateFormData({ ...createFormData, gender: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="男">{t.genderMale}</option>
                    <option value="女">{t.genderFemale}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalSeverity}</label>
                  <select 
                    value={createFormData.severity}
                    onChange={(e) => setCreateFormData({ ...createFormData, severity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value=""></option>
                    <option value="Mild">{getSeverityText("Mild")}</option>
                    <option value="Moderate">{getSeverityText("Moderate")}</option>
                    <option value="Severe">{getSeverityText("Severe")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>{t.modalPresentation}</label>
                <select 
                  value={createFormData.presentation}
                  onChange={(e) => setCreateFormData({ ...createFormData, presentation: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="Inattentive">{getPresentationText("Inattentive")}</option>
                  <option value="Hyperactive-Impulsive">{getPresentationText("Hyperactive-Impulsive")}</option>
                  <option value="Combined">{getPresentationText("Combined")}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>
                  {t.modalCancel}
                </button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}>
                  {t.modalConfirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;