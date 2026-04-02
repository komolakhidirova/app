'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
}

export default function Home() {
	const [sessions, setSessions] = useState<SessionData[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadSessions = () => {
			const stored = localStorage.getItem('sessions')
			if (stored) {
				const parsedSessions: SessionData[] = JSON.parse(stored)
				// Сортируем по дате последней попытки (сначала новые)
				const sorted = parsedSessions.sort((a, b) => {
					const lastA = a.attempts[a.attempts.length - 1]?.completedAt
					const lastB = b.attempts[b.attempts.length - 1]?.completedAt
					if (!lastA && !lastB) return 0
					if (!lastA) return 1
					if (!lastB) return -1
					return new Date(lastB).getTime() - new Date(lastA).getTime()
				})
				setSessions(sorted)
			}
			setLoading(false)
		}

		loadSessions()
		// Слушаем изменения в localStorage (если вкладка обновлена)
		window.addEventListener('storage', loadSessions)
		return () => window.removeEventListener('storage', loadSessions)
	}, [])

	const getLastAttemptStats = (session: SessionData) => {
		const lastAttempt = session.attempts[session.attempts.length - 1]
		if (!lastAttempt || lastAttempt.answers.length === 0) {
			return { correctCount: 0, total: 0, percentage: 0 }
		}
		const correctCount = lastAttempt.answers.filter(a => a.isCorrect).length
		const total = lastAttempt.answers.length
		const percentage = Math.round((correctCount / total) * 100)
		return { correctCount, total, percentage }
	}

	const getAttemptsCount = (session: SessionData) => {
		return session.attempts.length
	}

	if (loading) {
		return (
			<main className='container mx-auto px-4 py-8'>
				<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
					<h1 className='text-3xl font-semibold'>Тесты</h1>
					<Button className='bg-blue-900'>
						<Link href='/quiz/new'>Новый тест</Link>
					</Button>
				</div>
				<div className='rounded-lg bg-white p-12 items-center text-center shadow mx-auto max-w-3xl'>
					<div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mx-auto'></div>
					<p className='mt-4 text-gray-500'>Загрузка...</p>
				</div>
			</main>
		)
	}

	const completedSessions = sessions.filter(s =>
		s.attempts.some(a => a.answers.length > 0)
	)
	const emptySessions = sessions.filter(s =>
		s.attempts.every(a => a.answers.length === 0)
	)

	return (
		<main className='container mx-auto px-4 py-8'>
			<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
				<h1 className='text-3xl font-semibold'>Тесты</h1>
				<Button className='bg-blue-900'>
					<Link href='/quiz/new'>Новый тест</Link>
				</Button>
			</div>

			{/* Активные/незавершённые тесты */}
			{emptySessions.length > 0 && (
				<div className='max-w-3xl mx-auto mb-8'>
					<h2 className='text-xl font-semibold mb-4'>Активные тесты</h2>
					<div className='space-y-4'>
						{emptySessions.map(session => (
							<div
								key={session.id}
								className='rounded-lg bg-white p-6 shadow hover:shadow-md transition'
							>
								<div className='flex justify-between items-start'>
									<div>
										<h3 className='text-xl font-semibold mb-2'>
											{session.topic}
										</h3>
										<p className='text-gray-500 text-sm'>
											Попыток: {getAttemptsCount(session)} • Не завершён
										</p>
									</div>
									<Button asChild className='bg-blue-900'>
										<Link href={`/quiz/${session.id}/questions`}>
											Продолжить
										</Link>
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Пройденные тесты */}
			{completedSessions.length > 0 ? (
				<div className='max-w-3xl mx-auto'>
					<h2 className='text-xl font-semibold mb-4'>Пройденные тесты</h2>
					<div className='space-y-4'>
						{completedSessions.map(session => {
							const lastStats = getLastAttemptStats(session)
							return (
								<div
									key={session.id}
									className='rounded-lg bg-white p-6 shadow hover:shadow-md transition'
								>
									<div className='flex justify-between items-start'>
										<div className='flex-1'>
											<h3 className='text-xl font-semibold mb-2'>
												{session.topic}
											</h3>
											<div className='flex gap-4 text-sm text-gray-500 mb-2'>
												<span>Попыток: {getAttemptsCount(session)}</span>
												<span>
													Последний результат: {lastStats.percentage}% (
													{lastStats.correctCount}/{lastStats.total})
												</span>
											</div>
											<div className='w-full bg-gray-200 rounded-full h-2 max-w-md'>
												<div
													className='bg-green-500 h-2 rounded-full'
													style={{ width: `${lastStats.percentage}%` }}
												/>
											</div>
										</div>
										<Button asChild variant='outline' className='ml-4'>
											<Link href={`/quiz/${session.id}`}>Результаты</Link>
										</Button>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			) : (
				<div className='rounded-lg bg-white p-12 items-center text-center shadow mx-auto max-w-3xl'>
					<h3 className='mb-2 text-xl font-semibold'>Нет тестов</h3>
					<p className='mb-4 text-gray-600'>Пройдите первый тест</p>
					<Button asChild className='bg-blue-900'>
						<Link href='/quiz/new'>Новый тест</Link>
					</Button>
				</div>
			)}
		</main>
	)
}
