const { createLogger, format, transports } = require('winston');
const path = require('path');

// Создание экземпляра логгера
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'your-service-name' },
    transports: [
        // Запись всех логов уровня 'error' в 'error.log'
        new transports.File({ filename: path.join(__dirname, 'error.log'), level: 'error' }),
        // Запись всех логов уровня 'info' и ниже в 'combined.log'
        new transports.File({ filename: path.join(__dirname, 'combined.log') })
    ]
});

// Если мы не в production, выводим логи в консоль
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.simple()
    }));
}

// Экспорт логгера для использования в других частях приложения
module.exports = logger;
