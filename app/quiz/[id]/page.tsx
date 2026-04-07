'use client'

import { Button } from '@/components/ui/button'
import {
	deleteSession,
	getFullSessionData,
} from '@/lib/actions/session.actions'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AnswerRecord {
	questionNumber: number
	questionText: string
	userAnswer: string
	correctAnswer: string
	isCorrect: boolean
	subtopic: string
}

interface Attempt {
	attemptNumber: number
	answers: AnswerRecord[]
	completedAt?: string
}

interface SessionData {
	id: string
	topic: string
	attempts: Attempt[]
	currentAttempt: number
	completed: boolean
	created_at?: string
}

export default function QuizResultsPage() {
	const params = useParams()
	const router = useRouter()
	const sessionId = params.id as string
	const [session, setSession] = useState<SessionData | null>(null)
	const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null)
	const [loading, setLoading] = useState(true)
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)

	// Загрузка сессии
	useEffect(() => {
		const loadSession = async () => {
			try {
				const data = await getFullSessionData(sessionId)
				setSession(data)
				if (data.attempts && data.attempts.length > 0) {
					setSelectedAttempt(
						data.current_attempt || data.attempts[0]?.attemptNumber
					)
				}
			} catch (error) {
				console.error('Ошибка загрузки сессии:', error)
				router.push('/quiz/new')
			} finally {
				setLoading(false)
			}
		}
		loadSession()
	}, [sessionId, router])

	const handleDeleteSession = async () => {
		if (!session) return

		try {
			await deleteSession(sessionId)
			router.push('/')
		} catch (error) {
			console.error('Ошибка удаления:', error)
		}
	}

	const handleDeleteClick = () => {
		setShowConfirmDialog(true)
	}

	const handleConfirmDelete = () => {
		setShowConfirmDialog(false)
		handleDeleteSession()
	}

	const handleCancelDelete = () => {
		setShowConfirmDialog(false)
	}

	const handleNewAttempt = async () => {
		if (!session) return

		router.push(`/quiz/${sessionId}/questions`)
	}

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
			<div className='flex items-center justify-center p-4'>
				<div className='bg-white rounded-lg shadow p-8 w-full max-w-md text-center'>
					<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto'></div>
					<p className='mt-4 text-gray-500'>Загрузка...</p>
				</div>
			</div>
		)
	}

	const hasAttempts = session.attempts && session.attempts.length > 0
	const currentAttemptData =
		hasAttempts && selectedAttempt !== null
			? session.attempts.find(a => a.attemptNumber === selectedAttempt)
			: null
	const hasCompletedAttempts =
		session.attempts && session.attempts.some(a => a.answers.length > 0)

	return (
		<main className='container mx-auto px-4 py-8'>
			<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
				<div className='text-start'>
					<h1 className='text-3xl font-semibold mb-2'>{session.topic}</h1>
					<p className='text-gray-500'>
						{session.attempts?.length || 0}{' '}
						{(session.attempts?.length || 0) === 1 ? 'попытка' : 'попытки'}
					</p>
				</div>
			</div>

			<div className='max-w-3xl mx-auto'>
				{/* Выбор попытки + кнопка новой попытки */}
				<div className='bg-white rounded-lg shadow p-4 mb-6'>
					<div className='flex items-center gap-2 flex-wrap'>
						{hasAttempts &&
							session.attempts.map(attempt => (
								<button
									key={attempt.attemptNumber}
									onClick={() => setSelectedAttempt(attempt.attemptNumber)}
									className={`px-4 py-2 rounded-lg transition ${
										selectedAttempt === attempt.attemptNumber
											? 'bg-blue-900 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
								>
									Попытка {attempt.attemptNumber}
									{attempt.completedAt && ' ✓'}
								</button>
							))}
						<Button
							className='bg-blue-900 hover:bg-blue-800'
							onClick={handleNewAttempt}
						>
							+ Новая попытка
						</Button>
					</div>
				</div>

				{/* Отображение результатов */}
				{hasCompletedAttempts &&
				currentAttemptData &&
				currentAttemptData.answers.length > 0 ? (
					<div className='bg-white rounded-lg shadow p-6'>
						{getWeakTopics(currentAttemptData.answers).length > 0 && (
							<div className='bg-red-50 p-5 rounded-lg mb-6'>
								<h3 className='font-semibold mb-2'>Темы для повторения</h3>
								<ul className='list-disc list-inside'>
									{getWeakTopics(currentAttemptData.answers).map((topic, i) => (
										<li key={i}>{topic}</li>
									))}
								</ul>
							</div>
						)}

						<details className='mt-4'>
							<summary className='cursor-pointer text-blue-900 hover:text-blue-800 font-medium'>
								Подробные ответы ({currentAttemptData.answers.length})
							</summary>
							<div className='mt-4 space-y-2 max-h-96 overflow-y-auto'>
								{currentAttemptData.answers.map(
									(a: AnswerRecord, i: number) => (
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
									)
								)}
							</div>
						</details>
					</div>
				) : (
					<div className='bg-white rounded-lg shadow p-12 text-center'>
						<p className='text-gray-500 mb-4'>Попыток нет</p>
						<Button
							className='bg-blue-900 hover:bg-blue-800'
							onClick={handleNewAttempt}
						>
							+ Новая попытка
						</Button>
					</div>
				)}

				{/* Кнопка удаления сессии */}
				<div className='mt-8 flex justify-center'>
					<button
						onClick={handleDeleteClick}
						className='bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition'
					>
						🗑 Удалить сессию
					</button>
				</div>
			</div>

			{/* Диалог подтверждения удаления */}
			{showConfirmDialog && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
					<div className='bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4'>
						<h3 className='text-xl font-semibold mb-4'>
							Подтверждение удаления
						</h3>
						<p className='text-gray-600 mb-6'>
							Вы уверены, что хотите удалить сессию "{session?.topic}"?
							<br />
							Все попытки и ответы будут потеряны безвозвратно.
						</p>
						<div className='flex justify-end gap-3'>
							<button
								onClick={handleCancelDelete}
								className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition'
							>
								Отмена
							</button>
							<button
								onClick={handleConfirmDelete}
								className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition'
							>
								Удалить
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	)
}
