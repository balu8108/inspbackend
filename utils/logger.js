const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { environment } = require('./constants');
const { S3StreamLogger } = require('s3-streamlogger');
const { AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require('../envvar');
const winston = require('winston');
const logFormat = format.printf(
    ({ timestamp, label, level, message }) => `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`
);

const debug = new DailyRotateFile({
    filename: 'logs/debug/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '300m',
    maxFiles: '7d',
    level: 'debug',
    handleExceptions: true,
});

const info = new DailyRotateFile({
    filename: 'logs/info/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '300m',
    maxFiles: '14d',
    level: 'info',
    handleExceptions: true,
});

const s3StreamLogger = new S3StreamLogger({
    bucket: AWS_BUCKET_NAME,
    access_key_id: AWS_ACCESS_KEY_ID,
    secret_access_key: AWS_SECRET_ACCESS_KEY,
    folder: "logs",
    name_format: "%Y-%m-%d-%H-%M-%S-%L.log", // file name format
    rotate_every: 60 * 60 * 1000 * 24, // rotate daily
});


const transport = new (winston.transports.Stream)({
    stream: s3StreamLogger
});
// see error handling section below
transport.on('error', function (err) {
    console.error('Error occurred in transport', err);
});

const logger = winston.createLogger({
    format: format.combine(format.timestamp(), format.label({ label: 'INSP_SERVER' }), logFormat),
    transports: [transport, info, debug],
});


// Error handling for S3 logging
s3StreamLogger.on('error', (err) => {
    console.error('Error occurred while logging to S3:', err);
});

module.exports = logger;
