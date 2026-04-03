import QuizForm from '@/components/QuizForm'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function NewQuizPage() {
	const { userId } = await auth()
	if (!userId) redirect('/sign-in')

	return <QuizForm userId={userId} />
}
