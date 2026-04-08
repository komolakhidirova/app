import TutorComponent from '@/components/TutorComponent'
import { getFullSessionData } from '@/lib/actions/session.actions'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

interface SessionPageProps {
	params: Promise<{ id: string }>
}

const Tutor = async ({ params }: SessionPageProps) => {
	const { id } = await params
	const session = await getFullSessionData(id)
	const user = await currentUser()

	const { topic, attempts } = session

	if (!user) redirect('/sign-in')
	if (!topic) redirect('/')

	const answers = attempts?.flatMap(attempt => attempt.answers) || []

	console.log(answers)

	return (
		<main className='container mx-auto px-4 py-8'>
			<article className='flex rounded-border justify-between p-6 max-md:flex-col'>
				<p className='font-bold text-2xl'>{topic}</p>
			</article>

			<TutorComponent
				{...session}
				sessionId={id}
				userName={user.firstName!}
				userImage={user.imageUrl!}
				answers={answers}
			/>
		</main>
	)
}

export default Tutor
