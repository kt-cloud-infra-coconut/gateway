import { authClient } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Loader from '@/components/kokonutui/loader';

export default function SignOut() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const signOut = async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            navigate('/_gatefront/auth/sign-in');
          },
          onError: (error) => {
            console.error(error);
          },
          onSettled: () => {
            setIsLoading(false);
          },
        },
      });
    };
    signOut();
  }, []);

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader
          title='Signing out...'
          subtitle='Please wait while we sign you out'
        />
      </div>
    );
  }

  return <Navigate to='/_gatefront/auth/sign-in' replace />;
}
