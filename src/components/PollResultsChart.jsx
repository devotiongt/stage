import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

function PollResultsChart({ pollResults, activePoll }) {
  const chartRefs = useRef({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const intervalRef = useRef(null)

  const questions = activePoll?.poll_questions?.sort((a, b) => a.order_index - b.order_index) || []
  // Para encuestas en vivo, mostrar todas las preguntas aunque no tengan respuestas
  // Para encuestas históricas, solo mostrar las que tienen datos
  const validQuestions = pollResults && Object.keys(pollResults).length > 0 
    ? questions.filter(q => pollResults[q.id])
    : questions

  // Auto-avanzar cada 8 segundos si hay más de una pregunta
  useEffect(() => {
    if (validQuestions.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentQuestionIndex(prev => (prev + 1) % validQuestions.length)
      }, 8000)
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [validQuestions.length])

  // Reiniciar al índice 0 cuando cambien las preguntas
  useEffect(() => {
    setCurrentQuestionIndex(0)
  }, [activePoll?.id])

  // Retorno temprano después de todos los hooks
  if (!activePoll || validQuestions.length === 0) {
    return null
  }

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index)
    // Reiniciar el intervalo cuando el usuario navega manualmente
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      if (validQuestions.length > 1) {
        intervalRef.current = setInterval(() => {
          setCurrentQuestionIndex(prev => (prev + 1) % validQuestions.length)
        }, 8000)
      }
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          font: {
            size: 20,
            weight: '600'
          },
          padding: 25
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(131, 56, 236, 0.5)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#ffffff',
          font: {
            size: 14,
            weight: '500'
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#ffffff',
          font: {
            size: 14,
            weight: '500'
          }
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#ffffff',
          font: {
            size: 18,
            weight: '600'
          },
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(131, 56, 236, 0.5)',
        borderWidth: 1
      }
    }
  }

  const colors = [
    '#8338ec', '#ff006e', '#3a86ff', '#06ffa5', '#ffbe0b',
    '#fb5607', '#ffaa00', '#c77dff', '#7209b7', '#560bad'
  ]

  const renderChart = (questionId, questionData, index) => {
    if (questionData.type === 'text') {
      return (
        <div key={questionId} style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1200px',
            width: '90%',
            height: '90%'
          }}>
            <h3 style={{ 
              color: '#ffffff', 
              marginBottom: '2rem',
              fontSize: '2.5rem',
              textAlign: 'center',
              fontWeight: '600',
              lineHeight: '1.2'
            }}>
              {questionData.question}
            </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {questionData.responses.length === 0 ? (
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                textAlign: 'center',
                fontStyle: 'italic' 
              }}>
                Aún no hay respuestas
              </p>
            ) : (
              questionData.responses.map((response, idx) => (
                <div key={idx} style={{
                  background: 'rgba(131, 56, 236, 0.1)',
                  border: '1px solid rgba(131, 56, 236, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#ffffff'
                }}>
                  "{response}"
                </div>
              ))
            )}
          </div>
          <div style={{
            textAlign: 'center',
            marginTop: '1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9rem'
          }}>
            {questionData.total} respuesta{questionData.total !== 1 ? 's' : ''}
          </div>
          </div>
        </div>
      )
    }

    const options = Object.values(questionData.options)
    const hasData = options.some(opt => opt.count > 0)

    if (!hasData) {
      return (
        <div key={questionId} style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '1.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1200px',
            width: '90%',
            height: '90%',
            justifyContent: 'center'
          }}>
            <h3 style={{ 
              color: '#ffffff', 
              marginBottom: '2rem',
              fontSize: '2.5rem',
              fontWeight: '600',
              lineHeight: '1.2'
            }}>
              {questionData.question}
            </h3>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '1.2rem',
            fontStyle: 'italic' 
          }}>
            Esperando respuestas...
          </p>
          <div style={{
            marginTop: '1rem',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.9rem'
          }}>
            0 respuestas
          </div>
          </div>
        </div>
      )
    }

    const chartData = {
      labels: options.map(opt => opt.text),
      datasets: [{
        data: options.map(opt => opt.count),
        backgroundColor: colors.slice(0, options.length),
        borderColor: colors.slice(0, options.length).map(color => color + '80'),
        borderWidth: 2,
      }]
    }

    return (
      <div key={questionId} style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1200px',
          width: '90%',
          height: '90%'
        }}>
        <h3 style={{ 
          color: '#ffffff', 
          marginBottom: '1rem',
          fontSize: '2.2rem',
          textAlign: 'center',
          fontWeight: '600',
          lineHeight: '1.2'
        }}>
          {questionData.question}
        </h3>
        
        <div style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          maxHeight: '500px',
          marginBottom: '1rem'
        }}>
          {options.length <= 4 ? (
            <Doughnut 
              data={chartData} 
              options={doughnutOptions}
              ref={el => chartRefs.current[questionId] = el}
            />
          ) : (
            <Bar 
              data={chartData} 
              options={chartOptions}
              ref={el => chartRefs.current[questionId] = el}
            />
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginTop: '1rem',
          flexWrap: 'wrap'
        }}>
          {options.map((option, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#ffffff',
              fontSize: '1.4rem',
              fontWeight: '600'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: colors[idx],
                boxShadow: `0 0 10px ${colors[idx]}40`
              }}></div>
              <span>{option.count} votos ({option.percentage}%)</span>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '1rem',
          color: '#ffffff',
          fontSize: '1.4rem',
          fontWeight: '700',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          display: 'inline-block',
          margin: '1rem auto 0'
        }}>
          Total: {questionData.total} respuesta{questionData.total !== 1 ? 's' : ''}
        </div>
        </div>
      </div>
    )
  }

  const currentQuestion = validQuestions[currentQuestionIndex]
  const questionData = currentQuestion ? (pollResults?.[currentQuestion.id] || {
    type: currentQuestion.question_type,
    question: currentQuestion.question_text,
    options: currentQuestion.poll_options?.reduce((acc, opt) => {
      acc[opt.id] = { text: opt.option_text, count: 0, percentage: 0 }
      return acc
    }, {}) || {},
    total: 0
  }) : null
  
  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      {/* Indicador simple de múltiples preguntas */}
      {validQuestions.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(131, 56, 236, 0.8)',
          color: '#ffffff',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '1rem',
          fontWeight: '600',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span className="material-icons" style={{ fontSize: '1rem' }}>quiz</span>
          {currentQuestionIndex + 1} de {validQuestions.length}
        </div>
      )}

      {/* Contenido principal con animación suave */}
      <div 
        key={currentQuestion?.id} 
        style={{
          width: '100%',
          height: '100%',
          animation: 'fadeIn 0.5s ease-in-out'
        }}
      >
        {questionData && renderChart(currentQuestion.id, questionData, currentQuestionIndex)}
      </div>

      {/* Navegación minimalista en la esquina inferior */}
      {validQuestions.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          display: 'flex',
          gap: '0.5rem',
          zIndex: 10
        }}>
          <button
            onClick={() => goToQuestion((currentQuestionIndex - 1 + validQuestions.length) % validQuestions.length)}
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: 'none',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(131, 56, 236, 0.8)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
          >
            <span className="material-icons" style={{ fontSize: '1.2rem' }}>chevron_left</span>
          </button>
          
          <button
            onClick={() => goToQuestion((currentQuestionIndex + 1) % validQuestions.length)}
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: 'none',
              borderRadius: '8px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(131, 56, 236, 0.8)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.7)'}
          >
            <span className="material-icons" style={{ fontSize: '1.2rem' }}>chevron_right</span>
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  )
}

export default PollResultsChart