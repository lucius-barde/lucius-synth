"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation';

const LoginForm = () => {
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.target);
    const res = await fetch('/login', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      router.push('/');
    } else {
      setError(data.error || 'Login failed');
    }
  }

  return (
    <main className="lucius-site-width-wrapper flex flex-col gap-[32px] pt-16 p-8 items-center flex-1">
		  <h1 className="text-4xl font-bold">Connexion</h1>
		  <form onSubmit={handleSubmit} className='flex flex-col gap-[16px]'>
			<input className='border-2 border-gray-300 rounded-md p-2' type="email" id="login" name="login" placeholder="Adresse e-mail" required />
			<input className='border-2 border-gray-300 rounded-md p-2' type="password" id="password" name="password" placeholder='Mot de passe' />
			<button className='cursor-pointer primary rounded-md p-2' type='submit'>Connexion</button>
		  </form>
		  {error && <div className="text-red-500 mt-2">{error}</div>}
       </main>

  )
}

export default LoginForm
