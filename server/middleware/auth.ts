import { Elysia } from 'elysia';
import { auth } from '../lib/auth';
import { authEventsTotal } from '../lib/metrics';

export const betterAuth = new Elysia({ name: 'better-auth' })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          authEventsTotal.inc({ result: 'failure', reason: 'no_session' });
          return status(401, 'Unauthorized');
        }

        authEventsTotal.inc({ result: 'success', reason: 'session_ok' });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
