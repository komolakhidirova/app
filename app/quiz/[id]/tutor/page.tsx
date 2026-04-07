import TutorComponent from '@/components/TutorComponent'
import { getSession } from '@/lib/actions/session.actions'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

interface SessionPageProps {
	params: Promise<{ id: string }>
}

const Tutor = async ({ params }: SessionPageProps) => {
	const { id } = await params
	const session = await getSession(id)
	const user = await currentUser()

	const { topic } = session

	if (!user) redirect('/sign-in')
	if (!topic) redirect('/')

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
			/>
		</main>
	)
}

export default Tutor
