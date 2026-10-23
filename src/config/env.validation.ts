import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3004),
  API_PREFIX: Joi.string().default('api/v1'),
  TCP_HOST: Joi.string().default('0.0.0.0'),
  TCP_PORT: Joi.number().default(4004),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().default('nearo-auth'),
  JWT_AUDIENCE: Joi.string().default('nearo-apps'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('admin'),
  DB_NAME: Joi.string().default('nearo'),

  CORS_ORIGINS: Joi.string().default('*'),

  FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),
});
