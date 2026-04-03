import SessionLibrary from '@/components/SessionLibrary'
import { getAllSessions } from '@/lib/actions/session.actions'

export default async function HomePage() {
	const sessions = await getAllSessions()

	return <SessionLibrary sessions={sessions} />
}
