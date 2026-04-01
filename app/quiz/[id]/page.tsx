'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

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

export default function QuizResultsPage() {
	const params = useParams()
	const router = useRouter()
	const sessionId = params.id as string
	const [session, setSession] = useState<SessionData | null>(null)
	const [diagnosis, setDiagnosis] = useState<string>('')
	const [loading, setLoading] = useState(true)

	const hasFetched = useRef(false)

	useEffect(() => {
		const loadSession = () => {
			try {
				const stored = localStorage.getItem(`quiz_session_${sessionId}`)
				if (!stored) {
					console.error('Сессия не найдена')
					router.push('/')
					return
				}
				const data: SessionData = JSON.parse(stored)
				setSession(data)

				// if (!data.completed) {
				// 	router.push(`/quiz/${sessionId}/questions`)
				// 	return
				// }
			} catch (error) {
				console.error('Ошибка загрузки сессии:', error)
				router.push('/')
			}
		}

		loadSession()
	}, [sessionId, router])

	// Запрос диагностики
	useEffect(() => {
		if (!session || hasFetched.current) return

		if (!session.completed) {
			setLoading(false)
			return
		}

		const fetchDiagnosis = async () => {
			try {
				hasFetched.current = true

				const res = await fetch('/api/diagnose', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						topic: session.topic,
						answers: session.answers,
					}),
				})

				const data = await res.json()
				setDiagnosis(data.diagnosis)
			} catch (error) {
				console.error('Ошибка получения диагностики:', error)
				setDiagnosis('Не удалось загрузить диагностику. Попробуйте ещё раз.')
			} finally {
				setLoading(false)
			}
		}

		fetchDiagnosis()
	}, [session])

	const getWeakTopics = (answers: AnswerRecord[]) => {
		const subtopicErrors: Record<string, number> = {}
		answers.forEach(a => {
			if (!a.isCorrect) {
				subtopicErrors[a.subtopic] = (subtopicErrors[a.subtopic] || 0) + 1
			}
		})
		return Object.keys(subtopicErrors)
	}

	if (loading || !session) {
		return (
			<div className='min-h-screen flex items-center justify-center p-4'>
				<div className='bg-white rounded-дп shadow p-8 w-full max-w-md text-center'>
					<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto'></div>
					<p className='mt-4 text-gray-600'>Загрузка результатов...</p>
				</div>
			</div>
		)
	}

	const weakTopics = getWeakTopics(session.answers)

	return (
		<main className='container mx-auto px-4 py-8'>
			<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
				<div className='text-start'>
					<h1 className='text-3xl font-semibold mb-2'>{session.topic}</h1>
					<p className='text-gray-500 '>Тест завершен</p>
				</div>
				<Button className='bg-blue-900 hover:bg-blue-800'>
					<Link href='/quiz/new'>К сессии</Link>
				</Button>
			</div>

			<div className='max-w-3xl mx-auto'>
				<div className='bg-white rounded-lg shadow p-6'>
					<div className='mb-6'>
						<p className='whitespace-pre-wrap'>{diagnosis}</p>
					</div>

					{weakTopics.length > 0 && (
						<div className='bg-red-50 p-5 rounded-lg mb-6'>
							<h3 className='font-semibold mb-2 '>Темы для повторения</h3>
							<ul className='list-disc list-inside'>
								{weakTopics.map((topic, i) => (
									<li key={i}>{topic}</li>
								))}
							</ul>
						</div>
					)}

					<details className='mt-4'>
						<summary className='cursor-pointer text-blue-900 hover:text-blue-800 font-medium'>
							Подробные ответы ({session.answers.length})
						</summary>
						<div className='mt-4 space-y-2 max-h-96 overflow-y-auto'>
							{session.answers.map((a: AnswerRecord, i: number) => (
								<div
									key={i}
									className={`p-3 rounded-lg ${
										a.isCorrect
											? 'bg-green-50 border border-green-200'
											: 'bg-red-50 border border-red-200'
									}`}
								>
									<div className='font-medium text-sm'>
										Вопрос {a.questionNumber}: {a.questionText}
									</div>
									<div className='text-sm mt-1'>
										<span className='text-gray-500'>Ваш ответ: </span>
										<span
											className={
												a.isCorrect ? 'text-green-700' : 'text-red-700'
											}
										>
											{a.userAnswer}
										</span>
										{!a.isCorrect && (
											<span className='text-gray-500 ml-2'>
												/ Правильный: {a.correctAnswer}
											</span>
										)}
									</div>
									<div className='text-xs text-gray-400 mt-1'>
										Тема: {a.subtopic}
									</div>
								</div>
							))}
						</div>
					</details>

					<div className='flex mt-6'>
						<button
							onClick={() => {
								if (session.completed) {
									// Если тест пройден — создаём новую сессию
									const newSessionId = uuidv4()
									const newSession = {
										...session,
										id: newSessionId,
										answers: [],
										currentBatch: 1,
										completed: false,
									}
									localStorage.setItem(
										`quiz_session_${newSessionId}`,
										JSON.stringify(newSession)
									)
									router.push(`/quiz/${newSessionId}/questions`)
								} else {
									// Если тест не пройден — просто переходим к вопросам
									router.push(`/quiz/${sessionId}/questions`)
								}
							}}
							className='flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition'
						>
							{session.completed ? 'Пройти заново' : 'Пройти тест'}
						</button>
					</div>
				</div>
			</div>
		</main>
	)
}
