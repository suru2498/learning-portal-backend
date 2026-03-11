import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString =
    Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

  return stack
    ? `${timestamp} [${level}]: ${message}${metaString} - ${stack}`
    : `${timestamp} [${level}]: ${message}${metaString}`;
});

export const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp(),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});