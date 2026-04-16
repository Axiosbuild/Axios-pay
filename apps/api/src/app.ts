import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import apiRoutes from './routes/index';
import walletFundingRoutes from './routes/wallet-funding.routes';

const app = express();
app.set('trust proxy', 1);

const frontendOriginFromProcessEnv = process.env.FRONTEND_URL;

const allowedOrigins = new Set([
  'https://axioslast-web.vercel.app',
  env.FRONTEND_URL,
  frontendOriginFromProcessEnv,
].filter((origin): origin is string => Boolean(origin)));

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  },
};

const normalizeRoutePath = (path: string): string => {
  const normalized = path.replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const getMountPathFromRegExp = (regexp: RegExp): string => {
  // Matches Express mount regex strings like /^\/api\/v1\/?(?=\/|$)/i and returns "/api/v1".
  const match = regexp.toString().match(/^\/\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)\/i$/);
  if (!match) {
    return '';
  }
  return `/${match[1].replace(/\\\//g, '/')}`;
};

type RouteLayer = {
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
  };
  name?: string;
  regexp?: RegExp;
  handle?: {
    stack?: RouteLayer[];
  };
};

const collectRoutes = (stack: RouteLayer[], prefix = ''): string[] => {
  const routes: string[] = [];

  stack.forEach((layer) => {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase());

      methods.forEach((method) => {
        paths.forEach((path) => {
          routes.push(`${method} ${normalizeRoutePath(`${prefix}${path}`)}`);
        });
      });
      return;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const mountPath = layer.regexp ? getMountPathFromRegExp(layer.regexp) : '';
      routes.push(...collectRoutes(layer.handle.stack, `${prefix}${mountPath}`));
    }
  });

  return routes;
};

const logRouteTree = (): void => {
  const appStack = (app as { _router?: { stack?: RouteLayer[] } })._router?.stack;
  if (!appStack) {
    return;
  }

  const routes = collectRoutes(appStack).sort((a, b) => a.localeCompare(b));
  console.log('📚 Registered routes:\n' + routes.join('\n'));
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('/api/v1/auth/*', cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));

// Webhook route needs raw body for HMAC verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
  req.rawBody = req.body as Buffer;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'Axios Pay API', status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ service: 'Axios Pay API', status: 'running', endpoints: ['/health', '/api/v1/*'] });
});

app.use('/api/v1', apiRoutes);
app.use('/api', walletFundingRoutes);
logRouteTree();

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'The requested resource was not found' });
});

app.use(errorMiddleware);

export default app;
