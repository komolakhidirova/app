'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const TOTAL_QUESTIONS = 10

interface Session {
	id: string
	topic: string
	createdAt: string
	answers: any[]
	currentBatch: number
	completed: boolean
}

export default function HomePage() {
	const router = useRouter()
	const [topic, setTopic] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleStart = async () => {
		if (!topic.trim()) return

		setIsLoading(true)

		try {
			// Генерируем уникальный ID
			const sessionId = uuidv4()

			// Создаём сессию
			const newSession: Session = {
				id: sessionId,
				topic: topic.trim(),
				createdAt: new Date().toISOString(),
				answers: [],
				currentBatch: 1,
				completed: false,
			}

			// ✅ Получаем существующие сессии из localStorage
			const existingSessions = localStorage.getItem('sessions')
			let sessions: Session[] = []

			if (existingSessions) {
				sessions = JSON.parse(existingSessions)
			}

			// ✅ Добавляем новую сессию в массив
			sessions.push(newSession)

			// ✅ Сохраняем обновлённый массив обратно в localStorage
			localStorage.setItem('sessions', JSON.stringify(sessions))

			router.push(`/quiz/${sessionId}`)
		} catch (error) {
			console.error('Ошибка создания сессии:', error)
			setIsLoading(false)
		}
	}

	return (
		<div className='h-[calc(100vh-56px)] flex items-center justify-center'>
			<div className='bg-white rounded-lg shadow p-12'>
				<div className='text-center mb-4'>
					<h1 className='text-3xl font-bold mb-2'>Тест</h1>
					<p className='text-gray-600 '>{TOTAL_QUESTIONS} вопросов</p>
				</div>

				<input
					type='text'
					placeholder='Введите тему '
					value={topic}
					onChange={e => setTopic(e.target.value)}
					className='w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-900'
					onKeyDown={e => e.key === 'Enter' && handleStart()}
					disabled={isLoading}
				/>

				<button
					onClick={handleStart}
					disabled={!topic.trim() || isLoading}
					className='w-full bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 disabled:bg-gray-400 transition-all'
				>
					{isLoading ? 'Создание теста...' : 'Начать тест'}
				</button>
			</div>
		</div>
	)
}
