import {useState, useRef} from 'react'

function App(){
  const[gameState, setGameState] = useState('idle')
  const[targetType, setTargetType] = useState(null) //'go' Blue; 'nogo' Red
  const startTimeRef = useRef(0)

  const startTrial = () =>{
    setGameState('waiting')

    const randomDely = Math.random() *2000 + 1000;

    setTimeout(()=>{
      const isGO = Math.random() > 0.2;
      setTargetType(isGO ? 'go': 'nogo');
      setGameState('showing_target');

      startTimeRef.current = performance.now();

    }, randomDely);
  }

  const handleUserClick = async() =>{
    if(gameState !== 'showing_target') return;

    const reactionTime = performance.now() - startTimeRef.current;
    setGameState('idle');

    const trialData = {
      timestamp: new Date().toISOString(),
      target_type: targetType,
      action: 'clicked',
      reaction_time_ms: reactionTime,
      is_correct: targetType === 'go'
    }

    console.log("Data Captured:", trialData);

    await fetch('http://localhost:8000/api/log', { method: 'POST',headers: {'Content-Type': 'application/json'}, body: JSON.stringify(trialData) })
  }

  return(
    <div
      style = {{height:'100vh', display:'flex', flexDirextion:'column', alignItems:'center', justifyContent:'center'}}
      onClick = {handleUserClick}
    >
      <h1>认知训练原型： GO / No-Go</h1>
      <p>规则：看到蓝色圆圈立刻点击屏幕，看到红色圆圈绝对不要点击。</p>

    {gameState === 'idle' && (
      <button onClick={(e) => { e.stopPropagation(); startTrial();}} style = {{ padding: '20px'}}>
        START
      </button>
    )}

    {gameState === 'showing_target' && (
      <div style={{
        width:'200px',height:'200px', borderRadius: '50%',
        backgroundColor: targetType === 'go' ? 'blue' : 'red'
      }} />
    )}
    </div>
  )
}

export default App