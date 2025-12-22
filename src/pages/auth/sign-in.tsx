import { LogosGithubIcon, LogosGoogleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 characters'),
});

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  // better-auth-client에서 저장된 마지막 로그인 수단을 가져옵니다.
  // 'email-otp' | 'google' | 'github' | null
  const lastMethod = authClient.getLastUsedLoginMethod();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
  });

  const handleEmailSubmit = async (data: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
        type: 'sign-in',
      });

      if (error) {
        toast.error(error.message || 'Failed to send OTP');
        return;
      }

      setEmail(data.email);
      setStep('otp');
      toast.success('Verification code sent to your email');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: data.otp,
      });

      if (error) {
        console.error('OTP Verification Error:', error);
        toast.error(error.message || 'Invalid verification code');
        otpForm.setError('otp', {
          type: 'manual',
          message: error.message || 'Invalid verification code',
        });
        return;
      }

      toast.success('Signed in successfully');
      const redirect = searchParams.get('redirect');
      // Open redirect 방지: 같은 origin 내 경로만 허용
      if (redirect && redirect.startsWith('/')) {
        window.location.assign(redirect);
        return;
      }
      navigate('/_gatefront/auth/sign-in');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const redirect = searchParams.get('redirect');
      // best-effort: better-auth가 지원하면 callbackURL로 넘기고, 미지원이면 무시될 수 있습니다.
      await authClient.signIn.social({
        provider,
        callbackURL:
          redirect && redirect.startsWith('/') ? redirect : undefined,
      });
    } catch (err) {
      setIsLoading(false);
      toast.error('Social sign in failed');
      console.error(err);
    }
  };

  // 소셜 로그인 버튼 렌더러 (하이라이트 처리용)
  const SocialButton = ({
    provider,
    icon: Icon,
    label,
  }: {
    provider: 'google' | 'github';
    icon: any;
    label: string;
  }) => {
    const isLastUsed = lastMethod === provider;
    return (
      <Button
        variant='outline'
        onClick={() => signInWithSocial(provider)}
        disabled={isLoading}
        className={`relative h-11 ${
          isLastUsed
            ? 'border-indigo-500 ring-1 ring-indigo-500 dark:border-indigo-400 dark:ring-indigo-400'
            : ''
        }`}
      >
        <Icon className='mr-2 h-4 w-4' />
        {label}
        {isLastUsed && (
          <span className='absolute -right-2 -top-2 flex h-4 w-auto items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:bg-indigo-400 dark:ring-zinc-900'>
            last
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 dark:bg-black'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900'
      >
        <div className='p-8'>
          <div className='mb-8 text-center'>
            {/* <img
              src='/public/logo.png'
              alt='Logo'
              className='mx-auto mb-4 h-12 w-12 rounded-xl object-contain'
            /> */}
            <h1 className='text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
              {step === 'email' ? 'Welcome back' : 'Check your inbox'}
            </h1>
          </div>

          <AnimatePresence mode='wait'>
            {step === 'email' ? (
              <motion.div
                key='email-step'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className='space-y-6'
              >
                {/* 마지막 로그인 수단이 소셜인 경우, 해당 버튼을 상단에 강조 표시해도 좋지만,
                    여기서는 통일성을 위해 이메일 폼 하단의 소셜 버튼에 하이라이트를 줍니다. */}

                <form
                  onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                  className='space-y-4'
                >
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email address</Label>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-2.5 h-4 w-4 text-zinc-500' />
                      <Input
                        id='email'
                        placeholder='name@example.com'
                        type='email'
                        className={'pl-9'}
                        disabled={isLoading}
                        {...emailForm.register('email')}
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className='text-xs text-red-500'>
                        {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type='submit'
                    className='relative w-full'
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Spinner className='mr-2' />
                    ) : (
                      <>
                        Continue with Email
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </>
                    )}
                    {lastMethod === 'email-otp' && (
                      <span className='absolute -right-2 -top-2 flex h-4 w-auto items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:bg-indigo-400 dark:ring-zinc-900'>
                        last
                      </span>
                    )}
                  </Button>
                </form>

                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t border-zinc-200 dark:border-zinc-800' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-white px-2 text-zinc-500 dark:bg-zinc-900'>
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <SocialButton
                    provider='google'
                    icon={LogosGoogleIcon}
                    label='Google'
                  />
                  <SocialButton
                    provider='github'
                    icon={LogosGithubIcon}
                    label='GitHub'
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key='otp-step'
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className='space-y-6'
              >
                <form
                  onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
                  className='space-y-4'
                >
                  <div className='flex flex-col items-center space-y-2'>
                    <Label htmlFor='otp' className='sr-only'>
                      Verification Code
                    </Label>
                    <InputOTP
                      maxLength={6}
                      value={otpForm.watch('otp')}
                      onChange={(value) => otpForm.setValue('otp', value)}
                      disabled={isLoading}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    {otpForm.formState.errors.otp && (
                      <p className='text-xs text-red-500'>
                        {otpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>
                  <Button type='submit' className='w-full' disabled={isLoading}>
                    {isLoading ? (
                      <Spinner className='mr-2' />
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                </form>

                <div className='flex items-center justify-between text-sm'>
                  <button
                    onClick={() => setStep('email')}
                    className='text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    disabled={isLoading}
                  >
                    ← Change email
                  </button>
                  <button
                    onClick={() =>
                      handleEmailSubmit({ email: emailForm.getValues('email') })
                    }
                    className='flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                    disabled={isLoading}
                  >
                    <RefreshCw className='mr-1.5 h-3 w-3' />
                    Resend code
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className='bg-zinc-50 px-8 py-4 text-center text-xs text-zinc-500 dark:bg-zinc-800/50'>
          By clicking continue, you agree to our Terms and Privacy Policy .
        </div>
      </motion.div>
    </div>
  );
}
