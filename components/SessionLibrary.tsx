'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'

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
	attempts?: Attempt[]
	current_attempt: number
	completed: boolean
	created_at: string
	user_id: string
}

interface SessionLibraryProps {
	sessions: SessionData[]
}

export default function SessionLibrary({
	sessions: initialSessions,
}: SessionLibraryProps) {
	const [sessions] = useState<SessionData[]>(initialSessions)

	// Функция для получения последней попытки (нужно будет получить из БД)
	// Пока используем заглушку
	const getLastAttemptStats = (session: SessionData) => {
		// TODO: заменить на реальные данные из attempts
		return { correctCount: 0, total: 0, percentage: 0 }
	}

	const getAttemptsCount = (session: SessionData) => {
		// TODO: заменить на реальное количество попыток
		return session.attempts?.length || 0
	}

	const hasCompletedAttempts = (session: SessionData) => {
		// TODO: заменить на реальную проверку
		return (session.attempts?.length || 0) > 0
	}

	const completedSessions = sessions.filter(s => hasCompletedAttempts(s))
	const emptySessions = sessions.filter(s => !hasCompletedAttempts(s))

	if (!sessions.length && !emptySessions.length) {
		return (
			<main className='container mx-auto px-4 py-8'>
				<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
					<h1 className='text-3xl font-semibold'>Тесты</h1>
					<Button className='bg-blue-900'>
						<Link href='/quiz/new'>Новый тест</Link>
					</Button>
				</div>
				<div className='rounded-lg bg-white p-12 items-center text-center shadow mx-auto max-w-3xl'>
					<h3 className='mb-2 text-xl font-semibold'>Нет тестов</h3>
					<p className='mb-4 text-gray-600'>Пройдите первый тест</p>
					<Button asChild className='bg-blue-900'>
						<Link href='/quiz/new'>Новый тест</Link>
					</Button>
				</div>
			</main>
		)
	}

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
										<p className='text-xs text-gray-400 mt-1'>
											Создан:{' '}
											{new Date(session.created_at).toLocaleDateString('ru-RU')}
										</p>
									</div>
									<Button asChild className='bg-blue-900'>
										<Link href={`/quiz/${session.id}`}>Продолжить</Link>
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
											<p className='text-xs text-gray-400 mt-1'>
												Создан:{' '}
												{new Date(session.created_at).toLocaleDateString(
													'ru-RU'
												)}
											</p>
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
			) : null}
		</main>
	)
}
