import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
	return (
		<main className='container mx-auto px-4 py-8'>
			<div className='rounded-lg bg-white px-14 py-7 text-center shadow flex justify-between mb-8'>
				<h1 className='text-3xl font-semibold'>Тесты</h1>
				<Button className='bg-blue-900'>
					<Link href='/quiz/new'>Новый тест</Link>
				</Button>
			</div>

			<div className='rounded-lg bg-white p-12 text-center shadow '>
				<h3 className='mb-2 text-xl font-semibold'>Нет тестов</h3>
				<p className='mb-4 text-gray-600'>Пройдите первый тест</p>
				<Button asChild className='bg-blue-900'>
					<Link href='/quiz/new'>Новый тест</Link>
				</Button>
			</div>

			<h1 className='text-3xl mb-4 mt-8 '>Пройденные тесты</h1>
		</main>
	)
}
