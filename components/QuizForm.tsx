'use client'

import { createSession } from '@/lib/actions/session.actions'
import { redirect } from 'next/navigation'
import { useState } from 'react'

const TOTAL_QUESTIONS = 10

interface NewQuizFormProps {
	userId: string | null
}

export default function QuizForm({ userId }: NewQuizFormProps) {
	const [topic, setTopic] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleStart = async () => {
		setIsLoading(true)

		const session = await createSession({ topic })

		if (session) {
			redirect(`/quiz/${session.id}`)
		} else {
			console.log('failed to create session')
			redirect('/')
		}
	}

	return (
		<div className='h-[calc(100vh-56px)] flex items-center justify-center'>
			<div className='bg-white rounded-lg shadow p-12'>
				<div className='text-center mb-4'>
					<h1 className='text-3xl font-bold mb-2'>Тест</h1>
					<p className='text-gray-600 '>{TOTAL_QUESTIONS} вопросов</p>
					{userId && (
						<p className='text-xs text-gray-400 mt-2'>
							Пользователь: {userId.slice(0, 8)}...
						</p>
					)}
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
