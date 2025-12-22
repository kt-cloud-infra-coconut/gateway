import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 dark:bg-black'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='relative flex w-full max-w-md flex-col items-center text-center'
      >
        {/* Background Gradient Blur */}
        <div className='absolute -top-32 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl' />

        <h1 className='font-mono text-9xl font-bold tracking-tighter text-zinc-900/10 dark:text-zinc-50/10'>
          404
        </h1>
        <div className='absolute top-12'>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
            Page Not Found
          </h2>
          <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
            Oops! The page you are looking for has vanished into the void.
          </p>
        </div>

        <div className='mt-12 flex w-full flex-col gap-3 sm:flex-row sm:justify-center'>
          <Button
            variant='outline'
            size='lg'
            onClick={() => navigate(-1)}
            className='group w-full sm:w-auto'
          >
            <ArrowLeft className='mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1' />
            Go Back
          </Button>
          <Button
            size='lg'
            onClick={() => navigate('/')}
            className='w-full sm:w-auto'
          >
            <Home className='mr-2 h-4 w-4' />
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
