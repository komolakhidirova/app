'use client'

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

	// Количество попыток
	const getAttemptsCount = (session: SessionData) => {
		return session.current_attempt
	}

	const allSessions = sessions

	if (allSessions.length === 0) {
		return (
			<main className='container mx-auto px-4 py-8'>
				<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
					<h1 className='text-3xl font-semibold'>Тесты</h1>
					<button className='bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition'>
						<Link href='/quiz/new'>Новый тест</Link>
					</button>
				</div>
				<div className='rounded-lg bg-white p-12 items-center text-center shadow mx-auto max-w-3xl'>
					<h3 className='mb-2 text-xl font-semibold'>Нет тестов</h3>
					<p className='mb-4 text-gray-600'>Пройдите первый тест</p>
					<button className='bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition'>
						<Link href='/quiz/new'>Новый тест</Link>
					</button>
				</div>
			</main>
		)
	}

	return (
		<main className='container mx-auto px-4 py-8'>
			<div className='rounded-lg bg-white px-14 py-7 items-center shadow flex justify-between mb-8 max-w-3xl mx-auto'>
				<h1 className='text-3xl font-semibold'>Тесты</h1>
				<button className='bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition'>
					<Link href='/quiz/new'>Новый тест</Link>
				</button>
			</div>

			<div className='max-w-3xl mx-auto'>
				<div className='space-y-4'>
					{allSessions.map(session => {
						const attemptsCount = getAttemptsCount(session)
						const hasAttempts = attemptsCount > 0

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
											<span>Попыток: {attemptsCount}</span>
										</div>

										<p className='text-xs text-gray-400 mt-1'>
											Создан:{' '}
											{new Date(session.created_at).toLocaleDateString('ru-RU')}
										</p>
									</div>
									<button className='bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition ml-4'>
										<Link href={`/quiz/${session.id}`}>
											{hasAttempts ? 'Результаты' : 'Начать'}
										</Link>
									</button>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</main>
	)
}
