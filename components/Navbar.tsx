import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const Navbar = () => {
	return (
		<nav className='flex items-center justify-between mx-auto w-full px-14 py-4 bg-white max-sm:px-4 shadow'>
			<Link href='/' className='text-black font-bold'>
				Тесты
			</Link>
			<Show when='signed-out'>
				<SignInButton>Войти</SignInButton>
			</Show>
			<Show when='signed-in'>
				<UserButton />
			</Show>
		</nav>
	)
}

export default Navbar
