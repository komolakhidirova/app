'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Question {
	text: string
	options: string[]
	correctAnswer: string
	subtopic: string
}

interface AnswerRecord {
	questionNumber: number
	questionText: string
	userAnswer: string
	correctAnswer: string
	isCorrect: boolean
	subtopic: string
}

interface SessionData {
	id: string
	topic: string
	answers: AnswerRecord[]
	currentBatch: number
	completed: boolean
}

const TOTAL_QUESTIONS = 10
const BATCH_SIZE = 5
const TOTAL_BATCHES = TOTAL_QUESTIONS / BATCH_SIZE

export default function QuizQuestionsPage() {
	const params = useParams()
	const router = useRouter()
	const sessionId = params.id as string

	const [session, setSession] = useState<SessionData | null>(null)
	const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
	const [currentIndexInBatch, setCurrentIndexInBatch] = useState(0)
	const [currentBatch, setCurrentBatch] = useState<Question[]>([])
	const [batchNumber, setBatchNumber] = useState(1)
	const [questionNumber, setQuestionNumber] = useState(1)
	const [answers, setAnswers] = useState<AnswerRecord[]>([])
	const [loading, setLoading] = useState(false)
	const [feedback, setFeedback] = useState('')
	const [error, setError] = useState('')
	const [showFeedback, setShowFeedback] = useState(false)
	const [isWaitingForNext, setIsWaitingForNext] = useState(false)

	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const hasLoadedBatch = useRef(false)

	// ✅ Функция для получения сессии из общего массива sessions
	const getSessionFromStorage = (id: string): SessionData | null => {
		const stored = localStorage.getItem('sessions')
		if (!stored) return null
		const sessions: SessionData[] = JSON.parse(stored)
		return sessions.find(s => s.id === id) || null
	}

	// ✅ Функция для сохранения сессии в общий массив sessions
	const saveSessionToStorage = (updatedSession: SessionData) => {
		const stored = localStorage.getItem('sessions')
		if (!stored) return

		const sessions: SessionData[] = JSON.parse(stored)
		const index = sessions.findIndex(s => s.id === updatedSession.id)

		if (index !== -1) {
			sessions[index] = updatedSession
			localStorage.setItem('sessions', JSON.stringify(sessions))
		}
	}

	// Загрузка сессии из localStorage
	useEffect(() => {
		const loadSession = () => {
			try {
				const data = getSessionFromStorage(sessionId)
				if (!data) {
					console.error('Сессия не найдена')
					router.push('/quiz/new')
					return
				}
				setSession(data)
				setAnswers(data.answers || [])
				setBatchNumber(data.currentBatch || 1)

				// Если сессия завершена, перенаправляем на диагностику
				if (data.completed) {
					router.push(`/quiz/${sessionId}`)
				}
			} catch (error) {
				console.error('Ошибка загрузки сессии:', error)
				router.push('/quiz/new')
			}
		}

		if (sessionId) {
			loadSession()
		}
	}, [sessionId, router])

	// Сохранение сессии в localStorage
	const saveSession = useCallback(
		(updatedSession: Partial<SessionData>) => {
			if (!session) return

			const newSession = { ...session, ...updatedSession }
			saveSessionToStorage(newSession)
			setSession(newSession)
		},
		[session]
	)

	// Загрузка пачки вопросов
	const loadBatch = useCallback(
		async (batchNum: number, currentAnswers: AnswerRecord[]) => {
			if (hasLoadedBatch.current && batchNum === 1) {
				console.log('Первая пачка уже загружается, пропускаем')
				return
			}

			setLoading(true)
			setError('')

			try {
				const askedTexts = currentAnswers.map(a => a.questionText)

				const res = await fetch('/api/generate-batch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						topic: session?.topic,
						batchNumber: batchNum,
						totalBatches: TOTAL_BATCHES,
						askedQuestions: askedTexts,
						answers: currentAnswers,
					}),
				})

				if (!res.ok) {
					throw new Error(`HTTP error! status: ${res.status}`)
				}

				const data = await res.json()

				if (!data.questions || data.questions.length === 0) {
					throw new Error('Нет вопросов в ответе')
				}

				setCurrentBatch(data.questions)
				setCurrentIndexInBatch(0)
				setCurrentQuestion(data.questions[0])

				if (batchNum === 1) {
					hasLoadedBatch.current = true
				}

				// Обновляем текущую пачку в сессии
				saveSession({ currentBatch: batchNum })
			} catch (err) {
				console.error('Ошибка загрузки пачки:', err)
				setError('Не удалось загрузить вопросы. Попробуйте ещё раз.')
				setCurrentBatch([])
				setCurrentQuestion(null)
			} finally {
				setLoading(false)
			}
		},
		[session?.topic, saveSession]
	)

	// Сохранение ответов и завершение теста
	const finishTest = useCallback(
		async (allAnswers: AnswerRecord[]) => {
			saveSession({
				answers: allAnswers,
				completed: true,
				currentBatch: TOTAL_BATCHES,
			})
			setTimeout(() => router.push(`/quiz/${sessionId}`), 1500)
		},
		[sessionId, router, saveSession]
	)

	// Переход к следующему вопросу
	const moveToNextQuestion = useCallback(
		(newAnswers: AnswerRecord[]) => {
			const nextIndex = currentIndexInBatch + 1

			if (nextIndex < currentBatch.length) {
				setQuestionNumber(prev => prev + 1)

				setCurrentIndexInBatch(nextIndex)
				setCurrentQuestion(currentBatch[nextIndex])
				setShowFeedback(false)
				setFeedback('')
				setIsWaitingForNext(false)
			} else {
				const nextBatch = batchNumber + 1

				if (nextBatch <= TOTAL_BATCHES) {
					setBatchNumber(nextBatch)
					setCurrentIndexInBatch(0)
					setCurrentBatch([])
					setShowFeedback(false)
					setFeedback('')
					setIsWaitingForNext(false)
					loadBatch(nextBatch, newAnswers).then(() => {
						setQuestionNumber(prev => prev + 1)
					})
				} else {
					finishTest(newAnswers)
				}
			}
		},
		[currentIndexInBatch, currentBatch, batchNumber, loadBatch, finishTest]
	)

	// Обработка ответа
	const handleAnswer = async (selectedAnswer: string) => {
		if (!currentQuestion || isWaitingForNext) return

		const userAnswerLetter = selectedAnswer.trim().charAt(0).toUpperCase()
		const correctAnswerLetter = currentQuestion.correctAnswer
			.trim()
			.charAt(0)
			.toUpperCase()
		const isCorrect = userAnswerLetter === correctAnswerLetter

		const newAnswer: AnswerRecord = {
			questionNumber,
			questionText: currentQuestion.text,
			userAnswer: userAnswerLetter,
			correctAnswer: correctAnswerLetter,
			isCorrect,
			subtopic: currentQuestion.subtopic,
		}

		const newAnswers = [...answers, newAnswer]
		setAnswers(newAnswers)

		// Сохраняем ответы в сессию
		saveSession({ answers: newAnswers })

		const feedbackMessage = isCorrect
			? 'Верно!'
			: `Неправильно. Правильный ответ: ${correctAnswerLetter}`
		setFeedback(feedbackMessage)
		setShowFeedback(true)
		setIsWaitingForNext(true)

		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(() => {
			moveToNextQuestion(newAnswers)
		}, 1500)
	}

	// Старт теста
	useEffect(() => {
		if (session && !session.completed && answers.length === 0) {
			loadBatch(batchNumber, [])
		}
	}, [session, batchNumber, answers.length, loadBatch])

	// Очистка таймера
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [])

	if (!session) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='bg-white rounded-lg shadow p-12'>
					<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto'></div>
					<p className='mt-4 text-gray-500'>Загрузка...</p>
				</div>
			</div>
		)
	}

	const progressPercent = (answers.length / TOTAL_QUESTIONS) * 100

	return (
		<div className='min-h-[calc(100vh-56px)] px-4 py-8'>
			<div className='max-w-3xl mx-auto'>
				<div className='mb-6'>
					<div className='flex justify-between text-sm text-gray-600 mb-2'>
						<span>
							Вопрос {questionNumber} из {TOTAL_QUESTIONS}
						</span>
					</div>
					<div className='w-full bg-gray-200 rounded-full h-2.5 overflow-hidden'>
						<div
							className='bg-blue-600 h-2.5 rounded-full transition-all duration-300'
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>

				{error && (
					<div className='mb-4 p-3 bg-red-100 text-red-700 rounded-xl'>
						{error}
						<button
							onClick={() => loadBatch(batchNumber, answers)}
							className='ml-4 underline font-medium'
						>
							Повторить
						</button>
					</div>
				)}

				{currentQuestion ? (
					<div className='bg-white rounded-2xl shadow p-6'>
						<div className='flex items-center gap-2 mb-4'>
							<span className='text-sm px-3 py-1 bg-blue-50 text-blue-800 rounded-full'>
								{currentQuestion.subtopic}
							</span>
						</div>

						<h2 className='text-xl font-semibold mb-6 leading-relaxed'>
							{currentQuestion.text}
						</h2>

						<div className='space-y-3'>
							{currentQuestion.options.map((opt, idx) => (
								<button
									key={idx}
									onClick={() => handleAnswer(opt)}
									disabled={loading || isWaitingForNext}
									className='w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
								>
									{opt}
								</button>
							))}
						</div>

						{loading && (
							<div className='mt-4 text-center text-gray-400'>
								<div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 inline-block mr-2'></div>
								Загрузка следующих вопросов...
							</div>
						)}
					</div>
				) : (
					<div className='bg-white rounded-lg shadow p-12 text-center'>
						<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto'></div>
						<p className='mt-4 text-gray-600'>Загрузка первого вопроса...</p>
					</div>
				)}

				{showFeedback && feedback && (
					<div
						className={`mt-4 p-4 rounded-lg text-center text-lg font-medium ${
							feedback.includes('Верно')
								? 'bg-green-100 text-green-800'
								: 'bg-red-100 text-red-800'
						}`}
					>
						{feedback}
					</div>
				)}
			</div>
		</div>
	)
}
