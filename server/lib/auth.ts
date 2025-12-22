import { betterAuth } from 'better-auth';
import { emailOTP, lastLoginMethod } from 'better-auth/plugins';
import { prisma } from '../db/prisma';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { apiKey } from 'better-auth/plugins';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/_gateback',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: ['http://localhost:3000', '*.terran9.com'],
  plugins: [
    lastLoginMethod({
      customResolveMethod: (ctx) => {
        if (ctx.path === '/sign-in/email-otp') {
          return 'email-otp';
        }
        return null;
      },
    }),
    admin(),
    apiKey({
      storage: 'database',
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60 * 60, // 1 hour
        maxRequests: 100, // 100 requests per hour
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // sign-in OTP만 이메일로 발송 (나머지 type은 사용하지 않음)
        if (type !== 'sign-in') return;

        const from = process.env.RESEND_FROM_EMAIL;
        if (!from) {
          throw new Error('Missing env: RESEND_FROM_EMAIL');
        }

        const { error } = await resend.emails.send({
          from,
          to: email,
          subject: `[OTP] Your sign-in code: ${otp}`,
          text: `Your sign-in code is: ${otp}\n\nThis code expires soon. If you didn't request this, you can ignore this email.`,
        });

        if (error) {
          throw new Error(error.message);
        }
      },
    }),
    // dodopayments({
    //   client: dodoPayments,
    //   createCustomerOnSignUp: true,
    //   use: [
    //     checkout({
    //       products: [
    //         {
    //           productId: 'pdt_BFOsIGZ8E1T31sJ8XZu0h',
    //           slug: 'standard',
    //         },
    //       ],
    //       successUrl: '/billing',
    //       authenticatedUsersOnly: true,
    //     }),
    //     portal(),
    //     webhooks({
    //       webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
    //       onPayload: async (payload) => {
    //         // console.log('Received webhook:', payload);
    //       },
    //       // onSubscriptionActive: async (payload) => {
    //       //   console.log('Received webhook1:', payload);
    //       // },
    //       // onSubscriptionCancelled: async (payload) => {
    //       //   console.log('Received webhook2:', payload);
    //       // },
    //       // onSubscriptionExpired: async (payload) => {
    //       //   console.log('Received webhook3:', payload);
    //       // },
    //       // onSubscriptionRenewed: async (payload) => {
    //       //   console.log('Received webhook4:', payload);
    //       // },
    //     }),
    //   ],
    // }),
  ],
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
