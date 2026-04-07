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

interface Props {
	sessionId: string
	topic: string
	userName: string
	userImage: string
}

const TutorComponent = ({ sessionId, topic, userName, userImage }: Props) => {
	const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE)
	const [isSpeaking, setIsSpeaking] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [messages, setMessages] = useState<SavedMessage[]>([])

	const lottieRef = useRef<LottieRefCurrentProps>(null)

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

		const assistantOverrides = {
			// TODO:
			variableValues: { topic },
			clientMessages: ['transcript'],
			serverMessages: [],
		}

		vapi.start(configureAssistant(), assistantOverrides)
	}

	const handleDisconnect = () => {
		setCallStatus(CallStatus.FINISHED)
		vapi.stop()
	}

	return (
		<section className='flex flex-col h-[70vh]'>
			<section className='flex gap-8 max-sm:flex-col'>
				<div className='border-2 border-orange-500 w-2/3 max-sm:w-full flex flex-col gap-4 justify-center items-center rounded-lg'>
					<div className='size-[300px] flex items-center justify-center rounded-lg max-sm:size-[100px] mt-4 bg-amber-300'>
						<div
							className={cn(
								'absolute transition-opacity duration-1000',
								callStatus === CallStatus.FINISHED ||
									callStatus === CallStatus.INACTIVE
									? 'opacity-1001'
									: 'opacity-0',
								callStatus === CallStatus.CONNECTING &&
									'opacity-100 animate-pulse'
							)}
						>
							<Image
								src={`/images/quiz.png`}
								alt={topic}
								width={150}
								height={150}
								className='max-sm:w-fit'
							/>
						</div>

						<div
							className={cn(
								'absolute transition-opacity duration-1000',
								callStatus === CallStatus.ACTIVE ? 'opacity-100' : 'opacity-0'
							)}
						>
							<Lottie
								lottieRef={lottieRef}
								animationData={soundwaves}
								autoplay={false}
								className='size-[300px] max-sm:size-[100px]'
							/>
						</div>
					</div>
					<p className='font-bold text-2xl'>{topic}</p>
				</div>

				<div className='flex flex-col gap-4 w-1/3 max-sm:w-full max-sm:flex-row'>
					<div className='border-2 border-black flex flex-col gap-4 items-center rounded-lg py-8 max-sm:hidden'>
						<Image
							src={userImage}
							alt={userName}
							width={130}
							height={130}
							className='rounded-lg'
						/>
						<p className='font-bold text-2xl'>{userName}</p>
					</div>
					<button
						className='border-2 border-black rounded-lg flex flex-col gap-2 items-center py-8 max-sm:py-2 cursor-pointer w-full'
						onClick={toggleMicrophone}
						disabled={callStatus !== CallStatus.ACTIVE}
					>
						<Image
							src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'}
							alt='mic'
							width={36}
							height={36}
						/>
						<p className='max-sm:hidden'>
							{isMuted ? 'Turn on microphone' : 'Turn off microphone'}
						</p>
					</button>
					<button
						className={cn(
							'rounded-lg py-2 cursor-pointer transition-colors w-full text-white',
							callStatus === CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary',
							callStatus === CallStatus.CONNECTING && 'animate-pulse'
						)}
						onClick={
							callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall
						}
					>
						{callStatus === CallStatus.ACTIVE
							? 'End Session'
							: callStatus === CallStatus.CONNECTING
							? 'Connecting'
							: 'Start Session'}
					</button>
				</div>
			</section>

			<section className='relative flex flex-col gap-4 w-full items-center pt-10 flex-grow overflow-hidden'>
				<div className='overflow-y-auto w-full flex flex-col gap-4 max-sm:gap-2 pr-2 h-full text-2xl no-scrollbar'>
					{messages.map((message, index) => {
						if (message.role === 'assistant') {
							return (
								<p key={index} className='max-sm:text-sm'>
									{name.split(' ')[0].replace('/[.,]/g, ', '')}:
									{message.content}
								</p>
							)
						} else {
							return (
								<p key={index} className='text-primary max-sm:text-sm'>
									{userName}: {message.content}
								</p>
							)
						}
					})}
				</div>

				<div className='pointer-events-none absolute bottom-0 left-0 right-0 h-40 max-sm:h-20 bg-gradient-to-t from-background via-background/90 to-transparent z-10' />
			</section>
		</section>
	)
}

export default TutorComponent
