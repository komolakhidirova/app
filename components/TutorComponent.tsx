'use client'

import soundwaves from '@/constants/soundwaves.json'
import { cn, configureAssistant } from '@/lib/utils'
import { vapi } from '@/lib/vapi.sdk'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import Image from 'next/image'

import { useEffect, useRef, useState } from 'react'

enum CallStatus {
	INACTIVE = 'INACTIVE',
	CONNECTING = 'CONNECTING',
	ACTIVE = 'ACTIVE',
	FINISHED = 'FINISHED',
}

interface AnswerRecord {
	questionNumber: number
	questionText: string
	userAnswer: string
	correctAnswer: string
	isCorrect: boolean
	subtopic: string
}

interface Props {
	sessionId: string
	topic: string
	userName: string
	userImage: string
	answers: AnswerRecord[]
}

const TutorComponent = ({
	sessionId,
	topic,
	userName,
	userImage,
	answers,
}: Props) => {
	const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE)
	const [isSpeaking, setIsSpeaking] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [messages, setMessages] = useState<SavedMessage[]>([])

	const lottieRef = useRef<LottieRefCurrentProps>(null)

	// Форматируем answers для передачи в VAPI
	const formattedAnswers = answers.map(a => ({
		question_number: a.questionNumber,
		question_text: a.questionText,
		user_answer: a.userAnswer,
		correct_answer: a.correctAnswer,
		is_correct: a.isCorrect,
		subtopic: a.subtopic,
	}))

	// Создаём контекст для ИИ-тьютора
	const getAnswersContext = () => {
		if (!answers || answers.length === 0) {
			return 'У пользователя пока нет завершённых попыток.'
		}

		const correctCount = answers.filter(a => a.isCorrect).length
		const percentage = Math.round((correctCount / answers.length) * 100)

		// Группируем ошибки по темам
		const weakTopics: Record<string, number> = {}
		answers.forEach(a => {
			if (!a.isCorrect) {
				weakTopics[a.subtopic] = (weakTopics[a.subtopic] || 0) + 1
			}
		})

		let context = `Пользователь ответил на ${answers.length} вопросов. Правильных ответов: ${correctCount} (${percentage}%). `

		if (Object.keys(weakTopics).length > 0) {
			context += `Проблемные темы: ${Object.entries(weakTopics)
				.map(([topic, count]) => `${topic} (ошибок: ${count})`)
				.join(', ')}. `
		}

		// Добавляем конкретные ошибки
		const mistakes = answers.filter(a => !a.isCorrect).slice(0, 5)
		if (mistakes.length > 0) {
			context += ` Конкретные ошибки: `
			mistakes.forEach((m, i) => {
				context += `${i + 1}. Вопрос: "${
					m.questionText
				}". Ответ пользователя: ${m.userAnswer}. Правильный ответ: ${
					m.correctAnswer
				}. `
			})
		}

		return context
	}

	useEffect(() => {
		if (lottieRef) {
			if (isSpeaking) {
				lottieRef.current?.play()
			} else {
				lottieRef.current?.stop()
			}
		}
	}, [isSpeaking, lottieRef])

	useEffect(() => {
		const onCallStart = () => setCallStatus(CallStatus.ACTIVE)

		const onCallEnd = () => {
			setCallStatus(CallStatus.FINISHED)
		}

		const onMessage = (message: Message) => {
			if (message.type === 'transcript' && message.transcriptType === 'final') {
				const newMessage = { role: message.role, content: message.transcript }
				setMessages(prev => [newMessage, ...prev])
			}
		}

		const onSpeechStart = () => setIsSpeaking(true)
		const onSpeechEnd = () => setIsSpeaking(false)

		const onError = (error: Error) => console.log('Error', error)

		vapi.on('call-start', onCallStart)
		vapi.on('call-end', onCallEnd)
		vapi.on('message', onMessage)
		vapi.on('error', onError)
		vapi.on('speech-start', onSpeechStart)
		vapi.on('speech-end', onSpeechEnd)

		return () => {
			vapi.off('call-start', onCallStart)
			vapi.off('call-end', onCallEnd)
			vapi.off('message', onMessage)
			vapi.off('error', onError)
			vapi.off('speech-start', onSpeechStart)
			vapi.off('speech-end', onSpeechEnd)
		}
	}, [])

	const toggleMicrophone = () => {
		const isMuted = vapi.isMuted()
		vapi.setMuted(!isMuted)
		setIsMuted(!isMuted)
	}

	const handleCall = async () => {
		setCallStatus(CallStatus.CONNECTING)

		const answersContext = getAnswersContext()

		const assistantOverrides = {
			variableValues: {
				topic: topic,
				answers_context: answersContext,
			},
			clientMessages: ['transcript'],
			serverMessages: [],
		}

		console.log('📤 Assistant Overrides:', assistantOverrides)

		vapi.start(configureAssistant(), assistantOverrides)
	}

	const handleDisconnect = () => {
		setCallStatus(CallStatus.FINISHED)
		vapi.stop()
	}

	return (
		<section className='flex flex-col h-[calc(100vh-200px)]'>
			<section className='flex gap-6 max-sm:flex-col'>
				{/* Левая карточка с темой */}
				<div className='bg-white rounded-2xl shadow-md w-2/3 max-sm:w-full flex flex-col gap-4 justify-center items-center p-6'>
					<div className='size-[280px] flex items-center justify-center rounded-xl relative'>
						<div
							className={cn(
								'absolute transition-opacity duration-500',
								callStatus === CallStatus.FINISHED ||
									callStatus === CallStatus.INACTIVE
									? 'opacity-100'
									: 'opacity-0',
								callStatus === CallStatus.CONNECTING &&
									'opacity-100 animate-pulse'
							)}
						>
							<Image
								src={`/images/quiz.png`}
								alt={topic}
								width={160}
								height={160}
								className='object-contain'
							/>
						</div>

						<div
							className={cn(
								'absolute transition-opacity duration-500',
								callStatus === CallStatus.ACTIVE ? 'opacity-100' : 'opacity-0'
							)}
						>
							<Lottie
								lottieRef={lottieRef}
								animationData={soundwaves}
								autoplay={false}
								className='size-[280px]'
							/>
						</div>
					</div>
					<p className='font-semibold text-xl text-gray-800'>{topic}</p>
					<div className='flex gap-2 mt-2'>
						<span
							className={cn(
								'px-3 py-1 rounded-full text-xs font-medium',
								callStatus === CallStatus.ACTIVE
									? 'bg-green-100 text-green-700'
									: callStatus === CallStatus.CONNECTING
									? 'bg-yellow-100 text-yellow-700'
									: 'bg-gray-100 text-gray-500'
							)}
						>
							{callStatus === CallStatus.ACTIVE
								? '● В эфире'
								: callStatus === CallStatus.CONNECTING
								? '● Подключение...'
								: '● Неактивно'}
						</span>
					</div>
				</div>

				{/* Правая панель с управлением */}
				<div className='flex flex-col gap-4 w-1/3 max-sm:w-full max-sm:flex-row'>
					<div className='bg-white rounded-2xl shadow-md flex flex-col gap-3 items-center justify-center py-6 px-4 max-sm:hidden'>
						<div className='w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center'>
							<Image
								src={userImage}
								alt={userName}
								width={96}
								height={96}
								className='object-cover'
							/>
						</div>
						<p className='font-semibold text-lg text-gray-800'>{userName}</p>
						<p className='text-xs text-gray-400'>Студент</p>
					</div>

					<button
						className='bg-white rounded-xl shadow-md flex flex-col gap-2 items-center justify-center py-4 px-4 cursor-pointer w-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
						onClick={toggleMicrophone}
						disabled={callStatus !== CallStatus.ACTIVE}
					>
						<Image
							src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'}
							alt='mic'
							width={28}
							height={28}
						/>
						<p className='text-sm text-gray-600 max-sm:hidden'>
							{isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
						</p>
					</button>

					<button
						className={cn(
							'rounded-xl py-3 px-4 cursor-pointer transition-all w-full font-medium shadow-md',
							callStatus === CallStatus.ACTIVE
								? 'bg-red-600 hover:bg-red-700 text-white'
								: 'bg-blue-900 hover:bg-blue-800 text-white',
							callStatus === CallStatus.CONNECTING &&
								'opacity-70 cursor-not-allowed'
						)}
						onClick={
							callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall
						}
						disabled={callStatus === CallStatus.CONNECTING}
					>
						{callStatus === CallStatus.ACTIVE
							? 'Завершить сессию'
							: callStatus === CallStatus.CONNECTING
							? 'Подключение...'
							: 'Начать сессию'}
					</button>
				</div>
			</section>

			{/* Чат сообщений */}
			<section className='relative flex flex-col gap-4 w-full mt-8 flex-grow overflow-hidden bg-white rounded-2xl shadow-md'>
				<div className='flex items-center gap-2 px-6 py-3 border-b border-gray-100'>
					<div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
					<p className='text-sm font-medium text-gray-600'>Диалог с тьютором</p>
				</div>

				<div className='overflow-y-auto flex flex-col gap-3 px-6 pb-6 h-full no-scrollbar'>
					{messages.length === 0 ? (
						<div className='flex flex-col items-center justify-center h-64 text-center'>
							<Image
								src='/images/chat-placeholder.png'
								alt='chat'
								width={80}
								height={80}
								className='opacity-50'
							/>
							<p className='text-gray-400 mt-4'>
								Нажмите "Начать сессию" чтобы начать общение с тьютором
							</p>
						</div>
					) : (
						messages.map((message, index) => {
							if (message.role === 'assistant') {
								return (
									<div key={index} className='flex gap-3 justify-start'>
										<div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0'>
											<Image
												src='/images/ai-avatar.png'
												alt='AI'
												width={20}
												height={20}
											/>
										</div>
										<div className='bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]'>
											<p className='text-sm text-gray-800'>{message.content}</p>
										</div>
									</div>
								)
							} else {
								return (
									<div key={index} className='flex gap-3 justify-end'>
										<div className='bg-blue-900 rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]'>
											<p className='text-sm text-white'>{message.content}</p>
										</div>
										<div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden'>
											<Image
												src={userImage}
												alt={userName}
												width={32}
												height={32}
												className='object-cover'
											/>
										</div>
									</div>
								)
							}
						})
					)}
				</div>

				<div className='pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent z-10' />
			</section>
		</section>
	)
}

export default TutorComponent
